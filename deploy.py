#!/usr/bin/env python3
"""
Деплой Aqyl на прод.

Авторизация — по SSH-ключу, БЕЗ пароля в коде. Хост, пользователь и путь к
ключу берутся из окружения (значения по умолчанию — текущий прод):

    AQYL_HOST      прод-хост            (по умолчанию vps.aqyl-service.kz)
    AQYL_USER      SSH-пользователь     (по умолчанию root)
    AQYL_SSH_KEY   путь к приватному    (по умолчанию ~/.ssh/aqyl_deploy)
                   ключу ed25519

Схема БД применяется миграциями автоматически при рестарте (migrationsRun),
поэтому ручной DDL больше не нужен. nginx/ufw скрипт НЕ трогает — это отдельная
разовая настройка, а не часть обновления кода.

    python deploy.py

ВНИМАНИЕ: приватный ключ и любые пароли НЕ должны попадать в репозиторий.
"""
import os
import sys
import time
from pathlib import Path

import paramiko

# Вывод сервера содержит UTF-8 (рамки таблиц Next, кириллица); консоль Windows
# по умолчанию cp1251 и падает на них. Печатаем в UTF-8 с заменой.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ.get("AQYL_HOST", "77.67.8.115")  # vps.aqyl-service.kz — внутреннее имя, публично не резолвится
USER = os.environ.get("AQYL_USER", "root")
KEY = os.path.expanduser(os.environ.get("AQYL_SSH_KEY", "~/.ssh/aqyl_deploy"))
APP_DIR = "/root/Aqyl"


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 900, tail: int = 20, label: str | None = None) -> int:
    print(f"\n$ {label or cmd[:120]}")
    _, stdout, _ = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    for line in [l.rstrip() for l in out.splitlines() if l.strip()][-tail:]:
        print("   ", line)
    print(f"    [exit {code}]")
    return code


def main() -> int:
    if not Path(KEY).exists():
        print(f"Приватный ключ не найден: {KEY}\nЗадайте AQYL_SSH_KEY или положите ключ по этому пути.")
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Подключаюсь к {USER}@{HOST} по ключу {KEY} ...")
    client.connect(HOST, username=USER, key_filename=KEY, timeout=30)
    print("Подключено.")

    # Сервер должен ТОЧНО соответствовать origin/main. reset --hard, а не pull:
    # посерверный npm install переписывает package-lock.json, и pull ловил бы
    # конфликт. .env и node_modules gitignored — reset их не трогает.
    if run(client, f"cd {APP_DIR} && git fetch origin main && git reset --hard origin/main 2>&1",
           timeout=180, label="git fetch + reset --hard origin/main") != 0:
        print("\n!! git fetch/reset не удался — остановка, ничего не перезапускал")
        client.close()
        return 1
    run(client, f"cd {APP_DIR} && git log -1 --oneline", label="текущий коммит")

    for name, path in (("api", "apps/api"), ("web", "apps/web")):
        if run(client, f"cd {APP_DIR}/{path} && npm install --legacy-peer-deps 2>&1 | tail -6",
               timeout=900, label=f"[{name}] npm install") != 0:
            print(f"\n!! npm install ({name}) не удался — остановка до перезапуска")
            client.close()
            return 1
        if run(client, f"cd {APP_DIR}/{path} && npm run build 2>&1 | tail -20",
               timeout=900, label=f"[{name}] npm run build") != 0:
            print(f"\n!! СБОРКА {name.upper()} УПАЛА — процессы НЕ перезапускались, прод на старой версии")
            client.close()
            return 1

    run(client, "pm2 restart aqyl-api && pm2 restart aqyl-web && pm2 save", timeout=120, label="pm2 restart")

    print("\nЖду 8с и проверяю…")
    time.sleep(8)
    run(client, "pm2 list --no-color", label="pm2 status")
    run(client, "curl -s -o /dev/null -w 'API /lesson-plans/tools -> HTTP %{http_code}\\n' "
                "http://localhost:4000/lesson-plans/tools", timeout=30, label="smoke API (401 = жив)")
    run(client, "curl -s -o /dev/null -w 'web -> HTTP %{http_code}\\n' http://localhost:3000",
        timeout=30, label="smoke web")

    client.close()
    print("\n=== деплой завершён ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
