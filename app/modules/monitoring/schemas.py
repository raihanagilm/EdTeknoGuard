from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ToggleSchedulerRequest(BaseModel):
    status: Optional[str] = Field(None, description="Status target: RUNNING atau STOPPED")
    kantor: Optional[str] = Field(None, description="Kode kantor target (opsional)")

class ScanTriggerRequest(BaseModel):
    kantor: Optional[str] = Field(None, description="Kode kantor target scan (opsional)")

class SingleProbeResult(BaseModel):
    id_pelanggan: str
    nama: Optional[str] = None
    rx_power: Optional[float] = None
    suhu_ont: Optional[float] = None
    status: Optional[str] = None
    mac_address: Optional[str] = None
    nama_wifi: Optional[str] = None
    password_wifi: Optional[str] = None
    status_kredensial: Optional[str] = None
    latency_ms: Optional[float] = None
    waktu_cek: Optional[str] = None

class ScanProgressData(BaseModel):
    current: int = 0
    total: int = 0
    percent: int = 0
    is_scanning: bool = False
    is_paused: bool = False
    elapsed_seconds: int = 0
    estimated_total_seconds: int = 0
    last_scan_duration: int = 0
    target_kantor: str = "all"

class MonitoringStatusResponse(BaseModel):
    scheduler_status: str
    interval_minutes: int
    is_office_active: bool = True
    is_configured: bool = True
    missing_fields: List[str] = []
    config_error: Optional[str] = None
    last_scan_time: Optional[str] = "-"
    next_run_time: Optional[str] = "-"
    is_scanning: bool = False
    scan_progress: Optional[ScanProgressData] = None
    unread_tickets_count: int = 0

class KPIMetricsResponse(BaseModel):
    total_monitored: int = 0
    normal: int = 0
    warning: int = 0
    critical: int = 0
    los: int = 0
    invalid: int = 0
    monitored_inactive: int = 0
    warning_threshold: float = -26.0
    critical_threshold: float = -27.0

