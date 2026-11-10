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

from api.legal import CONFIG, MANIFEST, validate_acceptance, record_acceptance, user_payload, cleanup_expired

ITERATIONS = 600_000
SESSION_AGE = CONFIG['retention']['sessionDays'] * 24 * 60 * 60
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
        execute('CREATE TABLE IF NOT EXISTS legal_documents (sha256 TEXT PRIMARY KEY, version TEXT NOT NULL, kind TEXT NOT NULL, language TEXT NOT NULL, content TEXT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS legal_acceptances (user_id TEXT NOT NULL REFERENCES users(id), version TEXT NOT NULL, language TEXT NOT NULL, accepted_at BIGINT NOT NULL, terms_sha256 TEXT NOT NULL REFERENCES legal_documents(sha256), privacy_sha256 TEXT NOT NULL REFERENCES legal_documents(sha256), adult_confirmed INTEGER NOT NULL, PRIMARY KEY (user_id, version, language))')
        execute("CREATE TABLE IF NOT EXISTS user_roles (user_id TEXT PRIMARY KEY REFERENCES users(id), role TEXT NOT NULL CHECK (role IN ('owner', 'user')))")
        execute("INSERT INTO user_roles (user_id, role) SELECT id, 'user' FROM users WHERE 1=1 ON CONFLICT (user_id) DO NOTHING")
        execute("CREATE TABLE IF NOT EXISTS subscriptions (user_id TEXT PRIMARY KEY REFERENCES users(id), plan TEXT NOT NULL CHECK (plan IN ('plus', 'pro')), expires_at BIGINT NOT NULL)")
        execute('CREATE TABLE IF NOT EXISTS learning (owner TEXT PRIMARY KEY, data TEXT NOT NULL, revision BIGINT NOT NULL)')
        execute('CREATE TABLE IF NOT EXISTS learning_metadata (owner TEXT PRIMARY KEY, generation TEXT NOT NULL, imports TEXT NOT NULL, migration_closed INTEGER NOT NULL, updated_at BIGINT NOT NULL)')
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


def action_is_learning(path):
    return parse_qs(urlsplit(path).query).get('action', [''])[0] == 'learning'


