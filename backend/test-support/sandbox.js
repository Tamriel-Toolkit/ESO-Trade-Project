// Run unmodified production sources in a disposable directory, never beside .env or real data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const sqlite3 = require('sqlite3');

const SANDBOX_FILES = [
    'server.js',
    'password_helpers.js',
    'marketplace_filters.js',
    'database_helpers.js',
    'scan_transaction.js',
    'listing_lifecycle.js',
    'listing_lifecycle.sql',
    'proxy_config.js',
    'curated_builds.js',
    'eso_sets.json',
    'set_weights.json',
];

const ALLOWED_CHILD_ENV_KEYS = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR'];
const activeSandboxRoots = new Set();

function createSanitizedEnv(overrides = {}, sourceEnv = process.env) {
    // Allow only OS essentials. Do not inherit credentials, DB_PATH, NODE_OPTIONS, or proxy settings.
    const env = {};
    for (const key of ALLOWED_CHILD_ENV_KEYS) {
        if (sourceEnv && typeof sourceEnv[key] === 'string' && sourceEnv[key].length > 0) {
            env[key] = sourceEnv[key];
        }
    }
    return Object.assign(env, overrides);
}

function resolveRealOrParentPath(targetPath) {
    const resolved = path.resolve(targetPath);
    if (fs.existsSync(resolved)) {
        return fs.realpathSync(resolved);
    }
    let current = resolved;
    const suffix = [];
    while (!fs.existsSync(current)) {
        const parent = path.dirname(current);
        if (parent === current) break;
        suffix.unshift(path.basename(current));
        current = parent;
    }
    const realCurrent = fs.existsSync(current) ? fs.realpathSync(current) : current;
    return suffix.length > 0 ? path.join(realCurrent, ...suffix) : realCurrent;
}

function assertSandboxRoot(sandboxRoot, { requireActive = true } = {}) {
    if (typeof sandboxRoot !== 'string' || sandboxRoot.trim().length === 0 || !fs.existsSync(sandboxRoot)) {
        throw new Error(`Invalid or missing test sandbox root: "${sandboxRoot}"`);
    }
    const realRoot = fs.realpathSync(sandboxRoot);
    const realTmp = fs.realpathSync(os.tmpdir());
    if (path.dirname(realRoot) !== realTmp || !path.basename(realRoot).startsWith('eso-tests-')) {
        throw new Error(`Unsafe test sandbox root "${sandboxRoot}": must be an eso-tests-* directory in os.tmpdir()`);
    }
    if (requireActive && !activeSandboxRoots.has(realRoot)) {
        throw new Error(`Inactive or unallocated test sandbox root: "${sandboxRoot}"`);
    }
    return realRoot;
}

function isStrictlyInside(parentDir, childPath) {
    const rel = path.relative(parentDir, childPath);
    return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function assertIsolatedDatabasePath(candidatePath, sandboxRoot, { requireActive = true } = {}) {
    if (typeof candidatePath !== 'string' || candidatePath.trim().length === 0) {
        throw new Error('Unsafe test database path: path must be a non-empty string');
    }
    const trimmed = candidatePath.trim();
    if (trimmed === ':memory:' || /^file:/i.test(trimmed) || trimmed.includes('\0')) {
        throw new Error(`Unsafe test database path "${candidatePath}": must be a file inside an allocated test sandbox`);
    }
    const realCandidate = resolveRealOrParentPath(trimmed);

    if (sandboxRoot !== undefined) {
        const realRoot = assertSandboxRoot(sandboxRoot, { requireActive });
        if (!isStrictlyInside(realRoot, realCandidate)) {
            throw new Error(`Unsafe test database path "${candidatePath}": outside allocated sandbox "${realRoot}"`);
        }
        return realCandidate;
    }

    for (const realRoot of activeSandboxRoots) {
        if (isStrictlyInside(realRoot, realCandidate)) {
            return realCandidate;
        }
    }
    throw new Error(`Unsafe test database path "${candidatePath}": outside all active test sandboxes`);
}

function assertNoDotenvFiles(sandboxRoot) {
    const realRoot = assertSandboxRoot(sandboxRoot, { requireActive: false });
    for (const candidate of [path.join(realRoot, '.env'), path.join(realRoot, 'backend', '.env')]) {
        if (fs.existsSync(candidate)) {
            throw new Error(`Unsafe dotenv file present in test sandbox: "${candidate}"`);
        }
    }
}

function createSandbox() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eso-tests-'));
    const realRoot = fs.realpathSync(root);
    activeSandboxRoots.add(realRoot);
    const backend = path.join(root, 'backend');
    fs.mkdirSync(path.join(backend, 'exports'), { recursive: true });
    const source = path.resolve(__dirname, '..');
    for (const name of SANDBOX_FILES) {
        fs.copyFileSync(path.join(source, name), path.join(backend, name));
    }
    fs.cpSync(path.join(source, 'assets'), path.join(backend, 'assets'), { recursive: true });
    const dbPath = path.join(backend, 'exports', 'eso_catalog.db');
    let child;
    let logs = '';
    const downloads = new Map();

    async function start({ mode = 'test', trustProxy = 'false', dbPath: customDbPath } = {}) {
        const targetDbPath = customDbPath !== undefined ? customDbPath : dbPath;
        assertIsolatedDatabasePath(targetDbPath, root);
        assertNoDotenvFiles(root);

        const env = createSanitizedEnv({
            NODE_ENV: mode,
            PORT: '0',
            DB_PATH: targetDbPath,
            TRUST_PROXY: trustProxy,
            ENABLE_DEV_ENDPOINTS: 'true',
            NODE_PATH: path.join(source, 'node_modules'),
            ESO_TEST_SERVER: path.join(backend, 'server.js'),
            ESO_TEST_SANDBOX_ROOT: root,
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
        activeSandboxRoots.delete(realRoot);
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }

    return { root, backend, dbPath, start, stop, dispose, downloads,
        releaseIcon: () => child.send({ type: 'release-icon' }),
        get logs() { return logs; },
    };
}

function query(dbPath, sql, params = [], sandboxRoot) {
    return new Promise((resolve, reject) => {
        try {
            assertIsolatedDatabasePath(dbPath, sandboxRoot);
        } catch (err) {
            return reject(err);
        }
        const db = new sqlite3.Database(dbPath);
        db.configure('busyTimeout', 5000);
        db.all(sql, params, (error, rows) => {
            db.close(closeError => error || closeError ? reject(error || closeError) : resolve(rows));
        });
    });
}

module.exports = {
    ALLOWED_CHILD_ENV_KEYS,
    createSandbox,
    createSanitizedEnv,
    assertIsolatedDatabasePath,
    assertNoDotenvFiles,
    query,
};
