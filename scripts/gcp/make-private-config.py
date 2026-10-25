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
parser.add_argument("--output-dir", required=True, type=Path)
parser.add_argument("--public-origin", default="https://perbillion.invalid")
args = parser.parse_args()

app_password = args.app_password_file.read_text().strip()
jwt_secret = args.jwt_secret_file.read_text().strip()
alpha_lines = args.alpha_env_file.read_text().splitlines()
alpha_matches = [line.split("=", 1)[1].strip().strip("\"'") for line in alpha_lines
                 if line.startswith("ALPHAVANTAGE_API_KEY=")]
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
    "SPRING_ORCHESTRATOR_URL": "http://127.0.0.1:8080",
    "ML_ENGINE_URL": "http://127.0.0.1:5000",
    "PERSIST_UPLOADS_IN_MONGO": "true",
    "FORECAST_DAILY_LIMIT": "5",
})
write_config("spring.env", {
    "MONGODB_URI": mongo_uri,
    "ML_ENGINE_URL": "http://127.0.0.1:5000",
    "ALPHAVANTAGE_API_KEY": alpha_matches[0],
    "FORECAST_SYNCHRONOUS": "true",
    "JAVA_TOOL_OPTIONS": "-Xms128m -Xmx512m -XX:MaxMetaspaceSize=256m",
})
print("Private Cloud Run configuration prepared")
