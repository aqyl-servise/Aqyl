import paramiko
import time
import sys

HOST = "212.116.240.252"
USER = "root"
PASSWORD = "8mtCT6o8S2gJ"

def ssh_exec(client, cmd, timeout=120, print_output=True):
    print(f"\n>>> {cmd[:80]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = ""
    err = ""
    while True:
        line = stdout.readline()
        if not line:
            break
        out += line
        if print_output:
            print(line, end="")
    exit_code = stdout.channel.recv_exit_status()
    err = stderr.read().decode("utf-8", errors="replace")
    if err and print_output:
        print("[STDERR]", err[:500])
    return out, err, exit_code

def main():
    print(f"=== Connecting to {HOST} ===")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected!\n")

    # Step 1: System update
    print("=== Step 1: System update ===")
    ssh_exec(client, "export DEBIAN_FRONTEND=noninteractive && apt-get update -y", 120)

    # Step 2: Install Git, curl, build tools
    print("=== Step 2: Install base tools ===")
    ssh_exec(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y git curl wget build-essential ca-certificates gnupg lsb-release ufw", 180)

    # Step 3: Install Node.js 20
    print("=== Step 3: Install Node.js 20 ===")
    ssh_exec(client, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", 60)
    ssh_exec(client, "export DEBIAN_FRONTEND=noninteractive && apt-get install -y nodejs", 120)
    ssh_exec(client, "node --version && npm --version", 30)

    # Step 4: Install Docker
    print("=== Step 4: Install Docker ===")
    ssh_exec(client, """
export DEBIAN_FRONTEND=noninteractive
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
""", 300)
    ssh_exec(client, "docker --version && docker compose version", 30)
    ssh_exec(client, "systemctl enable docker && systemctl start docker", 30)

    # Step 5: Clone repository
    print("=== Step 5: Clone repository ===")
    ssh_exec(client, "rm -rf /root/Aqyl && git clone https://github.com/aqyl-servise/Aqyl.git /root/Aqyl", 120)
    ssh_exec(client, "ls /root/Aqyl", 10)

    # Step 6: PostgreSQL via Docker
    print("=== Step 6: Start PostgreSQL via Docker ===")
    ssh_exec(client, "docker stop postgres-aqyl 2>/dev/null; docker rm postgres-aqyl 2>/dev/null; echo 'cleaned'", 30)
    ssh_exec(client, """docker run -d \
  --name postgres-aqyl \
  --restart always \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=aqyl2026 \
  -e POSTGRES_DB=aqyl \
  -p 5432:5432 \
  postgres:15""", 60)
    print("Waiting 10s for PostgreSQL to start...")
    time.sleep(10)
    ssh_exec(client, "docker ps | grep postgres", 15)

    # Step 7: Create .env file
    print("=== Step 7: Create .env file ===")
    env_content = """DATABASE_URL=postgresql://postgres:aqyl2026@localhost:5432/aqyl
JWT_SECRET=aqyl_secret_key_2026
NODE_ENV=production
PORT=4000
FRONTEND_URL=*"""
    ssh_exec(client, f"cat > /root/Aqyl/apps/api/.env << 'EOF'\n{env_content}\nEOF", 15)
    ssh_exec(client, "cat /root/Aqyl/apps/api/.env", 10)

    # Step 8: npm install
    print("=== Step 8: npm install ===")
    # Check package.json structure first
    ssh_exec(client, "ls /root/Aqyl/apps/api/", 10)
    ssh_exec(client, "cat /root/Aqyl/apps/api/package.json | head -30", 10)
    ssh_exec(client, "cd /root/Aqyl && npm install 2>&1 | tail -20", 300)

    # Step 9: npm run build
    print("=== Step 9: npm run build ===")
    ssh_exec(client, "cd /root/Aqyl/apps/api && npm run build 2>&1 | tail -30", 300)
    ssh_exec(client, "ls /root/Aqyl/apps/api/dist/ 2>/dev/null || echo 'dist not found'", 10)

    # Step 10: Install PM2
    print("=== Step 10: Install PM2 ===")
    ssh_exec(client, "npm install -g pm2", 60)
    ssh_exec(client, "pm2 --version", 10)

    # Step 11: Start with PM2
    print("=== Step 11: Start API with PM2 ===")
    ssh_exec(client, "pm2 delete aqyl-api 2>/dev/null; echo 'ok'", 10)
    ssh_exec(client, "cd /root/Aqyl/apps/api && pm2 start dist/main.js --name aqyl-api", 30)
    ssh_exec(client, "pm2 status", 10)
    ssh_exec(client, "pm2 logs aqyl-api --lines 20 --nostream", 15)

    # Step 12: PM2 autostart
    print("=== Step 12: PM2 autostart ===")
    ssh_exec(client, "pm2 startup systemd -u root --hp /root 2>&1 | tail -5", 15)
    ssh_exec(client, "pm2 save", 15)

    # Step 13: Firewall
    print("=== Step 13: Configure firewall ===")
    ssh_exec(client, "ufw allow 22/tcp && ufw allow 4000/tcp && ufw --force enable", 30)
    ssh_exec(client, "ufw status", 10)

    # Step 14: Health check
    print("=== Step 14: Health check ===")
    time.sleep(5)
    ssh_exec(client, "curl -s http://localhost:4000/health || curl -s http://localhost:4000/ || echo 'No response yet'", 15)
    ssh_exec(client, "pm2 status", 10)

    client.close()
    print("\n=== DEPLOYMENT COMPLETE ===")
    print(f"Backend URL: http://{HOST}:4000")

if __name__ == "__main__":
    main()
