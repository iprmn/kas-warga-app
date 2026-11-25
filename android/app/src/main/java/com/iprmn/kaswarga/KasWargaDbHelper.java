package com.iprmn.kaswarga;

import android.content.ContentValues;
import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class KasWargaDbHelper extends SQLiteOpenHelper {
    public static final String DATABASE_NAME = "kas_warga.db";
    public static final int DATABASE_VERSION = 1;

    public KasWargaDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS app_settings (" +
            "  setting_key TEXT PRIMARY KEY," +
            "  setting_value TEXT NOT NULL" +
            ")"
        );

        db.execSQL(
            "CREATE TABLE IF NOT EXISTS dues (" +
            "  id TEXT PRIMARY KEY," +
            "  name TEXT NOT NULL," +
            "  amount INTEGER NOT NULL," +
            "  category TEXT NOT NULL DEFAULT 'opsional'," +
            "  emoji TEXT NOT NULL DEFAULT '💰'," +
            "  description TEXT NOT NULL DEFAULT ''," +
            "  created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
            ")"
        );

        db.execSQL(
            "CREATE TABLE IF NOT EXISTS warga (" +
            "  id TEXT PRIMARY KEY," +
            "  name TEXT NOT NULL," +
            "  blok TEXT NOT NULL," +
            "  nomor TEXT NOT NULL," +
            "  phone TEXT NOT NULL DEFAULT ''," +
            "  created_at TEXT DEFAULT CURRENT_TIMESTAMP" +
            ")"
        );

        db.execSQL(
            "CREATE TABLE IF NOT EXISTS transactions (" +
            "  id TEXT PRIMARY KEY," +
            "  type TEXT NOT NULL," +
            "  period TEXT NOT NULL," +
            "  tx_date TEXT NOT NULL," +
            "  warga_id TEXT NULL," +
            "  warga_name TEXT NULL," +
            "  warga_address TEXT NULL," +
            "  title TEXT NULL," +
            "  category TEXT NULL," +
            "  amount INTEGER NOT NULL," +
            "  method TEXT NOT NULL DEFAULT 'Tunai'," +
            "  note TEXT NOT NULL DEFAULT ''," +
            "  created_at TEXT DEFAULT CURRENT_TIMESTAMP," +
            "  FOREIGN KEY (warga_id) REFERENCES warga(id) ON DELETE SET NULL" +
            ")"
        );

        db.execSQL(
            "CREATE TABLE IF NOT EXISTS transaction_items (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  transaction_id TEXT NOT NULL," +
            "  due_id TEXT NULL," +
            "  name TEXT NOT NULL," +
            "  amount INTEGER NOT NULL," +
            "  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE," +
            "  FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE SET NULL" +
            ")"
        );

        db.execSQL("CREATE INDEX IF NOT EXISTS idx_tx_period ON transactions(period)");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_tx_warga ON transactions(warga_id)");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_items_tx ON transaction_items(transaction_id)");

        // Clean initial settings per device (no dummy resident/due data)
        String[][] defaults = {
            {"rt_number", "01"},
            {"rw_number", "01"},
            {"housing_name", "Perumahan Anda"},
            {"cluster_name", ""},
            {"treasurer_name", "Bendahara RT"},
            {"opening_balance", "0"}
        };
        for (String[] pair : defaults) {
            ContentValues cv = new ContentValues();
            cv.put("setting_key", pair[0]);
            cv.put("setting_value", pair[1]);
            db.insertWithOnConflict("app_settings", null, cv, SQLiteDatabase.CONFLICT_IGNORE);
        }
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Reserved for future schema migrations
    }
}
