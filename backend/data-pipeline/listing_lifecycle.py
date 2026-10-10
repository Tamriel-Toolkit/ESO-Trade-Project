"""Native UID lifecycle and durable market delivery; never infer sales from absence."""
import hashlib
import json
import os
import re
import sqlite3
import time
import urllib.error
import urllib.request
from contextlib import closing
from email.utils import parsedate_to_datetime
from pathlib import Path

RETENTION_SECONDS = 2592000
SCHEMA = Path(__file__).resolve().parent.parent / "listing_lifecycle.sql"


def ensure_schema(connection):
    # Schema setup precedes the data/outbox transaction; no mid-import commits.
    columns = {row[1] for row in connection.execute("PRAGMA table_info(guild_trader_listings)")}
    if "total_price" not in columns:
        connection.execute("ALTER TABLE guild_trader_listings ADD COLUMN total_price INTEGER")
    for statement in SCHEMA.read_text(encoding="utf-8").split("-- @statement"):
        connection.execute(statement)
    connection.execute("""CREATE TABLE IF NOT EXISTS native_listing_outbox (
        payload_hash TEXT PRIMARY KEY, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt INTEGER NOT NULL DEFAULT 0, blocked_token_hash TEXT, last_error TEXT
    )""")
    connection.commit()


def table_text(content, name):
    match = re.search(r'\["' + re.escape(name) + r'"\]\s*=\s*\{', content)
    if not match:
        return ""
    start = match.end()
    depth = 1
    end = start
    while depth:
        if content[end] == "{":
            depth += 1
        elif content[end] == "}":
            depth -= 1
        end += 1
    return content[start:end - 1]


def parse_records(content, valid_ids):
    now = int(time.time())
    header = re.search(r'\["Server"\]\s*=\s*"(NA|EU)"', content)
    default_server = header.group(1) if header else "NA"

    def field(block, key, default=None):
        match = re.search(r'\["' + key + r'"\]\s*=\s*("[^"\r\n]*"|\d+)\s*(?=[,}]|$)', block)
        if not match:
            if f'["{key}"]' in block:
                raise ValueError(f"Invalid lifecycle {key}")
            return default
        value = match.group(1)
        return value[1:-1] if value.startswith('"') else int(value)

    def region(block):
        value = field(block, "Server", default_server)
        if value not in ("NA", "EU"):
            raise ValueError("Invalid lifecycle Server")
        return value

    def identity(value):
        if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]{0,19}", value) or int(value) > 18446744073709551615:
            raise ValueError("Missing/invalid UID or GuildId; install the current ESOTrade addon")
        return value

    def number(value, name, minimum, maximum):
        if type(value) is not int or not minimum <= value <= maximum:
            raise ValueError(f"Invalid lifecycle {name}")
        return value

    observations, purchases = [], []
    for block in re.findall(r"\{([^{}]+)\}", table_text(content, "Scans")):
        observed = number(field(block, "Time"), "Time", 1, now + 300)
        uid = identity(field(block, "UID"))
        guild_id = identity(field(block, "GuildId"))
        remaining = field(block, "TimeRemaining")
        if remaining is not None:
            number(remaining, "TimeRemaining", 0, RETENTION_SECONDS)
        link_id = re.search(r"\|H\d+:item:(\d+):", block)
        item_id = int(link_id.group(1)) if link_id and int(link_id.group(1)) in valid_ids else field(block, "ItemId")
        if item_id not in valid_ids:
            # Do not silently discard an observation and clear its source file.
            raise ValueError("Scanned item is missing from the local catalog; refresh the catalog before retrying")
        item = {
            "uid": uid, "guild_id": guild_id, "game_item_id": item_id, "server": region(block),
            "item_name": re.sub(r"\^[a-zA-Z]+", "", field(block, "Name", "")).strip(),
            "total_price": number(field(block, "Price"), "Price", 1, 2147483647),
            "quantity": number(field(block, "Qty", 1), "Qty", 1, 2147483647),
            "seller_name": field(block, "Seller", ""), "guild_name": field(block, "Guild", ""),
            "location": field(block, "Location", "Guild Trader"),
            "level": number(field(block, "Level", 1), "Level", 1, 1000),
            "quality": number(field(block, "Quality", 1), "Quality", 0, 5),
            "trait_id": number(field(block, "Trait", field(block, "TraitId", 0)), "Trait", 0, 60),
            "observed_at": observed, "time_remaining": remaining,
        }
        for key in ("item_name", "seller_name", "guild_name", "location"):
            if not isinstance(item[key], str) or not item[key].strip() or len(item[key]) > (300 if key in ("item_name", "location") else 160):
                raise ValueError(f"Invalid lifecycle {key}")
            item[key] = item[key].strip()
        observations.append(item)
    for block in re.findall(r"\{([^{}]+)\}", table_text(content, "Purchases")):
        purchases.append({"uid": identity(field(block, "UID")), "guild_id": identity(field(block, "GuildId")), "server": region(block),
                          "purchased_at": number(field(block, "Time"), "purchase Time", 1, now + 300)})
    return observations, purchases


