"""
app/modules/billing/schemas.py - Skema data Pydantic untuk modul Pembayaran Admin NOC
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class BillingSyncSingleRequest(BaseModel):
    id_pelanggan: str

class BillingBulkReminderRequest(BaseModel):
    id_pelanggan_list: List[str] = Field(default_factory=list, description="Daftar ID pelanggan yang akan dikirimi pengingat")
    kantor: Optional[str] = None
    pesan_kustom: Optional[str] = None
    kirim_fcm: bool = True
    kirim_wa: bool = True

class BillingStatusSummary(BaseModel):
    total_pelanggan: int = 0
    total_lunas: int = 0
    total_belum_bayar: int = 0
    total_overdue: int = 0
    total_nominal_tunggakan: float = 0.0
    terakhir_sinkron: Optional[str] = None
    sinkron_sedang_berjalan: bool = False
    progress_sinkron: Optional[Dict[str, Any]] = None
