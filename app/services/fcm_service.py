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

    payload_data = data or {}
    payload_data["title"] = title
    payload_data["message"] = body
    payload_data["channel_id"] = channel_id

    android_config = messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            title=title,
            body=body,
            icon="ic_launcher",
            color="#2563EB",
            sound=sound,
            channel_id=channel_id,
            priority="max",
            visibility="public"
        ),
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

