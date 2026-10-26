"""Prepare private Cloud Run env files without writing secrets into Git or CLI args."""

import argparse
import os
import shlex
from pathlib import Path
from urllib.parse import quote


parser = argparse.ArgumentParser()
parser.add_argument("--app-password-file", required=True, type=Path)
parser.add_argument("--jwt-secret-file", required=True, type=Path)
parser.add_argument("--alpha-env-file", required=True, type=Path)
parser.add_argument("--email-env-file", type=Path)
parser.add_argument("--output-dir", required=True, type=Path)
parser.add_argument("--public-origin", default="https://perbillion.invalid")
args = parser.parse_args()

app_password = args.app_password_file.read_text().strip()
jwt_secret = args.jwt_secret_file.read_text().strip()
alpha_lines = args.alpha_env_file.read_text().splitlines()
alpha_matches = [line.split("=", 1)[1].strip().strip("\"'") for line in alpha_lines
                 if line.startswith("ALPHAVANTAGE_API_KEY=")]
email_values: dict[str, str] = {}
if args.email_env_file:
    for line in args.email_env_file.read_text().splitlines():
        if "=" in line and line.split("=", 1)[0] in {"RESEND_API_KEY", "EMAIL_FROM"}:
            key, value = line.split("=", 1)
            email_values[key] = value.strip().strip("\"'")
    if not email_values.get("RESEND_API_KEY") or not email_values.get("EMAIL_FROM"):
        raise SystemExit("The email environment file must contain RESEND_API_KEY and EMAIL_FROM")
if not app_password or not jwt_secret or len(alpha_matches) != 1 or not alpha_matches[0]:
    raise SystemExit("A required deployment secret is missing")

mongo_uri = (
    f"mongodb://perbillion_app:{quote(app_password, safe='')}@10.128.0.2:27017/"
    "perbillion?authSource=perbillion&directConnection=true"
)


def write_config(filename: str, values: dict[str, str]) -> None:
    path = args.output_dir / filename
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as output:
        for key, value in values.items():
            output.write(f"{key}={shlex.quote(value)}\n")


args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
write_config("gateway.env", {
    "NODE_ENV": "production",
    "PORT": "3000",
    "MONGODB_URI": mongo_uri,
    "MONGODB_DATABASE": "perbillion",
    "JWT_SECRET": jwt_secret,
    "JWT_EXPIRY": "7d",
    "FRONTEND_URL": args.public_origin,
    "PUBLIC_ORIGIN": args.public_origin,
    "SPRING_ORCHESTRATOR_URL": "http://127.0.0.1:8080",
    "ML_ENGINE_URL": "http://127.0.0.1:5000",
    "PERSIST_UPLOADS_IN_MONGO": "true",
    "FORECAST_DAILY_LIMIT": "5",
    "COMMERCIAL_LAUNCH_ENABLED": "false",
    "MEMBERSHIP_ENFORCEMENT_ENABLED": "false",
    **email_values,
})
write_config("spring.env", {
    "MONGODB_URI": mongo_uri,
    "ML_ENGINE_URL": "http://127.0.0.1:5000",
    "ALPHAVANTAGE_API_KEY": alpha_matches[0],
    "FORECAST_SYNCHRONOUS": "true",
    "FORECAST_WORKERS": "1",
    "FORECAST_QUEUE_SIZE": "8",
    "FORECAST_STALE_AFTER_SECONDS": "180",
    "JAVA_TOOL_OPTIONS": "-Xms128m -Xmx512m -XX:MaxMetaspaceSize=256m",
})
print("Private Cloud Run configuration prepared")
