import sys
import os
import io

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath('.'))

from app.core.database import SessionLocal
from app.modules.customers.service import CustomerService

def run_tests():
    print("=== Testing CustomerService Dynamic Import Flow ===")
    
    # 1. Test Excel Template Generation
    print("\n1. Testing generate_excel_template...")
    template_bytes = CustomerService.generate_excel_template()
    assert isinstance(template_bytes, bytes)
    assert len(template_bytes) > 1000, f"Template bytes too small: {len(template_bytes)}"
    print(f"[OK] Excel template generated successfully ({len(template_bytes)} bytes)")

    # 2. Test File Analysis on DAFTAR PELANGGAN TIJ.xlsx
    print("\n2. Testing analyze_import_file on 'DAFTAR PELANGGAN TIJ.xlsx'...")
    with open('DAFTAR PELANGGAN TIJ.xlsx', 'rb') as f:
        file_bytes = f.read()

    analysis = CustomerService.analyze_import_file(file_bytes, 'DAFTAR PELANGGAN TIJ.xlsx')
    print("Sheets detected:")
    for s in analysis['sheets']:
        print(f"  - Sheet: {s['name']}, Rows: {s['row_count']}, HeaderRow: {s['header_row']}, Columns ({len(s['columns'])}): {s['columns'][:5]}...")
    
    sheet_names = [s['name'] for s in analysis['sheets']]
    assert "PELANGGAN PUSAT" in sheet_names
    assert "PELANGGAN CABANG" in sheet_names
    assert "PELANGGAN BMS" in sheet_names
    print("[OK] All expected sheets detected properly")

    # 3. Test Preview for Sheet PELANGGAN PUSAT
    print("\n3. Testing preview_import_file for 'PELANGGAN PUSAT'...")
    db = SessionLocal()
    try:
        pusat_sheet = next(s for s in analysis['sheets'] if s['name'] == 'PELANGGAN PUSAT')
        # Mapping for PUSAT
        pusat_mapping = {
            'id_pelanggan': 'ID Pelanggan',
            'nama': 'Nama',
            'alamat': 'Alamat',
            'no_hp': 'No HP',
            'pop': 'POP',
            'ip_router': 'IP Router',
            'paket': 'Paket',
            'jenis_modem': 'Jenis Modem',
            'mac_address': 'MAC Address',
            'nama_wifi': 'Nama Wifi',
            'password_wifi': 'Password wifi',
            'user_admin': 'USER ADMIN',
            'pass_admin': 'PASS ADMIN'
        }
        pusat_preview = CustomerService.preview_import_file(
            file_content=file_bytes,
            filename='DAFTAR PELANGGAN TIJ.xlsx',
            sheet_name='PELANGGAN PUSAT',
            mapping=pusat_mapping,
            db=db
        )
        print(f"  Total Rows: {pusat_preview['total_rows']}")
        print(f"  Valid New: {pusat_preview['valid_count']}")
        print(f"  Duplicates: {pusat_preview['duplicates_count']}")
        print(f"  Errors: {pusat_preview['errors_count']}")
        print(f"  Existing DB IDs count: {len(pusat_preview.get('existing_ids', []))}")
        assert pusat_preview['total_rows'] > 0
        first_row = pusat_preview['preview_data'][0]
        print(f"  Sample row 1 data: ID={first_row['data']['id_pelanggan']}, Nama={first_row['data']['nama']}, IP={first_row['data']['ip_router']}, Status={first_row['_status']}")
        print("[OK] Sheet 'PELANGGAN PUSAT' previewed successfully")

        # 4. Test Preview for Sheet PELANGGAN BMS (which has header at row 2)
        print("\n4. Testing preview_import_file for 'PELANGGAN BMS' (Header on row 2)...")
        bms_sheet = next(s for s in analysis['sheets'] if s['name'] == 'PELANGGAN BMS')
        bms_mapping = {
            'id_pelanggan': 'NO',
            'nama': 'NAMA',
            'alamat': 'ALAMAT PASANG',
            'pop': 'ODP BARU',
            'ip_router': 'IP',
            'mac_address': 'MAC',
            'nama_wifi': 'WIFI',
            'password_wifi': 'PSWD',
            'user_admin': 'USER',
            'pass_admin': 'PASS'
        }
        bms_preview = CustomerService.preview_import_file(
            file_content=file_bytes,
            filename='DAFTAR PELANGGAN TIJ.xlsx',
            sheet_name='PELANGGAN BMS',
            mapping=bms_mapping,
            db=db
        )
        print(f"  Total Rows: {bms_preview['total_rows']}")
        print(f"  Valid New: {bms_preview['valid_count']}")
        print(f"  Duplicates: {bms_preview['duplicates_count']}")
        print(f"  Errors: {bms_preview['errors_count']}")
        assert bms_preview['total_rows'] > 0
        sample_bms = bms_preview['preview_data'][0]
        print(f"  Sample BMS row 1: ID={sample_bms['data']['id_pelanggan']}, Nama={sample_bms['data']['nama']}, IP={sample_bms['data']['ip_router']}, Status={sample_bms['_status']}")
        print("[OK] Sheet 'PELANGGAN BMS' previewed successfully with correct header row offset")

        # 5. Test Export Excel
        print("\n5. Testing export_customers_excel...")
        export_bytes = CustomerService.generate_excel_export(db)
        assert isinstance(export_bytes, bytes)
        assert len(export_bytes) > 1000
        print(f"[OK] Customers export Excel generated successfully ({len(export_bytes)} bytes)")

        print("\n=== ALL TESTS PASSED! ===")
    finally:
        db.close()

if __name__ == '__main__':
    run_tests()
