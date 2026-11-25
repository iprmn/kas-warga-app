package com.iprmn.kaswarga;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "KasWargaNativeDB")
public class KasWargaNativeDbPlugin extends Plugin {
    private KasWargaDbHelper dbHelper;

    @Override
    public void load() {
        dbHelper = new KasWargaDbHelper(getContext());
    }

    private KasWargaDbHelper helper() {
        if (dbHelper == null) {
            dbHelper = new KasWargaDbHelper(getContext());
        }
        return dbHelper;
    }

    @PluginMethod
    public void bootstrap(PluginCall call) {
        try {
            SQLiteDatabase db = helper().getReadableDatabase();

            // 1. Settings
            Map<String, String> sMap = new HashMap<>();
            try (Cursor c = db.rawQuery("SELECT setting_key, setting_value FROM app_settings", null)) {
                while (c.moveToNext()) {
                    sMap.put(c.getString(0), c.getString(1));
                }
            }

            String rtNumber = sMap.containsKey("rt_number") ? sMap.get("rt_number") : "01";
            String rwNumber = sMap.containsKey("rw_number") ? sMap.get("rw_number") : "01";
            String housingName = sMap.containsKey("housing_name") ? sMap.get("housing_name") : "Perumahan Anda";
            String clusterName = sMap.containsKey("cluster_name") ? sMap.get("cluster_name") : "";
            String treasurerName = sMap.containsKey("treasurer_name") ? sMap.get("treasurer_name") : "Bendahara RT";
            long openingBalance = 0;
            try {
                openingBalance = Long.parseLong(sMap.containsKey("opening_balance") ? sMap.get("opening_balance") : "0");
            } catch (NumberFormatException ignored) {}

            JSObject settings = new JSObject();
            settings.put("rtNumber", rtNumber);
            settings.put("rwNumber", rwNumber);
            settings.put("housingName", housingName);
            settings.put("clusterName", clusterName);
            settings.put("treasurerName", treasurerName);
            settings.put("rtName", "RT " + rtNumber + " / RW " + rwNumber);
            settings.put("areaName", (clusterName != null && !clusterName.isEmpty()) ? (housingName + " • " + clusterName) : housingName);
            settings.put("openingBalance", openingBalance);

            // 2. Dues
            JSArray dues = new JSArray();
            try (Cursor c = db.rawQuery("SELECT id, name, amount, category, emoji, description FROM dues ORDER BY rowid ASC", null)) {
                while (c.moveToNext()) {
                    JSObject d = new JSObject();
                    d.put("id", c.getString(0));
                    d.put("name", c.getString(1));
                    d.put("amount", c.getLong(2));
                    d.put("category", "wajib".equals(c.getString(3)) ? "wajib" : "opsional");
                    d.put("emoji", c.getString(4));
                    d.put("desc", c.getString(5) != null ? c.getString(5) : "");
                    dues.put(d);
                }
            }

            // 3. Warga
            JSArray warga = new JSArray();
            try (Cursor c = db.rawQuery("SELECT id, name, blok, nomor, phone FROM warga ORDER BY blok ASC, nomor ASC", null)) {
                while (c.moveToNext()) {
                    JSObject w = new JSObject();
                    w.put("id", c.getString(0));
                    w.put("name", c.getString(1));
                    w.put("blok", c.getString(2));
                    w.put("nomor", c.getString(3));
                    w.put("phone", c.getString(4) != null ? c.getString(4) : "");
                    warga.put(w);
                }
            }

            // 4. Transaction Items grouped by transaction_id
            Map<String, List<JSObject>> itemsByTx = new HashMap<>();
            try (Cursor c = db.rawQuery("SELECT transaction_id, due_id, name, amount FROM transaction_items ORDER BY id ASC", null)) {
                while (c.moveToNext()) {
                    String txId = c.getString(0);
                    JSObject it = new JSObject();
                    if (!c.isNull(1)) it.put("dueId", c.getString(1));
                    it.put("name", c.getString(2));
                    it.put("amount", c.getLong(3));
                    itemsByTx.computeIfAbsent(txId, k -> new ArrayList<>()).add(it);
                }
            }

            // 5. Transactions
            JSArray transactions = new JSArray();
            try (Cursor c = db.rawQuery(
                "SELECT id, type, period, tx_date, warga_id, warga_name, warga_address, title, category, amount, method, note " +
                "FROM transactions ORDER BY tx_date DESC, rowid DESC", null)) {
                while (c.moveToNext()) {
                    String id = c.getString(0);
                    JSObject t = new JSObject();
                    t.put("id", id);
                    t.put("type", c.getString(1));
                    t.put("period", c.getString(2));
                    String rawDate = c.getString(3);
                    t.put("date", rawDate != null && rawDate.length() >= 10 ? rawDate.substring(0, 10) : rawDate);
                    if (!c.isNull(4)) t.put("wargaId", c.getString(4));
                    if (!c.isNull(5)) t.put("wargaName", c.getString(5));
                    if (!c.isNull(6)) t.put("wargaAddress", c.getString(6));
                    if (!c.isNull(7)) t.put("title", c.getString(7));
                    if (!c.isNull(8)) t.put("category", c.getString(8));
                    t.put("amount", c.getLong(9));
                    t.put("method", c.getString(10));
                    t.put("note", c.getString(11) != null ? c.getString(11) : "");

                    JSArray txItems = new JSArray();
                    List<JSObject> list = itemsByTx.get(id);
                    if (list != null) {
                        for (JSObject it : list) txItems.put(it);
                    }
                    t.put("items", txItems);
                    transactions.put(t);
                }
            }

            JSObject res = new JSObject();
            res.put("dbMode", "android-sqlite");
            res.put("settings", settings);
            res.put("dues", dues);
            res.put("warga", warga);
            res.put("transactions", transactions);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal membaca database SQLite perangkat: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void saveSettings(PluginCall call) {
        try {
            String rtNumber = call.getString("rtNumber", "01").trim();
            String rwNumber = call.getString("rwNumber", "01").trim();
            String housingName = call.getString("housingName", "Perumahan Anda").trim();
            String clusterName = call.getString("clusterName", "").trim();
            String treasurerName = call.getString("treasurerName", "Bendahara RT").trim();

            SQLiteDatabase db = helper().getWritableDatabase();
            db.beginTransaction();
            try {
                String[][] pairs = {
                    {"rt_number", rtNumber},
                    {"rw_number", rwNumber},
                    {"housing_name", housingName},
                    {"cluster_name", clusterName},
                    {"treasurer_name", treasurerName}
                };
                for (String[] p : pairs) {
                    ContentValues cv = new ContentValues();
                    cv.put("setting_key", p[0]);
                    cv.put("setting_value", p[1]);
                    db.insertWithOnConflict("app_settings", null, cv, SQLiteDatabase.CONFLICT_REPLACE);
                }
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
            }

            JSObject settings = new JSObject();
            settings.put("rtNumber", rtNumber);
            settings.put("rwNumber", rwNumber);
            settings.put("housingName", housingName);
            settings.put("clusterName", clusterName);
            settings.put("treasurerName", treasurerName);
            settings.put("rtName", "RT " + rtNumber + " / RW " + rwNumber);
            settings.put("areaName", !clusterName.isEmpty() ? (housingName + " • " + clusterName) : housingName);

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("settings", settings);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menyimpan pengaturan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void upsertWarga(PluginCall call) {
        try {
            String id = call.getString("id");
            String name = call.getString("name", "");
            String blok = call.getString("blok", "");
            String nomor = call.getString("nomor", "");
            String phone = call.getString("phone", "");
            if (id == null || id.isEmpty()) {
                call.reject("ID warga wajib diisi");
                return;
            }

            SQLiteDatabase db = helper().getWritableDatabase();
            ContentValues cv = new ContentValues();
            cv.put("id", id);
            cv.put("name", name);
            cv.put("blok", blok);
            cv.put("nomor", nomor);
            cv.put("phone", phone != null ? phone : "");
            db.insertWithOnConflict("warga", null, cv, SQLiteDatabase.CONFLICT_REPLACE);

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("warga", call.getData());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menyimpan data warga: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteWarga(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id == null || id.isEmpty()) {
                call.reject("ID warga wajib diisi");
                return;
            }
            SQLiteDatabase db = helper().getWritableDatabase();
            db.delete("warga", "id = ?", new String[]{id});

            JSObject res = new JSObject();
            res.put("ok", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menghapus data warga: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void upsertDue(PluginCall call) {
        try {
            String id = call.getString("id");
            String name = call.getString("name", "");
            long amount = call.getData().optLong("amount", 0);
            String category = "wajib".equals(call.getString("category", "opsional")) ? "wajib" : "opsional";
            String emoji = call.getString("emoji", "💰");
            String desc = call.getString("desc", "");
            if (id == null || id.isEmpty()) {
                call.reject("ID iuran wajib diisi");
                return;
            }

            SQLiteDatabase db = helper().getWritableDatabase();
            ContentValues cv = new ContentValues();
            cv.put("id", id);
            cv.put("name", name);
            cv.put("amount", amount);
            cv.put("category", category);
            cv.put("emoji", emoji != null ? emoji : "💰");
            cv.put("description", desc != null ? desc : "");
            db.insertWithOnConflict("dues", null, cv, SQLiteDatabase.CONFLICT_REPLACE);

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("due", call.getData());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menyimpan jenis iuran: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void recordTransaction(PluginCall call) {
        try {
            JSObject data = call.getData();
            String id = data.optString("id", "");
            if (id.isEmpty()) {
                call.reject("ID transaksi wajib diisi");
                return;
            }

            SQLiteDatabase db = helper().getWritableDatabase();
            db.beginTransaction();
            try {
                ContentValues cv = new ContentValues();
                cv.put("id", id);
                cv.put("type", data.optString("type", "masuk"));
                cv.put("period", data.optString("period", ""));
                cv.put("tx_date", data.optString("date", ""));
                if (data.has("wargaId") && !data.isNull("wargaId")) cv.put("warga_id", data.optString("wargaId"));
                else cv.putNull("warga_id");
                if (data.has("wargaName") && !data.isNull("wargaName")) cv.put("warga_name", data.optString("wargaName"));
                else cv.putNull("warga_name");
                if (data.has("wargaAddress") && !data.isNull("wargaAddress")) cv.put("warga_address", data.optString("wargaAddress"));
                else cv.putNull("warga_address");
                if (data.has("title") && !data.isNull("title")) cv.put("title", data.optString("title"));
                else cv.putNull("title");
                if (data.has("category") && !data.isNull("category")) cv.put("category", data.optString("category"));
                else cv.putNull("category");
                cv.put("amount", data.optLong("amount", 0));
                cv.put("method", data.optString("method", "Tunai"));
                cv.put("note", data.optString("note", ""));
                db.insertOrThrow("transactions", null, cv);

                JSONArray items = data.optJSONArray("items");
                if (items != null) {
                    for (int i = 0; i < items.length(); i++) {
                        JSONObject it = items.optJSONObject(i);
                        if (it == null) continue;
                        ContentValues icv = new ContentValues();
                        icv.put("transaction_id", id);
                        if (it.has("dueId") && !it.isNull("dueId")) icv.put("due_id", it.optString("dueId"));
                        else icv.putNull("due_id");
                        icv.put("name", it.optString("name", ""));
                        icv.put("amount", it.optLong("amount", 0));
                        db.insertOrThrow("transaction_items", null, icv);
                    }
                }
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
            }

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("transaction", data);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal mencatat transaksi: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void deleteTransaction(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id == null || id.isEmpty()) {
                call.reject("ID transaksi wajib diisi");
                return;
            }

            SQLiteDatabase db = helper().getWritableDatabase();
            db.beginTransaction();
            try {
                db.delete("transaction_items", "transaction_id = ?", new String[]{id});
                db.delete("transactions", "id = ?", new String[]{id});
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
            }

            JSObject res = new JSObject();
            res.put("ok", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menghapus transaksi: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void savePdf(PluginCall call) {
        try {
            String filename = call.getString("filename", "Laporan-Arus-Kas.pdf");
            String base64 = call.getString("base64", "");
            byte[] pdfBytes = Base64.decode(base64, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                ContentResolver resolver = getContext().getContentResolver();
                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (OutputStream out = resolver.openOutputStream(uri)) {
                        if (out != null) {
                            out.write(pdfBytes);
                            out.flush();
                        }
                    }
                }
            } else {
                File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir != null && !dir.exists()) dir.mkdirs();
                File outFile = new File(dir, filename);
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(pdfBytes);
                    fos.flush();
                }
            }

            getActivity().runOnUiThread(() ->
                Toast.makeText(getContext(), "PDF tersimpan di Download: " + filename, Toast.LENGTH_LONG).show()
            );

            JSObject res = new JSObject();
            res.put("ok", true);
            res.put("filename", filename);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Gagal menyimpan PDF: " + e.getMessage(), e);
        }
    }
}
