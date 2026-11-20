# AI Software Engineering Blueprint — Aplikasi Sirkulasi Surat Masuk dan Keluar
### Dokumen Master untuk Membangun Aplikasi dengan Bantuan AI Coding Agent

**Versi 1.0 · Status: Draf siap pakai · 10 November 2026**
**Penyusun:** Nafila · Proyek Akhir Mata Kuliah Pemrograman Berbasis Platform (INF2528), Program Studi Informatika, UIN K.H. Abdurrahman Wahid Pekalongan

> Dokumen ini adalah **sumber kebenaran utama** proyek. Jika ada bagian yang tidak jelas atau bertanda `TBD`, **tanyakan dulu sebelum menulis kode**. Jangan menebak.

---

## Peta Struktur

```text
BAGIAN A — Fondasi Proyek          (1–4)
BAGIAN B — Requirements            (5–8)
BAGIAN C — Desain                  (9–10)
BAGIAN D — Arsitektur Teknis       (11–16)
BAGIAN E — Kualitas & Keamanan     (17–21)
BAGIAN F — Operasional             (22–25)
BAGIAN G — Cara AI Bekerja         (26–30)
LAMPIRAN — Aturan penomoran dan kode referensi
```

---

# BAGIAN A — Fondasi Proyek

## 1. Project Overview

- **Nama aplikasi (working title):** Aplikasi Sirkulasi Surat — nama final `TBD`
- **Masalah yang dipecahkan:** Penomoran dan pencatatan surat lembaga mahasiswa dilakukan manual di spreadsheet sehingga muncul nomor ganda, salah ketik kode (misalnya `MO7` huruf O, seharusnya `M07`), bulan dan tahun yang tidak ikut berubah saat tanggal diedit, serta pencatatan surat masuk yang tidak seragam (tanggal kosong, penulisan jenis dan pengirim bervariasi, surat tercatat dua kali).
- **Solusi yang diusulkan:** Aplikasi mobile yang membuat nomor surat keluar otomatis sesuai pedoman penomoran tanpa pernah ganda, mencatat surat masuk secara seragam, dan menyinkronkan semua data ke Google Sheets.
- **Kenapa dibangun sekarang:** Proyek akhir mata kuliah Pemrograman Berbasis Platform (Fase 2, pertemuan P09–P16), sekaligus kebutuhan nyata lembaga mahasiswa. Jadwal pasti `TBD` (ikuti jadwal dosen).
- **Target pengguna dan persona:**
  - **Sekretaris lembaga:** mahasiswa pengurus yang menerbitkan surat hampir setiap pekan, bekerja dari ponsel Android, sering dikejar waktu, belum hafal semua kode penomoran, dan berganti orang setiap periode kepengurusan.
  - **Admin aplikasi:** pengelola yang mengatur periode, lembaga, kode, dan akun.
- **Platform target:** Mobile lintas platform dengan React Native (Expo). Target rilis: **build Android release candidate**. iOS di luar target.
- **Kriteria sukses (terukur):**
  - 0 nomor ganda pada uji 100 permintaan beruntun dan uji permintaan bersamaan.
  - Nomor surat tampil kurang dari 5 detik setelah tombol Buat nomor ditekan.
  - Data surat tampil atau diperbarui di spreadsheet dalam 1 menit.
  - Percobaan membaca data lembaga lain atau mengubah data periode lama lewat API langsung **selalu ditolak** database.
  - Semua acceptance criteria di Bagian 5 dapat didemokan.

## 2. Scope & Constraints

### In-scope (MVP)
- Login akun lembaga, pemilihan periode, periode lama bersifat hanya baca.
- Pembuatan nomor surat keluar format **lembaga** dan format **kepanitiaan**.
- Pencegahan nomor ganda di database.
- Edit jenis surat, penandatangan, dan tanggal surat keluar; pembatalan surat; riwayat perubahan dasar.
- Pencatatan surat masuk dengan nomor urut otomatis, deteksi surat mirip, dan pembaruan bentuk surat.
- Daftar, pencarian, dan filter surat.
- Sinkronisasi ke Google Sheets.
- Menu admin sederhana (periode, lembaga, akun).
- Cache offline untuk **membaca** daftar surat terakhir.

### Out-of-scope / Non-Goals (JANGAN dibuat di MVP)
- Unggah file surat dan pembacaan otomatis (OCR atau ekstraksi teks) — lihat Bagian 16 dan Roadmap Fase 8.
- Disposisi surat dan notifikasi.
- Akun per orang dengan banyak peran.
- Tampilan riwayat perubahan yang lengkap (riwayat hanya **dicatat**).
- Ekspor PDF dan cetak.
- Pergantian periode otomatis berdasarkan tanggal.
- Pengelolaan nomor sertifikat (nomor urut 01 kepanitiaan dicadangkan, tidak dikelola aplikasi).
- Pembuatan nomor surat saat offline.
- iOS dan versi web.

### Batasan waktu, budget, dan teknologi
- Budget: **nol** — wajib memakai paket gratis (Supabase Free, Google Cloud/Sheets API gratis).
- Waktu: mengikuti jadwal perkuliahan P09–P16 (tanggal pasti `TBD`).
- Teknologi: React Native (Expo), TypeScript, Supabase, Google Sheets API (lihat Bagian 11).
- Solo developer dengan bantuan AI coding agent.

### Asumsi dan hal yang belum pasti (`TBD`)
- `TBD-1` Format kode lembaga di nomor surat: pedoman memakai akhiran `-Un` (misalnya `S04-Un`), sedangkan spreadsheet surat keluar yang ada menulis `M07` tanpa `-Un`. **Default: ikuti pedoman (kode + `-Un`)**, kode disimpan tanpa akhiran dan `-Un` ditambahkan otomatis. Perlu konfirmasi.
- `TBD-2` Buku surat masuk yang ada memiliki kolom di kanan kolom Keterangan yang isinya belum diketahui. Perlu dicek.
- `TBD-3` Cakupan edit surat masuk. **Default: semua kolom kecuali nomor urut, hanya di periode aktif.**
- `TBD-4` Siapa yang menjadi admin dan prosedur ganti password saat periode berganti.
- `TBD-5` Struktur spreadsheet: **Default: satu spreadsheet per lembaga**, tab terpisah untuk Surat Masuk, Surat Keluar Lembaga, dan satu tab per kegiatan kepanitiaan.
- `TBD-6` Apakah admin boleh membaca isi surat lembaga. **Default konservatif: tidak** (admin hanya mengelola data master dan akun).
- `TBD-7` Penghapusan data. **Default konservatif: tidak ada penghapusan di MVP.** Surat keluar hanya dibatalkan, surat masuk tidak dihapus.
- `TBD-8` Angka kuota dan batas Supabase Free serta Google Sheets API dicatat dari dokumentasi resmi saat uji coba.
- `TBD-9` Nama aplikasi, warna, dan identitas visual.

## 3. User Roles & Permission Matrix

Satu lembaga **hanya memiliki satu akun** yang dipakai turun-temurun antarperiode. Tidak ada peran Guest: seluruh fitur memerlukan login.

| Role | Fitur yang bisa diakses | Lihat data | Buat data | Ubah data | Hapus data |
|---|---|---|---|---|---|
| Sekretaris (akun lembaga) | Surat keluar, surat masuk, daftar dan cari, arsip periode, akun | Semua surat **lembaganya sendiri** di **semua periode** | Surat di **periode aktif** saja | Surat keluar: jenis, penandatangan, tanggal. Surat masuk: sesuai TBD-3. Hanya di periode aktif | Tidak ada (surat keluar hanya dibatalkan) |
| Admin | Menu admin: periode, lembaga, akun, daftar referensi | Data master dan akun. Isi surat lembaga: sesuai TBD-6 | Periode, lembaga, akun, referensi | Periode aktif tiap lembaga, kode, password akun | Tidak ada di MVP |

Aturan tegas:
- Sekretaris **tidak pernah** bisa melihat surat lembaga lain.
- Periode lama **hanya baca**, dijaga di database, bukan hanya dengan menyembunyikan tombol.
- Semua penulisan data dilakukan lewat **fungsi database (RPC)**, bukan insert atau update langsung dari klien.

