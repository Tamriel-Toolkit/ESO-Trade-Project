const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, query } = require('../test-support/sandbox');

test('exact equipment filters, pagination counts, and saved filters use one API contract', async t => {
    // Synthetic counterexamples exist only in the disposable test database.
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    const base = `http://127.0.0.1:${await sandbox.start()}`;
    const login = await fetch(base + '/api/dev/bypass-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: 1 }) }).then(r => r.json());
    const fixtures = [
        ['Deadly Ring', 'Deadly Strike', 12, 0, 0, 'Jewelry', 'Ring'],
        ['Deadly Necklace', 'Deadly Strike', 2, 0, 0, 'Jewelry', 'Necklace'],
        ['Deadly Strike Ring (unrelated)', 'Other Set', 12, 0, 0, 'Jewelry', 'Ring'],
        ['Light Chest', "Order's Wrath", 3, 1, 0, 'Apparel', 'Light Armor'],
        ['Light Feet', "Order's Wrath", 10, 1, 0, 'Apparel', 'Light Armor'],
        ['Heavy Chest', "Order's Wrath", 3, 3, 0, 'Apparel', 'Heavy Armor'],
        ['Fire Staff', 'Staff Set', 6, 0, 12, 'Weapons', 'Destruction Staff'],
        ['Ice Staff', 'Staff Set', 6, 0, 13, 'Weapons', 'Destruction Staff'],
        ['Lightning Staff', 'Staff Set', 6, 0, 15, 'Weapons', 'Destruction Staff'],
    ];
    const observations = [];
    for (const [index, [name, set, equip_type, armor_type, weapon_type, category, subcategory]] of fixtures.entries()) {
        const id = 900000 + index;
        const metadata = { set: { name: set }, raw: { equip_type, armor_type, weapon_type } };
        await query(sandbox.dbPath, 'INSERT INTO items (game_item_id, name, category, subcategory, set_name, rarity, metadata) VALUES (?, ?, ?, ?, ?, 4, ?)', [id, name, category, subcategory, index % 2 ? set : null, JSON.stringify(metadata)]);
        observations.push({ uid: String(id), guild_id: '88', game_item_id: id, item_name: name, seller_name: '@Test', total_price: 100, quantity: 1, guild_name: 'Test', location: 'Summerset', level: 50, quality: 4, trait_id: 4, observed_at: Math.floor(Date.now() / 1000), time_remaining: 86400 });
    }
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token };
    const upload = await fetch(base + '/api/market/upload-scans', { method: 'POST', headers, body: JSON.stringify({ lifecycle_version: 1, server: 'EU', observations, purchases: [] }) });
    assert.equal(upload.status, 200, await upload.text());
    const listings = async filters => {
        const response = await fetch(base + '/api/market/listings?' + new URLSearchParams({ server: 'EU', ...filters }));
        assert.equal(response.status, 200);
        return response.json();
    };
    let result = await listings({ set: 'deadly strike', slot: 'ring', trait: 'Infused', rarity: '4', location: 'Summerset', max_age: '7' });
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].item_name, 'Deadly Ring');
    assert.equal((await listings({ search: 'Deadly Strike' })).listings[0].item_name, 'Deadly Strike Ring (unrelated)');
    result = await listings({ set: "Order's Wrath", slot: 'chest', weight: 'light' });
    assert.equal(result.total, 1);
    assert.equal(result.listings[0].item_name, 'Light Chest');
    assert.equal((await listings({ weapon: 'ice-staff' })).listings[0].item_name, 'Ice Staff');
    assert.equal((await listings({ set: 'Staff Set', limit: '1', offset: '1' })).total, 3);
    assert.equal((await listings({ set: 'Deadly Strike', server: 'NA' })).total, 0);
    assert.equal((await listings({ set: "' OR 1=1 --" })).total, 0);
    for (const bad of ['slot=999', 'weight=invalid', 'weapon=invalid', 'slot=head&slot=feet']) {
        assert.equal((await fetch(base + '/api/market/listings?' + bad)).status, 400);
    }
    const filter_params = { server: 'EU', set: "Order's Wrath", slot: 'chest', weight: 'light', weapon: '', deals_only: true, min_value_index: '1.75' };
    const save = await fetch(base + '/api/saved-searches', { method: 'POST', headers, body: JSON.stringify({ name: 'Exact equipment', filter_params }) });
    assert.equal(save.status, 201);
    assert.deepEqual((await save.json()).saved_search.filter_params, filter_params);
    const reload = await fetch(base + '/api/saved-searches', { headers }).then(r => r.json());
    assert.deepEqual(reload.saved_searches[0].filter_params, filter_params);
});
