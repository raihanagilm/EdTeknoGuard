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

if __name__ == "__main__":
    unittest.main()
