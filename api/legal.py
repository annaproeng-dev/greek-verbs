"""Reviewed legal release metadata shared by HTTP API and maintenance tools."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'legal/config.json').read_text())
MANIFEST = json.loads((ROOT / 'legal-manifest.json').read_text())
if MANIFEST['version'] != CONFIG['version']:
    raise RuntimeError('Legal sources must be rebuilt before starting the server')
DOCUMENTS = {}
for key, item in MANIFEST['documents'].items():
    text = (ROOT / item['path']).read_text()
    if hashlib.sha256(text.encode()).hexdigest() != item['sha256']:
        raise RuntimeError('Legal document integrity check failed: ' + key)
    DOCUMENTS[key] = text

def validate_acceptance(payload):
    value = payload.get('legalAcceptance')
    return (isinstance(value, dict) and value.get('version') == MANIFEST['version']
            and value.get('language') in ('ru', 'en') and value.get('termsAccepted') is True
            and value.get('privacyAcknowledged') is True and value.get('adultConfirmed') is True)

def record_acceptance(execute, user_id, value, now):
    language = value['language']
    hashes=[]
    for kind in ('terms', 'privacy'):
        key = kind + '.' + language
        digest = MANIFEST['documents'][key]['sha256']
        execute('INSERT INTO legal_documents (sha256, version, kind, language, content) VALUES (?, ?, ?, ?, ?) ON CONFLICT (sha256) DO NOTHING',
                (digest, MANIFEST['version'], kind, language, DOCUMENTS[key]))
        hashes.append(digest)
    execute('INSERT INTO legal_acceptances (user_id, version, language, accepted_at, terms_sha256, privacy_sha256, adult_confirmed) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT (user_id, version, language) DO NOTHING',
            (user_id, MANIFEST['version'], language, now, *hashes))

def user_payload(execute, user_id, email):
    accepted = execute('SELECT version FROM legal_acceptances WHERE user_id = ? AND version = ?', (user_id, MANIFEST['version'])).fetchone()
    role = execute('SELECT role FROM user_roles WHERE user_id = ?', (user_id,)).fetchone()
    from api.subscriptions import subscription_payload
    return {'subscription': subscription_payload(execute, user_id), 'id':user_id, 'email':email, 'role':role[0] if role else 'user', 'legal':{'version':MANIFEST['version'], 'accepted':bool(accepted)}}

def cleanup_expired(execute, now):
    execute('DELETE FROM sessions WHERE expires_at <= ?', (now,))
    execute('DELETE FROM auth_attempts WHERE expires_at <= ?', (now,))
    execute('DELETE FROM password_reset_tokens WHERE expires_at <= ? OR used_at IS NOT NULL', (now,))
    cutoff = now - CONFIG['retention']['guestDays'] * 86400
    execute("DELETE FROM learning WHERE owner IN (SELECT owner FROM learning_metadata WHERE owner LIKE 'guest:%' AND updated_at <= ?)", (cutoff,))
    execute("DELETE FROM learning_metadata WHERE owner LIKE 'guest:%' AND updated_at <= ?", (cutoff,))
