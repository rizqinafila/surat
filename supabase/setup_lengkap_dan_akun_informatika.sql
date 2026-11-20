-- =============================================================================
-- MASTER SETUP & PEMBUATAN AKUN HMPS INFORMATIKA
-- Aplikasi Sirkulasi Surat Mahasiswa (Surat-in)
-- =============================================================================
-- Jalankan skrip ini langsung di Supabase Dashboard -> SQL Editor -> Run
-- Skrip ini akan membuat seluruh tabel, keamanan RLS, fungsi RPC, data 67 lembaga,
-- serta akun login pertama untuk HMPS Informatika dan Administrator.
-- =============================================================================

-- Pastikan extension pgcrypto aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- BAGIAN 1: ENUM TYPES
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE peran_user AS ENUM ('admin', 'lembaga');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE kelompok_penandatangan AS ENUM ('lembaga', 'kepanitiaan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE jenis_penghitung AS ENUM ('keluar_lembaga', 'keluar_panitia', 'masuk');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE format_surat_keluar AS ENUM ('lembaga', 'kepanitiaan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_surat_keluar AS ENUM ('aktif', 'dibatalkan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE jenis_surat_masuk AS ENUM ('undangan', 'pemberitahuan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bentuk_surat_masuk AS ENUM ('softfile', 'hardfile', 'softfile_hardfile');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE aksi_sinkron AS ENUM ('tambah', 'perbarui', 'batalkan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_sinkron AS ENUM ('menunggu', 'berhasil', 'gagal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================================
-- BAGIAN 2: TABEL-TABEL UTAMA
-- =============================================================================

-- 1. TABEL LEMBAGA
CREATE TABLE IF NOT EXISTS public.lembaga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kode TEXT NOT NULL UNIQUE,
    kategori TEXT NOT NULL,
    spreadsheet_id TEXT NULL,
    aktif BOOLEAN NOT NULL DEFAULT true,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABEL PERIODE
CREATE TABLE IF NOT EXISTS public.periode (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    kode_romawi TEXT NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT false,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_periode_lembaga_kode UNIQUE (lembaga_id, kode_romawi),
    CONSTRAINT chk_periode_tanggal CHECK (tanggal_mulai < tanggal_selesai)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_periode_aktif_per_lembaga 
ON public.periode (lembaga_id) 
WHERE aktif IS TRUE;

-- 3. TABEL PROFIL PENGGUNA
CREATE TABLE IF NOT EXISTS public.profil (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    lembaga_id UUID NULL REFERENCES public.lembaga(id) ON DELETE SET NULL,
    peran peran_user NOT NULL DEFAULT 'lembaga',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL REFERENSI JENIS SURAT
CREATE TABLE IF NOT EXISTS public.ref_jenis_surat (
    kode TEXT PRIMARY KEY,
    nama TEXT NOT NULL
);

-- 5. TABEL REFERENSI PENANDATANGAN
CREATE TABLE IF NOT EXISTS public.ref_penandatangan (
    kode TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    kelompok kelompok_penandatangan NOT NULL
);

-- 6. TABEL KEGIATAN KEPANITIAAN
CREATE TABLE IF NOT EXISTS public.kegiatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES public.periode(id) ON DELETE CASCADE,
    singkatan TEXT NOT NULL,
    nomor_sk TEXT NOT NULL,
    nama_kegiatan TEXT NOT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_kegiatan_singkatan UNIQUE (lembaga_id, periode_id, singkatan)
);

-- 7. TABEL PENGHITUNG
CREATE TABLE IF NOT EXISTS public.penghitung (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    periode_id UUID NOT NULL REFERENCES public.periode(id) ON DELETE CASCADE,
    jenis jenis_penghitung NOT NULL,
    kegiatan_id UUID NULL REFERENCES public.kegiatan(id) ON DELETE CASCADE,
    nomor_terakhir INTEGER NOT NULL DEFAULT 0,
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_penghitung_lembaga_periode_jenis_kegiatan 
        UNIQUE NULLS NOT DISTINCT (lembaga_id, periode_id, jenis, kegiatan_id)
);

-- 8. TABEL SURAT KELUAR
CREATE TABLE IF NOT EXISTS public.surat_keluar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE RESTRICT,
    periode_id UUID NOT NULL REFERENCES public.periode(id) ON DELETE RESTRICT,
    format format_surat_keluar NOT NULL,
    kegiatan_id UUID NULL REFERENCES public.kegiatan(id) ON DELETE RESTRICT,
    nomor_urut INTEGER NOT NULL,
    jenis_surat TEXT NOT NULL REFERENCES public.ref_jenis_surat(kode),
    penandatangan TEXT NOT NULL REFERENCES public.ref_penandatangan(kode),
    tanggal DATE NOT NULL,
    hal TEXT NOT NULL,
    alamat TEXT NOT NULL,
    nomor_lengkap TEXT NOT NULL,
    status status_surat_keluar NOT NULL DEFAULT 'aktif',
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diubah_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_surat_keluar_nomor_lengkap UNIQUE (lembaga_id, nomor_lengkap)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_surat_keluar_penomoran_unik 
ON public.surat_keluar (lembaga_id, periode_id, format, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid), nomor_urut);

CREATE INDEX IF NOT EXISTS idx_surat_keluar_daftar ON public.surat_keluar (lembaga_id, periode_id, nomor_urut DESC);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_tanggal ON public.surat_keluar (lembaga_id, tanggal);

-- 9. TABEL PENGIRIM SURAT MASUK
CREATE TABLE IF NOT EXISTS public.pengirim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_pengirim_nama_per_lembaga UNIQUE (lembaga_id, nama)
);

-- 10. TABEL SURAT MASUK
CREATE TABLE IF NOT EXISTS public.surat_masuk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE RESTRICT,
    periode_id UUID NOT NULL REFERENCES public.periode(id) ON DELETE RESTRICT,
    nomor_urut INTEGER NOT NULL,
    tanggal_terima DATE NOT NULL,
    nomor_asal TEXT NOT NULL,
    jenis jenis_surat_masuk NOT NULL,
    pengirim_id UUID NOT NULL REFERENCES public.pengirim(id) ON DELETE RESTRICT,
    perihal TEXT NOT NULL,
    bentuk bentuk_surat_masuk NOT NULL,
    catatan TEXT NULL,
    dicatat_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_surat_masuk_nomor_urut UNIQUE (lembaga_id, periode_id, nomor_urut)
);

CREATE INDEX IF NOT EXISTS idx_surat_masuk_daftar ON public.surat_masuk (lembaga_id, periode_id, tanggal_terima DESC, dicatat_pada DESC);

-- 11. TABEL RIWAYAT PERUBAHAN
CREATE TABLE IF NOT EXISTS public.riwayat_perubahan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabel TEXT NOT NULL,
    surat_id UUID NOT NULL,
    waktu TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    diubah_oleh UUID NOT NULL REFERENCES auth.users(id),
    nilai_lama JSONB NOT NULL,
    nilai_baru JSONB NOT NULL
);

