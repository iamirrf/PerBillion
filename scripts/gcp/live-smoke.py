"""Verify a deployed PerBillion origin with a disposable test account."""

import argparse
import base64
import json
import os
import secrets
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


parser = argparse.ArgumentParser()
parser.add_argument("origin")
parser.add_argument("--receipt", type=Path, default=Path('/tmp/perbillion-live-smoke.json'))
args = parser.parse_args()
origin = args.origin.rstrip('/')


def request(path, method='GET', body=None, token=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = Request(origin + path, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as response:
            content = response.read()
            return response.status, json.loads(content) if content and 'json' in response.headers.get('Content-Type', '') else content
    except HTTPError as error:
        content = error.read()
        return error.code, json.loads(content) if content and 'json' in error.headers.get('Content-Type', '') else content


status, health = request('/api/health')
assert status == 200 and health['status'] == 'healthy'
assert all(check['status'] == 'healthy' for check in health['checks'].values())
status, _ = request('/api/education/lessons')
assert status == 401
status, html = request('/education?lesson=money-to-investing')
assert status == 200 and b'PerBillion' in html
print('Live services, prior coursework, and lesson route: OK')

email = f'perbillion-smoke-{uuid.uuid4().hex[:12]}@example.org'
password = secrets.token_urlsafe(24)
status, account = request('/api/auth/register', 'POST', {
    'email': email, 'password': password, 'fullName': 'Release Smoke'
})
assert status == 201 and account.get('token'), (status, account)
token = account['token']
status, lessons = request('/api/education/lessons', token=token)
assert status == 200 and len(lessons['lessons']) == 30
status, login = request('/api/auth/login', 'POST', {'email': email, 'password': password})
assert status == 200 and login.get('token'), (status, login)

status, progress = request('/api/education/v2/progress', token=token)
assert status == 200 and progress['completed'] == {}
best = 0
for score in (80, 100, 70):
    best = max(best, score)
    status, saved = request('/api/education/v2/progress/money-to-investing', 'PUT', {'score': score}, token)
    assert status == 200 and saved['completion']['score'] == best
status, progress = request('/api/education/v2/progress', token=token)
assert status == 200 and progress['completed']['money-to-investing']['score'] == 100
status, exercise = request('/api/education/v2/exercises/money-to-investing', 'PUT', token=token)
assert status == 200 and exercise['completion']['completedAt']
status, exercises = request('/api/education/v2/exercises', token=token)
assert status == 200 and 'money-to-investing' in exercises['completed']
status, _ = request('/api/education/v2/progress', 'DELETE', token=token)
assert status == 200
status, progress = request('/api/education/v2/progress', token=token)
assert status == 200 and progress['completed'] == {}
status, exercises = request('/api/education/v2/exercises', token=token)
assert status == 200 and exercises['completed'] == {}
status, _ = request('/api/education/v2/progress/money-to-investing', 'PUT', {'score': 90}, token)
assert status == 200
print('Live registration, login, quiz scores, exercises, and scoped reset: OK')

status, practice = request('/api/product/practice?scenario=steady-growth', token=token)
assert status == 200 and practice['cashCents'] == 1_000_000 and practice['revision'] == 0
request_id = str(uuid.uuid4())
order = {
    'scenarioId': 'steady-growth', 'action': 'trade', 'side': 'buy',
    'assetId': 'CORE', 'quantity': 2, 'expectedRevision': 0, 'requestId': request_id,
}
status, bought = request('/api/product/practice/actions', 'POST', order, token)
assert status == 200 and bought['revision'] == 1 and bought['positions'][0]['quantity'] == 2
status, duplicate = request('/api/product/practice/actions', 'POST', order, token)
assert status == 200 and duplicate['revision'] == 1 and len(duplicate['trades']) == 1
status, _ = request('/api/product/watchlist/AAPL', 'PUT', token=token)
assert status == 200
status, watchlist = request('/api/product/watchlist', token=token)
assert status == 200 and watchlist['tickers'] == ['AAPL']
second_email = f'perbillion-isolation-{uuid.uuid4().hex[:12]}@example.org'
status, second = request('/api/auth/register', 'POST', {
    'email': second_email, 'password': secrets.token_urlsafe(24), 'fullName': 'Isolation Smoke'
})
assert status == 201 and second.get('token')
status, isolated_practice = request('/api/product/practice?scenario=steady-growth', token=second['token'])
assert status == 200 and isolated_practice['revision'] == 0 and isolated_practice['positions'] == []
status, isolated_watchlist = request('/api/product/watchlist', token=second['token'])
assert status == 200 and isolated_watchlist['tickers'] == []
print('Live account-scoped practice, watchlists, and account isolation: OK')

png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZbH0AAAAASUVORK5CYII=')
boundary = 'perbillion-live-smoke'
multipart = (
    f'--{boundary}\r\nContent-Disposition: form-data; name="profilePicture"; filename="avatar.png"\r\n'
    'Content-Type: image/png\r\n\r\n'
).encode() + png + f'\r\n--{boundary}--\r\n'.encode()
req = Request(origin + '/api/user/profile-picture', data=multipart, method='POST', headers={
    'Authorization': f'Bearer {token}',
    'Content-Type': f'multipart/form-data; boundary={boundary}',
})
with urlopen(req, timeout=30) as response:
    avatar_path = json.load(response)['profilePicture']
status, image = request(avatar_path)
assert status == 200 and image == png
print('Live profile image persistence path: OK')

status, invalid = request('/api/forecast/generate', 'POST', {'ticker': 'AAPL', 'forecastMonths': 0}, token)
assert status == 400 and 'weeks' in invalid['message']

receipt = {'email': email, 'userId': account['user']['id'], 'token': token, 'avatarPath': avatar_path}
descriptor = os.open(args.receipt, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(descriptor, 'w') as output:
    json.dump(receipt, output)
print('Live weekly forecast validation: OK')
