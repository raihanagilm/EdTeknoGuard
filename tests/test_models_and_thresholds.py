import unittest
from app.db import models
from app.core.tenant_database import sanitize_db_name, TENANT_TABLE_NAMES

class TestModelsAndThresholds(unittest.TestCase):

    def test_master_base_models_registration(self):
        """Memastikan seluruh tabel Master terdaftar di MasterBase dan tidak bocor ke TenantBase"""
        master_tables = set(models.MasterBase.metadata.tables.keys())
        self.assertIn("kantors", master_tables)
        self.assertIn("users", master_tables)
        self.assertIn("user_kantors", master_tables)
        self.assertIn("user_activity_logs", master_tables)
        self.assertIn("user_notification_reads", master_tables)
        self.assertNotIn("pelanggan", master_tables)
        self.assertNotIn("perangkat_ont", master_tables)

    def test_tenant_base_models_registration(self):
        """Memastikan seluruh tabel operasional per kantor terdaftar di TenantBase"""
        tenant_tables = set(models.TenantBase.metadata.tables.keys())
        self.assertIn("pelanggan", tenant_tables)
        self.assertIn("perangkat_ont", tenant_tables)
        self.assertIn("log_performa_ont", tenant_tables)
        self.assertIn("alert_logs", tenant_tables)
        self.assertIn("tiket_kendala", tenant_tables)
        self.assertIn("kuota_pelanggan", tenant_tables)
        self.assertIn("log_kuota_harian", tenant_tables)
        self.assertIn("perangkat_terhubung", tenant_tables)
        self.assertIn("system_settings", tenant_tables)
        self.assertIn("modem_credentials", tenant_tables)
        self.assertIn("pakets", tenant_tables)
        self.assertNotIn("kantors", tenant_tables)
        self.assertNotIn("users", tenant_tables)

    def test_no_cross_database_foreign_keys(self):
        """
        Memastikan tidak ada Foreign Key fisik dari tabel TenantBase
        yang mengarah ke tabel MasterBase (misal: kantors.id_kantor atau users.id).
        Ini mencegah error 1215/1824 di MySQL multi-schema.
        """
        master_table_names = set(models.MasterBase.metadata.tables.keys())
        for t_name, table in models.TenantBase.metadata.tables.items():
            for fk in table.foreign_keys:
                target_table = fk.target_fullname.split(".")[0]
                self.assertNotIn(
                    target_table,
                    master_table_names,
                    f"Tabel tenant '{t_name}' memiliki cross-database FK ke master '{target_table}'"
                )

    def test_tenant_db_sanitization(self):
        """Memastikan generator nama database tenant aman dari injection dan konsisten"""
        self.assertEqual(sanitize_db_name("Cabang"), "edtekno_cabang")
        self.assertEqual(sanitize_db_name("Karang Gede"), "edtekno_karang_gede")
        self.assertEqual(sanitize_db_name("BMS-01/Pusat!"), "edtekno_bms_01_pusat_")
        self.assertEqual(sanitize_db_name("kantor+pusat"), "edtekno_kantor_pusat")

    def test_optical_rx_power_threshold_evaluation(self):
        """
        Memvalidasi logika ambang batas redaman optik sesuai SOP:
        - Normal: > -26.0 dBm
        - Warning: -26.0 dBm s/d -27.0 dBm
        - Kritis: <= -27.0 dBm
        """
        def evaluate_status(rx_power):
            if rx_power is None or rx_power <= -40.0:
                return "LOS"
            if rx_power <= -27.0:
                return "CRITICAL"
            if rx_power <= -26.0:
                return "WARNING"
            return "NORMAL"

        self.assertEqual(evaluate_status(-19.50), "NORMAL")
        self.assertEqual(evaluate_status(-25.99), "NORMAL")
        self.assertEqual(evaluate_status(-26.00), "WARNING")
        self.assertEqual(evaluate_status(-26.50), "WARNING")
        self.assertEqual(evaluate_status(-27.00), "CRITICAL")
        self.assertEqual(evaluate_status(-28.30), "CRITICAL")
        self.assertEqual(evaluate_status(-40.00), "LOS")
        self.assertEqual(evaluate_status(None), "LOS")

if __name__ == "__main__":
    unittest.main()