-- 12. TABEL ANTREAN SINKRON (Kompatibilitas Log)
CREATE TABLE IF NOT EXISTS public.antrean_sinkron (
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

-- =============================================================================
-- BAGIAN 3: ROW LEVEL SECURITY (RLS) & IZIN
-- =============================================================================
ALTER TABLE public.lembaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_jenis_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_penandatangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penghitung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengirim ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_perubahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antrean_sinkron ENABLE ROW LEVEL SECURITY;

-- Cabut akses tulis langsung dari client mobile
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Helper functions RLS
CREATE OR REPLACE FUNCTION public.auth_peran()
RETURNS peran_user AS $$
DECLARE
    v_peran peran_user;
BEGIN
    SELECT peran INTO v_peran FROM public.profil WHERE user_id = auth.uid();
    RETURN v_peran;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.auth_lembaga_id()
RETURNS UUID AS $$
DECLARE
    v_lembaga_id UUID;
BEGIN
    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = auth.uid();
    RETURN v_lembaga_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Policy Select
DROP POLICY IF EXISTS policy_lembaga_select ON public.lembaga;
CREATE POLICY policy_lembaga_select ON public.lembaga
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR id = auth_lembaga_id() OR aktif = true);

DROP POLICY IF EXISTS policy_periode_select ON public.periode;
CREATE POLICY policy_periode_select ON public.periode
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_profil_select ON public.profil;
CREATE POLICY policy_profil_select ON public.profil
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR user_id = auth.uid());

DROP POLICY IF EXISTS policy_ref_jenis_surat_select ON public.ref_jenis_surat;
CREATE POLICY policy_ref_jenis_surat_select ON public.ref_jenis_surat
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS policy_ref_penandatangan_select ON public.ref_penandatangan;
CREATE POLICY policy_ref_penandatangan_select ON public.ref_penandatangan
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS policy_kegiatan_select ON public.kegiatan;
CREATE POLICY policy_kegiatan_select ON public.kegiatan
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_penghitung_select ON public.penghitung;
CREATE POLICY policy_penghitung_select ON public.penghitung
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_surat_keluar_select ON public.surat_keluar;
CREATE POLICY policy_surat_keluar_select ON public.surat_keluar
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_pengirim_select ON public.pengirim;
CREATE POLICY policy_pengirim_select ON public.pengirim
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_surat_masuk_select ON public.surat_masuk;
CREATE POLICY policy_surat_masuk_select ON public.surat_masuk
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR lembaga_id = auth_lembaga_id());

DROP POLICY IF EXISTS policy_riwayat_perubahan_select ON public.riwayat_perubahan;
CREATE POLICY policy_riwayat_perubahan_select ON public.riwayat_perubahan
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR diubah_oleh = auth.uid());

