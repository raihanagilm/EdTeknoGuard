import io
import re
import sys
from pathlib import Path

# Set root
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.modules.customers.service import CustomerService
from app.modules.customers.schemas import CustomerUpdate
from app.modules.activity_logs.service import ActivityLogService
from app.core.security import create_session_token, SESSION_COOKIE_NAME
from app.db.models import Pelanggan, UserActivityLog

client = TestClient(app)
db = SessionLocal()

print("==================================================")
print("MEMULAI PENGUJIAN OTOMATIS FITUR EDTEKNOGUARD")
print("==================================================")

# --- TES 1: Helper CSV Multi-Delimiter & Multi-Encoding ---
print("\n[TES 1] Menguji CustomerService.read_csv_safely...")

# 1a. CSV dengan titik koma & BOM utf-8-sig
csv_semicolon = "\ufeffNama;IP Router;Paket\nBudi;10.10.1.1;10 Mbps\nSiti;10.10.1.2;20 Mbps".encode('utf-8-sig')
df1 = CustomerService.read_csv_safely(csv_semicolon)
assert "Nama" in df1.columns, f"Header BOM tidak bersih: {df1.columns}"
assert "IP Router" in df1.columns
assert len(df1) == 2, f"Total baris salah: {len(df1)}"
print("  ✓ CSV Delimiter ';' dengan BOM utf-8-sig sukses terbaca")

# 1b. CSV dengan koma & encoding cp1252
csv_comma = "Nama,IP Router,Paket\nAgil,10.10.2.1,50 Mbps\nRian,10.10.2.2,100 Mbps".encode('cp1252')
df2 = CustomerService.read_csv_safely(csv_comma)
assert "IP Router" in df2.columns
assert len(df2) == 2
print("  ✓ CSV Delimiter ',' dengan encoding cp1252 sukses terbaca")

# --- TES 2: Format Auto-Generate ID P(idrouter)00001 ---
print("\n[TES 2] Menguji CustomerService.generate_customer_id_from_ip...")

id1 = CustomerService.generate_customer_id_from_ip("10.10.7.62", sequence=1)
assert id1 == "P101076200001", f"Format ID salah: {id1}"
print(f"  ✓ IP '10.10.7.62' seq 1 -> '{id1}'")

id2 = CustomerService.generate_customer_id_from_ip("10.10.7.62", sequence=2)
assert id2 == "P101076200002", f"Format ID salah: {id2}"
print(f"  ✓ IP '10.10.7.62' seq 2 -> '{id2}'")

id_empty = CustomerService.generate_customer_id_from_ip("", sequence=1)
assert id_empty == "PLG00001", f"Format ID fallback salah: {id_empty}"
print(f"  ✓ IP kosong seq 1 -> '{id_empty}'")

# --- TES 3: Deteksi Duplikat IP Router & ID Pelanggan di Preview ---
print("\n[TES 3] Menguji CustomerService.preview_import_file dengan duplikat IP & ID...")

sample_csv = """id,nama,ip
P99900001,Test User A,10.99.99.1
P99900002,Test User B,10.99.99.1
P99900001,Test User C,10.99.99.2
""".encode('utf-8')

mapping = {"id_pelanggan": "id", "nama": "nama", "ip_router": "ip"}
preview_res = CustomerService.preview_import_file(
    file_content=sample_csv,
    filename="test_duplicates.csv",
    sheet_name="CSV Data",
    mapping=mapping,
    db=db
)

# Baris 2 harus duplicate karena IP-nya sama dengan baris 1 (10.99.99.1)
assert preview_res["preview_data"][1]["_status"] == "duplicate", "Baris 2 harusnya terdeteksi duplikat IP"
# Baris 3 harus duplicate karena ID-nya sama dengan baris 1 (P99900001)
assert preview_res["preview_data"][2]["_status"] == "duplicate", "Baris 3 harusnya terdeteksi duplikat ID"
print("  ✓ Preview sukses mendeteksi duplikasi IP Router dan ID Pelanggan")

# --- TES 4: Larangan Eksekusi Jika Masih Ada Duplikat ---
print("\n[TES 4] Menguji larangan eksekusi import saat data masih duplikat...")
try:
    CustomerService.execute_json_import(db=db, data_list=preview_res["preview_data"])
    print("  ✗ ERROR: Seharusnya eksekusi ditolak!")
    sys.exit(1)
except ValueError as e:
    print(f"  ✓ Eksekusi berhasil ditolak oleh sistem: {str(e)[:80]}...")

