const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createSandbox, query} = require('../test-support/sandbox');
const {spawnSync} = require('node:child_process');

const now = () => Math.floor(Date.now() / 1000);
const observation = (uid, overrides = {}) => ({
    uid, guild_id: '88', game_item_id: 123456, item_name: 'Lifecycle Test Sword',
    seller_name: '@TestSeller', total_price: 744, quantity: 200, guild_name: 'Test Guild',
    location: 'Test City', level: 50, quality: 4, trait_id: 3, observed_at: now(), time_remaining: 86400,
    ...overrides,
});

async function fixture(t) {
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    const port = await sandbox.start();
    const base = `http://127.0.0.1:${port}`;
    await query(sandbox.dbPath, 'DELETE FROM guild_trader_listings');
    await query(sandbox.dbPath, `INSERT INTO items (game_item_id, name, category, subcategory, rarity, metadata)
        VALUES (123456, 'Lifecycle Test Sword', 'Weapons', 'Sword', 4, '{}')`);
    const login = await fetch(base + '/api/dev/bypass-login', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user_id: 1}),
    }).then(r => r.json());
    const upload = async (body, token = login.token) => {
        const response = await fetch(base + '/api/market/upload-scans', {
            method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token},
            body: JSON.stringify(body),
        });
        return {status: response.status, body: await response.json()};
    };
    const send = (observations = [], purchases = [], server = 'NA') => upload({lifecycle_version: 1, server, observations, purchases});
    const listings = async () => (await fetch(base + '/api/market/listings?server=NA&trait=Precise&search=Lifecycle').then(r => r.json())).listings;
    return {sandbox, base, upload, send, listings};
}

test('individual Id64s remain distinct through repeat, filter and chunk uploads; exact price survives', async t => {
    const {send, listings, sandbox} = await fixture(t);
    const first = observation('9007199254740993');
    const second = observation('9007199254740994');
    assert.equal((await send([first])).status, 200);
    assert.equal((await send([second])).status, 200);
    await send([first, first]); // Duplicate callback and replay.
    const rows = await listings();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].active_stacks, 2);
    assert.equal(rows[0].total_price, 744);
    assert.equal(rows[0].price, 3.72);
    assert.equal(rows[0].trait_name, 'Precise');
    assert.equal((await query(sandbox.dbPath, 'SELECT uid FROM native_listing_observations')).length, 2);
});

test('confirmed purchase removes one stack once and prevents old/new replays resurrecting it', async t => {
    const {send, listings, sandbox} = await fixture(t);
    await send([observation('101'), observation('102')]);
    const purchase = {uid: '101', guild_id: '88', purchased_at: now()};
    assert.equal((await send([], [purchase])).status, 200); // No listings or character required.
    await send([], [purchase]);
    await send([observation('101', {observed_at: now() + 1})]);
    assert.equal((await listings())[0].active_stacks, 1);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM native_listing_tombstones')).length, 1);
    await send([observation('103')]); // Genuine relisting: different UID.
    assert.equal((await listings())[0].active_stacks, 2);
    // Purchase arriving before the scan also suppresses delayed observations.
    await send([], [{uid: '104', guild_id: '88', purchased_at: now()}]);
    await send([observation('104')]);
    assert.equal((await listings())[0].active_stacks, 2);
});

test('failed batch rolls back all records; UID scopes and precision are validated; auth is mandatory', async t => {
    const {upload, send, sandbox} = await fixture(t);
    assert.equal((await upload({lifecycle_version: 1, server: 'NA', observations: [observation('101')]}, 'invalid')).status, 401);
    assert.equal((await upload({lifecycle_version: 1, server: 'NA', observations: [null]})).status, 400);
    for (const overrides of [{uid: 9007199254740993}, {uid: '0'}, {uid: '18446744073709551616'},
        {quantity: 0}, {total_price: 1.5}, {observed_at: now() + 301}, {time_remaining: -1}]) {
        assert.equal((await send([observation('101', overrides)])).status, 400);
    }
    assert.equal((await send([observation('101'), observation('102', {game_item_id: 2147483647})])).status, 500);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM native_listing_observations')).length, 0);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM native_listing_groups')).length, 0);
    assert.equal((await send([observation('101')], [{uid: '101', guild_id: '99', purchased_at: now()}])).status, 400);
    await send([observation('101')]);
    assert.equal((await send([observation('101', {quantity: 1})])).status, 400);
    assert.equal((await send([observation('201'), observation('201', {total_price: 999})])).status, 400);
    assert.equal((await send([], [{uid: '101', guild_id: '99', purchased_at: now()}])).status, 400);
    assert.equal((await send([], [{uid: '101', guild_id: '99', purchased_at: now()}], 'EU')).status, 200);
    assert.equal((await query(sandbox.dbPath, "SELECT * FROM native_listing_observations WHERE server = 'NA'")).length, 1);
});

