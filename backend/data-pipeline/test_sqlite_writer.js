const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { withTransaction, statements, configureConnection, createWriterQueue } = require('../sqlite_writer');

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

test('writer admission bounds both depth and waiting time and releases a failed slot', async () => {
    const admit = createWriterQueue(1, 30);
    const gate = deferred();
    const owner = admit(() => gate.promise);
    const waiter = admit(() => assert.fail('timed-out work ran'));
    await assert.rejects(admit(() => assert.fail()), { status: 503 });
    await assert.rejects(waiter, { status: 503 });
    gate.reject(new Error('owner failed'));
    await assert.rejects(owner, /owner failed/);
    assert.equal(await admit(() => 42), 42);
});

test('WAL readers only see commits and ambiguous writes are never replayed', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eso-writer-'));
    const filename = path.join(root, 'fixture.db');
    const reader = new sqlite3.Database(filename);
    t.after(async () => {
        await new Promise((resolve, reject) => reader.close(err => err ? reject(err) : resolve()));
        await fs.rm(root, { recursive: true, force: true });
    });
    const { run, all, get } = statements(reader);
    await run('CREATE TABLE example (uid TEXT)');
    assert.equal((await get('PRAGMA journal_mode')).journal_mode, 'delete');
    await configureConnection(reader);
    const gate = deferred();
    const inserted = deferred();
    const failed = withTransaction(filename, async write => {
        await write("INSERT INTO example VALUES ('rollback')");
        inserted.resolve();
        await gate.promise;
        throw new Error('cancel');
    });
    await inserted.promise;
    const uid = '18446744073709551615';
    const second = withTransaction(filename, write => write('INSERT INTO example VALUES (?)', [uid]));
    try {
        assert.deepEqual(await all('SELECT * FROM example'), []);
    } finally {
        gate.resolve();
    }
    await assert.rejects(failed, /cancel/);
    await second;
    assert.deepEqual(await all('SELECT * FROM example'), [{ uid }]);

    // Model a durable commit whose acknowledgment is lost. The wrapper's COMMIT
    // and subsequent ROLLBACK both fail. A fresh connection must serve the next call.
    let calls = 0;
    await assert.rejects(withTransaction(filename, async write => {
        calls++;
        await write("INSERT INTO example VALUES ('paid')");
        await write('COMMIT');
    }), /no transaction is active/);
    assert.equal(calls, 1);
    assert.deepEqual(await withTransaction(filename, (_run, _get, readAll) =>
        readAll('SELECT * FROM example ORDER BY rowid')), [{ uid }, { uid: 'paid' }]);
});
