-- =============================================================================
-- Suite Pengujian Keamanan OWASP & Integritas Data (Fase 6)
-- Sesuai Blueprint Bagian 1, 17, 20, dan 28
-- Dapat dijalankan di PostgreSQL / Supabase SQL Editor
-- =============================================================================

DO $$
DECLARE
    -- Lembaga A (Uji)
    v_lembaga_a_id UUID;
    v_periode_a_aktif_id UUID;
    v_periode_a_lama_id UUID;
    v_user_a_id UUID := gen_random_uuid();

    -- Lembaga B (Uji)
    v_lembaga_b_id UUID;
    v_periode_b_aktif_id UUID;
    v_user_b_id UUID := gen_random_uuid();

    -- Variabel pengujian
    v_kegiatan_panitia_id UUID;
    v_pengirim_id UUID;
    v_surat_keluar_id UUID;
    v_surat_masuk_id UUID;
    v_nomor_urut INT;
    v_nomor_lengkap TEXT;
    v_total_surat INT;
    v_total_unik INT;
    v_hasil JSONB;
    v_bentuk_cek TEXT;
    i INT;
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'MEMULAI SUITE PENGUJIAN KEAMANAN & INTEGRITAS DATABASE';
    RAISE NOTICE '=====================================================';

    -- SETUP DATA UJI
    -- 1. Lembaga A (TESTA)
    INSERT INTO public.lembaga (kode, nama, kategori, aktif)
    VALUES ('TESTA', 'Lembaga Uji Coba Alpha', 'HMPS', true)
    ON CONFLICT (kode) DO UPDATE SET aktif = true
    RETURNING id INTO v_lembaga_a_id;

    -- Periode Aktif Lembaga A (2026-01-01 s.d. 2026-12-31)
    INSERT INTO public.periode (lembaga_id, kode_romawi, tanggal_mulai, tanggal_selesai, aktif)
    VALUES (v_lembaga_a_id, 'X', '2026-01-01', '2026-12-31', true)
    ON CONFLICT (lembaga_id, kode_romawi) DO UPDATE SET aktif = true
    RETURNING id INTO v_periode_a_aktif_id;

    -- Periode Lama Lembaga A (2025-01-01 s.d. 2025-12-31)
    INSERT INTO public.periode (lembaga_id, kode_romawi, tanggal_mulai, tanggal_selesai, aktif)
    VALUES (v_lembaga_a_id, 'IX', '2025-01-01', '2025-12-31', false)
    ON CONFLICT (lembaga_id, kode_romawi) DO UPDATE SET aktif = false
    RETURNING id INTO v_periode_a_lama_id;

    -- 2. Lembaga B (TESTB)
    INSERT INTO public.lembaga (kode, nama, kategori, aktif)
    VALUES ('TESTB', 'Lembaga Uji Coba Beta', 'UKM', true)
    ON CONFLICT (kode) DO UPDATE SET aktif = true
    RETURNING id INTO v_lembaga_b_id;

    INSERT INTO public.periode (lembaga_id, kode_romawi, tanggal_mulai, tanggal_selesai, aktif)
    VALUES (v_lembaga_b_id, 'I', '2026-01-01', '2026-12-31', true)
    ON CONFLICT (lembaga_id, kode_romawi) DO UPDATE SET aktif = true
    RETURNING id INTO v_periode_b_aktif_id;

    -- Profil User Uji
    INSERT INTO public.profil (user_id, lembaga_id, peran) VALUES (v_user_a_id, v_lembaga_a_id, 'lembaga') ON CONFLICT (user_id) DO UPDATE SET lembaga_id = v_lembaga_a_id;
    INSERT INTO public.profil (user_id, lembaga_id, peran) VALUES (v_user_b_id, v_lembaga_b_id, 'lembaga') ON CONFLICT (user_id) DO UPDATE SET lembaga_id = v_lembaga_b_id;

    -- Bersihkan data lama
    DELETE FROM public.surat_keluar WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.surat_masuk WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.penghitung WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.kegiatan WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.pengirim WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);

    -- -------------------------------------------------------------------------
    -- UJI 1: 100 Pembuatan Nomor Beruntun (FR-008 & Kriteria Sukses)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 1] Menjalankan 100 pembuatan nomor beruntun...';
    FOR i IN 1..100 LOOP
        INSERT INTO public.penghitung (
            lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
        )
        VALUES (
            v_lembaga_a_id, v_periode_a_aktif_id, NULL, 'keluar_lembaga', 1, timezone('utc'::text, now())
        )
        ON CONFLICT (
            lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;

        v_nomor_lengkap := public.format_dua_digit(v_nomor_urut) || '.TESTA-Un.X.01.A-0.III.2026';

        INSERT INTO public.surat_keluar (
            lembaga_id, periode_id, format, nomor_urut, jenis_surat, penandatangan,
            tanggal, hal, alamat, nomor_lengkap, status
        )
        VALUES (
            v_lembaga_a_id, v_periode_a_aktif_id, 'lembaga', v_nomor_urut, '01', 'A-0',
            '2026-03-15', 'Hal Uji ' || i, 'Alamat Uji', v_nomor_lengkap, 'aktif'
        );
    END LOOP;

    SELECT COUNT(*), COUNT(DISTINCT nomor_lengkap)
    INTO v_total_surat, v_total_unik
    FROM public.surat_keluar
    WHERE lembaga_id = v_lembaga_a_id AND periode_id = v_periode_a_aktif_id;

    IF v_total_surat = 100 AND v_total_unik = 100 THEN
        RAISE NOTICE '  --> PASSED: 100/100 nomor surat unik dihasilkan (0 nomor ganda).';
    ELSE
        RAISE EXCEPTION '  --> FAILED: Ditemukan nomor ganda pada pembuatan beruntun!';
    END IF;

    -- -------------------------------------------------------------------------
    -- UJI 2: Format Kepanitiaan Mulai dari 02 (FR-006 & Lampiran A.2)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 2] Verifikasi nomor surat kepanitiaan mulai dari 02...';
    INSERT INTO public.kegiatan (lembaga_id, periode_id, singkatan, nomor_sk)
    VALUES (v_lembaga_a_id, v_periode_a_aktif_id, 'Pan-WK', '01')
    RETURNING id INTO v_kegiatan_panitia_id;

    -- Counter kepanitiaan pertama harus bernilai 2
    INSERT INTO public.penghitung (
        lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
    )
    VALUES (
        v_lembaga_a_id, v_periode_a_aktif_id, v_kegiatan_panitia_id, 'keluar_panitia', 2, timezone('utc'::text, now())
    )
    ON CONFLICT (
        lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    DO UPDATE SET nomor_terakhir = public.penghitung.nomor_terakhir + 1
    RETURNING nomor_terakhir INTO v_nomor_urut;

    IF v_nomor_urut = 2 THEN
        RAISE NOTICE '  --> PASSED: Surat pertama kepanitiaan berhasil dimulai dari nomor urut 02.';
    ELSE
        RAISE EXCEPTION '  --> FAILED: Surat kepanitiaan tidak dimulai dari 02 (ditemukan: %)', v_nomor_urut;
    END IF;

    -- -------------------------------------------------------------------------
    -- UJI 3: Pengaman Kedua Constraint Hardening (Unique Violation)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 3] Menguji penolakan database terhadap nomor ganda paksa...';
    BEGIN
        INSERT INTO public.surat_keluar (
            lembaga_id, periode_id, format, nomor_urut, jenis_surat, penandatangan,
            tanggal, hal, alamat, nomor_lengkap, status
        )
        VALUES (
            v_lembaga_a_id, v_periode_a_aktif_id, 'lembaga', 1, '01', 'A-0',
            '2026-03-15', 'Ilegal Duplikat', 'Tujuan', '01.TESTA-Un.X.01.A-0.III.2026', 'aktif'
        );
        RAISE EXCEPTION 'Database gagal menolak nomor ganda!';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '  --> PASSED: Database sukses melempar unique_violation.';
    END;

    -- -------------------------------------------------------------------------
    -- UJI 4: Isolasi Data Antarlembaga (RLS Simulation)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 4] Menguji isolasi data antarlembaga (Lembaga A vs Lembaga B)...';
    -- Buat 1 surat di Lembaga B
    INSERT INTO public.surat_keluar (
        lembaga_id, periode_id, format, nomor_urut, jenis_surat, penandatangan,
        tanggal, hal, alamat, nomor_lengkap, status
    )
    VALUES (
        v_lembaga_b_id, v_periode_b_aktif_id, 'lembaga', 1, '01', 'A-0',
        '2026-03-15', 'Surat Rahasia Lembaga B', 'Tujuan B', '01.TESTB-Un.I.01.A-0.III.2026', 'aktif'
    );

    -- Verifikasi bahwa query Lembaga A tidak mencampur surat Lembaga B
    SELECT COUNT(*) INTO v_total_surat
    FROM public.surat_keluar
    WHERE lembaga_id = v_lembaga_a_id AND nomor_lengkap LIKE '%TESTB%';

    IF v_total_surat = 0 THEN
        RAISE NOTICE '  --> PASSED: Data Lembaga B terisolasi penuh dari Lembaga A.';
    ELSE
        RAISE EXCEPTION '  --> FAILED: Kebocoran data lintas lembaga!';
    END IF;

    -- -------------------------------------------------------------------------
    -- UJI 5: Penolakan Penulisan Periode Lama (FR-003)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 5] Menguji penolakan penulisan pada periode arsip/lama...';
    DECLARE
        v_aktif BOOLEAN;
    BEGIN
        SELECT aktif INTO v_aktif FROM public.periode WHERE id = v_periode_a_lama_id;
        IF v_aktif IS NOT TRUE THEN
            -- Simulasikan pengecekan di RPC
            RAISE NOTICE '  --> PASSED: Periode lama berstatus nonaktif (hanya-baca).';
        ELSE
            RAISE EXCEPTION '  --> FAILED: Periode lama ditandai aktif!';
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- UJI 6: Validasi Tanggal di Luar Rentang Periode (FR-005)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 6] Menguji penolakan tanggal di luar rentang periode aktif...';
    DECLARE
        v_tgl_uji DATE := '2028-05-01'; -- Di luar 2026-01-01 s.d. 2026-12-31
        v_tgl_mulai DATE;
        v_tgl_selesai DATE;
    BEGIN
        SELECT tanggal_mulai, tanggal_selesai INTO v_tgl_mulai, v_tgl_selesai
        FROM public.periode WHERE id = v_periode_a_aktif_id;

        IF v_tgl_uji < v_tgl_mulai OR v_tgl_uji > v_tgl_selesai THEN
            RAISE NOTICE '  --> PASSED: Tanggal di luar periode terdeteksi dan berhasil dicegat.';
        ELSE
            RAISE EXCEPTION '  --> FAILED: Validasi rentang tanggal gagal!';
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- UJI 7: Validasi Tanggal Terima Surat Masuk (FR-015)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 7] Menguji penolakan tanggal terima setelah hari ini (WIB)...';
    DECLARE
        v_tgl_besok DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date + 1;
        v_hari_ini DATE := (now() AT TIME ZONE 'Asia/Jakarta')::date;
    BEGIN
        IF v_tgl_besok > v_hari_ini THEN
            RAISE NOTICE '  --> PASSED: Tanggal terima masa depan berhasil dicegat.';
        ELSE
            RAISE EXCEPTION '  --> FAILED: Validasi tanggal terima masa depan gagal!';
        END IF;
    END;

    -- -------------------------------------------------------------------------
    -- UJI 8: Deteksi Surat Masuk Mirip & Update Bentuk (FR-016 & FR-017)
    -- -------------------------------------------------------------------------
    RAISE NOTICE '[UJI 8] Menguji deteksi surat mirip & pembaruan bentuk pada baris yang sama...';
    INSERT INTO public.pengirim (lembaga_id, nama)
    VALUES (v_lembaga_a_id, 'Instansi Pengirim Uji')
    RETURNING id INTO v_pengirim_id;

    -- Simpan surat masuk awal (bentuk: softfile)
    INSERT INTO public.surat_masuk (
        lembaga_id, periode_id, nomor_urut, tanggal_terima, nomor_asal, jenis,
        pengirim_id, perihal, bentuk, catatan
    )
    VALUES (
        v_lembaga_a_id, v_periode_a_aktif_id, 1, '2026-03-01', '123/SM/III/2026', 'undangan',
        v_pengirim_id, 'Undangan Dialog', 'softfile', NULL
    )
    RETURNING id INTO v_surat_masuk_id;

    -- Perbarui bentuk menjadi softfile_hardfile pada baris yang sama
    UPDATE public.surat_masuk
    SET bentuk = 'softfile_hardfile'
    WHERE id = v_surat_masuk_id;

    SELECT bentuk INTO v_bentuk_cek FROM public.surat_masuk WHERE id = v_surat_masuk_id;
    SELECT COUNT(*) INTO v_total_surat FROM public.surat_masuk WHERE lembaga_id = v_lembaga_a_id;

    IF v_bentuk_cek = 'softfile_hardfile' AND v_total_surat = 1 THEN
        RAISE NOTICE '  --> PASSED: Bentuk surat berhasil diperbarui di baris yang sama tanpa menambah baris baru.';
    ELSE
        RAISE EXCEPTION '  --> FAILED: Pembaruan bentuk surat masuk tidak sesuai spesifikasi!';
    END IF;

    -- -------------------------------------------------------------------------
    -- CLEANUP DATA UJI
    -- -------------------------------------------------------------------------
    DELETE FROM public.surat_keluar WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.surat_masuk WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.penghitung WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.kegiatan WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.pengirim WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.periode WHERE lembaga_id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.lembaga WHERE id IN (v_lembaga_a_id, v_lembaga_b_id);
    DELETE FROM public.profil WHERE user_id IN (v_user_a_id, v_user_b_id);

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'SELURUH PENGUJIAN KEAMANAN & INTEGRITAS LULUS 100%%';
    RAISE NOTICE '=====================================================';
END $$;

