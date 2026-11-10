"""Run with the service stopped, as its OS user, with DATABASE_URL configured."""
import os
import sys
import sqlite3
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.auth import database

source = Path(os.environ.get('AUTH_DB_PATH', '/var/lib/greek-verbs/auth.sqlite3'))
if not os.environ.get('DATABASE_URL'):
    raise RuntimeError('DATABASE_URL is required')
if source.exists():
    old = sqlite3.connect(str(source))
    backup = source.with_name(source.name + '.before-postgres')
    if not backup.exists():
        destination = sqlite3.connect(str(backup))
        old.backup(destination)
        destination.close()
        backup.chmod(0o600)
    tables = ('users', 'sessions', 'auth_attempts', 'password_reset_tokens', 'legal_documents', 'legal_acceptances', 'user_roles', 'learning', 'learning_metadata')
    with database() as execute:
        for table in tables:
            if not old.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone():
                continue
            cursor = old.execute('SELECT * FROM ' + table)
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            for row in rows:
                execute('INSERT INTO ' + table + ' (' + ','.join(columns) + ') VALUES (' + ','.join('?' for _ in columns) + ') ON CONFLICT DO NOTHING', row)
            print(table + ': ' + str(len(rows)) + ' source records checked')
    old.close()
