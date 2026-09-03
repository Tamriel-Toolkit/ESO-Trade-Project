function normalizeSql(sql) {
    return String(sql || "").replace(/\s+/g, " ").trim();
}

function sqliteDiagnostic(error) {
    if (!error) return "code=UNKNOWN message=Unknown SQLite error";

    const code = error.code || "UNKNOWN";
    const errno = Number.isInteger(error.errno) ? ` errno=${error.errno}` : "";
    const message = error.message || String(error);
    return `code=${code}${errno} message=${message}`;
}

function addedColumnName(sql) {
    const match = normalizeSql(sql).match(
        /\bALTER\s+TABLE\b.+?\bADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_]*))/i
    );
    return match ? (match[1] || match[2] || match[3] || match[4]) : null;
}

function duplicateColumnName(error) {
    if (!error || error.code !== "SQLITE_ERROR") return null;
    const match = String(error.message || "").match(
        /^(?:SQLITE_ERROR:\s*)?duplicate column name:\s*(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_]*))\s*$/i
    );
    return match ? (match[1] || match[2] || match[3] || match[4]) : null;
}

function isExpectedDuplicateColumnError(error, sql) {
    const expectedColumn = addedColumnName(sql);
    const duplicateColumn = duplicateColumnName(error);
    return Boolean(
        expectedColumn
        && duplicateColumn
        && expectedColumn.toLowerCase() === duplicateColumn.toLowerCase()
    );
}

function createSchemaMigrationRunner(database, options = {}) {
    const logger = options.logger || console;
    const onUnexpectedError = options.onUnexpectedError || null;

    return function runSchemaMigration(name, sql, migrationOptions = {}) {
        const params = migrationOptions.params || [];
        const allowDuplicateColumn = migrationOptions.allowDuplicateColumn === true;

        return new Promise((resolve) => {
            database.run(sql, params, function migrationCallback(error) {
                if (!error) {
                    resolve({ status: "applied", name });
                    return;
                }

                if (allowDuplicateColumn && isExpectedDuplicateColumnError(error, sql)) {
                    const columnName = addedColumnName(sql);
                    logger.info(`[DB MIGRATION] "${name}" already applied (column "${columnName}" exists).`);
                    resolve({ status: "already-applied", name });
                    return;
                }

                const statement = normalizeSql(sql);
                const failure = {
                    name,
                    sql: statement,
                    error
                };
                logger.error(
                    `[DB MIGRATION] "${name}" failed: ${sqliteDiagnostic(error)}. Statement: ${statement}`
                );
                if (onUnexpectedError) onUnexpectedError(failure);
                resolve({ status: "failed", ...failure });
            });
        });
    };
}

async function rollbackTransaction(dbRun, context, originalError, logger = console) {
    try {
        await dbRun("ROLLBACK");
        return true;
    } catch (rollbackError) {
        logger.error(
            `[DB TRANSACTION] ${context} rollback failed. `
            + `Original error: ${sqliteDiagnostic(originalError)}. `
            + `Rollback error: ${sqliteDiagnostic(rollbackError)}.`
        );
        return false;
    }
}

module.exports = {
    createSchemaMigrationRunner,
    isExpectedDuplicateColumnError,
    rollbackTransaction,
    sqliteDiagnostic
};
