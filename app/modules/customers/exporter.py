import io
import csv
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, LogPerformaONT, PerangkatONT, KuotaPelanggan

class CustomerExporter:
    @staticmethod
    def generate_excel_export(
        db: Session,
        kantor: Optional[str] = None,
        allowed_kantor: Optional[List[str]] = None,
        q: Optional[str] = None,
        ip: Optional[str] = None
    ) -> bytes:
        """
        Menghasilkan file Excel (.xlsx) data seluruh pelanggan aktif
        lengkap dengan status performa dan redaman terakhir menggunakan styling profesional.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Data Pelanggan ONT"
        ws.views.sheetView[0].showGridLines = True

        # Palet Warna Styling
        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid") # Dark Indigo
        header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        
        # Border tipis
        thin_side = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=thin_side, left=thin_side, right=thin_side, bottom=thin_side)

        headers = [
            "Kantor", "ID Pelanggan (Wajib)", "Nama Pelanggan (Wajib)", "Alamat", "No. HP",
            "POP / OLT", "IP Router", "IP ONT", "Paket Bandwidth", "Tipe Modem",
            "MAC Address", "Redaman Baseline (dBm)", "Nama WiFi", "Password WiFi",
            "User Admin", "Pass Admin",
            "Status Kredensial", "Rx Power Terakhir (dBm)", "Status Koneksi", "Pengecekan Terakhir"
        ]

        # Tulis Header
        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = cell_border
            # Adjust column width
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 25
        ws.row_dimensions[1].height = 28

        # Query Seluruh Data Pelanggan Aktif
        q_cust = db.query(Pelanggan).outerjoin(PerangkatONT, PerangkatONT.id_pelanggan == Pelanggan.id_pelanggan).filter(Pelanggan.is_active == True)
        if kantor and kantor != "all":
            q_cust = q_cust.filter(Pelanggan.kantor == kantor)
        elif allowed_kantor:
            q_cust = q_cust.filter(Pelanggan.kantor.in_(allowed_kantor))

        if ip:
            ip_clean = ip.strip()
            q_cust = q_cust.filter(
                or_(
                    PerangkatONT.ip_router.ilike(f"%{ip_clean}%"),
                    PerangkatONT.ip_ont.ilike(f"%{ip_clean}%")
                )
            )

        if q:
            search_pat = f"%{q.strip()}%"
            q_cust = q_cust.filter(
                or_(
                    Pelanggan.nama.ilike(search_pat),
                    Pelanggan.id_pelanggan.ilike(search_pat),
                    Pelanggan.alamat.ilike(search_pat),
                    PerangkatONT.ip_router.ilike(search_pat),
                    PerangkatONT.ip_ont.ilike(search_pat),
                    PerangkatONT.mac_address.ilike(search_pat),
                    PerangkatONT.nama_wifi.ilike(search_pat)
                )
            )

        customers = q_cust.order_by(Pelanggan.id.asc()).all()

        for idx, c in enumerate(customers, start=1):
            latest_log = (
                db.query(LogPerformaONT)
                .filter(LogPerformaONT.id_pelanggan == c.id_pelanggan)
                .order_by(LogPerformaONT.waktu_cek.desc())
                .first()
            )
            rx_val = float(latest_log.rx_power) if (latest_log and latest_log.rx_power is not None) else (float(c.redaman_baseline) if c.redaman_baseline else "-")
            status_val = latest_log.status_koneksi if latest_log else "NORMAL"
            last_check = latest_log.waktu_cek.strftime("%d/%m/%Y %H:%M") if latest_log else "-"

            ip_router_val = c.ip_router or (c.ip_ont if not c.perangkat or not c.perangkat.ip_ont else "-")
            ip_ont_val = c.ip_ont or "-"
            if not ip_router_val and not ip_ont_val:
                ip_router_val = "-"

            row_data = [
                (c.kantor or "cabang").upper(),
                c.id_pelanggan,
                c.nama,
                c.alamat or "-",
                c.no_hp or "-",
                c.pop or "-",
                c.ip_router or "-",
                c.ip_ont or "-",
                c.paket or "-",
                c.jenis_modem or "-",
                c.mac_address or "-",
                float(c.redaman_baseline) if c.redaman_baseline else "-",
                c.nama_wifi or "-",
                c.password_wifi or "-",
                c.user_admin or "-",
                c.pass_admin or "-",
                c.status_kredensial or "UNTESTED",
                rx_val,
                status_val,
                last_check
            ]

            row_idx = idx + 1
            ws.append(row_data)
            row_fill = zebra_fill if idx % 2 == 0 else white_fill

            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_num)
                cell.fill = row_fill
                cell.font = Font(name="Arial", size=9)
                cell.border = cell_border

                # Center align untuk kolom tertentu
                if col_num in [1, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]:
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")

            ws.row_dimensions[row_idx].height = 20

        # Auto adjust lebar kolom
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val_str = str(cell.value or '')
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @staticmethod
    def generate_excel_template() -> bytes:
        """
        Menghasilkan file template Excel (.xlsx) kosong dengan format kolom standar.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Import Pelanggan"
        ws.views.sheetView[0].showGridLines = True

        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
        header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        thin_side = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=thin_side, left=thin_side, right=thin_side, bottom=thin_side)

        headers = [
            "ID Pelanggan (Wajib)", "Nama Pelanggan (Wajib)", "Kantor (Cabang/Pusat/Banyumas)", "Alamat", "No. HP",
            "POP / OLT", "IP Router / ONT (Wajib)", "Paket Bandwidth", "Tipe Modem",
            "MAC Address", "Redaman Baseline (dBm)", "Nama WiFi", "Password WiFi",
            "User Admin", "Pass Admin"
        ]

        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = cell_border
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = 25
        ws.row_dimensions[1].height = 28

        # Tambahkan satu baris sampel sebagai contoh
        sample_row = [
            "P-001", "Budi Santoso", "Cabang", "Jl. Merdeka No 1", "081234567890",
            "Server Pusat", "192.168.1.100", "20Mbps", "GM220-S",
            "AA:BB:CC:DD:EE:FF", "-23.5", "Budi_WiFi", "password123",
            "admin", "admin123"
        ]
        ws.append(sample_row)

        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()

    @staticmethod
    def generate_csv_template() -> str:
        """Menghasilkan isi file template CSV untuk diunduh pengguna"""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID Pelanggan", "Nama", "Kantor", "Alamat", "No HP", "POP", "IP Router",
            "Paket", "MAC Address", "Redaman", "Nama Wifi", "Password wifi",
            "Jenis Modem", "USER ADMIN", "PASS ADMIN"
        ])
        writer.writerow([
            "CUST-001", "Contoh Pelanggan 1", "Cabang", "Jl. Merdeka No. 10", "08123456789",
            "Server Cabang", "10.10.2.71", "10MB CAB", "44:22:95:6B:4B:C0",
            "-21.5", "WIFI-CUST01", "rahasia123", "GM220-S", "admin", "admin123"
        ])
        writer.writerow([
            "CUST-002", "Contoh Pelanggan 2", "Pusat", "Klero Rt 02", "08571234567",
            "Mini Klero", "10.10.2.15", "30MB Residential", "FC:8E:5B:28:4D:21",
            "-22.0", "WIFI-CUST02", "sandiwifi", "GM220-S XPON", "admin", "admin123"
        ])
        return output.getvalue()

