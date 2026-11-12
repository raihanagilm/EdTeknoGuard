import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('163.223.112.238', port=22, username='tekno', password='tekno2024')

cmd = "sudo -S journalctl -u edteknoguard.service -n 100 --no-pager"
stdin, stdout, stderr = client.exec_command(cmd)
stdin.write('tekno2024\n')
stdin.flush()
logs = stdout.read().decode('utf-8', errors='ignore')
print("=== LOGS RECENT ===")
lines = [l for l in logs.split('\n') if any(w in l.lower() for w in ['emergency', 'reminder', 'fcm', 'apscheduler', 'error', 'warning'])]
for l in lines[-30:]:
    print(l)
client.close()
