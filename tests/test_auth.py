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

from server import Handler


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

    def request(self, action=None, data=None, cookie=None, origin=None, path=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        headers = {'Content-Type': 'application/json'}
        if cookie:
            headers['Cookie'] = cookie
        if origin:
            headers['Origin'] = origin
        conn.request('POST' if action else 'GET', path or '/api/auth' + ('?action=' + action if action else ''), json.dumps(data or {}) if action else None, headers)
        response = conn.getresponse()
        body = response.read()
        result = (response.status, dict(response.getheaders()), json.loads(body) if body.startswith(b'{') else body)
        conn.close()
        return result

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
        status, headers, result = self.request('login', data)
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie'].split(';')[0]
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


if __name__ == '__main__':
    unittest.main()
