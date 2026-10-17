const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { createSandbox, query } = require('../test-support/sandbox');

// All accounts, credentials and market rows below exist only in the owned sandbox.
async function fixture(t, mode) {
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    const port = await sandbox.start({ mode, trustProxy: 'loopback' });
    const request = (path, options = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
        ...options, signal: AbortSignal.timeout(10000),
    });
    const accounts = [];
    for (const name of ['ScanOwner', 'OtherOwner']) {
        const response = await request('/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name, email: `${name}@example.test`, password: randomBytes(24).toString('hex') }),
        });
        assert.equal(response.status, 200);
        const { user, token } = await response.json();
        accounts.push({ id: user.id, name, token, cookie: response.headers.get('set-cookie').split(';')[0] });
        await query(sandbox.dbPath, `INSERT INTO characters (user_id, name, class, level, alliance, master_crafter_unlocked)
            VALUES (?, ?, 'Templar', 25, 2, 0)`, [user.id, name]);
    }
    await query(sandbox.dbPath, `INSERT INTO guild_trader_listings
        (game_item_id, server, item_name, guild_name, seller_name, price, total_price, quantity, level, quality, trait_id)
        VALUES (1129, 'NA', 'Lockpicks', 'Historical fixture', '@HistoricalFixture', 10, 10, 1, 1, 1, 0)`);
    let uploadCount = 0;
    const upload = async (body, account = accounts[0], cookie = false) => {
        // Exercise real production middleware through a loopback-only trusted proxy.
        // Separate simulated clients stay below the real 10-upload/minute limit.
        const headers = { 'Content-Type': 'application/json',
            'X-Forwarded-For': `192.0.2.${Math.floor(uploadCount++ / 8) + 1}` };
        if (account) Object.assign(headers, cookie ? { Cookie: account.cookie } : { Authorization: `Bearer ${account.token}` });
        const response = await request('/api/market/upload-scans', { method: 'POST', headers, body: JSON.stringify(body) });
        return { status: response.status, body: await response.json() };
    };
    const snapshot = async () => {
        const result = {};
        for (const table of ['characters', 'guild_trader_listings', 'native_listing_observations', 'native_listing_groups', 'native_listing_tombstones']) {
            // Table names are fixed test constants, never request input.
            result[table] = await query(sandbox.dbPath, `SELECT * FROM ${table} ORDER BY rowid`);
        }
        return result;
    };
    return { sandbox, request, accounts, upload, snapshot };
}

const observation = (uid, overrides = {}) => ({
    uid, guild_id: '88', game_item_id: 1129, item_name: 'Lockpicks',
    seller_name: '@ScanFixture', guild_name: 'Scan fixture', location: 'Test location',
    total_price: 744, quantity: 200, level: 1, quality: 1, trait_id: 0,
    observed_at: Math.floor(Date.now() / 1000), time_remaining: 86400, ...overrides,
});

