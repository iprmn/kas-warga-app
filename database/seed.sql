-- ============================================================================
-- KasWarga Initial Seed Data (MySQL) — inserted only when tables are empty
-- ============================================================================

INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES
  ('rt_number', '04'),
  ('rw_number', '07'),
  ('housing_name', 'Perum Melati Asri'),
  ('cluster_name', 'Cluster Anggrek'),
  ('treasurer_name', 'Ibu Rina'),
  ('opening_balance', '4850000');

INSERT IGNORE INTO `dues` (`id`, `name`, `amount`, `category`, `emoji`, `description`) VALUES
  ('due-kas', 'Iuran Kas Rutin RT', 50000, 'wajib', '🏠', 'Operasional & pemeliharaan lingkungan RT bulanan'),
  ('due-keamanan', 'Keamanan & Ronda', 30000, 'wajib', '🛡️', 'Gaji satpam portal malam & lampu pos kamling'),
  ('due-sampah', 'Kebersihan & Sampah', 25000, 'opsional', '🧹', 'Pengangkutan sampah 3x seminggu & sapu jalan'),
  ('due-sosial', 'Dana Sosial', 15000, 'opsional', '🤝', 'Bantuan warga sakit, duka cita, dan bakti sosial'),
  ('due-taman', 'Taman & Lampu', 20000, 'opsional', '💡', 'Penggantian lampu PJU & pemangkasan pohon blok'),
  ('due-kegiatan', 'Acara Warga', 20000, 'opsional', '🎊', 'Kas persiapan kerja bakti, pengajian & HUT RI');

INSERT IGNORE INTO `warga` (`id`, `name`, `blok`, `nomor`, `phone`) VALUES
  ('w-1', 'Pak Budi Santoso', 'A', '01', '081234560001'),
  ('w-2', 'Bu Siti Aminah', 'A', '02', '081234560002'),
  ('w-3', 'Pak Hendra Wijaya', 'A', '03', '081234560003'),
  ('w-4', 'Pak Agus Pratama', 'A', '04', '081234560004'),
  ('w-5', 'Bu Dewi Lestari', 'B', '01', '081234560005'),
  ('w-6', 'Pak Rahmat Hidayat', 'B', '02', '081234560006'),
  ('w-7', 'Pak Eko Saputro', 'B', '03', '081234560007'),
  ('w-8', 'Bu Nurul Huda', 'B', '04', '081234560008'),
  ('w-9', 'Pak Fajar Nugroho', 'C', '01', '081234560009'),
  ('w-10', 'Bu Maya Kartika', 'C', '02', '081234560010');

INSERT IGNORE INTO `transactions` (`id`, `type`, `period`, `tx_date`, `warga_id`, `warga_name`, `warga_address`, `title`, `category`, `amount`, `method`, `note`) VALUES
  ('tx-101', 'masuk', '2026-11', '2026-11-03', 'w-1', 'Pak Budi Santoso', 'Blok A-01', NULL, NULL, 105000, 'QRIS RT', 'Lunas paket bulanan'),
  ('tx-102', 'masuk', '2026-11', '2026-11-04', 'w-2', 'Bu Siti Aminah', 'Blok A-02', NULL, NULL, 120000, 'Transfer', ''),
  ('tx-103', 'masuk', '2026-11', '2026-11-05', 'w-3', 'Pak Hendra Wijaya', 'Blok A-03', NULL, NULL, 80000, 'Tunai', 'Titip di pos ronda'),
  ('tx-104', 'masuk', '2026-11', '2026-11-06', 'w-5', 'Bu Dewi Lestari', 'Blok B-01', NULL, NULL, 105000, 'QRIS RT', ''),
  ('tx-105', 'masuk', '2026-11', '2026-11-08', 'w-6', 'Pak Rahmat Hidayat', 'Blok B-02', NULL, NULL, 125000, 'Transfer', ''),
  ('tx-106', 'masuk', '2026-11', '2026-11-10', 'w-9', 'Pak Fajar Nugroho', 'Blok C-01', NULL, NULL, 80000, 'Tunai', ''),
  ('tx-107', 'keluar', '2026-11', '2026-11-12', NULL, NULL, NULL, 'Honor Petugas Sampah', 'Kebersihan', 220000, 'Tunai', 'Diterima Pak Slamet'),
  ('tx-108', 'keluar', '2026-11', '2026-11-16', NULL, NULL, NULL, 'Ganti 3 Lampu LED Blok B', 'Fasilitas', 135000, 'Tunai', 'Toko Listrik Jaya'),
  ('tx-091', 'masuk', '2026-10', '2026-10-08', 'w-1', 'Pak Budi Santoso', 'Blok A-01', NULL, NULL, 950000, 'Rekap Okt', 'Akumulasi iuran Oktober'),
  ('tx-092', 'keluar', '2026-10', '2026-10-20', NULL, NULL, NULL, 'Operasional Ronda & Kebersihan', 'Kebersihan', 460000, 'Tunai', 'Pengeluaran rutin Oktober'),
  ('tx-081', 'masuk', '2026-09', '2026-09-09', 'w-2', 'Bu Siti Aminah', 'Blok A-02', NULL, NULL, 880000, 'Rekap Sep', 'Akumulasi iuran September'),
  ('tx-082', 'keluar', '2026-09', '2026-09-22', NULL, NULL, NULL, 'Konsumsi Kerja Bakti', 'Kegiatan', 310000, 'Tunai', 'Kerja bakti Minggu pagi');

INSERT INTO `transaction_items` (`transaction_id`, `due_id`, `name`, `amount`) VALUES
  ('tx-101', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-101', 'due-sampah', 'Kebersihan & Sampah', 25000),
  ('tx-101', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-102', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-102', 'due-sampah', 'Kebersihan & Sampah', 25000),
  ('tx-102', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-102', 'due-sosial', 'Dana Sosial', 15000),
  ('tx-103', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-103', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-104', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-104', 'due-sampah', 'Kebersihan & Sampah', 25000),
  ('tx-104', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-105', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-105', 'due-sampah', 'Kebersihan & Sampah', 25000),
  ('tx-105', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-105', 'due-kegiatan', 'Acara Warga', 20000),
  ('tx-106', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-106', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-091', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-091', 'due-keamanan', 'Keamanan & Ronda', 30000),
  ('tx-081', 'due-kas', 'Iuran Kas Rutin RT', 50000),
  ('tx-081', 'due-keamanan', 'Keamanan & Ronda', 30000);