def apply_records(connection, server, observations, purchases):
    now = int(time.time())
    scopes = {}
    for item in observations + purchases:
        key = item["uid"]
        if key in scopes and scopes[key] != item["guild_id"]:
            raise ValueError("Conflicting listing UID guild scope")
        scopes[key] = item["guild_id"]
        rows = connection.execute("""SELECT guild_id FROM native_listing_observations WHERE server = ? AND uid = ?
            UNION SELECT guild_id FROM native_listing_tombstones WHERE server = ? AND uid = ?""", (server, key, server, key)).fetchall()
        if any(row[0] != item["guild_id"] for row in rows):
            raise ValueError("Listing UID belongs to a different guild")
    identities = {}
    immutable = ("guild_id", "game_item_id", "seller_name", "total_price", "quantity", "level", "quality", "trait_id")
    for item in observations:
        existing = connection.execute("""SELECT guild_id, game_item_id, seller_name, total_price, quantity, level, quality, trait_id
            FROM native_listing_observations WHERE server = ? AND uid = ?""", (server, item["uid"])).fetchone()
        current = tuple(item[key] for key in immutable)
        if (existing and existing != current) or (item["uid"] in identities and identities[item["uid"]] != current):
            raise ValueError("Conflicting listing UID attributes")
        identities[item["uid"]] = current
    for item in observations:
        if item["observed_at"] < now - RETENTION_SECONDS:
            continue
        group = (server, item["game_item_id"], item["guild_name"], item["seller_name"], item["total_price"],
                 item["quantity"], item["level"], item["quality"], item["trait_id"])
        connection.execute("INSERT OR IGNORE INTO native_listing_groups VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", group)
        expiry = item["observed_at"] + item["time_remaining"] if item["time_remaining"] is not None else None
        connection.execute("""INSERT INTO native_listing_observations
            (server, uid, guild_id, game_item_id, item_name, seller_name, total_price, quantity, guild_name, location, level, quality, trait_id, observed_at, expires_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM native_listing_tombstones WHERE server = ? AND uid = ?)
            ON CONFLICT(server, uid) DO UPDATE SET item_name = excluded.item_name, location = excluded.location, guild_name = excluded.guild_name,
                observed_at = excluded.observed_at, expires_at = COALESCE(excluded.expires_at, native_listing_observations.expires_at)
            WHERE excluded.observed_at > native_listing_observations.observed_at
              AND excluded.guild_id = native_listing_observations.guild_id
              AND excluded.game_item_id = native_listing_observations.game_item_id
              AND excluded.seller_name = native_listing_observations.seller_name
              AND excluded.total_price = native_listing_observations.total_price
              AND excluded.quantity = native_listing_observations.quantity
              AND excluded.level = native_listing_observations.level
              AND excluded.quality = native_listing_observations.quality
              AND excluded.trait_id = native_listing_observations.trait_id""",
            (server, item["uid"], item["guild_id"], item["game_item_id"], item["item_name"], item["seller_name"],
             item["total_price"], item["quantity"], item["guild_name"], item["location"], item["level"],
             item["quality"], item["trait_id"], item["observed_at"], expiry, server, item["uid"]))
    for item in purchases:
        if item["purchased_at"] < now - RETENTION_SECONDS:
            continue
        connection.execute("""INSERT INTO native_listing_tombstones VALUES (?, ?, ?, ?)
            ON CONFLICT(server, uid) DO UPDATE SET purchased_at = MAX(purchased_at, excluded.purchased_at)""",
            (server, item["uid"], item["guild_id"], item["purchased_at"]))
        connection.execute("DELETE FROM native_listing_observations WHERE server = ? AND uid = ?", (server, item["uid"]))


