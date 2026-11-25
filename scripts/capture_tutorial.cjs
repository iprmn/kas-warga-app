const fs = require("fs");
const path = require("path");
const puppeteer = require("C:\\Users\\indra.permana\\.gemini\\antigravity\\scratch\\toko-app\\node_modules\\puppeteer-core");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "tutorial_assets");
const APP_URL = "http://127.0.0.1:8765/demo";

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prepCleanDemoUI(page) {
  await page.evaluate(() => {
    const banner = document.getElementById("demoBanner");
    if (banner) banner.style.display = "none";
    const dbText = document.getElementById("dbStatusText");
    if (dbText) dbText.textContent = "Database Aktif";
    const toast = document.getElementById("toast");
    if (toast) toast.style.display = "none";
  });
}

async function captureWithAnnotations(page, filename, annotations) {
  await prepCleanDemoUI(page);
  const results = await page.evaluate((annList) => {
    const existing = document.getElementById("__tutorial_overlay__");
    if (existing) existing.remove();

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const container = document.createElement("div");
    container.id = "__tutorial_overlay__";
    container.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:999999;overflow:hidden;font-family:"Plus Jakarta Sans",sans-serif;';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;";

    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "tutorial-arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "8");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "4");
    marker.setAttribute("orient", "auto");
    const polygon = document.createElementNS(svgNS, "polygon");
    polygon.setAttribute("points", "0 0, 10 4, 0 8");
    polygon.setAttribute("fill", "#E11D48");
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
    container.appendChild(svg);

    const report = [];

    annList.forEach((ann) => {
      let rect = ann.rect;
      if (!rect && ann.groupSelector) {
        const els = Array.from(document.querySelectorAll(ann.groupSelector)).filter((item) => {
          const r = item.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(item).visibility !== "hidden";
        });
        if (els.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          els.forEach((el) => {
            const r = el.getBoundingClientRect();
            minX = Math.min(minX, r.left);
            minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.right);
            maxY = Math.max(maxY, r.bottom);
          });
          rect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
      } else if (!rect && ann.selector) {
        const all = Array.from(document.querySelectorAll(ann.selector)).filter((item) => {
          const r = item.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(item).visibility !== "hidden";
        });
        const el = all[ann.index || 0] || null;
        if (el) {
          const r = el.getBoundingClientRect();
          rect = { x: r.left, y: r.top, w: r.width, h: r.height };
        }
      }

      if (!rect || rect.w === 0 || rect.h === 0) {
        report.push({ num: ann.num, label: ann.label, found: false });
        return;
      }

      const pad = ann.pad ?? 4;
      const bx = rect.x - pad;
      const by = rect.y - pad;
      const bw = rect.w + pad * 2;
      const bh = rect.h + pad * 2;

      const box = document.createElement("div");
      box.style.cssText = `
        position:fixed;
        left:${bx}px;
        top:${by}px;
        width:${bw}px;
        height:${bh}px;
        border:3px solid #E11D48;
        border-radius:10px;
        background:rgba(225, 29, 72, 0.06);
        box-shadow:0 0 0 3px rgba(255,255,255,0.92), 0 4px 14px rgba(225,29,72,0.32);
      `;
      container.appendChild(box);

      const dx = ann.dx ?? 0;
      const dy = ann.dy ?? -52;

      let targetX = bx + bw / 2;
      let targetY = by + bh / 2;

      if (ann.anchor === "left") {
        targetX = bx - 4;
        targetY = by + bh / 2 + (ann.targetOffsetY || 0);
      } else if (ann.anchor === "right") {
        targetX = bx + bw + 4;
        targetY = by + bh / 2 + (ann.targetOffsetY || 0);
      } else if (ann.anchor === "top") {
        targetX = bx + bw / 2 + (ann.targetOffsetX || 0);
        targetY = by - 4;
      } else if (ann.anchor === "bottom") {
        targetX = bx + bw / 2 + (ann.targetOffsetX || 0);
        targetY = by + bh + 4;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        targetX = dx > 0 ? bx + bw + 4 : bx - 4;
        targetY = by + bh / 2 + (ann.targetOffsetY || 0);
      } else {
        targetX = bx + bw / 2 + (ann.targetOffsetX || 0);
        targetY = dy > 0 ? by + bh + 4 : by - 4;
      }

      const startX = ann.badgeX ?? Math.max(115, Math.min(vw - 115, targetX + dx));
      const startY = ann.badgeY ?? Math.max(24, Math.min(vh - 24, targetY + dy));

      const lineBg = document.createElementNS(svgNS, "line");
      lineBg.setAttribute("x1", String(startX));
      lineBg.setAttribute("y1", String(startY));
      lineBg.setAttribute("x2", String(targetX));
      lineBg.setAttribute("y2", String(targetY));
      lineBg.setAttribute("stroke", "#FFFFFF");
      lineBg.setAttribute("stroke-width", "7");
      lineBg.setAttribute("stroke-linecap", "round");
      svg.appendChild(lineBg);

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", String(startX));
      line.setAttribute("y1", String(startY));
      line.setAttribute("x2", String(targetX));
      line.setAttribute("y2", String(targetY));
      line.setAttribute("stroke", "#E11D48");
      line.setAttribute("stroke-width", "3.5");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("marker-end", "url(#tutorial-arrowhead)");
      svg.appendChild(line);

      const badge = document.createElement("div");
      badge.style.cssText = `
        position:fixed;
        left:${startX}px;
        top:${startY}px;
        transform:translate(-50%, -50%);
        background:#E11D48;
        color:#FFFFFF;
        border:2.5px solid #FFFFFF;
        border-radius:999px;
        padding:4px 12px 4px 5px;
        display:flex;
        align-items:center;
        gap:6px;
        box-shadow:0 6px 16px rgba(0,0,0,0.34);
        white-space:nowrap;
        z-index:10;
      `;
      badge.innerHTML = `
        <span style="width:22px;height:22px;border-radius:999px;background:#FEF08A;color:#9F1239;font-weight:900;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${ann.num}
        </span>
        <span style="font-weight:800;font-size:11.5px;letter-spacing:0.2px;color:#FFFFFF;">
          ${ann.label}
        </span>
      `;
      container.appendChild(badge);
      report.push({ num: ann.num, label: ann.label, found: true });
    });

    document.body.appendChild(container);
    return report;
  }, annotations);

  await sleep(140);
  await page.screenshot({ path: path.join(assetsDir, filename) });
  const missing = results.filter((r) => !r.found);
  console.log(`Saved ${filename}`, missing.length ? `MISSING: ${JSON.stringify(missing)}` : `OK (${results.length} anns)`);

  await page.evaluate(() => {
    const existing = document.getElementById("__tutorial_overlay__");
    if (existing) existing.remove();
  });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
  });

  try {
    // =====================================================
    // PART 1: TABLET ANNOTATED SCREENSHOTS (1024 x 768 @2x)
    // =====================================================
    const tabPage = await browser.newPage();
    await tabPage.setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });
    await tabPage.goto(APP_URL, { waitUntil: "networkidle0" });
    await sleep(500);
    await prepCleanDemoUI(tabPage);

    // 1. Beranda KasWarga
    await captureWithAnnotations(tabPage, "tab_01_beranda.png", [
      { num: 1, selector: "#globalSearch", label: "Cari Iuran atau Warga", anchor: "bottom", targetOffsetX: -120, dx: -15, dy: 42 },
      { num: 2, selector: "#periodSelect", label: "Pilih Bulan Periode", anchor: "left", dx: -125, dy: 0 },
      { num: 3, selector: "#qaExpenseBtn", label: "Catat Pengeluaran Kas", anchor: "bottom", dx: 15, dy: 40 },
      { num: 4, selector: "#sideBayarBtn", label: "Tombol Bayar Iuran", anchor: "top", badgeX: 124, badgeY: 518 },
      { num: 5, groupSelector: ".side-menu .nav-item", label: "Menu Pindah Halaman", anchor: "bottom", badgeX: 124, badgeY: 394 },
    ]);

    // 2. Detail Jenis Iuran
    await tabPage.evaluate(() => {
      const card = document.querySelector("#duesGrid .due-card");
      if (card) card.click();
    });
    await sleep(300);
    await captureWithAnnotations(tabPage, "tab_02_detail_iuran.png", [
      { num: 1, selector: "#dueDetailContent .detail-hero", label: "Kategori Wajib & Nominal", anchor: "left", dx: -135, dy: 0 },
      { num: 2, selector: "#dueDetailContent .receipt-box", label: "Ringkasan KK Lunas & Terkumpul", anchor: "right", dx: 145, dy: 0 },
      { num: 3, selector: "#dueDetailPayBtn", label: "Klik untuk Langsung Bayar", anchor: "bottom", dx: 0, dy: 34 },
      { num: 4, selector: "#dueDetailSheet .close-btn", label: "Tutup Kotak Detail", anchor: "right", dx: 115, dy: 0 },
    ]);
    await tabPage.click("#dueDetailSheet .close-btn");
    await sleep(220);

    // 3. Bayar Iuran (Cart Sheet)
    await tabPage.click("#sideBayarBtn");
    await sleep(300);
    await tabPage.evaluate(() => {
      const sel = document.getElementById("checkoutWargaSelect");
      if (sel && sel.options.length > 7) {
        sel.selectedIndex = 7;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await sleep(250);
    await captureWithAnnotations(tabPage, "tab_03_bayar_iuran.png", [
      { num: 1, selector: "#checkoutWargaSelect", label: "Pilih Nama Warga", anchor: "left", dx: -125, dy: 0 },
      { num: 2, selector: "#checkoutPeriodSelect", label: "Pilih Periode (Bisa Bulan Lalu)", anchor: "right", dx: 140, dy: 0 },
      { num: 3, selector: "#cartItemsList", label: "Iuran Wajib Terkunci Otomatis", anchor: "left", dx: -135, dy: -8 },
      { num: 4, selector: "#optionalDuesPicker", label: "Tambah Iuran Opsional", anchor: "right", dx: 135, dy: 0 },
      { num: 5, selector: "#confirmPaymentBtn", label: "Klik Konfirmasi Pembayaran", anchor: "bottom", dx: 0, dy: 34 },
    ]);

    // 4. Popup Konfirmasi Pembayaran
    await tabPage.click("#confirmPaymentBtn");
    await sleep(300);
    await captureWithAnnotations(tabPage, "tab_04_konfirmasi_bayar.png", [
      { num: 1, selector: "#confirmSummary", label: "Periksa Ringkasan Nominal & Warga", anchor: "left", dx: -165, dy: 0 },
      { num: 2, selector: "#confirmCancelBtn", label: "Klik Batal Bila Masih Ragu", anchor: "bottom", dx: -95, dy: 44 },
      { num: 3, selector: "#confirmOkBtn", label: "Klik Ya, Bayar untuk Mencatat", anchor: "bottom", dx: 95, dy: 44 },
    ]);

    // 5. Bukti Kuitansi Pembayaran
    await tabPage.click("#confirmOkBtn");
    await sleep(380);
    await captureWithAnnotations(tabPage, "tab_05_kuitansi.png", [
      { num: 1, selector: "#receiptContent", label: "Rincian Kuitansi Pembayaran", anchor: "left", dx: -135, dy: 0 },
      { num: 2, selector: "#copyReceiptWaBtn", label: "Salin Bukti untuk Kirim WA", anchor: "right", dx: 135, dy: 0 },
      { num: 3, selector: "#deleteTxBtn", label: "Hapus Transaksi (Ada Konfirmasi)", anchor: "left", dx: -135, dy: 0 },
    ]);
    await tabPage.click("#receiptSheet .close-btn");
    await sleep(220);

    // 6. Catat Pengeluaran Kas RT
    await tabPage.click("#sideAddExpenseBtn");
    await sleep(300);
    await tabPage.evaluate(() => {
      document.getElementById("expenseTitle").value = "Beli Lampu Jalan LED Blok B";
      document.getElementById("expenseAmount").value = "125000";
      document.getElementById("expenseCategory").selectedIndex = 1;
      document.getElementById("expenseNote").value = "2 unit lampu LED sorot 30W";
    });
    await sleep(150);
    await captureWithAnnotations(tabPage, "tab_06_pengeluaran.png", [
      { num: 1, selector: "#expenseTitle", label: "Ketik Keperluan Pengeluaran", anchor: "left", dx: -140, dy: 0 },
      { num: 2, selector: "#expenseAmount", label: "Masukkan Nominal (Rp)", anchor: "left", dx: -135, dy: 0 },
      { num: 3, selector: "#expenseCategory", label: "Pilih Kategori Pengeluaran", anchor: "right", dx: 140, dy: 0 },
      { num: 4, selector: '#expenseForm button[type="submit"]', label: "Klik Simpan Pengeluaran", anchor: "bottom", dx: 0, dy: 38 },
    ]);
    await tabPage.click("#expenseSheet .close-btn");
    await sleep(220);

    // 7. Tambah Jenis Iuran (Wajib / Opsional)
    await tabPage.click("#qaAddDueBtn");
    await sleep(300);
    await tabPage.evaluate(() => {
      document.getElementById("dueNameInput").value = "Iuran Perbaikan Jalan";
      document.getElementById("dueAmountInput").value = "30000";
      document.getElementById("dueCategoryInput").value = "opsional";
      document.getElementById("dueDescInput").value = "Dana perawatan aspal lingkungan RT";
    });
    await sleep(150);
    await captureWithAnnotations(tabPage, "tab_07_tambah_iuran.png", [
      { num: 1, selector: "#dueNameInput", label: "Ketik Nama Jenis Iuran", anchor: "left", dx: -135, dy: 0 },
      { num: 2, selector: "#dueAmountInput", label: "Isi Nominal Iuran / KK", anchor: "left", dx: -135, dy: 0 },
      { num: 3, selector: "#dueCategoryInput", label: "Pilih Wajib atau Opsional", anchor: "right", dx: 138, dy: 0 },
      { num: 4, selector: '#dueForm button[type="submit"]', label: "Klik Tambah ke Etalase", anchor: "bottom", dx: 0, dy: 38 },
    ]);
    await tabPage.click("#dueSheet .close-btn");
    await sleep(220);

    // 8. Kelola Data Warga
    await tabPage.click('.side-menu .nav-item[data-tab="warga"]');
    await sleep(320);
    await tabPage.evaluate(() => window.scrollTo(0, 0));
    await sleep(150);
    await captureWithAnnotations(tabPage, "tab_08_warga.png", [
      { num: 1, selector: "#wargaTabAddBtn", label: "Tambah Data Warga (KK) Baru", anchor: "left", dx: -145, dy: 0 },
      { num: 2, groupSelector: "#wargaStatusChips .chip", label: "Filter Status Lunas / Belum", anchor: "top", badgeX: 525, badgeY: 145 },
      { num: 3, selector: "#blokFilterSelect", label: "Saring Berdasarkan Blok", anchor: "left", dx: -140, dy: 0 },
      { num: 4, selector: "#fullWargaGrid .warga-card", index: 8, label: "Klik Kartu untuk Detail / Bayar", anchor: "bottom", dx: 45, dy: 42 },
    ]);

    // 9. Riwayat Transaksi Masuk & Keluar
    await tabPage.click('.side-menu .nav-item[data-tab="riwayat"]');
    await sleep(320);
    await tabPage.evaluate(() => window.scrollTo(0, 0));
    await sleep(150);
    await captureWithAnnotations(tabPage, "tab_09_riwayat.png", [
      { num: 1, groupSelector: "#txFilterChips .chip", label: "Saring Pemasukan / Pengeluaran", anchor: "right", dx: 155, dy: 0 },
      { num: 2, selector: "#riwayatAddExpenseBtn", label: "Catat Pengeluaran Baru", anchor: "left", dx: -135, dy: 0 },
      { num: 3, selector: "#txList > *", index: 3, label: "Klik Transaksi untuk Detail / Hapus", anchor: "top", targetOffsetX: 25, badgeX: 625, badgeY: 465 },
      { num: 4, selector: "#txList .tx-icon.keluar", index: 0, label: "Ikon Merah = Pengeluaran", anchor: "left", badgeX: 124, badgeY: 398 },
    ]);

    // 10. Laporan Arus Kas, Grafik Interaktif & Export PDF
    await tabPage.click('.side-menu .nav-item[data-tab="laporan"]');
    await sleep(350);
    await tabPage.evaluate(() => {
      window.scrollTo(0, 0);
      const bars = document.querySelectorAll("#monthlyChart .bar-wrap");
      if (bars.length >= 2) {
        bars[bars.length - 2].classList.add("is-active");
      }
    });
    await sleep(200);
    await captureWithAnnotations(tabPage, "tab_10_laporan.png", [
      { num: 1, selector: "#exportPdfBtn", label: "Export PDF Arus Kas Bulan Ini", anchor: "left", dx: -145, dy: 0 },
      { num: 2, selector: "#copyReportWaBtn", label: "Salin Laporan ke WA", anchor: "top", badgeX: 880, badgeY: 112 },
      { num: 3, selector: "#reportKpiGrid", label: "Ringkasan Kas Bulan Aktif", anchor: "bottom", targetOffsetX: 110, badgeX: 620, badgeY: 300 },
      { num: 4, selector: "#monthlyChart .bar-wrap.is-active", label: "Hover / Tap Grafik Lihat Nominal", anchor: "left", dx: -175, dy: -46 },
    ]);

    // 11. Rincian Pemasukan, Pengeluaran (dengan Total Akhir) & Saldo Kas
    await tabPage.evaluate(() => {
      const bars = document.querySelectorAll("#monthlyChart .bar-wrap.is-active");
      bars.forEach((b) => b.classList.remove("is-active"));
      window.scrollTo(0, 420);
    });
    await sleep(250);
    await captureWithAnnotations(tabPage, "tab_11_rincian_laporan.png", [
      { num: 1, selector: "#categoryBreakdown", label: "Rincian Pemasukan + Total", anchor: "left", badgeX: 124, badgeY: 385 },
      { num: 2, selector: "#expenseBreakdown", label: "Rincian Pengeluaran + Total", anchor: "bottom", dx: 0, dy: 42 },
      { num: 3, selector: "#saldoSummaryBody", label: "Ringkasan Saldo Akhir Kas Warga", anchor: "top", targetOffsetX: 60, dx: 60, dy: -36 },
    ]);

    // 12. Pengaturan Perumahan, RT/RW & Bendahara
    await tabPage.evaluate(() => window.scrollTo(0, 0));
    await tabPage.click("#sideSettingsBtn");
    await sleep(300);
    await captureWithAnnotations(tabPage, "tab_12_pengaturan.png", [
      { num: 1, selector: "#setHousingName", label: "Isi Nama Perumahan & Cluster", anchor: "left", dx: -140, dy: 0 },
      { num: 2, selector: "#setRtNumber", label: "Atur Nomor RT & RW", anchor: "left", dx: -125, dy: 0 },
      { num: 3, selector: "#setTreasurerName", label: "Isi Nama Bendahara RT", anchor: "right", dx: 135, dy: 0 },
      { num: 4, selector: '#settingsForm button[type="submit"]', label: "Klik Simpan Pengaturan", anchor: "bottom", dx: 0, dy: 38 },
    ]);

    await tabPage.close();

    // =====================================================
    // PART 2: MOBILE GALLERY SCREENSHOTS (390 x 844 @2x)
    // =====================================================
    const mobPage = await browser.newPage();
    await mobPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await mobPage.goto(APP_URL, { waitUntil: "networkidle0" });
    await sleep(500);
    await prepCleanDemoUI(mobPage);

    async function saveMob(name) {
      await prepCleanDemoUI(mobPage);
      await sleep(220);
      await mobPage.screenshot({ path: path.join(assetsDir, name) });
      console.log("Saved mobile:", name);
    }

    await mobPage.evaluate(() => window.scrollTo(0, 0));
    await saveMob("mob_01_beranda.png");

    await mobPage.evaluate(() => window.scrollTo(0, 390));
    await saveMob("mob_02_daftar_iuran.png");

    await mobPage.evaluate(() => {
      const card = document.querySelector("#duesGrid .due-card");
      if (card) card.click();
    });
    await saveMob("mob_03_detail_iuran.png");
    await mobPage.click("#dueDetailSheet .close-btn");
    await sleep(200);

    await mobPage.click("#bottomPayBtn");
    await sleep(250);
    await mobPage.evaluate(() => {
      const sel = document.getElementById("checkoutWargaSelect");
      if (sel && sel.options.length > 7) {
        sel.selectedIndex = 7;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await saveMob("mob_04_bayar_iuran.png");

    await mobPage.click("#confirmPaymentBtn");
    await saveMob("mob_05_konfirmasi.png");

    await mobPage.click("#confirmOkBtn");
    await sleep(300);
    await saveMob("mob_06_kuitansi.png");
    await mobPage.click("#receiptSheet .close-btn");
    await sleep(200);

    await mobPage.evaluate(() => window.scrollTo(0, 0));
    await mobPage.click("#qaExpenseBtn");
    await sleep(250);
    await mobPage.evaluate(() => {
      document.getElementById("expenseTitle").value = "Beli Lampu Jalan LED Blok B";
      document.getElementById("expenseAmount").value = "125000";
      document.getElementById("expenseCategory").selectedIndex = 1;
      document.getElementById("expenseNote").value = "2 unit lampu LED sorot 30W";
    });
    await saveMob("mob_07_pengeluaran.png");
    await mobPage.click("#expenseSheet .close-btn");
    await sleep(200);

    await mobPage.click("#qaAddDueBtn");
    await sleep(250);
    await mobPage.evaluate(() => {
      document.getElementById("dueNameInput").value = "Iuran Perbaikan Jalan";
      document.getElementById("dueAmountInput").value = "30000";
      document.getElementById("dueCategoryInput").value = "opsional";
      document.getElementById("dueDescInput").value = "Dana perawatan aspal komplek";
    });
    await saveMob("mob_08_tambah_iuran.png");
    await mobPage.click("#dueSheet .close-btn");
    await sleep(200);

    await mobPage.click('.bottom-nav .bnav-item[data-tab="warga"]');
    await mobPage.evaluate(() => window.scrollTo(0, 0));
    await saveMob("mob_09_warga.png");

    await mobPage.click('.bottom-nav .bnav-item[data-tab="riwayat"]');
    await mobPage.evaluate(() => window.scrollTo(0, 0));
    await saveMob("mob_10_riwayat.png");

    await mobPage.click('.bottom-nav .bnav-item[data-tab="laporan"]');
    await mobPage.evaluate(() => {
      window.scrollTo(0, 0);
      const bars = document.querySelectorAll("#monthlyChart .bar-wrap");
      if (bars.length >= 2) bars[bars.length - 2].classList.add("is-active");
    });
    await saveMob("mob_11_laporan.png");

    await mobPage.click("#openSettingsBtn");
    await saveMob("mob_12_pengaturan.png");

    await mobPage.close();
    console.log("ALL 24 REFINED SCREENSHOTS CAPTURED!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