## 4. User Flow

### Alur utama
```text
Login → Beranda → Buat surat keluar → Pilih format → (Pilih kegiatan) → Jenis surat + Penandatangan + Tanggal + Hal + Alamat → Pratinjau nomor → Buat nomor → Nomor tampil (tombol salin) → Tersinkron ke spreadsheet

Login → Beranda → Catat surat masuk → Isi form → Cek tanggal dan kemungkinan duplikat → Simpan → Nomor urut terbentuk → Tampil di daftar dan spreadsheet

Login → Detail surat keluar → Edit (jenis/penandatangan/tanggal) → Cek rentang periode → Simpan → Pemberitahuan nomor lama → nomor baru

Login → Arsip → Pilih periode lama → Daftar surat (hanya baca)

Admin → Kelola periode → Ganti periode aktif lembaga → Reset password akun
```

### Kondisi non-happy-path (wajib diimplementasikan)
- **Empty state:** belum ada surat di periode ini → tampilkan ajakan membuat surat pertama.
- **Loading state:** indikator saat memuat daftar dan saat membuat nomor.
- **Error state:** request gagal → pesan jelas berbahasa Indonesia, tombol coba lagi, tidak membocorkan detail teknis.
- **Unauthorized / sesi kedaluwarsa:** arahkan ke login tanpa menampilkan data.
- **Offline:** daftar terakhir tetap terbaca dari cache. Aksi tulis menampilkan pesan butuh koneksi.
- **Periode lama:** layar berlabel *Periode lama, hanya baca*, tombol buat, edit, dan batalkan tidak tampil.
- **Sinkronisasi gagal:** data tetap tersimpan, status sinkron ditandai, diulang otomatis.

---

# BAGIAN B — Requirements

## 5. Functional Requirements

```text
FR-001 — Login akun lembaga.
Acceptance Criteria:
- Setelah login, pengguna hanya melihat data lembaga akunnya
- Login gagal menampilkan pesan umum tanpa membocorkan apakah email atau password yang salah
- Periode aktif lembaga dimuat otomatis

FR-002 — Memilih periode.
Acceptance Criteria:
- Bawaan adalah periode aktif lembaga
- Periode lama menampilkan label hanya baca dan menyembunyikan tombol buat, edit, batalkan

FR-003 — Database menolak perubahan data periode lama.
Acceptance Criteria:
- Percobaan mengubah atau menambah data periode lama lewat API langsung ditolak database

FR-004 — Isolasi data antarlembaga.
Acceptance Criteria:
- Permintaan data lembaga lain lewat API langsung ditolak database (RLS)

FR-005 — Membuat nomor surat keluar format lembaga.
Acceptance Criteria:
- Pengguna hanya memilih jenis surat, penandatangan, dan tanggal
- Nomor tersusun sesuai format di Lampiran A.1
- Bulan (romawi) dan tahun diambil dari tanggal surat
- Tanggal harus berada di rentang periode aktif
- Nomor tampil dalam waktu kurang dari 5 detik

FR-006 — Membuat nomor surat keluar format kepanitiaan.
Acceptance Criteria:
- Nomor urut pertama setiap kegiatan adalah 02
- Penghitung terpisah per kegiatan
- Format sembilan bagian sesuai Lampiran A.1

FR-007 — Mengelola kegiatan kepanitiaan.
Acceptance Criteria:
- Pengguna dapat menambah kegiatan dengan singkatan (misalnya Pan-WK) dan nomor SK
- Singkatan unik per lembaga dan periode

FR-008 — Mencegah nomor ganda.
Acceptance Criteria:
- Dua permintaan bersamaan mendapat nomor berbeda
- Uji skrip 100 permintaan beruntun menghasilkan 100 nomor unik
- Pengaman kedua: aturan unik di database

FR-009 — Mengedit surat keluar.
Acceptance Criteria:
- Nomor urut, lembaga, dan periode tidak bisa diubah
- Jenis surat, penandatangan, dan tanggal bisa diubah, nomor lengkap disusun ulang otomatis
- Tanggal baru di periode lain ditolak
- Tanggal lebih awal dari surat sebelumnya diterima tanpa peringatan
- Setelah simpan, aplikasi menampilkan nomor lama dan nomor baru
- Perubahan tercatat di riwayat

FR-010 — Membatalkan surat keluar.
Acceptance Criteria:
- Status menjadi dibatalkan, surat tetap tampil di daftar
- Nomor tidak pernah dipakai ulang
- Baris di spreadsheet ikut ditandai

FR-011 — Detail surat dan salin nomor.
Acceptance Criteria:
- Tombol salin menyalin nomor lengkap ke papan klip

FR-012 — Riwayat perubahan dasar.
Acceptance Criteria:
- Setiap edit dan pembatalan tercatat: waktu, nilai lama, nilai baru

FR-013 — Mencatat surat masuk.
Acceptance Criteria:
- Form: tanggal terima, nomor surat asal (teks bebas), jenis (Undangan atau Pemberitahuan), pengirim, perihal, bentuk surat (Softfile, Hardfile, atau keduanya), catatan (opsional)
- Jenis surat dan pengirim dipilih dari daftar, pengirim baru dapat ditambahkan
- Data tersimpan dan muncul di daftar serta spreadsheet

FR-014 — Nomor urut (agenda) surat masuk otomatis.
Acceptance Criteria:
- Terpisah per lembaga, tidak ganda, kembali ke 01 pada periode baru

FR-015 — Validasi tanggal terima.
Acceptance Criteria:
- Wajib diisi
- Tidak boleh setelah hari ini, acuan waktu server zona WIB, diperiksa di layar dan di database
- Harus berada di rentang periode aktif

FR-016 — Deteksi surat masuk mirip.
Acceptance Criteria:
- Jika nomor surat asal dan pengirim sama dengan data yang ada (dibandingkan setelah dinormalisasi: huruf kecil, spasi berlebih dibuang), aplikasi menawarkan dua pilihan: perbarui bentuk surat pada data yang ada, atau simpan sebagai surat baru
- Aplikasi tidak menolak data yang mirip

FR-017 — Memperbarui bentuk surat masuk.
Acceptance Criteria:
- Satu surat tetap satu baris
- Bentuk berubah menjadi Softfile dan Hardfile pada baris yang sama
- Baris di spreadsheet ikut diperbarui, tidak menambah baris

FR-018 — Mengedit surat masuk.
Acceptance Criteria:
- Sesuai TBD-3, hanya di periode aktif, perubahan tercatat

FR-019 — Urutan daftar surat masuk.
Acceptance Criteria:
- Terurut menurut tanggal terima, bawaan terbaru di atas, dapat dibalik
- Tanggal sama diurutkan menurut waktu pencatatan
- Nomor urut yang sudah dibuat tidak pernah berubah

FR-020 — Daftar surat keluar dan masuk.
Acceptance Criteria:
- Menampilkan nomor, tanggal, hal atau perihal, dan status
- Paginasi 20 item per halaman

FR-021 — Pencarian dan filter.
Acceptance Criteria:
- Cari berdasarkan nomor, hal atau perihal, dan tanggal
- Filter menurut jenis dan bulan

FR-022 — Cache offline untuk membaca.
Acceptance Criteria:
- Tanpa internet, daftar surat terakhir tetap terbaca
- Aksi tulis menampilkan pesan butuh koneksi

FR-023 — Sinkronisasi surat keluar ke spreadsheet.
Acceptance Criteria:
- Surat baru, hasil edit, dan pembatalan tampil di spreadsheet dalam 1 menit
- Kolom: No, Nomor Surat, Tanggal Surat, Hal, Alamat Surat (ditambah Status dan ID tersembunyi)

FR-024 — Sinkronisasi surat masuk ke spreadsheet.
Acceptance Criteria:
- Kolom: No, Tanggal, Nomor Surat Asal, Jenis, Asal Surat, Perihal, Keterangan (Softfile atau Hardfile), Catatan (ditambah ID tersembunyi)

FR-025 — Edit memperbarui baris yang sama di spreadsheet.
Acceptance Criteria:
- Baris dicari lewat kolom ID surat yang tersembunyi, bukan nomor baris, agar tetap benar bila spreadsheet diurutkan manual
- Edit tidak menambah baris baru

FR-026 — Antrean dan pengulangan sinkronisasi.
Acceptance Criteria:
- Jika gagal (kuota, jaringan), data utama tetap aman dan sinkronisasi diulang otomatis dengan jeda bertahap

FR-027 — Admin mengelola periode.
Acceptance Criteria:
- Admin membuat periode per lembaga (kode romawi, tanggal mulai, tanggal selesai) dan mengganti periode aktif secara manual
- Hanya satu periode aktif per lembaga

FR-028 — Admin mengelola lembaga dan kode.
Acceptance Criteria:
- Admin menambah dan mengubah lembaga beserta kodenya

FR-029 — Admin mengelola akun.
Acceptance Criteria:
- Admin membuat akun lembaga dan mereset password
- Pengguna biasa tidak dapat membuka menu admin (ditolak di database)

FR-030 — Admin mengelola daftar referensi.
Acceptance Criteria:
- Jenis surat, penandatangan, dan daftar pengirim dapat dikelola
```

