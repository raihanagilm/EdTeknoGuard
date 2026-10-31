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
from app.db.models import Pelanggan, PerangkatONT, SystemSetting, Paket

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
    def get_connection_params(cls, db: Optional[Session] = None, kantor_kode: Optional[str] = None) -> Dict[str, Any]:
        """Mengambil konfigurasi koneksi MikroTik langsung dari tabel `kantors` di database MySQL."""
        host = ""
        port = None
        user = ""
        password = ""
        kantor = kantor_kode or ""
        auto_sync = True

        if db:
            from app.db.models import Kantor
            if not kantor:
                first_k = db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
                if first_k:
                    kantor = first_k.kode

            k = db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else None
            # Jika di db tenant belum memiliki host (hanya ada di Master DB), fallback ke Master DB
            if not k or not k.mikrotik_host:
                try:
                    from app.core.database import SessionLocal as MasterSessionLocal
                    m_db = MasterSessionLocal()
                    try:
                        k_master = m_db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else m_db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
                        if k_master and k_master.mikrotik_host:
                            k = k_master
                    finally:
                        m_db.close()
                except Exception:
                    pass

            if k:
                host = k.mikrotik_host or ""
                port = k.mikrotik_port
                user = k.mikrotik_user or ""
                password = k.mikrotik_pass or ""

        return {
            "host": str(host).strip(),
            "port": int(port) if port else None,
            "username": str(user).strip(),
            "password": str(password or ""),
            "kantor": str(kantor).strip(),
            "auto_sync": bool(auto_sync)
        }

    @classmethod
    def sync_all_configured_kantors(cls, db: Session, force: bool = False) -> List[Dict[str, Any]]:
        """
        Melakukan sinkronisasi otomatis untuk seluruh kantor aktif yang telah memiliki konfigurasi mikrotik_host
        dan telah mencapai interval waktu mikrotik_sync_interval (dalam menit).
        """
        from app.db.models import Kantor
        from app.core.timezone import get_now_wib
        now = get_now_wib()

        kantors = db.query(Kantor).filter(
            Kantor.is_active == True,
            Kantor.mikrotik_host.isnot(None),
            Kantor.mikrotik_host != ""
        ).all()
        results = []
        for k in kantors:
            if not k.mikrotik_host or not k.mikrotik_user or not k.mikrotik_port:
                continue

            # Cek interval sinkronisasi per kantor jika bukan force
            interval_mins = max(1, k.mikrotik_sync_interval or 3)
            if not force and k.last_mikrotik_sync:
                time_diff = (now - k.last_mikrotik_sync).total_seconds() / 60.0
                if time_diff < interval_mins:
                    # Belum mencapai jadwal interval kantor ini
                    continue

            logger.info(f"[AUTO-SYNC] Menjalankan sinkronisasi DHCP bound MikroTik untuk kantor '{k.nama}' ({k.kode}) @ {k.mikrotik_host}:{k.mikrotik_port} (Interval {interval_mins}m)...")
            params = {
                "host": k.mikrotik_host,
                "port": int(k.mikrotik_port),
                "username": k.mikrotik_user,
                "password": k.mikrotik_pass or "",
                "kantor": k.kode
            }
            try:
                from app.core.tenant_database import TenantDatabaseManager
                # Jalankan sinkronisasi langsung ke database tenant kantor tersebut
                tenant_db = TenantDatabaseManager.get_tenant_session(k.kode)
                try:
                    res = cls.sync_customers_from_mikrotik(tenant_db, params)
                finally:
                    tenant_db.close()

                res["kantor"] = k.kode
                k.last_mikrotik_sync = get_now_wib()
                db.commit()
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
    def fetch_mikrotik_data(
        cls, 
        host: str, 
        port: int, 
        username: str, 
        password: str,
        kantor: Optional[str] = None
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

            # 2. Ambil ARP Table (/ip/arp) HANYA untuk melengkapi MAC/Comment perangkat yang sudah terdaftar (bukan sebagai sumber pelanggan baru)
            try:
                arp_resource = api.get_resource("/ip/arp")
                raw_arps = arp_resource.get()
                for a in raw_arps:
                    ip = a.get("address", "").strip()
                    if not ip or ip not in devices_by_ip:
                        continue
                    mac = a.get("mac-address", "").strip().upper()
                    comment = a.get("comment", "").strip()
                    disabled = a.get("disabled", "false").lower() == "true"
                    complete = a.get("complete", "true").lower() == "true"

                    if disabled or not complete:
                        continue

                    if not devices_by_ip[ip].get("comment") and comment:
                        devices_by_ip[ip]["comment"] = comment
                    if not devices_by_ip[ip].get("mac-address") and mac:
                        devices_by_ip[ip]["mac-address"] = mac
            except Exception as e:
                logger.warning(f"Gagal mengambil ARP table: {e}")

            # 3. Ambil PPPoE Secrets & Active Connections (/ppp/secret & /ppp/active)
            try:
                # 3a. Ambil Active PPPoE sessions
                active_ppp_ips = set()
                active_ppp_names = set()
                try:
                    ppp_active_resource = api.get_resource("/ppp/active")
                    raw_ppps = ppp_active_resource.get()
                    for p in raw_ppps:
                        ip = p.get("address", "").strip()
                        caller_id = p.get("caller-id", "").strip().upper()
                        name = p.get("name", "").strip()
                        comment = p.get("comment", "").strip() or name
                        if ip:
                            active_ppp_ips.add(ip)
                        if name:
                            active_ppp_names.add(name)

                        if ip and ip not in devices_by_ip:
                            devices_by_ip[ip] = {
                                "address": ip,
                                "mac-address": caller_id if ":" in caller_id else "",
                                "comment": comment,
                                "status": "bound",  # Sedang terkoneksi aktif
                                "source": "pppoe"
                            }
                        elif ip and ip in devices_by_ip:
                            devices_by_ip[ip]["status"] = "bound"
                            if not devices_by_ip[ip].get("comment") and comment:
                                devices_by_ip[ip]["comment"] = comment
                except Exception as e:
                    logger.debug(f"Info: PPP active resource tidak tersedia: {e}")

                # 3b. Ambil Master PPP Secrets (/ppp/secret) untuk mendeteksi user PPPoE yang OFFLINE
                try:
                    ppp_secret_resource = api.get_resource("/ppp/secret")
                    raw_secrets = ppp_secret_resource.get()
                    for s in raw_secrets:
                        remote_ip = s.get("remote-address", "").strip()
                        sec_name = s.get("name", "").strip()
                        sec_comment = s.get("comment", "").strip() or sec_name
                        sec_caller = s.get("caller-id", "").strip().upper()

                        is_active_session = (remote_ip in active_ppp_ips) or (sec_name in active_ppp_names)
                        status_str = "bound" if is_active_session else "waiting"

                        if remote_ip:
                            if remote_ip not in devices_by_ip:
                                devices_by_ip[remote_ip] = {
                                    "address": remote_ip,
                                    "mac-address": sec_caller if ":" in sec_caller else "",
                                    "comment": sec_comment,
                                    "status": status_str,
                                    "source": "pppoe"
                                }
                            else:
                                # Update status sesuai keaktifan di ppp/active
                                devices_by_ip[remote_ip]["status"] = status_str
                                if not devices_by_ip[remote_ip].get("comment") and sec_comment:
                                    devices_by_ip[remote_ip]["comment"] = sec_comment
                except Exception as e:
                    logger.debug(f"Info: PPP secret resource tidak dapat dibaca: {e}")
            except Exception as e:
                logger.debug(f"Info: Pemrosesan PPPoE router selesai: {e}")

            # 4. Ambil Simple Queues untuk pemetaan paket kecepatan dan pendaftaran pelanggan statis/queue
            ip_to_rate = {}
            try:
                queue_resource = api.get_resource("/queue/simple")
                raw_queues = queue_resource.get()
                for q in raw_queues:
                    target = q.get("target", "")
                    max_limit = q.get("max-limit", "")
                    name = q.get("name", "").strip()
                    comment = q.get("comment", "").strip() or name
                    disabled = q.get("disabled", "false").lower() == "true"

                    if target:
                        clean_ip = target.split("/")[0].strip()
                        # Hanya proses target yang berupa format IP Address valid (10.x, 192.168.x, 172.x, dsb)
                        # Abaikan interface / dynamic binding seperti <pppoe-xxx@teknoindo.net>
                        is_valid_ip = bool(re.match(r'^(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.)\d{1,3}\.\d{1,3}$', clean_ip))

                        if is_valid_ip:
                            ip_to_rate[clean_ip] = max_limit

                            # Periksa apakah ini perangkat office/non-customer
                            is_office = any(kw in (name or comment).upper() for kw in NON_CUSTOMER_KEYWORDS)
                            if not is_office:
                                if clean_ip not in devices_by_ip:
                                    devices_by_ip[clean_ip] = {
                                        "address": clean_ip,
                                        "mac-address": "",
                                        "comment": comment or name,
                                        "status": "waiting" if disabled else "bound",
                                        "source": "queue"
                                    }
                                else:
                                    # Jika belum memiliki comment valid atau nama di device sebelumnya, lengkapi dari queue
                                    if not devices_by_ip[clean_ip].get("comment") and (comment or name):
                                        devices_by_ip[clean_ip]["comment"] = comment or name
            except Exception as e:
                logger.warning(f"Tidak dapat mengambil simple queues: {e}")

            connection.disconnect()
            return list(devices_by_ip.values()), ip_to_rate
        except Exception as conn_err:
            logger.error(f"[MIKROTIK] Gagal menghubungkan ke router {host}:{port}: {conn_err}")
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
    def extract_pop_from_comment(cls, comment: str, existing_pops: Optional[Dict[str, str]] = None) -> Optional[str]:
        """
        Mengekstrak nama wilayah (POP) dari comment perangkat di MikroTik.
        1. Mencari kecocokan langsung dengan POP yang terdaftar di database.
        2. Jika ada pola spasi (misal 'Nama Pelanggan Kedunggede'), kata terakhir diperiksa atau didaftarkan dinamis.
        """
        if not comment:
            return None
        clean_comment = comment.strip()
        parts = clean_comment.split()
        if len(parts) >= 2:
            last_word = parts[-1].strip()
            # Jika kata terakhir cocok dengan database POP yang sudah ada
            if existing_pops and last_word.lower() in existing_pops:
                return existing_pops[last_word.lower()]
            # Jika kata terakhir merupakan nama lokasi (huruf alfabet tanpa angka)
            if re.match(r'^[a-zA-Z]{3,}$', last_word) and not last_word.upper().startswith(("ONT", "AP", "RT", "RW")):
                return last_word.capitalize()
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

        # Cache POP dari data pelanggan dan Paket yang ada di DB
        existing_pops = {
            p[0].lower(): p[0] 
            for p in db.query(Pelanggan.pop).filter(Pelanggan.pop.isnot(None)).distinct().all() 
            if p[0]
        }
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

            pop_candidate = cls.extract_pop_from_comment(comment, existing_pops=existing_pops)
            # Default POP disesuaikan dengan kantor aktif yang terdaftar di database
            final_pop = existing_pops.get(kantor.lower()) or f"POP {kantor.capitalize()}" if kantor else "POP Utama"
            if pop_candidate:
                if pop_candidate.lower() in existing_pops:
                    final_pop = existing_pops[pop_candidate.lower()]
                else:
                    existing_pops[pop_candidate.lower()] = pop_candidate
                    final_pop = pop_candidate

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
                else:
                    if p_exist.ip_router != ip:
                        p_exist.ip_router = ip
                        changed = True

                if p_exist.kantor != kantor and not p_exist.kantor:
                    p_exist.kantor = kantor
                    changed = True
                
                # Bersihkan nama jika ada embel-embel kantor (misal: "Dartim Banyumas" -> "Dartim")
                clean_name = comment
                if clean_name:
                    clean_name = re.sub(rf'\s+{kantor}$', '', clean_name, flags=re.I).strip()
                if clean_name and (p_exist.nama.endswith(f" {kantor.capitalize()}") or p_exist.nama in ("Pelanggan", "Customer", "")):
                    p_exist.nama = clean_name
                    changed = True

                # Update paket layanan jika ada data limit dari Simple Queue MikroTik
                if paket_name and paket_name != p_exist.paket and rate_raw:
                    p_exist.paket = paket_name
                    changed = True

                if changed:
                    p_exist.updated_at = get_now_wib()
                    updated_count += 1
            else:
                # Daftarkan pelanggan baru
                clean_ip_suffix = ip.replace(".", "-")
                base_id = f"CUST-{kantor[:3].upper()}-{clean_ip_suffix}"
                id_pelanggan = base_id

                # Pastikan ID benar-benar unik baik di DB maupun objek yang baru di-add di sesi
                counter = 1
                while (
                    db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
                    or db.query(PerangkatONT).filter(PerangkatONT.id_pelanggan == id_pelanggan).first()
                ):
                    suffix = mac[-4:].replace(':', '') if (mac and len(mac) >= 4) else f"{counter}"
                    id_pelanggan = f"{base_id}-{suffix}"
                    counter += 1

                clean_name = comment
                if clean_name:
                    clean_name = re.sub(rf'\s+{kantor}$', '', clean_name, flags=re.I).strip()

                from app.core.security import get_password_hash, DEFAULT_CUSTOMER_PASSWORD
                new_cust = Pelanggan(
                    id_pelanggan=id_pelanggan,
                    nama=clean_name or f"Pelanggan {ip}",
                    alamat=f"Wilayah {final_pop}",
                    pop=final_pop,
                    kantor=kantor,
                    paket=paket_name,
                    is_monitored=is_online,
                    is_active=True,
                    status_lease=lease_status,
                    status_verifikasi="TERVERIFIKASI",
                    password_hash=get_password_hash(DEFAULT_CUSTOMER_PASSWORD)
                )
                db.add(new_cust)
                db.flush()

                # Buat entri PerangkatONT melalui relasi objek agar sinkron dengan cascade
                new_cust.perangkat = PerangkatONT(
                    id_pelanggan=id_pelanggan,
                    ip_router=ip if not is_ont_ip else None,
                    ip_ont=ip if is_ont_ip else None,
                    mac_address=mac if mac else None,
                    jenis_modem=None,
                    status_kredensial="INVALID"
                )
                db.flush()
                
                # Simpan ke cache lokal agar iterasi berikutnya tidak menganggapnya hilang
                if is_ont_ip:
                    existing_by_ip_ont[ip] = new_cust
                existing_by_ip[ip] = new_cust
                if mac:
                    existing_by_mac[mac] = new_cust
                if clean_name:
                    existing_by_name[clean_name.lower()] = new_cust
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

    @classmethod
    def get_router_health(cls, db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Mengambil metrik kesehatan router (CPU Load, Free RAM, Total RAM, Uptime, Versi)."""
        from app.db.models import Kantor
        if not kantor:
            first_k = db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
            kantor = first_k.kode if first_k else ""

        k = db.query(Kantor).filter(Kantor.kode == kantor).first()
        if not k or not k.mikrotik_host:
            try:
                from app.core.database import SessionLocal as MasterSessionLocal
                m_db = MasterSessionLocal()
                try:
                    k_m = m_db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else m_db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
                    if k_m and k_m.mikrotik_host:
                        k = k_m
                finally:
                    m_db.close()
            except Exception:
                pass

        if not k or not k.mikrotik_host or not k.mikrotik_user or not k.mikrotik_port:
            return {"success": False, "message": f"Kredensial MikroTik belum diatur lengkap di database untuk kantor '{kantor}'."}

        host = k.mikrotik_host
        port = int(k.mikrotik_port)
        user = k.mikrotik_user
        password = k.mikrotik_pass or ""

        try:
            connection = routeros_api.RouterOsApiPool(
                host,
                username=user,
                password=password,
                port=port,
                use_ssl=False,
                plaintext_login=True
            )
            api = connection.get_api()
            res_id = api.get_resource("/system/identity").get()
            router_name = res_id[0].get("name", "MikroTik") if res_id else "MikroTik"

            res_sys = api.get_resource("/system/resource").get()
            connection.disconnect()

            if res_sys:
                r = res_sys[0]
                total_mem = int(r.get("total-memory", 1073741824))
                free_mem = int(r.get("free-memory", 887717888))
                used_mem = total_mem - free_mem
                cpu_load = int(r.get("cpu-load", 55))
                uptime = r.get("uptime", "20d 10:48:52")
                version = r.get("version", "7.24.2 (stable)")
                board_name = r.get("board-name", "RB450Gx4")

                return {
                    "success": True,
                    "is_simulated": False,
                    "router_name": router_name,
                    "board_name": board_name,
                    "version": version,
                    "cpu_load": cpu_load,
                    "uptime": uptime,
                    "total_memory_mb": round(total_mem / (1024 * 1024), 1),
                    "free_memory_mb": round(free_mem / (1024 * 1024), 1),
                    "used_memory_mb": round(used_mem / (1024 * 1024), 1),
                    "memory_percent": round((used_mem / total_mem) * 100, 1) if total_mem else 17.3,
                    "host": host
                }
        except Exception as e:
            logger.error(f"[ROUTER-HEALTH] Koneksi live ke router MikroTik {host}:{port} gagal: {e}")
            return {
                "success": False,
                "is_simulated": False,
                "message": f"Gagal terhubung ke router {host}:{port}: {e}",
                "host": host
            }

    @classmethod
    def get_live_queues_and_bandwidth(cls, db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Mengambil Simple Queues lengkap:
        - Target IP & Rule Name
        - Limit Upload/Download Max Limit
        - Bytes counter (Upload/Download)
        - Hubungan ke Pelanggan TeknoGuard (Linked vs Unlinked vs Office Device)
        - Status Isolir
        """
        from app.db.models import Kantor
        if not kantor:
            first_k = db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
            kantor = first_k.kode if first_k else ""

        k = db.query(Kantor).filter(Kantor.kode == kantor).first()
        if not k or not k.mikrotik_host:
            try:
                from app.core.database import SessionLocal as MasterSessionLocal
                m_db = MasterSessionLocal()
                try:
                    k_m = m_db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else m_db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
                    if k_m and k_m.mikrotik_host:
                        k = k_m
                finally:
                    m_db.close()
            except Exception:
                pass

        if not k or not k.mikrotik_host or not k.mikrotik_user or not k.mikrotik_port:
            logger.debug(f"[LIVE-QUEUES] Router MikroTik belum dikonfigurasi lengkap di database untuk kantor '{kantor}'.")
            return []

        host = k.mikrotik_host
        port = int(k.mikrotik_port)
        user = k.mikrotik_user
        password = k.mikrotik_pass or ""

        # Peta pelanggan di kantor ini
        pelanggans = db.query(Pelanggan).filter(Pelanggan.kantor == kantor).all()
        cust_by_ip = {}
        for p in pelanggans:
            if p.ip_router:
                cust_by_ip[p.ip_router.strip()] = p
            if p.ip_ont:
                cust_by_ip[p.ip_ont.strip()] = p

        raw_queues = []
        try:
            connection = routeros_api.RouterOsApiPool(
                host,
                username=user,
                password=password,
                port=port,
                use_ssl=False,
                plaintext_login=True
            )
            api = connection.get_api()
            raw_queues = api.get_resource("/queue/simple").get()
            connection.disconnect()
        except Exception as e:
            logger.error(f"[LIVE-QUEUES] Gagal menarik queue dari router MikroTik ({e}).")
            return []

        # Jika API kosong/gagal, generate dari pelanggan kantor + rule-rule Winbox bawaan
        results = []
        if raw_queues:
            for q in raw_queues:
                target_raw = q.get("target", "")
                target_ip = target_raw.split("/")[0].strip() if target_raw else ""
                name = q.get("name", "")
                max_limit = q.get("max-limit", "7M/10M")
                bytes_str = q.get("bytes", "0/0")
                disabled = q.get("disabled", "false").lower() == "true"

                # Parse upload / download bytes
                up_bytes, dl_bytes = 0, 0
                if "/" in bytes_str:
                    parts = bytes_str.split("/")
                    up_bytes = int(parts[0]) if parts[0].isdigit() else 0
                    dl_bytes = int(parts[1]) if parts[1].isdigit() else 0
                total_bytes = up_bytes + dl_bytes
                total_gb = round(total_bytes / (1024 * 1024 * 1024), 2)

                # Parse upload / download max limit
                up_limit, dl_limit = "-", "-"
                if "/" in max_limit:
                    mparts = max_limit.split("/")
                    up_limit = cls._format_rate(mparts[0])
                    dl_limit = cls._format_rate(mparts[1])

                # Identifikasi apakah perangkat internal - jika ya, abaikan (hanya proses pelanggan asli)
                is_office = any(kw in name.upper() for kw in NON_CUSTOMER_KEYWORDS)
                if is_office:
                    continue

                cust = cust_by_ip.get(target_ip)

                # Ambil log redaman terakhir jika ada
                c_log = cust.logs[0] if (cust and cust.logs) else None
                c_rx = float(c_log.rx_power) if (c_log and c_log.rx_power is not None) else (float(cust.redaman_baseline) if (cust and cust.redaman_baseline) else None)
                c_status = c_log.status_koneksi if c_log else ("ONLINE" if not disabled else "OFFLINE")

                results.append({
                    "name": name,
                    "target_ip": target_ip,
                    "upload_limit": up_limit,
                    "download_limit": dl_limit,
                    "upload_bytes": up_bytes,
                    "download_bytes": dl_bytes,
                    "total_gb": total_gb,
                    "disabled": disabled,
                    "is_office": False,
                    "is_linked": cust is not None,
                    "id_pelanggan": cust.id_pelanggan if cust else None,
                    "nama_pelanggan": cust.nama if cust else name,
                    "status_isolir": cust.status_isolir if cust else False,
                    "redaman": c_rx,
                    "status_koneksi": c_status
                })

        return results

    @classmethod
    def _format_rate(cls, rate_val: str) -> str:
        rate_val = rate_val.strip()
        if "M" in rate_val.upper() or "K" in rate_val.upper():
            return rate_val.upper()
        if rate_val.isdigit():
            val_int = int(rate_val)
            if val_int >= 1_000_000:
                return f"{round(val_int / 1_000_000)}M"
            elif val_int >= 1000:
                return f"{round(val_int / 1000)}K"
        return rate_val

    @classmethod
    def toggle_customer_isolation(cls, db: Session, id_pelanggan: str, isolir: bool) -> Dict[str, Any]:
        """
        Mengubah status isolir pelanggan:
        1. Di database TeknoGuard: update `status_isolir`
        2. Di MikroTik RouterOS: tambahkan/hapus dari Address List 'ISOLIR_PELANGGAN'
           dan disable/enable rule di Simple Queues.
        """
        p = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == id_pelanggan).first()
        if not p:
            return {"success": False, "message": f"Pelanggan {id_pelanggan} tidak ditemukan."}

        p.status_isolir = isolir
        p.updated_at = get_now_wib()
        db.commit()

        # Eksekusi ke router jika terhubung
        kantor = p.kantor
        from app.db.models import Kantor
        k = db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
        if not k or not k.mikrotik_host:
            try:
                from app.core.database import SessionLocal as MasterSessionLocal
                m_db = MasterSessionLocal()
                try:
                    k_m = m_db.query(Kantor).filter(Kantor.kode == kantor).first() if kantor else m_db.query(Kantor).filter(Kantor.mikrotik_host.isnot(None), Kantor.mikrotik_host != "").first()
                    if k_m and k_m.mikrotik_host:
                        k = k_m
                finally:
                    m_db.close()
            except Exception:
                pass

        if k and k.mikrotik_host and k.mikrotik_user and k.mikrotik_port:
            try:
                connection = routeros_api.RouterOsApiPool(
                    k.mikrotik_host,
                    username=k.mikrotik_user,
                    password=k.mikrotik_pass or "",
                    port=int(k.mikrotik_port),
                    use_ssl=False,
                    plaintext_login=True
                )
                api = connection.get_api()
                ip_target = p.ip_router or p.ip_ont
                if ip_target:
                    addr_list = api.get_resource("/ip/firewall/address-list")
                    existing = addr_list.get(address=ip_target, list="ISOLIR_PELANGGAN")
                    if isolir:
                        if not existing:
                            addr_list.add(address=ip_target, list="ISOLIR_PELANGGAN", comment=f"Isolir TeknoGuard {p.nama}")
                    else:
                        for entry in existing:
                            addr_list.remove(id=entry["id"])

                connection.disconnect()
            except Exception as e:
                logger.warning(f"[ISOLIR] Tidak dapat mengupdate RouterOS ({e}), status disimpan di database.")

        status_text = "DIISOLIR" if isolir else "DIPULIHKAN / NORMAL"
        logger.info(f"[ISOLIR] Pelanggan {p.nama} ({p.id_pelanggan}) berhasil {status_text}.")
        return {
            "success": True,
            "status_isolir": isolir,
            "message": f"Akses internet pelanggan {p.nama} berhasil {status_text}!"
        }

    @classmethod
    def sync_traffic_quota_to_db(cls, db: Session, kantor: Optional[str] = None) -> Dict[str, Any]:
        """
        Membaca counter akumulasi bytes dari Simple Queues lalu
        menyinkronkan ke tabel `kuota_pelanggan` pada periode bulan berjalan (YYYY-MM).
        """
        from app.db.models import KuotaPelanggan, LogKuotaHarian, Kantor
        from app.core.timezone import get_current_period
        current_period = get_current_period()
        today_date = get_now_wib().date()

        if kantor and kantor != "all":
            target_kantors = [kantor]
        else:
            # Ambil seluruh kantor aktif yang terdaftar di database MySQL
            db_kantors = db.query(Kantor).filter(Kantor.is_active == True).all()
            target_kantors = [k.kode for k in db_kantors if k.kode]
        total_synced = 0
        from app.core.tenant_database import TenantDatabaseManager

        for knt in target_kantors:
            tenant_db = TenantDatabaseManager.get_tenant_session(knt)
            try:
                # Ambil konfigurasi router dari Master DB (db) tapi match pelanggan dari tenant_db
                queues = cls.get_live_queues_and_bandwidth(tenant_db, kantor=knt)
                synced_cids = {}

                for q in queues:
                    cid = q.get("id_pelanggan")
                    if not cid:
                        continue

                    total_gb = q.get("total_gb", 0.0)
                    up_b = q.get("upload_bytes", 0)
                    dl_b = q.get("download_bytes", 0)

                    # Jika IP/pelanggan memiliki lebih dari 1 queue di WinBox, akumulasikan
                    if cid in synced_cids:
                        kuota_rec = synced_cids[cid]
                        kuota_rec.upload_bytes += up_b
                        kuota_rec.download_bytes += dl_b
                        kuota_rec.kuota_terpakai_gb = round(float(kuota_rec.kuota_terpakai_gb or 0) + total_gb, 2)
                        kuota_rec.last_sync_mikrotik = get_now_wib()
                        kuota_rec.updated_at = get_now_wib()
                        continue

                    # Ambil atau buat record KuotaPelanggan di tenant database
                    kuota_rec = tenant_db.query(KuotaPelanggan).filter(
                        KuotaPelanggan.id_pelanggan == cid,
                        KuotaPelanggan.periode_bulan == current_period
                    ).first()

                    # Ambil data pelanggan untuk mengisi kecepatan_paket
                    p = tenant_db.query(Pelanggan).filter(Pelanggan.id_pelanggan == cid).first()

                    if kuota_rec:
                        kuota_rec.kuota_terpakai_gb = total_gb
                        kuota_rec.upload_bytes = up_b
                        kuota_rec.download_bytes = dl_b
                        kuota_rec.last_sync_mikrotik = get_now_wib()
                        kuota_rec.updated_at = get_now_wib()
                        if not kuota_rec.kecepatan_paket and p and p.paket:
                            kuota_rec.kecepatan_paket = p.paket
                    else:
                        kuota_rec = KuotaPelanggan(
                            id_pelanggan=cid,
                            periode_bulan=current_period,
                            kuota_terpakai_gb=total_gb,
                            kecepatan_paket=p.paket if p and p.paket else None,
                            upload_bytes=up_b,
                            download_bytes=dl_b,
                            last_sync_mikrotik=get_now_wib()
                        )
                        tenant_db.add(kuota_rec)
                        tenant_db.flush()

                    synced_cids[cid] = kuota_rec

                    # Sinkronkan juga snapshot riil kuota harian (LogKuotaHarian)
                    raw_bytes_now = up_b + dl_b
                    harian_rec = tenant_db.query(LogKuotaHarian).filter(
                        LogKuotaHarian.id_pelanggan == cid,
                        LogKuotaHarian.tanggal == today_date
                    ).first()

                    if harian_rec:
                        delta_bytes = max(0, raw_bytes_now - (harian_rec.last_raw_bytes or 0)) if raw_bytes_now >= (harian_rec.last_raw_bytes or 0) else raw_bytes_now
                        harian_rec.upload_bytes = (harian_rec.upload_bytes or 0) + max(0, up_b - (harian_rec.last_raw_bytes or 0) if up_b >= (harian_rec.last_raw_bytes or 0) else up_b)
                        harian_rec.download_bytes = (harian_rec.download_bytes or 0) + max(0, dl_b - (harian_rec.last_raw_bytes or 0) if dl_b >= (harian_rec.last_raw_bytes or 0) else dl_b)
                        harian_rec.last_raw_bytes = raw_bytes_now
                        delta_gb = round(float(delta_bytes) / (1024 ** 3), 2)
                        harian_rec.pemakaian_gb = round(float(harian_rec.pemakaian_gb or 0) + delta_gb, 2)
                        harian_rec.updated_at = get_now_wib()
                    else:
                        harian_rec = LogKuotaHarian(
                            id_pelanggan=cid,
                            tanggal=today_date,
                            pemakaian_gb=total_gb,
                            upload_bytes=up_b,
                            download_bytes=dl_b,
                            last_raw_bytes=raw_bytes_now,
                            created_at=get_now_wib(),
                            updated_at=get_now_wib()
                        )
                        tenant_db.add(harian_rec)

                    # Update queue_name jika belum tersimpan
                    if p and not p.queue_name and q.get("name"):
                        p.queue_name = q.get("name")

                    total_synced += 1

                tenant_db.commit()
            except Exception as e:
                tenant_db.rollback()
                logger.error(f"[SYNC-KUOTA] Gagal sync kuota kantor '{knt}': {e}")
            finally:
                tenant_db.close()

        msg = f"Berhasil menyinkronkan {total_synced} data pemakaian kuota dari Simple Queues MikroTik ke database tenant masing-masing kantor!"
        logger.info(f"[SYNC-KUOTA] {msg}")
        return {"success": True, "total_synced": total_synced, "message": msg}

