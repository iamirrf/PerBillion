#!/usr/bin/env bash
set -euo pipefail

bucket=perbillion-free-2026-private
archive=$(mktemp /tmp/perbillion-mongo-backup.XXXXXXXX.gz)
trap 'rm -f "$archive"' EXIT

/usr/local/bin/mongodump --quiet --config=/etc/perbillion/mongodump.yaml \
  --db=perbillion --gzip --archive="$archive"
test -s "$archive"

access_token=$(curl -fsS -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token \
  | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
test -n "$access_token"
object="backups/$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
curl -fsS --retry 5 -X POST \
  -H "Authorization: Bearer $access_token" \
  -H 'Content-Type: application/octet-stream' \
  --data-binary "@$archive" \
  "https://storage.googleapis.com/upload/storage/v1/b/$bucket/o?uploadType=media&name=$object" \
  >/dev/null
printf 'Uploaded %s\n' "$object"
