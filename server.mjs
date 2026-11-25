import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT || 8765);
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "kas_warga",
};

let pool;

async function initMySqlDatabase() {
  // 1. Ensure database and relational tables exist from database/schema.sql
  const bootstrapConn = await mysql.createConnection({
    host: MYSQL_CONFIG.host,
    port: MYSQL_CONFIG.port,
    user: MYSQL_CONFIG.user,
    password: MYSQL_CONFIG.password,
    multipleStatements: true,
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, "database", "schema.sql"), "utf8");
  await bootstrapConn.query(schemaSql);
  await bootstrapConn.end();

  // 2. Open pooled connection to kas_warga MySQL database
  pool = mysql.createPool({
    ...MYSQL_CONFIG,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    multipleStatements: true,
  });

  // 3. Seed initial relational records ONLY if tables are completely empty
  const [[dueCountRow]] = await pool.query("SELECT COUNT(*) AS c FROM dues");
  const [[wargaCountRow]] = await pool.query("SELECT COUNT(*) AS c FROM warga");
  if (Number(dueCountRow.c) === 0 && Number(wargaCountRow.c) === 0) {
    const seedSql = fs.readFileSync(path.join(__dirname, "database", "seed.sql"), "utf8");
    await pool.query(seedSql);
    console.log("Seeded initial relational records into MySQL database:", MYSQL_CONFIG.database);
  }
}

