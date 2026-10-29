import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, PerangkatTerhubung
from app.core.timezone import get_now_wib
from app.services.ont_scraper_service import ONTScraperService

logger = logging.getLogger("connected_device_service")

class ConnectedDeviceService:

    @staticmethod
    def get_connected_devices(db: Session, id_pelanggan: str) -> List[Dict[str, Any]]:
        """
        Mengambil riwayat/cache perangkat yang terhubung dari database.
        """
        rows = (
            db.query(PerangkatTerhubung)
            .filter(PerangkatTerhubung.id_pelanggan == id_pelanggan)
            .order_by(PerangkatTerhubung.status.asc(), PerangkatTerhubung.last_seen.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "mac_address": r.mac_address,
                "ip_address": r.ip_address,
                "hostname": r.hostname or "Perangkat N/A",
                "tipe_koneksi": r.tipe_koneksi,
                "rssi": r.rssi,
                "ssid": r.ssid,
                "status": r.status,
                "first_seen": r.first_seen.strftime("%Y-%m-%d %H:%M:%S") if r.first_seen else None,
                "last_seen": r.last_seen.strftime("%Y-%m-%d %H:%M:%S") if r.last_seen else None,
            }
            for r in rows
        ]

    @classmethod
    def scan_and_sync_ont_devices(cls, db: Session, id_pelanggan: str) -> Dict[str, Any]:
        """
        Melakukan live probe / scraping ke modem ONT pelanggan dan menyinkronkan
        daftar perangkat yang terhubung (Associated Devices & DHCP) ke database.
        """
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not pelanggan:
            return {"success": False, "message": "Data pelanggan tidak ditemukan.", "devices": []}

        ip = pelanggan.ip_router or pelanggan.ip_ont
        if not ip:
            return {"success": False, "message": "IP Modem ONT belum terdaftar pada data pelanggan.", "devices": []}

        user_admin = pelanggan.user_admin or "admin"
        pass_admin = pelanggan.pass_admin or "admin"

        # 1. Panggil ONT Scraper secara live
        res = ONTScraperService.get_connected_devices_live(
            ip=ip,
            user_admin=user_admin,
            pass_admin=pass_admin
        )

        if not res.get("success"):
            # Jika live scraping gagal (misal modem offline atau auth gagal),
            # kembalikan data cache terakhir dari DB dengan pesan informasi
            cached = cls.get_connected_devices(db, id_pelanggan)
            return {
                "success": False,
                "message": res.get("message", "Gagal menghubungi modem ONT."),
                "cached": True,
                "total": len(cached),
                "devices": cached
            }

        scraped_devices = res.get("devices", [])
        now = get_now_wib()
        active_macs = set()

        # 2. Sinkronisasi data ke tabel perangkat_terhubung
        for dev in scraped_devices:
            mac = dev.get("mac_address")
            if not mac:
                continue
            active_macs.add(mac)

            item = (
                db.query(PerangkatTerhubung)
                .filter(
                    PerangkatTerhubung.id_pelanggan == id_pelanggan,
                    PerangkatTerhubung.mac_address == mac
                )
                .first()
            )

            if item:
                item.ip_address = dev.get("ip_address") or item.ip_address
                if dev.get("hostname"):
                    item.hostname = dev.get("hostname")
                item.tipe_koneksi = dev.get("tipe_koneksi") or item.tipe_koneksi
                if dev.get("rssi") is not None:
                    item.rssi = dev.get("rssi")
                item.status = "ONLINE"
                item.last_seen = now
            else:
                new_item = PerangkatTerhubung(
                    id_pelanggan=id_pelanggan,
                    mac_address=mac,
                    ip_address=dev.get("ip_address"),
                    hostname=dev.get("hostname"),
                    tipe_koneksi=dev.get("tipe_koneksi") or "WIFI",
                    rssi=dev.get("rssi"),
                    ssid=pelanggan.nama_wifi,
                    status="ONLINE",
                    first_seen=now,
                    last_seen=now
                )
                db.add(new_item)

        # 3. Tandai perangkat lama yang tidak muncul di pemindaian ini sebagai OFFLINE
        existing_devices = (
            db.query(PerangkatTerhubung)
            .filter(PerangkatTerhubung.id_pelanggan == id_pelanggan)
            .all()
        )
        for old_dev in existing_devices:
            if old_dev.mac_address not in active_macs and old_dev.status == "ONLINE":
                old_dev.status = "OFFLINE"

        db.commit()

        synced = cls.get_connected_devices(db, id_pelanggan)
        return {
            "success": True,
            "message": f"Berhasil memindai {len(scraped_devices)} perangkat terhubung dari modem ONT.",
            "total": len(synced),
            "devices": synced
        }