for (const mode of ['production', 'development', 'test']) {
    test(`${mode}: scan protocol and ownership rejection are atomic; owner uploads remain usable`, { timeout: 30000 }, async t => {
        const { sandbox, request, accounts, upload, snapshot } = await fixture(t, mode);
        const [owner, other] = accounts;
        const native = { lifecycle_version: 1, server: 'NA', player_name: owner.name,
            observations: [observation('9007199254740993')] };
        const legacyRow = { game_item_id: 1129, item_name: 'Lockpicks', price: 3.72,
            total_price: 744, quantity: 200, guild_name: 'Scan fixture', seller_name: '@ScanFixture' };
        const baseline = await snapshot();

        await t.test('authentication precedes protocol handling', async () => {
            for (const body of [native, { server: 'NA', player_name: owner.name, listings: [{}] }]) {
                assert.equal((await upload(body, null)).status, 401);
            }
            assert.deepEqual(await snapshot(), baseline);
        });

        await t.test('all legacy/unsupported payloads fail before character or listing writes', async () => {
            for (const listings of [undefined, [], [{}], [null], [legacyRow, {}], [legacyRow]]) {
                for (const [account, name, cookie] of [[other, owner.name, false], [owner, other.name, true], [owner, 'UncreatedScanner', false]]) {
                    const result = await upload({ server: 'NA', player_name: name, listings }, account, cookie);
                    assert.equal(result.status, 400);
                    assert.equal(result.body.code, 'UNSUPPORTED_SCAN_PROTOCOL');
                    assert.equal(result.body.supported_lifecycle_version, 1);
                    assert.match(result.body.error, /Upgrade/);
                    assert.deepEqual(await snapshot(), baseline);
                }
            }
            for (const version of [null, 0, 2, '1', true]) {
                const result = await upload({ ...native, lifecycle_version: version });
                assert.equal(result.status, 400);
                assert.equal(result.body.code, 'UNSUPPORTED_SCAN_PROTOCOL');
                assert.deepEqual(await snapshot(), baseline);
            }
        });

        await t.test('native ownership checks protect both accounts with bearer and cookie auth', async () => {
            for (const [account, target] of [[other, owner], [owner, other]]) {
                for (const cookie of [false, true]) {
                    for (const records of [{ observations: native.observations }, {
                        purchases: [{ uid: '9007199254740993', guild_id: '88', purchased_at: Math.floor(Date.now() / 1000) }],
                    }]) {
                        const result = await upload({ lifecycle_version: 1, server: 'NA', player_name: target.name,
                            player_class: 'Arcanist', player_level: 50, ...records }, account, cookie);
                        assert.equal(result.status, 403);
                        assert.deepEqual(await snapshot(), baseline);
                    }
                }
            }
        });

        await t.test('empty, invalid and mixed native batches leave metadata and listings untouched', async () => {
            for (const observations of [[], [{}], [null], [observation('101'), {}]]) {
                const result = await upload({ ...native, player_class: 'Arcanist', observations });
                assert.equal(result.status, 400);
                assert.deepEqual(await snapshot(), baseline);
            }
            // A later foreign-key failure must also roll back a valid earlier row and owner metadata.
            const result = await upload({ ...native, player_class: 'Arcanist', observations: [
                observation('101'), observation('102', { game_item_id: 2147483647 }),
            ] });
            assert.equal(result.status, 500);
            assert.deepEqual(await snapshot(), baseline);
        });

        await t.test('owner metadata, exact UIDs, replay, search and purchase-only batches work', async () => {
            for (const cookie of [false, true]) {
                const result = await upload({ ...native, player_class: 'Arcanist', player_level: 50 }, owner, cookie);
                assert.equal(result.status, 200);
                assert.equal(result.body.accepted, 1);
            }
            const [character] = await query(sandbox.dbPath, 'SELECT user_id, class, level FROM characters WHERE name = ?', [owner.name]);
            assert.deepEqual(character, { user_id: owner.id, class: 'Arcanist', level: 50 });
            assert.deepEqual(await query(sandbox.dbPath, 'SELECT uid FROM native_listing_observations'), [{ uid: '9007199254740993' }]);
            const market = async () => {
                const response = await request('/api/market/listings?server=NA&search=Lockpicks');
                assert.equal(response.status, 200);
                return (await response.json()).listings;
            };
            const rows = await market();
            const listing = rows.find(row => row.seller_name === '@ScanFixture');
            assert.ok(listing, 'Committed native listing is immediately searchable');
            assert.equal(listing.active_stacks, 1);
            assert.equal(listing.price, 3.72);
            assert.equal(listing.total_price, 744);
            assert.ok(rows.some(row => row.seller_name === '@HistoricalFixture'));
            const purchased = await upload({ lifecycle_version: 1, server: 'NA', purchases: [
                { uid: '9007199254740993', guild_id: '88', purchased_at: Math.floor(Date.now() / 1000) },
            ] }, owner, true);
            assert.equal(purchased.status, 200);
            assert.equal((await market()).some(row => row.seller_name === '@ScanFixture'), false);
            await upload(native);
            assert.equal((await market()).some(row => row.seller_name === '@ScanFixture'), false, 'Replay cannot resurrect a purchase');
            assert.deepEqual(await query(sandbox.dbPath, 'SELECT * FROM guild_trader_listings ORDER BY rowid'), baseline.guild_trader_listings);
        });
    });
}