# Public imports retained for existing integrations and tests.
from api.learning import export_learning as learning_export, learning_request


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
    link = f'{origin}/reset?reset_token={quote(token)}'
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
                user = user_payload(execute, row[0], row[1]) if row else None
            self.reply(200, {'user': user}, self.cookie() if not row else None)
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
            if length < 2 or length > (2_000_000 if action_is_learning(self.path) else 4096):
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError()
        except (ValueError, TypeError):
            self.reply(400, {'error': 'invalid_request'})
            return
        action = parse_qs(urlsplit(self.path).query).get('action', [''])[0]
        if action not in ('login', 'register', 'logout', 'request_reset', 'reset_password', 'accept_legal', 'export_data', 'delete_account', 'logout_all', 'learning', 'admin_users', 'admin_subscription'):
            self.reply(404, {'error': 'not_found'})
            return
        reset_email = None
        try:
            with database() as execute:
                now = int(time.time())
                cleanup_expired(execute, now)
                if action in ('admin_users', 'admin_subscription'):
                    account = execute("SELECT users.id FROM sessions JOIN users ON users.id = sessions.user_id JOIN user_roles ON user_roles.user_id = users.id WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND user_roles.role = 'owner'", (hashlib.sha256(self.session_token().encode()).hexdigest(), now)).fetchone()
                    if not account:
                        result = (403, {'error': 'forbidden'}, None)
                    else:
                        from api.subscriptions import subscription_payload
                        if action == 'admin_subscription':
                            target, plan = payload.get('userId'), payload.get('plan')
                            if not isinstance(target, str) or plan not in ('free', 'plus', 'pro'):
                                result = (400, {'error': 'invalid_request'}, None)
                            elif not execute('SELECT id FROM users WHERE id = ?', (target,)).fetchone():
                                result = (404, {'error': 'not_found'}, None)
                            else:
                                if plan == 'free':
                                    execute('DELETE FROM subscriptions WHERE user_id = ?', (target,))
                                else:
                                    execute('INSERT INTO subscriptions (user_id, plan, expires_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET plan = excluded.plan, expires_at = excluded.expires_at', (target, plan, now + 7 * 86400))
                                result = (200, {'subscription': subscription_payload(execute, target, now)}, None)
                        else:
                            rows = execute("SELECT users.id, users.email, users.created_at, COALESCE(user_roles.role, 'user') FROM users LEFT JOIN user_roles ON user_roles.user_id = users.id ORDER BY users.created_at DESC").fetchall()
                            users = [dict(zip(('id', 'email', 'createdAt', 'role'), row)) for row in rows]
                            for user in users:
                                user['subscription'] = subscription_payload(execute, user['id'], now)
                            result = (200, {'users': users}, None)
                elif action == 'learning':
                    result = learning_request(self, execute, payload, now)
                elif action == 'logout':
                    execute('DELETE FROM sessions WHERE token_hash = ?', (hashlib.sha256(self.session_token().encode()).hexdigest(),))
                    result = (200, {'user': None}, self.cookie())
                elif action in ('accept_legal', 'export_data', 'delete_account', 'logout_all'):
                    token_hash = hashlib.sha256(self.session_token().encode()).hexdigest()
                    account = execute('SELECT users.id, users.email, users.password_hash, users.created_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?' + (' FOR UPDATE OF users' if os.environ.get('DATABASE_URL') else ''), (token_hash, now)).fetchone()
                    if not account:
                        result = (401, {'error': 'authentication_required'}, self.cookie())
                    elif action == 'accept_legal':
                        if not validate_acceptance(payload):
                            result = (400, {'error': 'legal_acceptance_required', 'legalVersion': MANIFEST['version']}, None)
                        else:
                            record_acceptance(execute, account[0], payload['legalAcceptance'], now)
                            result = (200, {'user': user_payload(execute, account[0], account[1])}, None)
                    else:
                        key = hashlib.sha256(('account-action:' + account[0]).encode()).hexdigest()
                        attempts = execute('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT (key) DO UPDATE SET count = auth_attempts.count + 1 RETURNING count', (key, now + CONFIG['retention']['rateLimitMinutes'] * 60)).fetchone()[0]
                        password = payload.get('password')
                        if attempts > 10:
                            result = (429, {'error': 'rate_limited'}, None)
                        elif not isinstance(password, str) or len(password) > 128 or not verify_password(password, account[2]):
                            result = (401, {'error': 'invalid_credentials'}, None)
                        elif action == 'export_data':
                            rows = execute('SELECT version, language, accepted_at, terms_sha256, privacy_sha256, adult_confirmed FROM legal_acceptances WHERE user_id = ? ORDER BY accepted_at', (account[0],)).fetchall()
                            acceptances = [dict(zip(('version','language','acceptedAt','termsSha256','privacySha256','adultConfirmed'), row)) for row in rows]
                            result = (200, {'export': {'schemaVersion': 1, 'exportedAt': now, 'account': {'id': account[0], 'email': account[1], 'createdAt': account[3]}, 'learning': learning_export(execute, 'user:' + account[0]), 'legalAcceptances': acceptances}}, None)
                        elif action == 'logout_all':
                            execute('DELETE FROM sessions WHERE user_id = ?', (account[0],))
                            result = (200, {'user': None}, self.cookie())
                        elif payload.get('confirmation') != 'DELETE':
                            result = (400, {'error': 'deletion_confirmation_required'}, None)
                        else:
                            execute('DELETE FROM learning WHERE owner = ?', ('user:' + account[0],))
                            execute('DELETE FROM learning_metadata WHERE owner = ?', ('user:' + account[0],))
                            for table in ('sessions', 'password_reset_tokens', 'legal_acceptances', 'subscriptions', 'user_roles'):
                                execute('DELETE FROM ' + table + ' WHERE user_id = ?', (account[0],))
                            # Security counters are pseudonymous and expire after the fixed rate-limit window.
                            execute('DELETE FROM users WHERE id = ?', (account[0],))
                            result = (200, {'user': None, 'deleted': True}, self.cookie())
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
                        count = execute('INSERT INTO auth_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT (key) DO UPDATE SET count = auth_attempts.count + 1 RETURNING count', (key, now + CONFIG['retention']['rateLimitMinutes'] * 60)).fetchone()[0]
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
                                execute('INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used_at) VALUES (?, ?, ?, NULL)', (hashlib.sha256(raw_token.encode()).hexdigest(), row[0], now + CONFIG['retention']['resetMinutes'] * 60))
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
                        if action == 'register' and not validate_acceptance(payload):
                            self.reply(400, {'error': 'legal_acceptance_required', 'legalVersion': MANIFEST['version']})
                            return
                        row = execute('SELECT id, email, password_hash FROM users WHERE email = ?', (email,)).fetchone()
                        if action == 'register':
                            user_id = secrets.token_hex(16)
                            inserted = execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING RETURNING id', (user_id, email, hash_password(password), now)).fetchone()
                            if not inserted:
                                result = (409, {'error': 'email_exists'}, None)
                            else:
                                execute('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', (user_id, 'user'))
                                record_acceptance(execute, user_id, payload['legalAcceptance'], now)
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
                            result = (200, {'user': user_payload(execute, row[0], row[1])}, self.cookie(token, SESSION_AGE))
            if reset_email:
                try:
                    send_reset_email(*reset_email)
                except Exception as failure:
                    self.log_error('Password reset email failed (%s)', type(failure).__name__)
            self.reply(*result)
        except Exception:
            self.reply(503, {'error': 'unavailable'})
