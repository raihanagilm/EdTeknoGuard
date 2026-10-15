import os
import sys
import random
from datetime import datetime, timedelta
from app.core.timezone import get_now_wib
from app.core.database import engine, Base, SessionLocal
from app.db.models import (
    Pelanggan, LogPerformaONT, AlertLog, SystemSetting,
    User, UserActivityLog, TiketKendala, KuotaPelanggan
)
from app.services.importer_service import ImporterService
from app.core.config import settings

if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def init_db():
    print("[1/4] Membuat tabel di Database MySQL Lokal...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tabel berhasil dibuat di Database MySQL Lokal.")

    db = SessionLocal()
    try:
        print("[2/4] Mengatur konfigurasi default system_settings...")
        default_settings = {
            "scheduler_status": "RUNNING",
            "polling_interval_minutes": str(settings.POLLING_INTERVAL_MINUTES),
            "warning_threshold_dbm": str(settings.WARNING_THRESHOLD_DBM),
            "critical_threshold_dbm": str(settings.CRITICAL_THRESHOLD_DBM),
            "last_scan_time": get_now_wib().strftime("%Y-%m-%d %H:%M:%S")
        }
        for k, v in default_settings.items():
            item = db.query(SystemSetting).filter(SystemSetting.key_name == k).first()
            if not item:
                db.add(SystemSetting(key_name=k, value_text=v))
        db.commit()
        print("[OK] System settings terkonfigurasi.")

        # Inisialisasi Master Kantor
        from app.db.models import Kantor
        if db.query(Kantor).count() == 0:
            db.add_all([
                Kantor(kode="pusat", nama="Pusat", alamat="Kantor Pusat ISP TeknoIndonet"),
                Kantor(kode="cabang", nama="Cabang", alamat="Kantor Cabang Operasional Utama"),
                Kantor(kode="banyumas", nama="Banyumas", alamat="Kantor Wilayah Operasional Banyumas"),
            ])
            db.commit()
            print("[OK] Master data kantor diinisialisasi.")

        # Inisialisasi User Super Admin Default
        from app.core.security import get_password_hash
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            db.add(User(
                username="admin",
                hashed_password=get_password_hash("agiltampan"),
                nama_karyawan="Super Administrator NOC",
                no_wa="081234567890",
                role="super admin",
                allowed_kantor='["cabang","pusat","banyumas"]',
                is_active=True
            ))
            db.commit()
            print("[OK] Akun Super Admin default berhasil dibuat.")

        print("[3/4] Memeriksa data master pelanggan...")
        customer_count = db.query(Pelanggan).count()
        print(f"[INFO] Database memiliki {customer_count} pelanggan terdaftar (Data tersinkronisasi otomatis via MikroTik DHCP Leases).")

        print("[4/4] Memeriksa data historis log performa...")
        log_count = db.query(LogPerformaONT).count()
        if log_count == 0:
            print("[SEED] Menghasilkan log historis awal untuk grafik (7 hari terakhir)...")
            customers = db.query(Pelanggan).limit(30).all()
            now = get_now_wib()
            logs_to_add = []

            for cust in customers:
                base_rx = float(cust.redaman_baseline) if cust.redaman_baseline else -21.5
                for day_offset in range(7, -1, -1):
                    for hour in [0, 4, 8, 12, 16, 20]:
                        ts = now - timedelta(days=day_offset, hours=(24 - hour))
                        if ts > now:
                            continue
                        
                        noise = random.uniform(-0.8, 0.8)
                        rx = round(base_rx + noise, 2)
                        
                        if rx <= settings.CRITICAL_THRESHOLD_DBM:
                            status = "CRITICAL"
                        elif rx <= settings.WARNING_THRESHOLD_DBM:
                            status = "WARNING"
                        else:
                            status = "NORMAL"

                        logs_to_add.append(LogPerformaONT(
                            id_pelanggan=cust.id_pelanggan,
                            waktu_cek=ts,
                            rx_power=rx,
                            suhu_ont=round(random.uniform(41.0, 48.5), 1),
                            uptime=random.randint(3600, 864000),
                            status_koneksi=status,
                            latency_ms=random.randint(3, 18),
                            keterangan="Initial Seed Log"
                        ))

            if logs_to_add:
                db.bulk_save_objects(logs_to_add)
                db.commit()
                print(f"[OK] Berhasil menyimpan {len(logs_to_add)} log historis performa awal.")
        else:
            print(f"[INFO] Database sudah memiliki {log_count} log performa.")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
