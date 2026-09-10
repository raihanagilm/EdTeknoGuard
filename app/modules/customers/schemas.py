from typing import Optional
from pydantic import BaseModel, Field

class CustomerBase(BaseModel):
    nama: str = Field(..., min_length=2, max_length=150, description="Nama lengkap pelanggan")
    alamat: Optional[str] = Field(None, description="Alamat pemasangan")
    no_hp: Optional[str] = Field(None, max_length=50, description="Nomor telepon/WhatsApp")
    pop: str = Field("Server Cabang", max_length=100, description="Point of Presence")
    ip_router: str = Field(..., description="Alamat IP ONT/Modem pelanggan")
    paket: Optional[str] = Field(None, max_length=50, description="Paket bandwidth")
    jenis_modem: str = Field("GM220-S", max_length=50, description="Tipe ONT / Modem")
    mac_address: Optional[str] = Field(None, max_length=30, description="MAC Address ONT")
    redaman_baseline: Optional[float] = Field(None, description="Redaman awal saat instalasi (dBm)")
    nama_wifi: Optional[str] = Field(None, max_length=100, description="SSID WiFi pelanggan")
    password_wifi: Optional[str] = Field(None, max_length=100, description="Password WiFi")
    user_admin: Optional[str] = Field("admin", max_length=50, description="Username admin web GUI modem")
    pass_admin: Optional[str] = Field(None, max_length=100, description="Password admin web GUI modem")
    snmp_community: Optional[str] = Field("public", max_length=50, description="SNMP Community String")

class CustomerCreate(CustomerBase):
    id_pelanggan: Optional[str] = Field(None, description="ID Pelanggan (otomatis di-generate jika kosong)")

class CustomerUpdate(BaseModel):
    nama: Optional[str] = Field(None, min_length=2, max_length=150)
    alamat: Optional[str] = None
    no_hp: Optional[str] = None
    pop: Optional[str] = None
    ip_router: Optional[str] = None
    paket: Optional[str] = None
    jenis_modem: Optional[str] = None
    mac_address: Optional[str] = None
    redaman_baseline: Optional[float] = None
    nama_wifi: Optional[str] = None
    password_wifi: Optional[str] = None
    user_admin: Optional[str] = None
    pass_admin: Optional[str] = None
    snmp_community: Optional[str] = None
    is_active: Optional[bool] = None

class BulkDeleteSchema(BaseModel):
    ids: list[str] = Field(..., description="Daftar ID pelanggan yang akan dihapus")
