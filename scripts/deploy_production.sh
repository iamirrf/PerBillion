#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [ ! -f "${ENV_FILE}" ]; then
  cp .env.production.example "${ENV_FILE}"
  echo "Created ${ENV_FILE}. Edit it with real production values, then rerun this script." >&2
  exit 1
fi

if grep -Eq 'change_me|your_' "${ENV_FILE}"; then
  echo "${ENV_FILE} still contains placeholder values. Replace them before deploying." >&2
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    if command -v dnf >/dev/null 2>&1; then
      ${SUDO} dnf install -y docker git curl
    elif command -v apt-get >/dev/null 2>&1; then
      ${SUDO} apt-get update
      ${SUDO} apt-get install -y docker.io git curl
    else
      echo "Unsupported Linux distro: install Docker manually." >&2
      exit 1
    fi
  fi

  ${SUDO} systemctl enable --now docker

  if ${SUDO} docker compose version >/dev/null 2>&1; then
    return
  fi

  arch="$(uname -m)"
  case "${arch}" in
    x86_64) compose_arch="x86_64" ;;
    aarch64|arm64) compose_arch="aarch64" ;;
    *) echo "Unsupported Docker Compose architecture: ${arch}" >&2; exit 1 ;;
  esac

  ${SUDO} mkdir -p /usr/local/lib/docker/cli-plugins
  ${SUDO} curl -fsSL \
    "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-${compose_arch}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  ${SUDO} chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
}

ensure_firewall() {
  if command -v firewall-cmd >/dev/null 2>&1; then
    ${SUDO} firewall-cmd --permanent --add-service=http || true
    ${SUDO} firewall-cmd --permanent --add-service=https || true
    ${SUDO} firewall-cmd --reload || true
  fi
}

ensure_docker
ensure_firewall

${SUDO} docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --build
${SUDO} docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

echo "Deployment started. After DNS points at this server, verify:"
echo "  curl -f https://$(grep '^DOMAIN=' "${ENV_FILE}" | cut -d= -f2)/health"
