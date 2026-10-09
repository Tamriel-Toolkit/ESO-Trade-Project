const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { createSandbox, query } = require('../test-support/sandbox');
const { PNG } = require('../test-support/test-image');

async function fixture(t, options) {
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    const port = await sandbox.start(options);
    const request = (route, options = {}) => fetch(`http://127.0.0.1:${port}${route}`, {
        ...options, signal: AbortSignal.timeout(10000),
    });
    return { sandbox, request };
}

const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('icons distinguish download, disk cache, fallback, validation, and single-flight', { timeout: 30000 }, async t => {
    const { sandbox, request } = await fixture(t);
    const cache = path.join(sandbox.backend, 'exports', 'icon-cache');
    await t.test('download bytes and cache hit are exact, not a fallback', async () => {
        for (let i = 0; i < 2; i++) {
            const response = await request('/api/icons/cached.png');
            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type'), /^image\/png/);
            assert.match(response.headers.get('cache-control'), /immutable/);
            assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
        }
        assert.equal(sandbox.downloads.get('cached.png'), 1);
        assert.deepEqual(fs.readFileSync(path.join(cache, 'cached.png')), PNG);
    });
    await t.test('invalid filenames never reach upstream', async () => {
        const before = [...sandbox.downloads];
        for (const name of ['bad.svg', 'bad..png', 'bad%2Ffile.png', '%2e%2e%5Cescape.png']) {
            const response = await request(`/api/icons/${name}`);
            assert.equal(response.status, 400, name);
            assert.equal((await response.json()).error, 'Invalid icon filename.');
        }
        assert.deepEqual([...sandbox.downloads], before);
    });
    await t.test('upstream failures return local SVG and do not cache corrupt files', async () => {
        const fallback = fs.readFileSync(path.join(sandbox.backend, 'assets', 'item-icon-fallback.svg'));
        for (const name of ['missing', 'html', 'empty', 'oversized', 'timeout', 'network']) {
            const filename = `${name}.png`;
            // A second attempt proves a rejected single-flight promise is released for retry.
            for (let attempt = 0; attempt < 2; attempt++) {
                const response = await request(`/api/icons/${filename}`);
                assert.equal(response.status, 200);
                assert.match(response.headers.get('content-type'), /^image\/svg\+xml/);
                assert.match(response.headers.get('cache-control'), /max-age=300/);
                assert.deepEqual(Buffer.from(await response.arrayBuffer()), fallback);
            }
            assert.equal(sandbox.downloads.get(filename), 2);
            assert.equal(fs.existsSync(path.join(cache, filename)), false);
        }
        assert.ok(fs.readdirSync(cache).every(name => !name.endsWith('.tmp')));
    });
    await t.test('simultaneous cache misses share one download', async () => {
        const requests = Array.from({ length: 8 }, () => request('/api/icons/concurrent.png'));
        const all = Promise.all(requests);
        // Keep the upstream promise pending while other incoming requests join it.
        for (let attempt = 0; !sandbox.downloads.has('concurrent.png'); attempt++) {
            assert.ok(attempt < 100, 'Concurrent upstream request never started');
            await delay(10);
        }
        await delay(50);
        sandbox.releaseIcon();
        for (const response of await all) {
            assert.equal(response.status, 200);
            assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
        }
        assert.equal(sandbox.downloads.get('concurrent.png'), 1);
        assert.ok(fs.readdirSync(cache).every(name => !name.endsWith('.tmp')));
    });
});

