"""Email/password authentication for Vercel and the local development server."""
import hashlib
import hmac
import json
import ipaddress
import os
import re
import secrets
import smtplib
import ssl
import sqlite3
import time
from contextlib import contextmanager
from email.message import EmailMessage
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit

ITERATIONS = 600_000
SESSION_AGE = 30 * 24 * 60 * 60
COOKIE = '__Host-greek_session' if os.environ.get('VERCEL') else 'greek_session'
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    # Existing UI uses inline event handlers. Inline script blocks remain blocked.
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}


@contextmanager
def database():
    url = os.environ.get('DATABASE_URL')
    if url:
        import psycopg
        connection = psycopg.connect(url, connect_timeout=10, **(
            {'sslmode': 'verify-full', 'sslrootcert': os.environ.get('PGSSLROOTCERT', 'system')}
            if os.environ.get('VERCEL') else {}
        ))
    else:
        if os.environ.get('VERCEL'):
            raise RuntimeError('DATABASE_URL must be configured on Vercel')
        path = Path(os.environ.get('AUTH_DB_PATH', str(Path(__file__).resolve().parents[1] / '.data' / 'auth.sqlite3')))
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        path.touch(mode=0o600, exist_ok=True)
        path.chmod(0o600)
        connection = sqlite3.connect(str(path), timeout=15)
    try:
        def execute(query, params=()):
            return connection.execute(query.replace('?', '%s') if url else query, params)
        execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at BIGINT NOT NULL, used_at BIGINT)')
        execute('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at)')
        execute('CREATE INDEX IF NOT EXISTS auth_attempts_expiry ON auth_attempts (expires_at)')
        execute('CREATE INDEX IF NOT EXISTS password_reset_expiry ON password_reset_tokens (expires_at)')
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


# One password derivation for both known and unknown addresses.
DUMMY_PASSWORD_HASH = hash_password('unused-dummy-password', '0' * 32)


def send_reset_email(email, token):
    """Send a password-reset link using deployment SMTP settings."""
    host = os.environ.get('SMTP_HOST', '').strip()
    sender = os.environ.get('SMTP_FROM', '').strip()
    if not host or not sender:
        raise RuntimeError('SMTP is not configured')
    origin = os.environ.get('APP_ORIGIN', '').rstrip('/')
    if not origin:
        raise RuntimeError('APP_ORIGIN is not configured')
    link = f'{origin}/?reset_token={quote(token)}#reset'
    message = EmailMessage()
    message['Subject'] = 'Greek Verbs — password reset / восстановление пароля'
    message['From'] = sender
    message['To'] = email
    message.set_content(
        'Вы запросили восстановление пароля Greek Verbs.\n\n'
        f'Создать новый пароль: {link}\n\n'
        'Ссылка действует 30 минут и может быть использована только один раз. '
        'Если вы не запрашивали восстановление, просто проигнорируйте письмо.\n\n'
        'You requested a Greek Verbs password reset. The link is valid for 30 minutes and can be used once.'
    )
    port = int(os.environ.get('SMTP_PORT', '587'))
    user, password = os.environ.get('SMTP_USER', ''), os.environ.get('SMTP_PASSWORD', '')
    if os.environ.get('SMTP_SSL', '').lower() in ('1', 'true', 'yes'):
        client = smtplib.SMTP_SSL(host, port, timeout=15, context=ssl.create_default_context())
    else:
        client = smtplib.SMTP(host, port, timeout=15)
    try:
        if os.environ.get('SMTP_STARTTLS', '1').lower() not in ('0', 'false', 'no') and not isinstance(client, smtplib.SMTP_SSL):
            client.starttls(context=ssl.create_default_context())
        if user:
            client.login(user, password)
        client.send_message(message)
    finally:
        client.quit()


