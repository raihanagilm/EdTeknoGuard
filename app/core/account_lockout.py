"""
app/core/account_lockout.py - Layanan Penguncian Akun Berdasarkan Identifier (Account Lockout)

Melindungi sistem dari serangan brute force dan credential stuffing terdistribusi
(seperti script bot dengan rotasi IP proxy) dengan mengunci akun sementara
berdasarkan identifier (Nomor WhatsApp / Username) jika gagal berturut-turut.
"""
import time
import re
import threading
from typing import Tuple, Dict, Any


class AccountLockoutManager:
    """
    In-memory account lockout tracker dengan thread-safety dan normalisasi nomor WhatsApp.
    Mencegah bypass rotasi format nomor telepon (+62, 62, 08, atau 8).
    """

    def __init__(
        self,
        max_attempts: int = 5,
        lockout_duration_seconds: int = 900,  # 15 menit
        attempt_window_seconds: int = 900     # 15 menit window
    ):
        self.max_attempts = max_attempts
        self.lockout_duration_seconds = lockout_duration_seconds
        self.attempt_window_seconds = attempt_window_seconds
        self._lock = threading.Lock()
        self._records: Dict[str, Dict[str, Any]] = {}
        self._last_cleanup = time.time()

    @staticmethod
    def normalize_identifier(identifier: str) -> str:
        """
        Menormalisasi identifier ke bentuk kanonikal:
        Nomor telepon Indonesia (0812..., 62812..., +62 812..., 812...)
        dinormalisasi ke key kanonikal tunggal 'tel:812...'.
        """
        if not identifier:
            return ""
        raw = str(identifier).strip()
        digits = re.sub(r"\D", "", raw)
        if len(digits) >= 6:
            if digits.startswith("62"):
                digits = digits[2:]
            elif digits.startswith("0"):
                digits = digits[1:]
            return f"tel:{digits}"
        return f"user:{raw.lower()}"

    def _cleanup_unlocked(self, now: float) -> None:
        """Pembersihan memori berkala setiap 5 menit."""
        if now - self._last_cleanup < 300:
            return
        keys_to_remove = []
        for key, data in self._records.items():
            locked_until = data.get("locked_until", 0)
            if locked_until <= now:
                attempts = [t for t in data.get("attempts", []) if now - t < self.attempt_window_seconds]
                if not attempts:
                    keys_to_remove.append(key)
                else:
                    data["attempts"] = attempts
                    data["locked_until"] = 0
        for k in keys_to_remove:
            self._records.pop(k, None)
        self._last_cleanup = now

    def is_locked(self, identifier: str) -> Tuple[bool, int]:
        """
        Memeriksa apakah identifier sedang dalam status terkunci.
        Mengembalikan: (is_locked: bool, remaining_seconds: int)
        """
        key = self.normalize_identifier(identifier)
        if not key:
            return False, 0

        with self._lock:
            now = time.time()
            self._cleanup_unlocked(now)

            record = self._records.get(key)
            if not record:
                return False, 0

            locked_until = record.get("locked_until", 0)
            if locked_until > now:
                return True, int(locked_until - now)

            # Jika masa penguncian telah usai, reset record
            if locked_until > 0 and locked_until <= now:
                record["locked_until"] = 0
                record["attempts"] = []
                return False, 0

            return False, 0

    def record_failure(self, identifier: str) -> Tuple[bool, int, int]:
        """
        Mencatat percobaan login gagal untuk identifier.
        Mengembalikan: (is_now_locked: bool, current_attempts: int, remaining: int)
        - Jika terkunci: remaining adalah sisa detik lockout.
        - Jika belum terkunci: remaining adalah sisa kesempatan percobaan sebelum terkunci.
        """
        key = self.normalize_identifier(identifier)
        if not key:
            return False, 0, self.max_attempts

        with self._lock:
            now = time.time()
            self._cleanup_unlocked(now)

            if key not in self._records:
                self._records[key] = {"attempts": [], "locked_until": 0}

            record = self._records[key]

            # Saring percobaan lama di luar jendela waktu
            threshold = now - self.attempt_window_seconds
            record["attempts"] = [t for t in record["attempts"] if t > threshold]
            record["attempts"].append(now)

            current_count = len(record["attempts"])
            if current_count >= self.max_attempts:
                record["locked_until"] = now + self.lockout_duration_seconds
                return True, current_count, self.lockout_duration_seconds
            else:
                remaining_attempts = max(0, self.max_attempts - current_count)
                return False, current_count, remaining_attempts

    def record_success(self, identifier: str) -> None:
        """Mereset status kegagalan dan membuka kunci setelah login sukses."""
        key = self.normalize_identifier(identifier)
        if not key:
            return

        with self._lock:
            self._records.pop(key, None)

    def unlock(self, identifier: str) -> None:
        """Membuka kunci akun secara eksplisit (misal setelah reset password)."""
        self.record_success(identifier)

    def reset_all(self) -> None:
        """Mereset seluruh data pelacakan (khusus unit testing)."""
        with self._lock:
            self._records.clear()


# Singleton instance global
account_lockout_manager = AccountLockoutManager(
    max_attempts=5,
    lockout_duration_seconds=900,  # 15 Menit
    attempt_window_seconds=900
)
