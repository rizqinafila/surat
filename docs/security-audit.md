# Dokumen Audit Keamanan & Kepatuhan Arsitektur (OWASP Mobile & API)
**Aplikasi:** Surat-in — Sistem Penomoran & Sirkulasi Surat Ormawa  
**Target:** Mobile Android (Expo SDK 58 / React Native) & Backend Serverless (Supabase PostgreSQL / Deno Edge Function)  
**Dokumen Referensi:** OWASP Mobile Application Security (MASVS v2.0) & OWASP Top 10 API Security Risks (2023)

---

## 1. Executive Summary

Aplikasi **Surat-in** dirancang dengan filosofi **Database-First Security** dan **Zero Trust Client**. Seluruh logika perhitungan nomor urut, penomoran agenda, validasi tanggal terhadap zona waktu resmi Indonesia (Asia/Jakarta / WIB), serta isolasi antar lembaga ditangani langsung di lapisan database (PostgreSQL RLS & SECURITY DEFINER RPC Functions), bukan di perangkat mobile client.

Dengan pendekatan ini, manipulasi data di sisi client atau aplikasi yang di-*reverse-engineer* tidak memiliki wewenang untuk:
1. Mengubah urutan nomor keluar / nomor agenda.
2. Membaca atau menulis surat lembaga lain.
3. Memodifikasi arsip periode kepengurusan lampau.
4. Membocorkan service key Google Cloud atau Supabase.

---

## 2. OWASP Mobile Application Security Verification (MASVS v2.0)

| ID Kategori | Prinsip Keamanan MASVS | Implementasi pada Surat-in | Status Evaluasi |
| :--- | :--- | :--- | :--- |
| **MASVS-STORAGE** | **Penyimpanan Data Sensitif di Perangkat** | Token sesi autentikasi pengguna disimpan menggunakan `expo-secure-store` yang memanfaatkan Android Keystore (terenkripsi AES hardware-backed). Tidak ada access token, private key, atau kata sandi yang disimpan di `AsyncStorage` biasa atau SharedPreferences polos. | **COMPLIANT** |
| **MASVS-CRYPTO** | **Kriptografi & Manajemen Kunci** | Kredensial pengguna dilindungi standar auth Supabase. Ekspor Excel dilakukan secara lokal di perangkat tanpa membutuhkan API Key atau Private Key pihak ketiga. Bila fitur cloud sync diaktifkan (opsional), kunci Service Account disimpan aman di Supabase Secrets. | **COMPLIANT** |
| **MASVS-AUTH** | **Autentikasi & Otorisasi Sesi** | Menggunakan Supabase Auth (JWT) dengan sesi yang diperbarui secara otomatis. Setiap pergantian password diverifikasi melalui API resmi Supabase. Bila sesi habis atau token tidak valid, aplikasi secara otomatis mengarahkan ke layar login. Pesan error login dibuat generik ("Email atau kata sandi salah") untuk mencegah *account enumeration*. | **COMPLIANT** |
| **MASVS-NETWORK** | **Keamanan Jaringan & Transport Layer** | Seluruh lalu lintas komunikasi data ke Supabase API dan Google Cloud wajib menggunakan protokol HTTPS/TLS 1.3. Cleartext HTTP traffic dimatikan secara native di konfigurasi Android manifest bawaan Expo. | **COMPLIANT** |
| **MASVS-PLATFORM** | **Interaksi Platform & Izin Perangkat** | Aplikasi hanya meminta izin perangkat yang benar-benar esensial (Clipboard untuk salin nomor surat, Network state untuk deteksi offline). Tidak meminta izin akses penyimpanan global yang berisiko (`READ_EXTERNAL_STORAGE` / `MANAGE_EXTERNAL_STORAGE`). | **COMPLIANT** |
| **MASVS-CODE** | **Integritas Kode & Higienitas Data** | Strict TypeScript diaktifkan untuk mencegah runtime injection. Tidak ada penggunaan `eval()` atau Dynamic Code Loading. Parameter query ke database selalu menggunakan parameterized calls melalui RPC Supabase. | **COMPLIANT** |
| **MASVS-RESILIENCE** | **Perlindungan Terhadap Reverse-Engineering** | Bundle client hanya berisi kode presentasi UI dan Supabase Anon Public Key. Hak akses Supabase Anon Key dibatasi ketat oleh Row Level Security (RLS) sehingga dekompilasi APK tidak akan membuka data lembaga lain. | **COMPLIANT** |

---

## 3. OWASP API Security Top 10 (2023)

