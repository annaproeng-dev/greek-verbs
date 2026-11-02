"""Email/password authentication for Vercel and the local development server."""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ITERATIONS = 600_000
SESSION_AGE = 30 * 24 * 60 * 60
COOKIE = 'greek_session'


@contextmanager
def database():
    url = os.environ.get('DATABASE_URL')
    if url:
        import psycopg
        connection = psycopg.connect(url, connect_timeout=10)
    else:
        if os.environ.get('VERCEL'):
            raise RuntimeError('DATABASE_URL must be configured on Vercel')
        path = Path(os.environ.get('AUTH_DB_PATH', str(Path(__file__).resolve().parents[1] / '.data' / 'auth.sqlite3')))
        path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(str(path), timeout=15)
    try:
        def execute(query, params=()):
            return connection.execute(query.replace('?', '%s') if url else query, params)
        execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL)')
        yield execute
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
    return f'pbkdf2_sha256${ITERATIONS}${salt}${digest}'


def verify_password(password, encoded):
    _, iterations, salt, expected = encoded.split('$')
    actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations)).hex()
    return hmac.compare_digest(actual, expected)


class handler(BaseHTTPRequestHandler):
    def reply(self, status, payload, cookie=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store, private')
        self.send_header('Vary', 'Cookie')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def session_token(self):
        cookie = SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            return cookie[COOKIE].value if COOKIE in cookie else ''
        except Exception:
            return ''

    def cookie(self, token='', max_age=0):
        secure = '; Secure' if os.environ.get('VERCEL') or self.headers.get('X-Forwarded-Proto') == 'https' else ''
        return f'{COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}'

    def do_GET(self):
        try:
            token = self.session_token()
            if not token:
                self.reply(200, {'user': None})
                return
            with database() as execute:
                row = execute('SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?', (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
            self.reply(200, {'user': {'id': row[0], 'email': row[1]} if row else None}, self.cookie() if not row else None)
        except Exception:
            self.reply(503, {'error': 'unavailable'})

    def do_POST(self):
        # JSON-only and same-origin requests prevent cross-site form/login CSRF.
        origin = self.headers.get('Origin')
        if (origin and urlsplit(origin).netloc != self.headers.get('Host')) or self.headers.get('Sec-Fetch-Site') == 'cross-site':
            self.reply(403, {'error': 'forbidden'})
            return
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            self.reply(415, {'error': 'invalid_request'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 2 or length > 4096:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError()
        except (ValueError, TypeError):
            self.reply(400, {'error': 'invalid_request'})
            return
        action = parse_qs(urlsplit(self.path).query).get('action', [''])[0]
        if action not in ('login', 'register', 'logout'):
            self.reply(404, {'error': 'not_found'})
            return
        try:
            with database() as execute:
                now = int(time.time())
                execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
                execute('DELETE FROM auth_attempts WHERE expires_at <= ?', (now,))
                if action == 'logout':
                    execute('DELETE FROM sessions WHERE token_hash = ?', (hashlib.sha256(self.session_token().encode()).hexdigest(),))
                    result = (200, {'user': None}, self.cookie())
                else:
                    email, password = payload.get('email'), payload.get('password')
                    if not isinstance(email, str) or not isinstance(password, str):
                        self.reply(400, {'error': 'invalid_request'})
                        return
                    email = email.strip().lower()
                    if len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
                        self.reply(400, {'error': 'invalid_email'})
                        return
                    if len(password) > 128 or (action == 'register' and len(password) < 8):
                        self.reply(400, {'error': 'password_length'})
                        return
                    if action == 'register' and password != payload.get('confirmPassword'):
                        self.reply(400, {'error': 'password_mismatch'})
                        return
                    # Persist rate limits across processes and serverless invocations.
                    ip = self.headers.get('X-Forwarded-For', '').split(',')[0].strip() if os.environ.get('VERCEL') else self.client_address[0]
                    limits = [('ip:' + ip, 50), ('email:' + email, 15)]
                    limited = False
                    for key, maximum in limits:
                        key = hashlib.sha256(key.encode()).hexdigest()
                        count = execute('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT (key) DO UPDATE SET count = auth_attempts.count + 1 RETURNING count', (key, now + 900)).fetchone()[0]
                        limited |= count > maximum
                    if limited:
                        result = (429, {'error': 'rate_limited'}, None)
                    else:
                        row = execute('SELECT id, email, password_hash FROM users WHERE email = ?', (email,)).fetchone()
                        if action == 'register':
                            user_id = secrets.token_hex(16)
                            inserted = execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING RETURNING id', (user_id, email, hash_password(password), now)).fetchone()
                            if not inserted:
                                result = (409, {'error': 'email_exists'}, None)
                            else:
                                row = (user_id, email)
                                result = None
                        elif not verify_password(password, row[2] if row else hash_password('dummy-password', '0' * 32)) or not row:
                            result = (401, {'error': 'invalid_credentials'}, None)
                        else:
                            result = None
                        if result is None:
                            token = secrets.token_urlsafe(32)
                            execute('DELETE FROM sessions WHERE token_hash = ?', (hashlib.sha256(self.session_token().encode()).hexdigest(),))
                            execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', (hashlib.sha256(token.encode()).hexdigest(), row[0], now + SESSION_AGE))
                            result = (200, {'user': {'id': row[0], 'email': row[1]}}, self.cookie(token, SESSION_AGE))
            self.reply(*result)
        except Exception:
            self.reply(503, {'error': 'unavailable'})