test('actual observation/remaining time controls expiry; delayed uploads never reset freshness', async t => {
    const {send, listings, sandbox} = await fixture(t);
    const captured = now() - 3600;
    await send([observation('101', {observed_at: captured, time_remaining: 3700})]);
    let [row] = await query(sandbox.dbPath, 'SELECT observed_at, expires_at FROM native_listing_observations');
    assert.equal(row.observed_at, captured);
    assert.equal(row.expires_at, captured + 3700);
    await send([observation('101', {observed_at: captured - 1, time_remaining: 2592000})]);
    [row] = await query(sandbox.dbPath, 'SELECT observed_at, expires_at FROM native_listing_observations');
    assert.equal(row.expires_at, captured + 3700);
    await send([observation('102', {observed_at: captured, time_remaining: 10})]);
    assert.equal((await listings())[0].active_stacks, 1); // Per-UID expiry, before timer.
    await send([observation('103', {observed_at: now() - 2592001, time_remaining: null})]);
    assert.equal((await query(sandbox.dbPath, "SELECT * FROM native_listing_observations WHERE uid = '103'")).length, 0);
});

test('30-day retention hides old native and legacy NULL-expiry rows immediately and physically purges them', async t => {
    const {send, listings, sandbox, base} = await fixture(t);
    await send([observation('101', {time_remaining: null})]);
    await query(sandbox.dbPath, "UPDATE native_listing_observations SET observed_at = strftime('%s', 'now') - 2592001");
    await query(sandbox.dbPath, `INSERT INTO guild_trader_listings
        (game_item_id, server, item_name, guild_name, seller_name, price, quantity, trait_id, discovered_at, expires_at)
        VALUES (123456, 'NA', 'Lifecycle Test Sword', 'Legacy Guild', '@Other', 1, 1, 3, datetime('now', '-31 days'), NULL)`);
    assert.deepEqual(await listings(), []);
    const status = await fetch(base + '/api/status').then(r => r.json());
    assert.equal(status.active_listings, 0);
    const result = await fetch(base + '/api/market/listings/purge-expired', {method: 'POST'}).then(r => r.json());
    assert.equal(result.purged, 2);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM native_listing_observations')).length, 0);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM guild_trader_listings')).length, 0);
});

test('legacy rows are not assigned invented UIDs, filtered uploads preserve unrelated rows, takeover cannot double-count', async t => {
    const {upload, send, listings, sandbox} = await fixture(t);
    const legacy = {...observation('101'), price: 3.72, active_stacks: 3};
    delete legacy.uid; delete legacy.guild_id;
    await upload({server: 'NA', listings: [legacy, {...legacy, seller_name: '@Other'}]});
    await query(sandbox.dbPath, "UPDATE guild_trader_listings SET discovered_at = datetime('now', '-1 day')");
    await upload({server: 'NA', listings: [legacy]});
    assert.equal((await listings()).length, 2);
    assert.equal((await query(sandbox.dbPath, 'SELECT * FROM native_listing_observations')).length, 0);
    await send([observation('101'), observation('102')]);
    let rows = await listings();
    assert.equal(rows.find(row => row.seller_name === '@TestSeller').active_stacks, 2);
    await send([], [{uid: '101', guild_id: '88', purchased_at: now()}, {uid: '102', guild_id: '88', purchased_at: now()}]);
    await upload({server: 'NA', listings: [legacy]});
    rows = await listings();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].seller_name, '@Other');
});