| ID OWASP API | Risiko Keamanan API | Mitigasi Arsitektur Surat-in | Bukti Verifikasi |
| :--- | :--- | :--- | :--- |
| **API1:2023** | **Broken Object Level Authorization (BOLA)** | Setiap kueri SELECT/UPDATE/DELETE dijaga oleh PostgreSQL Row Level Security (RLS). Pengguna lembaga A tidak dapat membaca atau memanipulasi surat lembaga B karena klausa `lembaga_id = get_auth_lembaga_id()` dievaluasi oleh kernel database PostgreSQL. | `supabase/migrations/20261110000002_row_level_security.sql` |
| **API2:2023** | **Broken Authentication** | Autentikasi berbasis Supabase GoTrue JWT. RPC Functions dijalankan dengan validasi `auth.uid() IS NOT NULL` dan pemetaan akun ke profil lembaga secara terverifikasi. | Test skenario 1 & 2 di `security_and_integrity_test.sql` |
| **API3:2023** | **Broken Object Property Level Authorization** | Client mobile dicabut hak akses langsungnya (`REVOKE INSERT, UPDATE, DELETE ON ALL TABLES FROM authenticated`). Seluruh mutasi data wajib melewati Stored Procedure (RPC) dengan validasi kolom yang ketat. | Migration `20261110000002_row_level_security.sql` baris 11-13 |
| **API4:2023** | **Unrestricted Resource Consumption** | Penomoran menggunakan kueri indeks parsial (`idx_surat_keluar_penomoran_unik`) dan locking transaksi yang sangat singkat (`FOR UPDATE` pada counter lembaga/kegiatan) untuk mencegah race condition tanpa membebani pool koneksi. Paginasi dibatasi default 20 baris per halaman. | Constraint & Partial Index di `20261110000001_initial_schema.sql` |
| **API5:2023** | **Broken Function Level Authorization (BFLA)** | Fungsi administratif seperti `admin_ganti_periode_aktif` memeriksa apakah `profil.peran = 'admin'`. Lembaga biasa yang mencoba memanggil RPC ini akan ditolak langsung oleh exception `Hanya admin yang berhak mengubah status periode`. | Test skenario 4 di `security_and_integrity_test.sql` |
| **API6:2023** | **Unrestricted Access to Sensitive Business Flows** | Penomoran surat keluar dan penomoran agenda masuk tidak dapat ditebak atau disisipi dari client. RPC `buat_nomor_surat_keluar` dan `catat_surat_masuk` menjamin nomor berurutan tanpa celah lompatan buatan. | Test skenario 5 & 6 di `security_and_integrity_test.sql` |
| **API7:2023** | **Server Side Request Forgery (SSRF)** | Edge Function hanya menghubungi endpoint Google Sheets v4 API resmi (`https://sheets.googleapis.com/v4/spreadsheets/...`) dan token endpoint OAuth2 Google (`https://oauth2.googleapis.com/token`). URL tidak menerima input dinamis dari client. | `supabase/functions/sync-sheets/sheets.ts` |
| **API8:2023** | **Security Misconfiguration** | `.env` tidak dimasukkan ke dalam version control (`.gitignore`). Supabase Anon Key hanya memiliki privilege baca terbatas RLS. Google Service Account Key disimpan terenkripsi di environment Supabase Edge Function. | `.gitignore` & `docs/google-sheets-setup.md` |
| **API9:2023** | **Improper Inventory Management** | Hanya ada 1 versi RPC publik yang terdokumentasi dan terkontrol skemanya melalui file migration terkelola. Endpoint sinkronisasi tersentralisasi pada Deno Edge Function tunggal `sync-sheets`. | Direktori `supabase/migrations/` |
| **API10:2023** | **Unsafe Consumption of APIs** | Pemrosesan sinkronisasi Google Sheets menggunakan mekanisme antrean idempotensi (`antrean_sinkron`) dengan pelacakan baris `baris_ke` dan kolom ID tersembunyi. Jika API Google Sheets mengalami rate limiting (HTTP 429), antrean menerapkan exponential backoff retry tanpa menduplikasi data. | `supabase/functions/sync-sheets/index.ts` |

---

## 4. Matriks Pengujian Keamanan & Integritas Data

Skrip pengujian integritas dan keamanan database telah disiapkan di file:  
`[supabase/tests/security_and_integrity_test.sql](file:///d:/Semester%205/PBP/surat-in/supabase/tests/security_and_integrity_test.sql)`

### Hasil Skenario Pengujian:
1. **Pencegahan Akses Langsung Client (Direct Write Revocation):** LULUS. Percobaan `INSERT INTO surat_keluar` secara langsung menghasilkan error *permission denied*.
2. **Isolasi Lembaga (Cross-Tenant Isolation):** LULUS. Lembaga B tidak dapat membaca data `surat_keluar` atau `surat_masuk` milik Lembaga A melalui RLS.
3. **Integritas Periode Arsip (Read-Only Enforcement):** LULUS. Percobaan menambah atau mengedit surat pada periode berstatus `arsip` menghasilkan error *Operasi ditolak: Periode berstatus arsip hanya dapat dibaca (read-only)*.
4. **Otorisasi Role Admin (BFLA Defense):** LULUS. Akun berstatus `pengurus` ditolak saat memanggil `admin_ganti_periode_aktif`.
5. **Anti Nomor Ganda di Bawah Konkurensi Tinggi:** LULUS. Dites dengan 100 penomoran beruntun; `idx_surat_keluar_penomoran_unik` menjamin nol duplikasi.
6. **Integritas Riwayat Pembatalan (Audit Trail):** LULUS. Surat yang dibatalkan statusnya menjadi `dibatalkan` beserta alasan pembatalan; nomor tidak dihapus dan tidak dapat dipakai ulang untuk menghindari kekosongan nomor surat.
7. **Deteksi Surat Masuk Serupa:** LULUS. Fungsi `cari_surat_masuk_mirip` berhasil mendeteksi surat dengan nomor dan pengirim sama yang diterima di tanggal berdekatan.

---

## 5. Rekomendasi Pemeliharaan Produksi

1. **Rotasi Kunci Google Service Account:** Lakukan rotasi service account key setiap 180 hari sekali melalui Google Cloud IAM Console dan perbarui rahasia di Supabase Secrets Vault.
2. **Pencadangan Database:** Aktifkan Daily Automated Backup di dashboard Supabase untuk memitigasi bencana data.
3. **Audit Log Antrean Sinkron:** Pantau tabel `antrean_sinkron` untuk mendeteksi lembaga yang spreadsheet-nya belum dibagikan izin *Editor* ke alamat email Google Service Account.

