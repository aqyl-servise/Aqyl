import paramiko, time, re, sys

HOST = "212.116.240.252"
USER = "root"
PASSWORD = "8mtCT6o8S2gJ"

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

def ssh_exec(client, cmd, timeout=60):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=False)
    out = stdout.read().decode("utf-8", errors="replace")
    stdout.channel.recv_exit_status()
    clean = re.sub(r'\x1b\[[0-9;]*[mGKHF]', '', out)
    clean = re.sub(r'\x1b\[\??\d+[lh]', '', clean)
    for l in clean.splitlines():
        if l.strip():
            print(l)
    return clean

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

print("=== PM2 STATUS ===")
ssh_exec(client, "pm2 jlist 2>/dev/null | python3 -c \"import sys,json; procs=json.load(sys.stdin); [print(f'  {p[\\\"name\\\"]}: status={p[\\\"pm2_env\\\"][\\\"status\\\"]}, pid={p[\\\"pid\\\"]}, restarts={p[\\\"pm2_env\\\"][\\\"restart_time\\\"]}') for p in procs]\"")

print("\n=== LAST 20 LOG LINES ===")
ssh_exec(client, "tail -20 /root/.pm2/logs/aqyl-api-out.log 2>/dev/null || echo 'no out log'")
ssh_exec(client, "tail -10 /root/.pm2/logs/aqyl-api-error.log 2>/dev/null || echo 'no error log'")

print("\n=== PORT CHECK ===")
ssh_exec(client, "ss -tlnp | grep 4000 || echo 'port 4000 not listening yet'")

print("\n=== HEALTH CHECK ===")
ssh_exec(client, "curl -sv http://localhost:4000/health 2>&1 | grep -E '< HTTP|{|}'")
ssh_exec(client, "curl -s http://localhost:4000/ 2>&1 || echo 'no response'")

client.close()
print(f"\nBackend URL: http://{HOST}:4000")
