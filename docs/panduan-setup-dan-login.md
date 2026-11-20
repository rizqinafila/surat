# Panduan Menjalankan Database & Login Akun Pertama (HMPS Informatika)

Akun login untuk **HMPS Informatika** telah didaftarkan di Supabase Auth. Untuk mengaktifkan tabel database dan menghubungkan akun ke lembaga HMPS Informatika, ikuti langkah mudah berikut:

---

## 1. Salin & Jalankan Skrip SQL di Supabase

1. Buka dashboard proyek Supabase Anda:  
   👉 **[https://supabase.com/dashboard/project/tblgbkmpcbfqrufbcpna](https://supabase.com/dashboard/project/tblgbkmpcbfqrufbcpna)**
2. Masuk ke menu **SQL Editor** (ikon terminal/kueri SQL di bilah kiri).
3. Klik tombol **New query**.
4. Buka file:  
   👉 `[supabase/setup_lengkap_dan_akun_informatika.sql](file:///d:/Semester%205/PBP/surat-in/supabase/setup_lengkap_dan_akun_informatika.sql)`  
   Salin seluruh isinya (Ctrl+A lalu Ctrl+C) dan tempel (Ctrl+V) ke SQL Editor Supabase.
5. Klik tombol hijau **Run** (atau tekan `Ctrl + Enter`).
6. Pesan sukses akan muncul di tab *Messages/Results*:
   ```text
   SETUP BERHASIL LENGKAP!
   AKUN HMPS INFORMATIKA:
   Email    : informatika@suratin.local
   Password : Informatika2026!
   Lembaga  : HMPS Informatika (P24)
   Periode  : Periode IV (Aktif)
   ```

---

## 2. Kredensial Login Akun Pertama

Setelah menjalankan skrip di atas, Anda dapat langsung login di aplikasi mobile:

### 🎓 Akun Sekretaris Lembaga (HMPS Informatika)
- **Email:** `informatika@suratin.local`
- **Kata Sandi:** `Informatika2026!`
- **Lembaga:** HMPS Informatika (Kode: `P24`)
- **Periode Aktif:** Periode IV (Tahun 2026)
- **Hak Akses:**
  - Penerbitan nomor surat keluar format Lembaga (`...P24-Un.IV...`) dan format Kepanitiaan.
  - Pencatatan surat masuk & nomor agenda otomatis.
  - Pengunduhan rekapitulasi Excel (.xlsx).
  - Peninjauan arsip periode lampau.

### 🛡️ Akun Administrator Sistem
- **Email:** `admin@suratin.local`
- **Kata Sandi:** `AdminSuratIn2026!`
- **Hak Akses:**
  - Mengelola 67 daftar lembaga mahasiswa.
  - Mengganti status periode aktif lembaga.

---

## 3. Menjalankan Aplikasi Mobile

Jalankan server aplikasi di terminal:

```bash
npx expo start
```

Pindai kode QR menggunakan kamera ponsel atau aplikasi **Expo Go** di Android, lalu masukkan email `informatika@suratin.local` dan password `Informatika2026!`.

