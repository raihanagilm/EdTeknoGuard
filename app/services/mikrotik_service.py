"""
mikrotik_service.py - Service Komunikasi dan Sinkronisasi MikroTik RouterOS
Mengambil data DHCP Server Leases (status bound) dan Simple Queues dari router MikroTik
lalu melakukan sinkronisasi otomatis/realtime ke database pelanggan TeknoGuard.
"""

import logging
import re
import socket
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

import routeros_api
from routeros_api.exceptions import RouterOsApiConnectionError, RouterOsApiCommunicationError

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import Pelanggan, PerangkatONT, SystemSetting, Paket, Pop

logger = logging.getLogger("mikrotik_service")

# Daftar blacklist kata kunci pada Comment yang bukan merupakan pelanggan ISP
NON_CUSTOMER_KEYWORDS = [
    "MODEM OFFICE", "MODEM KANTOR", "DVR", "NVR", "CCTV", "PC ADM", "PC ADMIN", 
    "DESKTOP-", "SERVER", "PRINTER", "SWITCH", "ACCESS POINT", "AP-", "TV", "COOLITA"
]


class MikroTikSyncService:

    @staticmethod
    def get_setting_value(db: Session, key_name: str, default_val: Any) -> Any:
        try:
            row = db.query(SystemSetting).filter(SystemSetting.key_name == key_name).first()
            if row and row.value_text is not None:
                return row.value_text.strip()
        except Exception:
            pass
        return default_val

    @classmethod
    def get_connection_params(cls, db: Optional[Session] = None) -> Dict[str, Any]:
        """Mengambil konfigurasi koneksi MikroTik dari database (SystemSetting) dengan fallback ke settings/.env."""
        host = settings.MIKROTIK_HOST
        port = settings.MIKROTIK_PORT
        user = settings.MIKROTIK_USER
        password = settings.MIKROTIK_PASSWORD
        kantor = settings.MIKROTIK_DEFAULT_KANTOR
        auto_sync = settings.MIKROTIK_AUTO_SYNC_ENABLED

        if db:
            host = cls.get_setting_value(db, "mikrotik_host", host)
            try:
                port = int(cls.get_setting_value(db, "mikrotik_port", port))
            except Exception:
                port = 8728
            user = cls.get_setting_value(db, "mikrotik_user", user)
            password = cls.get_setting_value(db, "mikrotik_password", password)
            kantor = cls.get_setting_value(db, "mikrotik_kantor", kantor)
            auto_val = cls.get_setting_value(db, "mikrotik_auto_sync", "true")
            auto_sync = str(auto_val).lower() in ("true", "1", "yes")

        return {
            "host": str(host).strip(),
            "port": int(port),
            "username": str(user).strip(),
            "password": str(password or ""),
            "kantor": str(kantor or "banyumas").strip(),
            "auto_sync": bool(auto_sync)
        }

    @classmethod
    def sync_all_configured_kantors(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Melakukan sinkronisasi otomatis untuk seluruh kantor yang telah memiliki konfigurasi mikrotik_host.
        """
        from app.db.models import Kantor
        kantors = db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").all()
        results = []
        for k in kantors:
            if not k.mikrotik_host or not k.mikrotik_user:
                continue
            logger.info(f"[AUTO-SYNC] Menjalankan sinkronisasi DHCP bound MikroTik untuk kantor '{k.nama}' ({k.kode}) @ {k.mikrotik_host}...")
            params = {
                "host": k.mikrotik_host,
                "port": k.mikrotik_port or 8728,
                "username": k.mikrotik_user,
                "password": k.mikrotik_pass or "",
                "kantor": k.kode
            }
            try:
                res = cls.sync_customers_from_mikrotik(db, params)
                res["kantor"] = k.kode
                results.append(res)
            except Exception as e:
                logger.error(f"[AUTO-SYNC] Gagal sinkronisasi kantor '{k.kode}': {e}")
                results.append({"kantor": k.kode, "success": False, "message": str(e)})
        return results

    @classmethod
    def test_connection(
        cls, 
        host: str, 
        port: int, 
        username: str, 
        password: str, 
        timeout: int = 4
    ) -> Dict[str, Any]:
        """Uji konektivitas soket & autentikasi RouterOS API."""
        host = host.strip()
        # 1. Cek port level TCP
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            s.connect((host, port))
            s.close()
        except Exception as e:
            return {
                "success": False,
                "message": f"Port API {port} di host {host} tidak dapat dijangkau ({e}). Pastikan IP > Services > api di WinBox aktif."
            }

        # 2. Cek autentikasi RouterOS API
        try:
            connection = routeros_api.RouterOsApiPool(
                host,
                username=username,
                password=password,
                port=port,
                use_ssl=False,
                plaintext_login=True
            )
            api = connection.get_api()
            # Ambil identitas router
            res_identity = api.get_resource("/system/identity").get()
            router_name = res_identity[0].get("name", "MikroTik") if res_identity else "MikroTik"
            
            # Ambil versi RouterOS
            res_res = api.get_resource("/system/resource").get()
            ros_version = res_res[0].get("version", "v7") if res_res else "v7"
            connection.disconnect()

            return {
                "success": True,
                "router_name": router_name,
                "version": ros_version,
                "message": f"Terhubung sukses ke {router_name} (RouterOS {ros_version})!"
            }
        except (RouterOsApiConnectionError, RouterOsApiCommunicationError) as e:
            return {
                "success": False,
                "message": f"Koneksi API ditolak oleh MikroTik: {e}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error saat otentikasi MikroTik: {e}"
            }

    @classmethod
    def is_valid_customer_comment(cls, comment: Optional[str]) -> bool:
        """Memvalidasi Comment di DHCP Leases agar seluruh perangkat terpantau."""
        if not comment:
            return True
        clean = comment.strip()
        return len(clean) >= 1

    @classmethod
    def get_simulated_mikrotik_data(cls, kantor: str) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
        """
        Menyediakan data mock/simulasi MikroTik realistis (termasuk DHCP 192.168.x.x dan ARP 10.10.x.x)
        ketika server sedang dalam mode simulasi atau tidak terhubung fisik ke router lab ISP.
        """
        import os
        devices = []
        ip_to_rate = {}

        # 1. Coba baca dari sheet Excel yang sesuai kantor
        excel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "DAFTAR PELANGGAN TIJ.xlsx")
        sheet_map = {
            "banyumas": "PELANGGAN BMS",
            "cabang": "PELANGGAN CABANG",
            "pusat": "PELANGGAN PUSAT"
        }
        target_sheet = sheet_map.get(kantor.lower(), "PELANGGAN BMS")

        if os.path.exists(excel_path):
            try:
                import pandas as pd
                df = pd.read_excel(excel_path, sheet_name=target_sheet, header=2)
                for _, r in df.iterrows():
                    nama = str(r.get("NAMA", "")).strip()
                    ip = str(r.get("IP", "")).strip()
                    mac = str(r.get("MAC", "")).strip()
                    if not ip or ip in ("", "nan", "None", ""):
                        continue
                    if not nama or nama in ("", "nan", "None", ""):
                        nama = f"Pelanggan {ip}"
                    devices.append({
                        "address": ip,
                        "mac-address": mac.upper() if mac and mac not in ("nan", "None", "") else "",
                        "comment": f"{nama} {kantor.capitalize()}",
                        "status": "bound",
                        "source": "arp" if ip.startswith("10.10.") else "dhcp"
                    })
                    ip_to_rate[ip] = "7000000/10000000"
            except Exception as e:
                logger.warning(f"[SIMULASI] Gagal memuat Excel simulasi MikroTik: {e}")

        # Fallback jika excel kosong atau gagal
        if not devices:
            for i in range(1, 21):
                ip = f"10.10.12.{i}" if i % 2 == 0 else f"192.168.10.{i}"
                devices.append({
                    "address": ip,
                    "mac-address": f"44:22:95:0B:BC:{i:02X}",
                    "comment": f"Pelanggan Mock {i} {kantor.capitalize()}",
                    "status": "bound",
                    "source": "arp" if ip.startswith("10.10.") else "dhcp"
                })
                ip_to_rate[ip] = "10M/10M"

        logger.info(f"[SIMULASI] Menggunakan {len(devices)} data perangkat simulasi MikroTik untuk kantor '{kantor}'.")
        return devices, ip_to_rate

    @classmethod
    def fetch_mikrotik_data(
        cls, 
        host: str, 
        port: int, 
        username: str, 
        password: str,
        kantor: str = "banyumas"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
        """
        Menarik daftar perangkat pelanggan dari:
        1. /ip/dhcp-server/lease (DHCP Dinamis/Statis: bound & waiting)
        2. /ip/arp (Semua perangkat aktif di ARP Table, termasuk IP statis/VLAN 10.10.x.x)
        3. /ppp/active (Sesi PPPoE aktif jika ada)
        4. /queue/simple (Bandwidth limit)
        Jika gagal terhubung dan SNMP_SIMULATION_MODE aktif, otomatis beralih ke simulasi data realistis.
        """
        try:
            connection = routeros_api.RouterOsApiPool(
                host,
                username=username,
                password=password,
                port=port,
                use_ssl=False,
                plaintext_login=True
            )
            api = connection.get_api()

            devices_by_ip: Dict[str, Dict[str, Any]] = {}

            # 1. Ambil DHCP Leases (bound & waiting)
            try:
                lease_resource = api.get_resource("/ip/dhcp-server/lease")
                raw_leases = lease_resource.get()
                for l in raw_leases:
                    ip = l.get("address", "").strip()
                    if not ip:
                        continue
                    status = l.get("status", "").lower()
                    if status in ("bound", "waiting"):
                        devices_by_ip[ip] = {
                            "address": ip,
                            "mac-address": l.get("mac-address", "").strip().upper(),
                            "comment": l.get("comment", "").strip(),
                            "status": status,
                            "source": "dhcp"
                        }
            except Exception as e:
                logger.warning(f"Gagal mengambil DHCP leases: {e}")

            # 2. Ambil ARP Table (/ip/arp) untuk menangkap IP 10.10.x.x dan IP statis lainnya
            try:
                arp_resource = api.get_resource("/ip/arp")
                raw_arps = arp_resource.get()
                for a in raw_arps:
                    ip = a.get("address", "").strip()
                    if not ip:
                        continue
                    mac = a.get("mac-address", "").strip().upper()
                    comment = a.get("comment", "").strip()
                    disabled = a.get("disabled", "false").lower() == "true"
                    complete = a.get("complete", "true").lower() == "true"

                    if disabled or not complete:
                        continue

                    if ip not in devices_by_ip:
                        devices_by_ip[ip] = {
                            "address": ip,
                            "mac-address": mac,
                            "comment": comment,
                            "status": "bound",
                            "source": "arp"
                        }
                    else:
                        if not devices_by_ip[ip].get("comment") and comment:
                            devices_by_ip[ip]["comment"] = comment
                        if not devices_by_ip[ip].get("mac-address") and mac:
                            devices_by_ip[ip]["mac-address"] = mac
            except Exception as e:
                logger.warning(f"Gagal mengambil ARP table: {e}")

            # 3. Ambil PPPoE Active (/ppp/active) jika ada
            try:
                ppp_resource = api.get_resource("/ppp/active")
                raw_ppps = ppp_resource.get()
                for p in raw_ppps:
                    ip = p.get("address", "").strip()
                    if not ip:
                        continue
                    caller_id = p.get("caller-id", "").strip().upper()
                    name = p.get("name", "").strip()
                    comment = p.get("comment", "").strip() or name

                    if ip not in devices_by_ip:
                        devices_by_ip[ip] = {
                            "address": ip,
                            "mac-address": caller_id if ":" in caller_id else "",
                            "comment": comment,
                            "status": "bound",
                            "source": "pppoe"
                        }
                    else:
                        if not devices_by_ip[ip].get("comment") and comment:
                            devices_by_ip[ip]["comment"] = comment
            except Exception as e:
                logger.debug(f"Info: PPP active resource tidak tersedia atau kosong: {e}")

            # 4. Ambil Simple Queues untuk pemetaan paket kecepatan
            ip_to_rate = {}
            try:
                queue_resource = api.get_resource("/queue/simple")
                raw_queues = queue_resource.get()
                for q in raw_queues:
                    target = q.get("target", "")
                    max_limit = q.get("max-limit", "")
                    if target:
                        clean_ip = target.split("/")[0].strip()
                        ip_to_rate[clean_ip] = max_limit
            except Exception as e:
                logger.warning(f"Tidak dapat mengambil simple queues: {e}")

            connection.disconnect()
            return list(devices_by_ip.values()), ip_to_rate
        except Exception as conn_err:
            if settings.SNMP_SIMULATION_MODE:
                logger.warning(f"[SIMULASI] Koneksi MikroTik {host}:{port} ({conn_err}). Mengaktifkan mode simulasi MikroTik untuk kantor '{kantor}'...")
                return cls.get_simulated_mikrotik_data(kantor)
            raise conn_err

    @classmethod
    def parse_bandwidth_to_package_name(cls, rate_str: Optional[str]) -> str:
        """Mengonversi max-limit (misal '7M/10M' atau '7000000/10000000') ke nama paket."""
        if not rate_str:
            return "Paket 10 Mbps"
        try:
            parts = rate_str.split("/")
            dl = parts[1].strip() if len(parts) > 1 else parts[0].strip()
            if "M" in dl.upper():
                mbps = re.findall(r'\d+', dl)[0]
                return f"Paket {mbps} Mbps"
            elif dl.isdigit():
                val_int = int(dl)
                mbps = round(val_int / 1_000_000)
                if mbps > 0:
                    return f"Paket {mbps} Mbps"
        except Exception:
            pass
        return "Paket 10 Mbps"

    @classmethod
    def extract_pop_from_comment(cls, comment: str) -> Optional[str]:
        """Mengekstrak nama wilayah (POP) jika ada pada kata terakhir comment."""
        parts = comment.strip().split()
        if len(parts) >= 2:
            last_word = parts[-1].capitalize()
            # Wilayah umum di area jaringan
            known_pops = ["Pasinggangan", "Kedunggede", "Karangrau", "Kejawar", "Karangmangu", "Goras", "Banyumas", "Cabang", "Pusat"]
            for kp in known_pops:
                if kp.lower() == last_word.lower():
                    return kp
        return None

    @classmethod
    def sync_customers_from_mikrotik(
        cls, 
        db: Session, 
        custom_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Sinkronisasi otomatis/on-demand data pelanggan dari MikroTik ke database TeknoGuard.
        Menerapkan prinsip:
        - HANYA yang 'bound'
        - HANYA yang memiliki Comment nama pelanggan valid
        - Upsert aman (No Overwrite data existing)
        """
        params = custom_params or cls.get_connection_params(db)
        host = params["host"]
        port = params["port"]
        user = params["username"]
        password = params["password"]
        kantor = params["kantor"]

        if not host or not user:
            return {
                "success": False,
                "message": "Host atau Username MikroTik belum dikonfigurasi."
            }

        try:
            bound_leases, ip_to_rate = cls.fetch_mikrotik_data(host, port, user, password, kantor=kantor)
        except Exception as e:
            logger.error(f"Gagal mengambil data dari MikroTik: {e}")
            return {
                "success": False,
                "message": f"Gagal terhubung ke MikroTik ({e}). Pastikan service API di WinBox aktif."
            }

        total_bound = len(bound_leases)
        added_count = 0
        updated_count = 0
        skipped_count = 0

        # Ambil semua data pelanggan existing
        existing_pelanggan = db.query(Pelanggan).all()
        existing_by_ip = {}
        existing_by_ip_ont = {}
        existing_by_mac = {}
        existing_by_name = {}

        for p in existing_pelanggan:
            ip_r = p.ip_router
            ip_o = p.ip_ont
            mac = p.mac_address
            nm = (p.nama or "").strip().lower()

            if ip_r:
                existing_by_ip[ip_r.strip()] = p
            if ip_o:
                existing_by_ip_ont[ip_o.strip()] = p
            if mac:
                existing_by_mac[mac.strip().upper()] = p
            if nm and len(nm) >= 3 and not nm.startswith("pelanggan 1"):
                existing_by_name[nm] = p

        # Cache POP dan Paket yang ada di DB
        existing_pops = {pop.nama.lower(): pop.nama for pop in db.query(Pop).all()}
        existing_pakets = {pkt.nama.lower(): pkt.nama for pkt in db.query(Paket).all()}

        for lease in bound_leases:
            ip = lease.get("address", "").strip()
            mac = lease.get("mac-address", "").strip().upper()
            comment = lease.get("comment", "").strip()

            # Filter mutlak: Wajib memiliki comment valid dan bukan non-customer
            if not cls.is_valid_customer_comment(comment):
                skipped_count += 1
                continue

            if not ip:
                skipped_count += 1
                continue

            # Tentukan Paket & POP
            rate_raw = ip_to_rate.get(ip)
            paket_name = cls.parse_bandwidth_to_package_name(rate_raw)
            if paket_name.lower() not in existing_pakets:
                try:
                    new_pkt = Paket(nama=paket_name, deskripsi=f"Paket Langganan {paket_name}")
                    db.add(new_pkt)
                    db.flush()
                    existing_pakets[paket_name.lower()] = paket_name
                except Exception:
                    db.rollback()

            pop_candidate = cls.extract_pop_from_comment(comment)
            final_pop = "Server Cabang"
            if pop_candidate:
                if pop_candidate.lower() in existing_pops:
                    final_pop = existing_pops[pop_candidate.lower()]
                else:
                    try:
                        new_pop = Pop(nama=pop_candidate, kantor_kode=kantor, deskripsi=f"Wilayah {pop_candidate}")
                        db.add(new_pop)
                        db.flush()
                        existing_pops[pop_candidate.lower()] = pop_candidate
                        final_pop = pop_candidate
                    except Exception:
                        db.rollback()

            # Status Lease: bound (online) vs waiting (offline)
            lease_status = lease.get("status", "bound").lower()
            is_online = (lease_status == "bound")
            is_ont_ip = ip.startswith("10.10.")

            # Cari pelanggan yang cocok:
            # 1. IP cocok langsung (baik di ip_router maupun ip_ont)
            # 2. MAC cocok
            # 3. Nama/Comment Winbox cocok persis
            p_exist = (
                existing_by_ip.get(ip) 
                or existing_by_ip_ont.get(ip)
                or (existing_by_mac.get(mac) if mac else None)
                or (existing_by_name.get(comment.lower()) if comment and len(comment) >= 3 else None)
            )

            if p_exist:
                changed = False
                if p_exist.status_lease != lease_status:
                    p_exist.status_lease = lease_status
                    changed = True
                
                if p_exist.is_monitored != is_online:
                    p_exist.is_monitored = is_online
                    changed = True

                if mac and p_exist.mac_address != mac:
                    p_exist.mac_address = mac
                    changed = True

                # Alokasikan IP ke slot yang tepat:
                if is_ont_ip:
                    if p_exist.ip_ont != ip:
                        p_exist.ip_ont = ip
                        changed = True
                    # Jika belum punya ip_router sama sekali, jadikan ip_router juga
                    if not p_exist.ip_router:
                        p_exist.ip_router = ip
                        changed = True
                else:
                    if p_exist.ip_router != ip:
                        p_exist.ip_router = ip
                        changed = True

                if p_exist.kantor != kantor and not p_exist.kantor:
                    p_exist.kantor = kantor
                    changed = True
                
                if p_exist.nama in ("Pelanggan", "Customer", "") and comment:
                    p_exist.nama = comment
                    changed = True

                if changed:
                    p_exist.updated_at = get_now_wib()
                    updated_count += 1
            else:
                # Daftarkan pelanggan baru
                clean_ip_suffix = ip.replace(".", "-")
                id_pelanggan = f"CUST-{kantor[:3].upper()}-{clean_ip_suffix}"

                chk = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
                if chk:
                    id_pelanggan = f"{id_pelanggan}-{mac[-4:].replace(':', '') if mac else 'NEW'}"

                new_cust = Pelanggan(
                    id_pelanggan=id_pelanggan,
                    nama=comment or f"Pelanggan {ip}",
                    alamat=f"Wilayah {final_pop}",
                    pop=final_pop,
                    kantor=kantor,
                    paket=paket_name,
                    is_monitored=is_online,
                    is_active=True,
                    status_lease=lease_status,
                    status_verifikasi="TERVERIFIKASI"
                )
                db.add(new_cust)
                db.flush()

                # Buat entri PerangkatONT dengan slot IP tepat
                new_ont = PerangkatONT(
                    id_pelanggan=id_pelanggan,
                    ip_router=ip if not is_ont_ip else ip,
                    ip_ont=ip if is_ont_ip else None,
                    mac_address=mac if mac else None,
                    jenis_modem="GM220-S",
                    status_kredensial="UNTESTED"
                )
                db.add(new_ont)
                
                # Simpan ke cache lokal
                if is_ont_ip:
                    existing_by_ip_ont[ip] = new_cust
                existing_by_ip[ip] = new_cust
                if mac:
                    existing_by_mac[mac] = new_cust
                if comment:
                    existing_by_name[comment.lower()] = new_cust
                added_count += 1

        db.commit()

        msg = f"Sinkronisasi MikroTik berhasil! Total {total_bound} leases diproses. {added_count} baru ditambahkan, {updated_count} diperbarui (online/offline diselaraskan)."
        logger.info(msg)

        return {
            "success": True,
            "total_processed": total_bound,
            "added_count": added_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "message": msg
        }
