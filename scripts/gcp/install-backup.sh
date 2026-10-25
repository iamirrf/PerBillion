#!/usr/bin/env bash
set -euo pipefail

tools_archive=${1:?Pass the MongoDB Database Tools archive}
config_file=${2:?Pass the private mongodump YAML file}
backup_script=${3:?Pass backup-mongo.sh}

install -d -m 0755 /opt/mongodb-tools
tar -xzf "$tools_archive" -C /opt/mongodb-tools --strip-components=1
ln -sfn /opt/mongodb-tools/bin/mongodump /usr/local/bin/mongodump
ln -sfn /opt/mongodb-tools/bin/mongorestore /usr/local/bin/mongorestore
install -d -m 0700 /etc/perbillion
install -o root -g root -m 0600 "$config_file" /etc/perbillion/mongodump.yaml
install -o root -g root -m 0755 "$backup_script" /usr/local/bin/perbillion-backup

cat >/etc/cron.d/perbillion-backup <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
15 3 * * * root /usr/local/bin/perbillion-backup >>/var/log/perbillion-backup.log 2>&1
EOF
chmod 0644 /etc/cron.d/perbillion-backup

cat >/etc/logrotate.d/perbillion <<'EOF'
/var/log/perbillion-backup.log /var/log/mongodb/mongod.log {
    daily
    rotate 7
    missingok
    notifempty
    compress
    copytruncate
}
EOF

/usr/local/bin/mongodump --version | head -n 1
