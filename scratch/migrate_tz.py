import sys
from datetime import datetime, timedelta
from sqlalchemy import text
from app.core.database import SessionLocal

def main():
    db = SessionLocal()
    try:
        max_log = db.execute(text("SELECT MAX(waktu_cek) FROM log_performa_ont")).scalar()
        max_alert = db.execute(text("SELECT MAX(waktu_kirim) FROM alert_logs")).scalar()
        max_activity = db.execute(text("SELECT MAX(created_at) FROM user_activity_logs")).scalar()
        last_scan = db.execute(text("SELECT value_text FROM system_settings WHERE key_name = 'last_scan_time'")).scalar()
        
        print(f"Sebelum migrasi:")
        print(f"  Max Log Performa : {max_log}")
        print(f"  Max Alert Log    : {max_alert}")
        print(f"  Max Activity Log : {max_activity}")
        print(f"  Last Scan Time   : {last_scan}")

        # Hanya lakukan migrasi jika log terakhir tercatat sebelum jam 12:00 hari ini (masih UTC)
        # Log terakhir kita tadi adalah 2026-09-17 06:47:53 (UTC)
        if max_log and max_log.hour < 11:
            print("\nMelakukan penyesuaian +7 jam ke waktu WIB (TiDB Cloud)...")
            
            r_log = db.execute(text("UPDATE log_performa_ont SET waktu_cek = DATE_ADD(waktu_cek, INTERVAL 7 HOUR)"))
            print(f"  [OK] log_performa_ont: {r_log.rowcount} baris diperbarui (+7 jam)")

            r_alert = db.execute(text("UPDATE alert_logs SET waktu_kirim = DATE_ADD(waktu_kirim, INTERVAL 7 HOUR)"))
            print(f"  [OK] alert_logs: {r_alert.rowcount} baris diperbarui (+7 jam)")

            r_act = db.execute(text("UPDATE user_activity_logs SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR)"))
            print(f"  [OK] user_activity_logs: {r_act.rowcount} baris diperbarui (+7 jam)")

            r_cust = db.execute(text("UPDATE pelanggan SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR), updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR)"))
            print(f"  [OK] pelanggan: {r_cust.rowcount} baris diperbarui (+7 jam)")

            r_sys = db.execute(text("UPDATE system_settings SET updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR)"))
            print(f"  [OK] system_settings: {r_sys.rowcount} baris diperbarui (+7 jam)")

            if last_scan and last_scan != "-":
                try:
                    dt = datetime.strptime(last_scan.strip(), "%Y-%m-%d %H:%M:%S") + timedelta(hours=7)
                    new_scan_str = dt.strftime("%Y-%m-%d %H:%M:%S")
                    db.execute(text(f"UPDATE system_settings SET value_text = '{new_scan_str}' WHERE key_name = 'last_scan_time'"))
                    print(f"  [OK] last_scan_time dimajukan ke {new_scan_str} WIB")
                except Exception as e:
                    print(f"  [WARN] Gagal update last_scan_time: {e}")

            db.commit()
            print("\nMigrasi data historis ke WIB BERHASIL.")
        else:
            print("\nData riwayat sudah berada dalam zona waktu WIB, tidak perlu migrasi ulang.")

        # Tampilkan status setelah migrasi
        new_max_log = db.execute(text("SELECT MAX(waktu_cek) FROM log_performa_ont")).scalar()
        new_max_alert = db.execute(text("SELECT MAX(waktu_kirim) FROM alert_logs")).scalar()
        new_last_scan = db.execute(text("SELECT value_text FROM system_settings WHERE key_name = 'last_scan_time'")).scalar()
        print(f"\nSetelah migrasi:")
        print(f"  Max Log Performa : {new_max_log}")
        print(f"  Max Alert Log    : {new_max_alert}")
        print(f"  Last Scan Time   : {new_last_scan}")

    except Exception as e:
        db.rollback()
        print(f"Error saat migrasi: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
