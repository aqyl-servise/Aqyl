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
  pm2 start npm --name aqyl-web -- start
  echo "PM2: aqyl-web запущен"
fi
pm2 save
echo "PM2 список:"
pm2 list

echo ""
echo "=== [5/6] Настраиваем Nginx ==="
cat > /etc/nginx/sites-available/aqyl << 'EOF'
server {
    listen 80;
    server_name _;

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

    # NestJS API
    location /api/ {
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
