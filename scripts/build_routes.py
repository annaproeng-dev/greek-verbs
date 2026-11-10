"""Synchronize hosting rewrites with the canonical application route registry."""
import argparse
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    routes = json.loads((ROOT / 'routes.json').read_text())
    manifest = json.loads((ROOT / 'public-files.json').read_text())
    for path, route in routes.items():
        if not path.startswith('/') or path.count('/') != 1 or route['file'] not in manifest['files']:
            raise SystemExit('Invalid route: ' + path)
    config_path = ROOT / 'vercel.json'
    config = json.loads(config_path.read_text())
    rewrites = [{'source': path, 'destination': '/' + route['file']} for path, route in routes.items()]
    if args.check:
        if config.get('rewrites') != rewrites:
            raise SystemExit('Hosting rewrites are out of date; run python3 scripts/build_routes.py')
    else:
        config['rewrites'] = rewrites
        config_path.write_text(json.dumps(config, indent=2) + '\n')
    print('Application routes: verified')


if __name__ == '__main__':
    main()
