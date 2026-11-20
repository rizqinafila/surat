# Laporan Due Diligence (Fase 0 — Uji Kelayakan)

Dokumen ini mencatat bukti dan spesifikasi pengujian kelayakan teknis sesuai Blueprint Bagian 1, Bagian 20, dan Bagian 28.

---

## 1. Uji Pencegahan Nomor Ganda (FR-008 & Kriteria Sukses)

### Masalah Asli
Pada proses manual spreadsheet, sering terjadi nomor ganda akibat:
1. Dua pengguna membuka spreadsheet secara bersamaan dan melihat nomor terakhir yang sama.
2. Pengguna salah mengingat atau mengedit nomor urut.

### Solusi Teknis (Arsitektur Database)
1. **Peningkatan Nomor Secara Atomik**:
   Pembuatan nomor dilakukan melalui perintah `INSERT ... ON CONFLICT (lembaga_id, periode_id, jenis, kegiatan_id) DO UPDATE SET nomor_terakhir = nomor_terakhir + 1 RETURNING nomor_terakhir;`. Operasi ini terkunci di tingkat baris PostgreSQL (row-level lock) sehingga dua request yang datang bersamaan dijamin dieksekusi berurutan tanpa menghasilkan nilai `nomor_terakhir` yang sama.
2. **Double-Safety Unique Constraints**:
   - `uq_surat_keluar_nomor_lengkap UNIQUE (lembaga_id, nomor_lengkap)`
   - `uq_surat_keluar_urut UNIQUE (lembaga_id, periode_id, format, kegiatan_id, nomor_urut)`
   Jika terjadi anomali apapun, PostgreSQL secara otomatis membatalkan transaksi dan melempar error `unique_violation`.

---

## 2. Skrip Pengujian

Skrip pengujian SQL telah disediakan di:
[`supabase/tests/test_nomor_beruntun.sql`](file:///d:/Semester%205/PBP/surat-in/supabase/tests/test_nomor_beruntun.sql)

### Skenario Uji:
1. **100 Permintaan Beruntun**: Melakukan iterasi 100 pembuatan nomor surat berturut-turut pada lembaga uji `TEST99`.
   - **Hasil yang Diharapkan**: 100 baris tersimpan, 100 nomor unik (0 nomor ganda).
2. **Negative Test (Simulasi Pelanggaran Unik)**: Mencoba memasukkan nomor yang sudah ada ke dalam tabel `surat_keluar`.
   - **Hasil yang Diharapkan**: Database menolak dengan exception `unique_violation`.

### Cara Menjalankan di Supabase:
1. Buka dashboard proyek Supabase di [supabase.com](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Jalankan file migrasi secara berurutan:
   - `supabase/migrations/20261110000001_initial_schema.sql`
   - `supabase/migrations/20261110000002_row_level_security.sql`
   - `supabase/migrations/20261110000003_rpc_functions.sql`
   - `supabase/seed.sql`
4. Buka tab baru di SQL Editor dan jalankan `supabase/tests/test_nomor_beruntun.sql`.
5. Periksa tab *Messages/Notice* untuk melihat log:
   ```text
   NOTICE: Total surat dibuat : 100
   NOTICE: Total nomor unik   : 100
   NOTICE: ✅ PENGUJIAN 100 NOMOR BERUNTUN: LULUS (100% UNIK, 0 GANDA)
   NOTICE: ✅ CONSTRAINT HARDENING: Database berhasil MENOLAK nomor ganda (unique_violation).
   NOTICE: === SEMUA PENGUJIAN DUE DILIGENCE BERHASIL LULUS ===
   ```

---

## 3. Kuota Layanan Gratis (Free Tier Baseline)

Sesuai TBD-8 dan batasan biaya nol:
- **Supabase Free Tier**:
  - Database: 500 MB (lebih dari cukup untuk puluhan ribu metadata surat teks)
  - Auth: 50.000 Active Users bulanan (kebutuhan: ~70 akun lembaga)
  - Edge Functions: 500.000 invocations/bulan
- **Google Sheets API**:
  - Kuota: 300 request per menit per proyek (sinkronisasi batch jauh di bawah batas ini).

