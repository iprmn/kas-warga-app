-- ============================================================================
-- KasWarga Relational MySQL Schema (InnoDB + Foreign Keys)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `kas_warga`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kas_warga`;

-- 1. Pengaturan Lingkungan RT/RW/Perumahan/Cluster/Bendahara
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` VARCHAR(255) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Jenis Iuran (kategori hanya wajib / opsional)
CREATE TABLE IF NOT EXISTS `dues` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `amount` INT UNSIGNED NOT NULL,
  `category` ENUM('wajib', 'opsional') NOT NULL DEFAULT 'opsional',
  `emoji` VARCHAR(16) NOT NULL DEFAULT '💰',
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_dues_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Master Data Kepala Keluarga / Warga
CREATE TABLE IF NOT EXISTS `warga` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `blok` VARCHAR(16) NOT NULL,
  `nomor` VARCHAR(16) NOT NULL,
  `phone` VARCHAR(32) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_warga_blok_nomor` (`blok`, `nomor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Transaksi Kas (Pemasukan & Pengeluaran) — Relasi FK ke tabel warga
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(64) NOT NULL,
  `type` ENUM('masuk', 'keluar') NOT NULL,
  `period` CHAR(7) NOT NULL,
  `tx_date` DATE NOT NULL,
  `warga_id` VARCHAR(64) NULL,
  `warga_name` VARCHAR(120) NULL,
  `warga_address` VARCHAR(64) NULL,
  `title` VARCHAR(160) NULL,
  `category` VARCHAR(64) NULL,
  `amount` INT UNSIGNED NOT NULL,
  `method` VARCHAR(40) NOT NULL DEFAULT 'Tunai',
  `note` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tx_period_type` (`period`, `type`),
  INDEX `idx_tx_warga` (`warga_id`),
  CONSTRAINT `fk_tx_warga`
    FOREIGN KEY (`warga_id`) REFERENCES `warga` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Detail Item Iuran per Transaksi — Relasi FK ke transactions & dues
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_id` VARCHAR(64) NOT NULL,
  `due_id` VARCHAR(64) NULL,
  `name` VARCHAR(120) NOT NULL,
  `amount` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_items_tx` (`transaction_id`),
  INDEX `idx_items_due` (`due_id`),
  CONSTRAINT `fk_items_tx`
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_items_due`
    FOREIGN KEY (`due_id`) REFERENCES `dues` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