## 6. Non-Functional Requirements

- **Keamanan:** RLS aktif di semua tabel. Tulis data hanya lewat RPC. Validasi tanggal dan periode di database. Kredensial Google hanya di Edge Function. Kontrol dasar OWASP (Mobile dan API) diuji sebelum rilis.
- **Integritas data:** Pembuatan nomor dalam satu transaksi, dengan aturan unik sebagai pengaman kedua.
- **Performa:** Pembuatan nomor < 5 detik. Daftar surat tampil < 2 detik pada koneksi normal (`TBD` diukur saat uji). Sinkronisasi spreadsheet < 1 menit.
- **Keandalan:** Kegagalan sinkronisasi spreadsheet tidak boleh menghilangkan data.
- **Skalabilitas:** Awal: puluhan lembaga (daftar referensi berisi 67 lembaga) dengan ratusan surat per lembaga per periode. Target di atas itu `TBD`. Batas paket gratis dicatat saat uji.
- **Kompatibilitas:** Android (build release candidate).
- **Kepatuhan:** Data pribadi terbatas (nama pengirim, alamat surat). Terapkan minimisasi data sesuai prinsip UU Pelindungan Data Pribadi. Kebijakan formal `TBD`.
- **Keterlacakan:** Akun dipakai bersama, sehingga riwayat belum bisa menunjukkan siapa yang mengubah. Ini **batasan yang diterima** di MVP.

## 7. Feature Catalog

| ID | Fitur | Role | Prioritas |
|---|---|---|---|
| F-001 | Login akun lembaga, pilih periode | Sekretaris | Must |
| F-002 | Mode hanya baca periode lama (dijaga database) | Sekretaris | Must |
| F-003 | Buat nomor surat keluar format lembaga | Sekretaris | Must |
| F-004 | Buat nomor surat keluar format kepanitiaan dan kelola kegiatan | Sekretaris | Must |
| F-005 | Pencegahan nomor ganda | Sistem | Must |
| F-006 | Edit surat keluar (jenis, penandatangan, tanggal) | Sekretaris | Must |
| F-007 | Batalkan surat keluar | Sekretaris | Must |
| F-008 | Catat surat masuk, nomor urut otomatis, validasi tanggal | Sekretaris | Must |
| F-009 | Deteksi surat mirip dan perbarui bentuk surat | Sekretaris | Must |
| F-010 | Daftar, pencarian, urutan tanggal | Sekretaris | Must |
| F-011 | Sinkronisasi ke Google Sheets | Sistem | Must |
| F-012 | Menu admin (periode, lembaga, akun) | Admin | Must |
| F-013 | Riwayat perubahan dasar (dicatat) | Sistem | Should |
| F-014 | Salin nomor, filter jenis dan bulan | Sekretaris | Should |
| F-015 | Cache offline untuk membaca | Sekretaris | Should |
| F-016 | Edit surat masuk | Sekretaris | Should |
| F-017 | Kelola daftar referensi | Admin | Should |
| F-018 | Unggah file surat | Sekretaris | Could |
| F-019 | Baca otomatis PDF digital lalu isi form | Sekretaris | Won't (MVP), Fase 8 |
| F-020 | Baca otomatis foto atau scan (OCR) | Sekretaris | Won't (MVP), Fase 8 |
| F-021 | Disposisi, notifikasi, ekspor PDF, akun per orang | — | Won't |

## 8. Screen / Page Specification

Rute memakai Expo Router.

```text
Screen: /login
Purpose: Masuk dengan akun lembaga.
Components: Input email, input password, tombol Masuk, pesan error
States: Idle / Loading / Error

Screen: /(tabs)/index (Beranda)
Purpose: Ringkasan dan pintasan.
Components: Header (nama lembaga, label periode), tombol Buat surat keluar, tombol Catat surat masuk, daftar 5 surat terbaru
States: Loading / Loaded / Empty / Error / Periode lama (hanya baca)

Screen: /(tabs)/keluar
Purpose: Daftar surat keluar.
Components: Kolom pencarian, filter jenis dan bulan, daftar, tombol tambah
States: Loading / Loaded / Empty / Error / Offline (cache)

Screen: /(tabs)/keluar/buat
Purpose: Membuat nomor surat keluar.
Components: Pilihan format (Lembaga atau Kepanitiaan), pilihan kegiatan (jika kepanitiaan), jenis surat, penandatangan, tanggal, hal, alamat, kotak pratinjau nomor, tombol Buat nomor
States: Idle / Submitting / Success (nomor + tombol salin) / Error (tanggal di luar periode, koneksi)

Screen: /(tabs)/keluar/[id]
Purpose: Detail, edit, batalkan.
Components: Nomor lengkap + tombol salin, data surat, tombol Edit dan Batalkan (tersembunyi di periode lama), pemberitahuan perubahan nomor, status sinkron
States: Loading / Loaded / Editing / Dibatalkan / Error

Screen: /(tabs)/masuk
Purpose: Daftar surat masuk (terurut tanggal terima, terbaru di atas, dapat dibalik).
Components: Pencarian, filter, tombol balik urutan, daftar
States: Loading / Loaded / Empty / Error / Offline

Screen: /(tabs)/masuk/buat
Purpose: Mencatat surat masuk.
Components: Form sesuai FR-013, dialog surat mirip (Perbarui bentuk surat atau Simpan sebagai baru)
States: Idle / Submitting / Success / Error (validasi tanggal, duplikat)

Screen: /(tabs)/masuk/[id]
Purpose: Detail dan edit surat masuk.

Screen: /(tabs)/arsip
Purpose: Memilih periode lama dan melihat surat (hanya baca).

Screen: /(tabs)/akun
Purpose: Info lembaga, ganti password, keluar.

Screen: /admin/periode, /admin/lembaga, /admin/akun
Purpose: Menu admin (hanya terlihat dan dapat dipakai oleh peran admin).
```

---

# BAGIAN C — Desain

## 9. UI/UX Guidelines & Design System

- **Design philosophy:** Sederhana, cepat, fokus pada form. Pengguna ingin menyelesaikan tugas dalam beberapa ketukan.
- **Warna, tipografi, spacing, ikon:** `TBD-9`. Sampai ada keputusan, pakai satu warna utama, font sistem, dan set ikon bawaan (misalnya `@expo/vector-icons`).
- **Komponen:** tombol, input teks, pemilih tanggal, dropdown (daftar pilihan), kartu surat, dialog konfirmasi, toast untuk pemberitahuan, tab bawah.
- **Prinsip form:** kolom berulang (jenis surat, penandatangan, kode lembaga, pengirim) **dipilih dari daftar**, tidak boleh diketik bebas. Pratinjau nomor tampil sebelum menyimpan.
- **Label status wajib:** *Periode aktif*, *Periode lama, hanya baca*, *Dibatalkan*, *Tersinkron* atau *Menunggu sinkron*.
- **Bahasa:** seluruh teks antarmuka dan pesan error dalam Bahasa Indonesia.
- **Breakpoint:** fokus ponsel (< 640 px). Tablet `TBD`.
- **Dark mode:** tidak di MVP.

