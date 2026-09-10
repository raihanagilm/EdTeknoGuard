from datetime import datetime
from app.db.models import Pelanggan, LogPerformaONT
from app.services.telegram_service import TelegramService

def test_telegram_message_formatting():
    cust = Pelanggan(
        id_pelanggan="2072026320",
        nama="Mas Andi",
        pop="Mini Klero",
        ip_router="10.10.2.15",
        jenis_modem="GM220-S XPON"
    )
    log = LogPerformaONT(
        rx_power=-27.45,
        status_koneksi="WARNING",
        waktu_cek=datetime(2026, 9, 10, 11, 45, 0)
    )

    msg = TelegramService.format_alert_message(cust, log)
    assert "Mas Andi" in msg
    assert "2072026320" in msg
    assert "Mini Klero" in msg
    assert "10.10.2.15" in msg
    assert "-27.45 dBm" in msg
    assert "-26.0" in msg
    assert "PERINGATAN REDAMAN DROP" in msg

def test_telegram_los_formatting():
    cust = Pelanggan(
        id_pelanggan="260620000000",
        nama="padil",
        pop="Server Cabang",
        ip_router="10.10.2.71",
        jenis_modem="GM220-S XPON"
    )
    log = LogPerformaONT(
        rx_power=None,
        status_koneksi="LOS",
        waktu_cek=datetime(2026, 9, 10, 11, 45, 0)
    )

    msg = TelegramService.format_alert_message(cust, log)
    assert "padil" in msg
    assert "LOSS OF SIGNAL" in msg
    assert "GANGGUAN LOS" in msg
