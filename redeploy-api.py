"""
Пересборка и перезапуск NestJS API на VPS.
Запуск: python redeploy-api.py
"""
import paramiko
import time

HOST = "212.116.240.252"
USER = "root"
PASSWORD = "8mtCT6o8S2gJ"
API_DIR = "/root/Aqyl/apps/api"

def run(client, cmd, timeout=180):
    print(f"  $ {cmd[:100]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    lines = [l for l in out.splitlines() if l.strip()]
    for l in lines[-12:]:
        print(f"    {l}")
    if exit_code != 0:
        err = stderr.read().decode("utf-8", errors="replace")
        if err.strip():
            print(f"  [stderr] {err[:300]}")
    return exit_code

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {HOST}...")
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print("Connected.\n")

print("[1] git pull...")
run(client, "cd /root/Aqyl && git pull origin main", 60)

print("\n[2] npm install (api)...")
run(client, f"cd {API_DIR} && npm install --legacy-peer-deps 2>&1 | tail -5", 120)

print("\n[3] Build TypeScript...")
ec = run(client, f"cd {API_DIR} && npm run build 2>&1", 120)
if ec != 0:
    print("  BUILD FAILED — check errors above")
    client.close()
    exit(1)

print("\n[4] PM2 restart aqyl-api...")
run(client, "pm2 restart aqyl-api && pm2 save", 30)

print("\n[5] Wait 4s, check status...")
time.sleep(4)
run(client, "pm2 status --no-color")
run(client, "pm2 logs aqyl-api --lines 20 --nostream --no-color 2>&1")

print("\n[6] Smoke test POST /schools...")
time.sleep(2)
run(client, """curl -s -o /tmp/schools_test.json -w "\\nHTTP %{http_code}" \
  -X POST http://localhost:4000/schools \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer NOTOKEN' \
  -d '{"name":"Test"}' && cat /tmp/schools_test.json""", 15)

print("\n[7] Check GET /schools (no auth → 401 expected)...")
run(client, "curl -s -o /dev/null -w 'GET /schools → HTTP %{http_code}\\n' http://localhost:4000/schools", 10)

client.close()
print("\n=== API redeploy done ===")
print(f"API: http://{HOST}:4000")
