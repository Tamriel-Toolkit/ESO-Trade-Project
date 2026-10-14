const { test, describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const server = require('../server');
const { verifyPassword, hashPassword, isBcryptHash } = server;

after(() => {
    if (typeof server.gracefulShutdown === 'function') {
        server.gracefulShutdown();
    }
});

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
