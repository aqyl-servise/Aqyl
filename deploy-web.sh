#!/bin/bash
set -e

echo "=== [1/6] Переходим в /root/Aqyl и обновляем код ==="
cd /root/Aqyl
git pull origin main

echo ""
echo "=== [2/6] Создаём .env.local ==="
cat > /root/Aqyl/apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://212.116.240.252:4000
EOF
echo ".env.local создан"

echo ""
echo "=== [3/6] npm install && npm run build ==="
cd /root/Aqyl/apps/web
npm install --legacy-peer-deps
npm run build

echo ""
echo "=== [4/6] Запускаем / перезапускаем через PM2 ==="
if pm2 describe aqyl-web > /dev/null 2>&1; then
  pm2 restart aqyl-web
  echo "PM2: aqyl-web перезапущен"
else
  pm2 start npm --name aqyl-web --max-memory-restart 512M -- start
  echo "PM2: aqyl-web запущен"
fi
pm2 save
echo "PM2 список:"
pm2 list

echo ""
echo "=== [5/6] Настраиваем Nginx ==="
cat > /etc/nginx/sites-available/aqyl << 'EOF'
# gzip compression for text-based responses (JSON, JS, CSS, HTML)
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript
           text/javascript application/xml application/xml+rss image/svg+xml;

# Rate limiting zone: 20 req/s per client IP, burst-tolerant. Applied to the API.
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

server {
    listen 80;
    server_name _;
    client_max_body_size 25m;

    # Cache Next.js build assets aggressively (immutable, content-hashed).
    location /_next/static/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        add_header         Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js frontend
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # User files & generated materials are now stored in S3-compatible object storage
    # and served through the API (/api/files/..., /api/materials/...). Nginx no longer
    # serves /uploads/ from local disk. The local ./uploads dir is kept only for legacy
    # files until the S3 migration script (apps/api/scripts/migrate-to-s3.ts) has run.
    # TODO: REMOVE_NGINX_UPLOADS — after migrate-to-s3 succeeds, the local ./uploads dir
    # can be deleted; no nginx /uploads/ alias block exists to remove.

    # Web app's OWN Next route handlers for the session cookie. These live in the
    # Next app (port 3000), NOT the backend. Exact-match `location =` beats the
    # `/api/` prefix below, so they must NOT be rewritten to the backend — otherwise
    # the cookie is never set and every login bounces back to /login.
    location = /api/auth/set-cookie {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
    location = /api/auth/clear-cookie {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # NestJS API
    location /api/ {
        limit_req          zone=api_limit burst=40 nodelay;
        rewrite            ^/api/(.*)$ /$1 break;
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/aqyl /etc/nginx/sites-enabled/aqyl
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
echo "Nginx перезагружен"

echo ""
echo "=== [6/6] Открываем порт 80 ==="
ufw allow 80/tcp
ufw allow 3000/tcp
ufw status

echo ""
echo "================================================="
echo "Проверка:"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 http://212.116.240.252 || echo "ERR")
echo "http://212.116.240.252 → HTTP $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "Фронтенд доступен!"
else
  echo "Статус не 200. Проверь логи:"
  echo "  pm2 logs aqyl-web --lines 20"
  echo "  systemctl status nginx"
fi
echo "================================================="
