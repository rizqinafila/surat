-- =============================================================================
-- Migrasi 004: Utilitas & Pemantauan Sinkronisasi Google Sheets
-- Mendukung pengecekan status sinkronisasi per surat (FR-023 s.d. FR-026)
-- =============================================================================

-- 1. Berikan hak SELECT pada antrean_sinkron untuk surat milik lembaga pengguna
CREATE OR REPLACE FUNCTION public.cek_pemilik_surat_antrean(p_tabel TEXT, p_surat_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_lembaga_id UUID;
    v_pemilik_id UUID;
BEGIN
    SELECT lembaga_id INTO v_lembaga_id FROM public.profil WHERE user_id = auth.uid();
    IF v_lembaga_id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF p_tabel = 'surat_keluar' THEN
        SELECT lembaga_id INTO v_pemilik_id FROM public.surat_keluar WHERE id = p_surat_id;
    ELSIF p_tabel = 'surat_masuk' THEN
        SELECT lembaga_id INTO v_pemilik_id FROM public.surat_masuk WHERE id = p_surat_id;
    ELSE
        RETURN FALSE;
    END IF;

    RETURN v_pemilik_id = v_lembaga_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Policy agar pengguna lembaga bisa membaca status antrean sinkron surat mereka sendiri
DROP POLICY IF EXISTS policy_antrean_sinkron_select ON public.antrean_sinkron;
CREATE POLICY policy_antrean_sinkron_select ON public.antrean_sinkron
    FOR SELECT TO authenticated
    USING (
        auth_peran() = 'admin' 
        OR cek_pemilik_surat_antrean(tabel, surat_id)
    );

-- 2. RPC: Dapatkan status sinkronisasi terbaru per surat
CREATE OR REPLACE FUNCTION public.get_status_sinkron_surat(p_surat_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_status RECORD;
BEGIN
    SELECT status, aksi, percobaan, pesan_error, diperbarui_pada
    INTO v_status
    FROM public.antrean_sinkron
    WHERE surat_id = p_surat_id
    ORDER BY dibuat_pada DESC
    LIMIT 1;

    IF v_status.status IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'tidak_ada',
            'label', 'Belum Diantrekan'
        );
    END IF;

    RETURN jsonb_build_object(
        'status', v_status.status,
        'aksi', v_status.aksi,
        'percobaan', v_status.percobaan,
        'pesan_error', v_status.pesan_error,
        'diperbarui_pada', v_status.diperbarui_pada
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

