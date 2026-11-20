# Panduan Demo & Pengujian Penerimaan Aplikasi Surat-in
**Target Evaluasi:** Proyek Akhir Mata Kuliah Pemrograman Berbasis Platform (P16)  
**Cakupan:** 30 Kebutuhan Fungsional (FR-001 s.d. FR-030)  
**Format:** Naskah Walkthrough Interaktif Penguji & Dosen (Estimasi Waktu: 15 Menit)

---

## 1. Persiapan & Akun Uji

Aplikasi telah disiapkan dengan data awal (*seed data*) lengkap: 67 lembaga mahasiswa, 4 klasifikasi jenis surat, 13 format penandatangan resmi, dan akun percontohan.

| Peran | Email Akun Uji | Kata Sandi Bawaan | Lembaga / Hak Akses |
| :--- | :--- | :--- | :--- |
| **Sekretaris Lembaga** | `sekretaris.s04@suratin.local` | `SuratIn2026!` | SEMA-F Ekonomi dan Bisnis Islam (`S04`), Periode Aktif `IX` |
| **Sekretaris Pembanding** | `sekretaris.m07@suratin.local` | `SuratIn2026!` | UKM Zenith (`M07`), Periode Aktif `XXVI` |
| **Administrator** | `admin@suratin.local` | `AdminSuratIn2026!` | Pengelola Data Master (Periode & 67 Lembaga) |

---

## 2. Naskah Demonstrasi Fitur (Step-by-Step)

### Skenario A: Autentikasi, Batasan Akses, & Arsip Periode
> **Kebutuhan yang Diuji:** FR-001, FR-002, FR-003, FR-004

1. **Uji Penanganan Error Login (FR-001):**
   - Buka aplikasi Surat-in pada ponsel Android.
   - Masukkan email `sekretaris.s04@suratin.local` dengan kata sandi salah (misal: `123456`).
   - Tekan tombol **Masuk**.
   - **Hasil:** Aplikasi menampilkan pesan error generik *"Email atau kata sandi salah"*, tanpa membocorkan eksistensi akun.
2. **Uji Login Berhasil & Pemuatan Otomatis (FR-001):**
   - Masukkan kata sandi yang benar: `SuratIn2026!`.
   - Tekan **Masuk**.
   - **Hasil:** Aplikasi langsung masuk ke Beranda. Tampil kartu lembaga **SEMA-F Ekonomi dan Bisnis Islam (S04)** dan periode aktif **Periode IX (2026)** secara otomatis.
3. **Uji Mode Arsip Hanya-Baca (FR-002, FR-003):**
   - Buka tab **Arsip** pada navigasi bawah.
   - Pilih periode kepengurusan lampau: **Periode VIII (2025)**.
   - **Hasil:** Tampil banner kuning tegas: *"Mode Arsip (Hanya Baca): Anda sedang membuka arsip Periode VIII. Penambahan dan pengeditan surat dimatikan."*
   - Periksa tab **Keluar** dan **Masuk** saat dalam mode arsip: tombol `+ Buat Surat` dan tombol edit/batalkan **hilang**.
   - Database PostgreSQL RLS secara native menolak setiap manipulasi data pada periode berstatus `arsip` (FR-003).

---

### Skenario B: Penerbitan Surat Keluar Lembaga & Kepanitiaan
> **Kebutuhan yang Diuji:** FR-005, FR-006, FR-007, FR-008, FR-011

1. **Uji Penerbitan Surat Format Lembaga (FR-005, FR-008, FR-011):**
   - Pastikan kembali ke periode aktif (tekan *"Kembali ke Periode Aktif"* pada banner atau tab Arsip).
   - Masuk ke tab **Keluar** -> tekan tombol **+ Buat Surat**.
   - Pilih opsi format **Surat Lembaga**.
   - Pilih Jenis Surat: `01 - Internal khusus`.
   - Pilih Penandatangan: `A-0 - Ketua`.
   - Tanggal surat bawaan hari ini (misal: `16 Februari 2026`).
   - **Amati Kotak Pratinjau:** Nomor tersusun dinamis secara instan: `NN.S04-Un.IX.01.A-0.II.2026`.
   - Isi Hal: `Undangan Rapat Kerja Pengurus`.
   - Isi Alamat Tujuan: `Seluruh Pengurus SEMA FEBI`.
   - Tekan tombol **Buat Nomor Surat**.
   - **Hasil:** Dialog sukses muncul dalam waktu < 2 detik dengan nomor resmi pertama:  
     `01.S04-Un.IX.01.A-0.II.2026`.
   - Tekan tombol **Salin Nomor** -> muncul notifikasi *"Nomor surat berhasil disalin ke papan klip"* (FR-011).