## 10. Accessibility

- Ukuran area ketuk minimal 44 × 44 titik.
- Label form yang jelas, pesan error di dekat kolom yang salah.
- Kontras warna memadai, status tidak hanya dibedakan dengan warna (selalu disertai teks).
- Dukungan pembaca layar dasar (`accessibilityLabel` pada tombol ikon).

---

# BAGIAN D — Arsitektur Teknis

## 11. Technology Stack

```text
Mobile   : React Native + Expo (SDK stabil terbaru yang kompatibel dengan Expo Go) + TypeScript + Expo Router
State    : React Context + hooks (versi sederhana, tanpa library tambahan di awal)
Cache    : expo-sqlite atau AsyncStorage untuk cache daftar (pilihan final TBD saat Fase 4)
Backend  : Supabase (PostgreSQL, Auth, Row Level Security, fungsi database/RPC, Edge Functions)
Sync     : Supabase Edge Function (TypeScript) -> Google Sheets API (service account)
Build    : EAS Build atau build lokal untuk Android (pilihan TBD)
Repo     : Git + GitHub
```

Catat versi pasti setiap dependency di Change Log saat proyek diinisialisasi. Jangan menambah dependency tanpa alasan jelas.

## 12. System Architecture

```text
Aplikasi Expo  ->  Supabase (Auth + RPC + tabel dengan RLS)
                          |
                          v
                 antrean_sinkron (tabel)
                          |
                          v
          Edge Function  ->  Google Sheets API
```

- **Pola API:** PostgREST bawaan Supabase untuk **membaca** (dengan RLS) dan **RPC** (fungsi database) untuk semua **penulisan**.
- **Alur autentikasi:** Supabase Auth (email dan password), JWT dikelola klien Supabase. Sesi disimpan di penyimpanan aman (`expo-secure-store`).
- **Keputusan inti:** semua keputusan penting (nomor, tanggal, akses periode) diambil di **database**. Aplikasi hanya menampilkan dan mengirim data.
- **Pembuatan nomor:** satu fungsi database dalam satu transaksi menaikkan penghitung lalu menyimpan surat. Jika terjadi bentrok, permintaan diulang dengan nomor berikutnya.
- **Sinkronisasi:** setiap penulisan memasukkan baris ke `antrean_sinkron`. Edge Function memproses antrean secara berkelompok (batch) dan mengulang bila gagal. Baris spreadsheet dicari lewat **kolom ID surat tersembunyi**.
- **Penyimpanan file:** tidak ada di MVP.

## 13. Database Design (ERD)

Catatan penting: **periode dimiliki oleh lembaga**, karena tiap lembaga punya penomoran periode sendiri (misalnya SEMA FEBI periode IX, UKM periode XXVI). Admin mengatur satu periode aktif per lembaga.

```text
Tabel: lembaga
- id              UUID, PK
- nama            TEXT
- kode            TEXT, UNIQUE      (tanpa akhiran, misalnya 'M07'; '-Un' ditambahkan saat menyusun nomor, lihat TBD-1)
- kategori        TEXT
- spreadsheet_id  TEXT NULLABLE
- aktif           BOOLEAN

Tabel: periode
- id              UUID, PK
- lembaga_id      UUID, FK -> lembaga
- kode_romawi     TEXT              (misalnya 'XXVI')
- tanggal_mulai   DATE
- tanggal_selesai DATE
- aktif           BOOLEAN
- UNIQUE (lembaga_id, kode_romawi)
- Hanya satu periode aktif per lembaga (partial unique index pada lembaga_id WHERE aktif)
- CHECK tanggal_mulai < tanggal_selesai

Tabel: profil
- user_id         UUID, PK, FK -> auth.users
- lembaga_id      UUID NULLABLE, FK -> lembaga    (kosong untuk admin)
- peran           ENUM('admin','lembaga')

Tabel: ref_jenis_surat
- kode            TEXT, PK          ('01'..'04')
- nama            TEXT

Tabel: ref_penandatangan
- kode            TEXT, PK          ('A-0','A-I',...,'E-0')
- nama            TEXT
- kelompok        ENUM('lembaga','kepanitiaan')

Tabel: kegiatan
- id              UUID, PK
- lembaga_id      UUID, FK
- periode_id      UUID, FK
- singkatan       TEXT              (misalnya 'Pan-WK')
- nomor_sk        TEXT              (misalnya '01')
- UNIQUE (lembaga_id, periode_id, singkatan)

Tabel: penghitung
- id              UUID, PK
- lembaga_id      UUID, FK
- periode_id      UUID, FK
- kegiatan_id     UUID NULLABLE, FK
- jenis           ENUM('keluar_lembaga','keluar_panitia','masuk')
- nomor_terakhir  INTEGER
- UNIQUE (lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, nilai nol UUID))
- Nilai awal: keluar_lembaga dan masuk mulai dari 1; keluar_panitia mulai dari 2

Tabel: surat_keluar
- id              UUID, PK
- lembaga_id      UUID, FK
- periode_id      UUID, FK
- kegiatan_id     UUID NULLABLE, FK
- format          ENUM('lembaga','kepanitiaan')
- nomor_urut      INTEGER
- jenis_surat     TEXT, FK -> ref_jenis_surat
- penandatangan   TEXT, FK -> ref_penandatangan
- tanggal         DATE
- hal             TEXT
- alamat          TEXT
- nomor_lengkap   TEXT
- status          ENUM('aktif','dibatalkan')
- dibuat_pada     TIMESTAMPTZ
- diubah_pada     TIMESTAMPTZ
- UNIQUE (lembaga_id, periode_id, format, COALESCE(kegiatan_id, nilai nol UUID), nomor_urut)
- UNIQUE (lembaga_id, nomor_lengkap)

Tabel: pengirim
- id              UUID, PK
- lembaga_id      UUID, FK
- nama            TEXT
- UNIQUE (lembaga_id, lower(nama))

Tabel: surat_masuk
- id              UUID, PK
- lembaga_id      UUID, FK
- periode_id      UUID, FK
- nomor_urut      INTEGER
- tanggal_terima  DATE
- nomor_asal      TEXT              (teks bebas)
- jenis           ENUM('undangan','pemberitahuan')
- pengirim_id     UUID, FK -> pengirim
- perihal         TEXT
- bentuk          ENUM('softfile','hardfile','softfile_hardfile')
- catatan         TEXT NULLABLE
- dicatat_pada    TIMESTAMPTZ
- UNIQUE (lembaga_id, periode_id, nomor_urut)

Tabel: riwayat_perubahan
- id              UUID, PK
- tabel           TEXT
- surat_id        UUID
- waktu           TIMESTAMPTZ
- diubah_oleh     UUID              (user_id akun)
- nilai_lama      JSONB
- nilai_baru      JSONB

Tabel: antrean_sinkron
- id              UUID, PK
- tabel           TEXT
- surat_id        UUID
- aksi            ENUM('tambah','perbarui','batalkan')
- status          ENUM('menunggu','berhasil','gagal')
- percobaan       INTEGER
- pesan_error     TEXT NULLABLE
- dibuat_pada     TIMESTAMPTZ
- diperbarui_pada TIMESTAMPTZ
```

### Fungsi database (RPC) — satu-satunya jalur penulisan