class handler(BaseHTTPRequestHandler):
    def reply(self, status, payload, cookie=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store, private')
        self.send_header('Vary', 'Cookie')
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        if os.environ.get('VERCEL'):
            self.send_header('Strict-Transport-Security', 'max-age=31536000')
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
        scheme = 'https' if os.environ.get('VERCEL') else 'http'
        expected_origin = os.environ.get('APP_ORIGIN', scheme + '://' + self.headers.get('Host', ''))
        if (origin is not None and origin != expected_origin) or self.headers.get('Sec-Fetch-Site') == 'cross-site':
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
        if action not in ('login', 'register', 'logout', 'request_reset', 'reset_password'):
            self.reply(404, {'error': 'not_found'})
            return
        reset_email = None
        try:
            with database() as execute:
                now = int(time.time())
                execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
                execute('DELETE FROM auth_attempts WHERE expires_at <= ?', (now,))
                execute('DELETE FROM password_reset_tokens WHERE expires_at <= ? OR used_at IS NOT NULL', (now,))
                if action == 'logout':
                    execute('DELETE FROM sessions WHERE token_hash = ?', (hashlib.sha256(self.session_token().encode()).hexdigest(),))
                    result = (200, {'user': None}, self.cookie())
                elif action == 'reset_password':
                    token, password = payload.get('token'), payload.get('password')
                    if not isinstance(token, str) or not isinstance(password, str) or len(token) < 32 or len(token) > 256:
                        self.reply(400, {'error': 'invalid_reset_token'})
                        return
                    if len(password) < 8 or len(password) > 128:
                        self.reply(400, {'error': 'password_length'})
                        return
                    if password != payload.get('confirmPassword'):
                        self.reply(400, {'error': 'password_mismatch'})
                        return
                    token_hash = hashlib.sha256(token.encode()).hexdigest()
                    row = execute('SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL', (token_hash, now)).fetchone()
                    if not row:
                        result = (400, {'error': 'invalid_reset_token'}, None)
                    else:
                        execute('UPDATE users SET password_hash = ? WHERE id = ?', (hash_password(password), row[0]))
                        execute('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?', (now, token_hash))
                        execute('DELETE FROM sessions WHERE user_id = ?', (row[0],))
                        result = (200, {'ok': True}, self.cookie())
                else:
                    email = payload.get('email')
                    if not isinstance(email, str):
                        self.reply(400, {'error': 'invalid_request'})
                        return
                    email = email.strip().lower()
                    if len(email) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
                        self.reply(400, {'error': 'invalid_email'})
                        return
                    # Persist rate limits across processes and serverless invocations.
                    ip = self.headers.get('X-Forwarded-For', '').split(',')[0].strip() if os.environ.get('VERCEL') else self.client_address[0]
                    try:
                        ip = str(ipaddress.ip_address(ip))
                    except ValueError:
                        ip = 'unknown'
                    limits = ([('reset-ip:' + ip, 10), ('reset-email:' + email, 5)] if action == 'request_reset' else [('ip:' + ip, 50), ('email:' + email, 15)])
                    limited = False
                    for key, maximum in limits:
                        key = hashlib.sha256(key.encode()).hexdigest()
                        count = execute('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT (key) DO UPDATE SET count = auth_attempts.count + 1 RETURNING count', (key, now + 900)).fetchone()[0]
                        limited |= count > maximum
                    if limited:
                        result = (429, {'error': 'rate_limited'}, None)
                    elif action == 'request_reset':
                        if not os.environ.get('SMTP_HOST') or not os.environ.get('SMTP_FROM') or not os.environ.get('APP_ORIGIN'):
                            result = (503, {'error': 'email_unavailable'}, None)
                        else:
                            row = execute('SELECT id, email FROM users WHERE email = ?', (email,)).fetchone()
                            if row:
                                raw_token = secrets.token_urlsafe(32)
                                execute('DELETE FROM password_reset_tokens WHERE user_id = ?', (row[0],))
                                execute('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used_at) VALUES (?, ?, ?, NULL)', (hashlib.sha256(raw_token.encode()).hexdigest(), row[0], now + 1800))
                                reset_email = (row[1], raw_token)
                            # Never disclose whether the address is registered.
                            result = (200, {'ok': True}, None)
                    else:
                        password = payload.get('password')
                        if not isinstance(password, str):
                            self.reply(400, {'error': 'invalid_request'})
                            return
                        if len(password) > 128 or (action == 'register' and len(password) < 8):
                            self.reply(400, {'error': 'password_length'})
                            return
                        if action == 'register' and password != payload.get('confirmPassword'):
                            self.reply(400, {'error': 'password_mismatch'})
                            return
                        row = execute('SELECT id, email, password_hash FROM users WHERE email = ?', (email,)).fetchone()
                        if action == 'register':
                            user_id = secrets.token_hex(16)
                            inserted = execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING RETURNING id', (user_id, email, hash_password(password), now)).fetchone()
                            if not inserted:
                                result = (409, {'error': 'email_exists'}, None)
                            else:
                                row = (user_id, email)
                                result = None
                        elif not verify_password(password, row[2] if row else DUMMY_PASSWORD_HASH) or not row:
                            result = (401, {'error': 'invalid_credentials'}, None)
                        else:
                            result = None
                        if result is None:
                            token = secrets.token_urlsafe(32)
                            execute('DELETE FROM sessions WHERE token_hash = ?', (hashlib.sha256(self.session_token().encode()).hexdigest(),))
                            execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', (hashlib.sha256(token.encode()).hexdigest(), row[0], now + SESSION_AGE))
                            result = (200, {'user': {'id': row[0], 'email': row[1]}}, self.cookie(token, SESSION_AGE))
            if reset_email:
                try:
                    send_reset_email(*reset_email)
                except Exception as failure:
                    self.log_error('Password reset email failed: %s', failure)
            self.reply(*result)
        except Exception:
            self.reply(503, {'error': 'unavailable'})
