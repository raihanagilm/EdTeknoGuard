from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Pelanggan, TiketKendala, KuotaPelanggan, LogPerformaONT
from app.core.timezone import get_now_wib

class AdminCustomerMgmtService:

    @staticmethod
    def get_pending_registrations(db: Session, kantor: Optional[str] = None) -> List[Pelanggan]:
        """Mengambil data pelanggan berstatus PENDING jika ada (alur registrasi mandiri telah dinonaktifkan)."""
        query = db.query(Pelanggan).filter(Pelanggan.status_verifikasi == "PENDING")
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        return query.order_by(Pelanggan.created_at.desc()).all()

    @staticmethod
    def get_unlinked_customers_options(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        """Mengambil daftar pelanggan kantor."""
        query = db.query(Pelanggan)
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        
        pelanggan_list = query.order_by(Pelanggan.nama.asc()).all()
        return [
            {
                "id_pelanggan": p.id_pelanggan,
                "nama": p.nama,
                "alamat": p.alamat or "-",
                "ip_router": p.ip_router or "-",
                "pop": p.pop or "-",
                "kantor": p.kantor or "cabang"
            }
            for p in pelanggan_list
        ]

    @staticmethod
    def approve_registration(
        db: Session,
        account_id: Any,
        id_pelanggan: str,
        admin_user: Optional[str] = None
    ) -> Dict[str, Any]:
        target_id = id_pelanggan or str(account_id)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == target_id).first()
        if not pelanggan:
            return {"status": "error", "message": "Data pelanggan kantor tidak ditemukan."}

        pelanggan.status_verifikasi = "TERVERIFIKASI"
        pelanggan.updated_at = get_now_wib()
        db.commit()
        db.refresh(pelanggan)

        return {
            "status": "success",
            "message": f"Akun pelanggan '{pelanggan.nama}' ({pelanggan.id_pelanggan}) berhasil diverifikasi."
        }

    @staticmethod
    def reject_registration(db: Session, account_id: Any, alasan: str = "") -> Dict[str, Any]:
        target_id = str(account_id)
        pelanggan = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == target_id).first()
        if not pelanggan:
            return {"status": "error", "message": "Pelanggan tidak ditemukan."}

        pelanggan.status_verifikasi = "DITOLAK"
        pelanggan.updated_at = get_now_wib()
        db.commit()

        return {
            "status": "success",
            "message": f"Status akun pelanggan '{pelanggan.nama}' telah ditolak."
        }

    @staticmethod
    def get_tickets(
        db: Session,
        status_filter: Optional[str] = None,
        kantor: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(TiketKendala)
        if status_filter and status_filter != "SEMUA":
            query = query.filter(TiketKendala.status == status_filter)
        if kantor and kantor != "all":
            query = query.filter(TiketKendala.kantor == kantor)

        tickets = query.order_by(TiketKendala.created_at.desc()).all()

        # Ambil relasi pelanggan
        result = []
        for t in tickets:
            cust = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == t.id_pelanggan).first()
            result.append({
                "tiket": t,
                "pelanggan": cust
            })
        return result

    @staticmethod
    def update_ticket_status(
        db: Session,
        ticket_id: str,
        new_status: str,
        catatan: Optional[str] = None
    ) -> Dict[str, Any]:
        t = db.query(TiketKendala).filter(TiketKendala.id_tiket == ticket_id).first()
        if not t:
            return {"status": "error", "message": "Tiket tidak ditemukan."}

        t.status = new_status
        if catatan is not None:
            t.catatan_teknisi = catatan
        t.updated_at = get_now_wib()
        db.commit()

        return {
            "status": "success",
            "message": f"Status tiket {ticket_id} berhasil diubah menjadi {new_status}."
        }

    @staticmethod
    def get_quota_overview(db: Session, kantor: Optional[str] = None) -> List[Dict[str, Any]]:
        now = get_now_wib()
        current_period = now.strftime("%Y-%m")
        
        query = db.query(Pelanggan)
        if kantor and kantor != "all":
            query = query.filter(Pelanggan.kantor == kantor)
        
        pelanggan_list = query.order_by(Pelanggan.nama.asc()).all()
        result = []
        for p in pelanggan_list:
            kuota = db.query(KuotaPelanggan).filter(
                KuotaPelanggan.id_pelanggan == p.id_pelanggan,
                KuotaPelanggan.periode_bulan == current_period
            ).first()
            
            result.append({
                "pelanggan": p,
                "periode": current_period,
                "terpakai_gb": float(kuota.kuota_terpakai_gb) if kuota else 0.0,
                "paket": p.paket or (kuota.kecepatan_paket if kuota else "20 Mbps Unlimited")
            })
        return result

    @staticmethod
    def get_realtime_notifications(db: Session, kantor: Optional[str] = None, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Mengambil data notifikasi realtime gabungan:
        1. Tiket Keluhan Pelanggan (persisten jika status != SELESAI, batch jika > 5)
        2. Hasil Pemantauan Redaman ONT: LOS, GAGAL JARIK/AUTH, dan WARNING (batch jika > 5)
        3. Pengingat jadwal terjeda (khusus Super Admin)
        4. User-level read isolation via UserNotificationRead
        """
        from app.db.models import UserNotificationRead, LogPerformaONT, Pelanggan, User
        from app.core.timezone import get_now_wib
        from datetime import timedelta
        from sqlalchemy import func

        user_id = user.get("user_id") if user else None
        if not user_id and user and user.get("user"):
            u_obj = db.query(User).filter(User.username == user.get("user")).first()
            if u_obj:
                user_id = u_obj.id

        user_role = user.get("role") if user else "teknisi"

        # Ambil set reference_id yang sudah dibaca user
        read_ref_ids = set()
        if user_id:
            reads = db.query(UserNotificationRead.reference_id).filter(UserNotificationRead.user_id == user_id).all()
            read_ref_ids = {r[0] for r in reads}

        # -------------------------------------------------------------
        # 1. TIKET KELUHAN PELANGGAN (Persisten jika belum SELESAI/DIBATALKAN)
        # -------------------------------------------------------------
        tiket_q = db.query(TiketKendala).filter(TiketKendala.status.in_(["MENUNGGU", "DIPROSES"]))
        if user_role != "super admin" and kantor and kantor != "all":
            tiket_q = tiket_q.filter(TiketKendala.kantor == kantor)

        all_active_tickets = tiket_q.order_by(TiketKendala.created_at.desc()).all()
        # Filter tiket yang sudah dibaca user ini (jika user sudah baca & status belum berubah, tetap bisa di-dismiss)
        unread_tickets = [t for t in all_active_tickets if str(t.id) not in read_ref_ids and t.id_tiket not in read_ref_ids]

        items_list = []

        if len(unread_tickets) > 5:
            # Batch tiket jadi 1 notifikasi agregat agar tidak membebani browser/HP
            first_t = unread_tickets[0]
            batch_key = f"batch_tiket_{len(unread_tickets)}_{first_t.id}"
            if batch_key not in read_ref_ids:
                kantor_tags = list(set([t.kantor.upper() for t in unread_tickets if t.kantor]))
                kantor_desc = ", ".join(kantor_tags[:3])
                items_list.append({
                    "id": batch_key,
                    "type": "tiket_batch",
                    "title": f"{len(unread_tickets)} Tiket Keluhan Masuk",
                    "message": f"Terdapat {len(unread_tickets)} tiket keluhan belum selesai ({kantor_desc}). Segera tindak lanjuti!",
                    "target_tab": "tiket",
                    "target_filter": "",
                    "level": "warning",
                    "badge": f"{len(unread_tickets)} Tiket",
                    "time": first_t.created_at.strftime("%H:%M") if first_t.created_at else "",
                    "count": len(unread_tickets),
                    "kantor": first_t.kantor
                })
        else:
            for t in unread_tickets:
                c = db.query(Pelanggan).filter(Pelanggan.id_pelanggan == t.id_pelanggan).first()
                c_name = c.nama if c else t.id_pelanggan
                items_list.append({
                    "id": f"tiket_{t.id}",
                    "reference_id": str(t.id),
                    "type": "tiket",
                    "title": f"Tiket: {c_name}",
                    "message": f"{t.kategori} - {t.deskripsi[:75]}..." if len(t.deskripsi or "") > 75 else (t.deskripsi or t.kategori),
                    "target_tab": "tiket",
                    "target_filter": t.id_tiket,
                    "level": "warning" if t.status == "MENUNGGU" else "info",
                    "badge": f"Tiket {t.status}",
                    "time": t.created_at.strftime("%H:%M") if t.created_at else "",
                    "kantor": t.kantor,
                    "id_tiket": t.id_tiket,
                    "id_pelanggan": t.id_pelanggan
                })

        # -------------------------------------------------------------
        # 2. HASIL PEMANTAUAN REDAMAN ONT (LOS, CRITICAL, WARNING, GAGAL JARINGAN)
        # -------------------------------------------------------------
        # Ambil log pembacaan terakhir masing-masing pelanggan (dalam 2 jam terakhir)
        two_hours_ago = get_now_wib() - timedelta(hours=2)
        sub_latest = db.query(
            LogPerformaONT.id_pelanggan,
            func.max(LogPerformaONT.waktu_cek).label("max_waktu")
        ).filter(LogPerformaONT.waktu_cek >= two_hours_ago).group_by(LogPerformaONT.id_pelanggan).subquery()

        ont_logs_query = db.query(LogPerformaONT, Pelanggan).join(
            sub_latest,
            (LogPerformaONT.id_pelanggan == sub_latest.c.id_pelanggan) & (LogPerformaONT.waktu_cek == sub_latest.c.max_waktu)
        ).join(
            Pelanggan,
            LogPerformaONT.id_pelanggan == Pelanggan.id_pelanggan
        ).filter(
            LogPerformaONT.status_koneksi.in_(["LOS", "CRITICAL", "WARNING"])
        )

        if user_role != "super admin" and kantor and kantor != "all":
            ont_logs_query = ont_logs_query.filter(Pelanggan.kantor == kantor)

        problem_logs = ont_logs_query.order_by(LogPerformaONT.waktu_cek.desc()).all()

        los_items = []
        warning_items = []

        for log_entry, cust in problem_logs:
            ref_key = f"log_{log_entry.id}"
            if ref_key in read_ref_ids:
                continue

            item_data = {
                "id": ref_key,
                "reference_id": ref_key,
                "type": "monitoring",
                "title": f"ONT {log_entry.status_koneksi}: {cust.nama}",
                "message": f"IP: {cust.ip_router or '-'} | Redaman: {log_entry.rx_power if log_entry.rx_power is not None else 'N/A'} dBm ({log_entry.keterangan or log_entry.status_koneksi})",
                "target_tab": "logs",
                "target_filter": cust.id_pelanggan,
                "level": "critical" if log_entry.status_koneksi in ["LOS", "CRITICAL"] else "warning",
                "badge": log_entry.status_koneksi,
                "time": log_entry.waktu_cek.strftime("%H:%M") if log_entry.waktu_cek else "",
                "kantor": cust.kantor,
                "id_pelanggan": cust.id_pelanggan,
                "nama_pelanggan": cust.nama,
                "rx_power": float(log_entry.rx_power) if log_entry.rx_power is not None else None,
                "status_koneksi": log_entry.status_koneksi
            }

            if log_entry.status_koneksi in ["LOS", "CRITICAL"]:
                los_items.append(item_data)
            else:
                warning_items.append(item_data)

        # Cek grouping LOS (> 5 items)
        if len(los_items) > 5:
            first_los = los_items[0]
            batch_key = f"batch_los_{len(los_items)}_{first_los['id']}"
            if batch_key not in read_ref_ids:
                items_list.append({
                    "id": batch_key,
                    "type": "monitoring_batch",
                    "title": f"{len(los_items)} Modem ONT Terputus (LOS)",
                    "message": f"Terdeteksi {len(los_items)} pelanggan mengalami LOS/Kritis pada kantor {first_los['kantor'].upper()}. Klik untuk cek riwayat redaman.",
                    "target_tab": "logs",
                    "target_filter": "LOS",
                    "level": "critical",
                    "badge": f"{len(los_items)} LOS",
                    "time": first_los["time"],
                    "count": len(los_items),
                    "kantor": first_los["kantor"]
                })
        else:
            items_list.extend(los_items)

        # Cek grouping Warning (> 5 items)
        if len(warning_items) > 5:
            first_warn = warning_items[0]
            batch_key = f"batch_warning_{len(warning_items)}_{first_warn['id']}"
            if batch_key not in read_ref_ids:
                items_list.append({
                    "id": batch_key,
                    "type": "monitoring_batch",
                    "title": f"{len(warning_items)} Modem Redaman Menurun (WARNING)",
                    "message": f"Terdeteksi {len(warning_items)} pelanggan mendekati batas kritis redaman (<= -26.0 dBm). Klik untuk cek riwayat redaman.",
                    "target_tab": "logs",
                    "target_filter": "WARNING",
                    "level": "warning",
                    "badge": f"{len(warning_items)} Warning",
                    "time": first_warn["time"],
                    "count": len(warning_items),
                    "kantor": first_warn["kantor"]
                })
        else:
            items_list.extend(warning_items)

        # -------------------------------------------------------------
        # 3. PENGINGAT PEMANTAUAN TERJEDA (Khusus Super Admin)
        # -------------------------------------------------------------
        paused_reminder = None
        if user and user.get("role") == "super admin":
            from app.services.scheduler_service import ont_scheduler
            paused_reminder = ont_scheduler.check_paused_reminder(db)
            if paused_reminder:
                items_list.insert(0, {
                    "id": "paused_scheduler_reminder",
                    "type": "system",
                    "title": "Pengingat: Jadwal Terjeda",
                    "message": paused_reminder.get("message", "Jadwal pemantauan sedang terjeda."),
                    "target_tab": "beranda",
                    "target_filter": "",
                    "level": "info",
                    "badge": "SISTEM",
                    "time": get_now_wib().strftime("%H:%M")
                })

        # Ambil konfigurasi notifikasi (Getaran, Interval, Mode Malam)
        from app.modules.settings.service import SystemSettingsService
        current_cfg = SystemSettingsService.get_settings(db)
        notif_config = {
            "vibration_enabled": current_cfg.get("app_vibration_enabled", True),
            "alert_waiting_interval_minutes": current_cfg.get("alert_waiting_interval_minutes", 5),
            "night_mode_enabled": current_cfg.get("night_mode_enabled", False),
            "night_mode_start": current_cfg.get("night_mode_start", "22:00"),
            "night_mode_end": current_cfg.get("night_mode_end", "06:00")
        }

        # Urutkan notifikasi: level critical dahulu, lalu warning, lalu info
        level_order = {"critical": 0, "warning": 1, "info": 2}
        items_list.sort(key=lambda x: level_order.get(x.get("level", "info"), 3))

        return {
            "status": "success",
            "total_unread": len(items_list),
            "unread_tickets_count": len(unread_tickets),
            "notifications": items_list,
            "paused_reminder": paused_reminder,
            "notification_config": notif_config
        }

    @staticmethod
    def mark_notification_read(db: Session, user: Dict[str, Any], notification_type: str, reference_id: str) -> Dict[str, Any]:
        """Menandai notifikasi sebagai sudah dibaca khusus untuk user yang sedang aktif."""
        from app.db.models import UserNotificationRead, User
        from app.core.timezone import get_now_wib

        user_id = user.get("user_id")
        if not user_id and user.get("user"):
            u_obj = db.query(User).filter(User.username == user.get("user")).first()
            if u_obj:
                user_id = u_obj.id

        if not user_id:
            return {"status": "error", "message": "User ID tidak valid"}

        # Cek apakah sudah pernah ditandai
        existing = db.query(UserNotificationRead).filter(
            UserNotificationRead.user_id == user_id,
            UserNotificationRead.notification_type == notification_type,
            UserNotificationRead.reference_id == reference_id
        ).first()

        if not existing:
            read_entry = UserNotificationRead(
                user_id=user_id,
                notification_type=notification_type,
                reference_id=reference_id,
                read_at=get_now_wib()
            )
            db.add(read_entry)
            db.commit()

        return {"status": "success", "message": "Notifikasi ditandai sudah dibaca"}

    @staticmethod
    def mark_all_notifications_read(db: Session, user: Dict[str, Any], items: List[Dict[str, str]]) -> Dict[str, Any]:
        """Menandai seluruh notifikasi yang saat ini tampil sebagai sudah dibaca untuk user ini."""
        from app.db.models import UserNotificationRead, User
        from app.core.timezone import get_now_wib

        user_id = user.get("user_id")
        if not user_id and user.get("user"):
            u_obj = db.query(User).filter(User.username == user.get("user")).first()
            if u_obj:
                user_id = u_obj.id

        if not user_id:
            return {"status": "error", "message": "User ID tidak valid"}

        now = get_now_wib()
        added_count = 0
        for item in items:
            n_type = item.get("type", "general")
            ref_id = item.get("reference_id") or item.get("id")
            if not ref_id:
                continue

            existing = db.query(UserNotificationRead).filter(
                UserNotificationRead.user_id == user_id,
                UserNotificationRead.notification_type == n_type,
                UserNotificationRead.reference_id == str(ref_id)
            ).first()

            if not existing:
                db.add(UserNotificationRead(
                    user_id=user_id,
                    notification_type=n_type,
                    reference_id=str(ref_id),
                    read_at=now
                ))
                added_count += 1

        db.commit()
        return {"status": "success", "marked_count": added_count}


