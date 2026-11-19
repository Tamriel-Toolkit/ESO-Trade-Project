// Isolated production-mode middleware tests need a plausible catalog before boot.
// Construct deterministic test rows in their allocated scratch database. The digest
// is calculated independently from the SQL result and from the verifier.
const { createHash } = require('node:crypto');
const { query } = require('./sandbox');

async function prepareProductionCatalog(sandbox) {
    const run = (sql, params) => query(sandbox.dbPath, sql, params, sandbox.root);
    const count = 140000;
    await run(`CREATE TABLE items (game_item_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT,
        subcategory TEXT, rarity INTEGER, type TEXT, set_name TEXT, icon TEXT, metadata TEXT, icon_url TEXT)`);
    await run(`WITH RECURSIVE ids(id) AS (VALUES(1) UNION ALL SELECT id + 1 FROM ids WHERE id < ?)
        INSERT INTO items (game_item_id, name, category, subcategory, rarity, metadata)
        SELECT id, 'Isolated catalog ' || id, 'Materials', 'Material', 1, '{}' FROM ids`, [count]);
    await run('CREATE TABLE catalog_members (game_item_id INTEGER PRIMARY KEY REFERENCES items(game_item_id))');
    await run('INSERT INTO catalog_members SELECT game_item_id FROM items');
    await run(`CREATE TABLE catalog_manifest (id INTEGER PRIMARY KEY, manifest_version INTEGER,
        normalization_version INTEGER, source_url TEXT, retrieval_id TEXT, retrieved_at TEXT,
        imported_at TEXT, artifact_sha256 TEXT, catalog_sha256 TEXT, item_count INTEGER, category_counts TEXT, result TEXT,
        source_manifest_sha256 TEXT, source_manifest_json TEXT)`);
    const hash = createHash('sha256');
    for (let id = 1; id <= count; id++) {
        const row = [id, 'Isolated catalog ' + id, 'Materials', 'Material', 1, null, null, null, '{}', null];
        hash.update(JSON.stringify(row) + '\n');
    }
    const time = '2025-01-01T00:00:00+00:00';
    const source = {
        manifest_version: 1, normalization_version: 1, source_url: 'https://esoitem.uesp.net/exportJson.php',
        source_table: 'minedItemSummary', retrieved_at: time, retrieval_id: 'b'.repeat(64), result: 'complete',
        artifact_sha256: 'a'.repeat(64), item_count: count, category_counts: { Materials: count },
    };
    const sourceJson = JSON.stringify(source);
    await run(`INSERT INTO catalog_manifest VALUES
        (1, 1, 1, 'https://esoitem.uesp.net/exportJson.php', ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)`,
        [source.retrieval_id, time, time, 'a'.repeat(64), hash.digest('hex'), count, JSON.stringify(source.category_counts),
            createHash('sha256').update(sourceJson).digest('hex'), sourceJson]);
}

module.exports = { prepareProductionCatalog };
