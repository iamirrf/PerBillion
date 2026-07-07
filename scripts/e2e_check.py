import datetime as _dt
import json as _json
import secrets as _secrets
import time as _time
import urllib.error as _ue
import urllib.request as _ur

BASE = "http://127.0.0.1"


def _request(method: str, path: str, *, headers: dict | None = None, body_obj=None, timeout: float = 20.0):
    url = BASE + path
    data = None
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    if body_obj is not None:
        raw = _json.dumps(body_obj).encode("utf-8")
        data = raw
        req_headers.setdefault("Content-Type", "application/json")

    req = _ur.Request(url, data=data, headers=req_headers, method=method)

    try:
        with _ur.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            raw_body = resp.read()
            return status, raw_body
    except _ue.HTTPError as e:
        raw_body = e.read()
        return e.code, raw_body


def _json_from_bytes(raw: bytes):
    if not raw:
        return None
    try:
        return _json.loads(raw.decode("utf-8"))
    except Exception:
        return raw.decode("utf-8", errors="replace")


def _weekly_series(n=60, start_date=_dt.date(2024, 1, 1), start_price=100.0, step=0.5):
    series = []
    for i in range(n):
        d = start_date + _dt.timedelta(days=7 * i)
        series.append([d.isoformat(), float(start_price + i * step)])
    return series


def main():
    print("== Health checks ==")
    # Wait for gateway + dependencies to be healthy
    for attempt in range(1, 31):
        status, raw = _request("GET", "/api/health")
        obj = _json_from_bytes(raw)
        ok = status == 200 and isinstance(obj, dict) and obj.get("status") == "healthy"
        print(f"/api/health attempt={attempt} http={status} ok={ok}")
        if ok:
            break
        _time.sleep(2)
    else:
        print("/api/health did not become healthy")
        print("last_response:", obj)
        raise SystemExit(5)

    status, raw = _request("GET", "/health")
    print(f"/health: {status}")

    print("\n== Register/Login ==")
    ts = int(_time.time())
    email = f"test_{ts}@example.com"
    password = f"Test-{_secrets.token_urlsafe(18)}1!"

    reg_body = {"email": email, "password": password, "fullName": "Test User"}
    status, raw = _request("POST", "/api/auth/register", body_obj=reg_body)
    reg = _json_from_bytes(raw)
    print("register_status:", status)

    token = ""
    if isinstance(reg, dict):
        token = reg.get("token", "") or ""

    if not token:
        login_body = {"email": email, "password": password}
        status, raw = _request("POST", "/api/auth/login", body_obj=login_body)
        login = _json_from_bytes(raw)
        print("login_status:", status)
        if isinstance(login, dict):
            token = login.get("token", "") or ""
        if not token:
            print("login_response:", login)
            raise SystemExit(10)

    print("token_len:", len(token))

    print("\n== Create forecast ==")
    series = _weekly_series()
    create_body = {
        "ticker": "AAPL",
        "data": series,
        "forecastHorizon": 12,
        "modelType": "auto",
    }

    status, raw = _request(
        "POST",
        "/api/forecasts",
        headers={"Authorization": f"Bearer {token}"},
        body_obj=create_body,
        timeout=60.0,
    )
    created = _json_from_bytes(raw)
    print("create_status:", status)

    forecast_id = ""
    if isinstance(created, dict):
        forecast_id = created.get("forecastId", "") or ""

    if not forecast_id:
        print("create_response:", created)
        raise SystemExit(20)

    print("forecast_id:", forecast_id)

    print("\n== Poll status ==")
    final = None
    for i in range(1, 31):
        status, raw = _request(
            "GET",
            f"/api/forecasts/{forecast_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        )
        obj = _json_from_bytes(raw)
        st = None
        if isinstance(obj, dict):
            st = obj.get("status")
        print(f"poll={i} http={status} status={st}")

        if st in ("completed", "failed"):
            final = obj
            break
        _time.sleep(2)

    if final is None:
        print("Timed out waiting for completed/failed")
        raise SystemExit(30)

    print("\n== Final result (truncated) ==")
    if isinstance(final, dict):
        text = _json.dumps(final, indent=2)
        print(text[:2000])
    else:
        print(final)


if __name__ == "__main__":
    main()
