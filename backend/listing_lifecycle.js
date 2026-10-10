const fs = require('node:fs');
const path = require('node:path');

const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const schemaStatements = fs.readFileSync(path.join(__dirname, 'listing_lifecycle.sql'), 'utf8')
    .split('-- @statement').map(sql => sql.trim()).filter(Boolean);

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}
function integer(value, name, min, max) {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw invalid(`Invalid ${name}.`);
    return value;
}
function identity(value, name) {
    // Never convert ESO Id64s to JS numbers (which lose precision).
    if (typeof value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(value)
        || BigInt(value) > 18446744073709551615n) throw invalid(`Invalid ${name}.`);
    return value;
}
function text(value, name, max = 160) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw invalid(`Invalid ${name}.`);
    return value.trim();
}
function validateLifecycle(body, now = Math.floor(Date.now() / 1000)) {
    if (body.lifecycle_version !== 1 || !['NA', 'EU'].includes(body.server)) throw invalid('Unsupported lifecycle version or server.');
    const observations = body.observations ?? [];
    const purchases = body.purchases ?? [];
    if (!Array.isArray(observations) || !Array.isArray(purchases)
        || observations.length + purchases.length === 0 || observations.length + purchases.length > 2000) {
        throw invalid('Expected 1–2,000 lifecycle records.');
    }
    const base = item => ({
        uid: identity(item?.uid, 'uid'), guild_id: identity(item?.guild_id, 'guild_id'),
    });
    return {
        server: body.server,
        observations: observations.map(item => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) throw invalid('Invalid observation record.');
            const observed_at = integer(item.observed_at, 'observed_at', 1, now + 300);
            const remaining = item.time_remaining == null ? null
                : integer(item.time_remaining, 'time_remaining', 0, RETENTION_SECONDS);
            return {
                ...base(item),
                game_item_id: integer(item.game_item_id, 'game_item_id', 1, 2147483647),
                item_name: text(item.item_name, 'item_name', 300).replace(/\^[a-zA-Z]+/g, '').trim(),
                seller_name: text(item.seller_name, 'seller_name'),
                total_price: integer(item.total_price, 'total_price', 1, 2147483647),
                quantity: integer(item.quantity, 'quantity', 1, 2147483647),
                guild_name: text(item.guild_name, 'guild_name'),
                location: text(item.location || 'Guild Trader', 'location', 300),
                level: integer(item.level, 'level', 1, 1000),
                quality: integer(item.quality, 'quality', 0, 5),
                trait_id: integer(item.trait_id, 'trait_id', 0, 60),
                observed_at, expires_at: remaining == null ? null : observed_at + remaining,
            };
        }),
        purchases: purchases.map(item => ({...base(item), purchased_at: integer(item.purchased_at, 'purchased_at', 1, now + 300)})),
    };
}

async function applyLifecycle(run, get, payload, now = Math.floor(Date.now() / 1000)) {
    const { server, observations, purchases } = payload;
    // Validate all existing scopes before making any changes, including purchases
    // arriving before their scan. Any mismatch rolls back the entire batch.
    const scopes = new Map();
    for (const item of [...observations, ...purchases]) {
        if (scopes.has(item.uid) && scopes.get(item.uid) !== item.guild_id) throw invalid('Conflicting listing UID guild scope.');
        scopes.set(item.uid, item.guild_id);
        const existing = await get(`SELECT guild_id FROM native_listing_observations WHERE server = ? AND uid = ?
            UNION SELECT guild_id FROM native_listing_tombstones WHERE server = ? AND uid = ?`, [server, item.uid, server, item.uid]);
        if (existing && existing.guild_id !== item.guild_id) throw invalid('Listing UID belongs to a different guild.');
    }
    const identities = new Map();
    const immutable = ['guild_id', 'game_item_id', 'seller_name', 'total_price', 'quantity', 'level', 'quality', 'trait_id'];
    for (const item of observations) {
        const existing = identities.get(item.uid) || await get('SELECT * FROM native_listing_observations WHERE server = ? AND uid = ?', [server, item.uid]);
        if (existing && immutable.some(key => existing[key] !== item[key])) throw invalid('Conflicting listing UID attributes.');
        identities.set(item.uid, item);
    }
    for (const item of observations) {
        if (item.observed_at < now - RETENTION_SECONDS) continue;
        await run(`INSERT OR IGNORE INTO native_listing_groups VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [server, item.game_item_id, item.guild_name, item.seller_name, item.total_price, item.quantity, item.level, item.quality, item.trait_id]);
        await run(`INSERT INTO native_listing_observations
            (server, uid, guild_id, game_item_id, item_name, seller_name, total_price, quantity, guild_name, location, level, quality, trait_id, observed_at, expires_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM native_listing_tombstones WHERE server = ? AND uid = ?)
            ON CONFLICT(server, uid) DO UPDATE SET
                item_name = excluded.item_name, location = excluded.location, guild_name = excluded.guild_name,
                observed_at = excluded.observed_at,
                expires_at = COALESCE(excluded.expires_at, native_listing_observations.expires_at)
            WHERE excluded.observed_at > native_listing_observations.observed_at
              AND excluded.guild_id = native_listing_observations.guild_id
              AND excluded.game_item_id = native_listing_observations.game_item_id
              AND excluded.seller_name = native_listing_observations.seller_name
              AND excluded.total_price = native_listing_observations.total_price
              AND excluded.quantity = native_listing_observations.quantity
              AND excluded.level = native_listing_observations.level
              AND excluded.quality = native_listing_observations.quality
              AND excluded.trait_id = native_listing_observations.trait_id`,
        [server, item.uid, item.guild_id, item.game_item_id, item.item_name, item.seller_name, item.total_price,
            item.quantity, item.guild_name, item.location, item.level, item.quality, item.trait_id, item.observed_at, item.expires_at, server, item.uid]);
    }
    for (const item of purchases) {
        if (item.purchased_at < now - RETENTION_SECONDS) continue;
        await run(`INSERT INTO native_listing_tombstones VALUES (?, ?, ?, ?)
            ON CONFLICT(server, uid) DO UPDATE SET purchased_at = MAX(purchased_at, excluded.purchased_at)`,
        [server, item.uid, item.guild_id, item.purchased_at]);
        await run('DELETE FROM native_listing_observations WHERE server = ? AND uid = ?', [server, item.uid]);
    }
    return {success: true, lifecycle_version: 1, accepted: observations.length + purchases.length};
}

async function purgeLifecycle(run) {
    const legacy = await run(`DELETE FROM guild_trader_listings
        WHERE (expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now'))
           OR discovered_at IS NULL OR datetime(discovered_at) IS NULL OR datetime(discovered_at) < datetime('now', '-30 days')`);
    const native = await run(`DELETE FROM native_listing_observations
        WHERE (expires_at IS NOT NULL AND expires_at <= CAST(strftime('%s', 'now') AS INTEGER))
           OR observed_at < CAST(strftime('%s', 'now') AS INTEGER) - 2592000`);
    await run(`DELETE FROM native_listing_tombstones WHERE purchased_at < CAST(strftime('%s', 'now') AS INTEGER) - 2592300`);
    return legacy.changes + native.changes;
}

module.exports = {schemaStatements, validateLifecycle, applyLifecycle, purgeLifecycle};
