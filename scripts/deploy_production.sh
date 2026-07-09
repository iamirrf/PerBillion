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
      ${SUDO} dnf install -y git curl
      ${SUDO} dnf install -y docker-engine || ${SUDO} dnf install -y docker
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

ensure_swap() {
  if ! command -v free >/dev/null 2>&1; then
    return
  fi

  mem_mb="$(free -m | awk '/^Mem:/ {print $2}')"
  swap_mb="$(free -m | awk '/^Swap:/ {print $2}')"
  if [ "${mem_mb:-0}" -ge 4000 ] || [ "${swap_mb:-0}" -ge 2048 ]; then
    return
  fi

  if [ ! -f /swapfile ]; then
    ${SUDO} fallocate -l 4G /swapfile || ${SUDO} dd if=/dev/zero of=/swapfile bs=1M count=4096
    ${SUDO} chmod 600 /swapfile
    ${SUDO} mkswap /swapfile
  fi
  ${SUDO} swapon /swapfile || true
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | ${SUDO} tee -a /etc/fstab >/dev/null
  fi
}

ensure_firewall() {
  if command -v firewall-cmd >/dev/null 2>&1; then
    ${SUDO} firewall-cmd --permanent --add-service=http || true
    ${SUDO} firewall-cmd --permanent --add-service=https || true
    ${SUDO} firewall-cmd --reload || true
  fi
}

ensure_docker
ensure_swap
ensure_firewall

compose() {
  ${SUDO} env COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}" docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

echo ""
echo "▸ Validating compose config..."
compose config --quiet
echo "  ✅ Config valid."

echo ""
echo "▸ Building images (sequential to save memory)..."
compose build --pull

echo ""
echo "▸ Starting services..."
compose up -d

echo ""
echo "▸ Container status:"
compose ps

echo ""
echo "▸ Waiting 30s for health checks..."
sleep 30
compose ps

DOMAIN="$(grep '^DOMAIN=' "${ENV_FILE}" | cut -d= -f2)"
echo ""
echo "Deployment started. After DNS points at this server, verify:"
echo "  curl -f https://${DOMAIN}/health"
echo ""
echo "Logs: ${SUDO:-sudo} docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} logs -f"

