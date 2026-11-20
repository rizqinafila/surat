-- =============================================================================
-- Pengujian Due Diligence: 100 Pembuatan Nomor Beruntun & Pencegahan Nomor Ganda
-- Sesuai Blueprint Bagian 1 (Kriteria Sukses), 20 (Testing), dan 28 (Fase 0)
-- =============================================================================

DO $$
DECLARE
    v_test_lembaga_id UUID;
    v_test_periode_id UUID;
    v_test_user_id UUID := gen_random_uuid();
    v_hasil JSONB;
    v_nomor_urut INT;
    v_nomor_lengkap TEXT;
    v_total_surat INT;
    v_total_unik INT;
    i INT;
BEGIN
    RAISE NOTICE '=== MEMULAI PENGUJIAN 100 NOMOR BERUNTUN ===';

    -- 1. Setup Lembaga Uji & Periode Uji
    INSERT INTO public.lembaga (kode, nama, kategori, aktif)
    VALUES ('TEST99', 'Lembaga Uji Coba Cepat', 'HMPS', true)
    ON CONFLICT (kode) DO UPDATE SET aktif = true
    RETURNING id INTO v_test_lembaga_id;

    -- Nonaktifkan periode lama pada lembaga uji
    UPDATE public.periode SET aktif = false WHERE lembaga_id = v_test_lembaga_id;

    INSERT INTO public.periode (lembaga_id, kode_romawi, tanggal_mulai, tanggal_selesai, aktif)
    VALUES (v_test_lembaga_id, 'I', '2026-01-01', '2026-12-31', true)
    RETURNING id INTO v_test_periode_id;

    -- Simulasikan profil user uji
    DELETE FROM public.profil WHERE user_id = v_test_user_id;
    INSERT INTO public.profil (user_id, lembaga_id, peran)
    VALUES (v_test_user_id, v_test_lembaga_id, 'lembaga');

    -- Bersihkan surat uji sebelumnya
    DELETE FROM public.surat_keluar WHERE lembaga_id = v_test_lembaga_id;
    DELETE FROM public.penghitung WHERE lembaga_id = v_test_lembaga_id;

    -- 2. Jalankan 100 Pembuatan Nomor Beruntun
    FOR i IN 1..100 LOOP
        -- Naikkan counter secara atomic sesuai logika RPC
        INSERT INTO public.penghitung (
            lembaga_id, periode_id, kegiatan_id, jenis, nomor_terakhir, diperbarui_pada
        )
        VALUES (
            v_test_lembaga_id, v_test_periode_id, NULL, 'keluar_lembaga', 1, timezone('utc'::text, now())
        )
        ON CONFLICT (
            lembaga_id, periode_id, jenis, COALESCE(kegiatan_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
        DO UPDATE SET 
            nomor_terakhir = public.penghitung.nomor_terakhir + 1,
            diperbarui_pada = timezone('utc'::text, now())
        RETURNING nomor_terakhir INTO v_nomor_urut;

        v_nomor_lengkap := public.format_dua_digit(v_nomor_urut) || '.TEST99-Un.I.01.A-0.III.2026';

        INSERT INTO public.surat_keluar (
            lembaga_id, periode_id, format, nomor_urut, jenis_surat, penandatangan,
            tanggal, hal, alamat, nomor_lengkap, status
        )
        VALUES (
            v_test_lembaga_id, v_test_periode_id, 'lembaga', v_nomor_urut, '01', 'A-0',
            '2026-03-15', 'Uji Coba Beruntun ' || i, 'Tujuan Uji', v_nomor_lengkap, 'aktif'
        );
    END LOOP;

    -- 3. Verifikasi Keunikan
    SELECT COUNT(*), COUNT(DISTINCT nomor_lengkap)
    INTO v_total_surat, v_total_unik
    FROM public.surat_keluar
    WHERE lembaga_id = v_test_lembaga_id;

    RAISE NOTICE 'Total surat dibuat : %', v_total_surat;
    RAISE NOTICE 'Total nomor unik   : %', v_total_unik;

    IF v_total_surat = 100 AND v_total_unik = 100 THEN
        RAISE NOTICE '✅ PENGUJIAN 100 NOMOR BERUNTUN: LULUS (100% UNIK, 0 GANDA)';
    ELSE
        RAISE EXCEPTION '❌ PENGUJIAN GAGAL: Ditemukan nomor duplikat!';
    END IF;

    -- 4. Uji Batasan Unik di Database (Constraint Hardening)
    BEGIN
        -- Coba masukkan nomor_lengkap yang sama persis
        INSERT INTO public.surat_keluar (
            lembaga_id, periode_id, format, nomor_urut, jenis_surat, penandatangan,
            tanggal, hal, alamat, nomor_lengkap, status
        )
        VALUES (
            v_test_lembaga_id, v_test_periode_id, 'lembaga', 1, '01', 'A-0',
            '2026-03-15', 'Uji Coba Duplikat Ilegal', 'Tujuan Uji', '01.TEST99-Un.I.01.A-0.III.2026', 'aktif'
        );
        RAISE EXCEPTION '❌ PENGUJIAN GAGAL: Database membiarkan nomor ganda masuk!';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '✅ CONSTRAINT HARDENING: Database berhasil MENOLAK nomor ganda (unique_violation).';
    END;

    -- Cleanup data uji
    DELETE FROM public.surat_keluar WHERE lembaga_id = v_test_lembaga_id;
    DELETE FROM public.penghitung WHERE lembaga_id = v_test_lembaga_id;
    DELETE FROM public.periode WHERE lembaga_id = v_test_lembaga_id;
    DELETE FROM public.lembaga WHERE id = v_test_lembaga_id;
    DELETE FROM public.profil WHERE user_id = v_test_user_id;

    RAISE NOTICE '=== SEMUA PENGUJIAN DUE DILIGENCE BERHASIL LULUS ===';
END $$;

