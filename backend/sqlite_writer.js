const sqlite3 = require('sqlite3');
const { rollbackTransaction } = require('./database_helpers');

const WAIT_MS = 5000;
const MAX_WAITERS = 32;

function busyError() {
    return Object.assign(new Error('Database writer is busy. Retry later.'), { status: 503 });
}

// One active writer per API process. Waiters hold neither SQLite connections nor worker threads.
function createWriterQueue(maxWaiters = MAX_WAITERS, waitMs = WAIT_MS) {
    const waiting = [];
    let active = false;
    return async function admit(operation) {
        if (active) {
            if (waiting.length >= maxWaiters) throw busyError();
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    waiting.splice(waiting.indexOf(wake), 1);
                    reject(busyError());
                }, waitMs);
                function wake() {
                    clearTimeout(timer);
                    resolve();
                }
                waiting.push(wake);
            });
        }
        active = true;
        try {
            return await operation();
        } finally {
            if (waiting.length) waiting.shift()();
            else active = false;
        }
    };
}

const admitWriter = createWriterQueue();

function statements(db) {
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
    const query = method => (sql, params = []) => new Promise((resolve, reject) => {
        db[method](sql, params, (err, result) => err ? reject(err) : resolve(result));
    });
    return { run, get: query('get'), all: query('all') };
}

async function configureConnection(connection) {
    const { run, get } = statements(connection);
    connection.configure('busyTimeout', WAIT_MS);
    for (const [name, value] of Object.entries({
        journal_mode: 'wal', foreign_keys: 1, synchronous: 2,
        busy_timeout: WAIT_MS, cache_size: -2048, temp_store: 1
    })) {
        await run(`PRAGMA ${name} = ${value}`);
        const row = await get(`PRAGMA ${name}`);
        if (Object.values(row)[0] !== value) throw new Error(`SQLite refused required ${name}=${value}`);
    }
}

function withTransaction(dbPath, operation) {
    return admitWriter(async () => {
        const connection = await new Promise((resolve, reject) => {
            const opened = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => err ? reject(err) : resolve(opened));
        });
        const { run, get, all } = statements(connection);
        let began = false;
        try {
            await configureConnection(connection);
            await run('BEGIN IMMEDIATE');
            began = true;
            const result = await operation(run, get, all);
            await run('COMMIT');
            return result;
        } catch (error) {
            if (began) await rollbackTransaction(run, 'Owned SQLite transaction', error);
            else if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') throw busyError();
            throw error;
        } finally {
            // Never pool or replay this connection, even if COMMIT or ROLLBACK failed.
            await new Promise((resolve, reject) => connection.close(err => err ? reject(err) : resolve()));
        }
    });
}

module.exports = { configureConnection, statements, createWriterQueue, withTransaction };
