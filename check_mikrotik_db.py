import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('163.223.112.238', 22, 'tekno', 'tekno2024')

code = """
from app.core.database import SessionLocal
from app.db.models import Kantor
from app.services.mikrotik_service import MikroTikSyncService

db = SessionLocal()
k = db.query(Kantor).filter(Kantor.kode == 'karanggede').first()
print(f'Testing Karanggede MikroTik: {k.mikrotik_host}:{k.mikrotik_port} user={k.mikrotik_user}')
res = MikroTikSyncService.test_connection(k.mikrotik_host, k.mikrotik_port, k.mikrotik_user, k.mikrotik_pass)
print('Test Connection Result:', res)
db.close()
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_mtk_kg.py', 'w') as f:
    f.write(code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command("cd /home/tekno/edteknoguard && PYTHONPATH=. ./.venv/bin/python3 /tmp/test_mtk_kg.py", timeout=25)
print("STDOUT:")
print(stdout.read().decode())
print("STDERR:")
print(stderr.read().decode())
ssh.close()
