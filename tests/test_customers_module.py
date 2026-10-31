import unittest
from unittest.mock import MagicMock
import io
import pandas as pd
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

if __name__ == "__main__":
    unittest.main()
