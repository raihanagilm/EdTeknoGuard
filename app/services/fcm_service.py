import os
import json
import logging
from typing import List, Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger("fcm_service")

SERVICE_ACCOUNT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "firebase-service-account.json"
)

_firebase_initialized = False

def initialize_firebase() -> bool:
    """Inisialisasi Firebase Admin SDK secara singleton"""
    global _firebase_initialized
    if _firebase_initialized:
        return True

    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        logger.warning(f"FCM: Berkas service account tidak ditemukan di {SERVICE_ACCOUNT_PATH}. Push notifikasi FCM dinonaktifkan.")
        return False

    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("FCM: Firebase Admin SDK berhasil diinisialisasi.")
        return True
    except ValueError:
        # App sudah pernah terinisialisasi sebelumnya
        _firebase_initialized = True
        return True
    except Exception as e:
        logger.error(f"FCM: Gagal inisialisasi Firebase Admin SDK: {e}")
        return False


def resolve_notification_audio_settings(
    db: Optional[Any] = None,
    kantor: Optional[str] = None,
    is_emergency: bool = True
) -> Dict[str, str]:
    """
    Menentukan channel_id, sound, dan vibration berdasarkan konfigurasi dinamis Jam Tenang (Night Mode)
    dan Getar (App Vibration) dari database system_settings.
    """
    from app.modules.settings.service import SystemSettingsService
    from app.core.timezone import get_now_wib
    from datetime import datetime

    session_to_close = None
    target_db = db

    if target_db is None:
        try:
            from app.core.tenant_database import TenantDatabaseManager
            target_db = TenantDatabaseManager.get_tenant_session(kantor)
            session_to_close = target_db
        except Exception as e:
            logger.debug(f"FCM: Tidak dapat membuka sesi tenant untuk kantor {kantor}: {e}")

    cfg: Dict[str, Any] = {}
    if target_db:
        try:
            cfg = SystemSettingsService.get_settings(target_db, kantor=kantor)
        except Exception as e:
            logger.debug(f"FCM: Gagal membaca setting audio dari database kantor {kantor}: {e}")
        finally:
            if session_to_close:
                try:
                    session_to_close.close()
                except Exception:
                    pass

    night_enabled = bool(cfg.get("night_mode_enabled", False))
    night_start = str(cfg.get("night_mode_start") or "22:00")
    night_end = str(cfg.get("night_mode_end") or "06:00")
    vibration_enabled = bool(cfg.get("app_vibration_enabled", True))

    now_time = get_now_wib().time()

    is_night_mode = False
    if night_enabled:
        try:
            t_start = datetime.strptime(night_start, "%H:%M").time()
            t_end = datetime.strptime(night_end, "%H:%M").time()
            if t_start <= t_end:
                is_night_mode = (t_start <= now_time <= t_end)
            else:
                is_night_mode = (now_time >= t_start or now_time <= t_end)
        except Exception:
            is_night_mode = False

    if is_night_mode:
        return {
            "channel_id": "tekno_silent_night_channel",
            "sound": "none",
            "vibration": "false",
            "is_night_mode": "true"
        }

    sound_val = "tekno_alarm" if is_emergency else "default"
    if vibration_enabled:
        channel_id = "tekno_emergency_v3_channel" if is_emergency else "tekno_customer_channel"
        vibration_val = "true"
    else:
        channel_id = "tekno_emergency_v3_no_vib_channel" if is_emergency else "tekno_customer_channel"
        vibration_val = "false"

    return {
        "channel_id": channel_id,
        "sound": sound_val,
        "vibration": vibration_val,
        "is_night_mode": "false"
    }


def send_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    channel_id: str = "tekno_emergency_v3_channel",
    sound: str = "tekno_alarm"
) -> int:
    """
    Mengirimkan push notification via FCM ke daftar device token.
    Menggunakan FCM Data Payload + Android Notification Config agar Heads-Up muncul
    bahkan saat aplikasi sedang ditutup / HP terkunci.
    """
    if not tokens:
        return 0

    if not initialize_firebase():
        return 0

    valid_tokens = [t.strip() for t in tokens if t and t.strip()]
    if not valid_tokens:
        return 0

    # Seluruh nilai payload data wajib bertipe string untuk kepatuhan FCM specification
    payload_data = {str(k): str(v) for k, v in (data or {}).items()}
    payload_data["title"] = str(title)
    payload_data["message"] = str(body)
    payload_data["channel_id"] = str(channel_id)
    payload_data["sound"] = str(sound)

    # Menggunakan High-Priority Data Message agar onMessageReceived di TeknoFirebaseMessagingService
    # SELALU dipanggil di semua kondisi (Foreground, Background, dan Killed/Layar Terkunci).
    # Ini memastikan Heads-up banner, custom ringtone (R.raw.tekno_alarm), avatar maskot/logo,
    # dan stableNotificationId anti-duplikasi berjalan 100% tanpa di-bypass oleh system tray OS.
    android_config = messaging.AndroidConfig(
        priority="high",
        data=payload_data
    )

    success_count = 0

    # Kirim per batch 500 token (standar FCM multicast)
    for i in range(0, len(valid_tokens), 500):
        chunk = valid_tokens[i:i + 500]
        try:
            multicast_message = messaging.MulticastMessage(
                tokens=chunk,
                data=payload_data,
                android=android_config
            )
            response = messaging.send_each_for_multicast(multicast_message)
            success_count += response.success_count
            logger.info(f"FCM: Terkirim {response.success_count}/{len(chunk)} pesan push.")
        except Exception as e:
            logger.error(f"FCM: Gagal mengirim batch multicast: {e}")

    return success_count

