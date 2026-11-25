/* Dual-mode Data Layer (mirroring toko-app architecture):
 *   1) Demo Mode (/demo, ?demo=1, #demo): Pure in-memory temporary sample data (never touches MySQL/D1)
 *   2) Main App (/): Strict relational database API (/api/* -> MySQL locally, Cloudflare D1 in production)
 */
(() => {
  "use strict";

  function isDemoMode() {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("demo") && params.get("demo") !== "0" && params.get("demo") !== "false") {
        return true;
      }
      if (params.get("mode") === "demo") return true;
      const hash = (window.location.hash || "").toLowerCase();
      if (hash === "#demo" || hash.startsWith("#demo?") || hash.startsWith("#/demo")) {
        return true;
      }
      const pathname = (window.location.pathname || "").toLowerCase();
      if (pathname.endsWith("/demo") || pathname.endsWith("/demo/") || pathname.endsWith("/demo.html")) {
        return true;
      }
    } catch {
      // Ignore URL parse error
    }
    return false;
  }

  function createInitialDemoState() {
    return {
      dbMode: "demo",
      settings: {
        rtNumber: "04",
        rwNumber: "07",
        housingName: "Perum Melati Asri",
        clusterName: "Cluster Anggrek",
        treasurerName: "Ibu Rina",
        rtName: "RT 04 / RW 07",
        areaName: "Perum Melati Asri • Cluster Anggrek",
        openingBalance: 4850000,
      },
      dues: [
        { id: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000, category: "wajib", emoji: "🏠", desc: "Operasional & pemeliharaan lingkungan RT bulanan" },
        { id: "due-keamanan", name: "Keamanan & Ronda", amount: 30000, category: "wajib", emoji: "🛡️", desc: "Gaji satpam portal malam & lampu pos kamling" },
        { id: "due-sampah", name: "Kebersihan & Sampah", amount: 25000, category: "opsional", emoji: "🧹", desc: "Pengangkutan sampah 3x seminggu & sapu jalan" },
        { id: "due-sosial", name: "Dana Sosial", amount: 15000, category: "opsional", emoji: "🤝", desc: "Bantuan warga sakit, duka cita, dan bakti sosial" },
        { id: "due-taman", name: "Taman & Lampu", amount: 20000, category: "opsional", emoji: "💡", desc: "Penggantian lampu PJU & pemangkasan pohon blok" },
        { id: "due-kegiatan", name: "Acara Warga", amount: 20000, category: "opsional", emoji: "🎊", desc: "Kas persiapan kerja bakti, pengajian & HUT RI" },
      ],
      warga: [
        { id: "w-1", name: "Pak Budi Santoso", blok: "A", nomor: "01", phone: "081234560001" },
        { id: "w-2", name: "Bu Siti Aminah", blok: "A", nomor: "02", phone: "081234560002" },
        { id: "w-3", name: "Pak Hendra Wijaya", blok: "A", nomor: "03", phone: "081234560003" },
        { id: "w-4", name: "Pak Agus Pratama", blok: "A", nomor: "04", phone: "081234560004" },
        { id: "w-5", name: "Bu Dewi Lestari", blok: "B", nomor: "01", phone: "081234560005" },
        { id: "w-6", name: "Pak Rahmat Hidayat", blok: "B", nomor: "02", phone: "081234560006" },
        { id: "w-7", name: "Pak Eko Saputro", blok: "B", nomor: "03", phone: "081234560007" },
        { id: "w-8", name: "Bu Nurul Huda", blok: "B", nomor: "04", phone: "081234560008" },
        { id: "w-9", name: "Pak Fajar Nugroho", blok: "C", nomor: "01", phone: "081234560009" },
        { id: "w-10", name: "Bu Maya Kartika", blok: "C", nomor: "02", phone: "081234560010" },
      ],
      transactions: [
        {
          id: "tx-101", type: "masuk", period: "2026-11", date: "2026-11-03",
          wargaId: "w-1", wargaName: "Pak Budi Santoso", wargaAddress: "Blok A-01",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-sampah", name: "Kebersihan & Sampah", amount: 25000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 105000, method: "QRIS RT", note: "Lunas paket bulanan",
        },
        {
          id: "tx-102", type: "masuk", period: "2026-11", date: "2026-11-04",
          wargaId: "w-2", wargaName: "Bu Siti Aminah", wargaAddress: "Blok A-02",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-sampah", name: "Kebersihan & Sampah", amount: 25000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
            { dueId: "due-sosial", name: "Dana Sosial", amount: 15000 },
          ],
          amount: 120000, method: "Transfer", note: "",
        },
        {
          id: "tx-103", type: "masuk", period: "2026-11", date: "2026-11-05",
          wargaId: "w-3", wargaName: "Pak Hendra Wijaya", wargaAddress: "Blok A-03",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 80000, method: "Tunai", note: "Titip di pos ronda",
        },
        {
          id: "tx-104", type: "masuk", period: "2026-11", date: "2026-11-06",
          wargaId: "w-5", wargaName: "Bu Dewi Lestari", wargaAddress: "Blok B-01",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-sampah", name: "Kebersihan & Sampah", amount: 25000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 105000, method: "QRIS RT", note: "",
        },
        {
          id: "tx-105", type: "masuk", period: "2026-11", date: "2026-11-08",
          wargaId: "w-6", wargaName: "Pak Rahmat Hidayat", wargaAddress: "Blok B-02",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-sampah", name: "Kebersihan & Sampah", amount: 25000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
            { dueId: "due-kegiatan", name: "Acara Warga", amount: 20000 },
          ],
          amount: 125000, method: "Transfer", note: "",
        },
        {
          id: "tx-106", type: "masuk", period: "2026-11", date: "2026-11-10",
          wargaId: "w-9", wargaName: "Pak Fajar Nugroho", wargaAddress: "Blok C-01",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 80000, method: "Tunai", note: "",
        },
        {
          id: "tx-107", type: "keluar", period: "2026-11", date: "2026-11-12",
          title: "Honor Petugas Sampah", category: "Kebersihan",
          amount: 220000, method: "Tunai", note: "Diterima Pak Slamet", items: [],
        },
        {
          id: "tx-108", type: "keluar", period: "2026-11", date: "2026-11-16",
          title: "Ganti 3 Lampu LED Blok B", category: "Fasilitas",
          amount: 135000, method: "Tunai", note: "Toko Listrik Jaya", items: [],
        },
        {
          id: "tx-091", type: "masuk", period: "2026-10", date: "2026-10-08",
          wargaId: "w-1", wargaName: "Pak Budi Santoso", wargaAddress: "Blok A-01",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 950000, method: "Rekap Okt", note: "Akumulasi iuran Oktober",
        },
        {
          id: "tx-092", type: "keluar", period: "2026-10", date: "2026-10-20",
          title: "Operasional Ronda & Kebersihan", category: "Kebersihan",
          amount: 460000, method: "Tunai", note: "Pengeluaran rutin Oktober", items: [],
        },
        {
          id: "tx-081", type: "masuk", period: "2026-09", date: "2026-09-09",
          wargaId: "w-2", wargaName: "Bu Siti Aminah", wargaAddress: "Blok A-02",
          items: [
            { dueId: "due-kas", name: "Iuran Kas Rutin RT", amount: 50000 },
            { dueId: "due-keamanan", name: "Keamanan & Ronda", amount: 30000 },
          ],
          amount: 880000, method: "Rekap Sep", note: "Akumulasi iuran September",
        },
        {
          id: "tx-082", type: "keluar", period: "2026-09", date: "2026-09-22",
          title: "Konsumsi Kerja Bakti", category: "Kegiatan",
          amount: 310000, method: "Tunai", note: "Kerja bakti Minggu pagi", items: [],
        },
      ],
    };
  }

  let demoMemory = createInitialDemoState();
  const clone = (v) => JSON.parse(JSON.stringify(v));

  async function apiJson(url, options = {}) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  window.kasDb = {
    isDemo() {
      return isDemoMode();
    },

    async resetDemoData() {
      demoMemory = createInitialDemoState();
      return clone(demoMemory);
    },

    async bootstrap() {
      if (isDemoMode()) return clone(demoMemory);
      return apiJson("/api/bootstrap", { method: "GET" });
    },

    async upsertWarga(w) {
      if (isDemoMode()) {
        const idx = demoMemory.warga.findIndex((x) => x.id === w.id);
        if (idx >= 0) demoMemory.warga[idx] = { ...w };
        else demoMemory.warga.push({ ...w });
        return { ok: true, warga: w };
      }
      return apiJson("/api/warga", { method: "POST", body: JSON.stringify(w) });
    },

    async deleteWarga(id) {
      if (isDemoMode()) {
        demoMemory.warga = demoMemory.warga.filter((x) => x.id !== id);
        return { ok: true };
      }
      return apiJson(`/api/warga/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async upsertDue(d) {
      if (isDemoMode()) {
        const idx = demoMemory.dues.findIndex((x) => x.id === d.id);
        if (idx >= 0) demoMemory.dues[idx] = { ...d };
        else demoMemory.dues.push({ ...d });
        return { ok: true, due: d };
      }
      return apiJson("/api/dues", { method: "POST", body: JSON.stringify(d) });
    },

    async recordTransaction(tx) {
      if (isDemoMode()) {
        demoMemory.transactions.unshift(clone(tx));
        return { ok: true, transaction: tx };
      }
      return apiJson("/api/transactions", { method: "POST", body: JSON.stringify(tx) });
    },

    async deleteTransaction(id) {
      if (isDemoMode()) {
        demoMemory.transactions = demoMemory.transactions.filter((t) => t.id !== id);
        return { ok: true };
      }
      return apiJson(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async saveSettings(settings) {
      if (isDemoMode()) {
        demoMemory.settings = { ...demoMemory.settings, ...settings };
        return { ok: true, settings: demoMemory.settings };
      }
      return apiJson("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
    },
  };
})();
