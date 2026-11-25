# KasWarga — Aplikasi Iuran Kas RT (Mobile-First & Tablet Responsive)

Aplikasi pencatatan iuran kas warga yang ringan, responsif di **Mobile & Tablet**, dengan skema warna **Deep Forest Green (`#07332A`) & Electric Lime (`#8EE055`)**, serta penyimpanan database relasional sejati (**MySQL lokal** dan **Cloudflare D1**).

## Demo Live (Cloudflare Workers + D1)
- **URL**: https://kas-warga-app.pandu-app.workers.dev
- **Cloudflare D1 Database**: `kas-warga-db` (`0683de75-dd05-49e0-995e-100168f96657`)

## Fitur Utama
- **Mobile-First & Responsive Tablet**: Navigasi bawah 5 menu dengan tombol bulat **Bayar** di tengah pada mobile, otomatis beradaptasi menjadi sidebar pada tablet & desktop.
- **Kategori Wajib & Opsional**: Item **Wajib** terkunci otomatis saat pembayaran (tidak dapat dihapus), sedangkan item **Opsional** dapat ditambah/dihapus sesuai kebutuhan.
- **Pilih Periode Bulan Saat Bayar**: Mendukung pembayaran susulan bagi warga yang terlewat di bulan-bulan sebelumnya.
- **Popup Konfirmasi Global**: Setiap penyimpanan, pembayaran, dan penghapusan melewati dialog konfirmasi terlebih dahulu.
- **Laporan Lengkap & Export PDF**: Grafik arus kas 3 bulan interaktif (*hover/tap tooltip*), rincian pemasukan & pengeluaran dengan total akhir, ringkasan saldo kas, salin laporan ke WhatsApp, serta **Export PDF** tabel arus kas bulanan.
- **Pengaturan Lingkungan**: Konfigurasi Nama Perumahan, Cluster, RT, RW, dan Nama Bendahara tersimpan langsung di database.

## Struktur Tabel Relasional
Lihat [database/schema.sql](database/schema.sql) (MySQL InnoDB) dan [database/d1-schema.sql](database/d1-schema.sql) (Cloudflare D1):
- `app_settings` — pengaturan lingkungan RT/RW/perumahan/cluster/bendahara
- `dues` — master jenis iuran (`wajib` / `opsional`)
- `warga` — master data kepala keluarga
- `transactions` — transaksi pemasukan & pengeluaran (`FOREIGN KEY (warga_id) REFERENCES warga(id)`)
- `transaction_items` — rincian iuran per transaksi (`FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE`, `FOREIGN KEY (due_id) REFERENCES dues(id)`)

## Menjalankan Lokal dengan MySQL
1. Salin `.env.example` menjadi `.env` dan sesuaikan kredensial MySQL lokal Anda.
2. Instal dependensi & jalankan server:
   ```bash
   npm install
   npm start
   ```
3. Server otomatis membuat database `kas_warga`, menjalankan `database/schema.sql` & `database/seed.sql` (jika kosong), lalu berjalan di `http://127.0.0.1:8765`.
