import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi import Request, HTTPException
from starlette.datastructures import Headers

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath("."))

from app.core.database import SessionLocal
from app.db.models import Pelanggan, User
from app.core.security import create_session_token
from app.services.scheduler_service import scheduler
from app.modules.monitoring.controller import MonitoringController
from app.modules.monitoring.service import MonitoringService

class TestHybridMonitoring(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_execute_scan_sync_filter_by_office(self):
        """Uji execute_scan_sync memfilter pelanggan berdasarkan kantor"""
        print("\n[TEST 1] Testing execute_scan_sync with kantor filter...")
        with patch("app.services.ont_scraper_service.ONTScraperService.scrape_ont") as mock_scrape:
            mock_scrape.return_value = {
                "success": True,
                "rx_power": -21.5,
                "suhu_ont": 42.0,
                "uptime": 3600,
                "status_koneksi": "NORMAL",
                "gpon_state": "Normal",
                "latency_ms": 15,
                "message": "OK"
            }

            # Scan specifically for 'cabang'
            res_cabang = scheduler.execute_scan_sync(kantor="cabang")
            self.assertEqual(res_cabang["status"], "success")
            self.assertEqual(res_cabang["target_kantor"], "cabang")
            print(f"  ✓ Scan Cabang selesai, scanned_total: {res_cabang['scanned_total']}, target: {res_cabang['target_kantor']}")

            # Scan specifically for 'pusat'
            res_pusat = scheduler.execute_scan_sync(kantor="pusat")
            self.assertEqual(res_pusat["status"], "success")
            self.assertEqual(res_pusat["target_kantor"], "pusat")
            print(f"  ✓ Scan Pusat selesai, scanned_total: {res_pusat['scanned_total']}, target: {res_pusat['target_kantor']}")

            # Scan for all (None)
            res_all = scheduler.execute_scan_sync(kantor=None)
            self.assertEqual(res_all["status"], "success")
            self.assertEqual(res_all["target_kantor"], "all")
            print(f"  ✓ Scan Semua Kantor selesai, scanned_total: {res_all['scanned_total']}, target: {res_all['target_kantor']}")

    def test_02_controller_trigger_scan_all_permissions(self):
        """Uji hak akses trigger_scan_all per role"""
        print("\n[TEST 2] Testing trigger_scan_all permissions per role...")
        with patch("app.modules.monitoring.service.MonitoringService.scan_all") as mock_scan_all:
            mock_scan_all.return_value = {"status": "success", "scanned_total": 5, "target_kantor": "cabang"}

            # Mock user teknisi -> WAJIB 403 Forbidden
            user_teknisi = {"user": "tek1", "role": "teknisi", "allowed_kantor": ["cabang"]}
            with self.assertRaises(HTTPException) as ctx:
                MonitoringController.trigger_scan_all(request=None, db=self.db, user=user_teknisi)
            self.assertEqual(ctx.exception.status_code, 403)
            print("  ✓ Teknisi diblokir (403) dari pemicuan scan massal")

            # Mock user admin cabang -> Mengarah ke kantor 'cabang'
            user_admin = {"user": "admin_c", "role": "admin", "allowed_kantor": ["cabang"]}
            mock_req = MagicMock()
            mock_req.state.active_kantor = "cabang"
            mock_req.state.allowed_kantor = ["cabang"]
            mock_req.cookies = {"active_kantor": "cabang"}
            mock_req.headers.get.return_value = "127.0.0.1"
            mock_req.client.host = "127.0.0.1"

            res_admin = MonitoringController.trigger_scan_all(request=mock_req, db=self.db, user=user_admin)
            mock_scan_all.assert_called_with(kantor="cabang")
            print("  ✓ Admin Cabang berhasil memicu scan khusus kantor 'cabang'")

            # Mock super admin dengan active_kantor == 'banyumas'
            user_sa = {"user": "admin", "role": "super admin", "allowed_kantor": ["cabang", "pusat", "banyumas"]}
            mock_req.state.active_kantor = "banyumas"
            res_sa_bms = MonitoringController.trigger_scan_all(request=mock_req, db=self.db, user=user_sa)
            mock_scan_all.assert_called_with(kantor="banyumas")
            print("  ✓ Super Admin dengan switcher 'banyumas' berhasil memicu scan khusus 'banyumas'")

            # Mock super admin dengan active_kantor == 'pusat'
            mock_req.state.active_kantor = "pusat"
            res_sa_pusat = MonitoringController.trigger_scan_all(request=mock_req, db=self.db, user=user_sa)
            mock_scan_all.assert_called_with(kantor="pusat")
            print("  ✓ Super Admin dengan switcher 'pusat' berhasil memicu scan khusus kantor 'pusat'")

    def test_03_single_probe_office_authorization(self):
        """Uji trigger_scan_single menghormati wilayah kantor teknisi/admin"""
        print("\n[TEST 3] Testing single probe office authorization...")
        # Ambil satu pelanggan cabang
        cust_cabang = self.db.query(Pelanggan).filter(Pelanggan.kantor == "cabang").first()
        if not cust_cabang:
            print("  - Lewati test 3 (tidak ada data pelanggan cabang)")
            return

        with patch("app.modules.monitoring.service.MonitoringService.scan_single") as mock_single:
            mock_single.return_value = {"id_pelanggan": cust_cabang.id_pelanggan, "rx_power": -22.0}

            # Teknisi dari banyumas mencoba probe pelanggan cabang -> HARUS 403
            user_tek_bms = {"user": "tek_bms", "role": "teknisi", "allowed_kantor": ["banyumas"]}
            with self.assertRaises(HTTPException) as ctx:
                MonitoringController.trigger_scan_single(
                    id_pelanggan=cust_cabang.id_pelanggan,
                    user=user_tek_bms,
                    db=self.db
                )
            self.assertEqual(ctx.exception.status_code, 403)
            print("  ✓ Teknisi Banyumas ditolak (403) saat mengecek ONT kantor Cabang")

            # Teknisi dari cabang mencoba probe pelanggan cabang -> BERHASIL
            user_tek_cbg = {"user": "tek_cbg", "role": "teknisi", "allowed_kantor": ["cabang"]}
            res_ok = MonitoringController.trigger_scan_single(
                id_pelanggan=cust_cabang.id_pelanggan,
                user=user_tek_cbg,
                db=self.db
            )
            self.assertIsNotNone(res_ok)
            print("  ✓ Teknisi Cabang diizinkan mengecek ONT kantor Cabang miliknya")

    def test_04_kpi_and_chart_data_office_filter(self):
        """Uji get_kpi dan get_chart_data memfilter berdasarkan active_kantor"""
        print("\n[TEST 4] Testing KPI and Chart Data office filtering...")
        mock_req = MagicMock()
        mock_req.state.active_kantor = "cabang"
        mock_req.state.allowed_kantor = ["cabang"]

        kpi_cabang = MonitoringController.get_kpi(request=mock_req, db=self.db)
        self.assertEqual(kpi_cabang.get("target_kantor"), "cabang")
        print(f"  ✓ KPI kantor Cabang: {kpi_cabang['total_monitored']} terpantau")

        mock_req.state.active_kantor = "all"
        mock_req.state.allowed_kantor = ["cabang", "pusat", "banyumas"]
        kpi_all = MonitoringController.get_kpi(request=mock_req, db=self.db)
        self.assertEqual(kpi_all.get("target_kantor"), "all")
        print(f"  ✓ KPI semua kantor: {kpi_all['total_monitored']} terpantau")

        chart_res = MonitoringController.get_chart_data(request=mock_req, db=self.db, range_type="today")
        self.assertIn("datasets", chart_res)
        print("  ✓ Chart data successfully queried with office filtering")

if __name__ == "__main__":
    unittest.main()
