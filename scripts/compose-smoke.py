"""Exercise a disposable production Compose stack without a live market-data call."""

import base64
import json
import subprocess
import time
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
        return error.code, json.loads(content) if content else None


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

status, catalog = request("/api/education/lessons")
assert status == 200 and len(catalog["lessons"]) == 30, (status, catalog)
print("Legacy lesson catalog in MongoDB: OK")

status, account = request("/api/auth/register", "POST", {
    "email": "compose-smoke@example.org",
    "password": "ComposeSmoke123!",
    "fullName": "Compose Smoke",
})
assert status == 201 and account.get("token"), (status, account)
token = account["token"]

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
status, _ = request("/api/education/v2/progress", "DELETE", token=token)
assert status == 200
status, progress = request("/api/education/v2/progress", token=token)
assert status == 200 and progress["completed"] == {}
print("Account registration and current curriculum progress: OK")

status, error = request("/api/forecast/generate", "POST", {"ticker": "AAPL", "forecastMonths": 0})
assert status == 400 and "weeks" in error["message"], (status, error)
print("Forecast weekly-horizon validation: OK")
