const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hashPassword, isBcryptHash, verifyPassword, server, gracefulShutdown } = require('./auth_helpers');

describe('Password Hashing Unit Tests', () => {
    describe('hashPassword', () => {
        test('hashes a normal password and produces a valid bcrypt hash format', () => {
            const password = 'mySecretPassword123!';
            const hash = hashPassword(password);
            assert.equal(typeof hash, 'string');
            assert.ok(isBcryptHash(hash), `Hash '${hash}' does not match expected bcrypt pattern`);
        });

        test('handles empty string, null, and undefined gracefully', () => {
            for (const input of ['', null, undefined]) {
                const hash = hashPassword(input);
                assert.equal(typeof hash, 'string');
                assert.ok(isBcryptHash(hash), `Hash for input '${input}' should be valid bcrypt string`);
            }
        });

        test('generates unique salt on repeated calls for same input', () => {
            const password = 'samePassword123';
            const hash1 = hashPassword(password);
            const hash2 = hashPassword(password);
            assert.notEqual(hash1, hash2, 'Hashes should be different due to unique salt generation');
            assert.ok(isBcryptHash(hash1));
            assert.ok(isBcryptHash(hash2));
            assert.ok(verifyPassword(password, hash1));
            assert.ok(verifyPassword(password, hash2));
        });
    });

    describe('isBcryptHash', () => {
        test('identifies valid bcrypt hashes', () => {
            const validHash = hashPassword('testPassword');
            assert.ok(isBcryptHash(validHash));
            assert.ok(isBcryptHash('$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWM/m'));
            assert.ok(isBcryptHash('$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'));
        });

        test('rejects non-bcrypt hash formats', () => {
            const sha256Hash = crypto.createHash('sha256').update('testPassword').digest('hex');
            assert.equal(isBcryptHash(sha256Hash), false);
            assert.equal(isBcryptHash('plaintextPassword'), false);
            assert.equal(isBcryptHash(null), false);
            assert.equal(isBcryptHash(undefined), false);
            assert.equal(isBcryptHash(12345), false);
            assert.equal(isBcryptHash('$2a$04$short'), false);
        });
    });

    describe('verifyPassword', () => {
        test('returns true for correct password against valid bcrypt hash', () => {
            const password = 'CorrectHorseBatteryStaple123!';
            const hash = hashPassword(password);
            assert.equal(verifyPassword(password, hash), true);
        });

        test('returns false for incorrect password against valid bcrypt hash', () => {
            const password = 'CorrectPassword123!';
            const hash = hashPassword(password);
            assert.equal(verifyPassword('WrongPassword123!', hash), false);
        });

        test('returns false for empty, null, or undefined password', () => {
            const hash = hashPassword('ValidPass123!');
            assert.equal(verifyPassword('', hash), false);
            assert.equal(verifyPassword(null, hash), false);
            assert.equal(verifyPassword(undefined, hash), false);
        });

        test('returns false when storedHash is invalid, legacy SHA-256, or corrupted', () => {
            const password = 'MyPassword123!';
            const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');

            assert.equal(verifyPassword(password, sha256Hash), false);
            assert.equal(verifyPassword(password, 'not-a-bcrypt-hash'), false);
            assert.equal(verifyPassword(password, null), false);
            assert.equal(verifyPassword(password, undefined), false);
            assert.equal(verifyPassword(password, ''), false);
        });
    });
});
