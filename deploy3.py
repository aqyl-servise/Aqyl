import paramiko
import time
import sys

HOST = "212.116.240.252"
USER = "root"
PASSWORD = "8mtCT6o8S2gJ"

def ssh_exec(client, cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    out = stdout.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    lines = [l for l in out.splitlines() if l.strip()]
    for l in lines[-15:]:
        # strip ANSI codes for clean output
        import re
        clean = re.sub(r'\x1b\[[0-9;]*m', '', l)
        if clean.strip():
            print(clean)
    return out, exit_code

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print(f"Connected to {HOST}\n")

print("[10] PM2 autostart...")
ssh_exec(client, "pm2 startup systemd -u root --hp /root 2>&1 | tail -3")
ssh_exec(client, "pm2 save && echo 'saved'")

print("\n[11] Firewall...")
ssh_exec(client, "ufw allow 22 && ufw allow 4000 && ufw --force enable && ufw status numbered")

print("\n[12] PM2 status & logs...")
ssh_exec(client, "pm2 status --no-color")
ssh_exec(client, "pm2 logs aqyl-api --lines 20 --nostream --no-color 2>&1")

print("\n[13] Health check...")
time.sleep(3)
ssh_exec(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health || echo 'no /health'")
ssh_exec(client, "curl -s http://localhost:4000/ || echo 'no root'")
ssh_exec(client, "curl -s http://localhost:4000/api/ || echo 'no /api/'")
ssh_exec(client, "ss -tlnp | grep 4000 || echo 'port 4000 not listening'")

client.close()
print(f"\n=== DEPLOYMENT COMPLETE ===")
print(f"Backend API URL: http://{HOST}:4000")
