import paramiko
import time
import sys

HOST = "212.116.240.252"
USER = "root"
PASSWORD = "8mtCT6o8S2gJ"

def ssh_exec(client, cmd, timeout=300):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    # Print last 10 lines only
    lines = [l for l in out.splitlines() if l.strip()]
    for l in lines[-10:]:
        print(l)
    if exit_code != 0:
        print(f"[exit_code={exit_code}]")
    return out, exit_code

def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    return client

step = int(sys.argv[1]) if len(sys.argv) > 1 else 0

client = connect()
print(f"Connected to {HOST}")

if step in (0, 1):
    print("\n[1] Check existing installations...")
    ssh_exec(client, "node --version 2>/dev/null || echo 'node not installed'")
    ssh_exec(client, "docker --version 2>/dev/null || echo 'docker not installed'")
    ssh_exec(client, "git --version 2>/dev/null || echo 'git not installed'")

if step in (0, 2):
    print("\n[2] Install Node.js 20...")
    ssh_exec(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -5", 120)
    ssh_exec(client, "DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>&1 | tail -5", 120)
    ssh_exec(client, "node --version && npm --version")

if step in (0, 3):
    print("\n[3] Install Docker...")
    ssh_exec(client, """
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y 2>&1 | tail -3
""", 60)
    ssh_exec(client, "DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>&1 | tail -5", 300)
    ssh_exec(client, "systemctl enable docker && systemctl start docker && docker --version")

if step in (0, 4):
    print("\n[4] Clone repository...")
    ssh_exec(client, "rm -rf /root/Aqyl && git clone https://github.com/aqyl-servise/Aqyl.git /root/Aqyl 2>&1 | tail -5", 120)
    ssh_exec(client, "ls /root/Aqyl/")
    ssh_exec(client, "ls /root/Aqyl/apps/ 2>/dev/null || echo 'no apps dir'")

if step in (0, 5):
    print("\n[5] Start PostgreSQL via Docker...")
    ssh_exec(client, "docker stop postgres-aqyl 2>/dev/null; docker rm postgres-aqyl 2>/dev/null; echo cleaned")
    ssh_exec(client, """docker run -d \
  --name postgres-aqyl \
  --restart always \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=aqyl2026 \
  -e POSTGRES_DB=aqyl \
  -p 5432:5432 \
  postgres:15""", 120)
    time.sleep(8)
    ssh_exec(client, "docker ps | grep postgres || echo 'postgres not running'")

if step in (0, 6):
    print("\n[6] Create .env file...")
    ssh_exec(client, """cat > /root/Aqyl/apps/api/.env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:aqyl2026@localhost:5432/aqyl
JWT_SECRET=aqyl_secret_key_2026
NODE_ENV=production
PORT=4000
FRONTEND_URL=*
ENVEOF
echo 'env written'""")
    ssh_exec(client, "cat /root/Aqyl/apps/api/.env")

if step in (0, 7):
    print("\n[7] npm install (root level)...")
    ssh_exec(client, "cat /root/Aqyl/package.json 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); print(list(d.get('scripts',{}).keys()))\" 2>/dev/null || cat /root/Aqyl/package.json | head -20")
    ssh_exec(client, "cd /root/Aqyl && npm install 2>&1 | tail -10", 300)

if step in (0, 8):
    print("\n[8] npm run build in apps/api...")
    ssh_exec(client, "cat /root/Aqyl/apps/api/package.json | head -20")
    ssh_exec(client, "cd /root/Aqyl/apps/api && npm install 2>&1 | tail -10", 180)
    ssh_exec(client, "cd /root/Aqyl/apps/api && npm run build 2>&1 | tail -20", 300)
    ssh_exec(client, "ls /root/Aqyl/apps/api/dist/ 2>/dev/null || echo 'dist not found'")

if step in (0, 9):
    print("\n[9] Install PM2 & start API...")
    ssh_exec(client, "npm install -g pm2 2>&1 | tail -5", 60)
    ssh_exec(client, "pm2 delete aqyl-api 2>/dev/null; echo ok")
    ssh_exec(client, "cd /root/Aqyl/apps/api && pm2 start dist/main.js --name aqyl-api 2>&1")
    ssh_exec(client, "pm2 status")

if step in (0, 10):
    print("\n[10] PM2 autostart...")
    ssh_exec(client, "pm2 startup systemd -u root --hp /root 2>&1 | tail -5")
    ssh_exec(client, "pm2 save 2>&1")

if step in (0, 11):
    print("\n[11] Firewall & health check...")
    ssh_exec(client, "ufw allow 22 && ufw allow 4000 && ufw --force enable && ufw status")
    time.sleep(5)
    ssh_exec(client, "pm2 logs aqyl-api --lines 15 --nostream 2>&1")
    ssh_exec(client, "curl -s http://localhost:4000/health 2>&1 || curl -s http://localhost:4000/ 2>&1 || echo 'no response'")
    ssh_exec(client, "pm2 status")

client.close()
print(f"\n=== DONE ===")
print(f"API URL: http://{HOST}:4000")
