#!/usr/bin/env bash
set -euo pipefail

# Run on the private Ubuntu 22.04 e2-micro VM after copying mongodb.tgz there.
archive=${1:?Pass the path to the verified MongoDB 7.0 Ubuntu 22.04 tarball}
internal_ip=$(hostname -I | awk '{print $1}')
test -n "$internal_ip"

id mongodb >/dev/null 2>&1 || useradd --system --home /var/lib/mongodb --shell /usr/sbin/nologin mongodb
install -d -o mongodb -g mongodb -m 0750 /var/lib/mongodb /var/log/mongodb
install -d -m 0755 /opt/mongodb
tar -xzf "$archive" -C /opt/mongodb --strip-components=1
ln -sfn /opt/mongodb/bin/mongod /usr/local/bin/mongod

cat >/etc/mongod.conf <<EOF
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1,$internal_ip
security:
  authorization: enabled
setParameter:
  diagnosticDataCollectionEnabled: false
EOF

cat >/etc/systemd/system/mongod.service <<'EOF'
[Unit]
Description=PerBillion MongoDB Community Server
After=network-online.target
Wants=network-online.target

[Service]
User=mongodb
Group=mongodb
ExecStart=/usr/local/bin/mongod --config /etc/mongod.conf
Restart=on-failure
RestartSec=5
LimitNOFILE=64000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mongod
systemctl --no-pager --full status mongod
