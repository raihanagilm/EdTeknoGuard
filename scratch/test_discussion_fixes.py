import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.core.database import SessionLocal
from app.modules.customers.service import CustomerService
from app.modules.admin_customer_mgmt.service import AdminCustomerMgmtService
from app.db.models import TiketKendala, Pelanggan

def main():
    db = SessionLocal()
    try:
        print("=== 1. Testing CustomerService.get_customers ===")
        total_count, customers = CustomerService.get_customers(db, page=1, limit=10, kantor="cabang")
        print(f"Total customers: {len(customers)}")
        for c in customers:
            print(f"Customer: {c['nama']} ({c['id_pelanggan']})")
            print(f"  Redaman: {c.get('redaman_terakhir')} dBm (current: {c.get('redaman_current')})")
            print(f"  Status: {c.get('status_terakhir')} (status: {c.get('status')})")
            print(f"  Waktu Cek: {c.get('waktu_terakhir')}")
            print(f"  Suhu: {c.get('suhu_ont')} °C, Latency: {c.get('latency_ms')} ms")
            print(f"  GPS: {c.get('lokasi_gps')}")
            print(f"  WiFi SSID: {c.get('nama_wifi')}, Pass: {c.get('password_wifi')}")

        print("\n=== 2. Testing Ticket Statuses (including DICEK_ADMIN) ===")
        first_ticket = db.query(TiketKendala).first()
        if not first_ticket:
            print("Creating dummy ticket for testing...")
            first_cust = db.query(Pelanggan).first()
            if first_cust:
                first_ticket = TiketKendala(
                    id_tiket="TIK-TEST-001",
                    id_pelanggan=first_cust.id_pelanggan,
                    kantor=first_cust.kantor or "cabang",
                    kategori="Koneksi Lambat",
                    deskripsi="Testing 4 statuses",
                    no_wa_pelapor="081234567890",
                    status="MENUNGGU"
                )
                db.add(first_ticket)
                db.commit()
                db.refresh(first_ticket)

        if first_ticket:
            print(f"Testing ticket: {first_ticket.id_tiket}, Current status: {first_ticket.status}")
            update_res = AdminCustomerMgmtService.update_ticket_status(
                db=db,
                ticket_id=first_ticket.id_tiket,
                new_status="DICEK_ADMIN",
                catatan="Tiket sedang diperiksa oleh NOC Admin Cabang"
            )
            print("Update to DICEK_ADMIN result:", update_res)
            db.refresh(first_ticket)
            assert first_ticket.status == "DICEK_ADMIN", f"Expected DICEK_ADMIN, got {first_ticket.status}"
            assert first_ticket.catatan_teknisi == "Tiket sedang diperiksa oleh NOC Admin Cabang"
            print("Verification passed! Successfully set ticket status to DICEK_ADMIN.")

        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
