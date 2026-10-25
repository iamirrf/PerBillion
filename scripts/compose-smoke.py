"""Exercise a disposable production Compose stack without a live market-data call."""

import base64
import json
import subprocess
import time
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE = "http://127.0.0.1:8088"


def request(path, method="GET", body=None, token=None):
    payload = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(BASE + path, data=payload, headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as response:
            content = response.read()
            return response.status, json.loads(content) if content and "json" in response.headers.get("Content-Type", "") else content
    except HTTPError as error:
        content = error.read()
        return error.code, json.loads(content) if content and "json" in error.headers.get("Content-Type", "") else content


status, health = request("/api/health")
assert status == 200 and health["status"] == "healthy", (status, health)
assert all(item["status"] == "healthy" for item in health["checks"].values())
print("Gateway, MongoDB, Spring, and Python health: OK")

status, html = request("/education?lesson=money-to-investing")
assert status == 200 and b"PerBillion" in html
status, image = request("/assets/gold-sculpture.webp")
assert status == 200 and image.startswith(b"RIFF")
status, font = request("/fonts/dm-sans-latin.woff2")
assert status == 200 and font.startswith(b"wOF2")
print("Frontend routes and assets: OK")

status, _ = request("/api/education/lessons")
assert status == 401

status, account = request("/api/auth/register", "POST", {
    "email": f"compose-smoke-{uuid.uuid4().hex[:12]}@example.org",
    "password": "ComposeSmoke123!",
    "fullName": "Compose Smoke",
})
assert status == 201 and account.get("token"), (status, account)
token = account["token"]
status, catalog = request("/api/education/lessons", token=token)
assert status == 200 and len(catalog["lessons"]) == 30, (status, catalog)
print("Authenticated legacy lesson catalog in MongoDB: OK")

png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZbH0AAAAASUVORK5CYII="
)
boundary = "perbillion-smoke-boundary"
multipart = (
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"profilePicture\"; filename=\"avatar.png\"\r\n"
    "Content-Type: image/png\r\n\r\n"
).encode() + png + f"\r\n--{boundary}--\r\n".encode()
avatar_request = Request(
    BASE + "/api/user/profile-picture",
    data=multipart,
    method="POST",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    },
)
with urlopen(avatar_request, timeout=30) as response:
    avatar_path = json.load(response)["profilePicture"]
status, avatar = request(avatar_path)
assert status == 200 and avatar == png
subprocess.run(["docker", "compose", "-f", "docker-compose.production.yml", "restart", "api-gateway"], check=True)
for attempt in range(30):
    status, health = request("/api/health")
    if status == 200:
        break
    time.sleep(2)
else:
    raise AssertionError("Gateway did not recover after restart")
status, avatar = request(avatar_path)
assert status == 200 and avatar == png
print("Profile image persists across gateway restart: OK")

status, progress = request("/api/education/v2/progress", token=token)
assert status == 200 and progress["completed"] == {}, (status, progress)
status, saved = request("/api/education/v2/progress/money-to-investing", "PUT", {"score": 80}, token)
assert status == 200 and saved["completion"]["score"] == 80, (status, saved)
first_completion = saved["completion"]["completedAt"]
status, saved = request("/api/education/v2/progress/money-to-investing", "PUT", {"score": 100}, token)
assert status == 200 and saved["completion"]["score"] == 100
assert saved["completion"]["completedAt"] == first_completion
status, saved = request("/api/education/v2/progress/money-to-investing", "PUT", {"score": 70}, token)
assert status == 200 and saved["completion"]["score"] == 100
status, progress = request("/api/education/v2/progress", token=token)
assert status == 200 and progress["completed"]["money-to-investing"]["score"] == 100
status, exercise = request("/api/education/v2/exercises/money-to-investing", "PUT", token=token)
assert status == 200 and exercise["completion"]["completedAt"]
status, exercises = request("/api/education/v2/exercises", token=token)
assert status == 200 and "money-to-investing" in exercises["completed"]
status, _ = request("/api/education/v2/progress", "DELETE", token=token)
assert status == 200
status, progress = request("/api/education/v2/progress", token=token)
assert status == 200 and progress["completed"] == {}
status, exercises = request("/api/education/v2/exercises", token=token)
assert status == 200 and exercises["completed"] == {}
print("Account registration, quiz scores, exercises, and scoped reset: OK")

status, practice = request("/api/product/practice?scenario=steady-growth", token=token)
assert status == 200 and practice["cashCents"] == 1_000_000 and practice["revision"] == 0
request_id = str(uuid.uuid4())
order = {
    "scenarioId": "steady-growth", "action": "trade", "side": "buy",
    "assetId": "CORE", "quantity": 2, "expectedRevision": 0, "requestId": request_id,
}
status, bought = request("/api/product/practice/actions", "POST", order, token)
assert status == 200 and bought["revision"] == 1 and bought["positions"][0]["quantity"] == 2
status, duplicate = request("/api/product/practice/actions", "POST", order, token)
assert status == 200 and duplicate["revision"] == 1 and len(duplicate["trades"]) == 1
conflict = {**order, "requestId": str(uuid.uuid4()), "quantity": 1}
status, stale = request("/api/product/practice/actions", "POST", conflict, token)
assert status == 409 and stale["current"]["revision"] == 1
oversell = {**order, "requestId": str(uuid.uuid4()), "side": "sell", "quantity": 3, "expectedRevision": 1}
status, error = request("/api/product/practice/actions", "POST", oversell, token)
assert status == 400 and "more units" in error["error"]
status, _ = request("/api/product/watchlist/AAPL", "PUT", token=token)
assert status == 200
status, watchlist = request("/api/product/watchlist", token=token)
assert status == 200 and watchlist["tickers"] == ["AAPL"]
status, second = request("/api/auth/register", "POST", {
    "email": f"compose-isolation-{uuid.uuid4().hex[:12]}@example.org",
    "password": "ComposeSmoke123!", "fullName": "Isolation Smoke",
})
assert status == 201 and second.get("token")
status, isolated_practice = request("/api/product/practice?scenario=steady-growth", token=second["token"])
assert status == 200 and isolated_practice["revision"] == 0 and isolated_practice["positions"] == []
status, isolated_watchlist = request("/api/product/watchlist", token=second["token"])
assert status == 200 and isolated_watchlist["tickers"] == []
print("Atomic practice, idempotency, revision conflicts, watchlists, and account isolation: OK")

status, error = request("/api/forecast/generate", "POST", {"ticker": "AAPL", "forecastMonths": 0}, token)
assert status == 400 and "weeks" in error["message"], (status, error)
print("Forecast weekly-horizon validation: OK")
