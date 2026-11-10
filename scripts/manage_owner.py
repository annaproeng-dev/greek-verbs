"""Explicit operator-only owner assignment. This command has no public HTTP endpoint."""
import argparse
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.auth import database


def main():
    parser = argparse.ArgumentParser(description='Assign the single owner to a verified existing account')
    parser.add_argument('--user-id', required=True)
    parser.add_argument('--email', required=True)
    args = parser.parse_args()
    with database() as execute:
        # Exact ID and email bind the operation to an existing identity. Never promote on signup.
        lock = ' FOR UPDATE' if os.environ.get('DATABASE_URL') else ''
        user = execute('SELECT id, email FROM users WHERE id = ? AND email = ?' + lock,
                       (args.user_id, args.email.strip().lower())).fetchone()
        if not user:
            raise SystemExit('No matching existing account; no role changes made')
        execute("UPDATE user_roles SET role = 'user' WHERE role = 'owner'")
        execute("INSERT INTO user_roles (user_id, role) VALUES (?, 'owner') ON CONFLICT (user_id) DO UPDATE SET role = 'owner'", (user[0],))
    print('Owner assigned to the verified existing account')


if __name__ == '__main__':
    main()