| Fungsi | Tugas |
|---|---|
| `buat_nomor_surat_keluar` | Validasi akses, periode aktif, tanggal di rentang periode. Naikkan penghitung (`INSERT ... ON CONFLICT DO UPDATE SET nomor_terakhir = nomor_terakhir + 1 RETURNING`), susun nomor, simpan surat, catat antrean sinkron |
| `edit_surat_keluar` | Ubah jenis, penandatangan, tanggal. Tolak tanggal di luar periode. Susun ulang nomor lengkap. Catat riwayat dan antrean sinkron. Kembalikan nomor lama dan baru |
| `batalkan_surat_keluar` | Ubah status menjadi dibatalkan, catat riwayat dan antrean sinkron |
| `buat_kegiatan` | Tambah kegiatan kepanitiaan |
| `cari_surat_masuk_mirip` | Cari kecocokan nomor asal dan pengirim (setelah normalisasi) |
| `catat_surat_masuk` | Validasi tanggal terima (tidak setelah hari ini WIB, di rentang periode aktif), naikkan penghitung, simpan, antrean sinkron |
| `perbarui_bentuk_surat_masuk` | Ubah bentuk surat pada baris yang sama |
| `edit_surat_masuk` | Sesuai TBD-3 |
| `admin_ganti_periode_aktif` | Hanya peran admin |
| `admin_*` | Kelola lembaga, akun, referensi (hanya admin) |

Acuan "hari ini": `(now() AT TIME ZONE 'Asia/Jakarta')::date`.

### Ringkasan RLS
- Semua tabel: RLS **aktif**. Hak `INSERT`, `UPDATE`, `DELETE` langsung untuk peran klien **dicabut**; penulisan hanya lewat RPC (`SECURITY DEFINER`, dengan `search_path` dibatasi).
- Sekretaris: `SELECT` hanya jika `lembaga_id` sama dengan lembaga di tabel `profil` miliknya.
- Admin: akses tabel master. Akses ke isi surat sesuai TBD-6.
- Setiap RPC memverifikasi `auth.uid()`, peran, lembaga, dan status periode aktif sebelum menulis.

## 14. API Specification

Semua pemanggilan lewat klien Supabase. Baca data dengan PostgREST, tulis lewat RPC.

### Membuat nomor surat keluar
```http
POST /rest/v1/rpc/buat_nomor_surat_keluar
```
Request:
```json
{
  "p_format": "lembaga",
  "p_kegiatan_id": null,
  "p_jenis_surat": "02",
  "p_penandatangan": "A-I",
  "p_tanggal": "2026-03-01",
  "p_hal": "Undangan rapat",
  "p_alamat": "Seluruh pengurus"
}
```
Response sukses (200):
```json
{
  "id": "uuid",
  "nomor_urut": 3,
  "nomor_lengkap": "03.M07-Un.XXVI.02.A-I.III.2026",
  "status": "aktif"
}
```
Response gagal:
```json
{ "code": "TANGGAL_DI_LUAR_PERIODE", "message": "Tanggal surat berada di luar periode kepengurusan aktif." }
```

### Mengedit surat keluar
```http
POST /rest/v1/rpc/edit_surat_keluar
```
Request:
```json
{ "p_id": "uuid", "p_jenis_surat": "03", "p_penandatangan": "A-I", "p_tanggal": "2026-04-05" }
```
Response sukses (200):
```json
{
  "id": "uuid",
  "nomor_lama": "03.M07-Un.XXVI.02.A-I.III.2026",
  "nomor_baru": "03.M07-Un.XXVI.03.A-I.IV.2026"
}
```

### Mencatat surat masuk
```http
POST /rest/v1/rpc/catat_surat_masuk
```
Request:
```json
{
  "p_tanggal_terima": "2026-06-03",
  "p_nomor_asal": "17.S04-Un.IX.02.A-I.V.2026",
  "p_jenis": "undangan",
  "p_pengirim_id": "uuid",
  "p_perihal": "Dialog Publik Identitas",
  "p_bentuk": "softfile",
  "p_catatan": null,
  "p_paksa_baru": false
}
```
Response sukses (200):
```json
{ "id": "uuid", "nomor_urut": 15 }
```
Response jika ada surat mirip dan `p_paksa_baru` bernilai `false` (409):
```json
{ "code": "SURAT_MIRIP", "kandidat": [{ "id": "uuid", "nomor_urut": 9, "bentuk": "softfile" }] }
```

### Kode error yang konsisten
`TIDAK_TERAUTENTIKASI`, `TIDAK_BERHAK`, `PERIODE_TIDAK_AKTIF`, `TANGGAL_DI_LUAR_PERIODE`, `TANGGAL_SETELAH_HARI_INI`, `NOMOR_BENTROK`, `SURAT_MIRIP`, `DATA_TIDAK_VALID`.

### Membaca data
- Daftar: urutan surat keluar menurut `nomor_urut`, surat masuk menurut `tanggal_terima DESC, dicatat_pada DESC`.
- Paginasi: `range` 20 item per halaman.
- Filter: jenis dan bulan. Pencarian: nomor, hal atau perihal, tanggal.

## 15. State Management (Frontend)

- **Global (Context):** sesi pengguna, profil (lembaga dan peran), periode yang sedang dibuka, status koneksi.
- **Lokal per layar:** isian form, status loading, error.
- **Data server:** diambil per layar dengan hook; hasil daftar terakhir disimpan di cache lokal untuk mode offline.
- Aturan: aplikasi **tidak pernah** menghitung nomor surat. Nomor selalu berasal dari database.

## 16. Spesifikasi Fitur AI

**MVP tidak memakai fitur AI.** Bagian ini mencatat rencana pengembangan (Fase 8) agar tidak dibangun sebelum waktunya.

- **Tujuan:** pengguna mengunggah surat masuk (PDF digital dari WhatsApp atau email, serta foto atau scan surat cetak), aplikasi mengisi form, **pengguna memeriksa dan mengonfirmasi**, baru disimpan. Tidak ada penyimpanan otomatis tanpa konfirmasi.
- **Tahap:** 2 = unggah dan lampirkan file. 3a = baca PDF digital (ambil teks, urai nomor surat). 3b = foto dan scan (OCR) dengan konfirmasi lebih ketat.
- **Ide penguraian:** nomor surat lembaga mahasiswa berpola tetap, sehingga kode lembaga pengirim bisa diurai langsung tanpa AI rumit. Surat dari luar kampus (format bebas) tetap perlu pembacaan teks biasa atau isi manual.
- **Structured output:** hasil pembacaan wajib berupa JSON dengan skema tetap dan divalidasi sebelum mengisi form. Output bebas tidak boleh langsung dipakai sistem.
- **Prompt injection:** isi surat adalah data tidak terpercaya. Jangan pernah menjalankan instruksi yang ada di dalam isi surat.
- **Retry dan fallback:** jika pembacaan gagal, form tetap bisa diisi manual.
- **Privasi:** surat bisa memuat data pribadi. Syarat layanan, cara pemrosesan, dan lokasi data layanan pihak ketiga harus dievaluasi sebelum dipakai.
- **Keamanan kunci:** pemanggilan layanan hanya lewat Edge Function, tidak dari aplikasi.
- **Due diligence yang perlu dilakukan:** akurasi pada contoh surat nyata, batas dan biaya layanan, privasi, penyimpanan file dengan aturan akses per lembaga.
- Semua detail lain: `TBD`. **Jangan implementasikan sebelum MVP selesai dan disetujui.**

---

# BAGIAN E — Kualitas & Keamanan

## 17. Security Requirements

Anggap semua input pengguna **tidak terpercaya**.

- RLS aktif di **semua** tabel dan diuji.
- Klien **tidak punya hak tulis langsung** ke tabel. Semua penulisan lewat RPC yang memverifikasi `auth.uid()`, peran, lembaga, dan periode aktif.
- Validasi di klien **dan** di database (tanggal, periode, panjang teks, nilai enum).
- Waktu acuan "hari ini" adalah waktu server (WIB), bukan jam ponsel.
- Kunci `service role` dan kredensial service account Google **tidak pernah** ada di aplikasi, di repositori, atau di log.
- Kunci publik (anon atau publishable) boleh ada di aplikasi karena dilindungi RLS.
- Rahasia disimpan di variabel lingkungan Edge Function.
- Sesi disimpan di penyimpanan aman perangkat.
- Rate limiting: manfaatkan pembatasan bawaan Supabase Auth untuk login. Pembatasan tambahan pada RPC `TBD`.
- Password: ganti atau reset saat pergantian periode. Syarat password kuat.
- Fungsi `SECURITY DEFINER` memakai `search_path` yang dibatasi dan hanya memakai parameter terikat (tanpa menyusun SQL dari string).
- HTTPS untuk semua komunikasi (bawaan Supabase dan Google).
- Audit: riwayat perubahan surat dicatat.
- Pengujian OWASP dasar sebelum rilis (akses data lembaga lain, penulisan ke periode lama lewat API langsung, manipulasi jam ponsel, injeksi pada kolom teks).

