#!/usr/bin/env bash
# Run as root on the Ubuntu 24.04 DigitalOcean VPS after uploading the code.
set -Eeuo pipefail
DOMAIN=greek-verbs.161.35.40.15.sslip.io
APP_DIR=/var/www/greek-verbs
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx python3-venv
id greek-verbs >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin greek-verbs
python3 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"
install -d -o greek-verbs -g greek-verbs -m 700 /var/lib/greek-verbs
cat > /etc/systemd/system/greek-verbs.service <<UNIT
[Unit]
Description=Greek Verbs application
After=network.target

[Service]
User=greek-verbs
Group=greek-verbs
WorkingDirectory=$APP_DIR
Environment=APP_ORIGIN=https://$DOMAIN
Environment=AUTH_DB_PATH=/var/lib/greek-verbs/auth.sqlite3
Environment=PYTHONDONTWRITEBYTECODE=1
ExecStart=$APP_DIR/.venv/bin/python $APP_DIR/server.py
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/greek-verbs

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/nginx/sites-available/greek-verbs <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 8k;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host 127.0.0.1:8000;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/greek-verbs /etc/nginx/sites-enabled/greek-verbs
nginx -t
systemctl daemon-reload
systemctl enable --now greek-verbs nginx
systemctl restart greek-verbs
systemctl reload nginx
if ufw status | head -1 | grep -q 'Status: active'; then ufw allow 'Nginx Full'; fi
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN"
systemctl enable --now certbot.timer
curl --fail --silent --show-error "https://$DOMAIN/api/auth"
