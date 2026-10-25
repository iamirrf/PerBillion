#!/bin/sh
set -eu

test -n "${PRIVATE_CONFIG_BUCKET:-}"
access_token=$(curl -fsS -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token \
  | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
test -n "$access_token"
config_file=$(mktemp)
trap 'rm -f "$config_file"' EXIT
curl -fsS --retry 5 -H "Authorization: Bearer $access_token" \
  "https://storage.googleapis.com/storage/v1/b/$PRIVATE_CONFIG_BUCKET/o/spring.env?alt=media" \
  > "$config_file"
set -a
. "$config_file"
set +a
rm -f "$config_file"
trap - EXIT
exec java -jar /app/app.jar
