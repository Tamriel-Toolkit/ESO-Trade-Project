const { createHash } = require('node:crypto');

const CATALOG_CATEGORIES = [
    'Weapons', 'Apparel', 'Jewelry', 'Consumables', 'Materials', 'Glyphs',
    'Furnishings', 'Companion Equipment', 'Miscellaneous',
];

const ITEM_FIELDS = [
    'game_item_id', 'name', 'category', 'subcategory', 'rarity',
    'type', 'set_name', 'icon', 'metadata', 'icon_url',
];
const SHA256 = /^[a-f0-9]{64}$/;
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|\+00:00)$/;

function validTimestamp(value) {
    return typeof value === 'string' && UTC_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

function expectedCategories(manifest) {
    if (manifest?.manifest_version !== 1 || manifest.normalization_version !== 1 ||
        manifest.source_url !== 'https://esoitem.uesp.net/exportJson.php' ||
        !SHA256.test(manifest.retrieval_id) ||
        !validTimestamp(manifest.retrieved_at) || !validTimestamp(manifest.imported_at) ||
        !SHA256.test(manifest.artifact_sha256) || !SHA256.test(manifest.catalog_sha256) ||
        manifest.result !== 'verified' || !Number.isSafeInteger(manifest.item_count) || manifest.item_count < 140000) {
        throw new Error('The catalog manifest is missing, incomplete or unsupported.');
    }
    if (typeof manifest.source_manifest_json !== 'string' || Buffer.byteLength(manifest.source_manifest_json) > 4 * 1024 * 1024 ||
        createHash('sha256').update(manifest.source_manifest_json).digest('hex') !== manifest.source_manifest_sha256) {
        throw new Error('Stored acquisition manifest differs from its approved digest.');
    }
    const source = JSON.parse(manifest.source_manifest_json);
    if (!source || source.result !== 'complete' || source.source_table !== 'minedItemSummary' ||
        !['source_url', 'artifact_sha256', 'item_count', 'retrieval_id', 'retrieved_at',
            'manifest_version', 'normalization_version'].every(key => source[key] === manifest[key])) {
        throw new Error('Catalog import metadata disagrees with its acquisition manifest.');
    }
    const counts = JSON.parse(manifest.category_counts);
    if (!counts || Array.isArray(counts) || typeof counts !== 'object' ||
        !Object.entries(counts).every(([name, n]) => CATALOG_CATEGORIES.includes(name) && Number.isSafeInteger(n) && n > 0) ||
        !source.category_counts || Object.keys(source.category_counts).length !== Object.keys(counts).length ||
        !Object.entries(counts).every(([category, n]) => source.category_counts[category] === n) ||
        Object.values(counts).reduce((sum, n) => sum + n, 0) !== manifest.item_count) {
        throw new Error('Invalid catalog category inventory.');
    }
    return counts;
}

// Read one snapshot. Bounded, keyset-paged reads keep large item metadata off the heap
// between batches. Hash the same ordered UTF-8 tuples as the catalog importer.
async function verifyCatalog(run, get, all) {
    await run('BEGIN');
    try {
        const manifest = await get('SELECT * FROM catalog_manifest WHERE id = 1');
        const counts = expectedCategories(manifest);
        const { count } = await get('SELECT COUNT(*) AS count FROM catalog_members');
        if (count !== manifest.item_count) throw new Error('Catalog membership count differs from its manifest.');
        const hash = createHash('sha256');
        const actual = new Map();
        let lastId = 0;
        let verified = 0;
        const columns = ITEM_FIELDS.map(field => 'i.' + field).join(', ');
        while (true) {
            const rows = await all(`SELECT ${columns} FROM catalog_members m
                JOIN items i ON i.game_item_id = m.game_item_id
                WHERE m.game_item_id > ? ORDER BY m.game_item_id LIMIT 512`, [lastId]);
            for (const row of rows) {
                actual.set(row.category, (actual.get(row.category) || 0) + 1);
                hash.update(JSON.stringify(ITEM_FIELDS.map(field => row[field])) + '\n');
                lastId = row.game_item_id;
            }
            verified += rows.length;
            if (rows.length < 512) break;
        }
        if (verified !== manifest.item_count || hash.digest('hex') !== manifest.catalog_sha256 ||
            !Object.entries(counts).every(([category, n]) => actual.get(category) === n)) {
            throw new Error('Stored catalog items differ from the verified import.');
        }
        await run('COMMIT');
    } catch (error) {
        await run('ROLLBACK');
        throw new Error('Catalog verification failed. Import the verified UESP catalog with populate_sqlite.py. ' + error.message);
    }
}

module.exports = { verifyCatalog, CATALOG_CATEGORIES };
