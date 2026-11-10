"""Transactional free practice allowances, separate from resettable learning progress."""
import hashlib
import json
import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo
from api.learning import learning_request
from api.subscriptions import subscription_payload

FORMATS = ('cards', 'quiz', 'match', 'tense', 'conj', 'change', 'situation', 'fill', 'phrases')
# One knob for subsequent product experiments; never accept limits from the browser.
DAILY_LIMIT = 10
INTRO_LIMIT = 3
DAY_ZONE = 'Europe/Nicosia'


def access_request(request, execute, payload, now):
    operation = payload.get('operation', 'status')
    if operation not in ('status', 'use'):
        return 400, {'error': 'invalid_request'}, None
    if operation == 'use' and (payload.get('format') not in FORMATS or not isinstance(payload.get('task'), str) or not re.fullmatch(r'[a-zA-Z0-9:_-]{1,160}', payload['task'])):
        return 400, {'error': 'invalid_request'}, None
    status, identity, cookie = learning_request(request, execute, {'operation': 'load'}, now)
    if status != 200:
        return status, identity, cookie
    public_owner = identity['owner']
    if public_owner == 'guest':
        # learning_request established the same HttpOnly guest identity.
        from http.cookies import SimpleCookie
        cookies = SimpleCookie()
        cookies.load(cookie or request.headers.get('Cookie', ''))
        owner = 'guest:' + hashlib.sha256(cookies['greek_learning_guest'].value.encode()).hexdigest()
    else:
        owner = public_owner
    if payload.get('owner', public_owner) != public_owner:
        return 409, {'error': 'account_changed'}, cookie
    paid = public_owner != 'guest' and subscription_payload(execute, public_owner[5:], now)['plan'] != 'free'
    day = datetime.fromtimestamp(now, ZoneInfo(DAY_ZONE)).date().isoformat()
    execute('INSERT INTO practice_access (owner, data, updated_at) VALUES (?, ?, ?) ON CONFLICT (owner) DO NOTHING', (owner, '{}', now))
    lock = ' FOR UPDATE' if os.environ.get('DATABASE_URL') else ''
    row = execute('SELECT data FROM practice_access WHERE owner = ?' + lock, (owner,)).fetchone()
    data = json.loads(row[0])
    data.setdefault('intro', {})
    data.setdefault('introTasks', [])
    if data.get('day') != day:
        data.update(day=day, dailyUsed=0, dailyTasks=[])
    allowed = True
    if operation == 'use' and not paid:
        fmt, task = payload['format'], payload['format'] + ':' + payload['task']
        if task not in data['introTasks'] and task not in data['dailyTasks']:
            used = data['intro'].get(fmt, 0)
            if used < INTRO_LIMIT:
                data['intro'][fmt] = used + 1
                data['introTasks'].append(task)
            elif public_owner != 'guest' and data['dailyUsed'] < DAILY_LIMIT:
                data['dailyUsed'] += 1
                data['dailyTasks'].append(task)
            else:
                allowed = False
    execute('UPDATE practice_access SET data = ?, updated_at = ? WHERE owner = ?', (json.dumps(data), now, owner))
    access = {'owner': public_owner, 'unlimited': paid, 'introRemaining': {fmt: max(0, INTRO_LIMIT - data['intro'].get(fmt, 0)) for fmt in FORMATS}, 'dailyLimit': DAILY_LIMIT if public_owner != 'guest' else 0, 'dailyRemaining': max(0, DAILY_LIMIT - data['dailyUsed']) if public_owner != 'guest' else 0, 'day': day, 'timezone': DAY_ZONE}
    return (200 if allowed else 403), {'access': access, 'error': None if allowed else 'practice_limit'}, cookie
