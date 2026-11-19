"""Validation and provenance shared by the UESP acquisition and import commands."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

SOURCE_URL = "https://esoitem.uesp.net/exportJson.php"
FIRST_ID, LAST_ID = 3, 280000
BASELINE = 155476
MIN_ITEMS = 140000
MAX_BYTES = 512 * 1024 * 1024
CATEGORIES = {"Weapons", "Apparel", "Jewelry", "Consumables", "Materials", "Glyphs",
              "Furnishings", "Miscellaneous", "Companion Equipment"}
SHA256 = re.compile(r"[0-9a-f]{64}")
FIELDS = {"game_item_id", "name", "item_type", "category", "subcategory", "rarity", "icon_url", "metadata"}


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def file_sha256(path):
    with open(path, "rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def validate_item(item):
    if not isinstance(item, dict) or not FIELDS <= item.keys():
        raise ValueError("Invalid source record: missing required item fields.")
    item_id = item["game_item_id"]
    if type(item_id) is not int or not FIRST_ID <= item_id <= LAST_ID:
        raise ValueError(f"Invalid catalog item ID {item_id!r}.")
    if any(not isinstance(item[key], str) or not item[key].strip()
           for key in ("name", "subcategory", "item_type")) or (not isinstance(item["category"], str) or item["category"] not in CATEGORIES):
        raise ValueError(f"Invalid item identity or taxonomy for ID {item_id}.")
    if type(item["rarity"]) is not int or not 0 <= item["rarity"] <= 6:
        raise ValueError(f"Invalid item rarity for ID {item_id}.")
    if not isinstance(item["metadata"], dict):
        raise ValueError(f"Invalid metadata for ID {item_id}.")
    set_data = item["metadata"].get("set")
    if set_data is not None and (not isinstance(set_data, dict) or not isinstance(set_data.get("name"), str)):
        raise ValueError(f"Invalid item set metadata for ID {item_id}.")
    if not isinstance(item["icon_url"], str) or (item["icon_url"] and not
            item["icon_url"].startswith("https://esoicons.uesp.net/")):
        raise ValueError(f"Invalid icon source for ID {item_id}.")


def validate_source(manifest):
    if (not isinstance(manifest, dict) or manifest.get("source_url") != SOURCE_URL
            or manifest.get("source_table") != "minedItemSummary"
            or manifest.get("manifest_version") != 1 or manifest.get("normalization_version") != 1
            or manifest.get("result") != "complete"):
        raise ValueError("Expected a complete version 1 UESP minedItemSummary manifest.")
    stamp = datetime.fromisoformat(manifest["retrieved_at"])
    if stamp.utcoffset() != timezone.utc.utcoffset(stamp):
        raise ValueError("Expected a UTC retrieval timestamp.")
    next_id = FIRST_ID
    source_count = 0
    for part in manifest["source_ranges"]:
        end, count = part["end_id"], part["count"]
        if (part["start_id"] != next_id or type(end) is not int or end < next_id
                or type(count) is not int or not 0 <= count <= end - next_id + 1
                or not SHA256.fullmatch(part["raw_sha256"])):
            raise ValueError("Invalid or incomplete UESP retrieval ranges.")
        next_id = end + 1
        source_count += count
    if next_id != LAST_ID + 1 or manifest["retrieval_id"] != retrieval_id(manifest["source_ranges"]):
        raise ValueError("UESP export does not cover the expected range or retrieval digest.")
    count = manifest["item_count"]
    excluded = manifest["unnamed_item_ids"]
    if (type(count) is not int or not MIN_ITEMS <= count <= LAST_ID - FIRST_ID + 1
            or not isinstance(excluded, list)
            or any(type(i) is not int or not FIRST_ID <= i <= LAST_ID for i in excluded)
            or len(set(excluded)) != len(excluded) or count + len(excluded) != source_count):
        raise ValueError("Implausible item count or unexplained difference from source rows.")
    if not SHA256.fullmatch(manifest["artifact_sha256"]):
        raise ValueError("Invalid artifact digest.")


def retrieval_id(ranges):
    return hashlib.sha256(json.dumps(ranges, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def load_export(json_path, manifest_path, approved_digest):
    if not approved_digest or not SHA256.fullmatch(approved_digest):
        raise ValueError("Supply the approved acquisition manifest SHA-256 via --manifest-sha256.")
    path = Path(json_path)
    proof_path = Path(manifest_path) if manifest_path else path.with_name(f"{path.name}.{approved_digest}.manifest.json")
    if proof_path.stat().st_size > 4 * 1024 * 1024:
        raise ValueError("Oversized source manifest.")
    proof = proof_path.read_bytes()
    if hashlib.sha256(proof).hexdigest() != approved_digest:
        raise ValueError("Source manifest differs from the approved digest.")
    manifest = json.loads(proof)
    validate_source(manifest)
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("Oversized catalog export.")
    with path.open("rb") as stream:
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES or hashlib.sha256(raw).hexdigest() != manifest["artifact_sha256"]:
        raise ValueError("Catalog export differs from its verified manifest.")
    items = json.loads(raw)
    if not isinstance(items, list) or len(items) != manifest["item_count"]:
        raise ValueError("Catalog row count differs from the source manifest.")
    ids = set(manifest["unnamed_item_ids"])
    counts = Counter()
    for item in items:
        validate_item(item)
        if item["game_item_id"] in ids:
            raise ValueError(f"Duplicate or quarantined catalog ID {item['game_item_id']}.")
        ids.add(item["game_item_id"])
        counts[item["category"]] += 1
    if dict(counts) != manifest["category_counts"]:
        raise ValueError("Catalog taxonomy counts differ from the source manifest.")
    return items, manifest, proof.decode("utf-8")
