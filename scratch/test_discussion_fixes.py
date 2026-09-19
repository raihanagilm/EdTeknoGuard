import os
import sys
import unittest
import json
from pathlib import Path

# Pastikan root proyek masuk sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.database import SessionLocal
from app.db.models import Pelanggan, User, UserActivityLog, SystemSetting
from app.modules.customers.service import CustomerService
from app.modules.users.controller import UsersController
from app.services.scheduler_service import scheduler

class TestDiscussionFixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        # Bersihkan data dummy tes
        cls.db.query(Pelanggan).filter(Pelanggan.id_pelanggan.like("TEST-FIX-%")).delete(synchronize_session=False)
        cls.db.commit()
        cls.db.close()

    def test_1_user_edit_html_quotes(self):
        """Memastikan tombol edit di templates/users/index.html tidak memiliki quote bug"""
        template_path = ROOT_DIR / "templates" / "users" / "index.html"
        with open(template_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Pastikan @click dibungkus single quote dan argumen tojson
        self.assertIn("@click='openEditModal(", content, "Desktop edit button harus dibungkus single quote")
        self.assertNotIn('@click="openEditModal(', content, "Kutip ganda terluar tidak boleh digunakan pada openEditModal")
        print("  [OK] Template /users/index.html bebas dari bug kutip ganda pada openEditModal")

    def test_2_customer_import_multi_office(self):
        """Memastikan import pelanggan mendukung kolom kantor dan default_kantor"""
        dummy_data = [
            {
                "data": {
                    "id_pelanggan": "TEST-FIX-001",
                    "nama": "Pelanggan Cabang Auto",
                    "ip_router": "10.99.1.1",
                    "pop": "Server Cabang"
                },
                "_action": "insert",
                "_status": "valid"
            },
            {
                "data": {
                    "id_pelanggan": "TEST-FIX-002",
                    "nama": "Pelanggan Explicit Banyumas",
                    "ip_router": "10.99.1.2",
                    "pop": "Server Cabang",
                    "kantor": "banyumas"
                },
                "_action": "insert",
                "_status": "valid"
            }
        ]

        # Eksekusi import dengan default_kantor="pusat"
        res = CustomerService.execute_json_import(self.db, dummy_data, default_kantor="pusat")
        self.assertEqual(res["imported"], 2, "Harus berhasil import 2 pelanggan dummy")

        # Cek hasil di database
        p1 = self.db.query(Pelanggan).filter(Pelanggan.id_pelanggan == "TEST-FIX-001").first()
        self.assertIsNotNone(p1)
        self.assertEqual(p1.kantor, "pusat", "TEST-FIX-001 harus fallback ke default_kantor='pusat'")

        p2 = self.db.query(Pelanggan).filter(Pelanggan.id_pelanggan == "TEST-FIX-002").first()
        self.assertIsNotNone(p2)
        self.assertEqual(p2.kantor, "banyumas", "TEST-FIX-002 harus menggunakan kantor eksplisit='banyumas'")

        print(f"  [OK] Import multi-office verified: TEST-FIX-001 -> {p1.kantor}, TEST-FIX-002 -> {p2.kantor}")

    def test_3_scheduler_recovery_and_next_run(self):
        """Memastikan scheduler start melakukan recovery, logging aktivitas, dan menyediakan next_run_time"""
        scheduler.start()
        status_data = scheduler.get_status()

        self.assertIn(status_data["status"], ["RUNNING", "STOPPED"])
        self.assertIn("next_run_time", status_data)
        print(f"  [OK] Scheduler recovery status: {status_data['status']}, Next Run: {status_data['next_run_time']}")

        # Periksa apakah ada audit log startup recovery
        log = self.db.query(UserActivityLog).filter(
            UserActivityLog.username == "SYSTEM_DAEMON",
            UserActivityLog.action == "STARTUP_RECOVERY"
        ).order_by(UserActivityLog.id.desc()).first()
        self.assertIsNotNone(log, "Log aktivitas STARTUP_RECOVERY harus tercatat di DB")
        print(f"  [OK] Audit Log tercatat: [{log.action}] {log.keterangan}")

if __name__ == "__main__":
    unittest.main()
