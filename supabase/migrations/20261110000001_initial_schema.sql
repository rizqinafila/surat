-- =============================================================================
-- Migrasi 001: Skema Database Awal (12 Tabel, Enums, Indeks, dan Constraint)
-- Sesuai Blueprint Aplikasi Sirkulasi Surat Masuk dan Keluar (Bagian 13)
-- =============================================================================

-- 1. ENUM TYPES
CREATE TYPE peran_user AS ENUM ('admin', 'lembaga');
CREATE TYPE kelompok_penandatangan AS ENUM ('lembaga', 'kepanitiaan');
CREATE TYPE jenis_penghitung AS ENUM ('keluar_lembaga', 'keluar_panitia', 'masuk');
CREATE TYPE format_surat_keluar AS ENUM ('lembaga', 'kepanitiaan');
CREATE TYPE status_surat_keluar AS ENUM ('aktif', 'dibatalkan');
CREATE TYPE jenis_surat_masuk AS ENUM ('undangan', 'pemberitahuan');
CREATE TYPE bentuk_surat_masuk AS ENUM ('softfile', 'hardfile', 'softfile_hardfile');
CREATE TYPE aksi_sinkron AS ENUM ('tambah', 'perbarui', 'batalkan');
CREATE TYPE status_sinkron AS ENUM ('menunggu', 'berhasil', 'gagal');

-- 2. TABEL LEMBAGA
CREATE TABLE lembaga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kode TEXT NOT NULL UNIQUE, -- kode disimpan tanpa akhiran, misal 'M07'
    kategori TEXT NOT NULL,
    spreadsheet_id TEXT NULL,
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL PERIODE (dimiliki oleh lembaga)
CREATE TABLE periode (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE CASCADE,
    kode_romawi TEXT NOT NULL, -- misalnya 'XXVI' atau 'IX'
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT false,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_periode_lembaga_kode UNIQUE (lembaga_id, kode_romawi),
    CONSTRAINT chk_periode_tanggal CHECK (tanggal_mulai < tanggal_selesai)
);

-- Hanya ada 1 periode aktif per lembaga
CREATE UNIQUE INDEX uq_periode_aktif_per_lembaga 
ON periode (lembaga_id) 
WHERE aktif IS TRUE;

-- 4. TABEL PROFIL PENGGUNA
CREATE TABLE profil (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    lembaga_id UUID NULL REFERENCES lembaga(id) ON DELETE SET NULL, -- NULL khusus untuk peran admin
    peran peran_user NOT NULL DEFAULT 'lembaga',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABEL REFERENSI JENIS SURAT
CREATE TABLE ref_jenis_surat (
    kode TEXT PRIMARY KEY, -- '01', '02', '03', '04'
    nama TEXT NOT NULL
);

-- 6. TABEL REFERENSI PENANDATANGAN
CREATE TABLE ref_penandatangan (
    kode TEXT PRIMARY KEY, -- 'A-0', 'A-I', ..., 'E-II', 'E-0'
    nama TEXT NOT NULL,
    kelompok kelompok_penandatangan NOT NULL
);

-- 7. TABEL KEGIATAN KEPANITIAAN
CREATE TABLE kegiatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES periode(id) ON DELETE CASCADE,
    singkatan TEXT NOT NULL, -- misalnya 'Pan-WK'
    nomor_sk TEXT NOT NULL,   -- misalnya '01'
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_kegiatan_singkatan UNIQUE (lembaga_id, periode_id, singkatan)
);

-- 8. TABEL PENGHITUNG (COUNTER NOMOR)
CREATE TABLE penghitung (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES periode(id) ON DELETE CASCADE,
    kegiatan_id UUID NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
    jenis jenis_penghitung NOT NULL,
    nomor_terakhir INTEGER NOT NULL DEFAULT 0,
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indeks unik penghitung (menangani NULL kegiatan_id dengan COALESCE)
CREATE UNIQUE INDEX uq_penghitung_kategori 
ON penghitung (
    lembaga_id, 
    periode_id, 
    jenis, 
    COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- 9. TABEL SURAT KELUAR
CREATE TABLE surat_keluar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE RESTRICT,
    periode_id UUID NOT NULL REFERENCES periode(id) ON DELETE RESTRICT,
    kegiatan_id UUID NULL REFERENCES kegiatan(id) ON DELETE RESTRICT,
    format format_surat_keluar NOT NULL,
    nomor_urut INTEGER NOT NULL,
    jenis_surat TEXT NOT NULL REFERENCES ref_jenis_surat(kode),
    penandatangan TEXT NOT NULL REFERENCES ref_penandatangan(kode),
    tanggal DATE NOT NULL,
    hal TEXT NOT NULL,
    alamat TEXT NOT NULL,
    nomor_lengkap TEXT NOT NULL,
    status status_surat_keluar NOT NULL DEFAULT 'aktif',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_surat_keluar_nomor_lengkap UNIQUE (lembaga_id, nomor_lengkap)
);

-- Indeks unik untuk mencegah nomor_urut ganda per format / kegiatan
CREATE UNIQUE INDEX uq_surat_keluar_urut 
ON surat_keluar (
    lembaga_id, 
    periode_id, 
    format, 
    COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    nomor_urut
);

-- 10. TABEL PENGIRIM (SURAT MASUK)
CREATE TABLE pengirim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Pengirim tidak boleh duplikat (case insensitive) per lembaga
CREATE UNIQUE INDEX uq_pengirim_lembaga_lower_nama 
ON pengirim (lembaga_id, lower(trim(nama)));

-- 11. TABEL SURAT MASUK
CREATE TABLE surat_masuk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES lembaga(id) ON DELETE RESTRICT,
    periode_id UUID NOT NULL REFERENCES periode(id) ON DELETE RESTRICT,
    nomor_urut INTEGER NOT NULL,
    tanggal_terima DATE NOT NULL,
    nomor_asal TEXT NOT NULL,
    jenis jenis_surat_masuk NOT NULL,
    pengirim_id UUID NOT NULL REFERENCES pengirim(id) ON DELETE RESTRICT,
    perihal TEXT NOT NULL,
    bentuk bentuk_surat_masuk NOT NULL,
    catatan TEXT NULL,
    dicatat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_surat_masuk_urut UNIQUE (lembaga_id, periode_id, nomor_urut)
);

-- 12. TABEL RIWAYAT PERUBAHAN
CREATE TABLE riwayat_perubahan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabel TEXT NOT NULL,
    surat_id UUID NOT NULL,
    waktu TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diubah_oleh UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    nilai_lama JSONB NOT NULL DEFAULT '{}'::jsonb,
    nilai_baru JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 13. TABEL ANTREAN SINKRONISASI KE GOOGLE SHEETS
CREATE TABLE antrean_sinkron (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabel TEXT NOT NULL,
    surat_id UUID NOT NULL,
    aksi aksi_sinkron NOT NULL,
    status status_sinkron NOT NULL DEFAULT 'menunggu',
    percobaan INTEGER NOT NULL DEFAULT 0,
    pesan_error TEXT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_antrean_sinkron_status ON antrean_sinkron (status, dibuat_pada);