test('all market consumers exclude purchased/expired/stale rows while retaining genuine live observations', async t => {
    const {send, sandbox, base} = await fixture(t);
    const [character] = await query(sandbox.dbPath, `INSERT INTO characters (name, class, level, user_id)
        VALUES ('Lifecycle Test Character', 'Dragonknight', 50, 1) RETURNING id`);
    await query(sandbox.dbPath, 'INSERT INTO watchlists (character_id, game_item_id, target_price) VALUES (?, 123456, 1000)', [character.id]);
    await query(sandbox.dbPath, `INSERT INTO character_trait_research
        (character_id, crafting_type, equipment_type, trait_id, trait_name, research_status)
        VALUES (?, 'Blacksmithing', 'Sword', 3, 'Precise', 'UNKNOWN')`, [character.id]);
    const [build] = await query(sandbox.dbPath, `INSERT INTO builds (title, class, role, author)
        VALUES ('Lifecycle Test Build', 'Dragonknight', 'Tank', '@Test') RETURNING id`);
    await query(sandbox.dbPath, `INSERT INTO build_items
        (build_id, slot_id, slot_name, game_item_id, item_name, set_name, is_tradeable)
        VALUES (?, 4, 'Main Hand', 123456, 'Lifecycle Test Sword', 'Lifecycle Test', 1)`, [build.id]);
    await query(sandbox.dbPath, `INSERT INTO trade_requests
        (user_id, request_type, server, game_item_id, item_name, buyer_display_handle, offered_gold_price, status, expires_at)
        VALUES (1, 'WTB', 'NA', 123456, 'Lifecycle Test Sword', '@Test', 1000, 'OPEN', datetime('now', '+1 day'))`);
    const get = async path => {
        const response = await fetch(base + path);
        assert.equal(response.status, 200, path);
        return response.json();
    };
    const check = async available => {
        assert.equal((await get('/api/status')).active_listings, available ? 1 : 0);
        assert.equal((await get(`/api/listings/personalized/${character.id}`)).total, available ? 1 : 0);
        const watchlist = await get(`/api/watchlist/${character.id}`);
        assert.equal(watchlist[0].observed_listing_count, available ? 1 : null);
        assert.equal((await get(`/api/watchlist/${character.id}/alerts`)).length, available ? 1 : 0);
        assert.equal((await get(`/api/builds/${build.id}/deals`)).deals_by_slot[0].listings.length, available ? 1 : 0);
        assert.equal((await get(`/api/characters/${character.id}/trait-matches`)).available_matches_count, available ? 1 : 0);
        assert.equal((await get('/api/requests')).requests[0].observed_listing_count, available ? 1 : null);
    };
    await send([observation('101')]);
    await check(true);
    await send([], [{uid: '101', guild_id: '88', purchased_at: now()}]);
    await check(false);
    await send([observation('102', {time_remaining: 0}), observation('103', {time_remaining: null})]);
    await query(sandbox.dbPath, "UPDATE native_listing_observations SET observed_at = strftime('%s', 'now') - 2592001 WHERE uid = '103'");
    await check(false);
});

test('multiple 500-record chunks and concurrent collectors never reconcile absence or duplicate UIDs', async t => {
    const {send, listings} = await fixture(t);
    const batch = Array.from({length: 501}, (_, i) => observation(String(1000 + i)));
    await send(batch.slice(0, 500));
    await send(batch.slice(500));
    await Promise.all([send(batch.slice(0, 10)), send(batch.slice(0, 10))]);
    assert.equal((await listings())[0].active_stacks, 501);
});

test('desktop and central API apply the same lifecycle sequence to identical active read models', async t => {
    const {send, sandbox} = await fixture(t);
    const batches = [
        {observations: [observation('101'), observation('102')]},
        {observations: [observation('101', {observed_at: now() - 60})]},
        {purchases: [{uid: '101', guild_id: '88', purchased_at: now()}]},
        {observations: [observation('101'), observation('103', {time_remaining: 0}), observation('104', {observed_at: now() - 2592001, time_remaining: null})]},
    ];
    for (const batch of batches) assert.equal((await send(batch.observations || [], batch.purchases || [])).status, 200);
    const env = {};
    for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) {
        if (process.env[key]) env[key] = process.env[key];
    }
    const python = spawnSync('python', ['-B', '-c', `
import json, sqlite3, sys
from contextlib import closing
from listing_lifecycle import ensure_schema, apply_records
with closing(sqlite3.connect(':memory:')) as db:
    db.executescript("""CREATE TABLE items (game_item_id INTEGER PRIMARY KEY); INSERT INTO items VALUES (123456);
    CREATE TABLE guild_trader_listings (id INTEGER, game_item_id INTEGER, item_name TEXT, server TEXT,
    seller_name TEXT, price REAL, total_price INTEGER, quantity INTEGER, active_stacks INTEGER,
    guild_name TEXT, location TEXT, level INTEGER, quality INTEGER, trait_id INTEGER, expires_at TEXT, discovered_at TEXT);""")
    ensure_schema(db)
    for batch in json.load(sys.stdin):
        apply_records(db, 'NA', batch.get('observations', []), batch.get('purchases', []))
    db.commit()
    print(json.dumps(db.execute('SELECT game_item_id, server, price, total_price, quantity, active_stacks, trait_id, discovered_at, expires_at FROM guild_trader_active_listings ORDER BY game_item_id').fetchall()))
`], {cwd: __dirname, env, input: JSON.stringify(batches), encoding: 'utf8', timeout: 10000});
    assert.equal(python.status, 0, python.stderr);
    const central = await query(sandbox.dbPath, `SELECT game_item_id, server, price, total_price, quantity, active_stacks,
        trait_id, discovered_at, expires_at FROM guild_trader_active_listings ORDER BY game_item_id`);
    assert.deepEqual(central.map(row => Object.values(row)), JSON.parse(python.stdout));
});
