import random
import time
from typing import Optional, Dict, Any
from app.core.config import settings

# Pemetaan OID berdasarkan Merek ONT
OID_MAP = {
    "HUAWEI": "1.3.6.1.4.1.2011.6.128.1.1.2.43.1.9",
    "ZTE": "1.3.6.1.4.1.3902.1012.3.50.1.1.2",
    "FIBERHOME": "1.3.6.1.4.1.5888.1.1.2.1.1.1",
    "GM220-S": "1.3.6.1.4.1.5888.1.1.2.1.1.1",
    "GM220-S XPON": "1.3.6.1.4.1.5888.1.1.2.1.1.1",
    "G609-XPON": "1.3.6.1.4.1.5888.1.1.2.1.1.1",
    "ZL-2113X": "1.3.6.1.4.1.3902.1012.3.50.1.1.2"
}

class SNMPService:

    @staticmethod
    def get_oid_for_modem(modem_type: str) -> str:
        upper = (modem_type or "").upper()
        for key, oid in OID_MAP.items():
            if key in upper:
                return oid
        return OID_MAP["GM220-S"]

    @classmethod
    def query_ont_live(cls, ip: str, community: str, modem_type: str) -> Optional[Dict[str, Any]]:
        """Mengeksekusi penarikan data SNMP nyata via jaringan"""
        try:
            import importlib
            pysnmp_hlapi = importlib.import_module("pysnmp.hlapi")
            getCmd = pysnmp_hlapi.getCmd
            SnmpEngine = pysnmp_hlapi.SnmpEngine
            CommunityData = pysnmp_hlapi.CommunityData
            UdpTransportTarget = pysnmp_hlapi.UdpTransportTarget
            ContextData = pysnmp_hlapi.ContextData
            ObjectType = pysnmp_hlapi.ObjectType
            ObjectIdentity = pysnmp_hlapi.ObjectIdentity

            oid = cls.get_oid_for_modem(modem_type)
            start_t = time.time()
            errorIndication, errorStatus, errorIndex, varBinds = next(
                getCmd(
                    SnmpEngine(),
                    CommunityData(community or "public", mpModel=1), # SNMP v2c
                    UdpTransportTarget((ip, 161), timeout=2, retries=1),
                    ContextData(),
                    ObjectType(ObjectIdentity(oid))
                )
            )
            latency = int((time.time() - start_t) * 1000)

            if errorIndication or errorStatus:
                return None  # Timeout / LOS

            for varBind in varBinds:
                raw_val = float(varBind[1])
                # Huawei menyimpan -24.50 sebagai -2450
                if "HUAWEI" in modem_type.upper() and raw_val < -100:
                    rx_power = round(raw_val / 100.0, 2)
                else:
                    rx_power = round(raw_val, 2)
                
                return {
                    "rx_power": rx_power,
                    "suhu_ont": 45.0,
                    "uptime": 86400,
                    "latency_ms": latency,
                    "status_koneksi": cls.determine_status(rx_power)
                }
        except Exception:
            return None

    @classmethod
    def query_ont_simulated(
        cls,
        baseline_rx: Optional[float],
        modem_type: str,
        ip: Optional[str] = None,
        customer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Mode simulasi realistis untuk pengujian di luar jaringan VPN ISP"""
        # 3% chance LOS (simulasi modem mati/kabel putus)
        if random.random() < 0.03:
            return {
                "rx_power": None,
                "suhu_ont": None,
                "uptime": None,
                "latency_ms": None,
                "status_koneksi": "LOS"
            }

        base = float(baseline_rx) if baseline_rx is not None else -21.5
        # Fluktuasi kecil normal
        delta = random.gauss(0, 0.4)
        
        # 10% chance lonjakan penurunan sinyal (warning testing)
        if random.random() < 0.10:
            delta -= random.uniform(3.5, 6.0)

        rx = round(base + delta, 2)
        status = cls.determine_status(rx)
        suhu = round(random.uniform(41.5, 48.0), 1)
        uptime = random.randint(3600, 1200000)
        latency = random.randint(3, 25)

        # Generate MAC Address OUI ZTE realistis
        if ip:
            octets = [int(o) for o in ip.split('.') if o.isdigit()]
            hex_tail = ":".join(f"{b:02X}" for b in octets[-3:]) if len(octets) >= 3 else "0A:0B:0C"
            sim_mac = f"48:D2:42:{hex_tail}"
        else:
            sim_mac = f"48:D2:42:{random.randint(10,99):02X}:{random.randint(10,99):02X}:{random.randint(10,99):02X}"

        clean_name = "".join(filter(str.isalnum, customer_name or "Home"))[:10]
        sim_ssid = f"EdTekno_{clean_name}"
        sim_pass = f"wifi{clean_name.lower()}123"

        return {
            "rx_power": rx,
            "suhu_ont": suhu,
            "uptime": uptime,
            "latency_ms": latency,
            "status_koneksi": status,
            "mac_address": sim_mac,
            "nama_wifi": sim_ssid,
            "password_wifi": sim_pass
        }

    @classmethod
    def query_ont(cls, ip: str, community: str, modem_type: str, baseline_rx: Optional[float] = None) -> Dict[str, Any]:
        """Entry point terpadu query ONT (otomatis switch simulasi vs live)"""
        if settings.SNMP_SIMULATION_MODE:
            return cls.query_ont_simulated(baseline_rx, modem_type, ip=ip)
        else:
            live_result = cls.query_ont_live(ip, community, modem_type)
            if live_result is None:
                return {
                    "rx_power": None,
                    "suhu_ont": None,
                    "uptime": None,
                    "latency_ms": None,
                    "status_koneksi": "LOS"
                }
            return live_result

    @staticmethod
    def determine_status(rx_power: Optional[float]) -> str:
        if rx_power is None:
            return "LOS"
        if rx_power <= settings.CRITICAL_THRESHOLD_DBM:
            return "CRITICAL"
        if rx_power <= settings.WARNING_THRESHOLD_DBM:
            return "WARNING"
        return "NORMAL"
