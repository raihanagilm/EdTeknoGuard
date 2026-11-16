-- ==============================================================================
-- EdTeknoGuard & MyTekno - Skema Inisialisasi Database (Multi-Tenant)
-- Skema Bersih (Clean DDL & Default Starter Seed) - Siap Pakai Deployment Server
-- ==============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- EdTeknoGuard & MyTekno - Skema & Data Inisialisasi Lengkap (Multi-Tenant)
-- Di-generate otomatis pada: 2026-11-04 23:30:30
-- Siap pakai untuk deployment server Linux VPS baru
-- ==============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==============================================================================
-- 1. DATABASE MASTER: edteknoguard
-- ==============================================================================
CREATE DATABASE IF NOT EXISTS `edteknoguard` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `edteknoguard`;

CREATE TABLE IF NOT EXISTS `kantors` (
  `id_kantor` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mikrotik_host` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_port` int DEFAULT NULL,
  `mikrotik_user` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_sync_interval` int NOT NULL DEFAULT '3',
  `last_mikrotik_sync` datetime DEFAULT NULL,
  PRIMARY KEY (`id_kantor`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id_activity` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_activity`),
  KEY `ix_user_activity_logs_action` (`action`),
  KEY `ix_user_activity_logs_created_at` (`created_at`),
  KEY `idx_activity_user_action` (`username`,`action`),
  KEY `idx_activity_action_created` (`action`,`created_at`),
  KEY `ix_user_activity_logs_user_id` (`user_id`),
  KEY `ix_user_activity_logs_username` (`username`),
  CONSTRAINT `user_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_kantors` (
  `id_user_kantor` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `id_kantor` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_user_kantor`),
  UNIQUE KEY `uq_user_kantor` (`user_id`,`id_kantor`),
  KEY `ix_user_kantors_user_id` (`user_id`),
  KEY `fk_user_kantors_id_kantor` (`id_kantor`),
  CONSTRAINT `fk_user_kantors_id_kantor` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_kantors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notification_reads` (
  `id_read` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL,
  PRIMARY KEY (`id_read`),
  KEY `ix_user_notification_reads_read_at` (`read_at`),
  KEY `idx_user_notif_lookup` (`user_id`,`notification_type`,`reference_id`),
  KEY `ix_user_notification_reads_reference_id` (`reference_id`),
  KEY `ix_user_notification_reads_notification_type` (`notification_type`),
  KEY `ix_user_notification_reads_user_id` (`user_id`),
  CONSTRAINT `user_notification_reads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_wa` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed_kantor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data untuk `kantors` (4 baris)

-- Data untuk `users` (3 baris)

-- Data untuk `user_kantors` (7 baris)

-- Data untuk `user_activity_logs` (50 baris)


-- ==============================================================================

-- Data Awal Master: `kantors`
INSERT INTO `kantors` (`id_kantor`, `nama`, `is_active`, `alamat`, `created_at`, `mikrotik_host`, `mikrotik_port`, `mikrotik_user`, `mikrotik_pass`, `mikrotik_sync_interval`, `last_mikrotik_sync`) VALUES
  (1, 'Pusat', 1, 'Kantor Pusat Operasional', NOW(), NULL, NULL, NULL, NULL, 3, NULL),
  (2, 'Cabang', 1, 'Kantor Cabang Operasional', NOW(), NULL, NULL, NULL, NULL, 3, NULL);

-- Data Awal Master: `users` (Super Admin default: admin / agiltampan)
INSERT INTO `users` (`id`, `username`, `hashed_password`, `nama_karyawan`, `no_wa`, `role`, `allowed_kantor`, `is_active`, `created_at`, `updated_at`) VALUES
  (1, 'admin', '$2b$12$z1/tCXH2UMVLEipspta/suU2Dj8AyTnPh/BfN4u67wBtxqt0lLZhS', 'Administrator NOC', '081234567890', 'super admin', '["pusat", "cabang"]', 1, NOW(), NOW());

-- Data Awal Master: `user_kantors`
INSERT INTO `user_kantors` (`id_user_kantor`, `user_id`, `id_kantor`, `created_at`) VALUES
  (1, 1, 1, NOW()),
  (2, 1, 2, NOW());

-- ==============================================================================
-- TENANT DATABASE: edtekno_pusat (Kantor Pusat)
-- ==============================================================================
CREATE DATABASE IF NOT EXISTS `edtekno_pusat` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `edtekno_pusat`;

CREATE TABLE IF NOT EXISTS `alert_logs` (
  `id_alert` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_alert` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rx_power` decimal(5,2) DEFAULT NULL,
  `pesan` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_recipients` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_kirim` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_kirim` datetime NOT NULL,
  PRIMARY KEY (`id_alert`),
  KEY `idx_alert_pelanggan_waktu` (`id_pelanggan`,`waktu_kirim`),
  KEY `ix_alert_logs_waktu_kirim` (`waktu_kirim`),
  KEY `ix_alert_logs_id_pelanggan` (`id_pelanggan`),
  CONSTRAINT `alert_logs_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `kantors` (
  `id_kantor` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `mikrotik_host` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_port` int DEFAULT NULL,
  `mikrotik_user` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_sync_interval` int NOT NULL,
  `last_mikrotik_sync` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_kantor`),
  UNIQUE KEY `ix_kantors_nama` (`nama`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `kuota_pelanggan` (
  `id_kuota` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_bulan` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kuota_terpakai_gb` decimal(8,2) NOT NULL,
  `upload_bytes` bigint NOT NULL,
  `download_bytes` bigint NOT NULL,
  `last_sync_mikrotik` datetime DEFAULT NULL,
  `kecepatan_paket` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_kuota`),
  KEY `ix_kuota_pelanggan_periode_bulan` (`periode_bulan`),
  KEY `ix_kuota_pelanggan_id_pelanggan` (`id_pelanggan`),
  KEY `idx_kuota_pelanggan_periode` (`id_pelanggan`,`periode_bulan`),
  CONSTRAINT `kuota_pelanggan_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=568 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `log_kuota_harian` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `pemakaian_gb` decimal(8,2) NOT NULL,
  `upload_bytes` bigint NOT NULL,
  `download_bytes` bigint NOT NULL,
  `last_raw_bytes` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pelanggan_tanggal` (`id_pelanggan`,`tanggal`),
  KEY `ix_log_kuota_harian_tanggal` (`tanggal`),
  KEY `idx_kuota_harian_pel_tgl` (`id_pelanggan`,`tanggal`),
  KEY `ix_log_kuota_harian_id_pelanggan` (`id_pelanggan`),
  CONSTRAINT `log_kuota_harian_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=566 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `log_performa_ont` (
  `id_log` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_cek` datetime NOT NULL,
  `rx_power` decimal(5,2) DEFAULT NULL,
  `suhu_ont` decimal(4,1) DEFAULT NULL,
  `uptime` bigint DEFAULT NULL,
  `status_koneksi` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latency_ms` int DEFAULT NULL,
  `keterangan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_log`),
  KEY `ix_log_performa_ont_waktu_cek` (`waktu_cek`),
  KEY `ix_log_performa_ont_id_pelanggan` (`id_pelanggan`),
  KEY `idx_pelanggan_waktu` (`id_pelanggan`,`waktu_cek`),
  KEY `ix_log_performa_ont_status_koneksi` (`status_koneksi`),
  CONSTRAINT `log_performa_ont_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `modem_credentials` (
  `id_credential` int NOT NULL AUTO_INCREMENT,
  `id_kantor` int DEFAULT NULL,
  `kantor_kode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `urutan` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_credential`),
  KEY `ix_modem_credentials_id_kantor` (`id_kantor`),
  KEY `ix_modem_credentials_kantor_kode` (`kantor_kode`),
  CONSTRAINT `modem_credentials_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pakets` (
  `id_paket` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kecepatan_mbps` int DEFAULT NULL,
  `harga` decimal(12,2) DEFAULT NULL,
  `deskripsi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_paket`),
  UNIQUE KEY `ix_pakets_nama` (`nama`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pelanggan` (
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `no_hp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pop` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_kantor` int DEFAULT NULL,
  `kantor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paket` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_monitored` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `status_lease` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_isolir` tinyint(1) NOT NULL DEFAULT '0',
  `queue_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_profil` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lokasi_gps` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_verifikasi` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_speed_download` decimal(6,2) DEFAULT NULL,
  `last_speed_upload` decimal(6,2) DEFAULT NULL,
  `last_speed_ping` int DEFAULT NULL,
  `last_speed_jitter` int DEFAULT NULL,
  `last_speed_test_at` datetime DEFAULT NULL,
  `status_pembayaran` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'LUNAS',
  PRIMARY KEY (`id_pelanggan`),
  KEY `paket` (`paket`),
  KEY `ix_pelanggan_pop` (`pop`),
  KEY `ix_pelanggan_id_kantor` (`id_kantor`),
  KEY `ix_pelanggan_status_lease` (`status_lease`),
  KEY `ix_pelanggan_is_monitored` (`is_monitored`),
  KEY `ix_pelanggan_nama` (`nama`),
  KEY `ix_pelanggan_status_verifikasi` (`status_verifikasi`),
  KEY `ix_pelanggan_status_isolir` (`status_isolir`),
  KEY `ix_pelanggan_id_pelanggan` (`id_pelanggan`),
  KEY `ix_pelanggan_kantor` (`kantor`),
  KEY `ix_pelanggan_queue_name` (`queue_name`),
  CONSTRAINT `pelanggan_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pelanggan_ibfk_2` FOREIGN KEY (`paket`) REFERENCES `pakets` (`nama`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `perangkat_ont` (
  `id_perangkat` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_router` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_ont` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_modem` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mac_address` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `redaman_baseline` decimal(5,2) DEFAULT NULL,
  `nama_wifi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_wifi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_admin` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pass_admin` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_kredensial` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_credentials` text COLLATE utf8mb4_unicode_ci,
  `snmp_community` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `los_count` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_perangkat`),
  UNIQUE KEY `ix_perangkat_ont_id_pelanggan` (`id_pelanggan`),
  KEY `ix_perangkat_ont_ip_router` (`ip_router`),
  KEY `ix_perangkat_ont_jenis_modem` (`jenis_modem`),
  KEY `ix_perangkat_ont_status_kredensial` (`status_kredensial`),
  KEY `ix_perangkat_ont_ip_ont` (`ip_ont`),
  CONSTRAINT `perangkat_ont_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `perangkat_terhubung` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mac_address` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hostname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipe_koneksi` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rssi` int DEFAULT NULL,
  `ssid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_seen` datetime NOT NULL,
  `last_seen` datetime NOT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `blocked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pelanggan_mac` (`id_pelanggan`,`mac_address`),
  KEY `idx_perangkat_terhubung_lookup` (`id_pelanggan`,`status`),
  KEY `ix_perangkat_terhubung_id_pelanggan` (`id_pelanggan`),
  KEY `ix_perangkat_terhubung_status` (`status`),
  KEY `ix_perangkat_terhubung_last_seen` (`last_seen`),
  KEY `ix_perangkat_terhubung_ip_address` (`ip_address`),
  KEY `ix_perangkat_terhubung_mac_address` (`mac_address`),
  CONSTRAINT `perangkat_terhubung_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id_setting` int NOT NULL AUTO_INCREMENT,
  `id_kantor` int DEFAULT NULL,
  `kantor_kode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `key_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_setting`),
  UNIQUE KEY `uq_setting_key_kantor` (`key_name`,`kantor_kode`),
  KEY `ix_system_settings_key_name` (`key_name`),
  KEY `ix_system_settings_kantor_kode` (`kantor_kode`),
  KEY `ix_system_settings_id_kantor` (`id_kantor`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `tiket_kendala` (
  `id_tiket` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_kantor` int DEFAULT NULL,
  `kantor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_wa_pelapor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `redaman_saat_lapor` decimal(5,2) DEFAULT NULL,
  `status_ont_saat_lapor` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan_teknisi` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_tiket`),
  KEY `ix_tiket_kendala_id_pelanggan` (`id_pelanggan`),
  KEY `ix_tiket_kendala_status` (`status`),
  KEY `idx_tiket_status_kantor` (`status`,`kantor`),
  KEY `ix_tiket_kendala_id_tiket` (`id_tiket`),
  KEY `ix_tiket_kendala_created_at` (`created_at`),
  KEY `idx_tiket_pelanggan_waktu` (`id_pelanggan`,`created_at`),
  KEY `ix_tiket_kendala_id_kantor` (`id_kantor`),
  KEY `ix_tiket_kendala_kantor` (`kantor`),
  CONSTRAINT `tiket_kendala_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tiket_kendala_ibfk_2` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id_activity` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_activity`),
  KEY `ix_user_activity_logs_username` (`username`),
  KEY `ix_user_activity_logs_created_at` (`created_at`),
  KEY `ix_user_activity_logs_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_kantors` (
  `id_user_kantor` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `id_kantor` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_user_kantor`),
  UNIQUE KEY `uq_user_kantor` (`user_id`,`id_kantor`),
  KEY `ix_user_kantors_id_kantor` (`id_kantor`),
  KEY `ix_user_kantors_user_id` (`user_id`),
  KEY `idx_user_kantor_lookup` (`user_id`,`id_kantor`),
  CONSTRAINT `user_kantors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_kantors_ibfk_2` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_notification_reads` (
  `id_read` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL,
  PRIMARY KEY (`id_read`),
  KEY `ix_user_notification_reads_reference_id` (`reference_id`),
  KEY `ix_user_notification_reads_notification_type` (`notification_type`),
  KEY `idx_user_notif_lookup` (`user_id`,`notification_type`,`reference_id`),
  KEY `ix_user_notification_reads_user_id` (`user_id`),
  KEY `ix_user_notification_reads_read_at` (`read_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_wa` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed_kantor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Data untuk `kantors` (1 baris)
-- Data untuk `system_settings` (31 baris)
-- Data untuk `modem_credentials` (3 baris)
-- Data untuk `pakets` (13 baris)
-- Data untuk `pelanggan` (577 baris)
-- Data untuk `perangkat_ont` (577 baris)
-- Data untuk `kuota_pelanggan` (567 baris)
-- Data untuk `log_kuota_harian` (565 baris)
-- Data untuk `user_notification_reads` (2 baris)
-- Data untuk `log_performa_ont` (100 baris)
-- Data untuk `user_activity_logs` (50 baris)

-- Data Awal Tenant: `pakets`
INSERT INTO `pakets` (`id_paket`, `nama`, `kecepatan_mbps`, `harga`, `deskripsi`, `created_at`) VALUES
  (1, 'Paket 10 Mbps', 10, 150000.00, 'Paket internet fiber 10 Mbps', NOW()),
  (2, 'Paket 20 Mbps', 20, 200000.00, 'Paket internet fiber 20 Mbps', NOW()),
  (3, 'Paket 30 Mbps', 30, 250000.00, 'Paket internet fiber 30 Mbps', NOW()),
  (4, 'Paket 50 Mbps', 50, 350000.00, 'Paket internet fiber 50 Mbps', NOW());

-- Data Awal Tenant: `system_settings`
INSERT INTO `system_settings` (`id_setting`, `id_kantor`, `kantor_kode`, `key_name`, `value_text`, `updated_at`) VALUES
  (1, NULL, 'pusat', 'polling_interval_minutes', '5', NOW()),
  (2, NULL, 'pusat', 'warning_threshold_dbm', '-26.0', NOW()),
  (3, NULL, 'pusat', 'critical_threshold_dbm', '-27.0', NOW()),
  (4, NULL, 'pusat', 'default_modem_credentials', '[{"username": "admin", "password": "admin"}, {"username": "admin", "password": "password123"}]', NOW()),
  (5, NULL, 'pusat', 'scheduler_status', 'STOPPED', NOW());

-- Data Awal Tenant: `modem_credentials`
INSERT INTO `modem_credentials` (`id_credential`, `id_kantor`, `kantor_kode`, `username`, `password`, `urutan`, `created_at`, `updated_at`) VALUES
  (1, NULL, 'pusat', 'admin', 'admin', 1, NOW(), NOW()),
  (2, NULL, 'pusat', 'admin', 'password123', 2, NOW(), NOW());

-- ==============================================================================
-- TENANT DATABASE: edtekno_cabang (Kantor Cabang)
-- ==============================================================================
CREATE DATABASE IF NOT EXISTS `edtekno_cabang` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `edtekno_cabang`;

CREATE TABLE IF NOT EXISTS `alert_logs` (
  `id_alert` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_alert` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rx_power` decimal(5,2) DEFAULT NULL,
  `pesan` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_recipients` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_kirim` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_kirim` datetime NOT NULL,
  PRIMARY KEY (`id_alert`),
  KEY `idx_alert_pelanggan_waktu` (`id_pelanggan`,`waktu_kirim`),
  KEY `ix_alert_logs_waktu_kirim` (`waktu_kirim`),
  KEY `ix_alert_logs_id_pelanggan` (`id_pelanggan`),
  CONSTRAINT `alert_logs_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `kantors` (
  `id_kantor` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `mikrotik_host` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_port` int DEFAULT NULL,
  `mikrotik_user` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_pass` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mikrotik_sync_interval` int NOT NULL,
  `last_mikrotik_sync` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_kantor`),
  UNIQUE KEY `ix_kantors_nama` (`nama`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `kuota_pelanggan` (
  `id_kuota` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `periode_bulan` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kuota_terpakai_gb` decimal(8,2) NOT NULL,
  `upload_bytes` bigint NOT NULL,
  `download_bytes` bigint NOT NULL,
  `last_sync_mikrotik` datetime DEFAULT NULL,
  `kecepatan_paket` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_kuota`),
  KEY `ix_kuota_pelanggan_periode_bulan` (`periode_bulan`),
  KEY `ix_kuota_pelanggan_id_pelanggan` (`id_pelanggan`),
  KEY `idx_kuota_pelanggan_periode` (`id_pelanggan`,`periode_bulan`),
  CONSTRAINT `kuota_pelanggan_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=568 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `log_kuota_harian` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `pemakaian_gb` decimal(8,2) NOT NULL,
  `upload_bytes` bigint NOT NULL,
  `download_bytes` bigint NOT NULL,
  `last_raw_bytes` bigint NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pelanggan_tanggal` (`id_pelanggan`,`tanggal`),
  KEY `ix_log_kuota_harian_tanggal` (`tanggal`),
  KEY `idx_kuota_harian_pel_tgl` (`id_pelanggan`,`tanggal`),
  KEY `ix_log_kuota_harian_id_pelanggan` (`id_pelanggan`),
  CONSTRAINT `log_kuota_harian_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=566 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `log_performa_ont` (
  `id_log` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_cek` datetime NOT NULL,
  `rx_power` decimal(5,2) DEFAULT NULL,
  `suhu_ont` decimal(4,1) DEFAULT NULL,
  `uptime` bigint DEFAULT NULL,
  `status_koneksi` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latency_ms` int DEFAULT NULL,
  `keterangan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_log`),
  KEY `ix_log_performa_ont_waktu_cek` (`waktu_cek`),
  KEY `ix_log_performa_ont_id_pelanggan` (`id_pelanggan`),
  KEY `idx_pelanggan_waktu` (`id_pelanggan`,`waktu_cek`),
  KEY `ix_log_performa_ont_status_koneksi` (`status_koneksi`),
  CONSTRAINT `log_performa_ont_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `modem_credentials` (
  `id_credential` int NOT NULL AUTO_INCREMENT,
  `id_kantor` int DEFAULT NULL,
  `kantor_kode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `urutan` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_credential`),
  KEY `ix_modem_credentials_id_kantor` (`id_kantor`),
  KEY `ix_modem_credentials_kantor_kode` (`kantor_kode`),
  CONSTRAINT `modem_credentials_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pakets` (
  `id_paket` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kecepatan_mbps` int DEFAULT NULL,
  `harga` decimal(12,2) DEFAULT NULL,
  `deskripsi` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_paket`),
  UNIQUE KEY `ix_pakets_nama` (`nama`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pelanggan` (
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `no_hp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pop` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_kantor` int DEFAULT NULL,
  `kantor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paket` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_monitored` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `status_lease` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_isolir` tinyint(1) NOT NULL DEFAULT '0',
  `queue_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_profil` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lokasi_gps` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_verifikasi` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_speed_download` decimal(6,2) DEFAULT NULL,
  `last_speed_upload` decimal(6,2) DEFAULT NULL,
  `last_speed_ping` int DEFAULT NULL,
  `last_speed_jitter` int DEFAULT NULL,
  `last_speed_test_at` datetime DEFAULT NULL,
  `status_pembayaran` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'LUNAS',
  PRIMARY KEY (`id_pelanggan`),
  KEY `paket` (`paket`),
  KEY `ix_pelanggan_pop` (`pop`),
  KEY `ix_pelanggan_id_kantor` (`id_kantor`),
  KEY `ix_pelanggan_status_lease` (`status_lease`),
  KEY `ix_pelanggan_is_monitored` (`is_monitored`),
  KEY `ix_pelanggan_nama` (`nama`),
  KEY `ix_pelanggan_status_verifikasi` (`status_verifikasi`),
  KEY `ix_pelanggan_status_isolir` (`status_isolir`),
  KEY `ix_pelanggan_id_pelanggan` (`id_pelanggan`),
  KEY `ix_pelanggan_kantor` (`kantor`),
  KEY `ix_pelanggan_queue_name` (`queue_name`),
  CONSTRAINT `pelanggan_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pelanggan_ibfk_2` FOREIGN KEY (`paket`) REFERENCES `pakets` (`nama`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `perangkat_ont` (
  `id_perangkat` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_router` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_ont` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jenis_modem` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mac_address` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `redaman_baseline` decimal(5,2) DEFAULT NULL,
  `nama_wifi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_wifi` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_admin` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pass_admin` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_kredensial` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_credentials` text COLLATE utf8mb4_unicode_ci,
  `snmp_community` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `los_count` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_perangkat`),
  UNIQUE KEY `ix_perangkat_ont_id_pelanggan` (`id_pelanggan`),
  KEY `ix_perangkat_ont_ip_router` (`ip_router`),
  KEY `ix_perangkat_ont_jenis_modem` (`jenis_modem`),
  KEY `ix_perangkat_ont_status_kredensial` (`status_kredensial`),
  KEY `ix_perangkat_ont_ip_ont` (`ip_ont`),
  CONSTRAINT `perangkat_ont_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=578 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `perangkat_terhubung` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mac_address` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hostname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipe_koneksi` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rssi` int DEFAULT NULL,
  `ssid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_seen` datetime NOT NULL,
  `last_seen` datetime NOT NULL,
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0',
  `blocked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pelanggan_mac` (`id_pelanggan`,`mac_address`),
  KEY `idx_perangkat_terhubung_lookup` (`id_pelanggan`,`status`),
  KEY `ix_perangkat_terhubung_id_pelanggan` (`id_pelanggan`),
  KEY `ix_perangkat_terhubung_status` (`status`),
  KEY `ix_perangkat_terhubung_last_seen` (`last_seen`),
  KEY `ix_perangkat_terhubung_ip_address` (`ip_address`),
  KEY `ix_perangkat_terhubung_mac_address` (`mac_address`),
  CONSTRAINT `perangkat_terhubung_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id_setting` int NOT NULL AUTO_INCREMENT,
  `id_kantor` int DEFAULT NULL,
  `kantor_kode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `key_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_setting`),
  UNIQUE KEY `uq_setting_key_kantor` (`key_name`,`kantor_kode`),
  KEY `ix_system_settings_key_name` (`key_name`),
  KEY `ix_system_settings_kantor_kode` (`kantor_kode`),
  KEY `ix_system_settings_id_kantor` (`id_kantor`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `tiket_kendala` (
  `id_tiket` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_pelanggan` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_kantor` int DEFAULT NULL,
  `kantor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_wa_pelapor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `redaman_saat_lapor` decimal(5,2) DEFAULT NULL,
  `status_ont_saat_lapor` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan_teknisi` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id_tiket`),
  KEY `ix_tiket_kendala_id_pelanggan` (`id_pelanggan`),
  KEY `ix_tiket_kendala_status` (`status`),
  KEY `idx_tiket_status_kantor` (`status`,`kantor`),
  KEY `ix_tiket_kendala_id_tiket` (`id_tiket`),
  KEY `ix_tiket_kendala_created_at` (`created_at`),
  KEY `idx_tiket_pelanggan_waktu` (`id_pelanggan`,`created_at`),
  KEY `ix_tiket_kendala_id_kantor` (`id_kantor`),
  KEY `ix_tiket_kendala_kantor` (`kantor`),
  CONSTRAINT `tiket_kendala_ibfk_1` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tiket_kendala_ibfk_2` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id_activity` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_activity`),
  KEY `ix_user_activity_logs_username` (`username`),
  KEY `ix_user_activity_logs_created_at` (`created_at`),
  KEY `ix_user_activity_logs_action` (`action`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_kantors` (
  `id_user_kantor` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `id_kantor` int NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id_user_kantor`),
  UNIQUE KEY `uq_user_kantor` (`user_id`,`id_kantor`),
  KEY `ix_user_kantors_id_kantor` (`id_kantor`),
  KEY `ix_user_kantors_user_id` (`user_id`),
  KEY `idx_user_kantor_lookup` (`user_id`,`id_kantor`),
  CONSTRAINT `user_kantors_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_kantors_ibfk_2` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `user_notification_reads` (
  `id_read` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL,
  PRIMARY KEY (`id_read`),
  KEY `ix_user_notification_reads_reference_id` (`reference_id`),
  KEY `ix_user_notification_reads_notification_type` (`notification_type`),
  KEY `idx_user_notif_lookup` (`user_id`,`notification_type`,`reference_id`),
  KEY `ix_user_notification_reads_user_id` (`user_id`),
  KEY `ix_user_notification_reads_read_at` (`read_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_karyawan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_wa` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed_kantor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Data untuk `kantors` (1 baris)
-- Data untuk `system_settings` (31 baris)
-- Data untuk `modem_credentials` (3 baris)
-- Data untuk `pakets` (13 baris)
-- Data untuk `pelanggan` (577 baris)
-- Data untuk `perangkat_ont` (577 baris)
-- Data untuk `kuota_pelanggan` (567 baris)
-- Data untuk `log_kuota_harian` (565 baris)
-- Data untuk `user_notification_reads` (2 baris)
-- Data untuk `log_performa_ont` (100 baris)
-- Data untuk `user_activity_logs` (50 baris)

-- Data Awal Tenant: `pakets`
INSERT INTO `pakets` (`id_paket`, `nama`, `kecepatan_mbps`, `harga`, `deskripsi`, `created_at`) VALUES
  (1, 'Paket 10 Mbps', 10, 150000.00, 'Paket internet fiber 10 Mbps', NOW()),
  (2, 'Paket 20 Mbps', 20, 200000.00, 'Paket internet fiber 20 Mbps', NOW()),
  (3, 'Paket 30 Mbps', 30, 250000.00, 'Paket internet fiber 30 Mbps', NOW()),
  (4, 'Paket 50 Mbps', 50, 350000.00, 'Paket internet fiber 50 Mbps', NOW());

-- Data Awal Tenant: `system_settings`
INSERT INTO `system_settings` (`id_setting`, `id_kantor`, `kantor_kode`, `key_name`, `value_text`, `updated_at`) VALUES
  (1, NULL, 'cabang', 'polling_interval_minutes', '5', NOW()),
  (2, NULL, 'cabang', 'warning_threshold_dbm', '-26.0', NOW()),
  (3, NULL, 'cabang', 'critical_threshold_dbm', '-27.0', NOW()),
  (4, NULL, 'cabang', 'default_modem_credentials', '[{"username": "admin", "password": "admin"}, {"username": "admin", "password": "password123"}]', NOW()),
  (5, NULL, 'cabang', 'scheduler_status', 'STOPPED', NOW());

-- Data Awal Tenant: `modem_credentials`
INSERT INTO `modem_credentials` (`id_credential`, `id_kantor`, `kantor_kode`, `username`, `password`, `urutan`, `created_at`, `updated_at`) VALUES
  (1, NULL, 'cabang', 'admin', 'admin', 1, NOW(), NOW()),
  (2, NULL, 'cabang', 'admin', 'password123', 2, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
