const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const activeHandlesBeforeImport = new Set(process._getActiveHandles());
const activeRequestsBeforeImport = new Set(process._getActiveRequests());
const loadedModulesBeforeImport = new Set(Object.keys(require.cache));
const { verifyPassword, hashPassword, isBcryptHash } = require('../password_helpers');
const activeHandlesAfterImport = process._getActiveHandles().filter(handle => !activeHandlesBeforeImport.has(handle));
const activeRequestsAfterImport = process._getActiveRequests().filter(req => !activeRequestsBeforeImport.has(req));
const newlyLoadedModules = Object.keys(require.cache).filter(mod => !loadedModulesBeforeImport.has(mod));

const { createSanitizedEnv } = require('../test-support/sandbox');

describe('Password Verification and Hashing Utilities', () => {
    // Generate valid test hashes for $2a$, $2b$, and $2y$ prefixes
    const samplePassword = 'CorrectHorseBatteryStaple123!';
    const generatedHash = bcrypt.hashSync(samplePassword, 10); // $2b$ by default in bcryptjs

    // $2a$ format hash for samplePassword
    const hash2a = generatedHash.replace(/^\$2[by]\$/, '$2a$');
    // $2b$ format hash
    const hash2b = generatedHash.replace(/^\$2[ay]\$/, '$2b$');
    // $2y$ format hash
    const hash2y = generatedHash.replace(/^\$2[ab]\$/, '$2y$');

    describe('module isolation and side-effect guarantees', () => {
        it('importing password_helpers creates no database, socket, timer, or dotenv side effects', () => {
            assert.deepEqual(activeHandlesAfterImport, []);
            assert.deepEqual(activeRequestsAfterImport, []);
            for (const forbidden of [
                path.resolve(__dirname, '../server.js'),
                path.join('node_modules', 'sqlite3'),
                path.join('node_modules', 'dotenv'),
                path.join('node_modules', 'express'),
            ]) {
                assert.equal(
                    newlyLoadedModules.some(mod => mod.includes(forbidden)),
                    false,
                    `Unexpected module loaded by password_helpers: ${forbidden}`
                );
            }
        });

        it('password helpers ignore local .env and sentinel DB_PATH in a clean subprocess', () => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eso-pwd-isolation-'));
            try {
                const sentinelDb = path.join(tempDir, 'sentinel.db');
                const missingDb = path.join(tempDir, 'must-not-be-created.db');
                const sentinelBytes = Buffer.from('SENTINEL-DATABASE-BYTES-DO-NOT-OPEN');
                fs.writeFileSync(sentinelDb, sentinelBytes);
                const fixedTime = new Date('2025-01-15T12:00:00.000Z');
                fs.utimesSync(sentinelDb, fixedTime, fixedTime);
                const statBefore = fs.statSync(sentinelDb, { bigint: true });

                fs.writeFileSync(
                    path.join(tempDir, '.env'),
                    `DB_PATH=${sentinelDb}\nBLAKE_API_TOKEN=dotenv_secret_token\nESOTRADE_AUTH_TOKEN=dotenv_sync_token\n`
                );

                const helperPath = path.resolve(__dirname, '../password_helpers.js');
                const result = spawnSync(
                    process.execPath,
                    [
                        '-e',
                        `
                        const assert = require('node:assert/strict');
                        const beforeH = process._getActiveHandles().length;
                        const beforeR = process._getActiveRequests().length;
                        const { hashPassword, verifyPassword, isBcryptHash } = require(${JSON.stringify(helperPath)});
                        assert.equal(process._getActiveHandles().length, beforeH);
                        assert.equal(process._getActiveRequests().length, beforeR);
                        assert.equal(process.env.BLAKE_API_TOKEN, undefined);
                        assert.equal(process.env.ESOTRADE_AUTH_TOKEN, undefined);
                        const digest = hashPassword('IsolatedTestPassword!');
                        assert.equal(isBcryptHash(digest), true);
                        assert.equal(verifyPassword('IsolatedTestPassword!', digest), true);
                        `,
                    ],
                    {
                        cwd: tempDir,
                        env: createSanitizedEnv({ NODE_ENV: 'test', DB_PATH: sentinelDb }),
                        encoding: 'utf8',
                        timeout: 15000,
                    }
                );
                assert.equal(result.status, 0, result.stderr || result.stdout);

                const statAfter = fs.statSync(sentinelDb, { bigint: true });
                assert.deepEqual(fs.readFileSync(sentinelDb), sentinelBytes);
                assert.equal(statAfter.mtimeNs, statBefore.mtimeNs);
                assert.equal(fs.existsSync(missingDb), false);
            } finally {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        it('server.js refuses unisolated test startup and leaves sentinel DB_PATH and .env untouched', () => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eso-server-guard-'));
            try {
                const sentinelDb = path.join(tempDir, 'sentinel.db');
                const sentinelBytes = Buffer.from('SENTINEL-DB-MUST-NEVER-BE-OPENED');
                fs.writeFileSync(sentinelDb, sentinelBytes);
                const fixedTime = new Date('2025-01-15T12:00:00.000Z');
                fs.utimesSync(sentinelDb, fixedTime, fixedTime);
                const statBefore = fs.statSync(sentinelDb, { bigint: true });

                const serverPath = path.resolve(__dirname, '../server.js');
                const result = spawnSync(
                    process.execPath,
                    ['-e', `require(${JSON.stringify(serverPath)});`],
                    {
                        cwd: tempDir,
                        env: createSanitizedEnv({ NODE_ENV: 'test', DB_PATH: sentinelDb }),
                        encoding: 'utf8',
                        timeout: 15000,
                    }
                );
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, /Refusing to open database in test environment|Unsafe test database path/);

                const statAfter = fs.statSync(sentinelDb, { bigint: true });
                assert.deepEqual(fs.readFileSync(sentinelDb), sentinelBytes);
                assert.equal(statAfter.mtimeNs, statBefore.mtimeNs);
            } finally {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });
    });

    describe('verifyPassword', () => {
        it('returns true for correct password against bcrypt hash generated via hashPassword', () => {
            const password = 'mySecretPassword42!';
            const hash = hashPassword(password);
            assert.equal(verifyPassword(password, hash), true);
        });

        it('returns true for correct password across $2a$, $2b$, and $2y$ bcrypt hash prefixes', () => {
            assert.equal(verifyPassword(samplePassword, hash2a), true);
            assert.equal(verifyPassword(samplePassword, hash2b), true);
            assert.equal(verifyPassword(samplePassword, hash2y), true);
        });

        it('returns false for incorrect password against valid bcrypt hash', () => {
            assert.equal(verifyPassword('WrongPassword123!', generatedHash), false);
            assert.equal(verifyPassword('correctHorseBatteryStaple123!', generatedHash), false); // case sensitivity
        });

        it('returns false for empty or falsy inputs', () => {
            assert.equal(verifyPassword('', generatedHash), false);
            assert.equal(verifyPassword(null, generatedHash), false);
            assert.equal(verifyPassword(undefined, generatedHash), false);
            assert.equal(verifyPassword(samplePassword, ''), false);
            assert.equal(verifyPassword(samplePassword, null), false);
            assert.equal(verifyPassword(samplePassword, undefined), false);
            assert.equal(verifyPassword('', ''), false);
            assert.equal(verifyPassword(null, null), false);
        });

        it('returns false for non-bcrypt, legacy, or plain text hashes', () => {
            // Plain text
            assert.equal(verifyPassword('secret', 'secret'), false);
            // Plain SHA-256 hash (64 hex chars)
            assert.equal(verifyPassword('secret', '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b'), false);
            // Plain MD5 hash (32 hex chars)
            assert.equal(verifyPassword('secret', '5f4dcc3b5aa765d61d8327deb882cf99'), false);
            // PBKDF2 / Argon / Other formats
            assert.equal(verifyPassword('secret', 'pbkdf2_sha256$26000$saltsalt$hashhash'), false);
            assert.equal(verifyPassword('secret', '$1$md5salt$md5hash'), false);
            // Truncated bcrypt hash
            assert.equal(verifyPassword('secret', '$2b$10$EixZaYVK1fsbw1ZfbX3OXeP'), false);
        });

        it('returns false gracefully when compareSync throws on malformed hash', () => {
            // Cost factor 99 passes regex format check but causes bcrypt compareSync to fail/throw
            const invalidCostHash = '$2b$99$' + 'a'.repeat(53);
            assert.equal(verifyPassword('secret', invalidCostHash), false);
        });
    });

    describe('isBcryptHash', () => {
        it('returns true for valid 60-character bcrypt hashes', () => {
            assert.equal(isBcryptHash(hash2a), true);
            assert.equal(isBcryptHash(hash2b), true);
            assert.equal(isBcryptHash(hash2y), true);
        });

        it('returns false for non-string or invalid format inputs', () => {
            assert.equal(isBcryptHash(null), false);
            assert.equal(isBcryptHash(undefined), false);
            assert.equal(isBcryptHash(12345), false);
            assert.equal(isBcryptHash({}), false);
            assert.equal(isBcryptHash(''), false);
            assert.equal(isBcryptHash('not_a_hash'), false);
            assert.equal(isBcryptHash('2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b'), false);
            // Wrong prefix
            assert.equal(isBcryptHash('$2x$10$' + 'a'.repeat(53)), false);
            // Invalid length
            assert.equal(isBcryptHash('$2b$10$' + 'a'.repeat(52)), false);
            assert.equal(isBcryptHash('$2b$10$' + 'a'.repeat(54)), false);
        });
    });

    describe('hashPassword', () => {
        it('hashes plain text into valid bcrypt hash with salt rounds 12', () => {
            const hash = hashPassword('testPassword123');
            assert.equal(isBcryptHash(hash), true);
            assert.match(hash, /^\$2[aby]\$12\$/);
        });

        it('handles empty or falsy password without throwing', () => {
            const emptyHash = hashPassword('');
            assert.equal(isBcryptHash(emptyHash), true);

            const nullHash = hashPassword(null);
            assert.equal(isBcryptHash(nullHash), true);
        });
    });
});
