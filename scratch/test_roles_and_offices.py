import json
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath("."))
from fastapi import Request
from starlette.datastructures import Headers

from app.core.database import SessionLocal
from app.db.models import User, Pelanggan
from app.core.security import (
    create_session_token,
    verify_session_token,
    get_user_allowed_kantor,
    get_active_kantor,
    require_admin,
    require_super_admin,
    ALL_KANTOR
)
from app.modules.customers.service import CustomerService
from app.services.telegram_service import TelegramService
from app.db.models import LogPerformaONT
from datetime import datetime

def run_tests():
    print("==================================================")
    print("   TESTING EDTEKNOGUARD 3 ROLES & 3 OFFICES")
    print("==================================================")
    db = SessionLocal()
    errors = []

    # 1. Test Session Token Serialization & Deserialization
    print("\n[TEST 1] Testing Session Token with allowed_kantor...")
    try:
        token_sa = create_session_token("superadmin", role="super admin", nama_karyawan="Super Admin NOC", allowed_kantor=["cabang", "pusat", "banyumas"])
        payload_sa = verify_session_token(token_sa)
        assert payload_sa["role"] == "super admin", f"Expected 'super admin', got {payload_sa['role']}"
        assert payload_sa["allowed_kantor"] == ["cabang", "pusat", "banyumas"], f"Got {payload_sa['allowed_kantor']}"
        print("  ✓ Super admin session verified with 3 offices")

        token_adm = create_session_token("admin_cabang", role="admin", nama_karyawan="Admin Cabang", allowed_kantor=["cabang"])
        payload_adm = verify_session_token(token_adm)
        assert payload_adm["role"] == "admin", f"Expected 'admin', got {payload_adm['role']}"
        assert payload_adm["allowed_kantor"] == ["cabang"], f"Got {payload_adm['allowed_kantor']}"
        print("  ✓ Admin session verified with single office")

        token_tek = create_session_token("teknisi1", role="teknisi", nama_karyawan="Teknisi Lapangan", allowed_kantor=["banyumas"])
        payload_tek = verify_session_token(token_tek)
        assert payload_tek["role"] == "teknisi", f"Expected 'teknisi', got {payload_tek['role']}"
        assert payload_tek["allowed_kantor"] == ["banyumas"], f"Got {payload_tek['allowed_kantor']}"
        print("  ✓ Teknisi session verified with banyumas office")
    except Exception as e:
        errors.append(f"Test 1 failed: {e}")
        print(f"  ✗ Test 1 Error: {e}")

    # 2. Test Role Guards (require_super_admin)
    print("\n[TEST 2] Testing Role Access Guards...")
    try:
        # Mock Request Helper
        def mock_request(token, path="/users"):
            scope = {
                "type": "http",
                "method": "GET",
                "path": path,
                "headers": [(b"accept", b"text/html"), (b"cookie", f"edteknoguard_session={token}".encode())]
            }
            return Request(scope)

        req_sa = mock_request(token_sa, "/users")
        user_sa = require_super_admin(req_sa)
        assert user_sa["role"] == "super admin"
        print("  ✓ Super Admin allowed to access /users")

        req_adm = mock_request(token_adm, "/users")
        try:
            require_super_admin(req_adm)
            errors.append("Admin should NOT be allowed to access /users!")
            print("  ✗ Admin was not blocked from /users")
        except Exception as exc:
            assert hasattr(exc, "status_code") and exc.status_code == 303
            print(f"  ✓ Admin correctly redirected (Status: {exc.status_code} {exc.headers.get('Location')})")

        req_tek = mock_request(token_tek, "/settings")
        try:
            require_super_admin(req_tek)
            errors.append("Teknisi should NOT be allowed to access /settings!")
            print("  ✗ Teknisi was not blocked from /settings")
        except Exception as exc:
            assert hasattr(exc, "status_code") and exc.status_code == 303
            print(f"  ✓ Teknisi correctly redirected (Status: {exc.status_code} {exc.headers.get('Location')})")
    except Exception as e:
        errors.append(f"Test 2 failed: {e}")
        print(f"  ✗ Test 2 Error: {e}")

    # 3. Test Office Switching & Resolution (get_active_kantor)
    print("\n[TEST 3] Testing Office Switcher & Access Scope...")
    try:
        # User admin cabang tries to access 'pusat' via cookie spoofing
        def mock_req_with_cookie(token, active_cookie):
            scope = {
                "type": "http",
                "method": "GET",
                "path": "/pelanggan",
                "headers": [
                    (b"accept", b"text/html"),
                    (b"cookie", f"edteknoguard_session={token}; active_kantor={active_cookie}".encode())
                ]
            }
            return Request(scope)

        # Super admin requests 'all' -> 'all' is removed, safely falls back to 'cabang'
        req1 = mock_req_with_cookie(token_sa, "all")
        assert get_active_kantor(req1, payload_sa) == "cabang"
        print("  ✓ Super Admin requesting 'all' safely defaults to 'cabang' (semua kantor removed)")

        # Super admin requests 'pusat' -> gets 'pusat'
        req2 = mock_req_with_cookie(token_sa, "pusat")
        assert get_active_kantor(req2, payload_sa) == "pusat"
        print("  ✓ Super Admin can switch to 'pusat'")

        # Admin Cabang requests 'pusat' -> denied, falls back to 'cabang'
        req3 = mock_req_with_cookie(token_adm, "pusat")
        assert get_active_kantor(req3, payload_adm) == "cabang"
        print("  ✓ Admin Cabang requesting unauthorized 'pusat' falls back to allowed 'cabang'")

        # Admin with multi-office ['cabang', 'banyumas']
        token_multi = create_session_token("admin_multi", role="admin", nama_karyawan="Admin Multi", allowed_kantor=["cabang", "banyumas"])
        payload_multi = verify_session_token(token_multi)
        req4 = mock_req_with_cookie(token_multi, "banyumas")
        assert get_active_kantor(req4, payload_multi) == "banyumas"
        print("  ✓ Multi-office admin can access 'banyumas'")
        req5 = mock_req_with_cookie(token_multi, "pusat")
        assert get_active_kantor(req5, payload_multi) == "cabang"
        print("  ✓ Multi-office admin requesting unauthorized 'pusat' falls back safely")
    except Exception as e:
        errors.append(f"Test 3 failed: {e}")
        print(f"  ✗ Test 3 Error: {e}")

    # 4. Test Customer Database Filtering by Kantor
    print("\n[TEST 4] Testing Customer Database Isolation per Kantor...")
    try:
        total_cabang, data_cabang = CustomerService.get_customers(db, kantor="cabang")
        print(f"  ✓ Total Pelanggan Kantor Cabang: {total_cabang}")
        assert all(c["kantor"] == "cabang" for c in data_cabang), "Data cabang contains other office!"

        total_pusat, data_pusat = CustomerService.get_customers(db, kantor="pusat")
        print(f"  ✓ Total Pelanggan Kantor Pusat: {total_pusat}")
        assert all(c["kantor"] == "pusat" for c in data_pusat), "Data pusat contains other office!"

        total_bms, data_bms = CustomerService.get_customers(db, kantor="banyumas")
        print(f"  ✓ Total Pelanggan Kantor Banyumas: {total_bms}")
        assert all(c["kantor"] == "banyumas" for c in data_bms), "Data banyumas contains other office!"

        total_all, _ = CustomerService.get_customers(db, kantor="all")
        print(f"  ✓ Total Pelanggan Semua Kantor: {total_all}")
        assert total_all == (total_cabang + total_pusat + total_bms), f"Sum mismatch: {total_all} vs {total_cabang + total_pusat + total_bms}"
    except Exception as e:
        errors.append(f"Test 4 failed: {e}")
        print(f"  ✗ Test 4 Error: {e}")

    # 5. Test Telegram Alert Message Formatting with Office
    print("\n[TEST 5] Testing Telegram Alert Format with Office...")
    try:
        dummy_p = Pelanggan(
            id_pelanggan="TEST-001",
            nama="Bpk. Budi Kantor Banyumas",
            pop="Server BMS",
            kantor="banyumas",
            ip_router="10.10.99.1",
            jenis_modem="GM220-S"
        )
        dummy_log = LogPerformaONT(
            id_pelanggan="TEST-001",
            rx_power=-28.5,
            status_koneksi="CRITICAL",
            waktu_cek=datetime(2026, 9, 19, 8, 30, 0)
        )
        alert_msg = TelegramService.format_alert_message(dummy_p, dummy_log)
        assert "🏢 <b>Kantor:</b> BANYUMAS" in alert_msg, f"Kantor not in message:\n{alert_msg}"
        print("  ✓ Telegram critical alert contains '🏢 <b>Kantor:</b> BANYUMAS'")

        dummy_p_cabang = Pelanggan(
            id_pelanggan="TEST-002",
            nama="Ibu Siti Kantor Cabang",
            pop="Server Cabang",
            kantor="cabang",
            ip_router="10.10.99.2",
            jenis_modem="GM220-S"
        )
        dummy_log_warn = LogPerformaONT(
            id_pelanggan="TEST-002",
            rx_power=-26.3,
            status_koneksi="WARNING",
            waktu_cek=datetime(2026, 9, 19, 8, 35, 0)
        )
        warn_msg = TelegramService.format_alert_message(dummy_p_cabang, dummy_log_warn)
        assert "🏢 <b>Kantor:</b> CABANG" in warn_msg, f"Kantor not in warning message:\n{warn_msg}"
        print("  ✓ Telegram warning alert contains '🏢 <b>Kantor:</b> CABANG'")
    except Exception as e:
        errors.append(f"Test 5 failed: {e}")
        print(f"  ✗ Test 5 Error: {e}")

    db.close()
    print("\n==================================================")
    if errors:
        print(f"FAILED: {len(errors)} error(s) occurred:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("ALL TESTS PASSED SUCCESSFULLY! 🎉")
        print("==================================================")

if __name__ == "__main__":
    run_tests()
