"""Server-owned, expiring subscription grants. Missing and expired grants are free."""
import time


def subscription_payload(execute, user_id, now=None):
    now = int(time.time()) if now is None else now
    row = execute('SELECT plan, expires_at FROM subscriptions WHERE user_id = ?', (user_id,)).fetchone()
    if row and row[1] > now:
        return {'plan': row[0], 'expiresAt': row[1]}
    return {'plan': 'free', 'expiresAt': None}
