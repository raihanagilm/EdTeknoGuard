"""
scheduler_service.py - Layanan Penjadwalan Pemantauan Berkala ONT
Menjalankan APScheduler (BackgroundScheduler) untuk pemantauan redaman optik berkala,
sinkronisasi interval, kontrol pause/resume/stop, serta pemulihan otomatis reboot.

Arsitektur Modular:
- app.services.scheduler.state_manager: Manajemen state pemindaian & file checkpoint
- app.services.scheduler.recovery_manager: Crash recovery, reboot catch-up, konfigurasi DB
- app.services.scheduler.scan_runner: Eksekutor batch scanning multi-threading & single probe
"""

import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import dateutil.parser
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timezone import get_now_wib
from app.db.models import Kantor
from app.core.tenant_database import TenantDatabaseManager
from app.services.scheduler.state_manager import SchedulerStateManager, OfficeScanState
from app.services.scheduler.recovery_manager import SchedulerRecoveryManager
from app.services.scheduler.scan_runner import ScanRunner

logger = logging.getLogger("scheduler_service")

class ONTSchedulerService:
    _instance = None

    # Forwarding helper methods untuk backward compatibility
    get_office_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.get_office_state(kantor))
    get_state_file_path = classmethod(lambda cls, kantor=None: SchedulerStateManager.get_state_file_path(kantor))
    save_scan_state = classmethod(lambda cls, curr, tot, kantor=None: SchedulerStateManager.save_scan_state(curr, tot, kantor))
    load_scan_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.load_scan_state(kantor))
    delete_scan_state = classmethod(lambda cls, kantor=None: SchedulerStateManager.delete_scan_state(kantor))
    cleanup_old_logs = classmethod(lambda cls, db, days=30: SchedulerStateManager.cleanup_old_logs(db, days))
    cleanup_alert_logs = classmethod(lambda cls, days=7: SchedulerStateManager.cleanup_alert_logs(days))
    cleanup_activity_logs = classmethod(lambda cls, days=60: SchedulerStateManager.cleanup_activity_logs(days))
    cleanup_old_tickets = classmethod(lambda cls, days=90: SchedulerStateManager.cleanup_old_tickets(days))
    get_setting_from_db = classmethod(lambda cls, db, key, default=None, kantor=None: SchedulerRecoveryManager.get_setting_from_db(db, key, default, kantor))
    set_setting_in_db = classmethod(lambda cls, db, key, val, kantor=None: SchedulerRecoveryManager.set_setting_in_db(db, key, val, kantor))
    check_office_configuration = classmethod(lambda cls, db, kantor=None: SchedulerRecoveryManager.check_office_configuration(db, kantor))
    check_office_connectivity = classmethod(lambda cls, db, kantor=None: ScanRunner.check_office_connectivity(db, kantor))
    scan_single = classmethod(lambda cls, id_pelanggan, db=None: ScanRunner.scan_single(id_pelanggan, db))
    execute_scan_sync = classmethod(lambda cls, kantor=None: ScanRunner.execute_scan_sync(kantor))

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ONTSchedulerService, cls).__new__(cls)
            cls._instance.scheduler = BackgroundScheduler(timezone="Asia/Jakarta", daemon=True)
            cls._instance.is_running = False
        return cls._instance

    def start(self):
        """Memulai background scheduler dan menjadwalkan interval scan reguler"""
        if self.is_running:
            return

        # Job Pemantauan Berkala Seluruh Kantor (Ticker 1 Menit yang mengecek interval masing-masing kantor secara independen)
        self.scheduler.add_job(
            self.scheduled_job_wrapper,
            "interval",
            minutes=1,
            id="ont_monitoring_scan",
            replace_existing=True
        )

        # Job Pengingat Notifikasi Darurat Berulang (Mengecek status masalah aktif & mengirim ulang notif tiap alert_waiting_interval_minutes)
        self.scheduler.add_job(
            self.emergency_alert_reminder_job_wrapper,
            "interval",
            minutes=1,
            id="emergency_alert_reminder",
            replace_existing=True
        )

        # Job Sinkronisasi MikroTik
        self.scheduler.add_job(
            self.mikrotik_sync_job_wrapper,
            "interval",
            minutes=3,
            id="mikrotik_auto_sync",
            replace_existing=True
        )

        # Job Pengingat Tagihan Harian Tiap Jam 10:00 WIB
        self.scheduler.add_job(
            self.daily_billing_reminder_job_wrapper,
            "cron",
            hour=10,
            minute=0,
            id="daily_billing_reminder",
            replace_existing=True
        )

        # Job Pembersihan Tiket SELESAI (> 90 hari / 3 bulan) & Log Lama Harian Tiap Jam 01:00 WIB
        self.scheduler.add_job(
            self.daily_maintenance_cleanup_job_wrapper,
            "cron",
            hour=1,
            minute=0,
            id="daily_maintenance_cleanup",
            replace_existing=True
        )

        self.scheduler.start()
        self.is_running = True
        logger.info("[SCHEDULER] Engine APScheduler berhasil diaktifkan (Ticker 1 Menit untuk Multi-Kantor).")

        # Startup recovery & catch-up scan
        SchedulerRecoveryManager.handle_startup_recovery(self)

    def scheduled_job_wrapper(self):
        """Wrapper job yang memindai kantor aktif secara independen sesuai interval masing-masing kantor"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            codes = [k.kode for k in kantors]
        finally:
            m_db.close()

        now = get_now_wib()
        for k in codes:
            try:
                state = SchedulerStateManager.get_office_state(k)
                if state.is_scanning:
                    continue

                # Periksa apakah kantor di-pause di DB atau sudah jatuh tempo pemindaian berikutnya
                t_db = TenantDatabaseManager.get_tenant_session(k)
                try:
                    status = SchedulerRecoveryManager.get_setting_from_db(t_db, "scheduler_status", default="RUNNING", kantor=k)
                    if status != "RUNNING":
                        # Throttle pengingat jeda agar HANYA dikirim 1 jam sekali saja
                        last_reminder_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "last_paused_reminder_at", default=None, kantor=k)
                        should_send = True
                        if last_reminder_str:
                            try:
                                import dateutil.parser
                                from app.core.timezone import to_wib
                                last_dt = to_wib(dateutil.parser.parse(last_reminder_str))
                                diff_mins = (now - last_dt).total_seconds() / 60.0
                                if diff_mins < 60.0:
                                    should_send = False
                            except Exception:
                                should_send = True

                        if should_send:
                            # Push pengingat terjeda berkala ke admin / teknisi kantor terkait (Format Ringkas, 1 Jam Sekali)
                            try:
                                from app.services.fcm_service import resolve_notification_audio_settings, send_push_notification
                                from app.core.database import SessionLocal as MasterSessionLocal
                                from app.db.models import User as MasterUser

                                audio_settings = resolve_notification_audio_settings(t_db, kantor=k, is_emergency=True)
                                m_db_user = MasterSessionLocal()
                                try:
                                    users = m_db_user.query(MasterUser).filter(
                                        MasterUser.is_active == True,
                                        MasterUser.fcm_token != None,
                                        MasterUser.fcm_token != ""
                                    ).all()
                                    pause_tokens = []
                                    for u in users:
                                        if u.role == "super admin":
                                            pause_tokens.append(u.fcm_token)
                                        elif k.lower() in [ak.lower() for ak in u.allowed_kantor_list]:
                                            pause_tokens.append(u.fcm_token)
                                    pause_tokens = list(set(pause_tokens))
                                    if pause_tokens:
                                        send_push_notification(
                                            tokens=pause_tokens,
                                            title=f"[SCHEDULER] Kantor: {k.upper()}",
                                            body=f"Status {status}. Segera aktifkan.",
                                            data={
                                                "target_tab": "pengaturan",
                                                "target_kantor": k,
                                                "level": "warning",
                                                "type": "scheduler_paused_reminder",
                                                "vibration": audio_settings["vibration"]
                                            },
                                            channel_id=audio_settings["channel_id"],
                                            sound=audio_settings["sound"]
                                        )
                                        # Simpan timestamp pengingat agar tidak terulang sebelum 1 jam
                                        SchedulerRecoveryManager.set_setting_in_db(t_db, "last_paused_reminder_at", now.strftime("%Y-%m-%d %H:%M:%S"), kantor=k)
                                finally:
                                    m_db_user.close()
                            except Exception as p_err:
                                logger.warning(f"[SCHEDULER_PAUSED_REMINDER] Gagal kirim pengingat pause kantor {k}: {p_err}")
                        continue

                    # Kantor berstatus RUNNING: Evaluasi apakah sudah saatnya memindai berdasarkan interval kantor
                    interval_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "polling_interval_minutes", default=None, kantor=k)
                    try:
                        interval_mins = int(interval_str) if interval_str else int(settings.POLLING_INTERVAL_MINUTES or 5)
                    except (ValueError, TypeError):
                        interval_mins = 5

                    last_scan_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "last_scan_time", default=None, kantor=k)
                    is_due = True
                    if last_scan_str:
                        try:
                            import dateutil.parser
                            from app.core.timezone import to_wib
                            last_scan_dt = to_wib(dateutil.parser.parse(last_scan_str))
                            elapsed_mins = (now - last_scan_dt).total_seconds() / 60.0
                            if elapsed_mins < interval_mins:
                                is_due = False
                        except Exception as e:
                            logger.debug(f"[SCHEDULER] Gagal parse last_scan_time kantor {k}: {e}")
                            is_due = True

                    if not is_due:
                        continue
                finally:
                    t_db.close()

                ScanRunner.execute_scan_sync(kantor=k)
            except Exception as e:
                logger.error(f"[SCHEDULER] Gagal menjalankan scan otomatis kantor '{k}': {e}")

    def emergency_alert_reminder_job_wrapper(self):
        """Memeriksa status redaman/LOS terakhir di database per kantor dan mengulang pengiriman push notifikasi secara berkala sesuai alert_waiting_interval_minutes tanpa scan ulang"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            codes = [k.kode for k in kantors]
        finally:
            m_db.close()

        now = get_now_wib()
        for k in codes:
            try:
                state = SchedulerStateManager.get_office_state(k)
                if state.is_scanning:
                    continue

                t_db = TenantDatabaseManager.get_tenant_session(k)
                try:
                    # 1. Baca interval pengingat dari database (default 10 menit)
                    wait_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "alert_waiting_interval_minutes", default="10", kantor=k)
                    try:
                        alert_interval_mins = int(wait_str) if wait_str else 10
                    except (ValueError, TypeError):
                        alert_interval_mins = 10

                    if alert_interval_mins < 1:
                        alert_interval_mins = 10

                    # 2. Cek kapan terakhir kali alert darurat dikirim
                    last_alert_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "last_emergency_alert_at", default=None, kantor=k)
                    if last_alert_str:
                        try:
                            import dateutil.parser
                            from app.core.timezone import to_wib
                            last_alert_dt = to_wib(dateutil.parser.parse(last_alert_str))
                            diff_mins = (now - last_alert_dt).total_seconds() / 60.0
                            if diff_mins < alert_interval_mins:
                                # Belum saatnya mengulang pengingat
                                continue
                        except Exception as e:
                            logger.debug(f"[EMERGENCY_REMINDER] Gagal parse last_emergency_alert_at {k}: {e}")

                    # 3. Hitung jumlah modem LOS dan Kritis yang tersimpan pada hasil scan terakhir
                    from app.db.models import Pelanggan, LogPerformaONT
                    from sqlalchemy import func

                    subq = (
                        t_db.query(
                            LogPerformaONT.id_pelanggan,
                            func.max(LogPerformaONT.id_log).label("max_id")
                        )
                        .join(Pelanggan, Pelanggan.id_pelanggan == LogPerformaONT.id_pelanggan)
                        .filter(
                            Pelanggan.is_active == True,
                            Pelanggan.is_monitored == True
                        )
                        .group_by(LogPerformaONT.id_pelanggan)
                        .subquery()
                    )

                    latest_problem_logs = (
                        t_db.query(LogPerformaONT)
                        .join(subq, LogPerformaONT.id_log == subq.c.max_id)
                        .filter(LogPerformaONT.status_koneksi.in_(["LOS", "CRITICAL"]))
                        .all()
                    )

                    los_count = sum(1 for l in latest_problem_logs if l.status_koneksi == "LOS")
                    crit_count = sum(1 for l in latest_problem_logs if l.status_koneksi == "CRITICAL")

                    if los_count == 0 and crit_count == 0:
                        # Tidak ada kendala darurat aktif
                        continue

                    # 4. Kirim Push Notification Pengingat Berulang ke Tim Teknisi & Admin (LOS dan KRITIS Keduanya Wajib Dikirim jika Ada)
                    from app.services.fcm_service import resolve_notification_audio_settings, send_push_notification
                    from app.core.database import SessionLocal as MasterSessionLocal
                    from app.db.models import User as MasterUser

                    audio_settings = resolve_notification_audio_settings(kantor=k, is_emergency=True)
                    m_db_user = MasterSessionLocal()
                    try:
                        users = m_db_user.query(MasterUser).filter(
                            MasterUser.is_active == True,
                            MasterUser.fcm_token != None,
                            MasterUser.fcm_token != ""
                        ).all()
                        alert_tokens = []
                        for u in users:
                            if u.role == "super admin":
                                alert_tokens.append(u.fcm_token)
                            elif k.lower() in [k_item.lower() for k_item in u.allowed_kantor_list]:
                                alert_tokens.append(u.fcm_token)
                        alert_tokens = list(set(alert_tokens))

                        if alert_tokens:
                            if los_count > 0:
                                title = f"[PENGINGAT LOS] Kantor: {k.upper()}"
                                body = f"Perhatian: {los_count} modem masih LOS (terputus). Segera lakukan pengecekan fisik kabel."
                                send_push_notification(
                                    tokens=alert_tokens,
                                    title=title,
                                    body=body,
                                    data={
                                        "target_tab": "pelanggan",
                                        "target_kantor": k,
                                        "target_status": "LOS",
                                        "level": "los",
                                        "type": "monitoring_los_reminder",
                                        "vibration": audio_settings["vibration"]
                                    },
                                    channel_id=audio_settings["channel_id"],
                                    sound=audio_settings["sound"]
                                )

                            if crit_count > 0:
                                title = f"[PENGINGAT KRITIS] Kantor: {k.upper()}"
                                body = f"Perhatian: {crit_count} modem masih berstatus Kritis (<= -27.0 dBm). Segera cek redaman."
                                send_push_notification(
                                    tokens=alert_tokens,
                                    title=title,
                                    body=body,
                                    data={
                                        "target_tab": "pelanggan",
                                        "target_kantor": k,
                                        "target_status": "CRITICAL",
                                        "level": "critical",
                                        "type": "monitoring_critical_reminder",
                                        "vibration": audio_settings["vibration"]
                                    },
                                    channel_id=audio_settings["channel_id"],
                                    sound=audio_settings["sound"]
                                )

                            # 5. Perbarui timestamp alert darurat terakhir di database
                            SchedulerRecoveryManager.set_setting_in_db(t_db, "last_emergency_alert_at", now.isoformat(), kantor=k)
                            logger.info(f"[EMERGENCY_REMINDER] Berhasil mengirimkan pengulangan notifikasi darurat kantor {k} (LOS: {los_count}, Kritis: {crit_count}).")
                    finally:
                        m_db_user.close()

                    # 6. Pengingat Berkala Tiket Kendala + Permintaan Reset / Lupa Password (Wajib Dikirim Setiap 1 Jam jika masih MENUNGGU)
                    try:
                        from app.db.models import TiketKendala
                        pending_tickets = t_db.query(TiketKendala).filter(
                            TiketKendala.status == "MENUNGGU"
                        ).all()
                        pending_count = len(pending_tickets)

                        if pending_count > 0:
                            last_ticket_alert_str = SchedulerRecoveryManager.get_setting_from_db(t_db, "last_pending_ticket_alert_at", default=None, kantor=k)
                            should_send_ticket_reminder = True
                            if last_ticket_alert_str:
                                try:
                                    import dateutil.parser
                                    from app.core.timezone import to_wib
                                    last_ticket_alert_dt = to_wib(dateutil.parser.parse(last_ticket_alert_str))
                                    ticket_diff_mins = (now - last_ticket_alert_dt).total_seconds() / 60.0
                                    if ticket_diff_mins < 60.0:
                                        should_send_ticket_reminder = False
                                except Exception:
                                    should_send_ticket_reminder = True

                            if should_send_ticket_reminder:
                                reset_pw_count = sum(1 for t in pending_tickets if t.kategori == "RESET_PASSWORD")
                                normal_issue_count = pending_count - reset_pw_count

                                ticket_body_parts = []
                                if normal_issue_count > 0:
                                    ticket_body_parts.append(f"{normal_issue_count} kendala")
                                if reset_pw_count > 0:
                                    ticket_body_parts.append(f"{reset_pw_count} reset password")

                                ticket_body_text = f"{pending_count} tiket MENUNGGU ({', '.join(ticket_body_parts)}) belum ada tindakan teknisi."

                                m_db_tkt = MasterSessionLocal()
                                try:
                                    tkt_users = m_db_tkt.query(MasterUser).filter(
                                        MasterUser.is_active == True,
                                        MasterUser.fcm_token != None,
                                        MasterUser.fcm_token != ""
                                    ).all()
                                    tkt_tokens = []
                                    for u in tkt_users:
                                        if u.role == "super admin":
                                            tkt_tokens.append(u.fcm_token)
                                        elif k.lower() in [k_item.lower() for k_item in u.allowed_kantor_list]:
                                            tkt_tokens.append(u.fcm_token)
                                    tkt_tokens = list(set(tkt_tokens))

                                    if tkt_tokens:
                                        send_push_notification(
                                            tokens=tkt_tokens,
                                            title=f"[PENGINGAT TIKET] Kantor: {k.upper()}",
                                            body=ticket_body_text,
                                            data={
                                                "target_tab": "tiket",
                                                "target_kantor": k,
                                                "target_status": "MENUNGGU",
                                                "level": "warning",
                                                "type": "ticket_pending_hourly_reminder",
                                                "vibration": audio_settings["vibration"]
                                            },
                                            channel_id=audio_settings["channel_id"],
                                            sound=audio_settings["sound"]
                                        )
                                        SchedulerRecoveryManager.set_setting_in_db(t_db, "last_pending_ticket_alert_at", now.isoformat(), kantor=k)
                                        logger.info(f"[TICKET_REMINDER] Berhasil mengirimkan pengingat 1 jam tiket kendala kantor {k} ({pending_count} tiket).")
                                finally:
                                    m_db_tkt.close()
                    except Exception as ticket_err:
                        logger.warning(f"[TICKET_REMINDER] Gagal memproses pengingat tiket kantor {k}: {ticket_err}")
                finally:
                    t_db.close()
            except Exception as e:
                logger.error(f"[EMERGENCY_REMINDER] Error memeriksa pengulangan alert kantor {k}: {e}")

    def mikrotik_sync_job_wrapper(self):
        """Wrapper sinkronisasi berkala MikroTik per kantor"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                if k.mikrotik_host and k.mikrotik_user:
                    try:
                        from app.services.mikrotik_service import MikroTikSyncService
                        params = {
                            "host": k.mikrotik_host,
                            "port": k.mikrotik_port or 8728,
                            "username": k.mikrotik_user,
                            "password": k.mikrotik_pass or "",
                            "kantor": k.kode
                        }
                        t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                        try:
                            MikroTikSyncService.sync_customers_from_mikrotik(t_db, params)
                        finally:
                            t_db.close()
                    except Exception as e:
                        logger.debug(f"[MIKROTIK_SYNC] Gagal auto-sync kantor {k.nama}: {e}")
        finally:
            m_db.close()

    def daily_billing_reminder_job_wrapper(self):
        """Menjalankan pemeriksaan pengingat harian tagihan yang belum lunas (jam 10:00 WIB)"""
        m_db = TenantDatabaseManager.get_tenant_session(None)
        try:
            kantors = m_db.query(Kantor).filter(Kantor.is_active == True).all()
            for k in kantors:
                try:
                    t_db = TenantDatabaseManager.get_tenant_session(k.kode)
                    try:
                        from app.db.models import Pelanggan
                        from app.services.fcm_service import send_push_notification

                        unpaid_customers = t_db.query(Pelanggan).filter(
                            (Pelanggan.status_pembayaran == 'BELUM_BAYAR')
                        ).all()
                        logger.info(f"[BILLING_REMINDER] Kantor {k.nama}: {len(unpaid_customers)} pelanggan belum lunas tercatat pada audit harian.")

                        unpaid_tokens = [p.fcm_token.strip() for p in unpaid_customers if p.fcm_token and p.fcm_token.strip()]
                        if unpaid_tokens:
                            try:
                                send_push_notification(
                                    tokens=unpaid_tokens,
                                    title="Pengingat Tagihan Internet",
                                    body="Tagihan internet bulanan Anda telah jatuh tempo. Mohon lakukan pembayaran agar layanan tetap aktif dan lancar.",
                                    data={
                                        "target_tab": "pembayaran",
                                        "level": "warning",
                                        "type": "billing_reminder"
                                    },
                                    channel_id="tekno_customer_channel"
                                )
                                logger.info(f"[BILLING_REMINDER] Berhasil kirim pengingat tagihan ke {len(unpaid_tokens)} pelanggan via FCM.")
                            except Exception as fcm_err:
                                logger.warning(f"[BILLING_REMINDER] Gagal push notifikasi tagihan: {fcm_err}")
                    finally:
                        t_db.close()
                except Exception as e:
                    logger.debug(f"[BILLING_REMINDER] Error periksa tagihan kantor {k.nama}: {e}")
        finally:
            m_db.close()

    def daily_maintenance_cleanup_job_wrapper(self):
        """Menjalankan pembersihan otomatis berkala: tiket selesai > 90 hari, alert logs > 7 hari, logs ont > 30 hari"""
        logger.info("[MAINTENANCE_CLEANUP] Memulai pembersihan berkala sistem...")
        try:
            # 1. Hapus tiket kendala SELESAI yang berusia lebih dari 90 hari (3 bulan)
            del_tickets = SchedulerStateManager.cleanup_old_tickets(days=90)
            # 2. Hapus alert logs yang berusia lebih dari 7 hari
            del_alerts = SchedulerStateManager.cleanup_alert_logs(days=7)
            # 3. Hapus user activity logs yang berusia lebih dari 60 hari
            del_activities = SchedulerStateManager.cleanup_activity_logs(days=60)
            logger.info(
                f"[MAINTENANCE_CLEANUP] Pembersihan selesai: "
                f"{del_tickets} tiket SELESAI (> 90 hari), "
                f"{del_alerts} alert logs (> 7 hari), "
                f"{del_activities} audit logs (> 60 hari)."
            )
        except Exception as e:
            logger.error(f"[MAINTENANCE_CLEANUP] Terjadi kendala saat pembersihan berkala: {e}")

    def update_interval(self, minutes: int, kantor: Optional[str] = None):
        """Mengubah interval menit pemantauan mandiri untuk kantor cabang tertentu di database"""
        if minutes < 1:
            minutes = 1

        k_code = (kantor or "cabang").lower().strip()
        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "polling_interval_minutes", str(minutes), kantor=k_code)
            logger.info(f"[SCHEDULER] Interval pemantauan kantor '{k_code}' diperbarui menjadi {minutes} menit di database.")
        finally:
            db.close()

    def stop(self, kantor: Optional[str] = None):
        """Menghentikan / menjeda pemantauan otomatis"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = True

        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_status", "STOPPED", kantor=k_code)
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_paused_at", get_now_wib().isoformat(), kantor=k_code)
        finally:
            db.close()

    def resume(self, kantor: Optional[str] = None):
        """Melanjutkan pemantauan otomatis"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = False

        db = TenantDatabaseManager.get_tenant_session(k_code)
        try:
            SchedulerRecoveryManager.set_setting_in_db(db, "scheduler_status", "RUNNING", kantor=k_code)
        finally:
            db.close()

    def pause_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = True
        return {"success": True, "message": f"Pemindaian kantor {k_code} dijeda sementara."}

    def resume_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_paused = False
        return {"success": True, "message": f"Pemindaian kantor {k_code} dilanjutkan."}

    def stop_scan(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)
        state.is_stopped = True
        state.is_paused = False
        return {"success": True, "message": f"Pemindaian kantor {k_code} dihentikan."}

    def check_paused_reminder(self, db: Session) -> Optional[Dict[str, Any]]:
        return None

    def snooze_paused_reminder(self, db: Session):
        pass

    def get_status(self, kantor: Optional[str] = None) -> Dict[str, Any]:
        """Mengambil ringkasan status scheduler dan checkpoint pemantauan kantor"""
        k_code = (kantor or "cabang").lower().strip()
        state = SchedulerStateManager.get_office_state(k_code)

        db = TenantDatabaseManager.get_tenant_session(k_code)
        is_office_active = True
        last_scan_dt: Optional[datetime] = None
        try:
            cfg = SchedulerRecoveryManager.check_office_configuration(db, kantor=k_code)

            # 1. Tentukan waktu selesai pemantauan terakhir:
            # Prioritas 1: State in-memory (jika pemindaian baru saja berjalan di sesi server ini)
            if state.last_scan_time:
                last_scan_dt = state.last_scan_time
            else:
                # Prioritas 2: Baca setting 'last_scan_time' dari tabel system_settings
                db_last_scan = SchedulerRecoveryManager.get_setting_from_db(db, "last_scan_time", kantor=k_code)
                if db_last_scan and db_last_scan != "-":
                    try:
                        last_scan_dt = dateutil.parser.parse(db_last_scan)
                    except Exception:
                        pass
                # Prioritas 3: Fallback ke timestamp waktu_cek log_performa_ont terakhir di DB
                if not last_scan_dt:
                    from app.db.models import LogPerformaONT
                    latest_log = db.query(LogPerformaONT.waktu_cek).order_by(LogPerformaONT.waktu_cek.desc()).first()
                    if latest_log and latest_log[0]:
                        last_scan_dt = latest_log[0]

            # 2. Cek status aktif kantor di master DB
            from app.db.models import Kantor
            m_db = TenantDatabaseManager.get_tenant_session(None)
            try:
                k_obj = m_db.query(Kantor).filter(Kantor.kode == k_code).first()
                if k_obj is not None:
                    is_office_active = bool(k_obj.is_active)
            finally:
                m_db.close()
        finally:
            db.close()

        status_str = cfg.get("scheduler_status", "RUNNING")
        if state.is_paused:
            status_str = "PAUSED"

        interval_mins = cfg.get("polling_interval_minutes", settings.POLLING_INTERVAL_MINUTES)
        try:
            interval_mins = int(interval_mins)
        except Exception:
            interval_mins = settings.POLLING_INTERVAL_MINUTES

        # Format tanggal tampilan
        last_scan_formatted = last_scan_dt.strftime("%d/%m/%Y %H:%M:%S") if last_scan_dt else "-"

        # 3. Hitung Jadwal Berikutnya = waktu selesai pemantauan terakhir + interval pemantauan (menit)
        if status_str == "RUNNING" and is_office_active and not state.is_paused:
            if last_scan_dt:
                from datetime import timedelta
                next_dt = last_scan_dt + timedelta(minutes=interval_mins)
                now_curr = get_now_wib()
                # Jika sudah melewati next_dt tetapi belum giliran dieksekusi atau baru dimulai
                if state.is_scanning:
                    next_run_formatted = "Sedang Memindai..."
                else:
                    next_run_formatted = next_dt.strftime("%d/%m/%Y %H:%M:%S")
            else:
                next_run_formatted = "Segera"
        elif status_str == "STOPPED":
            next_run_formatted = "-"
        elif not is_office_active:
            next_run_formatted = "-"
        else:
            next_run_formatted = "-"

        # Hitung durasi berjalan & estimasi sisa waktu
        elapsed = round(time.time() - state.scan_start_time, 1) if (state.is_scanning and state.scan_start_time > 0) else 0.0
        if state.is_scanning and state.current_scan_index > 0 and state.total_customers_in_scan > 0:
            avg_per_ont = elapsed / state.current_scan_index
            est_total = round(avg_per_ont * state.total_customers_in_scan, 1)
        else:
            est_total = state.last_scan_duration if state.last_scan_duration > 0 else 0.0

        percent = int((state.current_scan_index / state.total_customers_in_scan) * 100) if state.total_customers_in_scan > 0 else 0

        scan_progress = {
            "current": state.current_scan_index,
            "total": state.total_customers_in_scan,
            "percent": percent,
            "is_scanning": state.is_scanning,
            "is_paused": state.is_paused,
            "elapsed_seconds": int(elapsed),
            "estimated_total_seconds": int(est_total),
            "last_scan_duration": int(state.last_scan_duration),
            "target_kantor": k_code
        }

        return {
            "status": status_str,
            "scheduler_status": status_str,
            "interval_minutes": interval_mins,
            "is_office_active": is_office_active,
            "is_configured": cfg.get("is_configured", True),
            "missing_fields": cfg.get("missing_fields", []),
            "config_error": cfg.get("error_message"),
            "is_running": self.is_running,
            "is_scanning": state.is_scanning,
            "is_paused": state.is_paused,
            "current_index": state.current_scan_index,
            "total_customers": state.total_customers_in_scan,
            "last_scan_time": last_scan_formatted,
            "next_run_time": next_run_formatted,
            "last_sync_stats": state.last_sync_stats,
            "scan_progress": scan_progress,
            "unread_tickets_count": 0,
            "kantor": k_code
        }


# Singleton instances
scheduler = ONTSchedulerService()
ont_scheduler = scheduler