## 18. Privacy & Data Protection

- **Data yang dikumpulkan:** email akun lembaga, nama pengirim surat, alamat surat, perihal, nomor surat. Tidak ada data yang tergolong sangat sensitif di MVP.
- **Retensi:** arsip semua periode disimpan selama aplikasi dipakai. Kebijakan penghapusan `TBD` (default: tidak ada penghapusan di MVP).
- **Pihak ketiga:** Supabase (penyimpanan utama) dan Google (spreadsheet). Tidak ada pihak ketiga lain di MVP.
- **Kebijakan log:** jangan mencatat password, token, atau isi lengkap perihal dan alamat di log.

## 19. Error Handling Standard

```text
400 → Permintaan tidak valid        403 → Tidak berhak (periode lama, lembaga lain)
401 → Belum login / sesi habis      409 → Konflik (nomor bentrok, surat mirip)
404 → Data tidak ditemukan          422 → Validasi gagal (tanggal, kolom wajib)
429 → Terlalu banyak permintaan     500 → Kesalahan server
```
Aturan wajib:
- Pesan ke pengguna berbahasa Indonesia, jelas, dan **tidak membocorkan** detail teknis (stack trace, nama tabel).
- Kegagalan sinkronisasi ke spreadsheet **tidak** menggagalkan pembuatan surat; tampilkan status sinkron.
- Nomor dianggap jadi hanya jika sudah tersimpan di database.

## 20. Testing Strategy

- **Unit test:** fungsi penyusun nomor, konversi bulan ke romawi, normalisasi nomor asal untuk deteksi mirip, validasi tanggal.
- **Pengujian database (inti):**
  - Skrip 100 pembuatan nomor beruntun → 100 nomor unik.
  - Pembuatan nomor bersamaan (paralel) → tidak ada nomor ganda.
  - Penghitung terpisah per lembaga, per periode, dan per kegiatan; kepanitiaan mulai dari 02; surat lembaga dan surat masuk mulai dari 01.
  - RLS: akun lembaga A tidak bisa membaca data lembaga B.
  - Periode lama: penulisan ditolak.
  - Tanggal di luar periode dan tanggal terima setelah hari ini ditolak.
  - Edit tanggal menyusun ulang bulan dan tahun, nomor urut tetap.
- **Integrasi:** alur membuat, mengedit, membatalkan surat dan mencatat surat masuk sampai tampil di spreadsheet (uji manual dengan spreadsheet uji).
- **Uji manual end-to-end:** skenario demo sesuai acceptance criteria.
- **Target:** cakupan minimal 80% untuk logika inti (penyusun nomor dan validasi). Setiap FR punya minimal satu uji penerimaan.

## 21. Quality Gates / Definition of Done

```text
Sebuah fitur dianggap SELESAI apabila:
[ ] Requirement dan acceptance criteria (Bagian 5) terpenuhi
[ ] Validasi input dan error handling ada (klien dan database)
[ ] Penulisan hanya lewat RPC, RLS diuji
[ ] Type checking dan linter lulus
[ ] Test terkait lulus
[ ] Tidak ada celah keamanan kritis (secret tidak ter-expose, akses lintas lembaga dan periode lama ditolak)
[ ] Tampilan punya loading, empty, error, dan offline state
[ ] Tidak ada console error
[ ] Dokumentasi terkait diperbarui
[ ] Change Log diperbarui
```

---

# BAGIAN F — Operasional (versi ringkas untuk proyek kuliah)

## 22. Environment Configuration

- Environment: **development** dan **production** (staging `TBD`, boleh digabung dengan development untuk proyek kuliah).
- Variabel di aplikasi: URL proyek dan kunci publik Supabase (`EXPO_PUBLIC_*`). **Tidak ada rahasia** di variabel aplikasi.
- Rahasia (kredensial service account Google) hanya di pengaturan rahasia Edge Function.
- File `.env` masuk `.gitignore`. Sediakan `.env.example` tanpa nilai asli.
- Mode debug hanya aktif di development.

## 23. Deployment & CI/CD

- Skema database dan fungsi disimpan sebagai **file migrasi SQL** di repositori (`supabase/migrations`), dijalankan berurutan. Siapkan skrip pembatalan untuk tiap migrasi besar.
- CI sederhana (GitHub Actions): jalankan linter, type check, dan unit test saat push.
- Build Android release candidate (AAB atau APK) di Fase 7.
- Strategi rollback: kembali ke commit sebelumnya dan jalankan migrasi pembatalan.

## 24. Observability (Logging & Monitoring)

- Format log: `[TIMESTAMP] - [LEVEL] - [MESSAGE]`.
- Pantau status antrean sinkron (`menunggu`, `berhasil`, `gagal`, jumlah percobaan).
- Edge Function menyediakan endpoint pemeriksaan kondisi sederhana.
- Jangan mencatat data sensitif (lihat Bagian 18).

## 25. Documentation Requirements

```text
README.md        ARCHITECTURE.md     API.md
DATABASE.md      SECURITY.md         DEPLOYMENT.md
CHANGELOG.md     docs/due-diligence.md  (bukti uji Supabase dan Google Sheets)
```

---

# BAGIAN G — Cara AI Bekerja

## 26. AI Operating Rules

```text
1.  Jangan mengarang requirement yang tidak ada di dokumen ini.
2.  Jangan mengubah arsitektur tanpa alasan yang dijelaskan.
3.  Jangan menghapus fungsionalitas yang sudah ada tanpa persetujuan eksplisit.
4.  Jangan pernah menaruh secret/API key (termasuk service role Supabase dan kredensial Google) di source code atau di aplikasi mobile.
5.  Jangan menambah dependency baru tanpa alasan jelas — cek dulu apakah sudah tersedia.
6.  Jangan anggap tugas selesai hanya karena kode berhasil di-build/dijalankan.
7.  Selalu validasi input dan tangani error di setiap fitur.
8.  Selalu pertimbangkan aspek keamanan sebelum aspek "terlihat berfungsi".
9.  Ketika requirement ambigu atau bertanda TBD, tandai sebagai ambiguitas dan ambil keputusan paling konservatif — jangan menebak diam-diam.
10. Setelah implementasi, lakukan self-review terhadap Quality Gates (Bagian 21).
11. Laporkan file yang diubah dan risiko yang masih tersisa di akhir setiap tahap.

Aturan khusus proyek ini:
12. Nomor surat HANYA dibuat di database. Jangan pernah menghitung atau menyusun nomor final di aplikasi.
13. Klien tidak boleh menulis langsung ke tabel. Semua penulisan lewat RPC.
14. Jangan mengubah aturan penomoran (Lampiran A) tanpa persetujuan eksplisit.
15. Nomor urut tidak pernah dipakai ulang dan tidak pernah dapat diedit setelah surat terbit.
16. Pembatasan periode lama harus dijaga di database, bukan hanya dengan menyembunyikan tombol.
17. Jangan mengerjakan fitur Won't (Bagian 7), termasuk pembacaan otomatis surat, sebelum MVP selesai dan disetujui.
18. Jangan membuat spreadsheet menjadi sumber data utama. Supabase adalah sumber kebenaran, spreadsheet hanya salinan.
```

## 27. AI Execution Protocol

