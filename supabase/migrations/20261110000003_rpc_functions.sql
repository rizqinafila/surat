-- =============================================================================
-- Migrasi 003: Fungsi Database (RPC)
-- Sesuai Blueprint Aplikasi Sirkulasi Surat Masuk dan Keluar (Bagian 13 & 14)
-- Seluruh fungsi penulisan berstatus SECURITY DEFINER dengan search_path terkontrol
-- =============================================================================

-- 1. FUNGSI PEMBANTU: KONVERSI BULAN KE ROMAWI
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

-- 2. FUNGSI PEMBANTU: FORMAT NOMOR DUA DIGIT
CREATE OR REPLACE FUNCTION public.format_dua_digit(p_nomor INT)
RETURNS TEXT AS $$
BEGIN
    IF p_nomor < 10 THEN
        RETURN LPAD(p_nomor::TEXT, 2, '0');
    ELSE
        RETURN p_nomor::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. RPC: BUAT NOMOR SURAT KELUAR
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
    v_periode_id UUID;
    v_kode_periode TEXT;
    v_tgl_mulai DATE;
    v_tgl_selesai DATE;
    v_kegiatan_singkatan TEXT;
    v_kegiatan_sk TEXT;
    v_nomor_urut INT;
    v_bulan_romawi TEXT;
    v_tahun TEXT;
    v_nomor_lengkap TEXT;
    v_surat_id UUID;
