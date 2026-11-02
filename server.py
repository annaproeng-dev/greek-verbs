"""Run the app and its auth API: python3 server.py"""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from api.auth import handler as AuthHandler

ROOT = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler, AuthHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/api/auth':
            return AuthHandler.do_GET(self)
        if any(part.startswith('.') for part in path.split('/') if part) or path.startswith(('/api/', '/tests/', '/deploy/')) or path in ('/server.py', '/requirements.txt'):
            return self.send_error(404)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if urlsplit(self.path).path == '/api/auth':
            return AuthHandler.do_POST(self)
        self.send_error(404)

    def list_directory(self, path):
        self.send_error(404)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    print(f'Greek Verbs: http://localhost:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
