import pytest
from datetime import datetime
from app.core.database import SessionLocal
from app.db.models import (
    Pelanggan, LogPerformaONT, AlertLog,
    TiketKendala, KuotaPelanggan
)
from app.modules.customers.service import CustomerService

def test_pelanggan_cascade_relationships_and_delete():
    db = SessionLocal()
    test_id = "TEST_CASCADE_999"

    try:
        # 1. Bersihkan jika sudah ada sebelumnya
        existing = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == test_id).first()
        if existing:
            CustomerService.delete_customer(db, test_id)

        # 2. Buat data utama pelanggan (termasuk kredensial portal)
        cust = Pelanggan(
            id_pelanggan=test_id,
            nama="Bapak Cascade Testing",
            alamat="Dusun Testing RT 01 RW 02",
            no_hp="081234567890",
            pop="Server Cabang",
            kantor="cabang",
            ip_router="10.10.99.254",
            paket="20 Mbps",
            jenis_modem="GM220-S",
            redaman_baseline=-21.5,
            password_hash="fakehash123",
            lokasi_gps="-7.123,109.123",
            status_verifikasi="TERVERIFIKASI",
            is_monitored=True,
            is_active=True
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)

        # 3. Buat 4 anakan data
        log_ont = LogPerformaONT(
            id_pelanggan=test_id,
            rx_power=-22.4,
            suhu_ont=45.2,
            uptime=3600,
            status_koneksi="NORMAL",
            latency_ms=12,
            keterangan="Test Cascade Log"
        )
        alert = AlertLog(
            id_pelanggan=test_id,
            tipe_alert="REDAMAN_DROP",
            rx_power=-27.5,
            pesan="Test alert cascade",
            target_recipients="123456",
            status_kirim="SUCCESS"
        )
        tiket = TiketKendala(
            id_tiket="TIKET-CASCADE-01",
            id_pelanggan=test_id,
            kantor="cabang",
            kategori="Internet Lambat",
            deskripsi="Sinyal drop mendadak",
            no_wa_pelapor="081234567890",
            status="MENUNGGU"
        )
        kuota = KuotaPelanggan(
            id_pelanggan=test_id,
            periode_bulan="2026-09",
            kuota_terpakai_gb=45.5,
            kecepatan_paket="20 Mbps"
        )

        db.add_all([log_ont, alert, tiket, kuota])
        db.commit()

        # 4. Verifikasi bahwa relasi ORM berjenjang berfungsi dengan baik
        cust_refetched = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == test_id).first()
        assert cust_refetched is not None
        assert len(cust_refetched.logs) == 1
        assert len(cust_refetched.alerts) == 1
        assert len(cust_refetched.tiket_list) == 1
        assert len(cust_refetched.kuota_list) == 1
        assert cust_refetched.password_hash == "fakehash123"

        # 5. Hapus data utama menggunakan CustomerService.delete_customer
        deleted = CustomerService.delete_customer(db, test_id)
        assert deleted is True

        # 6. Verifikasi data utama telah terhapus
        assert db.query(Pelanggan).filter(Pelanggan.id_pelanggan == test_id).first() is None

        # 7. Verifikasi SELURUH 4 data anakannya ikut terhapus secara fisik (CASCADE)
        assert db.query(LogPerformaONT).filter(LogPerformaONT.id_pelanggan == test_id).count() == 0
        assert db.query(AlertLog).filter(AlertLog.id_pelanggan == test_id).count() == 0
        assert db.query(TiketKendala).filter(TiketKendala.id_pelanggan == test_id).count() == 0
        assert db.query(KuotaPelanggan).filter(KuotaPelanggan.id_pelanggan == test_id).count() == 0

    finally:
        db.close()


def test_bulk_delete_cascade():
    db = SessionLocal()
    test_ids = ["BULK_CASCADE_A", "BULK_CASCADE_B"]

    try:
        # Bersihkan dulu
        for tid in test_ids:
            existing = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == tid).first()
            if existing:
                CustomerService.delete_customer(db, tid)

        # Buat 2 pelanggan dengan anakannya
        for tid in test_ids:
            c = Pelanggan(
                id_pelanggan=tid,
                nama=f"Bulk {tid}",
                pop="Server Cabang",
                kantor="cabang",
                ip_router="10.10.99.11",
                is_monitored=True,
                is_active=True
            )
            db.add(c)
            db.commit()

            db.add(LogPerformaONT(id_pelanggan=tid, rx_power=-20.0, status_koneksi="NORMAL"))
            db.add(AlertLog(id_pelanggan=tid, tipe_alert="REDAMAN_DROP", pesan="Alert", target_recipients="123"))
            db.commit()

        # Eksekusi bulk delete
        affected = CustomerService.bulk_delete_customers(db, test_ids)
        assert affected == 2

        # Verifikasi seluruh pelanggan dan anakan terhapus
        for tid in test_ids:
            assert db.query(Pelanggan).filter(Pelanggan.id_pelanggan == tid).first() is None
            assert db.query(LogPerformaONT).filter(LogPerformaONT.id_pelanggan == tid).count() == 0
            assert db.query(AlertLog).filter(AlertLog.id_pelanggan == tid).count() == 0

    finally:
        db.close()