2. **Uji Penambahan Kegiatan Kepanitiaan (FR-007):**
   - Pada form Buat Surat, pilih opsi format **Surat Kepanitiaan**.
   - Tekan tombol **+ Kegiatan Baru**.
   - Masukkan Nama Kegiatan: `Workshop Kepemimpinan Mahasiswa`.
   - Masukkan Singkatan: `Pan-WK`.
   - Masukkan Nomor SK: `01`.
   - Tekan **Simpan Kegiatan**.
   - **Hasil:** Kegiatan `Pan-WK (SK: 01)` langsung terpilih otomatis di form.
3. **Uji Nomor Urut Kepanitiaan Dimulai dari 02 (FR-006):**
   - Pada kegiatan `Pan-WK` yang baru dibuat, pilih Jenis Surat: `02 - Internal umum` dan Penandatangan: `E-II - Ketua OC, Sekretaris OC, dan Ketua Umum`.
   - Periksa pratinjau: `NN.Pan-WK.01.S04-Un.IX.02.E-II.II.2026`.
   - Isi Hal: `Permohonan Peminjaman Ruang Aula`.
   - Isi Alamat: `Bagian Umum & Perlengkapan Kampus`.
   - Tekan **Buat Nomor Surat**.
   - **Hasil:** Nomor surat terbit dengan nomor urut **02** (bukan 01, karena 01 dicadangkan untuk nomor sertifikat kepanitiaan):  
     `02.Pan-WK.01.S04-Un.IX.02.E-II.II.2026`.

---

### Skenario C: Koreksi, Pembatalan, & Audit Trail Surat Keluar
> **Kebutuhan yang Diuji:** FR-009, FR-010, FR-012

1. **Uji Edit Surat Keluar (Perhitungan Ulang Otomatis) (FR-009):**
   - Buka surat keluar nomor `02.Pan-WK.01.S04-Un.IX.02.E-II.II.2026` dari daftar.
   - Tekan tombol **Edit Surat**.
   - Perhatikan: Nomor urut, lembaga, dan periode **terkunci permanen**.
   - Ubah Penandatangan menjadi `E-I - Ketua OC dan Sekretaris OC`.
   - Ubah Tanggal Surat menjadi bulan depan: `2026-03-05` (Bulan Maret).
   - Tekan **Simpan Perubahan**.
   - **Hasil:** Dialog konfirmasi menampilkan perbandingan:
     - Nomor Lama: `02.Pan-WK.01.S04-Un.IX.02.E-II.II.2026`
     - Nomor Baru: `02.Pan-WK.01.S04-Un.IX.02.E-I.III.2026`
     - Keterangan: Angka romawi bulan berubah otomatis dari `II` ke `III` dan penandatangan berubah ke `E-I`, sementara nomor urut `02` tetap utuh.
2. **Uji Pembatalan Surat Keluar (FR-010, FR-012):**
   - Masih pada layar detail surat yang sama, tekan tombol **Batalkan Surat**.
   - Masukkan alasan pembatalan: `Acara diundur dan format susunan panitia direvisi`.
   - Tekan **Ya, Batalkan Surat**.
   - **Hasil:** Status surat berubah menjadi merah: **Dibatalkan**. Alasan pembatalan dan timestamp tercatat di database `riwayat_perubahan` (FR-012). Nomor tersebut **tidak dihapus** dan tidak akan pernah dipakai ulang.

---

### Skenario D: Pencatatan Surat Masuk & Deteksi Duplikasi Cerdas
> **Kebutuhan yang Diuji:** FR-013, FR-014, FR-015, FR-016, FR-017, FR-018

1. **Uji Validasi Tanggal Server WIB (FR-015):**
   - Buka tab **Masuk** -> tekan **+ Catat Surat Masuk**.
   - Masukkan tanggal terima esok hari (misal tanggal besok).
   - Tekan **Simpan Surat Masuk**.
   - **Hasil:** Ditolak dengan pesan validasi *"Tanggal terima tidak boleh setelah hari ini (WIB)"*.
2. **Uji Pencatatan Surat Masuk Pertama (Agenda Otomatis) (FR-013, FR-014):**
   - Atur tanggal terima: Hari ini.
   - Masukkan Nomor Surat Asal: `018/DEMA-U/UND/II/2026`.
   - Pilih Jenis: `Undangan`.
   - Pilih Pengirim: `Dewan Eksekutif Mahasiswa Universitas` (atau tekan `+ Pengirim Baru` jika belum ada).
   - Perihal: `Undangan Pembukaan Festival Budaya Mahasiswa`.
   - Bentuk Surat: `Softfile`.
   - Catatan: `Diterima melalui grup WhatsApp`.
   - Tekan **Simpan Surat Masuk**.
   - **Hasil:** Tersimpan dengan **Nomor Agenda: 1** secara otomatis.
