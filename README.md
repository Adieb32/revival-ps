# Revival PlayStation — Sistem Manajemen Penyewaan & Cashflow

Aplikasi web manajemen operasional **Revival PlayStation** dengan desain **Navy & Royal Blue (`#0b132b` & `#2563eb`)** dan alur **Login -> Menu Utama (2 Pilihan) -> Rekap Penyewaan / Rekap Cashflow**.

## Akun Login Operasional
- **Username:** `revivalps`
- **Password:** `revival123`
- **Keamanan Sesi:** Menggunakan `sessionStorage` sehingga otomatis logout saat browser atau tab ditutup.

## Struktur Folder
- `index.html` — Struktur halaman Login, Menu Portal 2 Pilihan, Modul Penyewaan (konten terbaru), dan Modul Cashflow.
- `css/style.css` — Styling asli `revival ps management fix`.
- `js/config.js` — Konfigurasi akun login dan koneksi opsional Supabase.
- `js/app.js` — Logika penyimpanan lokal/Supabase, auto-logout, kompresi foto identitas, dan sinkronisasi otomatis ke Cashflow.
- `js/export.js` — Ekspor laporan ke PNG, Word, Excel, dan CSV.
- `assets/logo.jpeg` — Logo Revival PlayStation (silakan ganti dengan file `logo.jpeg` asli Anda jika diperlukan).
- `database/supabase_schema.sql` — Skema tabel SQL untuk Supabase.