-- =============================================================================
-- BAGIAN 4: STORED PROCEDURES (RPC FUNCTIONS)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bulan_ke_romawi(p_bulan INT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE p_bulan
        WHEN 1 THEN 'I'
        WHEN 2 THEN 'II'
        WHEN 3 THEN 'III'
        WHEN 4 THEN 'IV'
        WHEN 5 THEN 'V'
        WHEN 6 THEN 'VI'
        WHEN 7 THEN 'VII'
        WHEN 8 THEN 'VIII'
        WHEN 9 THEN 'IX'
        WHEN 10 THEN 'X'
        WHEN 11 THEN 'XI'
        WHEN 12 THEN 'XII'
        ELSE 'I'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.normalisasi_teks(p_input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_input IS NULL THEN
        RETURN '';
    END IF;
    RETURN lower(regexp_replace(trim(p_input), '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- RPC 1: BUAT NOMOR SURAT KELUAR
CREATE OR REPLACE FUNCTION public.buat_nomor_surat_keluar(
    p_format format_surat_keluar,
    p_kegiatan_id UUID,
    p_jenis_surat TEXT,
    p_penandatangan TEXT,
    p_tanggal DATE,
    p_hal TEXT,
    p_alamat TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_kode_lembaga TEXT;
    v_periode RECORD;
    v_kegiatan RECORD;
    v_jenis_penghitung jenis_penghitung;
    v_nomor_urut INTEGER;
    v_nomor_urut_str TEXT;
    v_bulan_romawi TEXT;
    v_tahun TEXT;
    v_nomor_lengkap TEXT;
    v_surat_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna belum terautentikasi (TIDAK_TERAUTENTIKASI)';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    IF v_lembaga_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Akun tidak terhubung ke lembaga manapun (TIDAK_BERHAK)';
    END IF;

    SELECT kode INTO v_kode_lembaga FROM public.lembaga WHERE id = v_lembaga_id AND aktif = true;
    IF v_kode_lembaga IS NULL THEN
        RAISE EXCEPTION 'Lembaga tidak ditemukan atau berstatus tidak aktif';
    END IF;

    SELECT * INTO v_periode FROM public.periode WHERE lembaga_id = v_lembaga_id AND aktif = true LIMIT 1;
    IF v_periode.id IS NULL THEN
        RAISE EXCEPTION 'Operasi ditolak: Lembaga tidak memiliki periode aktif (PERIODE_TIDAK_AKTIF)';
    END IF;

    IF p_tanggal < v_periode.tanggal_mulai OR p_tanggal > v_periode.tanggal_selesai THEN
        RAISE EXCEPTION 'Validasi gagal: Tanggal surat (%) berada di luar rentang periode aktif (% s.d. %) (TANGGAL_DI_LUAR_PERIODE)',
            p_tanggal, v_periode.tanggal_mulai, v_periode.tanggal_selesai;
    END IF;

    IF p_format = 'kepanitiaan' THEN
        IF p_kegiatan_id IS NULL THEN
            RAISE EXCEPTION 'Surat kepanitiaan wajib menyertakan kegiatan_id yang valid';
        END IF;

        SELECT * INTO v_kegiatan FROM public.kegiatan WHERE id = p_kegiatan_id AND lembaga_id = v_lembaga_id AND periode_id = v_periode.id;
        IF v_kegiatan.id IS NULL THEN
            RAISE EXCEPTION 'Kegiatan kepanitiaan tidak ditemukan pada periode aktif lembaga ini';
        END IF;

        v_jenis_penghitung := 'keluar_panitia';
    ELSE
        p_kegiatan_id := NULL;
        v_jenis_penghitung := 'keluar_lembaga';
    END IF;

    IF v_jenis_penghitung = 'keluar_panitia' THEN
        INSERT INTO public.penghitung (lembaga_id, periode_id, jenis, kegiatan_id, nomor_terakhir)
        VALUES (v_lembaga_id, v_periode.id, v_jenis_penghitung, p_kegiatan_id, 2)
        ON CONFLICT (lembaga_id, periode_id, jenis, kegiatan_id)
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;
    ELSE
        INSERT INTO public.penghitung (lembaga_id, periode_id, jenis, kegiatan_id, nomor_terakhir)
        VALUES (v_lembaga_id, v_periode.id, v_jenis_penghitung, NULL, 1)
        ON CONFLICT (lembaga_id, periode_id, jenis, kegiatan_id)
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;
    END IF;

    IF v_nomor_urut < 10 THEN
        v_nomor_urut_str := '0' || v_nomor_urut::TEXT;
    ELSE
        v_nomor_urut_str := v_nomor_urut::TEXT;
    END IF;

    v_bulan_romawi := public.bulan_ke_romawi(EXTRACT(MONTH FROM p_tanggal)::INT);
    v_tahun := EXTRACT(YEAR FROM p_tanggal)::TEXT;

    IF p_format = 'kepanitiaan' THEN
        v_nomor_lengkap := v_nomor_urut_str || '.' || v_kegiatan.singkatan || '.' || v_kegiatan.nomor_sk || '.' ||
                           v_kode_lembaga || '-Un.' || v_periode.kode_romawi || '.' || p_jenis_surat || '.' ||
                           p_penandatangan || '.' || v_bulan_romawi || '.' || v_tahun;
    ELSE
        v_nomor_lengkap := v_nomor_urut_str || '.' || v_kode_lembaga || '-Un.' || v_periode.kode_romawi || '.' ||
                           p_jenis_surat || '.' || p_penandatangan || '.' || v_bulan_romawi || '.' || v_tahun;
    END IF;

    INSERT INTO public.surat_keluar (
        lembaga_id, periode_id, format, kegiatan_id, nomor_urut,
        jenis_surat, penandatangan, tanggal, hal, alamat, nomor_lengkap, status
    ) VALUES (
        v_lembaga_id, v_periode.id, p_format, p_kegiatan_id, v_nomor_urut,
        p_jenis_surat, p_penandatangan, p_tanggal, trim(p_hal), trim(p_alamat), v_nomor_lengkap, 'aktif'
    )
    RETURNING id INTO v_surat_id;

    RETURN jsonb_build_object(
        'id', v_surat_id,
        'nomor_urut', v_nomor_urut,
        'nomor_lengkap', v_nomor_lengkap,
        'tanggal', p_tanggal,
        'status', 'aktif'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 2: EDIT SURAT KELUAR
CREATE OR REPLACE FUNCTION public.edit_surat_keluar(
    p_id UUID,
    p_jenis_surat TEXT,
    p_penandatangan TEXT,
    p_tanggal DATE,
    p_hal TEXT DEFAULT NULL,
    p_alamat TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_surat RECORD;
    v_periode RECORD;
    v_kode_lembaga TEXT;
    v_singkatan_kegiatan TEXT;
    v_nomor_sk_kegiatan TEXT;
    v_nomor_urut_str TEXT;
    v_bulan_romawi TEXT;
    v_tahun TEXT;
    v_nomor_lama TEXT;
    v_nomor_baru TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Belum terautentikasi';
    END IF;

    SELECT * INTO v_surat FROM public.surat_keluar WHERE id = p_id;
    IF v_surat.id IS NULL THEN
        RAISE EXCEPTION 'Surat keluar tidak ditemukan';
    END IF;

    IF v_surat.status = 'dibatalkan' THEN
        RAISE EXCEPTION 'Surat yang sudah dibatalkan tidak dapat diedit';
    END IF;

    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'Operasi ditolak: Surat berada pada periode arsip (read-only)';
    END IF;

    IF p_tanggal < v_periode.tanggal_mulai OR p_tanggal > v_periode.tanggal_selesai THEN
        RAISE EXCEPTION 'Validasi gagal: Tanggal baru berada di luar rentang periode aktif';
    END IF;

    SELECT kode INTO v_kode_lembaga FROM public.lembaga WHERE id = v_surat.lembaga_id;
    v_nomor_lama := v_surat.nomor_lengkap;

    IF v_surat.nomor_urut < 10 THEN
        v_nomor_urut_str := '0' || v_surat.nomor_urut::TEXT;
    ELSE
        v_nomor_urut_str := v_surat.nomor_urut::TEXT;
    END IF;

    v_bulan_romawi := public.bulan_ke_romawi(EXTRACT(MONTH FROM p_tanggal)::INT);
    v_tahun := EXTRACT(YEAR FROM p_tanggal)::TEXT;

    IF v_surat.format = 'kepanitiaan' THEN
        SELECT singkatan, nomor_sk INTO v_singkatan_kegiatan, v_nomor_sk_kegiatan FROM public.kegiatan WHERE id = v_surat.kegiatan_id;
        v_nomor_baru := v_nomor_urut_str || '.' || v_singkatan_kegiatan || '.' || v_nomor_sk_kegiatan || '.' ||
                        v_kode_lembaga || '-Un.' || v_periode.kode_romawi || '.' || p_jenis_surat || '.' ||
                        p_penandatangan || '.' || v_bulan_romawi || '.' || v_tahun;
    ELSE
        v_nomor_baru := v_nomor_urut_str || '.' || v_kode_lembaga || '-Un.' || v_periode.kode_romawi || '.' ||
                        p_jenis_surat || '.' || p_penandatangan || '.' || v_bulan_romawi || '.' || v_tahun;
    END IF;

    INSERT INTO public.riwayat_perubahan (tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru)
    VALUES (
        'surat_keluar', p_id, v_user_id,
        jsonb_build_object('jenis_surat', v_surat.jenis_surat, 'penandatangan', v_surat.penandatangan, 'tanggal', v_surat.tanggal, 'hal', v_surat.hal, 'alamat', v_surat.alamat, 'nomor_lengkap', v_nomor_lama),
        jsonb_build_object('jenis_surat', p_jenis_surat, 'penandatangan', p_penandatangan, 'tanggal', p_tanggal, 'hal', COALESCE(p_hal, v_surat.hal), 'alamat', COALESCE(p_alamat, v_surat.alamat), 'nomor_lengkap', v_nomor_baru)
    );

    UPDATE public.surat_keluar
    SET jenis_surat = p_jenis_surat,
        penandatangan = p_penandatangan,
        tanggal = p_tanggal,
        hal = COALESCE(p_hal, hal),
        alamat = COALESCE(p_alamat, alamat),
        nomor_lengkap = v_nomor_baru,
        diubah_pada = timezone('utc'::text, now())
    WHERE id = p_id;

    RETURN jsonb_build_object('id', p_id, 'nomor_lama', v_nomor_lama, 'nomor_baru', v_nomor_baru);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 3: BATALKAN SURAT KELUAR
CREATE OR REPLACE FUNCTION public.batalkan_surat_keluar(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_surat RECORD;
    v_periode RECORD;
BEGIN
    v_user_id := auth.uid();
    SELECT * INTO v_surat FROM public.surat_keluar WHERE id = p_id;
    IF v_surat.id IS NULL THEN RAISE EXCEPTION 'Surat tidak ditemukan'; END IF;
    IF v_surat.status = 'dibatalkan' THEN RAISE EXCEPTION 'Surat ini sudah dibatalkan sebelumnya'; END IF;

    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'Operasi ditolak: Surat berada pada periode arsip (read-only)';
    END IF;

    INSERT INTO public.riwayat_perubahan (tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru)
    VALUES ('surat_keluar', p_id, v_user_id, jsonb_build_object('status', v_surat.status), jsonb_build_object('status', 'dibatalkan'));

    UPDATE public.surat_keluar
    SET status = 'dibatalkan', diubah_pada = timezone('utc'::text, now())
    WHERE id = p_id;

    RETURN jsonb_build_object('id', p_id, 'status', 'dibatalkan');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 4: BUAT KEGIATAN KEPANITIAAN
CREATE OR REPLACE FUNCTION public.buat_kegiatan(
    p_singkatan TEXT,
    p_nomor_sk TEXT,
    p_nama_kegiatan TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_periode RECORD;
    v_kegiatan_id UUID;
BEGIN
    v_user_id := auth.uid();
    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    SELECT * INTO v_periode FROM public.periode WHERE lembaga_id = v_lembaga_id AND aktif = true LIMIT 1;
    IF v_periode.id IS NULL THEN RAISE EXCEPTION 'Lembaga tidak memiliki periode aktif'; END IF;

    INSERT INTO public.kegiatan (lembaga_id, periode_id, singkatan, nomor_sk, nama_kegiatan)
    VALUES (v_lembaga_id, v_periode.id, trim(p_singkatan), trim(p_nomor_sk), trim(p_nama_kegiatan))
    RETURNING id INTO v_kegiatan_id;

    RETURN jsonb_build_object('id', v_kegiatan_id, 'singkatan', trim(p_singkatan), 'nomor_sk', trim(p_nomor_sk), 'nama_kegiatan', trim(p_nama_kegiatan));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 5: CARI SURAT MASUK MIRIP
CREATE OR REPLACE FUNCTION public.cari_surat_masuk_mirip(
    p_nomor_asal TEXT,
    p_pengirim_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_periode RECORD;
    v_kandidat JSONB;
BEGIN
    v_user_id := auth.uid();
    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    SELECT * INTO v_periode FROM public.periode WHERE lembaga_id = v_lembaga_id AND aktif = true LIMIT 1;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sm.id,
            'nomor_urut', sm.nomor_urut,
            'nomor_asal', sm.nomor_asal,
            'tanggal_terima', sm.tanggal_terima,
            'bentuk', sm.bentuk,
            'perihal', sm.perihal
        )
    ) INTO v_kandidat
    FROM public.surat_masuk sm
    WHERE sm.lembaga_id = v_lembaga_id
      AND sm.periode_id = v_periode.id
      AND sm.pengirim_id = p_pengirim_id
      AND public.normalisasi_teks(sm.nomor_asal) = public.normalisasi_teks(p_nomor_asal);

    IF v_kandidat IS NULL THEN
        RETURN jsonb_build_object('ada_mirip', false, 'kandidat', '[]'::jsonb);
    ELSE
        RETURN jsonb_build_object('ada_mirip', true, 'kandidat', v_kandidat);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- RPC 6: CATAT SURAT MASUK
CREATE OR REPLACE FUNCTION public.catat_surat_masuk(
    p_tanggal_terima DATE,
    p_nomor_asal TEXT,
    p_jenis jenis_surat_masuk,
    p_pengirim_id UUID,
    p_perihal TEXT,
    p_bentuk bentuk_surat_masuk,
    p_catatan TEXT DEFAULT NULL,
    p_paksa_baru BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_periode RECORD;
    v_hari_ini_wib DATE;
    v_nomor_urut INTEGER;
    v_surat_id UUID;
BEGIN
    v_user_id := auth.uid();
    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    SELECT * INTO v_periode FROM public.periode WHERE lembaga_id = v_lembaga_id AND aktif = true LIMIT 1;
    IF v_periode.id IS NULL THEN RAISE EXCEPTION 'Lembaga tidak memiliki periode aktif'; END IF;

    v_hari_ini_wib := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    IF p_tanggal_terima > v_hari_ini_wib THEN
        RAISE EXCEPTION 'Validasi gagal: Tanggal terima tidak boleh setelah hari ini (WIB)';
    END IF;

    IF p_tanggal_terima < v_periode.tanggal_mulai OR p_tanggal_terima > v_periode.tanggal_selesai THEN
        RAISE EXCEPTION 'Validasi gagal: Tanggal terima berada di luar rentang periode aktif';
    END IF;

    INSERT INTO public.penghitung (lembaga_id, periode_id, jenis, kegiatan_id, nomor_terakhir)
    VALUES (v_lembaga_id, v_periode.id, 'masuk', NULL, 1)
    ON CONFLICT (lembaga_id, periode_id, jenis, kegiatan_id)
    DO UPDATE SET nomor_terakhir = public.penghitung.nomor_terakhir + 1, diperbarui_pada = timezone('utc'::text, now())
    RETURNING nomor_terakhir INTO v_nomor_urut;

    INSERT INTO public.surat_masuk (
        lembaga_id, periode_id, nomor_urut, tanggal_terima, nomor_asal, jenis, pengirim_id, perihal, bentuk, catatan
    ) VALUES (
        v_lembaga_id, v_periode.id, v_nomor_urut, p_tanggal_terima, trim(p_nomor_asal), p_jenis, p_pengirim_id, trim(p_perihal), p_bentuk, p_catatan
    )
    RETURNING id INTO v_surat_id;

    RETURN jsonb_build_object('id', v_surat_id, 'nomor_urut', v_nomor_urut);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 7: PERBARUI BENTUK SURAT MASUK
CREATE OR REPLACE FUNCTION public.perbarui_bentuk_surat_masuk(
    p_id UUID,
    p_bentuk_baru bentuk_surat_masuk
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_surat RECORD;
    v_periode RECORD;
BEGIN
    v_user_id := auth.uid();
    SELECT * INTO v_surat FROM public.surat_masuk WHERE id = p_id;
    IF v_surat.id IS NULL THEN RAISE EXCEPTION 'Surat masuk tidak ditemukan'; END IF;

    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'Operasi ditolak: Surat berada pada periode arsip (read-only)';
    END IF;

    INSERT INTO public.riwayat_perubahan (tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru)
    VALUES ('surat_masuk', p_id, v_user_id, jsonb_build_object('bentuk', v_surat.bentuk), jsonb_build_object('bentuk', p_bentuk_baru));

    UPDATE public.surat_masuk
    SET bentuk = p_bentuk_baru, diperbarui_pada = timezone('utc'::text, now())
    WHERE id = p_id;

    RETURN jsonb_build_object('id', p_id, 'bentuk', p_bentuk_baru);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- RPC 8: ADMIN GANTI PERIODE AKTIF
CREATE OR REPLACE FUNCTION public.admin_ganti_periode_aktif(
    p_lembaga_id UUID,
    p_periode_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_peran peran_user;
BEGIN
    SELECT peran INTO v_peran FROM public.profil WHERE user_id = auth.uid();
    IF v_peran IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya admin yang berhak mengubah status periode';
    END IF;

    UPDATE public.periode SET aktif = false WHERE lembaga_id = p_lembaga_id;
    UPDATE public.periode SET aktif = true WHERE id = p_periode_id AND lembaga_id = p_lembaga_id;

    RETURN jsonb_build_object('sukses', true, 'lembaga_id', p_lembaga_id, 'periode_aktif_id', p_periode_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- =============================================================================
-- BAGIAN 5: DATA REFERENSI AWAL & 67 LEMBAGA
-- =============================================================================

INSERT INTO public.ref_jenis_surat (kode, nama) VALUES
('01', 'Internal khusus (surat keputusan, undangan pengurus, peringatan, sertifikat)'),
('02', 'Internal umum (undangan dan pemberitahuan ke lembaga internal PM)'),
('03', 'Eksternal khusus (rekomendasi, audiensi pejabat kampus di luar PM)'),
('04', 'Eksternal umum (audiensi pemda, perizinan, untuk umum di luar PM)')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO public.ref_penandatangan (kode, nama, kelompok) VALUES
('A-0', 'Ketua', 'lembaga'),
('A-I', 'Ketua dan Sekretaris', 'lembaga'),
('A-II', 'Ketua dan Wakil Sekretaris', 'lembaga'),
('B-I', 'Wakil Ketua dan Sekretaris', 'lembaga'),
('B-II', 'Wakil Ketua dan Wakil Sekretaris', 'lembaga'),
('C-I', 'Ketua dan Menteri, Komisi, Bidang, Departemen, atau Divisi', 'lembaga'),
('C-II', 'Wakil Ketua dan Menteri, Komisi, Bidang, Departemen, atau Divisi', 'lembaga'),
('C-III', 'Ketua, Sekretaris, dan Menteri, Komisi, Bidang, Departemen, atau Divisi', 'lembaga'),
('D-I', 'Ketua, Sekretaris, dan Bendahara atau Wakil Bendahara', 'lembaga'),
('D-II', 'Ketua, Wakil Sekretaris, dan Bendahara atau Wakil Bendahara', 'lembaga'),
('E-I', 'Ketua OC dan Sekretaris OC', 'kepanitiaan'),
('E-II', 'Ketua OC, Sekretaris OC, dan Ketua Umum', 'kepanitiaan'),
('E-0', 'Ketua OC dan Ketua Lembaga', 'kepanitiaan')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO public.lembaga (kode, nama, kategori, aktif) VALUES
('S00', 'Senat Mahasiswa Universitas', 'Universitas', true),
('D00', 'Dewan Eksekutif Mahasiswa Universitas', 'Universitas', true),
('S01', 'SEMA-F Syariah', 'Senat Fakultas', true),
('S02', 'SEMA-F Tarbiyah dan Ilmu Keguruan', 'Senat Fakultas', true),
('S03', 'SEMA-F Ushuluddin Adab dan Dakwah', 'Senat Fakultas', true),
('S04', 'SEMA-F Ekonomi dan Bisnis Islam', 'Senat Fakultas', true),
('D01', 'DEMA-F Syariah', 'DEMA Fakultas', true),
('D02', 'DEMA-F Tarbiyah dan Ilmu Keguruan', 'DEMA Fakultas', true),
('D03', 'DEMA-F Ushuluddin Adab dan Dakwah', 'DEMA Fakultas', true),
('D04', 'DEMA-F Ekonomi dan Bisnis Islam', 'DEMA Fakultas', true),
('P01', 'HMPS Hukum Keluarga Islam', 'HMPS', true),
('P02', 'HMPS Hukum Ekonomi Syariah', 'HMPS', true),
('P03', 'HMPS Hukum Tata Negara', 'HMPS', true),
('P04', 'HMPS Hukum Bisnis', 'HMPS', true),
('P05', 'HMPS Pendidikan Agama Islam', 'HMPS', true),
('P06', 'HMPS Pendidikan Bahasa Arab', 'HMPS', true),
('P07', 'HMPS Pendidikan Guru Madrasah Ibtidaiyah', 'HMPS', true),
('P08', 'HMPS Pendidikan Islam Anak Usia Dini', 'HMPS', true),
('P09', 'HMPS Tadris Bahasa Inggris', 'HMPS', true),
('P10', 'HMPS Tadris Matematika', 'HMPS', true),
('P11', 'HMPS Tadris Bahasa Indonesia', 'HMPS', true),
('P12', 'HMPS Pendidikan Ilmu Pengetahuan Alam', 'HMPS', true),
('P13', 'HMPS Ilmu Al-Qur’an dan Tafsir', 'HMPS', true),
('P14', 'HMPS Ilmu Hadis', 'HMPS', true),
('P15', 'HMPS Tasawuf dan Psikoterapi', 'HMPS', true),
('P16', 'HMPS Komunikasi dan Penyiaran Islam', 'HMPS', true),
('P17', 'HMPS Bimbingan Penyuluhan Islam', 'HMPS', true),
('P18', 'HMPS Manajemen Dakwah', 'HMPS', true),
('P19', 'HMPS Ekonomi Syariah', 'HMPS', true),
('P20', 'HMPS Akuntansi Syariah', 'HMPS', true),
('P21', 'HMPS Perbankan Syariah', 'HMPS', true),
('P22', 'HMPS Sains Data', 'HMPS', true),
('P23', 'HMPS Bisnis Digital', 'HMPS', true),
('P24', 'HMPS Informatika', 'HMPS', true),
('P25', 'HMPS Gizi', 'HMPS', true),
('P26', 'HMPS Teknik', 'HMPS', true),
('M01', 'UKM SPEAC', 'UKM', true),
('M02', 'UKM Gemalawa', 'UKM', true),
('M03', 'UKM Kordais Nusa', 'UKM', true),
('M04', 'UKM El-Fata', 'UKM', true),
('M05', 'UKM LPTQ', 'UKM', true),
('M06', 'UKM Sport', 'UKM', true),
('M07', 'UKM Zenith', 'UKM', true),
('M08', 'UKM Sigma', 'UKM', true),
('M09', 'UKM Al-Mizan', 'UKM', true),
('M10', 'UKM Navi Film', 'UKM', true),
('M11', 'UKM Beladiri', 'UKM', true),
('M12', 'UKM Hafilah', 'UKM', true),
('M13', 'UKM Kaligrafi', 'UKM', true),
('K01', 'UKK Racana', 'UKK', true),
('K02', 'UKK MENWA', 'UKK', true),
('K03', 'UKK KSR PMI', 'UKK', true),
('K04', 'UKK KOPMA', 'UKK', true),
('MFS01', 'KSM-F Qiroatul Kutub', 'UKM-F Syariah', true),
('MFS02', 'KSM-F Peradilan Semu', 'UKM-F Syariah', true),
('MFS03', 'KSM-F Debat Hukum', 'UKM-F Syariah', true),
('MFS04', 'KSM-F Karya Tulis Ilmiah', 'UKM-F Syariah', true),
('MFE01', 'KSM-F Dycres', 'UKM-F Ekonomi dan Bisnis Islam', true),
('MFE02', 'KSM-F KSPMS', 'UKM-F Ekonomi dan Bisnis Islam', true),
('MFE03', 'KSM-F Kewirausahaan', 'UKM-F Ekonomi dan Bisnis Islam', true),
('MFE04', 'KSM-F Dustur Halal', 'UKM-F Ekonomi dan Bisnis Islam', true),
('MFU01', 'KSM-F Narashakti', 'UKM-F Ushuluddin Adab dan Dakwah', true),
('MFU02', 'KSM-F Tazkisoul', 'UKM-F Ushuluddin Adab dan Dakwah', true),
('MFU03', 'KSM-F Tsiqoh', 'UKM-F Ushuluddin Adab dan Dakwah', true),
('MFU04', 'UKM-F Al-Qolam', 'UKM-F Ushuluddin Adab dan Dakwah', true),
('MFU05', 'UKM-F ACTA', 'UKM-F Ushuluddin Adab dan Dakwah', true),
('MFT01', 'UKM-F Literasi', 'UKM-F Tarbiyah dan Ilmu Keguruan', true)
ON CONFLICT (kode) DO UPDATE SET 
    nama = EXCLUDED.nama,
    kategori = EXCLUDED.kategori,
    aktif = EXCLUDED.aktif;

-- =============================================================================
-- BAGIAN 6: PEMBUATAN AKUN PERTAMA (HMPS INFORMATIKA - P24) & ADMIN
-- =============================================================================

DO $$
DECLARE
    v_user_ti_id UUID;
    v_admin_id UUID;
    v_lembaga_ti_id UUID;
    v_periode_ti_id UUID;
BEGIN
    -- 1. Ambil ID Lembaga HMPS Informatika (P24)
    SELECT id INTO v_lembaga_ti_id FROM public.lembaga WHERE kode = 'P24';
    IF v_lembaga_ti_id IS NULL THEN
        RAISE EXCEPTION 'Lembaga HMPS Informatika (P24) tidak ditemukan di database';
    END IF;

    -- 2. Buat Periode Aktif untuk HMPS Informatika: Periode IV (Tahun 2026)
    SELECT id INTO v_periode_ti_id FROM public.periode 
    WHERE lembaga_id = v_lembaga_ti_id AND kode_romawi = 'IV';

    IF v_periode_ti_id IS NULL THEN
        INSERT INTO public.periode (lembaga_id, kode_romawi, tanggal_mulai, tanggal_selesai, aktif)
        VALUES (v_lembaga_ti_id, 'IV', '2026-01-01', '2026-12-31', true)
        RETURNING id INTO v_periode_ti_id;
    ELSE
        UPDATE public.periode SET aktif = true WHERE id = v_periode_ti_id;
    END IF;

    -- 3. Akun HMPS Informatika di auth.users
    SELECT id INTO v_user_ti_id FROM auth.users WHERE email = 'informatika@suratin.local';
    IF v_user_ti_id IS NULL THEN
        v_user_ti_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_user_ti_id, '00000000-0000-0000-0000-000000000000',
            'informatika@suratin.local',
            crypt('Informatika2026!', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"nama":"HMPS Informatika"}',
            now(), now(), 'authenticated', 'authenticated'
        );
    ELSE
        -- Update password jika user sudah pernah terdaftar
        UPDATE auth.users 
        SET encrypted_password = crypt('Informatika2026!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_ti_id;
    END IF;

    -- 4. Hubungkan ke profil lembaga
    INSERT INTO public.profil (user_id, lembaga_id, peran)
    VALUES (v_user_ti_id, v_lembaga_ti_id, 'lembaga')
    ON CONFLICT (user_id) DO UPDATE 
    SET lembaga_id = EXCLUDED.lembaga_id, peran = EXCLUDED.peran;

    -- 5. Akun Administrator Sistem
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@suratin.local';
    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
        ) VALUES (
            v_admin_id, '00000000-0000-0000-0000-000000000000',
            'admin@suratin.local',
            crypt('AdminSuratIn2026!', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"nama":"Administrator Surat-in"}',
            now(), now(), 'authenticated', 'authenticated'
        );
    ELSE
        UPDATE auth.users 
        SET encrypted_password = crypt('AdminSuratIn2026!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_admin_id;
    END IF;

    -- Hubungkan admin ke profil (lembaga_id = NULL)
    INSERT INTO public.profil (user_id, lembaga_id, peran)
    VALUES (v_admin_id, NULL, 'admin')
    ON CONFLICT (user_id) DO UPDATE 
    SET lembaga_id = NULL, peran = 'admin';

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'SETUP BERHASIL LENGKAP!';
    RAISE NOTICE 'AKUN HMPS INFORMATIKA:';
    RAISE NOTICE 'Email    : informatika@suratin.local';
    RAISE NOTICE 'Password : Informatika2026!';
    RAISE NOTICE 'Lembaga  : HMPS Informatika (P24)';
    RAISE NOTICE 'Periode  : Periode IV (Aktif)';
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'AKUN ADMINISTRATOR:';
    RAISE NOTICE 'Email    : admin@suratin.local';
    RAISE NOTICE 'Password : AdminSuratIn2026!';
    RAISE NOTICE '==================================================';
END $$;

