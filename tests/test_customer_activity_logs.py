import pytest
from datetime import timedelta
from app.core.timezone import get_now_wib
from app.core.tenant_database import TenantDatabaseManager
from app.db.models import Pelanggan, LogAktivitasPelanggan
from app.portal.services.customer_activity_service import CustomerActivityService
from app.modules.activity_logs.service import ActivityLogService


def test_record_and_query_customer_activity():
    db = TenantDatabaseManager.get_tenant_session("tengaran")
    try:
        # Buat dummy pelanggan jika belum ada
        cust = db.query(Pelanggan).first()
        if not cust:
            cust = Pelanggan(
                id_pelanggan="PLG-TEST-ACT-01",
                nama="Pelanggan Uji Aktivitas",
                kantor="tengaran",
                is_active=True
            )
            db.add(cust)
            db.commit()
            db.refresh(cust)

        test_id = cust.id_pelanggan

        # 1. Catat log aktivitas ganti wifi
        entry1 = CustomerActivityService.record(
            db=db,
            id_pelanggan=test_id,
            aksi="UBAH_WIFI",
            kategori="WIFI",
            keterangan="Uji ubah nama wifi SSID=TestWiFi",
            ip_address="192.168.1.100"
        )
        assert entry1 is not None
        assert entry1.id_log is not None
        assert entry1.aksi == "UBAH_WIFI"

        # 2. Catat log ganti password
        entry2 = CustomerActivityService.record(
            db=db,
            id_pelanggan=test_id,
            aksi="GANTI_PASSWORD",
            kategori="AUTH",
            keterangan="Uji ganti password portal",
            ip_address="192.168.1.100"
        )
        assert entry2 is not None

        # 3. Kueri via ActivityLogService
        total, data, min_d = ActivityLogService.get_customer_activity_logs(
            kantor="tengaran",
            id_pelanggan=test_id,
            limit=10
        )
        assert total >= 2
        assert len(data) >= 2
        assert any(d["aksi"] == "UBAH_WIFI" for d in data)
        assert any(d["aksi"] == "GANTI_PASSWORD" for d in data)

        # 4. Kueri dengan filter aksi
        tot_wifi, data_wifi, _ = ActivityLogService.get_customer_activity_logs(
            kantor="tengaran",
            id_pelanggan=test_id,
            aksi="UBAH_WIFI"
        )
        assert tot_wifi >= 1
        assert all(d["aksi"] == "UBAH_WIFI" for d in data_wifi)

        # Bersihkan log uji
        db.query(LogAktivitasPelanggan).filter(
            LogAktivitasPelanggan.id_pelanggan == test_id
        ).delete()
        db.commit()
    finally:
        db.close()


def test_customer_activity_retention_cleanup():
    db = TenantDatabaseManager.get_tenant_session("tengaran")
    try:
        cust = db.query(Pelanggan).first()
        if not cust:
            pytest.skip("Tidak ada pelanggan di tengaran untuk tes cleanup")

        test_id = cust.id_pelanggan

        # Masukkan log lama (> 70 hari lalu)
        old_time = get_now_wib() - timedelta(days=75)
        old_log = LogAktivitasPelanggan(
            id_pelanggan=test_id,
            aksi="LOGIN_PORTAL",
            kategori="AUTH",
            status="SUCCESS",
            keterangan="Old session test",
            created_at=old_time
        )
        db.add(old_log)
        db.commit()

        # Jalankan cleanup 60 hari
        deleted = CustomerActivityService.cleanup_old_logs(days=60)
        assert deleted >= 1
    finally:
        db.close()


def test_granular_customer_actions():
    db = TenantDatabaseManager.get_tenant_session("tengaran")
    try:
        cust = db.query(Pelanggan).first()
        if not cust:
            pytest.skip("Tidak ada pelanggan di tengaran untuk tes granular")

        test_id = cust.id_pelanggan

        # Catat aksi spesifik
        e_alamat = CustomerActivityService.record(
            db=db,
            id_pelanggan=test_id,
            aksi="UBAH_ALAMAT",
            kategori="PROFIL",
            keterangan="Pelanggan mengubah alamat: 'Karangduren' -> 'Prokimad, Wedilelo 038 / 010, Karangduren, Tengaran'"
        )
        assert e_alamat.aksi == "UBAH_ALAMAT"

        e_wa = CustomerActivityService.record(
            db=db,
            id_pelanggan=test_id,
            aksi="UBAH_NO_WA",
            kategori="PROFIL",
            keterangan="Pelanggan mengubah nomor WhatsApp: '08123456789' -> '082138107223'"
        )
        assert e_wa.aksi == "UBAH_NO_WA"

        e_ssid = CustomerActivityService.record(
            db=db,
            id_pelanggan=test_id,
            aksi="UBAH_SSID_WIFI",
            kategori="WIFI",
            keterangan="Pelanggan mengubah nama WiFi (SSID): 'Lama' -> 'Baru'"
        )
        assert e_ssid.aksi == "UBAH_SSID_WIFI"

        # Kueri spesifik aksi UBAH_ALAMAT
        tot_alamat, data_alamat, _ = ActivityLogService.get_customer_activity_logs(
            kantor="tengaran",
            id_pelanggan=test_id,
            aksi="UBAH_ALAMAT"
        )
        assert tot_alamat >= 1
        assert any("UBAH_ALAMAT" in d["aksi"] for d in data_alamat)
        assert "Prokimad" in data_alamat[0]["keterangan"]

        # Cleanup
        db.query(LogAktivitasPelanggan).filter(
            LogAktivitasPelanggan.id_pelanggan == test_id
        ).delete()
        db.commit()
    finally:
        db.close()