3. **Uji Deteksi Surat Masuk Mirip & Pembaruan Bentuk (FR-016, FR-017):**
   - Tekan kembali **+ Catat Surat Masuk**.
   - Masukkan Nomor Asal yang sama: `018/DEMA-U/UND/II/2026` (bahkan dengan variasi huruf besar/kecil atau spasi).
   - Pilih Pengirim yang sama: `Dewan Eksekutif Mahasiswa Universitas`.
   - Pilih Bentuk: `Hardfile` (misal fisik surat baru diantar ke sekretariat).
   - Tekan **Simpan Surat Masuk**.
   - **Hasil:** Muncul dialog deteksi duplikasi:  
     *"Surat serupa terdeteksi! Ditemukan surat dengan nomor dan pengirim sama (Agenda #1, bentuk: Softfile)."*
   - Pilih opsi **Perbarui Menjadi Softfile & Hardfile**.
   - **Hasil:** Data Agenda #1 otomatis diperbarui bentuknya menjadi **Softfile & Hardfile** pada baris yang sama tanpa membuat nomor agenda ganda (FR-017).

---

### Skenario E: Pencarian, Filter Cepat, & Mode Offline
> **Kebutuhan yang Diuji:** FR-019, FR-020, FR-021, FR-022

1. **Uji Pembalikan Urutan Tanggal (FR-019):**
   - Pada tab **Masuk**, tekan tombol panah urutan (di sebelah kanan bilah pencarian).
   - **Hasil:** Urutan daftar langsung berbalik antara *Terbaru di atas (DESC)* dan *Terlama di atas (ASC)*.
2. **Uji Pencarian & Filter Cepat (FR-020, FR-021):**
   - Ketik `Festival` pada bilah pencarian -> hanya surat perihal festival yang muncul.
   - Buka tab **Keluar** -> pilih filter jenis `01 - Internal khusus` -> hanya surat keluar internal yang tampil.
3. **Uji Ketahanan Mode Offline (FR-022):**
   - Aktifkan **Mode Pesawat (Airplane Mode)** pada ponsel atau matikan Wi-Fi/Koneksi Internet.
   - Lakukan pull-to-refresh pada daftar surat keluar / masuk.
   - **Hasil:** Daftar surat tetap terbaca secara instan dari cache lokal `AsyncStorage`, disertai banner informasi:  
     *"Mode Offline: Menampilkan data tersimpan di perangkat. Memerlukan koneksi internet untuk memperbarui atau menambah surat."*
   - Coba tekan tombol Buat Surat -> aplikasi menampilkan pesan pencegahan: *"Aplikasi sedang offline. Penomoran surat memerlukan koneksi internet."*

---

### Skenario F: Ekspor Data ke File Excel (.xlsx) Bebas Biaya (100% Gratis)
> **Kebutuhan yang Diuji:** FR-023, FR-024, FR-025, FR-026

1. **Uji Ekspor Excel dari Beranda & Akun (FR-023, FR-024):**
   - Pada halaman **Beranda** atau tab **Akun**, tekan tombol **Unduh Rekap Excel (.xlsx)**.
   - **Hasil:** Aplikasi mengekstrak data langsung dari Supabase PostgreSQL secara real-time dan mengompilasi file Excel `.xlsx` multi-tab:
     - Sheet 1: **Surat Keluar** (No, Nomor Surat, Tanggal, Hal, Alamat, Jenis, Penandatangan, Format, Status).
     - Sheet 2: **Surat Masuk** (No, Tanggal Terima, Nomor Asal, Jenis, Pengirim, Perihal, Bentuk, Catatan).
   - Dialog berbagi native Android (`expo-sharing`) otomatis terbuka untuk menyimpan file ke perangkat atau membuka langsung di Microsoft Excel / Google Sheets / WPS Office.
2. **Uji Ekspor Arsip Periode Lampau (FR-025, FR-026):**
   - Buka tab **Arsip**, pilih periode kepengurusan lama (misal: Periode VIII).
   - Tekan tombol **Unduh Excel** pada banner periode.
   - **Hasil:** File Excel rekapitulasi surat periode lampau berhasil diunduh tanpa ketergantungan Google Cloud ataupun kartu kredit, menjamin operasional aplikasi **100% gratis selamanya**.

---

### Skenario G: Menu Administrator
> **Kebutuhan yang Diuji:** FR-027, FR-028, FR-029, FR-030

1. **Uji Proteksi Menu Admin (FR-029):**
   - Saat login sebagai sekretaris lembaga, rute `/admin` diblokir dan tab admin tidak tersedia.