test('production auth rejects expired sessions and disables development endpoints', { timeout: 30000 }, async t => {
    const { sandbox, request } = await fixture(t, { mode: 'production' });
    const registration = await request('/api/auth/register', post({
        username: 'ProductionFixture', email: 'production@example.test', password: 'FixturePassword123!',
    }));
    assert.equal(registration.status, 200);
    const registered = await registration.json();
    const cookie = registration.headers.get('set-cookie');
    for (const attribute of ['HttpOnly', 'Secure', 'SameSite=None']) assert.ok(cookie.includes(attribute), attribute);
    const sessionCookie = cookie.split(';')[0];
    assert.equal((await request('/api/auth/me', { headers: { Cookie: sessionCookie } })).status, 200);

    await query(sandbox.dbPath, "UPDATE sessions SET expires_at = ? WHERE token = ?", ['2000-01-01T00:00:00.000Z', registered.token]);
    for (const headers of [{ Cookie: sessionCookie }, { Authorization: `Bearer ${registered.token}` }]) {
        const response = await request('/api/auth/me', { headers });
        assert.equal(response.status, 401);
        assert.equal(typeof (await response.json()).error, 'string');
    }
    // Expired rows may remain until the hourly cleanup; denial, not eager deletion, is the contract.

    // Even ENABLE_DEV_ENDPOINTS=true cannot override NODE_ENV=production.
    for (const [route, method] of [
        ['/api/dev/bypass-login', 'POST'], ['/api/dev/users', 'GET'],
        ['/api/dev/users/1', 'DELETE'], ['/api/market/dev/clear-listings', 'POST'],
    ]) {
        const response = await request(route, { method });
        assert.equal(response.status, 404, route);
        await response.text();
    }
    const malformed = await request('/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"incomplete":',
    });
    assert.equal(malformed.status, 400);
    await malformed.text();
    assert.equal((await request('/api/taxonomy')).status, 200, 'Malformed input must not crash the server');
});

test('native upload SQL failure rolls back the whole batch; replay is idempotent', { timeout: 30000 }, async t => {
    const { sandbox, request } = await fixture(t);
    const login = await request('/api/dev/bypass-login', post({ user_id: 1 }));
    const { token } = await login.json();
    const upload = async listings => {
        const options = post({ server: 'NA', listings, player_name: 'AtomicScanCharacter' });
        options.headers.Authorization = `Bearer ${token}`;
        return request('/api/market/upload-scans', options);
    };
    const listing = { game_item_id: 1129, item_name: 'Isolated scan fixture', price: 3.72,
        total_price: 744, quantity: 200, active_stacks: 2, seller_name: '@FailureFixture',
        guild_name: 'Isolated fixture', level: 1, quality: 1, trait_id: 0 };
    await query(sandbox.dbPath, `CREATE TRIGGER reject_scan_fixture BEFORE INSERT ON guild_trader_listings
        WHEN NEW.seller_name = '@RejectedFixture' BEGIN SELECT RAISE(ABORT, 'fixture write failure'); END`);
    const failed = await upload([listing, { ...listing, seller_name: '@RejectedFixture' }]);
    assert.equal(failed.status, 500);
    assert.equal(typeof (await failed.json()).error, 'string');
    assert.deepEqual(await query(sandbox.dbPath, 'SELECT id FROM guild_trader_listings WHERE seller_name = ?', [listing.seller_name]), []);
    assert.deepEqual(await query(sandbox.dbPath, 'SELECT id FROM characters WHERE name = ?', ['AtomicScanCharacter']), []);
    await query(sandbox.dbPath, 'DROP TRIGGER reject_scan_fixture');
    for (let i = 0; i < 2; i++) {
        const response = await upload([listing]);
        assert.equal(response.status, 200);
        await response.json();
    }
    assert.deepEqual(await query(sandbox.dbPath,
        'SELECT active_stacks, price, total_price FROM guild_trader_listings WHERE seller_name = ?', [listing.seller_name]),
    [{ active_stacks: 2, price: 3.72, total_price: 744 }]);

    // A later failure must restore an existing row deleted by trait reconciliation.
    await query(sandbox.dbPath, `CREATE TRIGGER reject_scan_fixture BEFORE INSERT ON guild_trader_listings
        WHEN NEW.seller_name = '@RejectedFixture' BEGIN SELECT RAISE(ABORT, 'fixture write failure'); END`);
    const reconciled = await upload([{ ...listing, trait_id: 3 }, { ...listing, seller_name: '@RejectedFixture' }]);
    assert.equal(reconciled.status, 500);
    await reconciled.json();
    assert.deepEqual(await query(sandbox.dbPath,
        'SELECT trait_id, active_stacks FROM guild_trader_listings WHERE seller_name = ?', [listing.seller_name]),
    [{ trait_id: 0, active_stacks: 2 }]);

    // A failing concurrent batch must not roll back a successful independent upload.
    const simultaneous = await Promise.all([
        upload([{ ...listing, seller_name: '@ConcurrentGood', guild_name: 'Independent fixture' }]),
        upload([{ ...listing, seller_name: '@RejectedFixture' }]),
    ]);
    assert.deepEqual(simultaneous.map(response => response.status), [200, 500]);
    await Promise.all(simultaneous.map(response => response.json()));
    assert.equal((await query(sandbox.dbPath,
        'SELECT id FROM guild_trader_listings WHERE seller_name = ?', ['@ConcurrentGood'])).length, 1);
});

