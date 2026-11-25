const fs = require("fs");
const path = require("path");
const puppeteer = require("C:\\Users\\indra.permana\\.gemini\\antigravity\\scratch\\toko-app\\node_modules\\puppeteer-core");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "tutorial_assets");
const outputPdfPath = path.join(rootDir, "Panduan_Tutorial_KasWarga.pdf");
const downloadsPdfPath = "C:\\Users\\indra.permana\\Downloads\\Panduan_Tutorial_KasWarga.pdf";

function getImageBase64(filename) {
  const filePath = path.join(assetsDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString("base64")}`;
  }
  console.warn(`File not found: ${filePath}`);
  return "";
}

async function generatePdf() {
  console.log("Memuat gambar panduan KasWarga & menyiapkan PDF...");

  const tab = {
    s01: getImageBase64("tab_01_beranda.png"),
    s02: getImageBase64("tab_02_detail_iuran.png"),
    s03: getImageBase64("tab_03_bayar_iuran.png"),
    s04: getImageBase64("tab_04_konfirmasi_bayar.png"),
    s05: getImageBase64("tab_05_kuitansi.png"),
    s06: getImageBase64("tab_06_pengeluaran.png"),
    s07: getImageBase64("tab_07_tambah_iuran.png"),
    s08: getImageBase64("tab_08_warga.png"),
    s09: getImageBase64("tab_09_riwayat.png"),
    s10: getImageBase64("tab_10_laporan.png"),
    s11: getImageBase64("tab_11_rincian_laporan.png"),
    s12: getImageBase64("tab_12_pengaturan.png"),
  };

  const mob = {
    m01: getImageBase64("mob_01_beranda.png"),
    m02: getImageBase64("mob_02_daftar_iuran.png"),
    m03: getImageBase64("mob_03_detail_iuran.png"),
    m04: getImageBase64("mob_04_bayar_iuran.png"),
    m05: getImageBase64("mob_05_konfirmasi.png"),
    m06: getImageBase64("mob_06_kuitansi.png"),
    m07: getImageBase64("mob_07_pengeluaran.png"),
    m08: getImageBase64("mob_08_tambah_iuran.png"),
    m09: getImageBase64("mob_09_warga.png"),
    m10: getImageBase64("mob_10_riwayat.png"),
    m11: getImageBase64("mob_11_laporan.png"),
    m12: getImageBase64("mob_12_pengaturan.png"),
  };

  const guides = [
    {
      num: "1",
      title: "Mengenal Halaman Beranda KasWarga",
      func: "Melihat total saldo kas RT, progres KK yang sudah lunas bulan ini, aksi cepat, dan daftar jenis iuran.",
      img: tab.s01,
      steps: [
        "Ketik nama iuran, nama warga, atau nomor blok pada Kolom Pencarian untuk menemukan data dengan cepat.",
        "Pilih Bulan Periode di kanan atas untuk mengecek status lunas & arus kas pada bulan tertentu.",
        "Klik ikon kotak merah \"Pengeluaran\" di Aksi Cepat untuk mencatat belanja atau biaya operasional RT.",
        "Klik tombol \"Bayar Iuran\" (atau tombol bulat tengah \"Bayar\" pada layar HP) saat warga membayar iuran.",
        "Gunakan Menu di sisi kiri (atau 5 tombol menu bawah di HP) untuk berpindah halaman aplikasi.",
      ],
    },
    {
      num: "2",
      title: "Melihat Detail Jenis Iuran & Status KK",
      func: "Melihat nominal per KK, kategori Wajib/Opsional, total terkumpul, serta daftar warga yang sudah dan belum bayar.",
      img: tab.s02,
      steps: [
        "Klik kartu jenis iuran di Beranda untuk melihat info Kategori (Wajib / Opsional) dan nominal per KK.",
        "Periksa kotak ringkasan untuk melihat jumlah KK yang sudah bayar, persentase, dan total uang terkumpul.",
        "Klik tombol \"Bayar Iuran Ini\" di bagian bawah jika ingin langsung mencatat pembayaran warga.",
        "Klik tombol silang (X) di pojok kanan atas untuk menutup kotak detail iuran.",
      ],
    },
    {
      num: "3",
      title: "Cara Mencatat Pembayaran Iuran Warga",
      func: "Mencatat pembayaran iuran warga untuk bulan sekarang maupun bulan yang terlewat secara cepat dan otomatis.",
      img: tab.s03,
      steps: [
        "Pilih Nama Warga yang akan membayar pada kolom \"Warga Pembayar\".",
        "Pilih \"Untuk Periode Bulan\" — bendahara dapat memilih bulan lalu jika warga membayar tunggakan/terlewat.",
        "Seluruh iuran berkategori Wajib otomatis muncul dan terkunci (tidak dapat dihapus) dengan label \"Wajib\".",
        "Klik tombol \"+ ...\" pada bagian \"Tambah Iuran Opsional\" bila warga juga membayar iuran sukarela/opsional.",
        "Pilih Metode Pembayaran (Tunai / Transfer / QRIS), lalu klik tombol hijau tua \"Konfirmasi Pembayaran\".",
      ],
    },
    {
      num: "4",
      title: "Popup Konfirmasi Sebelum Simpan Pembayaran",
      func: "Mencegah salah input dengan menampilkan ringkasan data sebelum pembayaran disimpan permanen ke database.",
      img: tab.s04,
      steps: [
        "Periksa kembali Nama Warga, Periode Bulan, Jumlah Iuran, Metode, dan Total Bayar di kotak ringkasan.",
        "Klik tombol \"Batal\" bila masih ragu atau ingin mengubah pilihan iuran dan periode terlebih dahulu.",
        "Klik tombol hijau tua \"Ya, Bayar\" bila semua data sudah benar. Transaksi langsung tersimpan ke database!",
      ],
    },
    {
      num: "5",
      title: "Bukti Kuitansi & Kirim ke WhatsApp Warga",
      func: "Menampilkan bukti kuitansi resmi setelah pembayaran dicatat agar mudah dikirim ke warga lewat WhatsApp.",
      img: tab.s05,
      steps: [
        "Periksa rincian kuitansi meliputi Nomor Bukti, Tanggal Bayar, Periode, Warga, Metode, dan daftar iuran.",
        "Klik tombol \"Salin Kuitansi WA\" untuk menyalin teks bukti bayar dan langsung menempelkannya ke WhatsApp warga.",
        "Jika ada kesalahan pencatatan, klik tombol \"Hapus\" (akan muncul kotak konfirmasi sebelum dihapus).",
      ],
    },
    {
      num: "6",
      title: "Cara Mencatat Pengeluaran Kas RT",
      func: "Mencatat setiap pengeluaran kas warga (listrik, kebersihan, perbaikan fasilitas, dll) agar saldo selalu akurat.",
      img: tab.s06,
      steps: [
        "Ketik nama keperluan pengeluaran (contoh: \"Beli Lampu Jalan LED Blok B\") pada kolom Keperluan.",
        "Masukkan jumlah nominal pengeluaran dalam Rupiah pada kolom \"Nominal (Rp)\".",
        "Pilih Kategori pengeluaran (Kebersihan, Keamanan, Fasilitas, Acara, dll) serta isi catatan/penerima bila perlu.",
        "Klik tombol merah \"Simpan Pengeluaran\", lalu konfirmasi \"Ya, Simpan\" pada kotak konfirmasi yang muncul.",
      ],
    },
    {
      num: "7",
      title: "Menambah Jenis Iuran Baru (Wajib / Opsional)",
      func: "Menambahkan pos iuran bulanan baru yang hanya terdiri dari 2 kategori tegas: Wajib atau Opsional.",
      img: tab.s07,
      steps: [
        "Ketik Nama Jenis Iuran baru pada kolom pertama (contoh: \"Iuran Perbaikan Jalan\").",
        "Isi nominal biaya iuran per KK per bulan pada kolom \"Nominal / KK (Rp)\".",
        "Pilih Kategori \"Wajib\" (otomatis terkunci saat bayar) atau \"Opsional\" (dapat dipilih tambahan saat bayar).",
        "Tambahkan deskripsi singkat bila perlu, lalu klik tombol \"Tambah ke Etalase\" dan konfirmasi penyimpanan.",
      ],
    },
    {
      num: "8",
      title: "Mengelola Data Warga (Kepala Keluarga)",
      func: "Melihat status lunas seluruh KK, menyaring per blok rumah, menambah KK baru, dan melihat riwayat tiap warga.",
      img: tab.s08,
      steps: [
        "Klik tombol \"+ Warga\" di kanan atas untuk mendaftarkan Kepala Keluarga (Nama, Blok, Nomor Rumah, No. WA).",
        "Gunakan tombol saringan \"Semua / Belum / Lunas\" untuk melihat warga yang belum melunasi iuran bulan ini.",
        "Gunakan pilihan \"Semua Blok\" di sebelah kanan untuk menyaring daftar warga berdasarkan blok rumah.",
        "Klik kartu warga mana saja untuk melihat detail profil, mengubah data, menghapus, atau langsung mencatat bayar.",
      ],
    },
    {
      num: "9",
      title: "Melihat Riwayat Pemasukan & Pengeluaran",
      func: "Memantau seluruh riwayat uang masuk dan uang keluar secara kronologis lengkap dengan penanda warna.",
      img: tab.s09,
      steps: [
        "Klik tombol saringan \"Semua / Masuk / Keluar\" untuk menampilkan jenis transaksi tertentu saja.",
        "Klik tombol merah \"- Keluar\" di kanan atas sebagai jalan pintas untuk menambah catatan pengeluaran baru.",
        "Klik baris transaksi mana saja untuk membuka detail kuitansi, menyalin ke WA, atau menghapus transaksi.",
        "Perhatikan ikonnya: kotak hijau panah masuk = Pemasukan Iuran, sedangkan kotak merah ikon uang = Pengeluaran.",
      ],
    },
    {
      num: "10",
      title: "Laporan Arus Kas, Grafik Interaktif & Export PDF",
      func: "Mengecek performa arus kas 3 bulan terakhir secara interaktif, menyalin rekap WA, dan mengunduh laporan PDF.",
      img: tab.s10,
      steps: [
        "Klik tombol \"Export PDF\" untuk mengunduh/mencetak tabel Laporan Arus Kas resmi periode bulan aktif.",
        "Klik tombol \"Salin WA\" untuk menyalin rekap ringkas pemasukan, pengeluaran, dan saldo ke grup WhatsApp RT.",
        "Pantau 4 kotak ringkasan atas: Saldo Kas saat ini, Total Masuk bulan ini, Total Keluar, dan persentase KK Lunas.",
        "Arahkan kursor (tablet/desktop) atau ketuk batang grafik (HP) untuk melihat nilai nominal detail tiap bulan.",
      ],
    },
    {
      num: "11",
      title: "Rincian Pemasukan, Pengeluaran & Saldo Akhir",
      func: "Menampilkan rincian setiap pos pemasukan & pengeluaran lengkap dengan total akhir serta perhitungan saldo kas.",
      img: tab.s11,
      steps: [
        "Periksa kartu \"Rincian Pemasukan\" untuk melihat perolehan per jenis iuran beserta kotak \"Total Pemasukan\" di akhir.",
        "Periksa kartu \"Rincian Pengeluaran\" untuk melihat biaya per kategori beserta kotak \"Total Pengeluaran\" di akhir.",
        "Lihat kartu \"Ringkasan Saldo Kas\" di bawah untuk memeriksa Saldo Awal, Total Masuk, Total Keluar, Selisih, dan Saldo Akhir.",
      ],
    },
    {
      num: "12",
      title: "Pengaturan Perumahan, RT/RW & Nama Bendahara",
      func: "Menyesuaikan identitas lingkungan RT/RW, nama perumahan/cluster, serta nama bendahara yang tampil di laporan.",
      img: tab.s12,
      steps: [
        "Isi \"Nama Perumahan\" dan \"Cluster\" sesuai nama lingkungan Anda (tampil di header, kuitansi WA, dan PDF).",
        "Atur nomor \"RT\" dan \"RW\" pada dua kolom sejajar di bagian tengah.",
        "Ketik \"Nama Bendahara\" yang bertugas (otomatis tampil pada kartu saldo beranda & tanda tangan laporan PDF).",
        "Klik tombol \"Simpan Pengaturan\" lalu konfirmasi agar identitas baru langsung tersimpan di database.",
      ],
    },
  ];

  const mobileScreens = [
    { title: "1. Beranda & Aksi Cepat", img: mob.m01 },
    { title: "2. Daftar Iuran & Tombol Bayar", img: mob.m02 },
    { title: "3. Detail Jenis Iuran", img: mob.m03 },
    { title: "4. Bayar Iuran & Pilih Periode", img: mob.m04 },
    { title: "5. Popup Konfirmasi Bayar", img: mob.m05 },
    { title: "6. Bukti Kuitansi & Salin WA", img: mob.m06 },
    { title: "7. Formulir Pengeluaran Kas", img: mob.m07 },
    { title: "8. Tambah Jenis Iuran", img: mob.m08 },
    { title: "9. Daftar Data Warga (KK)", img: mob.m09 },
    { title: "10. Riwayat Pemasukan & Keluar", img: mob.m10 },
    { title: "11. Laporan & Grafik Arus Kas", img: mob.m11 },
    { title: "12. Pengaturan RT/RW & Bendahara", img: mob.m12 },
  ];

  const guidePagesHtml = guides
    .map(
      (g) => `
    <div class="guide-page">
      <div class="guide-header">
        <div class="guide-num">${g.num}</div>
        <div class="guide-title-wrap">
          <h2 class="guide-title">${g.title}</h2>
          <div class="guide-func"><strong>Fungsi:</strong> ${g.func}</div>
        </div>
      </div>

      <div class="guide-screenshot-frame">
        <img src="${g.img}" alt="${g.title}" class="guide-img" />
      </div>

      <div class="guide-steps-box">
        <div class="guide-steps-heading">Langkah-Langkah Mudah (Ikuti Nomor Panah di Gambar):</div>
        <ol class="guide-steps-list">
          ${g.steps
            .map(
              (s, idx) => `
            <li>
              <span class="step-badge">${idx + 1}</span>
              <span class="step-text">${s}</span>
            </li>
          `
            )
            .join("")}
        </ol>
      </div>
    </div>
  `
    )
    .join("\n");

  const mobileChunks = [
    mobileScreens.slice(0, 4),
    mobileScreens.slice(4, 8),
    mobileScreens.slice(8, 12),
  ];

  const mobilePagesHtml = mobileChunks
    .map(
      (chunk, pageIdx) => `
    <div class="mobile-gallery-page">
      <div class="mobile-gallery-header">
        <div class="mobile-badge">LAMPIRAN TAMPILAN HP / SMARTPHONE (${pageIdx + 1}/${mobileChunks.length})</div>
        <h2 class="mobile-gallery-title">Gambaran Tampilan KasWarga di Layar HP</h2>
      </div>
      <div class="mobile-grid">
        ${chunk
          .map(
            (m) => `
          <div class="mobile-card">
            <div class="mobile-card-title">${m.title}</div>
            <div class="mobile-img-wrap">
              <img src="${m.img}" alt="${m.title}" class="mobile-img" />
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `
    )
    .join("\n");

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Praktis KasWarga</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 13mm 12mm 13mm;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* SAMPUL DEPAN (COVER) */
    .cover-page {
      height: 271mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(160deg, #F1FDE6 0%, #FFFFFF 55%, #ECFDF5 100%);
      border: 3px solid #07332A;
      border-radius: 22px;
      padding: 28px 28px 24px 28px;
      page-break-after: always;
    }

    .cover-top-pill {
      display: inline-block;
      background: #07332A;
      color: #8EE055;
      font-weight: 800;
      font-size: 11pt;
      padding: 6px 16px;
      border-radius: 999px;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      color: #07332A;
      line-height: 1.18;
      margin-bottom: 10px;
    }

    .cover-subtitle {
      font-size: 13pt;
      font-weight: 600;
      color: #334155;
      line-height: 1.45;
    }

    .cover-preview-box {
      background: #07332A;
      border-radius: 18px;
      padding: 15px;
      box-shadow: 0 12px 28px rgba(7, 51, 42, 0.24);
      text-align: center;
    }

    .cover-preview-box img {
      width: 100%;
      max-height: 118mm;
      object-fit: contain;
      border-radius: 10px;
      border: 3px solid #8EE055;
      background: #fff;
    }

    .cover-preview-caption {
      color: #ECFDF5;
      font-size: 10.2pt;
      font-weight: 700;
      margin-top: 10px;
    }

    .cover-features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .cover-feature-item {
      background: #FFFFFF;
      border: 2px solid #B7EB8F;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 10.3pt;
      font-weight: 700;
      color: #07332A;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cover-footer {
      border-top: 2px dashed #B7EB8F;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 9.2pt;
      font-weight: 600;
      color: #475569;
    }

    /* HALAMAN PANDUAN TABLET (1 FITUR PER HALAMAN, JELAS & MINIM TULISAN) */
    .guide-page {
      height: 271mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      padding: 4px 0;
    }

    .guide-header {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #F1FDE6;
      border: 2px solid #8EE055;
      border-radius: 16px;
      padding: 12px 16px;
    }

    .guide-num {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #07332A;
      color: #8EE055;
      font-size: 18pt;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(7, 51, 42, 0.25);
    }

    .guide-title-wrap {
      flex: 1;
    }

    .guide-title {
      font-size: 15pt;
      font-weight: 800;
      color: #07332A;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .guide-func {
      font-size: 10.3pt;
      font-weight: 600;
      color: #1E293B;
      line-height: 1.35;
    }

    .guide-func strong {
      color: #07332A;
    }

    .guide-screenshot-frame {
      background: #F8FAFC;
      border: 2.5px solid #CBD5E1;
      border-radius: 16px;
      padding: 8px;
      text-align: center;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 10px 0;
      overflow: hidden;
    }

    .guide-img {
      width: 100%;
      max-height: 144mm;
      object-fit: contain;
      border-radius: 10px;
      display: block;
    }

    .guide-steps-box {
      background: #FFFBEB;
      border: 2px solid #FDE68A;
      border-radius: 16px;
      padding: 12px 16px;
    }

    .guide-steps-heading {
      font-size: 10.8pt;
      font-weight: 800;
      color: #92400E;
      margin-bottom: 8px;
    }

    .guide-steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6.5px;
    }

    .guide-steps-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 10.4pt;
      font-weight: 600;
      color: #1E293B;
      line-height: 1.36;
    }

    .step-badge {
      width: 23px;
      height: 23px;
      border-radius: 999px;
      background: #E11D48;
      color: #FEF08A;
      font-size: 9.8pt;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-text {
      flex: 1;
    }

    /* HALAMAN GALERI HP / SMARTPHONE (2x2 GRID PER HALAMAN) */
    .mobile-gallery-page {
      height: 271mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      padding: 4px 0;
    }

    .mobile-gallery-page:last-child {
      page-break-after: auto;
    }

    .mobile-gallery-header {
      background: #07332A;
      color: #FFFFFF;
      border-radius: 16px;
      padding: 12px 18px;
      margin-bottom: 12px;
      text-align: center;
    }

    .mobile-badge {
      display: inline-block;
      background: #8EE055;
      color: #07332A;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 3px 12px;
      border-radius: 999px;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }

    .mobile-gallery-title {
      font-size: 15pt;
      font-weight: 800;
      color: #FFFFFF;
    }

    .mobile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 12px;
      flex: 1;
    }

    .mobile-card {
      background: #F8FAFC;
      border: 2px solid #CBD5E1;
      border-radius: 16px;
      padding: 8px 10px 10px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }

    .mobile-card-title {
      width: 100%;
      background: #07332A;
      color: #8EE055;
      font-size: 10.2pt;
      font-weight: 800;
      text-align: center;
      padding: 6px 10px;
      border-radius: 10px;
      margin-bottom: 8px;
    }

    .mobile-img-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      overflow: hidden;
    }

    .mobile-img {
      height: 104mm;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      border-radius: 12px;
      border: 2px solid #94A3B8;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
      background: #FFFFFF;
    }
  </style>
