"""SQLite settings shared by catalog, parser, outbox and watcher connections."""
import sqlite3


def connect_database(path):
    connection = sqlite3.connect(path, timeout=5)
    try:
        for name, value in (
            ("journal_mode", "wal"), ("foreign_keys", 1), ("busy_timeout", 5000),
            ("synchronous", 2), ("cache_size", -2048), ("temp_store", 1),
        ):
            connection.execute(f"PRAGMA {name} = {value}")
            actual = connection.execute(f"PRAGMA {name}").fetchone()[0]
            if actual != value:
                raise sqlite3.OperationalError(f"SQLite refused required {name}={value}")
        return connection
    except BaseException:
        connection.close()
        raise