test('legacy listing migration backfills exact totals and is repeatable across restart', { timeout: 30000 }, async t => {
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    await query(sandbox.dbPath, `CREATE TABLE guild_trader_listings (
        id INTEGER PRIMARY KEY, game_item_id INTEGER, server TEXT, seller_name TEXT,
        price INTEGER, quantity INTEGER, active_stacks INTEGER DEFAULT 1, guild_name TEXT,
        location TEXT, level INTEGER DEFAULT 1, quality INTEGER DEFAULT 1,
        trait_id INTEGER DEFAULT 0, expires_at TEXT, discovered_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
    await query(sandbox.dbPath, `INSERT INTO guild_trader_listings
        (id, game_item_id, server, seller_name, price, quantity, guild_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [10, 1129, 'NA', '@LegacyFixture', 10, 3, 'Legacy fixture']);
    for (let i = 0; i < 2; i++) {
        await sandbox.start();
        assert.deepEqual(await query(sandbox.dbPath,
            'SELECT id, price, quantity, total_price FROM guild_trader_listings WHERE seller_name = ?', ['@LegacyFixture']),
        [{ id: 10, price: 10, quantity: 3, total_price: 30 }]);
        await sandbox.stop();
    }
});

test('a schema migration error prevents serving a partially initialized database', { timeout: 30000 }, async t => {
    const sandbox = createSandbox();
    t.after(() => sandbox.dispose());
    await query(sandbox.dbPath, `CREATE TABLE items (game_item_id INTEGER PRIMARY KEY,
        name TEXT, category TEXT, subcategory TEXT, rarity INTEGER, type TEXT,
        set_name TEXT, icon TEXT, metadata TEXT, icon_url TEXT)`);
    await query(sandbox.dbPath, 'INSERT INTO items (game_item_id, name, icon_url) VALUES (?, ?, ?)',
        [999, 'Preserve fixture', '/esoui/art/icons/fixture.dds']);
    await query(sandbox.dbPath, `CREATE TRIGGER fail_icon_migration BEFORE UPDATE OF icon_url ON items
        WHEN OLD.game_item_id = 999 BEGIN SELECT RAISE(ABORT, 'migration fixture failure'); END`);
    await assert.rejects(sandbox.start(), /Startup aborted/);
    assert.match(sandbox.logs, /items\.normalize-icon-extension/);
    assert.deepEqual(await query(sandbox.dbPath, 'SELECT name FROM items WHERE game_item_id = ?', [999]),
        [{ name: 'Preserve fixture' }]);
});

test('failed startup cleans up its owned sandbox', { timeout: 30000 }, async () => {
    const sandbox = createSandbox();
    try {
        await assert.rejects(sandbox.start({ trustProxy: 'not-a-valid-proxy' }), /Invalid TRUST_PROXY/);
    } finally {
        await sandbox.dispose();
    }
    assert.equal(fs.existsSync(sandbox.root), false);
});

test('ambient DB_PATH cannot redirect a test server to external data', { timeout: 30000 }, async () => {
    const sandbox = createSandbox();
    const sentinel = path.join(sandbox.root, 'do-not-touch.db');
    const original = Buffer.from('Not a database: this fixture must never be opened by SQLite.');
    fs.writeFileSync(sentinel, original);
    const previous = process.env.DB_PATH;
    process.env.DB_PATH = sentinel;
    try {
        await sandbox.start();
        assert.deepEqual(fs.readFileSync(sentinel), original);
        assert.notEqual(sandbox.dbPath, sentinel);
    } finally {
        if (previous === undefined) delete process.env.DB_PATH;
        else process.env.DB_PATH = previous;
        await sandbox.dispose();
    }
});
