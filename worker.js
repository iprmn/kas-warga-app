/* Cloudflare Worker API + Static Assets Handler backed by Cloudflare D1 Relational DB */

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function getBootstrapData(db) {
  const { results: settingsRows } = await db
    .prepare("SELECT setting_key, setting_value FROM app_settings")
    .all();
  const sMap = Object.fromEntries((settingsRows || []).map((r) => [r.setting_key, r.setting_value]));

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

  const { results: dueRows } = await db
    .prepare("SELECT id, name, amount, category, emoji, description FROM dues ORDER BY rowid ASC")
    .all();
  const dues = (dueRows || []).map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    category: r.category === "wajib" ? "wajib" : "opsional",
    emoji: r.emoji,
    desc: r.description || "",
  }));

  const { results: wargaRows } = await db
    .prepare("SELECT id, name, blok, nomor, phone FROM warga ORDER BY blok ASC, nomor ASC")
    .all();
  const warga = (wargaRows || []).map((r) => ({
    id: r.id,
    name: r.name,
    blok: r.blok,
    nomor: r.nomor,
    phone: r.phone || "",
  }));

  const { results: txRows } = await db
    .prepare(
      "SELECT id, type, period, tx_date, warga_id, warga_name, warga_address, title, category, amount, method, note FROM transactions ORDER BY tx_date DESC, rowid DESC"
    )
    .all();
  const { results: itemRows } = await db
    .prepare("SELECT transaction_id, due_id, name, amount FROM transaction_items ORDER BY id ASC")
    .all();

  const itemsByTx = new Map();
  for (const it of itemRows || []) {
    if (!itemsByTx.has(it.transaction_id)) itemsByTx.set(it.transaction_id, []);
    itemsByTx.get(it.transaction_id).push({
      dueId: it.due_id,
      name: it.name,
      amount: Number(it.amount),
    });
  }

  const transactions = (txRows || []).map((t) => ({
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

  return { dbMode: "d1", settings, dues, warga, transactions };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const db = env.DB;

    if (pathname.startsWith("/api/")) {
      try {
        if (pathname === "/api/bootstrap" && request.method === "GET") {
          return jsonRes(await getBootstrapData(db));
        }

        if (pathname === "/api/settings" && request.method === "PUT") {
          const s = await request.json();
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

          await db.batch(
            pairs.map(([k, v]) =>
              db
                .prepare("INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)")
                .bind(k, v)
            )
          );

          return jsonRes({
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

        if (pathname === "/api/warga" && request.method === "POST") {
          const w = await request.json();
          await db
            .prepare(
              `INSERT INTO warga (id, name, blok, nomor, phone) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name = excluded.name, blok = excluded.blok, nomor = excluded.nomor, phone = excluded.phone`
            )
            .bind(w.id, w.name, w.blok, w.nomor, w.phone || "")
            .run();
          return jsonRes({ ok: true, warga: w });
        }

        if (pathname.startsWith("/api/warga/") && request.method === "DELETE") {
          const id = decodeURIComponent(pathname.slice("/api/warga/".length));
          await db.prepare("DELETE FROM warga WHERE id = ?").bind(id).run();
          return jsonRes({ ok: true });
        }

        if (pathname === "/api/dues" && request.method === "POST") {
          const d = await request.json();
          const cat = d.category === "wajib" ? "wajib" : "opsional";
          await db
            .prepare(
              `INSERT INTO dues (id, name, amount, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET name = excluded.name, amount = excluded.amount, category = excluded.category, emoji = excluded.emoji, description = excluded.description`
            )
            .bind(d.id, d.name, Number(d.amount), cat, d.emoji || "💰", d.desc || "")
            .run();
          return jsonRes({ ok: true, due: { ...d, category: cat } });
        }

        if (pathname === "/api/transactions" && request.method === "POST") {
          const tx = await request.json();
          const stmts = [
            db
              .prepare(
                `INSERT INTO transactions (
                  id, type, period, tx_date, warga_id, warga_name, warga_address, title, category, amount, method, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
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
                tx.note || ""
              ),
          ];

          if (Array.isArray(tx.items) && tx.items.length > 0) {
            for (const it of tx.items) {
              stmts.push(
                db
                  .prepare("INSERT INTO transaction_items (transaction_id, due_id, name, amount) VALUES (?, ?, ?, ?)")
                  .bind(tx.id, it.dueId || null, it.name, Number(it.amount))
              );
            }
          }

          await db.batch(stmts);
          return jsonRes({ ok: true, transaction: tx });
        }

        if (pathname.startsWith("/api/transactions/") && request.method === "DELETE") {
          const id = decodeURIComponent(pathname.slice("/api/transactions/".length));
          await db.batch([
            db.prepare("DELETE FROM transaction_items WHERE transaction_id = ?").bind(id),
            db.prepare("DELETE FROM transactions WHERE id = ?").bind(id),
          ]);
          return jsonRes({ ok: true });
        }

        return jsonRes({ ok: false, error: "Not Found" }, 404);
      } catch (err) {
        return jsonRes({ ok: false, error: String(err?.message || err) }, 500);
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    if (env.KAS_ASSETS) {
      const key = pathname === "/" ? "/index.html" : pathname;
      const content = await env.KAS_ASSETS.get(key);
      if (content !== null) {
        const mimeMap = {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".json": "application/json; charset=utf-8",
        };
        const ext = key.slice(key.lastIndexOf("."));
        return new Response(content, {
          status: 200,
          headers: {
            "Content-Type": mimeMap[ext] || "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
