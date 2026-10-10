// Run unmodified production sources in a disposable directory, never beside .env or real data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const sqlite3 = require('sqlite3');

function createSandbox() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eso-tests-'));
    const backend = path.join(root, 'backend');
    fs.mkdirSync(path.join(backend, 'exports'), { recursive: true });
    const source = path.resolve(__dirname, '..');
    for (const name of ['server.js', 'database_helpers.js', 'scan_transaction.js', 'listing_lifecycle.js', 'listing_lifecycle.sql', 'proxy_config.js', 'curated_builds.js', 'eso_sets.json', 'set_weights.json']) {
        fs.copyFileSync(path.join(source, name), path.join(backend, name));
    }
    fs.cpSync(path.join(source, 'assets'), path.join(backend, 'assets'), { recursive: true });
    const dbPath = path.join(backend, 'exports', 'eso_catalog.db');
    let child;
    let logs = '';
    const downloads = new Map();

    async function start({ mode = 'test', trustProxy = 'false' } = {}) {
        // Allow only OS essentials. Do not inherit credentials, DB_PATH, NODE_OPTIONS, or proxy settings.
        const env = {};
        for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) {
            if (process.env[key]) env[key] = process.env[key];
        }
        Object.assign(env, {
            NODE_ENV: mode, PORT: '0', DB_PATH: dbPath, TRUST_PROXY: trustProxy,
            ENABLE_DEV_ENDPOINTS: 'true', NODE_PATH: path.join(source, 'node_modules'),
            ESO_TEST_SERVER: path.join(backend, 'server.js'),
        });
        child = fork(path.join(__dirname, 'server-child.js'), [], {
            cwd: backend, env, execArgv: [], silent: true,
        });
        child.stdout.on('data', data => { logs += data; });
        child.stderr.on('data', data => { logs += data; });
        child.on('message', message => {
            if (message.type === 'fetch') downloads.set(message.filename, (downloads.get(message.filename) || 0) + 1);
        });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => finish(new Error(`Test server startup timed out:\n${logs}`)), 20000);
            function onExit(code) { finish(new Error(`Test server exited (${code}):\n${logs}`)); }
            function onMessage(message) {
                if (message.type === 'ready') finish(null, message.port);
            }
            function finish(error, port) {
                clearTimeout(timer);
                child.off('exit', onExit);
                child.off('error', finish);
                child.off('message', onMessage);
                if (error) reject(error);
                else resolve(port);
            }
            child.once('exit', onExit);
            child.once('error', finish);
            child.on('message', onMessage);
        });
    }

    async function stop() {
        if (!child || child.exitCode !== null || child.signalCode !== null) return;
        const closed = once(child, 'close');
        child.send({ type: 'shutdown' });
        const timer = setTimeout(() => child.kill('SIGKILL'), 6000);
        try { await closed; } finally { clearTimeout(timer); }
    }

    async function dispose() {
        await stop();
        // Only remove the exact directory allocated by mkdtemp above, never a supplied path.
        if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('eso-tests-')) {
            throw new Error('Unsafe sandbox cleanup path');
        }
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }

    return { root, backend, dbPath, start, stop, dispose, downloads,
        releaseIcon: () => child.send({ type: 'release-icon' }),
        get logs() { return logs; },
    };
}

function query(dbPath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.configure('busyTimeout', 5000);
        db.all(sql, params, (error, rows) => {
            db.close(closeError => error || closeError ? reject(error || closeError) : resolve(rows));
        });
    });
}

module.exports = { createSandbox, query };
