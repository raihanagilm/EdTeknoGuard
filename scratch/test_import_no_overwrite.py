import pytest
from unittest.mock import MagicMock
from app.modules.customers.service import CustomerService
from app.db.models import Pelanggan

def test_execute_json_import_does_not_overwrite_existing():
    db = MagicMock()
    
    existing_cust = Pelanggan(
        id_pelanggan="P1010124000002",
        nama="Pelanggan Lama",
        ip_router="10.10.12.40",
        kantor="cabang"
    )
    
    def query_side_effect(*entities):
        mock_query = MagicMock()
        if entities and entities[0] is Pelanggan:
            mock_query.filter.return_value.first.return_value = existing_cust
            return mock_query
        elif len(entities) == 2:
            # Checking db_ips: db.query(Pelanggan.ip_router, Pelanggan.id_pelanggan)
            mock_query.filter.return_value.all.return_value = [("10.10.12.40", "P1010124000002")]
            return mock_query
        mock_query.filter.return_value.all.return_value = []
        return mock_query

    db.query.side_effect = query_side_effect
    
    # Attempt to import customer with same ID and same IP
    data_list = [
        {
            "_status": "valid",
            "_action": "insert",
            "data": {
                "id_pelanggan": "P1010124000002",
                "nama": "Nama Baru Coba Timpa",
                "ip_router": "10.10.12.40",
                "pop": "Server Cabang",
                "kantor": "cabang"
            }
        }
    ]
    
    res = CustomerService.execute_json_import(db, data_list, default_kantor="cabang")
    
    # Verify existing customer was NOT modified
    assert existing_cust.nama == "Pelanggan Lama", "Existing customer nama should NOT have been overwritten!"
    assert res["skipped"] == 1, "Should have counted as skipped"
    assert res["imported"] == 0, "Should have 0 imported"
    assert len(res["errors"]) == 1
    assert "penimpaan ditolak" in res["errors"][0]

def test_execute_json_import_skips_when_action_is_skip():
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = []
    
    data_list = [
        {
            "_status": "duplicate",
            "_action": "skip",
            "data": {
                "id_pelanggan": "P1010124000003",
                "nama": "Pelanggan Duplikat Diabaikan",
                "ip_router": "10.10.12.41",
            }
        }
    ]
    
    res = CustomerService.execute_json_import(db, data_list, default_kantor="cabang")
    assert res["skipped"] == 1
    assert res["imported"] == 0
    assert db.add.call_count == 0

if __name__ == "__main__":
    test_execute_json_import_does_not_overwrite_existing()
    test_execute_json_import_skips_when_action_is_skip()
    print("All customer import unit tests passed successfully!")