BEGIN
    -- 1. Validasi Autentikasi
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    -- 2. Dapatkan Lembaga Pengguna
    SELECT p.lembaga_id, l.kode 
    INTO v_lembaga_id, v_kode_lembaga
    FROM public.profil p
    JOIN public.lembaga l ON l.id = p.lembaga_id
    WHERE p.user_id = v_user_id;

    IF v_lembaga_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Akun tidak terhubung dengan lembaga manapun.';
    END IF;

    -- 3. Dapatkan Periode Aktif Lembaga
    SELECT id, kode_romawi, tanggal_mulai, tanggal_selesai
    INTO v_periode_id, v_kode_periode, v_tgl_mulai, v_tgl_selesai
    FROM public.periode
    WHERE lembaga_id = v_lembaga_id AND aktif = TRUE;

    IF v_periode_id IS NULL THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Tidak ada periode kepengurusan aktif.';
    END IF;

    -- 4. Validasi Tanggal Berada di Rentang Periode Aktif
    IF p_tanggal < v_tgl_mulai OR p_tanggal > v_tgl_selesai THEN
        RAISE EXCEPTION 'TANGGAL_DI_LUAR_PERIODE: Tanggal surat berada di luar periode kepengurusan aktif.';
    END IF;

    -- 5. Validasi dan Persiapan Kepanitiaan
    IF p_format = 'kepanitiaan' THEN
        IF p_kegiatan_id IS NULL THEN
            RAISE EXCEPTION 'DATA_TIDAK_VALID: Surat kepanitiaan wajib memilih kegiatan.';
        END IF;

        SELECT singkatan, nomor_sk
        INTO v_kegiatan_singkatan, v_kegiatan_sk
        FROM public.kegiatan
        WHERE id = p_kegiatan_id AND lembaga_id = v_lembaga_id AND periode_id = v_periode_id;

        IF v_kegiatan_singkatan IS NULL THEN
            RAISE EXCEPTION 'DATA_TIDAK_VALID: Kegiatan tidak ditemukan atau bukan milik periode aktif.';
        END IF;
    END IF;

    -- 6. Naikkan Penghitung (Atomic Upsert)
    IF p_format = 'lembaga' THEN
        INSERT INTO public.penghitung (
            lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
        )
        VALUES (
            v_lembaga_id, v_periode_id, NULL, 'keluar_lembaga', 1, timezone('utc'::text, now())
        )
        ON CONFLICT (
            lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;
    ELSE
        -- Kepanitiaan: nomor urut pertama adalah 02 (01 dicadangkan untuk sertifikat)
        INSERT INTO public.penghitung (
            lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
        )
        VALUES (
            v_lembaga_id, v_periode_id, p_kegiatan_id, 'keluar_panitia', 2, timezone('utc'::text, now())
        )
        ON CONFLICT (
            lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;
    END IF;

    -- 7. Susun Nomor Surat Lengkap
    v_bulan_romawi := public.bulan_ke_romawi(EXTRACT(MONTH FROM p_tanggal)::INT);
    v_tahun := EXTRACT(YEAR FROM p_tanggal)::TEXT;

    IF p_format = 'lembaga' THEN
        -- Format: NN.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
        v_nomor_lengkap := public.format_dua_digit(v_nomor_urut) || '.' ||
                           v_kode_lembaga || '-Un.' ||
                           v_kode_periode || '.' ||
                           p_jenis_surat || '.' ||
                           p_penandatangan || '.' ||
                           v_bulan_romawi || '.' ||
                           v_tahun;
    ELSE
        -- Format: NN.Pan-XX.NomorSK.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
        v_nomor_lengkap := public.format_dua_digit(v_nomor_urut) || '.' ||
                           v_kegiatan_singkatan || '.' ||
                           v_kegiatan_sk || '.' ||
                           v_kode_lembaga || '-Un.' ||
                           v_kode_periode || '.' ||
                           p_jenis_surat || '.' ||
                           p_penandatangan || '.' ||
                           v_bulan_romawi || '.' ||
                           v_tahun;
    END IF;

    -- 8. Simpan ke Tabel surat_keluar
    INSERT INTO public.surat_keluar (
        lembaga_id,
        periode_id,
        kegiatan_id,
        format,
        nomor_urut,
        jenis_surat,
        penandatangan,
        tanggal,
        hal,
        alamat,
        nomor_lengkap,
        status
    )
    VALUES (
        v_lembaga_id,
        v_periode_id,
        p_kegiatan_id,
        p_format,
        v_nomor_urut,
        p_jenis_surat,
        p_penandatangan,
        p_tanggal,
        p_hal,
        p_alamat,
        v_nomor_lengkap,
        'aktif'
    )
    RETURNING id INTO v_surat_id;

    -- 9. Catat ke Antrean Sinkronisasi Google Sheets
    INSERT INTO public.antrean_sinkron (
        tabel,
        surat_id,
        aksi,
        status
    )
    VALUES (
        'surat_keluar',
        v_surat_id,
        'tambah',
        'menunggu'
    );

    -- 10. Kembalikan Hasil
    RETURN jsonb_build_object(
        'id', v_surat_id,
        'nomor_urut', v_nomor_urut,
        'nomor_lengkap', v_nomor_lengkap,
        'status', 'aktif'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 4. RPC: EDIT SURAT KELUAR
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
    v_lembaga_id UUID;
    v_surat RECORD;
    v_periode RECORD;
    v_kegiatan RECORD;
    v_kode_lembaga TEXT;
    v_nomor_lama TEXT;
    v_nomor_baru TEXT;
    v_bulan_romawi TEXT;
    v_tahun TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;

    -- Dapatkan surat eksisting
    SELECT * INTO v_surat FROM public.surat_keluar WHERE id = p_id;
    IF v_surat.id IS NULL THEN
        RAISE EXCEPTION 'DATA_TIDAK_DITEMUKAN: Surat keluar tidak ditemukan.';
    END IF;

    IF v_surat.lembaga_id <> v_lembaga_id THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Surat bukan milik lembaga Anda.';
    END IF;

    -- Verifikasi periode surat adalah periode aktif
    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Surat di periode lama bersifat hanya baca.';
    END IF;

    -- Validasi tanggal baru harus dalam periode aktif
    IF p_tanggal < v_periode.tanggal_mulai OR p_tanggal > v_periode.tanggal_selesai THEN
        RAISE EXCEPTION 'TANGGAL_DI_LUAR_PERIODE: Tanggal surat berada di luar periode kepengurusan aktif.';
    END IF;

    -- Dapatkan kode lembaga
    SELECT kode INTO v_kode_lembaga FROM public.lembaga WHERE id = v_lembaga_id;

    -- Susun ulang nomor surat lengkap
    v_bulan_romawi := public.bulan_ke_romawi(EXTRACT(MONTH FROM p_tanggal)::INT);
    v_tahun := EXTRACT(YEAR FROM p_tanggal)::TEXT;
    v_nomor_lama := v_surat.nomor_lengkap;

    IF v_surat.format = 'lembaga' THEN
        v_nomor_baru := public.format_dua_digit(v_surat.nomor_urut) || '.' ||
                        v_kode_lembaga || '-Un.' ||
                        v_periode.kode_romawi || '.' ||
                        p_jenis_surat || '.' ||
                        p_penandatangan || '.' ||
                        v_bulan_romawi || '.' ||
                        v_tahun;
    ELSE
        SELECT singkatan, nomor_sk INTO v_kegiatan 
        FROM public.kegiatan WHERE id = v_surat.kegiatan_id;

        v_nomor_baru := public.format_dua_digit(v_surat.nomor_urut) || '.' ||
                        v_kegiatan.singkatan || '.' ||
                        v_kegiatan.nomor_sk || '.' ||
                        v_kode_lembaga || '-Un.' ||
                        v_periode.kode_romawi || '.' ||
                        p_jenis_surat || '.' ||
                        p_penandatangan || '.' ||
                        v_bulan_romawi || '.' ||
                        v_tahun;
    END IF;

    -- Catat riwayat perubahan
    INSERT INTO public.riwayat_perubahan (
        tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru
    )
    VALUES (
        'surat_keluar',
        v_surat.id,
        v_user_id,
        to_jsonb(v_surat),
        jsonb_build_object(
            'jenis_surat', p_jenis_surat,
            'penandatangan', p_penandatangan,
            'tanggal', p_tanggal,
            'hal', COALESCE(p_hal, v_surat.hal),
            'alamat', COALESCE(p_alamat, v_surat.alamat),
            'nomor_lengkap', v_nomor_baru
        )
    );

    -- Perbarui tabel surat_keluar
    UPDATE public.surat_keluar
    SET jenis_surat = p_jenis_surat,
        penandatangan = p_penandatangan,
        tanggal = p_tanggal,
        hal = COALESCE(p_hal, hal),
        alamat = COALESCE(p_alamat, alamat),
        nomor_lengkap = v_nomor_baru,
        diubah_pada = timezone('utc'::text, now())
    WHERE id = p_id;

    -- Masukkan ke antrean sinkron
    INSERT INTO public.antrean_sinkron (tabel, surat_id, aksi, status)
    VALUES ('surat_keluar', p_id, 'perbarui', 'menunggu');

    RETURN jsonb_build_object(
        'id', p_id,
        'nomor_lama', v_nomor_lama,
        'nomor_baru', v_nomor_baru
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 5. RPC: BATALKAN SURAT KELUAR
CREATE OR REPLACE FUNCTION public.batalkan_surat_keluar(p_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_surat RECORD;
    v_periode RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;

    SELECT * INTO v_surat FROM public.surat_keluar WHERE id = p_id;
    IF v_surat.id IS NULL THEN
        RAISE EXCEPTION 'DATA_TIDAK_DITEMUKAN: Surat keluar tidak ditemukan.';
    END IF;

    IF v_surat.lembaga_id <> v_lembaga_id THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Surat bukan milik lembaga Anda.';
    END IF;

    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Surat di periode lama bersifat hanya baca.';
    END IF;

    -- Catat riwayat pembatalan
    INSERT INTO public.riwayat_perubahan (tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru)
    VALUES (
        'surat_keluar',
        p_id,
        v_user_id,
        jsonb_build_object('status', v_surat.status),
        jsonb_build_object('status', 'dibatalkan')
    );

    UPDATE public.surat_keluar
    SET status = 'dibatalkan',
        diubah_pada = timezone('utc'::text, now())
    WHERE id = p_id;

    -- Masukkan ke antrean sinkronisasi
    INSERT INTO public.antrean_sinkron (tabel, surat_id, aksi, status)
    VALUES ('surat_keluar', p_id, 'batalkan', 'menunggu');

    RETURN jsonb_build_object(
        'id', p_id,
        'status', 'dibatalkan'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 6. RPC: BUAT KEGIATAN KEPANITIAAN
CREATE OR REPLACE FUNCTION public.buat_kegiatan(
    p_singkatan TEXT,
    p_nomor_sk TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_periode_id UUID;
    v_kegiatan_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    IF v_lembaga_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Akun tidak terhubung dengan lembaga.';
    END IF;

    SELECT id INTO v_periode_id FROM public.periode WHERE lembaga_id = v_lembaga_id AND aktif = TRUE;
    IF v_periode_id IS NULL THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Tidak ada periode aktif.';
    END IF;

    INSERT INTO public.kegiatan (lembaga_id, periode_id, singkatan, nomor_sk)
    VALUES (v_lembaga_id, v_periode_id, trim(p_singkatan), trim(p_nomor_sk))
    RETURNING id INTO v_kegiatan_id;

    RETURN jsonb_build_object(
        'id', v_kegiatan_id,
        'singkatan', trim(p_singkatan),
        'nomor_sk', trim(p_nomor_sk)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 7. RPC: CARI SURAT MASUK MIRIP
CREATE OR REPLACE FUNCTION public.cari_surat_masuk_mirip(
    p_nomor_asal TEXT,
    p_pengirim_id UUID
)
RETURNS TABLE (
    id UUID,
    nomor_urut INT,
    tanggal_terima DATE,
    nomor_asal TEXT,
    bentuk bentuk_surat_masuk
) AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_periode_id UUID;
    v_norm_nomor TEXT;
BEGIN
    v_user_id := auth.uid();
    SELECT profil.lembaga_id INTO v_lembaga_id FROM public.profil WHERE profil.user_id = v_user_id;
    SELECT periode.id INTO v_periode_id FROM public.periode WHERE periode.lembaga_id = v_lembaga_id AND periode.aktif = TRUE;

    v_norm_nomor := regexp_replace(lower(trim(p_nomor_asal)), '\s+', ' ', 'g');

    RETURN QUERY
    SELECT sm.id, sm.nomor_urut, sm.tanggal_terima, sm.nomor_asal, sm.bentuk
    FROM public.surat_masuk sm
    WHERE sm.lembaga_id = v_lembaga_id
      AND sm.periode_id = v_periode_id
      AND sm.pengirim_id = p_pengirim_id
      AND regexp_replace(lower(trim(sm.nomor_asal)), '\s+', ' ', 'g') = v_norm_nomor;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 8. RPC: CATAT SURAT MASUK
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
    v_periode_id UUID;
    v_tgl_mulai DATE;
    v_tgl_selesai DATE;
    v_hari_ini_wib DATE;
    v_nomor_urut INT;
    v_surat_id UUID;
    v_ada_mirip INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;
    IF v_lembaga_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Akun tidak terhubung dengan lembaga.';
    END IF;

    SELECT id, tanggal_mulai, tanggal_selesai
    INTO v_periode_id, v_tgl_mulai, v_tgl_selesai
    FROM public.periode
    WHERE lembaga_id = v_lembaga_id AND aktif = TRUE;

    IF v_periode_id IS NULL THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Tidak ada periode aktif.';
    END IF;

    -- Validasi Tanggal Terima tidak boleh setelah hari ini (WIB)
    v_hari_ini_wib := (now() AT TIME ZONE 'Asia/Jakarta')::date;
    IF p_tanggal_terima > v_hari_ini_wib THEN
        RAISE EXCEPTION 'TANGGAL_SETELAH_HARI_INI: Tanggal terima tidak boleh setelah hari ini.';
    END IF;

    -- Validasi Tanggal Terima di rentang periode aktif
    IF p_tanggal_terima < v_tgl_mulai OR p_tanggal_terima > v_tgl_selesai THEN
        RAISE EXCEPTION 'TANGGAL_DI_LUAR_PERIODE: Tanggal terima berada di luar periode aktif.';
    END IF;

    -- Deteksi surat mirip jika tidak dipaksa baru
    IF p_paksa_baru IS NOT TRUE THEN
        SELECT COUNT(*) INTO v_ada_mirip
        FROM public.cari_surat_masuk_mirip(p_nomor_asal, p_pengirim_id);

        IF v_ada_mirip > 0 THEN
            RAISE EXCEPTION 'SURAT_MIRIP: Ditemukan surat masuk dengan nomor dan pengirim yang sama.';
        END IF;
    END IF;

    -- Naikkan nomor urut surat masuk
    INSERT INTO public.penghitung (
        lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
    )
    VALUES (
        v_lembaga_id, v_periode_id, NULL, 'masuk', 1, timezone('utc'::text, now())
    )
    ON CONFLICT (
        lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    DO UPDATE SET 
        nomor_terakhir = public.penghitung.nomor_terakhir + 1,
        diperbarui_pada = timezone('utc'::text, now())
    RETURNING nomor_terakhir INTO v_nomor_urut;

    -- Simpan surat masuk
    INSERT INTO public.surat_masuk (
        lembaga_id,
        periode_id,
        nomor_urut,
        tanggal_terima,
        nomor_asal,
        jenis,
        pengirim_id,
        perihal,
        bentuk,
        catatan
    )
    VALUES (
        v_lembaga_id,
        v_periode_id,
        v_nomor_urut,
        p_tanggal_terima,
        trim(p_nomor_asal),
        p_jenis,
        p_pengirim_id,
        trim(p_perihal),
        p_bentuk,
        p_catatan
    )
    RETURNING id INTO v_surat_id;

    -- Catat ke antrean sinkronisasi
    INSERT INTO public.antrean_sinkron (tabel, surat_id, aksi, status)
    VALUES ('surat_masuk', v_surat_id, 'tambah', 'menunggu');

    RETURN jsonb_build_object(
        'id', v_surat_id,
        'nomor_urut', v_nomor_urut
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 9. RPC: PERBARUI BENTUK SURAT MASUK
CREATE OR REPLACE FUNCTION public.perbarui_bentuk_surat_masuk(
    p_id UUID,
    p_bentuk_baru bentuk_surat_masuk
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_lembaga_id UUID;
    v_surat RECORD;
    v_periode RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'TIDAK_TERAUTENTIKASI: Sesi tidak ditemukan.';
    END IF;

    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = v_user_id;

    SELECT * INTO v_surat FROM public.surat_masuk WHERE id = p_id;
    IF v_surat.id IS NULL THEN
        RAISE EXCEPTION 'DATA_TIDAK_DITEMUKAN: Surat masuk tidak ditemukan.';
    END IF;

    IF v_surat.lembaga_id <> v_lembaga_id THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Surat bukan milik lembaga Anda.';
    END IF;

    SELECT * INTO v_periode FROM public.periode WHERE id = v_surat.periode_id;
    IF v_periode.aktif IS NOT TRUE THEN
        RAISE EXCEPTION 'PERIODE_TIDAK_AKTIF: Periode lama bersifat hanya baca.';
    END IF;

    -- Catat riwayat
    INSERT INTO public.riwayat_perubahan (tabel, surat_id, diubah_oleh, nilai_lama, nilai_baru)
    VALUES (
        'surat_masuk',
        p_id,
        v_user_id,
        jsonb_build_object('bentuk', v_surat.bentuk),
        jsonb_build_object('bentuk', p_bentuk_baru)
    );

    UPDATE public.surat_masuk
    SET bentuk = p_bentuk_baru
    WHERE id = p_id;

    INSERT INTO public.antrean_sinkron (tabel, surat_id, aksi, status)
    VALUES ('surat_masuk', p_id, 'perbarui', 'menunggu');

    RETURN jsonb_build_object(
        'id', p_id,
        'bentuk', p_bentuk_baru
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 10. RPC: ADMIN GANTI PERIODE AKTIF
CREATE OR REPLACE FUNCTION public.admin_ganti_periode_aktif(
    p_lembaga_id UUID,
    p_periode_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_peran peran_user;
BEGIN
    SELECT peran INTO v_peran FROM public.profil WHERE user_id = auth.uid();
    IF v_peran <> 'admin' THEN
        RAISE EXCEPTION 'TIDAK_BERHAK: Hanya administrator yang dapat mengganti periode aktif.';
    END IF;

    -- Nonaktifkan semua periode untuk lembaga tersebut
    UPDATE public.periode
    SET aktif = FALSE
    WHERE lembaga_id = p_lembaga_id;

    -- Aktifkan periode yang dipilih
    UPDATE public.periode
    SET aktif = TRUE
    WHERE id = p_periode_id AND lembaga_id = p_lembaga_id;

    RETURN jsonb_build_object(
        'lembaga_id', p_lembaga_id,
        'periode_aktif_id', p_periode_id,
        'sukses', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

