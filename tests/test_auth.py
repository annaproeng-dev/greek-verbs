import http.client
import json
import os
import sqlite3
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

from api.legal import MANIFEST
from server import Handler
from api.auth import hash_password, verify_password, database, SECURITY_HEADERS


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.db = str(Path(cls.temp.name) / 'auth.sqlite3')
        cls.env = patch.dict(os.environ, {'AUTH_DB_PATH': cls.db})
        cls.env.start()
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.env.stop()
        cls.temp.cleanup()

    def request(self, action=None, data=None, cookie=None, origin=None, path=None, method=None, extra_headers=None, accept_legal=True):
        if action == 'register' and accept_legal and isinstance(data, dict):
            data = {**data, 'legalAcceptance': data.get('legalAcceptance', {'version': MANIFEST['version'], 'language': 'en', 'termsAccepted': True, 'privacyAcknowledged': True, 'adultConfirmed': True})}
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        headers = {'Content-Type': 'application/json'}
        if cookie:
            headers['Cookie'] = cookie
        if origin is not None:
            headers['Origin'] = origin
        headers.update(extra_headers or {})
        conn.request(method or ('POST' if action else 'GET'), path or '/api/auth' + ('?action=' + action if action else ''), json.dumps(data or {}) if action else None, headers)
        response = conn.getresponse()
        body = response.read()
        result = (response.status, dict(response.getheaders()), json.loads(body) if body.startswith(b'{') else body)
        conn.close()
        return result

    def test_subscription_grants_and_expiry(self):
        import time
        accounts = []
        for email in ('sub-owner@example.test', 'sub-member@example.test'):
            status, headers, result = self.request('register', {'email': email, 'password': 'test-password-123', 'confirmPassword': 'test-password-123', 'subscription': {'plan': 'pro'}})
            self.assertEqual(status, 200)
            self.assertEqual(result['user']['subscription']['plan'], 'free')
            accounts.append((result['user']['id'], headers['Set-Cookie'].split(';')[0]))
        owner, member = accounts
        with database() as execute:
            execute("UPDATE user_roles SET role = 'owner' WHERE user_id = ?", (owner[0],))
        payload = {'userId': member[0], 'plan': 'plus'}
        self.assertEqual(self.request('admin_subscription', payload)[0], 403)
        self.assertEqual(self.request('admin_subscription', payload, cookie=member[1])[0], 403)
        for plan in ('plus', 'pro'):
            status, _, result = self.request('admin_subscription', {**payload, 'plan': plan}, cookie=owner[1])
            self.assertEqual(status, 200)
            self.assertEqual(result['subscription']['plan'], plan)
            self.assertAlmostEqual(result['subscription']['expiresAt'], time.time() + 7 * 86400, delta=3)
            self.assertEqual(self.request(cookie=member[1])[2]['user']['subscription']['plan'], plan)
        self.assertEqual(self.request('admin_subscription', {**payload, 'plan': 'owner'}, cookie=owner[1])[0], 400)
        with database() as execute:
            execute('UPDATE subscriptions SET expires_at = ? WHERE user_id = ?', (int(time.time()) - 1, member[0]))
        self.assertEqual(self.request(cookie=member[1])[2]['user']['subscription']['plan'], 'free')
        self.assertEqual(self.request('admin_subscription', {**payload, 'plan': 'free'}, cookie=owner[1])[2]['subscription']['plan'], 'free')
        self.assertEqual(self.request(path='/pricing')[0], 200)

    def test_owner_admin_access_and_user_isolation(self):
        with patch.dict(os.environ, {'OWNER_EMAIL': 'owner@example.test'}):
            cookies = []
            for email, role in [('owner@example.test', 'owner'), ('member@example.test', 'user')]:
                status, headers, result = self.request('register', {'email': email, 'password': 'test-password-123', 'confirmPassword': 'test-password-123', 'role': 'owner'})
                self.assertEqual(status, 200)
                self.assertEqual(result['user']['role'], 'user')
                if role == 'owner':
                    with database() as execute:
                        execute("UPDATE user_roles SET role = 'owner' WHERE user_id = ?", (result['user']['id'],))
                cookies.append(headers['Set-Cookie'].split(';')[0])
            self.assertEqual(self.request('admin_users', {}, cookie=cookies[0])[0], 200)
            self.assertEqual(self.request('admin_users', {}, cookie=cookies[1])[0], 403)
            self.assertEqual(self.request('admin_users', {})[0], 403)
            _, _, initial = self.request('learning', {}, cookie=cookies[0])
            owner_id = initial['owner']
            saved = self.request('learning', {'operation': 'save', 'owner': owner_id, 'generation': initial['generation'], 'revision': initial['revision'], 'data': {'progress': {'correct': 7}, 'difficult': ['a']}}, cookie=cookies[0])
            self.assertEqual(saved[0], 200)
            self.assertEqual(self.request('learning', {}, cookie=cookies[1])[2]['data']['progress'], {})
            self.assertEqual(self.request('export_data', {'password': 'test-password-123'}, cookie=cookies[0])[2]['export']['learning']['progress']['correct'], 7)

    def test_clean_routes_and_reset_link(self):
        from server import ROUTES
        for path in ROUTES:
            for method in ('GET', 'HEAD'):
                status, headers, body = self.request(path=path, method=method)
                self.assertEqual(status, 200)
                self.assertIn('text/html', headers['Content-type'])
        self.assertEqual(self.request(path='/not-a-route')[0], 404)

    def test_registration_login_session_logout(self):
        data = {'email': 'Student@Example.com', 'password': 'test-password-123', 'confirmPassword': 'different'}
        self.assertEqual(self.request('register', data)[2]['error'], 'password_mismatch')
        data['confirmPassword'] = data['password']
        status, headers, result = self.request('register', data)
        self.assertEqual(status, 200)
        self.assertEqual(result['user']['email'], 'student@example.com')
        user_id = result['user']['id']
        cookie = headers['Set-Cookie'].split(';')[0]
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('no-store', headers['Cache-Control'])
        self.assertEqual(self.request(cookie=cookie)[2]['user']['id'], user_id)
        self.assertEqual(self.request('register', data)[0], 409)
        self.assertEqual(self.request('login', {**data, 'password': 'wrong'})[0], 401)
        previous_cookie = cookie
        status, headers, result = self.request('login', data, cookie=cookie)
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie'].split(';')[0]
        self.assertNotEqual(cookie, previous_cookie)
        self.assertIsNone(self.request(cookie=previous_cookie)[2]['user'])
        with sqlite3.connect(self.db) as db:
            encoded = db.execute('SELECT password_hash FROM users WHERE id=?', (user_id,)).fetchone()[0]
            self.assertNotIn(data['password'], encoded)
            self.assertTrue(encoded.startswith('pbkdf2_sha256$600000$'))
        self.assertEqual(self.request('logout', cookie=cookie)[0], 200)
        self.assertIsNone(self.request(cookie=cookie)[2]['user'])

    def test_validation_and_cross_origin(self):
        self.assertEqual(self.request('login', {}, origin='https://example.org')[0], 403)
        self.assertEqual(self.request('register', {'email': 'invalid', 'password': '12345678'})[2]['error'], 'invalid_email')
        self.assertEqual(self.request('register', {'email': 'short@example.com', 'password': '123'})[2]['error'], 'password_length')
        self.assertIsNone(self.request(cookie='greek_session=fake')[2]['user'])
        self.assertEqual(self.request(path='/.data/auth.sqlite3')[0], 404)
        self.assertEqual(self.request(path='/api/auth.py')[0], 404)

    def test_expired_session_and_rate_limit(self):
        data = {'email': 'limit@example.com', 'password': 'password-123', 'confirmPassword': 'password-123'}
        status, headers, result = self.request('register', data)
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie'].split(';')[0]
        with sqlite3.connect(self.db) as db:
            db.execute('UPDATE sessions SET expires_at=0 WHERE user_id=?', (result['user']['id'],))
        self.assertIsNone(self.request(cookie=cookie)[2]['user'])
        with sqlite3.connect(self.db) as db:
            db.execute('UPDATE auth_attempts SET count=100')
        self.assertEqual(self.request('login', data)[0], 429)
        with sqlite3.connect(self.db) as db:
            db.execute('DELETE FROM auth_attempts')

    def test_password_reset_is_private_one_time_and_revokes_sessions(self):
        data = {'email': 'reset@example.com', 'password': 'old-password-123', 'confirmPassword': 'old-password-123'}
        status, headers, result = self.request('register', data)
        self.assertEqual(status, 200)
        old_cookie = headers['Set-Cookie'].split(';')[0]
        delivered = []
        smtp_env = {'SMTP_HOST': 'smtp.test', 'SMTP_FROM': 'test@example.com', 'APP_ORIGIN': 'http://localhost'}
        with patch.dict(os.environ, smtp_env), patch('api.auth.send_reset_email', side_effect=lambda email, token: delivered.append((email, token))):
            self.assertEqual(self.request('request_reset', {'email': data['email']})[0], 200)
        self.assertEqual(delivered[0][0], data['email'])
        # Unknown addresses receive the same generic response and no message.
        with patch.dict(os.environ, smtp_env), patch('api.auth.send_reset_email') as sender:
            self.assertEqual(self.request('request_reset', {'email': 'absent-reset@example.com'})[2], {'ok': True})
            sender.assert_not_called()
        token = delivered[0][1]
        replacement = {'token': token, 'password': 'new-password-456', 'confirmPassword': 'new-password-456'}
        self.assertEqual(self.request('reset_password', replacement)[0], 200)
        self.assertIsNone(self.request(cookie=old_cookie)[2]['user'])
        self.assertEqual(self.request('login', {'email': data['email'], 'password': data['password']})[0], 401)
        self.assertEqual(self.request('login', {'email': data['email'], 'password': replacement['password']})[0], 200)
        self.assertEqual(self.request('reset_password', replacement)[2]['error'], 'invalid_reset_token')

    def test_private_files_blocked_for_get_and_head(self):
        for method in ('GET', 'HEAD'):
            for path in ('/.env.local', '/.git/config', '/.data/auth.sqlite3', '/README.md', '/server.py', '/api/auth.py', '/tests/test_auth.py', '/%2eenv.local', '/assets/../.env.local', '/assets/%2e%2e/.env.local'):
                with self.subTest(method=method, path=path):
                    self.assertEqual(self.request(path=path, method=method)[0], 404)
        self.assertEqual(self.request(path='/index.html', method='HEAD')[0], 200)
        for method in ('GET', 'HEAD'):
            self.assertEqual(self.request(path='/theme.js', method=method)[0], 200)
        self.assertEqual(self.request(path='/auth.js')[0], 200)

    def test_dns_rebinding_and_origin_scheme(self):
        self.assertEqual(self.request(extra_headers={'Host': 'attacker.example'})[0], 403)
        self.assertEqual(self.request('login', {}, origin='null')[0], 403)
        self.assertEqual(self.request('login', {}, origin=f'https://127.0.0.1:{self.server.server_port}')[0], 403)
        with patch.dict(os.environ, {'VERCEL': '1'}):
            self.assertEqual(self.request('login', {}, origin=f'http://127.0.0.1:{self.server.server_port}')[0], 403)
        self.assertEqual(self.request('login', {}, extra_headers={'Sec-Fetch-Site': 'cross-site'})[0], 403)

    def test_unknown_email_has_same_password_verification_work(self):
        data = {'email': 'timing@example.test', 'password': 'test-password', 'confirmPassword': 'test-password'}
        self.assertEqual(self.request('register', data)[0], 200)
        for email in ('timing@example.test', 'absent@example.test'):
            with patch('api.auth.hash_password', wraps=hash_password) as create_hash, patch('api.auth.verify_password', wraps=verify_password) as verify:
                self.assertEqual(self.request('login', {'email': email, 'password': 'incorrect'})[0], 401)
                self.assertEqual(create_hash.call_count, 0)
                self.assertEqual(verify.call_count, 1)

    def test_security_headers_and_no_third_party_fonts(self):
        for path in ('/index.html', '/verb.html', '/api/auth'):
            status, headers, body = self.request(path=path)
            self.assertEqual(status, 200)
            for key, expected in SECURITY_HEADERS.items():
                self.assertEqual(headers[key], expected)
            if path.endswith('.html'):
                self.assertNotIn(b'fonts.googleapis.com', body)
                self.assertNotIn(b'fonts.gstatic.com', body)
        self.assertNotIn('public', self.request()[1]['Cache-Control'])

    def test_sql_injection_and_invalid_payload(self):
        self.assertEqual(self.request('login', {'email': "a'OR'1'='1@example.test", 'password': 'anything'})[0], 401)
        self.assertEqual(self.request('login', [], extra_headers={'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.request('login', {'email': 'large@example.test', 'password': 'x' * 5000})[0], 400)
        self.assertEqual(self.request('login', {'email': ['wrong'], 'password': 'anything'})[0], 400)

    def test_production_cookie_is_host_scoped(self):
        import subprocess
        import sys
        source = "from api.auth import handler, COOKIE; import json; h=handler.__new__(handler); h.headers={}; print(json.dumps({'name':COOKIE,'cookie':h.cookie('test-token',60)}))"
        result = subprocess.run([sys.executable, '-c', source], env={**os.environ, 'VERCEL': '1'}, check=True, capture_output=True, text=True)
        value = json.loads(result.stdout)
        self.assertEqual(value['name'], '__Host-greek_session')
        self.assertIn('; Secure', value['cookie'])
        self.assertIn('; HttpOnly', value['cookie'])
        self.assertIn('; Path=/', value['cookie'])
        self.assertNotIn('Domain=', value['cookie'])

    def test_legal_validation_and_atomic_registration(self):
        data = {'email':'legal@example.test','password':'password-123','confirmPassword':'password-123'}
        for value in (None, {}, {'version':'stale'}, {'version':MANIFEST['version'],'language':'en','termsAccepted':'true','privacyAcknowledged':True,'adultConfirmed':True}):
            with self.subTest(value=value):
                self.assertEqual(self.request('register',{**data,'legalAcceptance':value})[0],400)
        self.assertEqual(self.request('register',data,accept_legal=False)[0],400)
        with patch('api.auth.record_acceptance',side_effect=RuntimeError('storage failed')):
            self.assertEqual(self.request('register',data)[0],503)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM users WHERE email=?',(data['email'],)).fetchone()[0],0)
        status,headers,value=self.request('register',data)
        self.assertEqual(status,200)
        self.assertTrue(value['user']['legal']['accepted'])
        with sqlite3.connect(self.db) as db:
            record=db.execute('SELECT version, terms_sha256, privacy_sha256, adult_confirmed FROM legal_acceptances WHERE user_id=?',(value['user']['id'],)).fetchone()
            self.assertEqual(record,(MANIFEST['version'],MANIFEST['documents']['terms.en']['sha256'],MANIFEST['documents']['privacy.en']['sha256'],1))
            self.assertTrue(db.execute('SELECT content FROM legal_documents WHERE sha256=?',(record[1],)).fetchone()[0].startswith('<!doctype html>'))

    def test_existing_account_does_not_imply_acceptance(self):
        data={'email':'legacy@example.test','password':'password-123','confirmPassword':'password-123'}
        _,headers,result=self.request('register',data)
        with sqlite3.connect(self.db) as db:
            db.execute('DELETE FROM legal_acceptances WHERE user_id=?',(result['user']['id'],))
        _,headers,result=self.request('login',data)
        self.assertFalse(result['user']['legal']['accepted'])
        cookie=headers['Set-Cookie'].split(';')[0]
        acceptance={'version':MANIFEST['version'],'language':'ru','termsAccepted':True,'privacyAcknowledged':True,'adultConfirmed':True}
        for _ in range(2):
            result=self.request('accept_legal',{'legalAcceptance':acceptance},cookie=cookie)
            self.assertEqual(result[0],200)
            self.assertTrue(result[2]['user']['legal']['accepted'])
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM legal_acceptances WHERE user_id=?',(result[2]['user']['id'],)).fetchone()[0],1)
        self.assertEqual(self.request('accept_legal',{'legalAcceptance':acceptance})[0],401)

    def test_account_export_deletion_and_session_revocation(self):
        data={'email':'erase@example.test','password':'password-123','confirmPassword':'password-123'}
        _,headers,user=self.request('register',data)
        cookie=headers['Set-Cookie'].split(';')[0]
        _,second,_=self.request('login',data)
        second_cookie=second['Set-Cookie'].split(';')[0]
        self.assertEqual(self.request('delete_account',{'password':'wrong','confirmation':'DELETE'},cookie=cookie)[0],401)
        self.assertEqual(self.request('delete_account',{'password':data['password']},cookie=cookie)[0],400)
        self.assertEqual(self.request('export_data',{'password':data['password']})[0],401)
        status,_,export=self.request('export_data',{'password':data['password']},cookie=cookie)
        self.assertEqual(status,200)
        self.assertEqual(export['export']['account']['email'],data['email'])
        self.assertNotIn('password',json.dumps(export).lower())
        self.assertNotIn('token',json.dumps(export).lower())
        self.assertEqual(len(export['export']['legalAcceptances']),1)
        self.assertEqual(self.request('delete_account',{'password':data['password'],'confirmation':'DELETE'},cookie=cookie)[0],200)
        for token in (cookie,second_cookie): self.assertIsNone(self.request(cookie=token)[2]['user'])
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM users WHERE id=?',(user['user']['id'],)).fetchone()[0],0)
            for table in ('legal_acceptances','sessions','password_reset_tokens'):
                self.assertEqual(db.execute('SELECT COUNT(*) FROM '+table+' WHERE user_id=?',(user['user']['id'],)).fetchone()[0],0)

    def test_logout_all_and_current_release_assets(self):
        data={'email':'all-sessions@example.test','password':'password-123','confirmPassword':'password-123'}
        _,first,_=self.request('register',data)
        _,second,_=self.request('login',data)
        cookie=first['Set-Cookie'].split(';')[0]
        self.assertEqual(self.request('logout_all',{'password':data['password']},cookie=cookie)[0],200)
        self.assertIsNone(self.request(cookie=second['Set-Cookie'].split(';')[0])[2]['user'])
        for path in ('/privacy.html','/privacy.en.html','/terms.html','/terms.en.html','/legal-manifest.json','/account-privacy.js','/legal.css','/legal.js'):
            for method in ('GET','HEAD'):
                self.assertEqual(self.request(path=path,method=method)[0],200)
        for path in ('/legal/config.json','/legal/privacy.ru.html','/public-files.json','/scripts/maintain_auth.py','/LEGAL_2026_RU.md'):
            self.assertEqual(self.request(path=path)[0],404)

    def test_sqlite_permissions_and_production_tls(self):
        from unittest.mock import Mock
        from types import SimpleNamespace
        import sys
        with database():
            pass
        self.assertEqual(Path(self.db).stat().st_mode & 0o777, 0o600)
        connection = Mock()
        connect = Mock(return_value=connection)
        with patch.dict(os.environ, {'VERCEL': '1', 'DATABASE_URL': 'postgresql://test.invalid/app', 'PGSSLROOTCERT': 'system'}), patch.dict(sys.modules, {'psycopg': SimpleNamespace(connect=connect)}):
            with database():
                pass
        self.assertEqual(connect.call_args.kwargs['sslmode'], 'verify-full')
        self.assertEqual(connect.call_args.kwargs['sslrootcert'], 'system')
        with patch.dict(os.environ, {'VERCEL': '1', 'DATABASE_URL': ''}):
            with self.assertRaises(RuntimeError):
                with database():
                    pass


if __name__ == '__main__':
    unittest.main()
