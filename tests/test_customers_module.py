import unittest
from unittest.mock import MagicMock
import io
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import models
from app.modules.customers.service import CustomerService
from app.modules.customers.importer import CustomerImporter
from app.modules.customers.exporter import CustomerExporter

class TestCustomerModules(unittest.TestCase):
    def test_generate_structured_customer_id_format(self):
        """Memastikan format ID pelanggan terstruktur custYYYYMMDDxxxx"""
        cid = CustomerService.generate_structured_customer_id()
        self.assertTrue(cid.startswith("cust"))
        self.assertEqual(len(cid), 16) # cust (4) + YYYYMMDD (8) + 4 digits (4) = 16

    def test_generate_structured_customer_id_uniqueness(self):
        """Memastikan generator ID menghindari tabrakan dengan existing set"""
        existing = {"cust202610311234"}
        cid = CustomerImporter.generate_structured_customer_id(existing)
        self.assertNotIn(cid, existing)

    def test_generate_templates(self):
        """Memastikan generator template Excel dan CSV menghasilkan berkas valid"""
        excel_bytes = CustomerService.generate_excel_template()
        self.assertIsInstance(excel_bytes, bytes)
        self.assertGreater(len(excel_bytes), 100)

        csv_str = CustomerService.generate_csv_template()
        self.assertIn("Nama", csv_str)
        self.assertIn("IP Router", csv_str)

    def test_invalid_status_filter_and_stats_calculation(self):
        """Memastikan pelanggan berstatus INVALID dihitung akurat pada KPI card dan filter tabel"""
        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            # Customer 1: status_kredensial INVALID
            p1 = models.Pelanggan(id_pelanggan="CUST-1", nama="Pelanggan 1", kantor="cabang", is_active=True, is_monitored=True)
            per1 = models.PerangkatONT(id_perangkat=1, id_pelanggan="CUST-1", status_kredensial="INVALID")
            l1 = models.LogPerformaONT(id_log=1, id_pelanggan="CUST-1", status_koneksi="NORMAL")

            # Customer 2: status_koneksi log INVALID
            p2 = models.Pelanggan(id_pelanggan="CUST-2", nama="Pelanggan 2", kantor="cabang", is_active=True, is_monitored=True)
            per2 = models.PerangkatONT(id_perangkat=2, id_pelanggan="CUST-2", status_kredensial="VALID")
            l2 = models.LogPerformaONT(id_log=2, id_pelanggan="CUST-2", status_koneksi="INVALID")

            # Customer 3: status NORMAL
            p3 = models.Pelanggan(id_pelanggan="CUST-3", nama="Pelanggan 3", kantor="cabang", is_active=True, is_monitored=True)
            per3 = models.PerangkatONT(id_perangkat=3, id_pelanggan="CUST-3", status_kredensial="VALID")
            l3 = models.LogPerformaONT(id_log=3, id_pelanggan="CUST-3", status_koneksi="NORMAL", rx_power=-20.5)

            db.add_all([p1, per1, l1, p2, per2, l2, p3, per3, l3])
            db.commit()

            stats = CustomerService.get_customer_stats(db, kantor="cabang")
            self.assertEqual(stats.get("invalid"), 2)

            total, items = CustomerService.get_customers(db, kantor="cabang", status="INVALID")
            self.assertEqual(total, 2)
            self.assertEqual(len(items), 2)
            matched_ids = {it["id_pelanggan"] for it in items}
            self.assertEqual(matched_ids, {"CUST-1", "CUST-2"})
        finally:
            db.close()

    def test_preview_import_file_conflict_detection(self):
        """Memastikan preview_import_file mendeteksi perbedaan data nama, no_wa, alamat dan menyertakan list conflicts"""
        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        try:
            p = models.Pelanggan(
                id_pelanggan="CUST-101",
                nama="Rudy Prasetyo Soko Jlarem",
                no_hp="628111111111",
                alamat="Wilayah Jlarem",
                kantor="cabang"
            )
            ont = models.PerangkatONT(
                id_perangkat=101,
                id_pelanggan="CUST-101",
                ip_router="10.10.2.96",
                ip_ont="10.10.2.96"
            )
            db.add_all([p, ont])
            db.commit()

            csv_content = (
                "IP,Nama,WhatsApp,Alamat\n"
                "10.10.2.96,Rudy Prasetyo,6287822440908,Soko Desa Jlarem\n"
            ).encode("utf-8")

            mapping = {
                "ip_router": "IP",
                "nama": "Nama",
                "no_wa": "WhatsApp",
                "alamat": "Alamat"
            }

            res = CustomerImporter.preview_import_file(csv_content, "test.csv", "", mapping, db)
            self.assertEqual(res["conflict_count"], 1)
            row = res["preview_data"][0]
            self.assertTrue(row["has_conflicts"])
            self.assertEqual(row["_status"], "conflict")
            self.assertIn("Nama", row["conflicts"])
            self.assertIn("No. WA", row["conflicts"])
            self.assertIn("Alamat", row["conflicts"])
            self.assertIsNotNone(row["old_data"])
            self.assertEqual(row["old_data"]["nama"], "Rudy Prasetyo Soko Jlarem")
        finally:
            db.close()

    def test_customer_billing_and_payment_status(self):
        """Memastikan endpoint get_customer_billing dan update_payment_status bekerja sesuai spesifikasi api-v1.md"""
        from app.modules.customers.controller import CustomerController
        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        try:
            # Buat pelanggan test
            p = models.Pelanggan(
                id_pelanggan="337",
                nama="Ahmad Subagyo",
                kantor="slawi",
                paket="Home 20",
                status_pembayaran="LUNAS"
            )
            pkt = models.Paket(
                nama="Home 20",
                kecepatan_mbps=20,
                harga=150000
            )
            db.add_all([p, pkt])
            db.commit()

            # 1. Test get_customer_billing
            billing_res = CustomerController.get_customer_billing(db, "337")
            self.assertTrue(billing_res["ok"])
            self.assertEqual(billing_res["id_pelanggan"], "337")
            self.assertEqual(billing_res["status_pembayaran_lokal"], "LUNAS")
            self.assertEqual(billing_res["pop"], "slawi")
            self.assertIsNotNone(billing_res["paket_info"])
            self.assertEqual(billing_res["paket_info"]["harga"], 150000.0)

            # 2. Test update_payment_status ke BELUM_BAYAR
            up_res = CustomerController.update_payment_status(db, "337", "BELUM_BAYAR")
            self.assertEqual(up_res["status"], "success")
            self.assertEqual(up_res["status_pembayaran"], "BELUM_BAYAR")

            # Cek tersimpan di DB
            db.refresh(p)
            self.assertEqual(p.status_pembayaran, "BELUM_BAYAR")
        finally:
            db.close()

    def test_change_wifi_roles_and_permissions(self):
        """Memastikan Super Admin, Admin, dan Teknisi dapat mengubah WiFi tanpa harus jaringan yang sama."""
        from app.modules.customers.controller import CustomerController
        from fastapi import HTTPException

        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            p = models.Pelanggan(
                id_pelanggan="CUST-WIFI-01",
                nama="Budi Santoso",
                kantor="cabang",
                is_active=True
            )
            per = models.PerangkatONT(
                id_perangkat=101,
                id_pelanggan="CUST-WIFI-01",
                ip_router="10.10.7.10",
                nama_wifi="SSID_LAMA",
                password_wifi="password_lama123",
                status_kredensial="VALID"
            )
            db.add_all([p, per])
            db.commit()

            # 1. Teknisi di kantor yang diizinkan (cabang) -> SUKSES
            user_teknisi = {"nama": "Teknisi Lapangan", "role": "teknisi", "allowed_kantor": ["cabang"]}
            res_tek = CustomerController.change_wifi(
                db=db,
                id_pelanggan="CUST-WIFI-01",
                nama_wifi="WiFi_Baru_Teknisi",
                password_wifi="rahasia_baru_88",
                dry_run=True,
                user=user_teknisi
            )
            self.assertEqual(res_tek["status"], "success")
            self.assertEqual(res_tek["nama_wifi"], "WiFi_Baru_Teknisi")
            self.assertEqual(res_tek["password_wifi"], "rahasia_baru_88")

            # 2. Teknisi di luar kantor yang diizinkan -> HTTP 403
            user_tek_pusat = {"nama": "Teknisi Pusat", "role": "teknisi", "allowed_kantor": ["pusat"]}
            with self.assertRaises(HTTPException) as ctx_tek:
                CustomerController.change_wifi(
                    db=db,
                    id_pelanggan="CUST-WIFI-01",
                    nama_wifi="WiFi_Hacking",
                    password_wifi="12345678",
                    user=user_tek_pusat
                )
            self.assertEqual(ctx_tek.exception.status_code, 403)

            # 3. Super Admin -> Akses Penuh Lintas Kantor
            user_super = {"nama": "Super Admin", "role": "super admin"}
            res_super = CustomerController.change_wifi(
                db=db,
                id_pelanggan="CUST-WIFI-01",
                nama_wifi="WiFi_Super_Admin",
                password_wifi="super_admin_pass",
                dry_run=True,
                user=user_super
            )
            self.assertEqual(res_super["status"], "success")
            self.assertEqual(res_super["nama_wifi"], "WiFi_Super_Admin")

            # 4. Validasi password kurang dari 8 karakter -> HTTP 400
            with self.assertRaises(HTTPException) as ctx_val:
                CustomerController.change_wifi(
                    db=db,
                    id_pelanggan="CUST-WIFI-01",
                    password_wifi="pendek",
                    user=user_super
                )
            self.assertEqual(ctx_val.exception.status_code, 400)
        finally:
            db.close()

    def test_toggle_monitoring_separation_from_offline_online(self):
        """Memastikan status pemantauan is_monitored terpisah tegas dari status online/offline (status_lease)"""
        from app.modules.customers.controller import CustomerController
        from fastapi import Request
        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            p = models.Pelanggan(
                id_pelanggan="CUST-TOGGLE-01",
                nama="Budi Santoso",
                kantor="cabang",
                is_active=True,
                is_monitored=True,
                status_lease="bound" # ONLINE di router MikroTik
            )
            per = models.PerangkatONT(id_perangkat=10, id_pelanggan="CUST-TOGGLE-01", ip_router="10.10.2.15")
            db.add_all([p, per])
            db.commit()

            # 1. Matikan pemantauan (is_monitored -> False)
            user_admin = {"nama": "Admin NOC", "role": "admin", "allowed_kantor": ["cabang"]}
            mock_req = MagicMock(spec=Request)
            mock_req.client.host = "127.0.0.1"
            mock_req.headers = {}

            res_toggle_off = CustomerController.toggle_customer_monitoring(
                db=db,
                id_pelanggan="CUST-TOGGLE-01",
                user=user_admin,
                request=mock_req
            )
            self.assertEqual(res_toggle_off["status"], "success")
            self.assertFalse(res_toggle_off["is_monitored"])

            # Cek di DB: status_lease harus TETAP "bound" (Online), sedangkan is_monitored = False
            db.refresh(p)
            self.assertEqual(p.status_lease, "bound", "Status lease online tidak boleh berubah saat monitoring dimatikan")
            self.assertFalse(p.is_monitored, "Status is_monitored harus menjadi False")

            # 2. Nyalakan kembali pemantauan (is_monitored -> True)
            res_toggle_on = CustomerController.toggle_customer_monitoring(
                db=db,
                id_pelanggan="CUST-TOGGLE-01",
                user=user_admin,
                request=mock_req
            )
            self.assertEqual(res_toggle_on["status"], "success")
            self.assertTrue(res_toggle_on["is_monitored"])

            db.refresh(p)
            self.assertTrue(p.is_monitored, "Status is_monitored harus kembali menjadi True")
            self.assertEqual(p.status_lease, "bound")
        finally:
            db.close()

    def test_reset_portal_password_and_view_credentials(self):
        """Memastikan Admin berhasil mereset password akun pelanggan ke nomor WA dan melihat kredensial"""
        from fastapi import HTTPException
        from app.modules.customers.controller import CustomerController
        from app.core.security import verify_password

        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            p = models.Pelanggan(
                id_pelanggan="CUST-PW-01",
                nama="Bapak Supiyanto",
                no_hp="085863763153",
                kantor="cabang",
                is_active=True,
                is_monitored=True
            )
            per = models.PerangkatONT(id_perangkat=1, id_pelanggan="CUST-PW-01", ip_router="192.168.1.100")
            db.add_all([p, per])
            db.commit()

            admin_user = {"username": "admin", "role": "super admin", "allowed_kantor": ["cabang"]}
            teknisi_user = {"username": "budi", "role": "teknisi", "allowed_kantor": ["cabang"]}

            # 1. Pastikan teknisi ditolak 403 saat mencoba reset sandi
            with self.assertRaises(HTTPException) as cm:
                CustomerController.reset_portal_password(db=db, id_pelanggan="CUST-PW-01", user=teknisi_user)
            self.assertEqual(cm.exception.status_code, 403)

            # 2. Admin mereset password pelanggan
            res = CustomerController.reset_portal_password(db=db, id_pelanggan="CUST-PW-01", user=admin_user)
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["password_portal"], "085863763153")
            self.assertTrue(res["is_default_password"])

            # 3. Verifikasi hash di database cocok dengan nomor WA
            db.refresh(p)
            self.assertEqual(p.password_portal, "085863763153")
            self.assertTrue(verify_password("085863763153", p.password_hash))

            # 4. Detail pelanggan menampilkan password_portal untuk Admin, namun disembunyikan untuk Teknisi
            detail = CustomerController.get_customer_detail(db=db, id_pelanggan="CUST-PW-01", user=admin_user)
            self.assertEqual(detail["customer"]["password_portal"], "085863763153")
            self.assertTrue(detail["customer"]["is_default_password"])
            detail_tek = CustomerController.get_customer_detail(db=db, id_pelanggan="CUST-PW-01", user=teknisi_user)
            self.assertIsNone(detail_tek["customer"]["password_portal"])
        finally:
            db.close()

    def test_change_portal_password_custom(self):
        """Memastikan Admin berhasil mengatur kata sandi kustom dan role teknisi ditolak"""
        from fastapi import HTTPException
        from app.modules.customers.controller import CustomerController
        from app.core.security import verify_password

        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            p = models.Pelanggan(
                id_pelanggan="CUST-PW-02",
                nama="Ibu Siti",
                no_hp="081234567890",
                kantor="cabang",
                is_active=True,
                is_monitored=True
            )
            per = models.PerangkatONT(id_perangkat=2, id_pelanggan="CUST-PW-02", ip_router="192.168.1.101")
            db.add_all([p, per])
            db.commit()

            admin_user = {"username": "admin", "role": "admin", "allowed_kantor": ["cabang"]}
            teknisi_user = {"username": "teko", "role": "teknisi", "allowed_kantor": ["cabang"]}

            # 1. Teknisi ditolak HTTP 403 Forbidden
            with self.assertRaises(HTTPException) as cm_tek:
                CustomerController.change_portal_password(
                    db=db,
                    id_pelanggan="CUST-PW-02",
                    password_baru="sandiOrangTua123",
                    user=teknisi_user
                )
            self.assertEqual(cm_tek.exception.status_code, 403)

            # 2. Password kurang dari 6 karakter ditolak HTTP 400 Bad Request
            with self.assertRaises(HTTPException) as cm_short:
                CustomerController.change_portal_password(
                    db=db,
                    id_pelanggan="CUST-PW-02",
                    password_baru="12345",
                    user=admin_user
                )
            self.assertEqual(cm_short.exception.status_code, 400)

            # 3. Admin berhasil mengubah kata sandi kustom
            res = CustomerController.change_portal_password(
                db=db,
                id_pelanggan="CUST-PW-02",
                password_baru="mudah123",
                user=admin_user
            )
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["password_portal"], "mudah123")
            self.assertFalse(res["is_default_password"])

            # 4. Verifikasi di DB
            db.refresh(p)
            self.assertEqual(p.password_portal, "mudah123")
            self.assertTrue(verify_password("mudah123", p.password_hash))

            # 5. Detail pelanggan menampilkan kata sandi baru untuk Admin dan disembunyikan untuk Teknisi
            detail = CustomerController.get_customer_detail(db=db, id_pelanggan="CUST-PW-02", user=admin_user)
            self.assertEqual(detail["customer"]["password_portal"], "mudah123")
            self.assertFalse(detail["customer"]["is_default_password"])
            detail_tek = CustomerController.get_customer_detail(db=db, id_pelanggan="CUST-PW-02", user=teknisi_user)
            self.assertIsNone(detail_tek["customer"]["password_portal"])
        finally:
            db.close()

    def test_billing_mode_filter_and_import_persistence(self):
        """Memastikan filter billing_mode (prabayar/pascabayar/unset) dan pembaruan dari import Network Bill akurat."""
        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()

        try:
            p1 = models.Pelanggan(
                id_pelanggan="PLG-0001", nama="Warga Prabayar", kantor="tengaran",
                billing_mode=None, is_active=True
            )
            ont1 = models.PerangkatONT(id_perangkat=1, id_pelanggan="PLG-0001", ip_router="10.10.2.10")
            p2 = models.Pelanggan(
                id_pelanggan="PLG-0002", nama="Warga Pascabayar", kantor="tengaran",
                billing_mode="pascabayar", is_active=True
            )
            ont2 = models.PerangkatONT(id_perangkat=2, id_pelanggan="PLG-0002", ip_router="10.10.2.11")
            p3 = models.Pelanggan(
                id_pelanggan="PLG-0003", nama="Warga Lokal", kantor="tengaran",
                billing_mode=None, is_active=True
            )
            ont3 = models.PerangkatONT(id_perangkat=3, id_pelanggan="PLG-0003", ip_router="10.10.2.12")
            db.add_all([p1, ont1, p2, ont2, p3, ont3])
            db.commit()

            # Jalankan enrichment update dari Network Bill untuk menyetel billing_mode prabayar ke p1
            imp_res = CustomerImporter.execute_json_import(
                db,
                [
                    {
                        "_status": "match",
                        "_action": "update",
                        "selected_version": "new",
                        "data": {
                            "id_pelanggan": "PLG-0001",
                            "nama": "Warga Prabayar",
                            "ip_router": "10.10.2.10",
                            "kantor": "tengaran",
                            "billing_mode": "prabayar"
                        }
                    }
                ],
                default_kantor="tengaran"
            )
            self.assertEqual(imp_res["updated"], 1)

            t_pra, items_pra = CustomerService.get_customers(db, kantor="tengaran", billing_mode="prabayar")
            self.assertEqual(t_pra, 1)
            self.assertEqual(items_pra[0]["id_pelanggan"], "PLG-0001")
            self.assertEqual(items_pra[0]["billing_mode"], "prabayar")

            t_pasca, items_pasca = CustomerService.get_customers(db, kantor="tengaran", billing_mode="pascabayar")
            self.assertEqual(t_pasca, 1)
            self.assertEqual(items_pasca[0]["id_pelanggan"], "PLG-0002")

            t_unset, items_unset = CustomerService.get_customers(db, kantor="tengaran", billing_mode="unset")
            self.assertEqual(t_unset, 1)
            self.assertEqual(items_unset[0]["id_pelanggan"], "PLG-0003")
            self.assertIsNone(items_unset[0]["billing_mode"])
        finally:
            db.close()

if __name__ == "__main__":
    unittest.main()
