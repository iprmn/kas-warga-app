(() => {
  "use strict";

  const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const AVAILABLE_PERIODS = [
    "2026-12", "2026-11", "2026-10", "2026-09", "2026-08", "2026-07",
    "2026-06", "2026-05", "2026-04", "2026-03", "2026-02", "2026-01",
    "2025-12", "2025-11", "2025-10",
  ];

  const CATEGORY_META = {
    wajib: { label: "Wajib", emoji: "🏠" },
    opsional: { label: "Opsional", emoji: "✨" },
  };

  const SVG_IN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>`;
  const SVG_OUT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>`;
  const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_WARN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const SVG_QUESTION = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  // ================= STATE =================
  let state = {
    dbMode: "mysql",
    settings: {
      rtNumber: "01",
      rwNumber: "01",
      housingName: "Perumahan Anda",
      clusterName: "",
      treasurerName: "Bendahara RT",
      rtName: "RT 01 / RW 01",
      areaName: "Perumahan Anda",
      openingBalance: 0,
    },
    dues: [],
    warga: [],
    transactions: [],
  };

  let ui = {
    activeTab: "beranda",
    period: "2026-11",
    checkoutPeriod: "2026-11",
    search: "",
    hideBalance: false,
    dueCategory: "semua",
    homeWargaStatus: "belum",
    wargaStatus: "semua",
    wargaBlok: "semua",
    txFilter: "semua",
    selectedDueIds: [],
    selectedWargaId: "",
    paymentMethod: "Tunai",
    activeReceiptTxId: null,
    activeDetailDueId: null,
    activeDetailWargaId: null,
  };

  // ================= HELPERS =================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function normalizeCategory(cat) {
    return cat === "wajib" ? "wajib" : "opsional";
  }

  function formatRp(num) {
    return "Rp " + Math.round(Number(num) || 0).toLocaleString("id-ID");
  }

  function formatPeriod(periodStr) {
    if (!periodStr) return "-";
    const parts = String(periodStr).split("-");
    if (parts.length !== 2) return periodStr;
    const mIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
    return `${MONTHS_ID[mIdx]} ${parts[0]}`;
  }

  function formatShortDate(isoStr) {
    if (!isoStr) return "-";
    const parts = String(isoStr).split("-");
    if (parts.length !== 3) return isoStr;
    const day = parts[2];
    const mIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
    return `${day} ${MONTHS_ID[mIdx]} ${parts[0]}`;
  }

  function getLastThreePeriods(currentPeriod) {
    const [yStr, mStr] = currentPeriod.split("-");
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    const list = [];
    for (let i = 2; i >= 0; i--) {
      let tm = m - i;
      let ty = y;
      while (tm <= 0) {
        tm += 12;
        ty -= 1;
      }
      list.push(`${ty}-${String(tm).padStart(2, "0")}`);
    }
    return list;
  }

  function getInitials(name) {
    const clean = (name || "W").replace(/^(Pak|Bu|Ibu|Bapak)\s+/i, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getWargaAddress(w) {
    return `Blok ${w.blok}-${w.nomor}`;
  }

  function getRequiredDueIds() {
    return state.dues.filter((d) => normalizeCategory(d.category) === "wajib").map((d) => d.id);
  }

  function getWargaPaidDueIds(wargaId, period) {
    const paid = new Set();
    state.transactions.forEach((tx) => {
      if (tx.type === "masuk" && tx.period === period && tx.wargaId === wargaId && Array.isArray(tx.items)) {
        tx.items.forEach((it) => paid.add(it.dueId));
      }
    });
    return paid;
  }

  function getWargaLastPaidDate(wargaId, period) {
    const txs = state.transactions
      .filter((tx) => tx.type === "masuk" && tx.period === period && tx.wargaId === wargaId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return txs.length ? txs[0].date : null;
  }

  function getWargaPeriodStatus(wargaId, period) {
    const required = getRequiredDueIds();
    const paidSet = getWargaPaidDueIds(wargaId, period);
    const unpaidRequired = state.dues.filter((d) => required.includes(d.id) && !paidSet.has(d.id));
    const paidTotal = state.transactions
      .filter((tx) => tx.type === "masuk" && tx.period === period && tx.wargaId === wargaId)
      .reduce((acc, tx) => acc + tx.amount, 0);

    const isLunas = required.length > 0 ? unpaidRequired.length === 0 : paidTotal > 0;
    const unpaidAmount = unpaidRequired.reduce((sum, d) => sum + d.amount, 0);
    return {
      isLunas,
      paidTotal,
      unpaidRequired,
      unpaidAmount,
      paidCount: paidSet.size,
    };
  }

  function getDuePaidWargaCount(dueId, period) {
    const wargaIds = new Set();
    state.transactions.forEach((tx) => {
      if (tx.type === "masuk" && tx.period === period && tx.wargaId && Array.isArray(tx.items)) {
        if (tx.items.some((it) => it.dueId === dueId)) {
          wargaIds.add(tx.wargaId);
        }
      }
    });
    return wargaIds.size;
  }

  function computeTotals() {
    const allIn = state.transactions.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0);
    const allOut = state.transactions.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0);
    const totalBalance = (state.settings.openingBalance || 0) + allIn - allOut;

    const monthTx = state.transactions.filter((t) => t.period === ui.period);
    const monthIn = monthTx.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0);
    const monthOut = monthTx.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0);

    return { totalBalance, monthIn, monthOut };
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2500);
  }

  async function copyText(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(successMsg);
    }
  }

  // ================= CONFIRMATION POPUP (FOR EVERY SAVE / PAY / DELETE) =================
  let confirmResolver = null;

  function askConfirm({ title, message, summaryRows = [], okText = "Ya, Lanjutkan", danger = false }) {
    return new Promise((resolve) => {
      confirmResolver = resolve;
      const iconEl = $("#confirmIcon");
      iconEl.classList.toggle("danger", Boolean(danger));
      iconEl.innerHTML = danger ? SVG_WARN : SVG_QUESTION;

      $("#confirmTitle").textContent = title;
      $("#confirmMessage").textContent = message;

      const summaryEl = $("#confirmSummary");
      if (summaryRows.length) {
        summaryEl.innerHTML = summaryRows
          .map(
            ([k, v]) =>
              `<div class="confirm-summary-row"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`
          )
          .join("");
        summaryEl.classList.remove("hidden");
      } else {
        summaryEl.classList.add("hidden");
      }

      const okBtn = $("#confirmOkBtn");
      okBtn.textContent = okText;
      okBtn.className = danger ? "danger-btn flex-1" : "primary-btn flex-1";

      $("#confirmBackdrop").classList.remove("hidden");
      $("#confirmDialog").classList.remove("hidden");
    });
  }

  function closeConfirm(result) {
    $("#confirmBackdrop").classList.add("hidden");
    $("#confirmDialog").classList.add("hidden");
    if (confirmResolver) {
      const fn = confirmResolver;
      confirmResolver = null;
      fn(result);
    }
  }

  // ================= POPULATE PERIOD DROPDOWNS =================
  function populatePeriodSelectors() {
    const optionsHtml = AVAILABLE_PERIODS.map(
      (p) => `<option value="${escapeHtml(p)}">${escapeHtml(formatPeriod(p))}</option>`
    ).join("");
    $("#periodSelect").innerHTML = optionsHtml;
    $("#periodSelect").value = ui.period;

    $("#checkoutPeriodSelect").innerHTML = optionsHtml;
    $("#checkoutPeriodSelect").value = ui.checkoutPeriod;
  }

  // ================= MODALS =================
  function openModal(sheetId) {
    $$(".sheet").forEach((s) => s.classList.add("hidden"));
    $("#modalBackdrop").classList.remove("hidden");
    $(sheetId).classList.remove("hidden");
  }

  function closeAllModals() {
    $("#modalBackdrop").classList.add("hidden");
    $$(".sheet").forEach((s) => s.classList.add("hidden"));
  }

  // ================= PAYMENT DUE SELECTION (WAJIB LOCKED!) =================
  function enforceWajibDuesForSelection(wargaId, period, extraOptionalIds = []) {
    const paidIds = wargaId ? getWargaPaidDueIds(wargaId, period) : new Set();
    const wajibUnpaid = state.dues
      .filter((d) => normalizeCategory(d.category) === "wajib" && !paidIds.has(d.id))
      .map((d) => d.id);

    const validOptional = extraOptionalIds.filter((id) => {
      const d = state.dues.find((x) => x.id === id);
      return d && normalizeCategory(d.category) === "opsional";
    });

    ui.selectedDueIds = Array.from(new Set([...wajibUnpaid, ...validOptional]));
  }

  function openPaymentSheet({ wargaId = "", period = ui.period, extraDueId = "" } = {}) {
    ui.checkoutPeriod = period;
    if (wargaId && state.warga.some((w) => w.id === wargaId)) {
      ui.selectedWargaId = wargaId;
    } else if (state.warga.length) {
      const firstUnpaid = state.warga.find((w) => !getWargaPeriodStatus(w.id, ui.checkoutPeriod).isLunas);
      ui.selectedWargaId = firstUnpaid ? firstUnpaid.id : state.warga[0].id;
    }

    const extraOpt = [];
    if (extraDueId) {
      const due = state.dues.find((d) => d.id === extraDueId);
      if (due && normalizeCategory(due.category) === "opsional") {
        extraOpt.push(extraDueId);
      }
    }
    enforceWajibDuesForSelection(ui.selectedWargaId, ui.checkoutPeriod, extraOpt);
    renderCartSheet();
    openModal("#cartSheet");
  }

  // ================= RENDER FUNCTIONS =================
  function renderHeaderAndHero() {
    const { rtName, areaName, treasurerName } = state.settings;
    $("#sidebarRtLabel").textContent = rtName;
    $("#headerRtName").textContent = `${rtName} • ${areaName}`;
    $("#bendaharaChip").textContent = `Bendahara: ${treasurerName}`;

    const dbText = $("#dbStatusText");
    if (dbText) {
      dbText.textContent =
        state.dbMode === "demo"
          ? "Mode Demo (Sementara)"
          : state.dbMode === "android-sqlite"
          ? "SQLite Lokal Perangkat"
          : state.dbMode === "mysql"
          ? "MySQL DB Aktif"
          : state.dbMode === "d1"
          ? "Cloudflare D1 Aktif"
          : "Database Aktif";
    }

    const demoBanner = $("#demoBanner");
    if (demoBanner) {
      demoBanner.classList.toggle("hidden", !window.kasDb.isDemo());
    }

    const { totalBalance, monthIn, monthOut } = computeTotals();
    $("#totalBalanceDisplay").textContent = ui.hideBalance ? "Rp •••••••" : formatRp(totalBalance);
    $("#monthIncomeDisplay").textContent = ui.hideBalance ? "Rp ••••" : formatRp(monthIn);
    $("#monthExpenseDisplay").textContent = ui.hideBalance ? "Rp ••••" : formatRp(monthOut);

    const periodLabel = formatPeriod(ui.period);
    $("#bannerPeriodText").textContent = periodLabel;
    $("#reportPeriodBadge").textContent = periodLabel;
    const expBadge = $("#reportExpensePeriodBadge");
    if (expBadge) expBadge.textContent = periodLabel;
    const saldoBadge = $("#reportSaldoPeriodBadge");
    if (saldoBadge) saldoBadge.textContent = periodLabel;

    const totalKK = state.warga.length;
    const paidKK = state.warga.filter((w) => getWargaPeriodStatus(w.id, ui.period).isLunas).length;
    const pct = totalKK > 0 ? Math.round((paidKK / totalKK) * 100) : 0;
    const remainingKK = Math.max(0, totalKK - paidKK);

    $("#bannerHeadline").textContent = `${paidKK} / ${totalKK} KK Lunas`;
    $("#bannerSubtext").textContent =
      remainingKK === 0 ? "Semua KK sudah lunas" : `${remainingKK} KK belum lunas`;
    $("#collectionProgressFill").style.width = `${pct}%`;
    $("#collectionPctText").textContent = `${pct}%`;
  }

  function renderDuesGrid() {
    const q = ui.search.trim().toLowerCase();
    const filtered = state.dues.filter((d) => {
      const cat = normalizeCategory(d.category);
      const catMatch = ui.dueCategory === "semua" || cat === ui.dueCategory;
      const searchMatch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.desc || "").toLowerCase().includes(q) ||
        (CATEGORY_META[cat]?.label || "").toLowerCase().includes(q);
      return catMatch && searchMatch;
    });

    const container = $("#duesGrid");
    if (!state.dues.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-emoji">📋</div>
          <strong>Belum ada jenis iuran di database</strong>
          <p style="font-size:12px;margin-top:4px;">${
            window.kasDb.isNative()
              ? "Tambahkan iuran wajib atau opsional pertama Anda. Semua data tersimpan di database lokal HP ini."
              : "Tambahkan iuran wajib/opsional pertama, atau coba tampilan contoh di Mode Demo."
          }</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
            <button type="button" class="primary-btn sm" id="emptyAddDueBtn">+ Tambah Iuran</button>
            ${!window.kasDb.isDemo() && !window.kasDb.isNative() ? `<a href="/demo" class="outline-btn sm" style="text-decoration:none;">Buka /demo</a>` : ""}
          </div>
        </div>
      `;
      return;
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-emoji">🔍</div>
          <strong>Iuran tidak ditemukan</strong>
        </div>
      `;
      return;
    }

    const totalKK = state.warga.length;
    container.innerHTML = filtered
      .map((due) => {
        const cat = normalizeCategory(due.category);
        const paidCount = getDuePaidWargaCount(due.id, ui.period);
        const unpaidCount = Math.max(0, totalKK - paidCount);
        const catLabel = CATEGORY_META[cat]?.label || "Opsional";

        return `
          <article class="due-card" data-open-due-detail="${escapeHtml(due.id)}">
            <div class="due-thumb cat-${escapeHtml(cat)}">
              <span class="due-badge">${escapeHtml(catLabel)}</span>
              <span class="due-emoji">${escapeHtml(due.emoji || "💰")}</span>
            </div>
            <div class="due-body">
              <div class="due-title">${escapeHtml(due.name)}</div>
              <div class="due-price">${formatRp(due.amount)}</div>
              <div class="due-kk-row">
                <span class="kk-stat paid">${paidCount} KK Lunas</span>
                <span class="kk-stat unpaid">${unpaidCount} Belum</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function buildWargaCardHtml(w) {
    const st = getWargaPeriodStatus(w.id, ui.period);
    const addr = getWargaAddress(w);
    const lastDate = getWargaLastPaidDate(w.id, ui.period);
    const shortSub = lastDate ? `${addr} • ${formatShortDate(lastDate)}` : addr;

    return `
      <article class="warga-card" data-open-warga-detail="${escapeHtml(w.id)}">
        <div class="avatar ${st.isLunas ? "" : "unpaid"}">${escapeHtml(getInitials(w.name))}</div>
        <div class="warga-info">
          <div class="warga-name">${escapeHtml(w.name)}</div>
          <div class="warga-sub">${escapeHtml(shortSub)}</div>
        </div>
        <div class="warga-right">
          <span class="status-pill ${st.isLunas ? "lunas" : "belum"}">
            ${st.isLunas ? "Lunas" : "Belum"}
          </span>
          <span class="warga-amount-inline">${formatRp(st.isLunas ? st.paidTotal : st.unpaidAmount)}</span>
        </div>
      </article>
    `;
  }

  function renderHomeWarga() {
    const q = ui.search.trim().toLowerCase();
    const list = state.warga.filter((w) => {
      const st = getWargaPeriodStatus(w.id, ui.period);
      const statusOk =
        ui.homeWargaStatus === "semua" ||
        (ui.homeWargaStatus === "lunas" && st.isLunas) ||
        (ui.homeWargaStatus === "belum" && !st.isLunas);
      const addr = getWargaAddress(w).toLowerCase();
      const searchOk = !q || w.name.toLowerCase().includes(q) || addr.includes(q);
      return statusOk && searchOk;
    });

    const preview = list.slice(0, 6);
    const grid = $("#homeWargaGrid");
    if (!state.warga.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-emoji">🏘️</div>
          <strong>Belum ada data warga</strong>
          <p style="font-size:12px;margin-top:4px;">Mulai tambahkan Kepala Keluarga untuk mencatat iuran kas RT.</p>
          <div style="margin-top:12px;">
            <button type="button" class="primary-btn sm" id="emptyAddWargaBtn">+ Tambah Warga</button>
          </div>
        </div>
      `;
      return;
    }

    if (!preview.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-emoji">✅</div>
          <strong>${ui.homeWargaStatus === "belum" ? "Semua warga sudah lunas!" : "Data warga tidak ditemukan"}</strong>
        </div>
      `;
      return;
    }

    grid.innerHTML = preview.map((w) => buildWargaCardHtml(w)).join("");
  }

  function renderFullWarga() {
    $("#wargaCountSub").textContent = `${state.warga.length} KK • ketuk untuk detail`;

    const bloks = Array.from(new Set(state.warga.map((w) => w.blok.toUpperCase()))).sort();
    const select = $("#blokFilterSelect");
    const prevVal = ui.wargaBlok;
    select.innerHTML =
      `<option value="semua">Semua Blok</option>` +
      bloks.map((b) => `<option value="${escapeHtml(b)}">Blok ${escapeHtml(b)}</option>`).join("");
    select.value = bloks.includes(prevVal) ? prevVal : "semua";
    ui.wargaBlok = select.value;

    const q = ui.search.trim().toLowerCase();
    const filtered = state.warga.filter((w) => {
      const st = getWargaPeriodStatus(w.id, ui.period);
      const statusOk =
        ui.wargaStatus === "semua" ||
        (ui.wargaStatus === "lunas" && st.isLunas) ||
        (ui.wargaStatus === "belum" && !st.isLunas);
      const blokOk = ui.wargaBlok === "semua" || w.blok.toUpperCase() === ui.wargaBlok;
      const addr = getWargaAddress(w).toLowerCase();
      const searchOk = !q || w.name.toLowerCase().includes(q) || addr.includes(q) || (w.phone || "").includes(q);
      return statusOk && blokOk && searchOk;
    });

    const grid = $("#fullWargaGrid");
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-emoji">🏘️</div>
          <strong>Tidak ada warga yang cocok</strong>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map((w) => buildWargaCardHtml(w)).join("");
  }

  function renderTransactions() {
    const q = ui.search.trim().toLowerCase();
    const list = state.transactions
      .filter((tx) => {
        const periodOk = tx.period === ui.period;
        const typeOk = ui.txFilter === "semua" || tx.type === ui.txFilter;
        const text = `${tx.wargaName || ""} ${tx.wargaAddress || ""} ${tx.title || ""} ${tx.category || ""} ${tx.note || ""}`.toLowerCase();
        const searchOk = !q || text.includes(q);
        return periodOk && typeOk && searchOk;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));

    const container = $("#txList");
    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-emoji">🧾</div>
          <strong>Belum ada transaksi di ${escapeHtml(formatPeriod(ui.period))}</strong>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map((tx) => {
        const isIn = tx.type === "masuk";
        const title = isIn ? tx.wargaName : tx.title || "Pengeluaran Kas";
        const dateOnly = formatShortDate(tx.date);

        return `
          <div class="tx-card" data-open-receipt="${escapeHtml(tx.id)}">
            <div class="tx-icon ${isIn ? "masuk" : "keluar"}">${isIn ? SVG_IN : SVG_OUT}</div>
            <div class="tx-body">
              <div class="tx-title">${escapeHtml(title)}</div>
              <div class="tx-meta">${escapeHtml(dateOnly)}</div>
            </div>
            <div class="tx-right">
              <div class="tx-amount ${isIn ? "masuk" : "keluar"}">${isIn ? "+" : "-"}${formatRp(tx.amount)}</div>
              <div class="tx-method">${escapeHtml(tx.method || "Tunai")}</div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderReport() {
    const { totalBalance, monthIn, monthOut } = computeTotals();
    const paidKK = state.warga.filter((w) => getWargaPeriodStatus(w.id, ui.period).isLunas).length;
    const pct = state.warga.length ? Math.round((paidKK / state.warga.length) * 100) : 0;
    const pLabel = formatPeriod(ui.period);

    $("#reportKpiGrid").innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Saldo Kas</div>
        <div class="kpi-value">${formatRp(totalBalance)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Masuk (${escapeHtml(pLabel)})</div>
        <div class="kpi-value green">${formatRp(monthIn)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Keluar (${escapeHtml(pLabel)})</div>
        <div class="kpi-value red">${formatRp(monthOut)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Lunas</div>
        <div class="kpi-value">${pct}% (${paidKK}/${state.warga.length})</div>
      </div>
    `;

    // 3-month interactive chart with hover & tap tooltips
    const periods = getLastThreePeriods(ui.period);
    const chartData = periods.map((p) => {
      const pTx = state.transactions.filter((t) => t.period === p);
      return {
        label: formatPeriod(p).split(" ")[0],
        fullLabel: formatPeriod(p),
        masuk: pTx.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0),
        keluar: pTx.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0),
      };
    });
    const maxVal = Math.max(100000, ...chartData.flatMap((d) => [d.masuk, d.keluar]));

    $("#monthlyChart").innerHTML = chartData
      .map((d) => {
        const inH = Math.max(10, Math.round((d.masuk / maxVal) * 115));
        const outH = Math.max(10, Math.round((d.keluar / maxVal) * 115));
        return `
          <div class="chart-col">
            <div class="chart-bars">
              <div class="bar-wrap" tabindex="0" role="button" aria-label="Masuk ${escapeHtml(d.fullLabel)}: ${formatRp(d.masuk)}">
                <div class="bar-tooltip">Masuk ${escapeHtml(d.label)}<br><strong>${formatRp(d.masuk)}</strong></div>
                <div class="bar in" style="height:${inH}px"></div>
              </div>
              <div class="bar-wrap" tabindex="0" role="button" aria-label="Keluar ${escapeHtml(d.fullLabel)}: ${formatRp(d.keluar)}">
                <div class="bar-tooltip">Keluar ${escapeHtml(d.label)}<br><strong>${formatRp(d.keluar)}</strong></div>
                <div class="bar out" style="height:${outH}px"></div>
              </div>
            </div>
            <div class="chart-label">${escapeHtml(d.label)}</div>
          </div>
        `;
      })
      .join("");

    // ---- RINCIAN PEMASUKAN + TOTAL DI AKHIR ----
    const breakdownMap = new Map();
    const monthInTxs = state.transactions.filter((t) => t.type === "masuk" && t.period === ui.period);
    monthInTxs.forEach((tx) => {
      if (Array.isArray(tx.items) && tx.items.length) {
        tx.items.forEach((it) => {
          breakdownMap.set(it.name, (breakdownMap.get(it.name) || 0) + it.amount);
        });
      } else {
        breakdownMap.set("Iuran Lainnya", (breakdownMap.get("Iuran Lainnya") || 0) + tx.amount);
      }
    });

    const entries = Array.from(breakdownMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalIncomeBreakdown = entries.reduce((s, e) => s + e[1], 0);
    const brContainer = $("#categoryBreakdown");

    const incomeRowsHtml = entries.length
      ? entries
          .map(([name, val]) => {
            const wPct = Math.round((val / Math.max(1, totalIncomeBreakdown)) * 100);
            return `
              <div class="breakdown-row">
                <div class="breakdown-top">
                  <span>${escapeHtml(name)}</span>
                  <strong>${formatRp(val)}</strong>
                </div>
                <div class="breakdown-bar-bg">
                  <div class="breakdown-bar-fill" style="width:${wPct}%"></div>
                </div>
              </div>
            `;
          })
          .join("")
      : `<p style="font-size:13px;color:var(--text-secondary);">Belum ada pemasukan pada ${escapeHtml(pLabel)}.</p>`;

    brContainer.innerHTML =
      incomeRowsHtml +
      `<div class="breakdown-total-row in">
         <span>Total Pemasukan</span>
         <strong>${formatRp(monthIn)}</strong>
       </div>`;

    // ---- RINCIAN PENGELUARAN + TOTAL DI AKHIR ----
    const expMap = new Map();
    state.transactions
      .filter((t) => t.type === "keluar" && t.period === ui.period)
      .forEach((tx) => {
        const key = tx.category || tx.title || "Operasional";
        expMap.set(key, (expMap.get(key) || 0) + tx.amount);
      });

    const expEntries = Array.from(expMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalExpBreakdown = expEntries.reduce((s, e) => s + e[1], 0);
    const expContainer = $("#expenseBreakdown");

    const expRowsHtml = expEntries.length
      ? expEntries
          .map(([name, val]) => {
            const wPct = Math.round((val / Math.max(1, totalExpBreakdown)) * 100);
            return `
              <div class="breakdown-row">
                <div class="breakdown-top">
                  <span>${escapeHtml(name)}</span>
                  <strong style="color:var(--danger);">${formatRp(val)}</strong>
                </div>
                <div class="breakdown-bar-bg">
                  <div class="breakdown-bar-fill out" style="width:${wPct}%"></div>
                </div>
              </div>
            `;
          })
          .join("")
      : `<p style="font-size:13px;color:var(--text-secondary);">Belum ada pengeluaran pada ${escapeHtml(pLabel)}.</p>`;

    expContainer.innerHTML =
      expRowsHtml +
      `<div class="breakdown-total-row out">
         <span>Total Pengeluaran</span>
         <strong>${formatRp(monthOut)}</strong>
       </div>`;

    // ---- RINGKASAN SALDO KAS ----
    const priorTx = state.transactions.filter((t) => (t.period || "") < ui.period);
    const priorIn = priorTx.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0);
    const priorOut = priorTx.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0);
    const openingMonthBalance = (state.settings.openingBalance || 0) + priorIn - priorOut;
    const netMonth = monthIn - monthOut;
    const closingMonthBalance = openingMonthBalance + netMonth;

    $("#saldoSummaryBody").innerHTML = `
      <div class="saldo-rows">
        <div class="saldo-row">
          <span>Saldo Awal (${escapeHtml(pLabel)})</span>
          <strong>${formatRp(openingMonthBalance)}</strong>
        </div>
        <div class="saldo-row">
          <span>Total Pemasukan</span>
          <strong class="in">+${formatRp(monthIn)}</strong>
        </div>
        <div class="saldo-row">
          <span>Total Pengeluaran</span>
          <strong class="out">-${formatRp(monthOut)}</strong>
        </div>
        <div class="saldo-row">
          <span>Selisih Bulan Ini</span>
          <strong class="${netMonth >= 0 ? "in" : "out"}">${netMonth >= 0 ? "+" : "-"}${formatRp(Math.abs(netMonth))}</strong>
        </div>
        <div class="saldo-final-row">
          <span>Saldo Akhir (${escapeHtml(pLabel)})</span>
          <strong>${formatRp(closingMonthBalance)}</strong>
        </div>
        ${
          closingMonthBalance !== totalBalance
            ? `<div class="saldo-row" style="margin-top:4px;">
                 <span>Total Saldo Kas Keseluruhan</span>
                 <strong>${formatRp(totalBalance)}</strong>
               </div>`
            : ""
        }
      </div>
    `;
  }

  function updateCheckoutPeriodHint() {
    const wargaId = $("#checkoutWargaSelect").value;
    const period = $("#checkoutPeriodSelect").value;
    ui.checkoutPeriod = period;
    $("#cartPeriodBadge").textContent = formatPeriod(period);

    const hint = $("#checkoutPeriodStatus");
    if (!wargaId) {
      hint.classList.add("hidden");
      return;
    }

    const st = getWargaPeriodStatus(wargaId, period);
    hint.classList.remove("hidden", "belum", "lunas");
    if (st.isLunas) {
      hint.classList.add("lunas");
      hint.textContent = `✓ Iuran wajib sudah lunas di ${formatPeriod(period)} (${formatRp(st.paidTotal)})`;
    } else {
      hint.classList.add("belum");
      const pastTag = period < ui.period ? " • terlewat" : "";
      hint.textContent = `Belum lunas di ${formatPeriod(period)}${pastTag} (wajib ${formatRp(st.unpaidAmount)})`;
    }
  }

  function renderCartSheet() {
    const periodSelect = $("#checkoutPeriodSelect");
    periodSelect.value = ui.checkoutPeriod;

    const select = $("#checkoutWargaSelect");
    select.innerHTML = state.warga
      .map((w) => {
        const st = getWargaPeriodStatus(w.id, ui.checkoutPeriod);
        return `<option value="${escapeHtml(w.id)}">${escapeHtml(w.name)} (${escapeHtml(getWargaAddress(w))}) — ${st.isLunas ? "Lunas" : "Belum"}</option>`;
      })
      .join("");

    if (ui.selectedWargaId && state.warga.some((w) => w.id === ui.selectedWargaId)) {
      select.value = ui.selectedWargaId;
    } else if (state.warga.length) {
      const firstUnpaid = state.warga.find((w) => !getWargaPeriodStatus(w.id, ui.checkoutPeriod).isLunas);
      select.value = firstUnpaid ? firstUnpaid.id : state.warga[0].id;
      ui.selectedWargaId = select.value;
    }

    updateCheckoutPeriodHint();

    // Selected items (Wajib always first, locked & labeled "Wajib", cannot be removed!)
    const items = ui.selectedDueIds
      .map((id) => state.dues.find((d) => d.id === id))
      .filter(Boolean)
      .sort((a, b) => (normalizeCategory(a.category) === "wajib" ? -1 : 1) - (normalizeCategory(b.category) === "wajib" ? -1 : 1));

    const listEl = $("#cartItemsList");
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:14px;">
          <p style="font-size:12.5px;">Iuran wajib bulan ini sudah lunas. Anda bisa menambahkan iuran opsional di bawah.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = items
        .map((due) => {
          const isWajib = normalizeCategory(due.category) === "wajib";
          return `
            <div class="cart-row">
              <div>
                <div class="cart-row-title-line">
                  <span class="cart-row-name">${escapeHtml(due.emoji || "💰")} ${escapeHtml(due.name)}</span>
                  ${isWajib ? "" : `<span class="opsional-tag">Opsional</span>`}
                </div>
                <div class="cart-row-price">${formatRp(due.amount)}</div>
              </div>
              ${
                isWajib
                  ? `<span class="wajib-lock-pill" title="Iuran wajib tidak dapat dihapus">Wajib</span>`
                  : `<button type="button" class="cart-remove-btn" data-remove-optional="${escapeHtml(due.id)}">Hapus</button>`
              }
            </div>
          `;
        })
        .join("");
    }

    // Optional dues picker chips (only show opsional dues not yet added)
    const availableOptional = state.dues.filter(
      (d) => normalizeCategory(d.category) === "opsional" && !ui.selectedDueIds.includes(d.id)
    );
    const optWrap = $("#optionalDuesWrap");
    const optPicker = $("#optionalDuesPicker");
    if (availableOptional.length) {
      optWrap.classList.remove("hidden");
      optPicker.innerHTML = availableOptional
        .map(
          (d) =>
            `<button type="button" class="optional-chip-btn" data-add-optional="${escapeHtml(d.id)}">+ ${escapeHtml(d.name)} (${formatRp(d.amount)})</button>`
        )
        .join("");
    } else {
      optWrap.classList.add("hidden");
    }

    const total = items.reduce((s, d) => s + d.amount, 0);
    $("#checkoutTotalAmount").textContent = formatRp(total);
  }

  function renderReceipt(txId) {
    const tx = state.transactions.find((t) => t.id === txId);
    if (!tx) return;
    ui.activeReceiptTxId = tx.id;

    const isIn = tx.type === "masuk";
    const itemsHtml =
      isIn && Array.isArray(tx.items)
        ? tx.items
            .map(
              (it) => `
            <div class="receipt-row">
              <span>${escapeHtml(it.name)}</span>
              <strong>${formatRp(it.amount)}</strong>
            </div>
          `
            )
            .join("")
        : `
            <div class="receipt-row">
              <span>Keperluan</span>
              <strong>${escapeHtml(tx.title || "-")}</strong>
            </div>
            <div class="receipt-row">
              <span>Kategori</span>
              <strong>${escapeHtml(tx.category || "-")}</strong>
            </div>
          `;

    $("#receiptContent").innerHTML = `
      <div class="receipt-box">
        <div class="receipt-head">
          <div class="receipt-check ${isIn ? "" : "keluar"}">${isIn ? SVG_CHECK : SVG_OUT}</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);">
            ${isIn ? "PEMBAYARAN IURAN BERHASIL" : "CATATAN PENGELUARAN KAS"}
          </div>
          <div class="receipt-amount">${formatRp(tx.amount)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
            ${escapeHtml(state.settings.rtName)} • ${escapeHtml(state.settings.areaName)}
          </div>
        </div>

        <div class="receipt-row">
          <span>No. Bukti</span>
          <strong>#${escapeHtml(tx.id.toUpperCase())}</strong>
        </div>
        <div class="receipt-row">
          <span>Tanggal Bayar</span>
          <strong>${escapeHtml(formatShortDate(tx.date))}</strong>
        </div>
        <div class="receipt-row">
          <span>Periode Iuran</span>
          <strong>${escapeHtml(formatPeriod(tx.period))}</strong>
        </div>
        ${
          isIn
            ? `<div class="receipt-row">
                 <span>Warga</span>
                 <strong>${escapeHtml(tx.wargaName)} (${escapeHtml(tx.wargaAddress || "-")})</strong>
               </div>`
            : ""
        }
        <div class="receipt-row">
          <span>Metode</span>
          <strong>${escapeHtml(tx.method || "Tunai")}</strong>
        </div>
        <hr style="border:none;border-top:1px dashed var(--border-strong);margin:10px 0;" />
        ${itemsHtml}
        ${
          tx.note
            ? `<div class="receipt-row" style="margin-top:6px;">
                 <span>Catatan</span>
                 <strong>${escapeHtml(tx.note)}</strong>
               </div>`
            : ""
        }
      </div>
    `;
    openModal("#receiptSheet");
  }

  function renderDueDetail(dueId) {
    const due = state.dues.find((d) => d.id === dueId);
    if (!due) return;
    ui.activeDetailDueId = due.id;

    const cat = normalizeCategory(due.category);
    const periodLabel = formatPeriod(ui.period);
    const catLabel = CATEGORY_META[cat]?.label || "Opsional";

    const paidWarga = [];
    const unpaidWarga = [];
    state.warga.forEach((w) => {
      const paidIds = getWargaPaidDueIds(w.id, ui.period);
      if (paidIds.has(due.id)) paidWarga.push(w);
      else unpaidWarga.push(w);
    });

    const pct = state.warga.length ? Math.round((paidWarga.length / state.warga.length) * 100) : 0;
    const collected = paidWarga.length * due.amount;

    $("#dueDetailTitle").textContent = "Detail Jenis Iuran";
    $("#dueDetailContent").innerHTML = `
      <div class="detail-hero">
        <div class="detail-icon-box cat-${escapeHtml(cat)}">${escapeHtml(due.emoji || "💰")}</div>
        <div>
          <div class="detail-hero-title">${escapeHtml(due.name)}</div>
          <div class="detail-hero-sub">${escapeHtml(catLabel)} • ${formatRp(due.amount)} / KK</div>
        </div>
      </div>

      <p class="detail-desc">${escapeHtml(due.desc || "Iuran operasional kas warga RT.")}</p>

      <div class="receipt-box">
        <div class="receipt-row">
          <span>Periode</span>
          <strong>${escapeHtml(periodLabel)}</strong>
        </div>
        <div class="receipt-row">
          <span>Sudah Bayar</span>
          <strong>${paidWarga.length} / ${state.warga.length} KK (${pct}%)</strong>
        </div>
        <div class="receipt-row">
          <span>Terkumpul</span>
          <strong>${formatRp(collected)}</strong>
        </div>
      </div>

      <div class="detail-section-title">Sudah Membayar (${paidWarga.length})</div>
      <div class="detail-list">
        ${
          paidWarga.length
            ? paidWarga
                .map((w) => {
                  const dt = getWargaLastPaidDate(w.id, ui.period);
                  return `
                    <div class="detail-list-item">
                      <div>
                        <strong>${escapeHtml(w.name)}</strong>
                        <div class="sub">${escapeHtml(getWargaAddress(w))}${dt ? " • " + escapeHtml(formatShortDate(dt)) : ""}</div>
                      </div>
                      <span class="status-pill lunas">Lunas</span>
                    </div>
                  `;
                })
                .join("")
            : `<div class="detail-list-item"><span class="sub">Belum ada warga yang membayar.</span></div>`
        }
      </div>

      ${
        unpaidWarga.length
          ? `<div class="detail-section-title">Belum Membayar (${unpaidWarga.length})</div>
             <div class="detail-list">
               ${unpaidWarga
                 .map(
                   (w) => `
                   <div class="detail-list-item">
                     <div>
                       <strong>${escapeHtml(w.name)}</strong>
                       <div class="sub">${escapeHtml(getWargaAddress(w))}</div>
                     </div>
                     <button type="button" class="mini-btn primary" data-quick-pay-due="${escapeHtml(w.id)}:${escapeHtml(due.id)}">Bayar</button>
                   </div>
                 `
                 )
                 .join("")}
             </div>`
          : ""
      }
    `;

    openModal("#dueDetailSheet");
  }

  function renderWargaDetail(wargaId) {
    const w = state.warga.find((x) => x.id === wargaId);
    if (!w) return;
    ui.activeDetailWargaId = w.id;

    const st = getWargaPeriodStatus(w.id, ui.period);
    const addr = getWargaAddress(w);
    const periodLabel = formatPeriod(ui.period);
    const paidIds = getWargaPaidDueIds(w.id, ui.period);
    const txs = state.transactions
      .filter((t) => t.type === "masuk" && t.wargaId === w.id)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    $("#wargaDetailTitle").textContent = "Detail Warga";
    $("#wargaDetailContent").innerHTML = `
      <div class="detail-hero">
        <div class="avatar ${st.isLunas ? "" : "unpaid"}" style="width:46px;height:46px;font-size:15px;">${escapeHtml(getInitials(w.name))}</div>
        <div style="flex:1;min-width:0;">
          <div class="detail-hero-title">${escapeHtml(w.name)}</div>
          <div class="detail-hero-sub">${escapeHtml(addr)}${w.phone ? " • " + escapeHtml(w.phone) : ""}</div>
        </div>
        <span class="status-pill ${st.isLunas ? "lunas" : "belum"}">${st.isLunas ? "Lunas" : "Belum"}</span>
      </div>

      <div class="receipt-box">
        <div class="receipt-row">
          <span>Periode</span>
          <strong>${escapeHtml(periodLabel)}</strong>
        </div>
        <div class="receipt-row">
          <span>Total Terbayar</span>
          <strong>${formatRp(st.paidTotal)}</strong>
        </div>
        <div class="receipt-row">
          <span>Sisa Iuran Wajib</span>
          <strong style="color:${st.unpaidAmount > 0 ? "var(--danger)" : "var(--forest)"};">${formatRp(st.unpaidAmount)}</strong>
        </div>
      </div>

      <div class="detail-section-title">Status Iuran (${escapeHtml(periodLabel)})</div>
      <div class="detail-list">
        ${state.dues
          .map((d) => {
            const isPaid = paidIds.has(d.id);
            const catLabel = normalizeCategory(d.category) === "wajib" ? "Wajib" : "Opsional";
            return `
              <div class="detail-list-item">
                <div>
                  <strong>${escapeHtml(d.emoji || "💰")} ${escapeHtml(d.name)}</strong>
                  <div class="sub">${escapeHtml(catLabel)} • ${formatRp(d.amount)}</div>
                </div>
                <span class="status-pill ${isPaid ? "lunas" : "belum"}">${isPaid ? "Lunas" : "Belum"}</span>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="detail-section-title">Riwayat Pembayaran (${txs.length})</div>
      <div class="detail-list">
        ${
          txs.length
            ? txs
                .map(
                  (tx) => `
                  <div class="detail-list-item" style="cursor:pointer;" data-open-receipt="${escapeHtml(tx.id)}">
                    <div>
                      <strong>${formatRp(tx.amount)} • ${escapeHtml(formatPeriod(tx.period))}</strong>
                      <div class="sub">${escapeHtml(formatShortDate(tx.date))} • ${escapeHtml(tx.method || "Tunai")}</div>
                    </div>
                    <span class="text-link-btn sm">Detail &rarr;</span>
                  </div>
                `
                )
                .join("")
            : `<div class="detail-list-item"><span class="sub">Belum ada riwayat pembayaran.</span></div>`
        }
      </div>
    `;

    $("#wargaDetailFooter").innerHTML = `
      <button type="button" class="outline-btn" data-edit-warga="${escapeHtml(w.id)}">Edit</button>
      ${
        !st.isLunas
          ? `<button type="button" class="outline-btn" data-remind-warga="${escapeHtml(w.id)}">Ingatkan WA</button>`
          : ""
      }
      <button type="button" class="primary-btn flex-1" data-quick-pay="${escapeHtml(w.id)}">Bayar Iuran</button>
    `;

    openModal("#wargaDetailSheet");
  }

  function renderAll() {
    renderHeaderAndHero();
    renderDuesGrid();
    renderHomeWarga();
    renderFullWarga();
    renderTransactions();
    renderReport();
  }

  // ================= NAVIGATION =================
  function switchTab(tabName) {
    ui.activeTab = tabName;
    $$(".tab-view").forEach((el) => el.classList.toggle("active", el.id === `tab-${tabName}`));
    $$(".nav-item, .bnav-item").forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.tab === tabName)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ================= REPORTS (WA & PDF TABLE) =================
  function buildWaReportText() {
    const { totalBalance, monthIn, monthOut } = computeTotals();
    const paidKK = state.warga.filter((w) => getWargaPeriodStatus(w.id, ui.period).isLunas);
    const unpaidKK = state.warga.filter((w) => !getWargaPeriodStatus(w.id, ui.period).isLunas);
    const periodLabel = formatPeriod(ui.period);

    return [
      `📊 *LAPORAN KAS WARGA ${state.settings.rtName}*`,
      `📍 ${state.settings.areaName}`,
      `🗓️ Periode: *${periodLabel}*`,
      `--------------------------------`,
      `💰 Saldo Kas Saat Ini: *${formatRp(totalBalance)}*`,
      `📥 Pemasukan Bulan Ini: *${formatRp(monthIn)}*`,
      `📤 Pengeluaran Bulan Ini: *${formatRp(monthOut)}*`,
      `✅ Sudah Lunas: *${paidKK.length}/${state.warga.length} KK*`,
      unpaidKK.length
        ? `\n⏳ *Belum Lunas (${unpaidKK.length} KK):*\n` +
          unpaidKK.map((w, i) => `${i + 1}. ${w.name} (${getWargaAddress(w)})`).join("\n")
        : `\n🎉 Seluruh warga sudah lunas bulan ini!`,
      `\nTerima kasih atas partisipasi Bapak/Ibu warga 🙏`,
      `— ${state.settings.treasurerName}`,
    ].join("\n");
  }

  function exportPdfReport() {
    // Compute opening balance strictly before current selected month
    const priorTx = state.transactions.filter((t) => (t.period || "") < ui.period);
    const priorIn = priorTx.filter((t) => t.type === "masuk").reduce((s, t) => s + t.amount, 0);
    const priorOut = priorTx.filter((t) => t.type === "keluar").reduce((s, t) => s + t.amount, 0);
    const openingMonthBalance = (state.settings.openingBalance || 0) + priorIn - priorOut;

    const monthTxs = state.transactions
      .filter((t) => t.period === ui.period)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.id.localeCompare(b.id));

    let running = openingMonthBalance;
    let monthIn = 0;
    let monthOut = 0;

    const rows = monthTxs.map((t) => {
      const masuk = t.type === "masuk" ? t.amount : 0;
      const keluar = t.type === "keluar" ? t.amount : 0;
      monthIn += masuk;
      monthOut += keluar;
      running += masuk - keluar;

      const desc =
        t.type === "masuk"
          ? `${t.wargaName || "Warga"} (${t.wargaAddress || "-"})`
          : `${t.title || "Pengeluaran"}${t.category ? " [" + t.category + "]" : ""}`;

      return {
        dateLabel: formatShortDate(t.date),
        desc,
        method: t.method || "Tunai",
        masuk,
        keluar,
        runningBalance: running,
      };
    });

    window.exportMonthlyCashflowPdf({
      settings: state.settings,
      periodLabel: formatPeriod(ui.period),
      periodCode: ui.period,
      openingMonthBalance,
      monthIn,
      monthOut,
      closingMonthBalance: running,
      rows,
    });

    showToast(`PDF Arus Kas ${formatPeriod(ui.period)} diunduh`);
  }

  // ================= EVENT LISTENERS =================
  function bindEvents() {
    $$(".nav-item, .bnav-item").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Confirmation dialog buttons
    $("#confirmCancelBtn").addEventListener("click", () => closeConfirm(false));
    $("#confirmBackdrop").addEventListener("click", () => closeConfirm(false));
    $("#confirmOkBtn").addEventListener("click", () => closeConfirm(true));

    // Global Search
    const searchInput = $("#globalSearch");
    const clearBtn = $("#clearSearchBtn");
    searchInput.addEventListener("input", () => {
      ui.search = searchInput.value;
      clearBtn.classList.toggle("hidden", !ui.search);
      renderDuesGrid();
      renderHomeWarga();
      renderFullWarga();
      renderTransactions();
    });
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      ui.search = "";
      clearBtn.classList.add("hidden");
      renderDuesGrid();
      renderHomeWarga();
      renderFullWarga();
      renderTransactions();
    });

    // Period select (header)
    $("#periodSelect").addEventListener("change", (e) => {
      ui.period = e.target.value;
      ui.checkoutPeriod = ui.period;
      renderAll();
      showToast(`Periode ${formatPeriod(ui.period)}`);
    });

    // Toggle hide balance
    $("#toggleBalanceBtn").addEventListener("click", () => {
      ui.hideBalance = !ui.hideBalance;
      renderHeaderAndHero();
    });

    // Dominant Center "Bayar" bottom button & Sidebar "Bayar Iuran"
    $("#bottomPayBtn").addEventListener("click", () => openPaymentSheet({ period: ui.period }));
    $("#sideBayarBtn").addEventListener("click", () => openPaymentSheet({ period: ui.period }));
    $("#dueDetailPayBtn").addEventListener("click", () => {
      openPaymentSheet({ period: ui.period, extraDueId: ui.activeDetailDueId || "" });
    });

    const openExpenseModal = () => {
      $("#expenseForm").reset();
      openModal("#expenseSheet");
    };
    $("#qaExpenseBtn").addEventListener("click", openExpenseModal);
    $("#sideAddExpenseBtn").addEventListener("click", openExpenseModal);
    $("#riwayatAddExpenseBtn").addEventListener("click", openExpenseModal);

    const openAddWargaModal = () => {
      $("#wargaForm").reset();
      $("#wargaEditId").value = "";
      $("#wargaSheetTitle").textContent = "Tambah Data Warga";
      $("#wargaSubmitBtn").textContent = "Simpan Warga";
      openModal("#wargaSheet");
    };
    $("#qaAddWargaBtn").addEventListener("click", openAddWargaModal);
    $("#wargaTabAddBtn").addEventListener("click", openAddWargaModal);

    const openAddDueModal = () => {
      $("#dueForm").reset();
      openModal("#dueSheet");
    };
    $("#qaAddDueBtn").addEventListener("click", openAddDueModal);
    $("#addDueInlineBtn").addEventListener("click", openAddDueModal);

    const resetDemoBtn = $("#resetDemoBtn");
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener("click", async () => {
        const fresh = await window.kasDb.resetDemoData();
        state.dbMode = fresh.dbMode;
        state.settings = fresh.settings;
        state.dues = fresh.dues;
        state.warga = fresh.warga;
        state.transactions = fresh.transactions;
        renderAll();
        showToast("Data demo dikembalikan ke kondisi awal");
      });
    }

    const openSettingsModal = () => {
      $("#setHousingName").value = state.settings.housingName || "";
      $("#setClusterName").value = state.settings.clusterName || "";
      $("#setRtNumber").value = state.settings.rtNumber || "04";
      $("#setRwNumber").value = state.settings.rwNumber || "07";
      $("#setTreasurerName").value = state.settings.treasurerName || "";
      openModal("#settingsSheet");
    };
    $("#openSettingsBtn").addEventListener("click", openSettingsModal);
    $("#sideSettingsBtn").addEventListener("click", openSettingsModal);

    $("#qaShareWaBtn").addEventListener("click", () =>
      copyText(buildWaReportText(), "Ringkasan kas disalin untuk WhatsApp")
    );
    $("#copyReportWaBtn").addEventListener("click", () =>
      copyText(buildWaReportText(), "Laporan kas disalin untuk WhatsApp")
    );
    $("#exportPdfBtn").addEventListener("click", exportPdfReport);

    $("#bannerFilterUnpaidBtn").addEventListener("click", () => {
      ui.wargaStatus = "belum";
      $$("#wargaStatusChips .chip").forEach((c) =>
        c.classList.toggle("active", c.dataset.status === "belum")
      );
      renderFullWarga();
      switchTab("warga");
    });

    $("#seeAllWargaBtn").addEventListener("click", () => switchTab("warga"));

    // Filter chips
    $("#categoryChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      ui.dueCategory = chip.dataset.category;
      $$("#categoryChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderDuesGrid();
    });

    $("#homeWargaFilterChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      ui.homeWargaStatus = chip.dataset.status;
      $$("#homeWargaFilterChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderHomeWarga();
    });

    $("#wargaStatusChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      ui.wargaStatus = chip.dataset.status;
      $$("#wargaStatusChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderFullWarga();
    });

    $("#blokFilterSelect").addEventListener("change", (e) => {
      ui.wargaBlok = e.target.value;
      renderFullWarga();
    });

    $("#txFilterChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      ui.txFilter = chip.dataset.type;
      $$("#txFilterChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderTransactions();
    });

    // Interactive chart bar tap toggle for touch devices (in addition to CSS :hover)
    $("#monthlyChart").addEventListener("click", (e) => {
      const wrap = e.target.closest(".bar-wrap");
      $$("#monthlyChart .bar-wrap").forEach((el) => {
        if (el !== wrap) el.classList.remove("is-active");
      });
      if (wrap) wrap.classList.toggle("is-active");
    });

    // Delegated clicks inside dynamic grids & sheets
    document.addEventListener("click", (e) => {
      if (e.target.closest("#emptyAddDueBtn")) {
        openAddDueModal();
        return;
      }
      if (e.target.closest("#emptyAddWargaBtn")) {
        openAddWargaModal();
        return;
      }

      if (!e.target.closest("#monthlyChart")) {
        $$("#monthlyChart .bar-wrap.is-active").forEach((el) => el.classList.remove("is-active"));
      }

      const openDueCard = e.target.closest("[data-open-due-detail]");
      if (openDueCard) {
        renderDueDetail(openDueCard.dataset.openDueDetail);
        return;
      }

      const openWargaCard = e.target.closest("[data-open-warga-detail]");
      if (openWargaCard) {
        renderWargaDetail(openWargaCard.dataset.openWargaDetail);
        return;
      }

      const quickPayDueBtn = e.target.closest("[data-quick-pay-due]");
      if (quickPayDueBtn) {
        const [wId, dId] = quickPayDueBtn.dataset.quickPayDue.split(":");
        openPaymentSheet({ wargaId: wId, period: ui.period, extraDueId: dId });
        return;
      }

      const quickPayBtn = e.target.closest("[data-quick-pay]");
      if (quickPayBtn) {
        openPaymentSheet({ wargaId: quickPayBtn.dataset.quickPay, period: ui.period });
        return;
      }

      const remindBtn = e.target.closest("[data-remind-warga]");
      if (remindBtn) {
        const w = state.warga.find((x) => x.id === remindBtn.dataset.remindWarga);
        if (!w) return;
        const st = getWargaPeriodStatus(w.id, ui.period);
        const msg = `Assalamu'alaikum / Halo ${w.name} (${getWargaAddress(w)}). Pengingat ramah iuran kas ${state.settings.rtName} periode ${formatPeriod(ui.period)} sebesar ${formatRp(st.unpaidAmount)}. Terima kasih 🙏 — ${state.settings.treasurerName}`;
        copyText(msg, `Pengingat WA untuk ${w.name} disalin!`);
        return;
      }

      const editBtn = e.target.closest("[data-edit-warga]");
      if (editBtn) {
        const w = state.warga.find((x) => x.id === editBtn.dataset.editWarga);
        if (!w) return;
        $("#wargaEditId").value = w.id;
        $("#wargaNameInput").value = w.name;
        $("#wargaBlokInput").value = w.blok;
        $("#wargaNomorInput").value = w.nomor;
        $("#wargaPhoneInput").value = w.phone || "";
        $("#wargaSheetTitle").textContent = "Edit Data Warga";
        $("#wargaSubmitBtn").textContent = "Simpan Perubahan";
        openModal("#wargaSheet");
        return;
      }

      // Only OPTIONAL items can be removed in Pembayaran Iuran!
      const removeOptBtn = e.target.closest("[data-remove-optional]");
      if (removeOptBtn) {
        const dueId = removeOptBtn.dataset.removeOptional;
        const due = state.dues.find((d) => d.id === dueId);
        if (due && normalizeCategory(due.category) === "wajib") {
          showToast("Iuran wajib tidak dapat dihapus");
          return;
        }
        ui.selectedDueIds = ui.selectedDueIds.filter((id) => id !== dueId);
        renderCartSheet();
        return;
      }

      const addOptBtn = e.target.closest("[data-add-optional]");
      if (addOptBtn) {
        const dueId = addOptBtn.dataset.addOptional;
        if (!ui.selectedDueIds.includes(dueId)) ui.selectedDueIds.push(dueId);
        renderCartSheet();
        return;
      }

      const receiptCard = e.target.closest("[data-open-receipt]");
      if (receiptCard) {
        renderReceipt(receiptCard.dataset.openReceipt);
        return;
      }

      if (e.target.closest("[data-close-modal]")) {
        closeAllModals();
      }
    });

    $("#modalBackdrop").addEventListener("click", closeAllModals);

    // Payment Sheet: Warga & Period changes auto-sync locked Wajib items!
    $("#checkoutWargaSelect").addEventListener("change", (e) => {
      ui.selectedWargaId = e.target.value;
      const keepOptional = ui.selectedDueIds.filter((id) => {
        const d = state.dues.find((x) => x.id === id);
        return d && normalizeCategory(d.category) === "opsional";
      });
      enforceWajibDuesForSelection(ui.selectedWargaId, ui.checkoutPeriod, keepOptional);
      renderCartSheet();
    });

    $("#checkoutPeriodSelect").addEventListener("change", (e) => {
      ui.checkoutPeriod = e.target.value;
      const currentWarga = $("#checkoutWargaSelect").value;
      ui.selectedWargaId = currentWarga;
      const keepOptional = ui.selectedDueIds.filter((id) => {
        const d = state.dues.find((x) => x.id === id);
        return d && normalizeCategory(d.category) === "opsional";
      });
      enforceWajibDuesForSelection(ui.selectedWargaId, ui.checkoutPeriod, keepOptional);
      renderCartSheet();
    });

    $("#paymentMethodGrid").addEventListener("click", (e) => {
      const btn = e.target.closest(".method-pill");
      if (!btn) return;
      ui.paymentMethod = btn.dataset.method;
      $$("#paymentMethodGrid .method-pill").forEach((p) => p.classList.toggle("active", p === btn));
    });

    // 1) CONFIRM PAYMENT (with popup konfirmasi!)
    $("#confirmPaymentBtn").addEventListener("click", async () => {
      if (!ui.selectedDueIds.length) {
        showToast("Pilih minimal 1 iuran untuk dibayar");
        return;
      }
      const wargaId = $("#checkoutWargaSelect").value;
      const warga = state.warga.find((w) => w.id === wargaId);
      if (!warga) {
        showToast("Pilih warga pembayar terlebih dahulu");
        return;
      }

      const chosenPeriod = $("#checkoutPeriodSelect").value || ui.period;
      const items = ui.selectedDueIds
        .map((id) => state.dues.find((d) => d.id === id))
        .filter(Boolean)
        .map((d) => ({ dueId: d.id, name: d.name, amount: d.amount }));

      const amount = items.reduce((s, it) => s + it.amount, 0);

      const confirmed = await askConfirm({
        title: "Konfirmasi Pembayaran",
        message: "Pastikan data warga, periode, dan nominal pembayaran sudah benar.",
        summaryRows: [
          ["Warga", `${warga.name} (${getWargaAddress(warga)})`],
          ["Periode", formatPeriod(chosenPeriod)],
          ["Jumlah Iuran", `${items.length} item`],
          ["Metode", ui.paymentMethod],
          ["Total Bayar", formatRp(amount)],
        ],
        okText: "Ya, Bayar",
      });
      if (!confirmed) return;

      const today = new Date().toISOString().slice(0, 10);
      const tx = {
        id: "tx-" + Date.now().toString(36),
        type: "masuk",
        period: chosenPeriod,
        date: today,
        wargaId: warga.id,
        wargaName: warga.name,
        wargaAddress: getWargaAddress(warga),
        items,
        amount,
        method: ui.paymentMethod,
        note: $("#checkoutNote").value.trim(),
      };

      state.transactions.unshift(tx);
      await window.kasDb.recordTransaction(tx);

      ui.selectedDueIds = [];
      $("#checkoutNote").value = "";
      renderAll();
      renderReceipt(tx.id);
      showToast(`Tersimpan: ${warga.name} (${formatPeriod(chosenPeriod)})`);
    });

    // 2) SAVE EXPENSE (with popup konfirmasi!)
    $("#expenseForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("#expenseTitle").value.trim();
      const amount = Number($("#expenseAmount").value);
      const category = $("#expenseCategory").value;
      const note = $("#expenseNote").value.trim();
      if (!title || amount <= 0) return;

      const confirmed = await askConfirm({
        title: "Simpan Pengeluaran?",
        message: "Pengeluaran ini akan mengurangi saldo kas warga pada periode berjalan.",
        summaryRows: [
          ["Keperluan", title],
          ["Kategori", category],
          ["Periode", formatPeriod(ui.period)],
          ["Nominal", formatRp(amount)],
        ],
        okText: "Ya, Simpan",
        danger: true,
      });
      if (!confirmed) return;

      const tx = {
        id: "tx-" + Date.now().toString(36),
        type: "keluar",
        period: ui.period,
        date: new Date().toISOString().slice(0, 10),
        title,
        category,
        amount,
        method: "Tunai",
        note,
        items: [],
      };

      state.transactions.unshift(tx);
      await window.kasDb.recordTransaction(tx);
      closeAllModals();
      renderAll();
      showToast("Pengeluaran tersimpan di DB lokal");
    });

    // 3) SAVE / EDIT WARGA (with popup konfirmasi!)
    $("#wargaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const editId = $("#wargaEditId").value;
      const name = $("#wargaNameInput").value.trim();
      const blok = $("#wargaBlokInput").value.trim().toUpperCase();
      const nomor = $("#wargaNomorInput").value.trim();
      const phone = $("#wargaPhoneInput").value.trim();
      if (!name || !blok || !nomor) return;

      const confirmed = await askConfirm({
        title: editId ? "Simpan Perubahan Warga?" : "Tambah Data Warga?",
        message: "Pastikan nama kepala keluarga dan alamat blok sudah sesuai.",
        summaryRows: [
          ["Nama", name],
          ["Alamat", `Blok ${blok}-${nomor}`],
          ["WhatsApp", phone || "-"],
        ],
        okText: "Ya, Simpan",
      });
      if (!confirmed) return;

      let record;
      if (editId) {
        record = state.warga.find((w) => w.id === editId);
        if (record) {
          record.name = name;
          record.blok = blok;
          record.nomor = nomor;
          record.phone = phone;
        }
        showToast("Data warga diperbarui");
      } else {
        record = {
          id: "w-" + Date.now().toString(36),
          name,
          blok,
          nomor,
          phone,
        };
        state.warga.push(record);
        showToast(`${name} tersimpan di DB lokal`);
      }

      if (record) await window.kasDb.upsertWarga(record);
      closeAllModals();
      renderAll();
    });

    // 4) SAVE NEW DUE (only Wajib / Opsional + popup konfirmasi!)
    $("#dueForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#dueNameInput").value.trim();
      const amount = Number($("#dueAmountInput").value);
      const category = normalizeCategory($("#dueCategoryInput").value);
      const desc = $("#dueDescInput").value.trim();
      if (!name || amount <= 0) return;

      const confirmed = await askConfirm({
        title: "Simpan Jenis Iuran?",
        message:
          category === "wajib"
            ? "Iuran kategori Wajib akan otomatis muncul dan tidak bisa dihapus saat pembayaran."
            : "Iuran kategori Opsional dapat ditambahkan secara sukarela saat pembayaran.",
        summaryRows: [
          ["Nama Iuran", name],
          ["Kategori", CATEGORY_META[category].label],
          ["Nominal", `${formatRp(amount)} / KK`],
        ],
        okText: "Ya, Simpan",
      });
      if (!confirmed) return;

      const due = {
        id: "due-" + Date.now().toString(36),
        name,
        amount,
        category,
        emoji: CATEGORY_META[category]?.emoji || "💰",
        desc: desc || "Iuran warga lingkungan RT",
      };
      state.dues.push(due);
      if (due) await window.kasDb.upsertDue(due);
      closeAllModals();
      renderAll();
      showToast(`"${name}" tersimpan di DB lokal`);
    });

    // 4B) SAVE SETTINGS (Nama Perumahan, Cluster, RT, RW, Nama Bendahara + popup konfirmasi!)
    $("#settingsForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const housingName = $("#setHousingName").value.trim();
      const clusterName = $("#setClusterName").value.trim();
      const rtNumber = $("#setRtNumber").value.trim();
      const rwNumber = $("#setRwNumber").value.trim();
      const treasurerName = $("#setTreasurerName").value.trim();
      if (!housingName || !rtNumber || !rwNumber || !treasurerName) return;

      const confirmed = await askConfirm({
        title: "Simpan Pengaturan?",
        message: "Informasi perumahan, RT/RW, cluster, dan bendahara akan diperbarui di seluruh aplikasi & PDF.",
        summaryRows: [
          ["Perumahan", housingName],
          ["Cluster", clusterName || "-"],
          ["RT / RW", `RT ${rtNumber} / RW ${rwNumber}`],
          ["Bendahara", treasurerName],
        ],
        okText: "Ya, Simpan",
      });
      if (!confirmed) return;

      state.settings = {
        ...state.settings,
        housingName,
        clusterName,
        rtNumber,
        rwNumber,
        treasurerName,
        rtName: `RT ${rtNumber} / RW ${rwNumber}`,
        areaName: clusterName ? `${housingName} • ${clusterName}` : housingName,
      };
      await window.kasDb.saveSettings(state.settings);
      closeAllModals();
      renderAll();
      showToast("Pengaturan tersimpan di DB lokal");
    });

    // Receipt copy WA
    $("#copyReceiptWaBtn").addEventListener("click", () => {
      const tx = state.transactions.find((t) => t.id === ui.activeReceiptTxId);
      if (!tx) return;
      const isIn = tx.type === "masuk";
      const lines = [
        `🧾 *KUITANSI KAS WARGA ${state.settings.rtName}*`,
        `📍 ${state.settings.areaName}`,
        `No. Bukti: #${tx.id.toUpperCase()}`,
        `Tanggal: ${formatShortDate(tx.date)}`,
        `Periode Iuran: *${formatPeriod(tx.period)}*`,
        isIn ? `Warga: *${tx.wargaName}* (${tx.wargaAddress})` : `Keperluan: *${tx.title}*`,
        `Nominal: *${formatRp(tx.amount)}* (${tx.method})`,
        isIn && tx.items
          ? `Rincian: ${tx.items.map((i) => `${i.name} (${formatRp(i.amount)})`).join(", ")}`
          : "",
        tx.note ? `Catatan: ${tx.note}` : "",
        `\nTerima kasih 🙏 — ${state.settings.treasurerName}`,
      ].filter(Boolean);
      copyText(lines.join("\n"), "Kuitansi disalin untuk WhatsApp");
    });

    // 5) DELETE TRANSACTION (with popup konfirmasi!)
    $("#deleteTxBtn").addEventListener("click", async () => {
      if (!ui.activeReceiptTxId) return;
      const tx = state.transactions.find((t) => t.id === ui.activeReceiptTxId);
      if (!tx) return;

      const label = tx.type === "masuk" ? tx.wargaName : tx.title || "Pengeluaran";
      const confirmed = await askConfirm({
        title: "Hapus Transaksi?",
        message: "Data transaksi yang dihapus akan memperbarui saldo kas secara permanen.",
        summaryRows: [
          ["Transaksi", label],
          ["Periode", formatPeriod(tx.period)],
          ["Nominal", formatRp(tx.amount)],
        ],
        okText: "Ya, Hapus",
        danger: true,
      });
      if (!confirmed) return;

      const id = tx.id;
      state.transactions = state.transactions.filter((t) => t.id !== id);
      await window.kasDb.deleteTransaction(id);
      closeAllModals();
      renderAll();
      showToast("Transaksi dihapus dari DB lokal");
    });
  }

  // ================= BOOTSTRAP FROM LOCAL DB =================
  async function init() {
    populatePeriodSelectors();
    bindEvents();
    try {
      const data = await window.kasDb.bootstrap();
      state.dbMode = data.dbMode || "indexeddb";
      state.settings = data.settings || state.settings;
      state.dues = (data.dues || []).map((d) => ({
        ...d,
        category: normalizeCategory(d.category),
      }));
      state.warga = data.warga || [];
      state.transactions = data.transactions || [];
    } catch (err) {
      console.error("Gagal memuat DB lokal:", err);
      showToast("Gagal memuat database lokal");
    }
    renderAll();
  }

  init();
})();
