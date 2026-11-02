import logging
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.models import Pelanggan, PerangkatTerhubung
from app.core.timezone import get_now_wib
from app.services.ont_scraper_service import ONTScraperService

logger = logging.getLogger("connected_device_service")

class ConnectedDeviceService:

    @classmethod
    def generate_simulated_devices(cls, pelanggan: Pelanggan) -> List[Dict[str, Any]]:
        """
        Daftar fallback perangkat generik netral tanpa mengasumsikan nama pemilik
        atau merek palsu jika modem fisik tidak dapat memberikan nama host.
        """
        return []

    @staticmethod
    def get_connected_devices(db: Session, id_pelanggan: str) -> List[Dict[str, Any]]:
        """
        Mengambil riwayat/cache perangkat yang terhubung dari database.
        Hanya mengembalikan data riil yang pernah dipindai oleh modem/sistem.
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
                "is_blocked": bool(r.is_blocked),
                "blocked_at": r.blocked_at.strftime("%Y-%m-%d %H:%M:%S") if r.blocked_at else None,
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
        scraped_devices = []

        # Target IP scraper: prioritaskan IP router pelanggan, fallback ke 192.168.1.1 (gateway lokal modem)
        target_ips = []
        if ip:
            target_ips.append(ip)
        if "192.168.1.1" not in target_ips:
            target_ips.append("192.168.1.1")

        user_admin = pelanggan.user_admin or "admin"
        pass_admin = pelanggan.pass_admin or "admin"

        for target_ip in target_ips:
            try:
                res = ONTScraperService.get_connected_devices_live(
                    ip=target_ip,
                    user_admin=user_admin,
                    pass_admin=pass_admin
                )
                if res.get("success") and res.get("devices"):
                    scraped_devices = res.get("devices", [])
                    break
            except Exception as e:
                logger.warning(f"Gagal probe live ONT {target_ip}: {e}")

        now = get_now_wib()
        active_macs = set()

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
                    ssid=pelanggan.nama_wifi or "WiFi-Rumah",
                    status="ONLINE",
                    first_seen=now,
                    last_seen=now
                )
                db.add(new_item)

        # Tandai perangkat lain yang tidak ada di pemindaian ini sebagai OFFLINE
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
            "message": f"Berhasil memindai {len(synced)} perangkat terhubung dari modem ONT.",
            "total": len(synced),
            "devices": synced
        }

    @classmethod
    def toggle_block_device(cls, db: Session, id_pelanggan: str, mac_address: str, block: Optional[bool] = None) -> Dict[str, Any]:
        """
        Blokir atau Buka Blokir (Unblock) perangkat terhubung pelanggan berdasarkan MAC address.
        Mengirimkan perintah MAC Filter ke modem ONT dan memperbarui status di database.
        """
        item = (
            db.query(PerangkatTerhubung)
            .filter(
                PerangkatTerhubung.id_pelanggan == id_pelanggan,
                PerangkatTerhubung.mac_address == mac_address
            )
            .first()
        )

        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not pelanggan:
            return {"success": False, "message": "Data pelanggan tidak ditemukan."}

        # Tentukan target blokir (jika tidak dispesifikasi, toggle)
        current_blocked = bool(item.is_blocked) if item else False
        target_block = not current_blocked if block is None else bool(block)

        ip = pelanggan.ip_router or pelanggan.ip_ont
        target_ips = []
        if ip:
            target_ips.append(ip)
        if "192.168.1.1" not in target_ips:
            target_ips.append("192.168.1.1")

        user_admin = pelanggan.user_admin or "admin"
        pass_admin = pelanggan.pass_admin or "admin"

        modem_success = False
        last_err = ""

        for target_ip in target_ips:
            try:
                res = ONTScraperService.set_mac_filter_block(
                    ip=target_ip,
                    user_admin=user_admin,
                    pass_admin=pass_admin,
                    mac_address=mac_address,
                    block=target_block
                )
                if res.get("success"):
                    modem_success = True
                    break
                else:
                    last_err = res.get("message", "Gagal menghubungi modem.")
            except Exception as e:
                last_err = str(e)
                logger.warning(f"Gagal kirim perintah MAC filter ke {target_ip}: {e}")

        # Tetap simpan perubahan ke database agar sinkron di sistem portal
        now = get_now_wib()
        if item:
            item.is_blocked = target_block
            item.blocked_at = now if target_block else None
        else:
            item = PerangkatTerhubung(
                id_pelanggan=id_pelanggan,
                mac_address=mac_address,
                is_blocked=target_block,
                blocked_at=now if target_block else None,
                status="OFFLINE",
                first_seen=now,
                last_seen=now
            )
            db.add(item)

        db.commit()

        status_text = "diblokir" if target_block else "dibuka blokirnya"
        return {
            "success": True,
            "modem_synced": modem_success,
            "is_blocked": target_block,
            "message": f"Perangkat ({mac_address}) berhasil {status_text}." if modem_success else f"Perangkat {status_text} di sistem (Modem: {last_err or 'offline'})."
        }
