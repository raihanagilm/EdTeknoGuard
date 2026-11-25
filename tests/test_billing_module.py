"""
tests/test_billing_module.py - Pengujian Unit & Integrasi Modul Pemantauan Tagihan Admin NOC
"""
import unittest
from datetime import datetime, date
from unittest.mock import patch, MagicMock
from starlette.testclient import TestClient

from app.main import app
from app.core.security import create_session_token
from app.db.models import Pelanggan
from app.modules.billing.service import BillingService
from app.modules.billing.sync_worker import BillingSyncWorker


class TestBillingModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_billing_routes_protected(self):
        """Memastikan endpoint /api/pembayaran memproteksi akses tanpa otentikasi (HTTP 401)."""
        self.client.cookies.clear()
        r = self.client.get("/api/pembayaran")
        self.assertEqual(r.status_code, 401)

        r_post = self.client.post("/api/pembayaran/kirim-pengingat", json={"id_pelanggan_list": ["123"]})
        self.assertEqual(r_post.status_code, 401)

    def test_billing_overview_authenticated(self):
        """Memastikan endpoint /api/pembayaran mengembalikan struktur summary, pagination, dan data."""
        token = create_session_token("admin", role="super admin")
        self.client.cookies.set("edteknoguard_session", token)
        self.client.cookies.set("active_kantor", "karanggede")

        r = self.client.get("/api/pembayaran?kantor=karanggede&page=1&limit=5")
        self.assertEqual(r.status_code, 200)
        res = r.json()
        self.assertIn("summary", res)
        self.assertIn("pagination", res)
        self.assertIn("data", res)

        summary = res["summary"]
        self.assertIn("total_pelanggan", summary)
        self.assertIn("total_lunas", summary)
        self.assertIn("total_belum_bayar", summary)
        self.assertIn("total_overdue", summary)
        self.assertIn("total_nominal_tunggakan", summary)

        # Verifikasi field reminder pada data item
        if res["data"]:
            first_item = res["data"][0]
            self.assertIn("has_reminder", first_item)
            self.assertIn("last_reminder", first_item)
            self.assertIn("last_reminder_full", first_item)

    def test_billing_overview_sorting(self):
        """Memastikan endpoint /api/pembayaran mendukung parameter sort_by dan sort_dir."""
        token = create_session_token("admin", role="super admin")
        self.client.cookies.set("edteknoguard_session", token)
        self.client.cookies.set("active_kantor", "karanggede")

        # Uji sorting berdasarkan nama asc dan total_tagihan desc
        r_nama = self.client.get("/api/pembayaran?kantor=karanggede&sort_by=nama&sort_dir=asc&page=1&limit=5")
        self.assertEqual(r_nama.status_code, 200)
        self.assertIn("data", r_nama.json())

        r_tagihan = self.client.get("/api/pembayaran?kantor=karanggede&sort_by=total_tagihan&sort_dir=desc&page=1&limit=5")
        self.assertEqual(r_tagihan.status_code, 200)
        self.assertIn("data", r_tagihan.json())

    def test_prepare_whatsapp_message(self):
        """Memastikan generator draf WhatsApp menghasilkan teks personal yang rapi dan informatif."""
        mock_cust = MagicMock(spec=Pelanggan)
        mock_cust.nama = "Budi Santoso"
        mock_cust.total_tagihan = 150000
        mock_cust.periode_tagihan = "2026-11"
        mock_cust.jatuh_tempo = date(2026, 11, 20)
        mock_cust.nomor_va = "988123456789"

        msg = BillingService.prepare_whatsapp_message(mock_cust)
        self.assertIn("Budi Santoso", msg)
        self.assertIn("150.000", msg)
        self.assertIn("20/11/2026", msg)
        self.assertIn("988123456789", msg)

    @patch("app.modules.billing.sync_worker.NetworkBillService.fetch_invoices")
    @patch("app.modules.billing.sync_worker.NetworkBillService.fetch_virtual_account")
    def test_sync_worker_batch(self, mock_va, mock_inv):
        """Memastikan BillingSyncWorker memproses snapshot tagihan dan menyimpan ke database."""
        mock_inv.return_value = {
            "ok": True,
            "data": [
                {"total": 125000, "overdue": False, "billing_period": "2026-11", "due_date": "2026-11-25"}
            ]
        }
        mock_va.return_value = {
            "ok": True,
            "data": {"channels": [{"va_number": "11223344"}]}
        }

        mock_db = MagicMock()
        mock_cust = MagicMock(spec=Pelanggan)
        mock_cust.id_pelanggan = "596"
        mock_cust.network_bill_id = "596"
        mock_cust.nomor_va = None
        mock_db.query().filter().order_by().limit().all.return_value = [mock_cust]

        synced = BillingSyncWorker.sync_office_batch(mock_db, "karanggede", batch_size=1)
        self.assertEqual(synced, 1)
        self.assertEqual(mock_cust.status_pembayaran, "BELUM_BAYAR")
        self.assertEqual(mock_cust.total_tagihan, 125000)
        self.assertEqual(mock_cust.nomor_va, "11223344")
        self.assertTrue(mock_db.commit.called)

    @patch("app.modules.billing.sync_worker.NetworkBillService.fetch_invoices")
    def test_sync_worker_skips_when_no_candidates(self, mock_inv):
        """Memastikan BillingSyncWorker tidak memanggil API jika semua pelanggan LUNAS dan baru disinkronkan."""
        mock_db = MagicMock()
        mock_db.query().filter().order_by().limit().all.return_value = []

        synced = BillingSyncWorker.sync_office_batch(mock_db, "karanggede", batch_size=4)
        self.assertEqual(synced, 0)
        self.assertFalse(mock_inv.called)

    @patch("app.core.tenant_database.TenantDatabaseManager.get_tenant_session")
    @patch("app.modules.billing.sync_worker.BillingSyncWorker.resolve_nb_id")
    @patch("app.services.network_bill_service.NetworkBillService.fetch_invoices")
    def test_sync_all_office_customers(self, mock_inv, mock_resolve, mock_get_sess):
        """Memastikan BillingService.sync_all_office_customers menyinkronkan seluruh pelanggan di kantor."""
        mock_t_db = MagicMock()
        mock_get_sess.return_value = mock_t_db
        mock_resolve.return_value = "101"

        mock_cust = MagicMock(spec=Pelanggan)
        mock_cust.id_pelanggan = "PLG-001"
        mock_cust.nomor_va = "123456"
        mock_t_db.query().filter().all.return_value = [mock_cust]

        mock_inv.return_value = {
            "ok": True,
            "data": [{"total": 200000, "overdue": True, "billing_period": "2026-11", "due_date": "2026-11-15"}]
        }

        res = BillingService.sync_all_office_customers(MagicMock(), "tengaran")
        self.assertTrue(res.get("ok"))
        self.assertEqual(res.get("synced_count"), 1)
        self.assertEqual(res.get("unpaid_count"), 1)
        self.assertEqual(mock_cust.status_pembayaran, "OVERDUE")
        self.assertEqual(mock_cust.total_tagihan, 200000)
        self.assertTrue(mock_t_db.commit.called)
        self.assertTrue(mock_t_db.close.called)

    def test_billing_mode_normalization_and_filter(self):
        """Memastikan normalisasi, penyimpanan, dan filter billing_mode (prabayar/pascabayar/unset)."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.db import models
        from app.services.network_bill_service import NetworkBillService

        self.assertEqual(NetworkBillService.normalize_billing_mode("Prabayar"), "prabayar")
        self.assertEqual(NetworkBillService.normalize_billing_mode("prepaid"), "prabayar")
        self.assertEqual(NetworkBillService.normalize_billing_mode("PASCABAYAR"), "pascabayar")
        self.assertEqual(NetworkBillService.normalize_billing_mode("postpaid"), "pascabayar")
        self.assertIsNone(NetworkBillService.normalize_billing_mode(None))
        self.assertIsNone(NetworkBillService.normalize_billing_mode("unknown"))

        engine = create_engine("sqlite:///:memory:")
        models.TenantBase.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        db = Session()
        try:
            db.add_all([
                Pelanggan(id_pelanggan="1", nama="Ani", kantor="slawi", billing_mode="prabayar", is_active=True),
                Pelanggan(id_pelanggan="2", nama="Budi", kantor="slawi", billing_mode="pascabayar", is_active=True),
                Pelanggan(id_pelanggan="3", nama="Cici", kantor="slawi", billing_mode=None, is_active=True),
            ])
            db.commit()

            res_pra = BillingService.get_billing_overview(db, kantor="slawi", billing_mode="prabayar")
            self.assertEqual(res_pra["summary"]["total_prabayar"], 1)
            self.assertEqual(res_pra["summary"]["total_pascabayar"], 1)
            self.assertEqual([r["id_pelanggan"] for r in res_pra["data"]], ["1"])
            self.assertEqual(res_pra["data"][0]["billing_mode"], "prabayar")

            res_pasca = BillingService.get_billing_overview(db, kantor="slawi", billing_mode="pascabayar")
            self.assertEqual([r["id_pelanggan"] for r in res_pasca["data"]], ["2"])

            res_unset = BillingService.get_billing_overview(db, kantor="slawi", billing_mode="unset")
            self.assertEqual([r["id_pelanggan"] for r in res_unset["data"]], ["3"])
            self.assertIsNone(res_unset["data"][0]["billing_mode"])
        finally:
            db.close()

    @patch("app.modules.billing.sync_worker.NetworkBillService.fetch_customers")
    def test_sync_worker_maps_billing_mode_from_api(self, mock_fetch):
        """Memastikan resolve_nb_id dan sync_billing_mode_from_cache menyalin billing_mode dari API Network Bill."""
        BillingSyncWorker._customer_cache.clear()
        mock_fetch.return_value = {
            "data": [
                {"id": 12, "code": "PLG-0012", "name": "Budi Santoso", "whatsapp": "628123456789", "billing_mode": "prabayar"}
            ],
            "meta": {}
        }
        mock_db = MagicMock()
        mock_cust = MagicMock(spec=Pelanggan)
        mock_cust.id_pelanggan = "PLG-0012"
        mock_cust.network_bill_id = None
        mock_cust.no_hp = None
        mock_cust.nama = "Budi Santoso"
        mock_cust.billing_mode = None

        matched = BillingSyncWorker.resolve_nb_id(mock_db, mock_cust, "slawi")
        self.assertEqual(matched, "12")
        self.assertEqual(mock_cust.billing_mode, "prabayar")

        # Uji pembaruan cache saat billing_mode berubah
        mock_cust.billing_mode = "pascabayar"
        BillingSyncWorker.sync_billing_mode_from_cache(mock_cust, "slawi", "12")
        self.assertEqual(mock_cust.billing_mode, "prabayar")