</head>
<body>

  <!-- HALAMAN SAMPUL -->
  <div class="cover-page">
    <div>
      <div class="cover-top-pill">BUKU PANDUAN PRAKTIS & MUDAH</div>
      <h1 class="cover-title">Panduan Cara Pakai<br/>Aplikasi KasWarga</h1>
      <p class="cover-subtitle">
        Dibuat khusus agar sangat mudah diikuti oleh pengurus & bendahara RT, minim tulisan, dilengkapi gambar tanda panah penunjuk tombol dan langkah singkat.
      </p>
    </div>

    <div class="cover-preview-box">
      <img src="${tab.s01}" alt="Tampilan Utama Aplikasi KasWarga" />
      <div class="cover-preview-caption">
        Setiap gambar dilengkapi nomor panah merah (1, 2, 3...) yang sesuai dengan urutan langkah di bawahnya
      </div>
    </div>

    <div class="cover-features">
      <div class="cover-feature-item">✅ 1. Pantau Saldo & Progres KK Lunas</div>
      <div class="cover-feature-item">✅ 2. Catat Bayar Iuran & Pilih Periode</div>
      <div class="cover-feature-item">✅ 3. Catat Pengeluaran & Kelola Warga</div>
      <div class="cover-feature-item">✅ 4. Grafik Arus Kas, Export PDF & WA</div>
    </div>

    <div class="cover-footer">
      <span>KasWarga — Aplikasi Iuran Kas Warga (App Utama & /demo)</span>
      <span>Dilengkapi 12 Tampilan Layar HP di Halaman Terakhir</span>
    </div>
  </div>

  <!-- 12 HALAMAN PANDUAN TABLET DENGAN PANAH & LANGKAH SINGKAT -->
  ${guidePagesHtml}

  <!-- 3 HALAMAN GALERI TAMPILAN HP (12 LAYAR) -->
  ${mobilePagesHtml}

</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.pdf({
      path: outputPdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    const sizeKb = Math.round(fs.statSync(outputPdfPath).size / 1024);
    console.log(`PDF berhasil dibuat di: ${outputPdfPath} (${sizeKb} KB)`);

    try {
      fs.copyFileSync(outputPdfPath, downloadsPdfPath);
      console.log(`Salinan PDF juga disimpan ke: ${downloadsPdfPath}`);
    } catch (copyErr) {
      console.warn("Tidak dapat menyalin ke folder Downloads:", copyErr.message);
    }
  } finally {
    await browser.close();
  }
}

generatePdf().catch((err) => {
  console.error("Gagal membuat PDF:", err);
  process.exit(1);
});
