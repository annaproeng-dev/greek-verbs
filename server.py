"""Run the app and its auth API: python3 server.py"""
import os
import json
import threading
import time
import logging
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from api.auth import handler as AuthHandler, SECURITY_HEADERS

ROOT = Path(__file__).resolve().parent
ROUTES = json.loads((ROOT / 'routes.json').read_text())
PUBLIC_FILES = json.loads((ROOT / 'public-files.json').read_text())


class Handler(SimpleHTTPRequestHandler, AuthHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if urlsplit(self.path).path != '/api/auth':
            self.send_header('Cache-Control', 'no-cache')
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        super().end_headers()

    def allowed_request(self):
        # The dev server is loopback-only; reject DNS rebinding and foreign Host values.
        port = self.server.server_port
        if self.headers.get('Host') not in {f'localhost:{port}', f'127.0.0.1:{port}'}:
            self.send_error(403)
            return False
        return True

    def public_path(self):
        path = unquote(urlsplit(self.path).path)
        public_files = {'/'} | {'/' + name for name in PUBLIC_FILES['files']}
        asset = path.startswith('/assets/') and Path(path).suffix.lower() in {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.wav', '.mp3', '.ogg', '.woff2', '.woff', '.ttf'}
        candidate = ROOT / path.lstrip('/')
        if any(part.startswith('.') for part in path.split('/') if part) or not (path in public_files or asset):
            return False
        # Deny symlinks, including links inside the otherwise public assets folder.
        return all(not parent.is_symlink() for parent in (candidate, *candidate.parents)) and candidate.resolve().is_relative_to(ROOT)

    def do_GET(self):
        if not self.allowed_request():
            return
        if urlsplit(self.path).path == '/api/auth':
            return AuthHandler.do_GET(self)
        route = ROUTES.get(urlsplit(self.path).path)
        if route:
            self.path = '/' + route['file']
        if not self.public_path():
            return self.send_error(404)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_HEAD(self):
        if not self.allowed_request():
            return
        route = ROUTES.get(urlsplit(self.path).path)
        if route:
            self.path = '/' + route['file']
        if not self.public_path():
            return self.send_error(404)
        return SimpleHTTPRequestHandler.do_HEAD(self)

    def do_POST(self):
        if not self.allowed_request():
            return
        if urlsplit(self.path).path == '/api/auth':
            return AuthHandler.do_POST(self)
        self.send_error(404)

    def list_directory(self, path):
        self.send_error(404)


def start_retention_worker():
    """Housekeeping uses this process's database config, including PostgreSQL overrides."""
    from api.auth import database
    from api.legal import cleanup_expired
    stop = threading.Event()
    def maintain():
        while not stop.is_set():
            try:
                with database() as execute:
                    cleanup_expired(execute, int(time.time()))
            except Exception as error:
                logging.error('Authentication retention cleanup failed (%s)', type(error).__name__)
            stop.wait(3600)
    threading.Thread(target=maintain, name='auth-retention', daemon=True).start()
    return stop


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    print(f'Greek Verbs: http://localhost:{port}', flush=True)
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    retention_stop = start_retention_worker()
    try:
        server.serve_forever()
    finally:
        retention_stop.set()
        server.server_close()