async function getBootstrapData() {
  const [settingsRows] = await pool.query("SELECT setting_key, setting_value FROM app_settings");
  const sMap = Object.fromEntries(settingsRows.map((r) => [r.setting_key, r.setting_value]));

  const rtNumber = sMap.rt_number || "04";
  const rwNumber = sMap.rw_number || "07";
  const housingName = sMap.housing_name || "Perum Melati Asri";
  const clusterName = sMap.cluster_name !== undefined ? sMap.cluster_name : "Cluster Anggrek";
  const treasurerName = sMap.treasurer_name || "Ibu Rina";

  const settings = {
    rtNumber,
    rwNumber,
    housingName,
    clusterName,
    treasurerName,
    rtName: `RT ${rtNumber} / RW ${rwNumber}`,
    areaName: clusterName ? `${housingName} • ${clusterName}` : housingName,
    openingBalance: Number(sMap.opening_balance || 4850000),
  };

  const [dueRows] = await pool.query("SELECT id, name, amount, category, emoji, description FROM dues ORDER BY created_at ASC, id ASC");
  const dues = dueRows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    category: r.category === "wajib" ? "wajib" : "opsional",
    emoji: r.emoji,
    desc: r.description || "",
  }));

  const [wargaRows] = await pool.query("SELECT id, name, blok, nomor, phone FROM warga ORDER BY blok ASC, nomor ASC");
  const warga = wargaRows.map((r) => ({
    id: r.id,
    name: r.name,
    blok: r.blok,
    nomor: r.nomor,
    phone: r.phone || "",
  }));

  const [txRows] = await pool.query(
    "SELECT id, type, period, tx_date, warga_id, warga_name, warga_address, title, category, amount, method, note FROM transactions ORDER BY tx_date DESC, created_at DESC"
  );
  const [itemRows] = await pool.query(
    "SELECT transaction_id, due_id, name, amount FROM transaction_items ORDER BY id ASC"
  );

  const itemsByTx = new Map();
  for (const it of itemRows) {
    if (!itemsByTx.has(it.transaction_id)) itemsByTx.set(it.transaction_id, []);
    itemsByTx.get(it.transaction_id).push({
      dueId: it.due_id,
      name: it.name,
      amount: Number(it.amount),
    });
  }

  const transactions = txRows.map((t) => ({
    id: t.id,
    type: t.type,
    period: t.period,
    date: String(t.tx_date).slice(0, 10),
    wargaId: t.warga_id || undefined,
    wargaName: t.warga_name || undefined,
    wargaAddress: t.warga_address || undefined,
    title: t.title || undefined,
    category: t.category || undefined,
    amount: Number(t.amount),
    method: t.method,
    note: t.note || "",
    items: itemsByTx.get(t.id) || [],
  }));

  return { dbMode: "mysql", database: MYSQL_CONFIG.database, settings, dues, warga, transactions };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function startServer() {
  await initMySqlDatabase();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const pathname = url.pathname;

    try {
      // ================= RELATIONAL MYSQL REST API =================
      if (pathname === "/api/bootstrap" && req.method === "GET") {
        return sendJson(res, 200, await getBootstrapData());
      }

      if (pathname === "/api/settings" && req.method === "PUT") {
        const s = await readJsonBody(req);
        const rtNumber = String(s.rtNumber || "04").trim();
        const rwNumber = String(s.rwNumber || "07").trim();
        const housingName = String(s.housingName || "Perum Melati Asri").trim();
        const clusterName = String(s.clusterName || "").trim();
        const treasurerName = String(s.treasurerName || "Bendahara").trim();

        const pairs = [
          ["rt_number", rtNumber],
          ["rw_number", rwNumber],
          ["housing_name", housingName],
          ["cluster_name", clusterName],
          ["treasurer_name", treasurerName],
        ];
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          for (const [k, v] of pairs) {
            await conn.execute(
              "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
              [k, v]
            );
          }
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        return sendJson(res, 200, {
          ok: true,
          settings: {
            rtNumber,
            rwNumber,
            housingName,
            clusterName,
            treasurerName,
            rtName: `RT ${rtNumber} / RW ${rwNumber}`,
            areaName: clusterName ? `${housingName} • ${clusterName}` : housingName,
          },
        });
      }

      if (pathname === "/api/warga" && req.method === "POST") {
        const w = await readJsonBody(req);
        await pool.execute(
          `INSERT INTO warga (id, name, blok, nomor, phone)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), blok = VALUES(blok), nomor = VALUES(nomor), phone = VALUES(phone)`,
          [w.id, w.name, w.blok, w.nomor, w.phone || ""]
        );
        return sendJson(res, 200, { ok: true, warga: w });
      }

      if (pathname.startsWith("/api/warga/") && req.method === "DELETE") {
        const id = decodeURIComponent(pathname.slice("/api/warga/".length));
        await pool.execute("DELETE FROM warga WHERE id = ?", [id]);
        return sendJson(res, 200, { ok: true });
      }

      if (pathname === "/api/dues" && req.method === "POST") {
        const d = await readJsonBody(req);
        const cat = d.category === "wajib" ? "wajib" : "opsional";
        await pool.execute(
          `INSERT INTO dues (id, name, amount, category, emoji, description)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), amount = VALUES(amount), category = VALUES(category), emoji = VALUES(emoji), description = VALUES(description)`,
          [d.id, d.name, Number(d.amount), cat, d.emoji || "💰", d.desc || ""]
        );
        return sendJson(res, 200, { ok: true, due: { ...d, category: cat } });
      }

      if (pathname === "/api/transactions" && req.method === "POST") {
        const tx = await readJsonBody(req);
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute(
            `INSERT INTO transactions (
              id, type, period, tx_date, warga_id, warga_name, warga_address, title, category, amount, method, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tx.id,
              tx.type,
              tx.period,
              tx.date,
              tx.wargaId || null,
              tx.wargaName || null,
              tx.wargaAddress || null,
              tx.title || null,
              tx.category || null,
              Number(tx.amount),
              tx.method || "Tunai",
              tx.note || "",
            ]
          );

          if (Array.isArray(tx.items) && tx.items.length > 0) {
            for (const it of tx.items) {
              await conn.execute(
                "INSERT INTO transaction_items (transaction_id, due_id, name, amount) VALUES (?, ?, ?, ?)",
                [tx.id, it.dueId || null, it.name, Number(it.amount)]
              );
            }
          }
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
        return sendJson(res, 200, { ok: true, transaction: tx });
      }

      if (pathname.startsWith("/api/transactions/") && req.method === "DELETE") {
        const id = decodeURIComponent(pathname.slice("/api/transactions/".length));
        await pool.execute("DELETE FROM transactions WHERE id = ?", [id]);
        return sendJson(res, 200, { ok: true });
      }

      // ================= STATIC ASSETS (public/) =================
      const relPath = pathname === "/" ? "/index.html" : pathname;
      const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, "");
      const fullPath = path.join(PUBLIC_DIR, safePath);

      if (!fullPath.startsWith(PUBLIC_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      const ext = path.extname(fullPath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(fullPath).pipe(res);
    } catch (err) {
      console.error("API / Server error:", err);
      sendJson(res, 500, { ok: false, error: String(err.message || err) });
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`KasWarga running at http://127.0.0.1:${PORT} (MySQL: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database})`);
  });
}

startServer().catch((err) => {
  console.error("Gagal menghubungkan ke MySQL:", err);
  process.exit(1);
});
