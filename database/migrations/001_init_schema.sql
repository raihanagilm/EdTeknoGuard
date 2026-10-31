-- ==============================================================================
-- EdTeknoGuard - Skema DDL Database Terpadu (MySQL Engine)
-- ==============================================================================
-- Arsitektur Multi-Database:
-- 1. Database Master (edteknoguard): Menyimpan data global (Kantors, Users, Auth, User Activity Logs)
-- 2. Database Tenant (edtekno_<kode_kantor>): Menyimpan data operasional per-kantor (Pelanggan, ONT, Logs, Tiket, Kuota)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BAGIAN 1: DATABASE MASTER (edteknoguard)
-- ------------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `edteknoguard` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `edteknoguard`;

CREATE TABLE IF NOT EXISTS `kantors` (
    `id_kantor` INT AUTO_INCREMENT PRIMARY KEY,
    `nama` VARCHAR(100) NOT NULL UNIQUE,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `alamat` TEXT NULL,
    `mikrotik_host` VARCHAR(100) NULL,
    `mikrotik_port` INT NULL,
    `mikrotik_user` VARCHAR(100) NULL,
    `mikrotik_pass` VARCHAR(255) NULL,
    `mikrotik_sync_interval` INT NOT NULL DEFAULT 3,
    `last_mikrotik_sync` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_kantors_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `hashed_password` VARCHAR(255) NOT NULL,
    `nama_karyawan` VARCHAR(150) NULL,
    `no_wa` VARCHAR(50) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'teknisi',
    `allowed_kantor` VARCHAR(255) NOT NULL DEFAULT '["cabang"]',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_activity_logs` (
    `id_activity` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `username` VARCHAR(100) NOT NULL,
    `nama_karyawan` VARCHAR(150) NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
    `action` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    `keterangan` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_activity_user_action` (`username`, `action`),
    INDEX `idx_activity_action_created` (`action`, `created_at`),
    CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_kantors` (
    `id_user_kantor` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `id_kantor` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_user_kantor` (`user_id`, `id_kantor`),
    INDEX `idx_user_kantor_lookup` (`user_id`, `id_kantor`),
    CONSTRAINT `fk_uk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_uk_kantor` FOREIGN KEY (`id_kantor`) REFERENCES `kantors` (`id_kantor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notification_reads` (
    `id_read` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `notification_type` VARCHAR(50) NOT NULL,
    `reference_id` VARCHAR(100) NOT NULL,
    `read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_notif_lookup` (`user_id`, `notification_type`, `reference_id`),
    CONSTRAINT `fk_unr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- BAGIAN 2: TEMPLATE SKEMA DATABASE TENANT (Contoh: edtekno_cabang)
-- ------------------------------------------------------------------------------
-- Catatan: Tabel-tabel di bawah ini dibuat otomatis oleh TenantDatabaseManager
-- saat inisialisasi kantor baru. Skema ini TIDAK memiliki foreign key ke Database Master.

CREATE TABLE IF NOT EXISTS `pakets` (
    `id_paket` INT AUTO_INCREMENT PRIMARY KEY,
    `nama` VARCHAR(100) NOT NULL UNIQUE,
    `kecepatan_mbps` INT NULL,
    `harga` DECIMAL(12, 2) NULL,
    `deskripsi` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_pakets_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pelanggan` (
    `id_pelanggan` VARCHAR(64) PRIMARY KEY NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `alamat` TEXT NULL,
    `no_hp` VARCHAR(50) NULL,
    `pop` VARCHAR(100) DEFAULT 'Server Cabang',
    `id_kantor` INT NULL,
    `kantor` VARCHAR(50) DEFAULT 'cabang',
    `paket` VARCHAR(50) NULL,
    `is_monitored` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `status_lease` VARCHAR(20) NOT NULL DEFAULT 'bound',
    `status_isolir` BOOLEAN NOT NULL DEFAULT FALSE,
    `queue_name` VARCHAR(150) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `password_hash` VARCHAR(255) NULL,
    `foto_profil` VARCHAR(255) NULL,
    `lokasi_gps` VARCHAR(100) NULL,
    `status_verifikasi` VARCHAR(30) NOT NULL DEFAULT 'TERVERIFIKASI',
    `last_login` DATETIME NULL,
    `last_speed_download` DECIMAL(6, 2) NULL,
    `last_speed_upload` DECIMAL(6, 2) NULL,
    `last_speed_ping` INT NULL,
    `last_speed_jitter` INT NULL,
    `last_speed_test_at` DATETIME NULL,
    INDEX `idx_pelanggan_nama` (`nama`),
    INDEX `idx_pelanggan_kantor` (`kantor`),
    INDEX `idx_pelanggan_monitored` (`is_monitored`),
    INDEX `idx_pelanggan_verif` (`status_verifikasi`),
    CONSTRAINT `fk_pelanggan_paket` FOREIGN KEY (`paket`) REFERENCES `pakets` (`nama`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `perangkat_ont` (
    `id_perangkat` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL UNIQUE,
    `ip_router` VARCHAR(45) NULL,
    `ip_ont` VARCHAR(45) NULL,
    `jenis_modem` VARCHAR(50) NULL,
    `mac_address` VARCHAR(30) NULL,
    `redaman_baseline` DECIMAL(5, 2) NULL,
    `nama_wifi` VARCHAR(100) NULL,
    `password_wifi` VARCHAR(100) NULL,
    `user_admin` VARCHAR(50) NULL,
    `pass_admin` VARCHAR(100) NULL,
    `status_kredensial` VARCHAR(20) NOT NULL DEFAULT 'INVALID',
    `failed_credentials` TEXT NULL,
    `snmp_community` VARCHAR(50) DEFAULT 'public',
    `los_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ont_pelanggan` (`id_pelanggan`),
    INDEX `idx_ont_ip_ont` (`ip_ont`),
    INDEX `idx_ont_kredensial` (`status_kredensial`),
    CONSTRAINT `fk_ont_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `log_performa_ont` (
    `id_log` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `waktu_cek` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `rx_power` DECIMAL(5, 2) NULL,
    `suhu_ont` DECIMAL(4, 1) NULL,
    `uptime` BIGINT NULL,
    `status_koneksi` VARCHAR(20) NOT NULL,
    `latency_ms` INT NULL,
    `keterangan` VARCHAR(255) NULL,
    INDEX `idx_log_pelanggan_waktu` (`id_pelanggan`, `waktu_cek`),
    CONSTRAINT `fk_log_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alert_logs` (
    `id_alert` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `tipe_alert` VARCHAR(30) NOT NULL,
    `rx_power` DECIMAL(5, 2) NULL,
    `pesan` TEXT NOT NULL,
    `target_recipients` TEXT NOT NULL,
    `status_kirim` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    `waktu_kirim` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_alert_pelanggan_waktu` (`id_pelanggan`, `waktu_kirim`),
    CONSTRAINT `fk_alert_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
    `id_setting` INT AUTO_INCREMENT PRIMARY KEY,
    `id_kantor` INT NULL,
    `kantor_kode` VARCHAR(50) NULL,
    `key_name` VARCHAR(50) NOT NULL,
    `value_text` TEXT NOT NULL,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_setting_key_kantor` (`key_name`, `kantor_kode`),
    INDEX `idx_settings_key` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `modem_credentials` (
    `id_credential` INT AUTO_INCREMENT PRIMARY KEY,
    `id_kantor` INT NULL,
    `kantor_kode` VARCHAR(50) NULL,
    `username` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `urutan` INT NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_modem_cred_kantor` (`kantor_kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tiket_kendala` (
    `id_tiket` VARCHAR(32) PRIMARY KEY NOT NULL,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `id_kantor` INT NULL,
    `kantor` VARCHAR(50) NOT NULL DEFAULT 'cabang',
    `kategori` VARCHAR(100) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `no_wa_pelapor` VARCHAR(50) NOT NULL,
    `redaman_saat_lapor` DECIMAL(5, 2) NULL,
    `status_ont_saat_lapor` VARCHAR(20) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU',
    `catatan_teknisi` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_tiket_status_kantor` (`status`, `kantor`),
    INDEX `idx_tiket_pelanggan_waktu` (`id_pelanggan`, `created_at`),
    CONSTRAINT `fk_tiket_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kuota_pelanggan` (
    `id_kuota` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `periode_bulan` VARCHAR(10) NOT NULL,
    `kuota_terpakai_gb` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `upload_bytes` BIGINT NOT NULL DEFAULT 0,
    `download_bytes` BIGINT NOT NULL DEFAULT 0,
    `last_sync_mikrotik` DATETIME NULL,
    `kecepatan_paket` VARCHAR(50) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_kuota_pelanggan_periode` (`id_pelanggan`, `periode_bulan`),
    CONSTRAINT `fk_kuota_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `log_kuota_harian` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `tanggal` DATE NOT NULL,
    `pemakaian_gb` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `upload_bytes` BIGINT NOT NULL DEFAULT 0,
    `download_bytes` BIGINT NOT NULL DEFAULT 0,
    `last_raw_bytes` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_pelanggan_tanggal` (`id_pelanggan`, `tanggal`),
    INDEX `idx_kuota_harian_pel_tgl` (`id_pelanggan`, `tanggal`),
    CONSTRAINT `fk_kuota_harian_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `perangkat_terhubung` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_pelanggan` VARCHAR(64) NOT NULL,
    `mac_address` VARCHAR(30) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `hostname` VARCHAR(100) NULL,
    `tipe_koneksi` VARCHAR(20) NOT NULL DEFAULT 'WIFI',
    `rssi` INT NULL,
    `ssid` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    `is_blocked` BOOLEAN NOT NULL DEFAULT FALSE,
    `blocked_at` DATETIME NULL,
    `first_seen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_seen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_pelanggan_mac` (`id_pelanggan`, `mac_address`),
    INDEX `idx_perangkat_terhubung_lookup` (`id_pelanggan`, `status`),
    CONSTRAINT `fk_terhubung_pelanggan` FOREIGN KEY (`id_pelanggan`) REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
