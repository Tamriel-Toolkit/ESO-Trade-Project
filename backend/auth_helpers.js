const bcrypt = require("bcryptjs");

const BCRYPT_SALT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function hashPassword(password) {
    return bcrypt.hashSync(password || "", BCRYPT_SALT_ROUNDS);
}

function isBcryptHash(storedHash) {
    return typeof storedHash === "string" && BCRYPT_HASH_PATTERN.test(storedHash);
}

function verifyPassword(password, storedHash) {
    if (!password || !isBcryptHash(storedHash)) return false;
    try {
        return bcrypt.compareSync(password, storedHash);
    } catch {
        return false;
    }
}

module.exports = {
    BCRYPT_SALT_ROUNDS,
    BCRYPT_HASH_PATTERN,
    hashPassword,
    isBcryptHash,
    verifyPassword
};
