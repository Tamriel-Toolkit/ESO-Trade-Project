const sqlite3 = require('sqlite3');
const { rollbackTransaction } = require('./database_helpers');

// Give each scan upload its own connection: unrelated requests must never join
// this transaction or accidentally commit/roll back another request's work.
async function withScanTransaction(dbPath, operation) {
    const connection = await new Promise((resolve, reject) => {
        const opened = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, error => {
            if (error) reject(error);
            else resolve(opened);
        });
    });
    connection.configure('busyTimeout', 5000);
    const run = (sql, params = []) => new Promise((resolve, reject) => {
        connection.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
    let began = false;
    let originalError;
    try {
        await run('PRAGMA foreign_keys = ON');
        await run('BEGIN IMMEDIATE TRANSACTION');
        began = true;
        const result = await operation(run);
        await run('COMMIT');
        return result;
    } catch (error) {
        originalError = error;
        if (began) await rollbackTransaction(run, 'POST /api/market/upload-scans', error);
        throw error;
    } finally {
        await new Promise((resolve, reject) => connection.close(error => {
            if (!error) return resolve();
            if (!originalError) return reject(error);
            console.error('Error closing failed scan transaction:', error.message);
            resolve();
        }));
    }
}

module.exports = { withScanTransaction };