# --- TES 5: Validasi Keunikan IP Router pada update_customer ---
print("\n[TES 5] Menguji validasi IP unik pada CustomerService.update_customer...")
# Ambil dua pelanggan yang ada
customers = db.query(Pelanggan).filter(Pelanggan.is_active == True).limit(2).all()
if len(customers) >= 2:
    cust1, cust2 = customers[0], customers[1]
    try:
        # Coba update cust2 dengan IP cust1
        CustomerService.update_customer(db=db, id_pelanggan=cust2.id_pelanggan, data=CustomerUpdate(ip_router=cust1.ip_router))
        print("  ✗ ERROR: Seharusnya update IP duplikat ditolak!")
        sys.exit(1)
    except ValueError as e:
        print(f"  ✓ Update ditolak karena IP sudah terdaftar: {str(e)[:70]}...")

# --- TES 6: Pencatatan dan Penarikan User Activity Log ---
print("\n[TES 6] Menguji ActivityLogService dan query logs...")

# Catat log uji coba
log_entry = ActivityLogService.log_activity(
    db=db,
    username="test_technician",
    nama_karyawan="Budi Santoso",
    role="technician",
    action="LOGIN",
    ip_address="192.168.1.100",
    status="SUCCESS",
    keterangan="Uji coba pencatatan log verifikasi"
)
assert log_entry is not None, "Gagal menyimpan log aktivitas"
print(f"  ✓ Berhasil mencatat log ID: {log_entry.id}")

# Ambil distinct users
users = ActivityLogService.get_distinct_users(db)
assert any(u["username"] == "test_technician" for u in users)
print(f"  ✓ Distinct users berhasil diambil: {len(users)} pengguna ditemukan")

# Ambil log dengan filter user
total, logs = ActivityLogService.get_activity_logs(db=db, username="test_technician")
assert total >= 1
assert logs[0]["username"] == "test_technician"
print(f"  ✓ Filter username sukses: {total} entri ditemukan")

# --- TES 7: Pengujian Endpoint HTTP Web & API ---
print("\n[TES 7] Menguji HTTP Endpoints via TestClient...")

# Buat cookie sesi admin
admin_token = create_session_token("admin")
client.cookies.set(SESSION_COOKIE_NAME, admin_token)

# 7a. GET /user-logs (HTML Page)
res_page = client.get("/user-logs")
assert res_page.status_code == 200, f"Status code /user-logs salah: {res_page.status_code}"
assert "Audit Log Aktivitas Karyawan" in res_page.text
print("  ✓ GET /user-logs berhasil merender halaman HTML (HTTP 200)")

# 7b. GET /api/activity-logs (JSON API)
res_api = client.get("/api/activity-logs?limit=25&page=1")
assert res_api.status_code == 200
data_api = res_api.json()
assert "total" in data_api and "data" in data_api
print(f"  ✓ GET /api/activity-logs berhasil merespons JSON ({data_api['total']} total data)")

# 7c. POST /login (Login Gagal -> catat LOGIN_FAILED)
client.cookies.clear()
res_login_failed = client.post("/login", data={"username": "hacker", "password": "wrongpassword"})
assert res_login_failed.status_code == 200
# Cek apakah LOGIN_FAILED tercatat
db.expire_all()
latest_failed = db.query(UserActivityLog).filter(UserActivityLog.username == "hacker").first()
assert latest_failed is not None
assert latest_failed.action == "LOGIN_FAILED"
print(f"  ✓ POST /login gagal berhasil dicatat ke audit log (action={latest_failed.action})")

# 7d. POST /login (Login Sukses -> catat LOGIN)
res_login_success = client.post("/login", data={"username": "admin", "password": "agiltampan"}, follow_redirects=False)
assert res_login_success.status_code == 303
db.expire_all()
latest_success = db.query(UserActivityLog).filter(UserActivityLog.username == "admin", UserActivityLog.action == "LOGIN").order_by(UserActivityLog.created_at.desc()).first()
assert latest_success is not None
print(f"  ✓ POST /login sukses berhasil dicatat ke audit log (action={latest_success.action})")

# 7e. GET /logout -> catat LOGOUT
res_logout = client.get("/logout", follow_redirects=False)
assert res_logout.status_code == 303
db.expire_all()
latest_logout = db.query(UserActivityLog).filter(UserActivityLog.action == "LOGOUT").order_by(UserActivityLog.created_at.desc()).first()
assert latest_logout is not None
print(f"  ✓ GET /logout berhasil dicatat ke audit log (action={latest_logout.action})")

print("\n==================================================")
print("SELURUH 7 PENGUJIAN BERHASIL 100% (ALL TESTS PASSED)!")
print("==================================================")

db.close()
