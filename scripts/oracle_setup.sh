#!/usr/bin/env bash
# PerBillion — Oracle Cloud (Oracle Linux / Ubuntu) server bootstrap
# Run as: ssh opc@<server-ip> 'bash -s' < scripts/oracle_setup.sh
# Or:     ssh into the server, clone the repo, then run this script.
set -euo pipefail

echo "═══════════════════════════════════════════════════"
echo "  PerBillion — Server Setup for Oracle Cloud"
echo "═══════════════════════════════════════════════════"

# ── Detect OS ────────────────────────────────────────
if [ -f /etc/oracle-release ] || grep -qi oracle /etc/os-release 2>/dev/null; then
  PKG=dnf
elif command -v apt-get >/dev/null 2>&1; then
  PKG=apt
else
  echo "Unsupported OS. Install Docker manually, then run scripts/deploy_production.sh"
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

# ── 1. OS-level firewall (iptables on Oracle Linux) ──
echo ""
echo "▸ Opening firewall ports 80/443..."
if command -v firewall-cmd >/dev/null 2>&1; then
  ${SUDO} firewall-cmd --permanent --add-service=http  2>/dev/null || true
  ${SUDO} firewall-cmd --permanent --add-service=https 2>/dev/null || true
  ${SUDO} firewall-cmd --reload 2>/dev/null || true
  echo "  firewalld: done"
elif command -v iptables >/dev/null 2>&1; then
  # Oracle Linux minimal images use iptables directly
  ${SUDO} iptables -I INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null || true
  ${SUDO} iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
  if command -v netfilter-persistent >/dev/null 2>&1; then
    ${SUDO} netfilter-persistent save 2>/dev/null || true
  elif [ -f /etc/sysconfig/iptables ]; then
    ${SUDO} iptables-save | ${SUDO} tee /etc/sysconfig/iptables >/dev/null
  fi
  echo "  iptables: done"
else
  echo "  ⚠ No firewall tool found — make sure OCI Security List allows 80/443"
fi

# ── 2. Install Docker ───────────────────────────────
echo ""
echo "▸ Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  if [ "${PKG}" = "dnf" ]; then
    ${SUDO} dnf install -y dnf-utils
    ${SUDO} dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    ${SUDO} dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    ${SUDO} apt-get update
    ${SUDO} apt-get install -y ca-certificates curl gnupg
    ${SUDO} install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | ${SUDO} gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    ${SUDO} chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      ${SUDO} tee /etc/apt/sources.list.d/docker.list >/dev/null
    ${SUDO} apt-get update
    ${SUDO} apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
  echo "  Docker installed."
else
  echo "  Docker already installed."
fi

${SUDO} systemctl enable --now docker
${SUDO} usermod -aG docker "$(whoami)" 2>/dev/null || true
echo "  Docker daemon running."

# ── 3. Install git if missing ───────────────────────
if ! command -v git >/dev/null 2>&1; then
  echo ""
  echo "▸ Installing git..."
  if [ "${PKG}" = "dnf" ]; then
    ${SUDO} dnf install -y git
  else
    ${SUDO} apt-get install -y git
  fi
fi

# ── 4. Clone repo if not already present ────────────
REPO_DIR="${HOME}/PerBillion"
if [ ! -d "${REPO_DIR}" ]; then
  echo ""
  echo "▸ Cloning PerBillion repo..."
  git clone https://github.com/iamirrf/PerBillion.git "${REPO_DIR}"
else
  echo ""
  echo "▸ Repo already at ${REPO_DIR}, pulling latest..."
  cd "${REPO_DIR}" && git pull origin main
fi

cd "${REPO_DIR}"

# ── 5. Create swap (if < 2 GB RAM + swap) ───────────
if command -v free >/dev/null 2>&1; then
  mem_mb="$(free -m | awk '/^Mem:/ {print $2}')"
  swap_mb="$(free -m | awk '/^Swap:/ {print $2}')"
  total=$((mem_mb + swap_mb))
  if [ "${total}" -lt 4000 ]; then
    echo ""
    echo "▸ Creating 4 GB swap..."
    if [ ! -f /swapfile ]; then
      ${SUDO} fallocate -l 4G /swapfile 2>/dev/null || ${SUDO} dd if=/dev/zero of=/swapfile bs=1M count=4096
      ${SUDO} chmod 600 /swapfile
      ${SUDO} mkswap /swapfile
    fi
    ${SUDO} swapon /swapfile 2>/dev/null || true
    if ! grep -q '^/swapfile ' /etc/fstab 2>/dev/null; then
      echo '/swapfile none swap sw 0 0' | ${SUDO} tee -a /etc/fstab >/dev/null
    fi
    echo "  Swap active."
  fi
fi

# ── 6. Generate .env.production ─────────────────────
ENV_FILE="${REPO_DIR}/.env.production"
if [ ! -f "${ENV_FILE}" ]; then
  echo ""
  echo "▸ Generating .env.production with secure random secrets..."

  JWT_SECRET="$(openssl rand -base64 32)"
  MONGO_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

  cp .env.production.example "${ENV_FILE}"

  # Replace placeholders with generated secrets
  sed -i "s|change_me_strong_mongo_password|${MONGO_PASS}|g"     "${ENV_FILE}"
  sed -i "s|change_me_256_bit_jwt_secret|${JWT_SECRET}|g"        "${ENV_FILE}"

  echo ""
  echo "  ✅ JWT_SECRET and MONGO_PASSWORD generated."
  echo ""
  echo "  ⚠ You still need to set your Alpha Vantage API key."
  echo "    Get a free key at: https://www.alphavantage.co/support/#api-key"
  echo ""
  read -rp "  Enter your ALPHAVANTAGE_API_KEY (or press Enter to skip for now): " avkey
  if [ -n "${avkey}" ]; then
    sed -i "s|change_me_alpha_vantage_key|${avkey}|g" "${ENV_FILE}"
    echo "  ✅ Alpha Vantage key set."
  else
    echo "  ⚠ Skipped. Edit ${ENV_FILE} later: ALPHAVANTAGE_API_KEY=your_key"
  fi
else
  echo ""
  echo "▸ ${ENV_FILE} already exists, keeping it."
fi

# ── 7. Build and deploy ────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Building and deploying PerBillion..."
echo "═══════════════════════════════════════════════════"
echo ""

# Build sequentially to stay within memory limits
export COMPOSE_PARALLEL_LIMIT=1

${SUDO} docker compose \
  --env-file "${ENV_FILE}" \
  -f docker-compose.prod.yml \
  build --pull

${SUDO} docker compose \
  --env-file "${ENV_FILE}" \
  -f docker-compose.prod.yml \
  up -d

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ PerBillion deployed!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Containers:"
${SUDO} docker compose -f docker-compose.prod.yml ps 2>/dev/null || true
echo ""
echo "  Next steps:"
echo "  1. Point DNS: perbillion.com → $(curl -s ifconfig.me 2>/dev/null || echo '<this-server-ip>')"
echo "  2. Wait for DNS propagation (5–30 min)"
echo "  3. Caddy will auto-obtain HTTPS certificate"
echo "  4. Verify: curl https://perbillion.com/health"
echo ""
echo "  Logs: sudo docker compose -f docker-compose.prod.yml logs -f"
echo ""
