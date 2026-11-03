from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_portal_db
from app.db.models import Pelanggan, LogPerformaONT, SystemSetting
from app.portal.core.security import get_current_customer_optional, check_is_home_wifi
from app.portal.services.customer_service import PortalCustomerService
from app.portal.modules.dashboard.service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Portal Dashboard"])


@router.get("")
@router.get("/")
def portal_dashboard_data(request: Request, db: Session = Depends(get_portal_db)):
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"authenticated": False})
        
    data = DashboardService.get_dashboard_data(db, cust.get("id_pelanggan"))
    pel = data.get("pelanggan")
    last_log = data.get("last_log")
    kuota = data.get("kuota")
    
    is_home_wifi = check_is_home_wifi(request, pel)
    
    # Status pembayaran riil dari kolom status_pembayaran DB ("LUNAS" atau "BELUM_BAYAR")
    status_bayar = (pel.status_pembayaran if pel and getattr(pel, "status_pembayaran", None) else "LUNAS")
    harga_paket = float(pel.paket_ref.harga) if (pel and pel.paket_ref and pel.paket_ref.harga is not None) else None
    
    # Format nama bulan Indonesia (misal: "Oktober 2026")
    from app.core.timezone import get_now_wib
    now_wib = get_now_wib()
    bulan_indo = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    periode_teks = f"{bulan_indo[now_wib.month - 1]} {now_wib.year}"

    return {
        "ok": True,
        "customer": {
            "id_pelanggan": pel.id_pelanggan if pel else cust.get("id_pelanggan", ""),
            "nama": pel.nama if pel else cust.get("nama", ""),
            "paket": pel.paket if (pel and pel.paket) else "-",
            "harga_paket": harga_paket,
            "ip_router": pel.ip_router if (pel and pel.ip_router) else "-",
            "nama_wifi": pel.nama_wifi if (pel and pel.nama_wifi) else "",
            "kantor": pel.kantor if (pel and pel.kantor) else cust.get("kantor", ""),
            "pop": pel.pop if (pel and pel.pop) else "",
            "is_active": pel.is_active if pel else True,
            "status_pembayaran": status_bayar,
            "periode_tagihan": periode_teks,
            "status_verifikasi": pel.status_verifikasi if (pel and pel.status_verifikasi) else cust.get("status_verifikasi", ""),
            "foto_profil": pel.foto_profil if (pel and pel.foto_profil) else "",
            "is_connected_to_home_wifi": is_home_wifi,
            "last_speed_test": {
                "download": float(pel.last_speed_download) if (pel and pel.last_speed_download is not None) else None,
                "upload": float(pel.last_speed_upload) if (pel and pel.last_speed_upload is not None) else None,
                "ping": pel.last_speed_ping if pel else None,
                "jitter": pel.last_speed_jitter if pel else None,
                "tested_at": pel.last_speed_test_at.strftime("%d/%m %H:%M") if (pel and pel.last_speed_test_at) else None
            }
        },
        "signal": {
            "rx_power": float(last_log.rx_power) if last_log and last_log.rx_power is not None else None,
            "status_koneksi": last_log.status_koneksi if last_log else "NORMAL",
            "suhu_ont": float(last_log.suhu_ont) if last_log and last_log.suhu_ont is not None else None,
            "latency_ms": last_log.latency_ms if last_log and last_log.latency_ms is not None else None,
            "waktu_cek": str(last_log.waktu_cek) if last_log and last_log.waktu_cek else "-"
        },
        "kuota": {
            "kuota_terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
            "kuota_hari_ini_gb": float(data.get("kuota_hari_ini_gb", 0.0)),
            "periode_bulan": kuota.periode_bulan if kuota else now_wib.strftime("%Y-%m"),
            "periode_label": periode_teks,
            "kecepatan_paket": kuota.kecepatan_paket if (kuota and kuota.kecepatan_paket) else (pel.paket if (pel and pel.paket) else "-")
        },
        "active_tickets_count": data.get("active_tickets_count", 0),
        "latest_ticket": data.get("latest_ticket")
    }


@router.post("/live-probe")
def portal_live_probe_signal(request: Request, db: Session = Depends(get_portal_db)):
    """
    Live on-demand probe langsung ke modem ONT pelanggan saat menekan tombol uji kecepatan / maskot.
    Mengambil data riil redaman optik (Rx Power dBm), suhu ONT (°C), dan latensi (ms).
    """
    cust = get_current_customer_optional(request)
    if not cust:
        return JSONResponse(status_code=401, content={"ok": False, "message": "Belum login"})
    
    id_pel = cust.get("id_pelanggan")
    from app.services.ont_scraper_service import ONTScraperService
    from app.core.timezone import get_now_wib

    pel, target_db = PortalCustomerService.get_customer_by_id(id_pel, db=db, hint_kantor=cust.get("kantor"))
    if not target_db:
        target_db = db

    if not pel:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "message": "Data pelanggan tidak ditemukan", "signal": None}
        )

    if not pel.ip_router:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "message": "IP Router modem belum disetel", "signal": None}
        )

    creds_tuples = PortalCustomerService.get_default_modem_credentials(target_db)

    try:
        scrape_res = ONTScraperService.scrape_ont(
            ip=pel.ip_router,
            customer_user=pel.user_admin,
            customer_pass=pel.pass_admin,
            customer_name=pel.nama,
            default_credentials=creds_tuples,
            is_mass_scan=False,
            exhaustive_first_scan=False
        )
    except Exception as scrape_err:
        scrape_res = {"success": False, "error": str(scrape_err)}

    now = get_now_wib()
    if scrape_res.get("success"):
        rx_val = scrape_res.get("rx_power")
        suhu_val = scrape_res.get("suhu_ont")
        latency_val = scrape_res.get("latency_ms")
        status_koneksi = scrape_res.get("status_koneksi", "NORMAL")

        # Catat ke LogPerformaONT agar sinkron time-series
        log_entry = LogPerformaONT(
            id_pelanggan=pel.id_pelanggan,
            ip_router=pel.ip_router,
            rx_power=rx_val,
            suhu_ont=suhu_val,
            latency_ms=latency_val,
            status_koneksi=status_koneksi,
            waktu_cek=now
        )
        target_db.add(log_entry)

        # Update kredensial valid jika baru ditemukan
        if scrape_res.get("used_user"):
            pel.user_admin = scrape_res.get("used_user")
            pel.pass_admin = scrape_res.get("used_pass")
            pel.status_kredensial = "VALID"
        pel.last_probe_at = now
        target_db.commit()

        return {
            "ok": True,
            "signal": {
                "rx_power": float(rx_val) if rx_val is not None else None,
                "suhu_ont": float(suhu_val) if suhu_val is not None else None,
                "latency_ms": latency_val,
                "status_koneksi": status_koneksi,
                "waktu_cek": now.strftime("%H:%M:%S") + " WIB"
            }
        }
    else:
        last_log = PortalCustomerService.get_latest_signal_log(target_db, id_pel)

        return {
            "ok": True,
            "message": "Menggunakan data performa tersimpan terkini",
            "signal": {
                "rx_power": float(last_log.rx_power) if (last_log and last_log.rx_power is not None) else None,
                "suhu_ont": float(last_log.suhu_ont) if (last_log and last_log.suhu_ont is not None) else None,
                "latency_ms": last_log.latency_ms if (last_log and last_log.latency_ms is not None) else None,
                "status_koneksi": last_log.status_koneksi if last_log else "NORMAL",
                "waktu_cek": str(last_log.waktu_cek) if last_log and last_log.waktu_cek else "-"
            }
        }
