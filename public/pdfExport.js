/* Zero-dependency A4 PDF Generator for Laporan Arus Kas Bulanan (PDF 1.4) */
(() => {
  "use strict";

  function pdfEscape(text) {
    return String(text ?? "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function truncate(text, maxChars) {
    const s = String(text ?? "").replace(/[^\x20-\x7E]/g, " ").trim();
    if (s.length <= maxChars) return s;
    return s.slice(0, Math.max(0, maxChars - 3)) + "...";
  }

  function fmtRp(num) {
    return "Rp " + Math.round(Number(num) || 0).toLocaleString("id-ID");
  }

  function estimateWidth(str, fontSize) {
    return String(str).length * fontSize * 0.52;
  }

  function buildMonthlyCashflowPdf({ settings, periodLabel, periodCode, openingMonthBalance, monthIn, monthOut, closingMonthBalance, rows }) {
    const W = 595.28;
    const H = 841.89;
    const M = 36;
    const contentW = W - M * 2;
    const pages = [];
    let ops = [];

    const yPdf = (yFromTop) => (H - yFromTop).toFixed(2);
    const setFillRgb = (r, g, b) => ops.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`);
    const setStrokeRgb = (r, g, b) => ops.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`);
    const fillRect = (x, yTop, w, h) => ops.push(`${x.toFixed(2)} ${(H - yTop - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    const strokeRect = (x, yTop, w, h, lw = 0.6) => {
      ops.push(`${lw} w`);
      ops.push(`${x.toFixed(2)} ${(H - yTop - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
    };
    const drawLine = (x1, y1, x2, y2, lw = 0.6) => {
      ops.push(`${lw} w ${x1.toFixed(2)} ${yPdf(y1)} m ${x2.toFixed(2)} ${yPdf(y2)} l S`);
    };
    const drawText = (text, x, yBaseline, size = 10, bold = false, align = "left", boxW = 0) => {
      const safe = pdfEscape(text);
      let tx = x;
      if (align === "right" && boxW > 0) {
        tx = x + boxW - estimateWidth(text, size);
      } else if (align === "center" && boxW > 0) {
        tx = x + (boxW - estimateWidth(text, size)) / 2;
      }
      const font = bold ? "/F2" : "/F1";
      ops.push(`BT ${font} ${size} Tf ${tx.toFixed(2)} ${yPdf(yBaseline)} Td (${safe}) Tj ET`);
    };

    const cols = [
      { key: "no", label: "No", w: 26, align: "center" },
      { key: "date", label: "Tanggal", w: 68, align: "left" },
      { key: "desc", label: "Keterangan", w: 168, align: "left" },
      { key: "method", label: "Metode", w: 55, align: "center" },
      { key: "masuk", label: "Masuk", w: 68, align: "right" },
      { key: "keluar", label: "Keluar", w: 68, align: "right" },
      { key: "saldo", label: "Saldo", w: 70.28, align: "right" },
    ];

    function drawTableHeader(yTop) {
      setFillRgb(7, 51, 42);
      fillRect(M, yTop, contentW, 24);
      setFillRgb(255, 255, 255);
      let cx = M;
      for (const col of cols) {
        const padX = col.align === "right" ? cx - 4 : col.align === "left" ? cx + 5 : cx;
        drawText(col.label, padX, yTop + 15.5, 8.5, true, col.align, col.w);
        cx += col.w;
      }
      return yTop + 24;
    }

    // ---- PAGE 1 HEADER ----
    setFillRgb(7, 51, 42);
    fillRect(M, 34, contentW, 66);
    setFillRgb(142, 224, 85);
    fillRect(M, 96, contentW, 4);

    setFillRgb(142, 224, 85);
    drawText("LAPORAN ARUS KAS WARGA", M + 16, 56, 9, true);
    setFillRgb(255, 255, 255);
    drawText(`${settings.rtName} - ${settings.areaName}`, M + 16, 74, 15, true);
    drawText(`Periode: ${periodLabel}`, M + 16, 89, 9.5, false);
    drawText(`Dicetak: ${new Date().toISOString().slice(0, 10)}`, M + contentW - 140, 89, 8.5, false, "right", 124);

    // ---- SUMMARY KPI BOXES ----
    const kpiY = 114;
    const kpiGap = 8;
    const kpiW = (contentW - kpiGap * 3) / 4;
    const kpis = [
      { label: "Saldo Awal Bulan", val: fmtRp(openingMonthBalance), color: [7, 51, 42] },
      { label: "Total Pemasukan", val: "+" + fmtRp(monthIn), color: [22, 101, 52] },
      { label: "Total Pengeluaran", val: "-" + fmtRp(monthOut), color: [220, 38, 38] },
      { label: "Saldo Akhir Bulan", val: fmtRp(closingMonthBalance), color: [7, 51, 42] },
    ];

    kpis.forEach((k, idx) => {
      const kx = M + idx * (kpiW + kpiGap);
      setFillRgb(247, 249, 250);
      fillRect(kx, kpiY, kpiW, 46);
      setStrokeRgb(218, 226, 230);
      strokeRect(kx, kpiY, kpiW, 46, 0.7);
      setFillRgb(90, 106, 112);
      drawText(k.label, kx + 8, kpiY + 17, 7.8, false);
      setFillRgb(k.color[0], k.color[1], k.color[2]);
      drawText(k.val, kx + 8, kpiY + 35, 10.5, true);
    });

    // Section title
    setFillRgb(7, 51, 42);
    drawText(`Tabel Arus Kas (${periodLabel})`, M, 180, 11, true);

    let y = drawTableHeader(188);
    const rowH = 22;

    if (!rows.length) {
      setFillRgb(250, 251, 252);
      fillRect(M, y, contentW, 28);
      setStrokeRgb(225, 230, 234);
      strokeRect(M, y, contentW, 28, 0.5);
      setFillRgb(110, 120, 128);
      drawText("Belum ada transaksi arus kas pada periode ini.", M, y + 17, 9, false, "center", contentW);
      y += 28;
    } else {
      rows.forEach((row, idx) => {
        if (y + rowH > H - 90) {
          pages.push(ops.join("\n"));
          ops = [];
          setFillRgb(7, 51, 42);
          drawText(`Laporan Arus Kas ${settings.rtName} (${periodLabel}) - Lanjutan`, M, 44, 10, true);
          y = drawTableHeader(54);
        }

        if (idx % 2 === 1) {
          setFillRgb(248, 250, 251);
          fillRect(M, y, contentW, rowH);
        }
        setStrokeRgb(229, 234, 237);
        drawLine(M, y + rowH, M + contentW, y + rowH, 0.5);

        let cx = M;
        const cells = [
          { text: String(idx + 1), color: [75, 85, 99], bold: false },
          { text: row.dateLabel, color: [75, 85, 99], bold: false },
          { text: truncate(row.desc, 33), color: [7, 51, 42], bold: true },
          { text: truncate(row.method, 10), color: [90, 106, 112], bold: false },
          { text: row.masuk > 0 ? fmtRp(row.masuk) : "-", color: row.masuk > 0 ? [22, 101, 52] : [160, 170, 175], bold: row.masuk > 0 },
          { text: row.keluar > 0 ? fmtRp(row.keluar) : "-", color: row.keluar > 0 ? [220, 38, 38] : [160, 170, 175], bold: row.keluar > 0 },
          { text: fmtRp(row.runningBalance), color: [7, 51, 42], bold: true },
        ];

        cols.forEach((col, cIdx) => {
          const cell = cells[cIdx];
          setFillRgb(cell.color[0], cell.color[1], cell.color[2]);
          const padX = col.align === "right" ? cx - 4 : col.align === "left" ? cx + 5 : cx;
          drawText(cell.text, padX, y + 14, 8, cell.bold, col.align, col.w);
          cx += col.w;
        });

        y += rowH;
      });
    }

    // ---- TOTAL ROW ----
    setFillRgb(239, 252, 230);
    fillRect(M, y, contentW, 25);
    setStrokeRgb(197, 241, 165);
    strokeRect(M, y, contentW, 25, 0.8);

    setFillRgb(7, 51, 42);
    drawText(`TOTAL ARUS KAS (${periodLabel})`, M + 8, y + 16, 8.8, true);

    const masukX = M + cols[0].w + cols[1].w + cols[2].w + cols[3].w;
    const keluarX = masukX + cols[4].w;
    const saldoX = keluarX + cols[5].w;

    setFillRgb(22, 101, 52);
    drawText(fmtRp(monthIn), masukX - 4, y + 16, 8.5, true, "right", cols[4].w);
    setFillRgb(220, 38, 38);
    drawText(fmtRp(monthOut), keluarX - 4, y + 16, 8.5, true, "right", cols[5].w);
    setFillRgb(7, 51, 42);
    drawText(fmtRp(closingMonthBalance), saldoX - 4, y + 16, 8.5, true, "right", cols[6].w);
    y += 42;

    // ---- SIGNATURE FOOTER ----
    if (y > H - 70) {
      pages.push(ops.join("\n"));
      ops = [];
      y = 60;
    }
    setFillRgb(90, 106, 112);
    drawText("Disusun secara transparan melalui aplikasi KasWarga", M, y, 8.2, false);
    drawText("Mengetahui,", M + contentW - 150, y, 8.5, false, "center", 150);
    setFillRgb(7, 51, 42);
    drawText(settings.treasurerName || "Bendahara RT", M + contentW - 150, y + 36, 9, true, "center", 150);
    setStrokeRgb(160, 174, 180);
    drawLine(M + contentW - 140, y + 25, M + contentW - 10, y + 25, 0.6);

    pages.push(ops.join("\n"));

    // ---- ASSEMBLE PDF 1.4 OBJECTS ----
    const objects = [];
    const addObj = (body) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObj(""); // placeholder 1
    const pagesId = addObj("");   // placeholder 2
    const fontRegularId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageIds = [];
    for (const streamStr of pages) {
      const len = new TextEncoder().encode(streamStr).length;
      const contentId = addObj(`<< /Length ${len} >>\nstream\n${streamStr}\nendstream`);
      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan-Arus-Kas-${periodCode}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  window.exportMonthlyCashflowPdf = buildMonthlyCashflowPdf;
})();