```text
STEP 1  — Pahami requirement yang relevan dari dokumen ini
STEP 2  — Periksa kode/struktur yang sudah ada (jika proyek lanjutan)
STEP 3  — Identifikasi dependency yang dibutuhkan
STEP 4  — Buat rencana implementasi singkat, sampaikan untuk direview
STEP 5  — Implementasi sesuai rencana yang disetujui
STEP 6  — Jalankan test yang relevan
STEP 7  — Periksa ulang terhadap checklist keamanan (Bagian 17)
STEP 8  — Cocokkan dengan Quality Gates (Bagian 21)
STEP 9  — Perbaiki masalah yang ditemukan
STEP 10 — Laporkan perubahan yang dibuat dan hal yang masih perlu diperhatikan
```

## 28. Development Roadmap (Fase Pengerjaan)

Urutan dimulai dari **hal paling berisiko**: nomor tidak ganda dan sinkronisasi spreadsheet.

```text
Fase 0 — Uji kelayakan (due diligence), sejalan dengan P09
         - Proyek Supabase, tabel contoh, panggil lewat REST, catat bentuk JSON
         - Skrip 100 pembuatan nomor beruntun dan paralel
         - Uji tambah dan perbarui satu baris di Google Sheets, catat waktu dan kuota
         - Simpan bukti di docs/due-diligence.md

Fase 1 — Fondasi dan skema database (P10)
         - Migrasi tabel, indeks unik, data referensi (kode lembaga, jenis surat, penandatangan)
         - Fungsi pembuat nomor dan penghitung

Fase 2 — Autentikasi, RLS, dan peran admin (P11)
         - Login, profil, RLS, pencabutan hak tulis langsung, menu admin dasar

Fase 3 — Surat keluar (P12)
         - Buat nomor (lembaga dan kepanitiaan), edit, batalkan, riwayat dasar

Fase 4 — Surat masuk, daftar, pencarian, cache offline (P13)

Fase 5 — Sinkronisasi ke Google Sheets (P14)
         - Antrean, Edge Function, pengulangan, kolom ID tersembunyi

Fase 6 — Pengujian menyeluruh dan hardening keamanan OWASP (P15)

Fase 7 — Build Android release candidate dan demo (P16)

Fase 8 — Pengembangan lanjutan (SETELAH MVP disetujui)
         - Unggah file, baca otomatis PDF digital, OCR foto dan scan (lihat Bagian 16)
```

Jangan minta semua fase sekaligus. Selesaikan dan review satu fase sebelum lanjut.

## 29. Git & Version Control Workflow

```text
Branch : main (stabil), feature/*, fix/*, refactor/*
Commit : feat:, fix:, refactor:, test:, docs:, chore:
```
- Satu fitur per branch, digabung ke `main` setelah lulus Quality Gates.
- Tinjau perubahan sendiri sebelum menggabungkan (self-review terhadap Bagian 21).
- Rollback: kembali ke commit atau tag sebelumnya dan jalankan migrasi pembatalan jika ada perubahan skema.
- Jangan pernah meng-commit `.env`, kunci, atau kredensial.

## 30. Change Log

```text
[10-11-2026] — Dokumen dibuat dari PRD proyek akhir dan keputusan selama perancangan — Fondasi untuk AI coding agent

Keputusan yang sudah diambil:
[10-11-2026] — Penghitung nomor terpisah per lembaga dan per periode; kepanitiaan terpisah per kegiatan dan mulai dari 02 (01 dicadangkan untuk sertifikat) — Sesuai praktik lembaga
[10-11-2026] — Nomor ganda dilarang dan dicegah di database — Masalah utama pada pencatatan manual
[10-11-2026] — Satu lembaga satu akun turun-temurun; periode lama hanya baca; periode aktif diganti manual oleh admin — Menyederhanakan akses dan pergantian pengurus
[10-11-2026] — Edit surat keluar: nomor urut dikunci; jenis, penandatangan, tanggal boleh diubah; tanggal di periode lain ditolak; tanggal lebih awal tanpa peringatan — Kebutuhan koreksi yang sering terjadi
[10-11-2026] — Surat masuk: satu surat satu baris, bentuk surat diperbarui di baris yang sama, deteksi surat mirip hanya menawarkan pilihan, tanggal terima tidak boleh setelah hari ini, daftar terurut tanggal terima, nomor urut reset tiap periode — Sesuai praktik buku surat masuk
[10-11-2026] — Kode lembaga mengikuti Lampiran I pedoman dengan pengecualian P22, P23, P24 mengikuti tabel yang berlaku di praktik — Konfirmasi pemilik proyek
[10-11-2026] — Pembacaan otomatis surat masuk dijadikan rencana pengembangan (Fase 8), bukan MVP — Menjaga cakupan realistis
[10-11-2026] — Model data: periode dimiliki lembaga (bukan global), karena tiap lembaga punya penomoran periode sendiri — Koreksi dari PRD sebelumnya

Catatan Implementasi dan Rilis:
[11-11-2026] — Fase 0 & 1 SELESAI: Setup Expo SDK 58, 12 tabel database, RLS aktif, RPC penomoran atomik, seed 67 lembaga, tes 100 nomor beruntun bebas bentrok, dokumen due diligence.
[12-11-2026] — Fase 2 SELESAI: Autentikasi sesi Supabase, profil lembaga, mode periode arsip hanya-baca, navigasi 5 tab utama, dan menu admin kelola periode & lembaga.
[13-11-2026] — Fase 3 SELESAI: Modul surat keluar lengkap (format lembaga & kepanitiaan mulai 02, live preview, salin nomor, edit hitung ulang otomatis, pembatalan dan audit trail).
[14-11-2026] — Fase 4 SELESAI: Modul surat masuk lengkap (agenda otomatis, validasi tanggal WIB server, deteksi surat mirip & opsi perbarui bentuk, toggle urutan tanggal, offline cache AsyncStorage).
[15-11-2026] — Fase 5 SELESAI: Sinkronisasi Google Sheets via Deno Edge Function (RS256 JWT, antrean sinkron, retry exponential backoff, kunci pencarian ID tersembunyi, badge status real-time).
[16-11-2026] — Fase 6 SELESAI: Unit testing 7/7 lulus, 10 skenario uji keamanan/integritas database, dokumen audit kepatuhan OWASP MASVS v2 & API Top 10 (2023).
[16-11-2026] — Fase 7 SELESAI: Konfigurasi Android Release Candidate (com.nafila.suratin), profil build eas.json (preview APK), naskah panduan demo 30 FR (docs/demo-guide.md), dan README master. MVP siap didemokan untuk evaluasi P16.
[20-11-2026] — Penyesuaian Ekspor Excel Bebas Biaya (100% Gratis): Mengganti ketergantungan Google Sheets API/GCP dengan fitur ekspor lokal file Excel (.xlsx) multi-sheet menggunakan SheetJS dan native sharing Android, menjamin aplikasi 100% gratis tanpa kartu kredit.
```

---

# LAMPIRAN A — Aturan Penomoran dan Kode Referensi

## A.1 Format nomor surat

| Jenis | Format | Contoh |
|---|---|---|
| Surat lembaga | `NN.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun` | `01.S04-Un.IX.01.A-0.II.2026` |
| Surat kepanitiaan | `NN.Pan-XX.NomorSK.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun` | `01.Pan-SR.02.S04-Un.IX.01.E-II.II.2026` |

- `NN`: nomor urut dua angka (lebih dari 99 tetap ditulis penuh, perilaku `TBD`).
- `Kode-Un`: kode lembaga + akhiran nama kampus (`TBD-1`).
- Bulan ditulis angka romawi (I sampai XII), bulan dan tahun diambil dari **tanggal surat**.
- Contoh dari data nyata (kepanitiaan): `02.Pan-WK.01.M07.XXVI.03.E-II.III.2026`.

## A.2 Aturan penghitung

| Aturan | Keputusan |
|---|---|
| Surat lembaga | Terpisah per lembaga dan periode, mulai dari 01 |
| Surat kepanitiaan | Terpisah per kegiatan, mulai dari 02 |
| Surat masuk | Nomor urut otomatis, terpisah per lembaga dan periode, mulai dari 01 |
| Pergantian bulan | Penghitung **tidak** direset |
| Pergantian periode | Penghitung kembali ke awal |
| Nomor surat dibatalkan | Tetap tercatat, tidak dipakai ulang |