def queue_records(connection, server, observations, purchases, metadata=None):
    # Event identity and observation time remain unchanged on every retry.
    for kind, records in (("observations", observations), ("purchases", purchases)):
        for offset in range(0, len(records), 500):
            payload = json.dumps({"lifecycle_version": 1, "server": server, kind: records[offset:offset + 500], **(metadata or {})}, sort_keys=True)
            digest = hashlib.sha256(payload.encode()).hexdigest()
            connection.execute("INSERT OR IGNORE INTO native_listing_outbox (payload_hash, payload) VALUES (?, ?)", (digest, payload))


def deliver_outbox(db_path, server_url, token=None, opener=None, now=None):
    token = token or os.environ.get("ESOTRADE_AUTH_TOKEN")
    if not token or not os.path.exists(db_path):
        return 0
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = int(time.time()) if now is None else now
    opener = opener or urllib.request.urlopen
    delivered = 0
    with closing(sqlite3.connect(db_path)) as connection:
        if not connection.execute("SELECT 1 FROM sqlite_master WHERE name = 'native_listing_outbox'").fetchone():
            return 0
        rows = connection.execute("""SELECT payload_hash, payload, attempts FROM native_listing_outbox
            WHERE (next_attempt <= ? AND blocked_token_hash IS NULL)
               OR (blocked_token_hash IS NOT NULL AND blocked_token_hash != ?)
            ORDER BY rowid LIMIT 4""", (now, token_hash)).fetchall()
        for digest, payload, attempts in rows:
            sent = json.loads(payload)
            # Nothing over the retention window can affect the marketplace.
            # Drop expired delivery work locally rather than replaying it forever.
            records = sent.get("observations", []) + sent.get("purchases", [])
            if records and all(record.get("observed_at", record.get("purchased_at", 0)) < now - RETENTION_SECONDS for record in records):
                connection.execute("DELETE FROM native_listing_outbox WHERE payload_hash = ?", (digest,))
                connection.commit()
                continue
            request = urllib.request.Request(server_url.rstrip('/') + "/api/market/upload-scans", data=payload.encode(),
                                             headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
            try:
                with opener(request, timeout=10) as response:
                    ack = json.loads(response.read().decode())
                    expected = len(sent.get("observations", [])) + len(sent.get("purchases", []))
                    if ack.get("success") is not True or ack.get("lifecycle_version") != 1 or ack.get("accepted") != expected:
                        raise ValueError("Missing lifecycle acknowledgement")
                connection.execute("DELETE FROM native_listing_outbox WHERE payload_hash = ?", (digest,))
                connection.commit()
                delivered += 1
            except Exception as error:
                code = error.code if isinstance(error, urllib.error.HTTPError) else None
                delay = min(3600, 30 * (2 ** min(attempts, 7)))
                if code == 429:
                    retry_after = error.headers.get("Retry-After", "") if error.headers else ""
                    if retry_after.isdigit():
                        delay = max(delay, min(int(retry_after), RETENTION_SECONDS))
                    elif retry_after:
                        try:
                            delay = max(delay, min(int(parsedate_to_datetime(retry_after).timestamp()) - now, RETENTION_SECONDS))
                        except (TypeError, ValueError, OverflowError):
                            pass
                # An unauthorized token is never hammered again until it changes.
                blocked = token_hash if code in (401, 403) else None
                connection.execute("""UPDATE native_listing_outbox SET attempts = attempts + 1, next_attempt = ?,
                    blocked_token_hash = ?, last_error = ? WHERE payload_hash = ?""",
                    (now + delay, blocked, f"HTTP {code}" if code else "Network/acknowledgement failure", digest))
                connection.commit()
                print(f"[Market delivery] Batch retained for retry ({'HTTP ' + str(code) if code else 'network/acknowledgement failure'}).")
                break
    return delivered


def purge_records(connection):
    count = connection.execute("""DELETE FROM guild_trader_listings WHERE
        (expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now'))
        OR discovered_at IS NULL OR datetime(discovered_at) IS NULL OR datetime(discovered_at) < datetime('now', '-30 days')""").rowcount
    if connection.execute("SELECT 1 FROM sqlite_master WHERE name = 'native_listing_observations'").fetchone():
        count += connection.execute("""DELETE FROM native_listing_observations WHERE
            (expires_at IS NOT NULL AND expires_at <= CAST(strftime('%s', 'now') AS INTEGER))
            OR observed_at < CAST(strftime('%s', 'now') AS INTEGER) - 2592000""").rowcount
        connection.execute("DELETE FROM native_listing_tombstones WHERE purchased_at < CAST(strftime('%s', 'now') AS INTEGER) - 2592300")
    return count
