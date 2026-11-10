"""Emit the exact production file inventory; public serving uses the same manifest."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSET_EXTENSIONS={'.png','.jpg','.jpeg','.webp','.svg','.wav','.mp3','.ogg','.woff2','.woff','.ttf','.json'}

def release_files():
    manifest=json.loads((ROOT/'public-files.json').read_text())
    files=set(manifest['files']) | {'server.py','requirements.txt','public-files.json','legal/config.json','scripts/maintain_auth.py','scripts/manage_owner.py'}
    files.update(str(p.relative_to(ROOT)) for p in (ROOT/'api').glob('*.py'))
    files.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets').rglob('*') if p.is_file() and p.suffix.lower() in ASSET_EXTENSIONS)
    for name in sorted(files):
        path=ROOT/name
        if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(ROOT) or any(part.startswith('.') for part in Path(name).parts):
            raise ValueError('Invalid release path: '+name)
        yield name
if __name__=='__main__':
    for name in release_files():print(name)