## A.3 Jenis surat

| Kode | Jenis |
|---|---|
| 01 | Internal khusus (surat keputusan, undangan pengurus, surat peringatan, sertifikat, untuk internal lembaga sendiri) |
| 02 | Internal umum (undangan dan pemberitahuan ke lembaga lain di lingkup internal PM UIN K.H. Abdurrahman Wahid Pekalongan) |
| 03 | Eksternal khusus (rekomendasi, permohonan audiensi dengan pejabat kampus, untuk lembaga di luar PM tetapi masih di kampus) |
| 04 | Eksternal umum (permohonan audiensi dengan pemerintah daerah, perizinan, untuk umum di luar PM) |

## A.4 Penandatangan

| Kode | Penandatangan |
|---|---|
| A-0 | Ketua |
| A-I | Ketua dan Sekretaris |
| A-II | Ketua dan Wakil Sekretaris |
| B-I | Wakil Ketua dan Sekretaris |
| B-II | Wakil Ketua dan Wakil Sekretaris |
| C-I | Ketua dan Menteri, Komisi, Bidang, Departemen, atau Divisi |
| C-II | Wakil Ketua dan Menteri, Komisi, Bidang, Departemen, atau Divisi |
| C-III | Ketua, Sekretaris, dan Menteri, Komisi, Bidang, Departemen, atau Divisi |
| D-I | Ketua, Sekretaris, dan Bendahara atau Wakil Bendahara |
| D-II | Ketua, Wakil Sekretaris, dan Bendahara atau Wakil Bendahara |
| E-I | Ketua OC dan Sekretaris OC (kepanitiaan) |
| E-II | Ketua OC, Sekretaris OC, dan Ketua Umum (kepanitiaan) |
| E-0 | Ketua OC dan Ketua Lembaga (surat kepanitiaan dan sertifikat) |

## A.5 Kode lembaga (data awal)

Sumber: Lampiran I pedoman PM UIN K.H. Abdurrahman Wahid Pekalongan, dengan **pengecualian P22, P23, P24 yang mengikuti tabel yang berlaku di praktik**. Daftar yang terlihat berhenti di nomor 67 (jika ada lanjutan: `TBD`). Kode disimpan tanpa akhiran `-Un`.

| Kode | Lembaga | Kategori |
|---|---|---|
| S00 | Senat Mahasiswa Universitas | Universitas |
| D00 | Dewan Eksekutif Mahasiswa Universitas | Universitas |
| S01 | SEMA-F Syariah | Senat Fakultas |
| S02 | SEMA-F Tarbiyah dan Ilmu Keguruan | Senat Fakultas |
| S03 | SEMA-F Ushuluddin Adab dan Dakwah | Senat Fakultas |
| S04 | SEMA-F Ekonomi dan Bisnis Islam | Senat Fakultas |
| D01 | DEMA-F Syariah | DEMA Fakultas |
| D02 | DEMA-F Tarbiyah dan Ilmu Keguruan | DEMA Fakultas |
| D03 | DEMA-F Ushuluddin Adab dan Dakwah | DEMA Fakultas |
| D04 | DEMA-F Ekonomi dan Bisnis Islam | DEMA Fakultas |
| P01 | HMPS Hukum Keluarga Islam | HMPS |
| P02 | HMPS Hukum Ekonomi Syariah | HMPS |
| P03 | HMPS Hukum Tata Negara | HMPS |
| P04 | HMPS Hukum Bisnis | HMPS |
| P05 | HMPS Pendidikan Agama Islam | HMPS |
| P06 | HMPS Pendidikan Bahasa Arab | HMPS |
| P07 | HMPS Pendidikan Guru Madrasah Ibtidaiyah | HMPS |
| P08 | HMPS Pendidikan Islam Anak Usia Dini | HMPS |
| P09 | HMPS Tadris Bahasa Inggris | HMPS |
| P10 | HMPS Tadris Matematika | HMPS |
| P11 | HMPS Tadris Bahasa Indonesia | HMPS |
| P12 | HMPS Pendidikan Ilmu Pengetahuan Alam | HMPS |
| P13 | HMPS Ilmu Al-Qur’an dan Tafsir | HMPS |
| P14 | HMPS Ilmu Hadis | HMPS |
| P15 | HMPS Tasawuf dan Psikoterapi | HMPS |
| P16 | HMPS Komunikasi dan Penyiaran Islam | HMPS |
| P17 | HMPS Bimbingan Penyuluhan Islam | HMPS |
| P18 | HMPS Manajemen Dakwah | HMPS |
| P19 | HMPS Ekonomi Syariah | HMPS |
| P20 | HMPS Akuntansi Syariah | HMPS |
| P21 | HMPS Perbankan Syariah | HMPS |
| P22 | HMPS Sains Data | HMPS |
| P23 | HMPS Bisnis Digital | HMPS |
| P24 | HMPS Informatika | HMPS |
| P25 | HMPS Gizi | HMPS |
| P26 | HMPS Teknik | HMPS |
| M01 | UKM SPEAC | UKM |
| M02 | UKM Gemalawa | UKM |
| M03 | UKM Kordais Nusa | UKM |
| M04 | UKM El-Fata | UKM |
| M05 | UKM LPTQ | UKM |
| M06 | UKM Sport | UKM |
| M07 | UKM Zenith | UKM |
| M08 | UKM Sigma | UKM |
| M09 | UKM Al-Mizan | UKM |
| M10 | UKM Navi Film | UKM |
| M11 | UKM Beladiri | UKM |
| M12 | UKM Hafilah | UKM |
| M13 | UKM Kaligrafi | UKM |
| K01 | UKK Racana | UKK |
| K02 | UKK MENWA | UKK |
| K03 | UKK KSR PMI | UKK |
| K04 | UKK KOPMA | UKK |
| MFS01 | KSM-F Qiroatul Kutub | UKM-F Syariah |
| MFS02 | KSM-F Peradilan Semu | UKM-F Syariah |
| MFS03 | KSM-F Debat Hkum | UKM-F Syariah |
| MFS04 | KSM-F Karya Tulis Ilmiah | UKM-F Syariah |
| MFE01 | KSM-F Dycres | UKM-F Ekonomi dan Bisnis Islam |
| MFE02 | KSM-F KSPMS | UKM-F Ekonomi dan Bisnis Islam |
| MFE03 | KSM-F Kewirausahaan | UKM-F Ekonomi dan Bisnis Islam |
| MFE04 | KSM-F Dustur Halal | UKM-F Ekonomi dan Bisnis Islam |
| MFU01 | KSM-F Narashakti | UKM-F Ushuluddin Adab dan Dakwah |
| MFU02 | KSM-F Tazkisoul | UKM-F Ushuluddin Adab dan Dakwah |
| MFU03 | KSM-F Tsiqoh | UKM-F Ushuluddin Adab dan Dakwah |
| MFU04 | UKM-F Al-Qolam | UKM-F Ushuluddin Adab dan Dakwah |
| MFU05 | UKM-F ACTA | UKM-F Ushuluddin Adab dan Dakwah |
| MFT01 | UKM-F Literasi | UKM-F Tarbiyah dan Ilmu Keguruan |

Catatan: satu surat masuk di buku yang ada menulis kode `P27` untuk HMPS Gizi, padahal kode yang berlaku `P25`. Dianggap salah ketik pada data lama.

---

## Cara Memakai Dokumen Ini dengan AI

1. Upload dokumen ini **utuh** di awal sesi. Katakan: *"Jadikan dokumen ini sumber kebenaran utama proyek. Jika ada bagian yang tidak jelas atau bertanda TBD, tanyakan ke saya sebelum menulis kode."*
2. Kerjakan **bertahap** sesuai Roadmap (Bagian 28), mulai dari Fase 0.
3. Minta **rencana dulu sebelum kode** (Bagian 27, Step 4).
4. **Review tiap fitur** satu per satu sebelum lanjut.
5. Minta **review keamanan eksplisit** setelah tiap fitur selesai.
6. **Perbarui Change Log** (Bagian 30) setiap ada keputusan baru.