2. **Uji Akses Admin & Pergantian Periode Aktif (FR-027):**
   - Keluar (*Logout*) dari akun sekretaris.
   - Masuk menggunakan akun admin: `admin@suratin.local` / `AdminSuratIn2026!`.
   - **Hasil:** Langsung diarahkan ke panel **Admin Dashboard**.
   - Buka menu **Kelola Periode Lembaga**.
   - Pilih lembaga `SEMA-F Syariah (S01)` -> tekan tombol **Ganti Periode Aktif**.
   - **Hasil:** Periode aktif berpindah secara atomik via RPC `admin_ganti_periode_aktif`.
3. **Uji Manajemen 67 Lembaga (FR-028):**
   - Buka menu **Kelola Lembaga & Kode**.
   - Ketik kode `M07` pada kolom pencarian -> muncul UKM Zenith.
   - Pengelola dapat menyunting nama, kode, atau menonaktifkan status lembaga.

---

## 3. Matriks Pemetaan Kebutuhan Fungsional (FR)

| Kebutuhan Fungsional | Deskripsi Singkat | Lokasi Pengujian di Naskah | Status |
| :--- | :--- | :--- | :--- |
| **FR-001** | Login akun lembaga & error generik | Skenario A (Langkah 1 & 2) | LULUS |
| **FR-002** | Pemilihan periode & label hanya-baca | Skenario A (Langkah 3) | LULUS |
| **FR-003** | Penolakan tulis pada periode arsip di DB | Skenario A (Langkah 3) | LULUS |
| **FR-004** | Isolasi data antarlembaga (RLS) | Skenario A (Audit & Skenario) | LULUS |
| **FR-005** | Surat keluar format lembaga | Skenario B (Langkah 1) | LULUS |
| **FR-006** | Surat keluar format kepanitiaan (mulai 02) | Skenario B (Langkah 3) | LULUS |
| **FR-007** | Pengelolaan kegiatan kepanitiaan | Skenario B (Langkah 2) | LULUS |
| **FR-008** | Pencegahan nomor ganda (atomic locking) | Skenario B (Langkah 1 & Test) | LULUS |
| **FR-009** | Edit surat keluar & hitung ulang nomor | Skenario C (Langkah 1) | LULUS |
| **FR-010** | Pembatalan surat keluar | Skenario C (Langkah 2) | LULUS |
| **FR-011** | Salin nomor surat ke papan klip | Skenario B (Langkah 1) | LULUS |
| **FR-012** | Pencatatan riwayat perubahan dasar | Skenario C (Langkah 1 & 2) | LULUS |
| **FR-013** | Pencatatan surat masuk | Skenario D (Langkah 2) | LULUS |
| **FR-014** | Nomor agenda surat masuk otomatis | Skenario D (Langkah 2) | LULUS |
| **FR-015** | Validasi tanggal terima zona server WIB | Skenario D (Langkah 1) | LULUS |
| **FR-016** | Deteksi surat masuk mirip | Skenario D (Langkah 3) | LULUS |
| **FR-017** | Pembaruan bentuk surat di baris yang sama | Skenario D (Langkah 3) | LULUS |
| **FR-018** | Edit surat masuk | Skenario D (Detail Masuk) | LULUS |
| **FR-019** | Urutan daftar surat masuk & toggle pembalikan | Skenario E (Langkah 1) | LULUS |
| **FR-020** | Daftar surat keluar dan masuk (20 item) | Skenario E (Langkah 2) | LULUS |
| **FR-021** | Pencarian teks dan filter jenis/bulan | Skenario E (Langkah 2) | LULUS |
| **FR-022** | Cache offline untuk membaca | Skenario E (Langkah 3) | LULUS |
| **FR-023** | Ekspor surat keluar ke format Excel (.xlsx) | Skenario F (Langkah 1) | LULUS |
| **FR-024** | Ekspor surat masuk ke format Excel (.xlsx) | Skenario F (Langkah 1) | LULUS |
| **FR-025** | Tab terpisah & format tabular rapi di Excel | Skenario F (Langkah 1 & 2) | LULUS |
| **FR-026** | Ekspor mandiri lokal (100% gratis tanpa GCP) | Skenario F (Langkah 1 & 2) | LULUS |
| **FR-027** | Admin kelola periode & ganti periode aktif | Skenario G (Langkah 2) | LULUS |
| **FR-028** | Admin kelola lembaga & 67 kode referensi | Skenario G (Langkah 3) | LULUS |
| **FR-029** | Admin kelola akun & proteksi menu | Skenario G (Langkah 1) | LULUS |
| **FR-030** | Admin kelola daftar referensi master | Skenario G (Langkah 3) | LULUS |

