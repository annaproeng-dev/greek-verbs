"""Authoritative learning ownership, CAS updates, reset generations and legacy imports."""
import hashlib
import json
import os
import re
import secrets
from http.cookies import SimpleCookie, CookieError
from api.legal import CONFIG

EMPTY = {'progress': {}, 'difficult': []}

def export_learning(execute, owner):
    row=execute('SELECT data FROM learning WHERE owner = ?', (owner,)).fetchone()
    return json.loads(row[0]) if row else dict(EMPTY)

def learning_request(request, execute, payload, now):
    token=request.session_token()
    # Serialize account deletion with authenticated learning writes on PostgreSQL.
    lock=' FOR UPDATE OF users' if os.environ.get('DATABASE_URL') else ''
    account=execute('SELECT users.id FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?'+lock, (hashlib.sha256(token.encode()).hexdigest(),now)).fetchone() if token else None
    cookie=None
    if token and not account: return 401, {'error':'authentication_required'}, request.cookie()
    if account:
        owner='user:'+account[0]; public_owner=owner
    else:
        cookies=SimpleCookie()
        try: cookies.load(request.headers.get('Cookie',''))
        except CookieError: pass
        guest=cookies.get('greek_learning_guest'); guest=guest.value if guest else ''
        if not re.fullmatch(r'[a-f0-9]{64}',guest):
            guest=secrets.token_hex(32)
            secure='; Secure' if request.headers.get('X-Forwarded-Proto')=='https' or os.environ.get('VERCEL') else ''
            cookie=f"greek_learning_guest={guest}; Path=/; HttpOnly; SameSite=Lax; Max-Age={CONFIG['retention']['guestDays']*86400}{secure}"
        owner='guest:'+hashlib.sha256(guest.encode()).hexdigest(); public_owner='guest'
    execute('INSERT INTO learning (owner, data, revision) VALUES (?, ?, 0) ON CONFLICT (owner) DO NOTHING',(owner,json.dumps(EMPTY)))
    execute('INSERT INTO learning_metadata (owner, generation, imports, migration_closed, updated_at) VALUES (?, ?, ?, 0, ?) ON CONFLICT (owner) DO NOTHING',(owner,'initial','[]',now))
    lock=' FOR UPDATE' if os.environ.get('DATABASE_URL') else ''
    row=execute('SELECT data, revision FROM learning WHERE owner = ?'+lock,(owner,)).fetchone()
    meta=execute('SELECT generation, imports, migration_closed FROM learning_metadata WHERE owner = ?'+lock,(owner,)).fetchone()
    generation,imports,closed=meta[0],json.loads(meta[1]),bool(meta[2])
    operation=payload.get('operation','load')
    if operation not in ('load','save','reset','import'): return 400,{'error':'invalid_request'},cookie
    if operation!='load':
        if payload.get('owner')!=public_owner: return 409,{'error':'account_changed'},cookie
        if payload.get('generation')!=generation: return 409,{'error':'storage_reset'},cookie
        if type(payload.get('revision')) is not int or payload['revision']!=row[1]: return 409,{'error':'conflict'},cookie
        data=payload.get('data')
        if operation=='reset':
            data=dict(EMPTY); generation=secrets.token_hex(16);closed=True
        elif not isinstance(data,dict) or set(data)!={'progress','difficult'} or not isinstance(data['progress'],dict) or not isinstance(data['difficult'],list):
            return 400,{'error':'invalid_request'},cookie
        if operation=='import':
            source=payload.get('source')
            if not isinstance(source,str) or not re.fullmatch('[a-f0-9]{64}',source): return 400,{'error':'invalid_request'},cookie
            # Duplicate or pre-reset imports never restore data after an intentional reset.
            if closed or source in imports:
                return 200,{'data':json.loads(row[0]),'revision':row[1],'generation':generation,'imports':imports,'migrationClosed':closed,'owner':public_owner},cookie
            if len(imports)>=100: return 400,{'error':'migration_limit'},cookie
            imports.append(source)
        try: encoded=json.dumps(data,allow_nan=False)
        except (ValueError,TypeError):return 400,{'error':'invalid_request'},cookie
        updated=execute('UPDATE learning SET data = ?, revision = revision + 1 WHERE owner = ? AND revision = ? RETURNING revision',(encoded,owner,row[1])).fetchone()
        if not updated:return 409,{'error':'conflict'},cookie
        row=(encoded,updated[0])
        execute('UPDATE learning_metadata SET generation = ?, imports = ?, migration_closed = ?, updated_at = ? WHERE owner = ?',(generation,json.dumps(imports),int(closed),now,owner))
    else:execute('UPDATE learning_metadata SET updated_at = ? WHERE owner = ?',(now,owner))
    return 200,{'data':json.loads(row[0]),'revision':row[1],'generation':generation,'imports':imports,'migrationClosed':closed,'owner':public_owner},cookie
