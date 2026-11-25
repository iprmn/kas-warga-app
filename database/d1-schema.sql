-- ============================================================================
-- KasWarga Relational SQL Schema for Cloudflare D1 (Exact mirror of MySQL tables)
-- ============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('wajib', 'opsional')),
  emoji TEXT NOT NULL DEFAULT '💰',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dues_category ON dues (category);

CREATE TABLE IF NOT EXISTS warga (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blok TEXT NOT NULL,
  nomor TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_warga_blok_nomor ON warga (blok, nomor);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
  period TEXT NOT NULL,
  tx_date TEXT NOT NULL,
  warga_id TEXT NULL,
  warga_name TEXT NULL,
  warga_address TEXT NULL,
  title TEXT NULL,
  category TEXT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'Tunai',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_period_type ON transactions (period, type);
CREATE INDEX IF NOT EXISTS idx_tx_warga ON transactions (warga_id);

CREATE TABLE IF NOT EXISTS transaction_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  due_id TEXT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_tx ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_items_due ON transaction_items (due_id);
