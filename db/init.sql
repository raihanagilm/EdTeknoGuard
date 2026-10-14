-- ==============================================================================
-- Skrip Migrasi Basis Data MySQL Lokal - EdTeknoGuard (3NF Ternormalisasi Penuh)
-- Collation: utf8mb4_unicode_ci | Engine: InnoDB
-- Dijalankan otomatis saat inisialisasi container Docker MySQL atau impor manual
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `edteknoguard`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `edteknoguard`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Tabel KANTORS (Kantor Cabang / Pusat / Wilayah)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kantors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode` VARCHAR(50) NOT NULL UNIQUE,
  `nama` VARCHAR(100) NOT NULL,
  `alamat` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_kantor_kode` (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Tabel POPS (Point of Presence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pops` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(100) NOT NULL UNIQUE,
  `kantor_kode` VARCHAR(50) NULL,
  `deskripsi` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pop_nama` (`nama`),
  INDEX `idx_pop_kantor` (`kantor_kode`),
  CONSTRAINT `fk_pops_kantors` FOREIGN KEY (`kantor_kode`)
    REFERENCES `kantors` (`kode`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Tabel PAKETS (Paket Layanan Internet)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pakets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(100) NOT NULL UNIQUE,
  `kecepatan_mbps` INT NULL,
  `harga` DECIMAL(12, 2) NULL,
  `deskripsi` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_paket_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Tabel USERS (Petugas NOC & Teknisi)
-- ------------------------------------------------------------------------------
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
  INDEX `idx_user_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Tabel SYSTEM_SETTINGS (Konfigurasi & Threshold Monitoring)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(50) NOT NULL UNIQUE,
  `value_text` TEXT NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_setting_key` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Tabel PELANGGAN (Master Data Pelanggan & Kredensial Portal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pelanggan` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(64) NOT NULL UNIQUE,
  `nama` VARCHAR(150) NOT NULL,
  `alamat` TEXT NULL,
  `no_hp` VARCHAR(50) NULL,
  `pop` VARCHAR(100) NULL DEFAULT 'Server Cabang',
  `kantor` VARCHAR(50) NOT NULL DEFAULT 'cabang',
  `paket` VARCHAR(50) NULL,
  `is_monitored` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_hash` VARCHAR(255) NULL,
  `lokasi_gps` VARCHAR(100) NULL,
  `status_verifikasi` VARCHAR(30) NOT NULL DEFAULT 'TERVERIFIKASI',
  `last_login` DATETIME NULL,
  INDEX `idx_pelanggan_id` (`id_pelanggan`),
  INDEX `idx_pelanggan_nama` (`nama`),
  INDEX `idx_pelanggan_pop` (`pop`),
  INDEX `idx_pelanggan_kantor` (`kantor`),
  INDEX `idx_pelanggan_monitored` (`is_monitored`),
  INDEX `idx_pelanggan_verifikasi` (`status_verifikasi`),
  CONSTRAINT `fk_pelanggan_kantor` FOREIGN KEY (`kantor`)
    REFERENCES `kantors` (`kode`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_pelanggan_pop` FOREIGN KEY (`pop`)
    REFERENCES `pops` (`nama`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_pelanggan_paket` FOREIGN KEY (`paket`)
    REFERENCES `pakets` (`nama`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Tabel PERANGKAT_ONT (Spesifikasi & Kredensial Modem ONT - 1:1 Pelanggan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `perangkat_ont` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(64) NOT NULL UNIQUE,
  `ip_router` VARCHAR(45) NOT NULL UNIQUE,
  `jenis_modem` VARCHAR(50) NOT NULL DEFAULT 'GM220-S',
  `mac_address` VARCHAR(30) NULL,
  `redaman_baseline` DECIMAL(5, 2) NULL,
  `nama_wifi` VARCHAR(100) NULL,
  `password_wifi` VARCHAR(100) NULL,
  `user_admin` VARCHAR(50) NULL,
  `pass_admin` VARCHAR(100) NULL,
  `status_kredensial` VARCHAR(20) NOT NULL DEFAULT 'UNTESTED',
  `snmp_community` VARCHAR(50) DEFAULT 'public',
  `los_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_perangkat_pelanggan` (`id_pelanggan`),
  INDEX `idx_perangkat_ip` (`ip_router`),
  INDEX `idx_perangkat_jenis` (`jenis_modem`),
  INDEX `idx_perangkat_kredensial` (`status_kredensial`),
  CONSTRAINT `fk_perangkat_pelanggan` FOREIGN KEY (`id_pelanggan`)
    REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Tabel LOG_PERFORMA_ONT (Histori Time-Series Redaman & Metrik)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `log_performa_ont` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(64) NOT NULL,
  `waktu_cek` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rx_power` DECIMAL(5, 2) NULL,
  `suhu_ont` DECIMAL(4, 1) NULL,
  `uptime` BIGINT NULL,
  `status_koneksi` VARCHAR(20) NOT NULL,
  `latency_ms` INT NULL,
  `keterangan` VARCHAR(255) NULL,
  INDEX `idx_log_pelanggan` (`id_pelanggan`),
  INDEX `idx_log_waktu` (`waktu_cek`),
  INDEX `idx_log_status` (`status_koneksi`),
  INDEX `idx_pelanggan_waktu` (`id_pelanggan`, `waktu_cek`),
  CONSTRAINT `fk_log_pelanggan` FOREIGN KEY (`id_pelanggan`)
    REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Tabel ALERT_LOGS (Log Notifikasi Darurat Redaman Drop / LOS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `alert_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(64) NOT NULL,
  `tipe_alert` VARCHAR(30) NOT NULL,
  `rx_power` DECIMAL(5, 2) NULL,
  `pesan` TEXT NOT NULL,
  `target_recipients` TEXT NOT NULL,
  `status_kirim` VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  `waktu_kirim` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_alert_pelanggan` (`id_pelanggan`),
  INDEX `idx_alert_waktu` (`waktu_kirim`),
  INDEX `idx_alert_pelanggan_waktu` (`id_pelanggan`, `waktu_kirim`),
  CONSTRAINT `fk_alert_pelanggan` FOREIGN KEY (`id_pelanggan`)
    REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Tabel USER_ACTIVITY_LOGS (Audit Trail Operasional)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_activity_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
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
  INDEX `idx_activity_user_id` (`user_id`),
  INDEX `idx_activity_username` (`username`),
  INDEX `idx_activity_action` (`action`),
  INDEX `idx_activity_created` (`created_at`),
  INDEX `idx_activity_user_action` (`username`, `action`),
  INDEX `idx_activity_action_created` (`action`, `created_at`),
  CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Tabel TIKET_KENDALA (Laporan Gangguan Pelanggan Warga)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tiket_kendala` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_tiket` VARCHAR(32) NOT NULL UNIQUE,
  `id_pelanggan` VARCHAR(64) NOT NULL,
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
  INDEX `idx_tiket_id` (`id_tiket`),
  INDEX `idx_tiket_pelanggan` (`id_pelanggan`),
  INDEX `idx_tiket_kantor` (`kantor`),
  INDEX `idx_tiket_status` (`status`),
  INDEX `idx_tiket_created` (`created_at`),
  INDEX `idx_tiket_status_kantor` (`status`, `kantor`),
  INDEX `idx_tiket_pelanggan_waktu` (`id_pelanggan`, `created_at`),
  CONSTRAINT `fk_tiket_pelanggan` FOREIGN KEY (`id_pelanggan`)
    REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE,
  CONSTRAINT `fk_tiket_kantor` FOREIGN KEY (`kantor`)
    REFERENCES `kantors` (`kode`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Tabel KUOTA_PELANGGAN (Akumulasi Penggunaan Kuota Bulanan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kuota_pelanggan` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `id_pelanggan` VARCHAR(64) NOT NULL,
  `periode_bulan` VARCHAR(10) NOT NULL,
  `kuota_terpakai_gb` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `kecepatan_paket` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_kuota_pelanggan` (`id_pelanggan`),
  INDEX `idx_kuota_periode` (`periode_bulan`),
  INDEX `idx_kuota_pelanggan_periode` (`id_pelanggan`, `periode_bulan`),
  CONSTRAINT `fk_kuota_pelanggan` FOREIGN KEY (`id_pelanggan`)
    REFERENCES `pelanggan` (`id_pelanggan`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- SEED DATA AWAL (Kantor, Paket, Default System Settings, & Super Admin)
-- ------------------------------------------------------------------------------

-- Master Data Kantor
INSERT IGNORE INTO `kantors` (`id`, `kode`, `nama`, `alamat`) VALUES
(1, 'pusat', 'Pusat', 'Kantor Pusat ISP TeknoIndonet'),
(2, 'cabang', 'Cabang', 'Kantor Cabang Operasional Utama'),
(3, 'banyumas', 'Banyumas', 'Kantor Wilayah Operasional Banyumas');

-- Master Data POP Awal
INSERT IGNORE INTO `pops` (`nama`, `kantor_kode`, `deskripsi`) VALUES
('Server Cabang', 'cabang', 'POP Wilayah Kantor Cabang'),
('Mini Server Pabelan', 'cabang', 'POP Area Pabelan'),
('POP Pusat', 'pusat', 'POP Utama Data Center Pusat'),
('POP Banyumas', 'banyumas', 'POP Distribusi Wilayah Banyumas');

-- Master Data Paket Layanan
INSERT IGNORE INTO `pakets` (`nama`, `kecepatan_mbps`, `harga`, `deskripsi`) VALUES
('10MB CAB', 10, 150000.00, 'Paket Hemat 10 Mbps Cabang'),
('20MB CAB', 20, 200000.00, 'Paket Reguler 20 Mbps Cabang'),
('30MB CAB', 30, 250000.00, 'Paket Bisnis 30 Mbps Cabang'),
('50MB VIP', 50, 400000.00, 'Paket Dedicated Super Cepat 50 Mbps');

-- Konfigurasi Parameter Sistem Default
INSERT IGNORE INTO `system_settings` (`key_name`, `value_text`) VALUES
('scheduler_status', 'RUNNING'),
('polling_interval_minutes', '5'),
('warning_threshold_dbm', '-26.0'),
('critical_threshold_dbm', '-27.0'),
('telegram_chat_ids', '1320037657'),
('default_modem_credentials', '[{"username":"admin","password":"admin"},{"username":"tekno","password":"tekno2025"},{"username":"admin","password":"tekno2024"},{"username":"user","password":"user123"}]');

-- Akun Super Admin Awal (Password: agiltampan -> bcrypt)
INSERT IGNORE INTO `users` (`id`, `username`, `hashed_password`, `nama_karyawan`, `no_wa`, `role`, `allowed_kantor`, `is_active`) VALUES
(1, 'admin', '$2b$12$K89eUvV8Q.v7oN0z2xG5vO0e9E3.bM8lY90R9c8C/kM1G.Oa8M8e6', 'Super Administrator NOC', '081234567890', 'super admin', '["cabang","pusat","banyumas"]', 1);

SET FOREIGN_KEY_CHECKS = 1;
