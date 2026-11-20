-- =============================================================================
-- Migrasi 002: Row Level Security (RLS) & Kebijakan Hak Akses
-- Sesuai Blueprint Aplikasi Sirkulasi Surat Masuk dan Keluar (Bagian 13 & 17)
-- =============================================================================

-- 1. AKTIFKAN RLS DI SEMUA TABEL
ALTER TABLE lembaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_jenis_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_penandatangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE penghitung ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengirim ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_perubahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE antrean_sinkron ENABLE ROW LEVEL SECURITY;

-- 2. CABUT HAK INSERT, UPDATE, DELETE LANGSUNG DARI PERAN KLIEN
-- Semua penulisan data WAJIB melalui fungsi RPC (SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- 3. HELPER FUNCTIONS UNTUK CEK AUTORISASI (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

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

-- 4. POLICIES SELECT: PROFIL
CREATE POLICY policy_profil_select ON profil
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR auth_peran() = 'admin');

-- 5. POLICIES SELECT: LEMBAGA
-- Admin bisa melihat semua lembaga; Lembaga hanya melihat lembaganya sendiri
CREATE POLICY policy_lembaga_select ON lembaga
    FOR SELECT TO authenticated
    USING (id = auth_lembaga_id() OR auth_peran() = 'admin');

-- 6. POLICIES SELECT: PERIODE
CREATE POLICY policy_periode_select ON periode
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id() OR auth_peran() = 'admin');

-- 7. POLICIES SELECT: REFERENSI (PUBLIK TERAUTENTIKASI)
CREATE POLICY policy_ref_jenis_surat_select ON ref_jenis_surat
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY policy_ref_penandatangan_select ON ref_penandatangan
    FOR SELECT TO authenticated
    USING (true);

-- 8. POLICIES SELECT: KEGIATAN KEPANITIAAN
CREATE POLICY policy_kegiatan_select ON kegiatan
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id() OR auth_peran() = 'admin');

-- 9. POLICIES SELECT: PENGHITUNG
CREATE POLICY policy_penghitung_select ON penghitung
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id() OR auth_peran() = 'admin');

-- 10. POLICIES SELECT: SURAT KELUAR
-- Sekretaris HANYA bisa membaca surat lembaganya sendiri (di semua periode).
-- Admin tidak membaca isi surat lembaga (default konservatif TBD-6).
CREATE POLICY policy_surat_keluar_select ON surat_keluar
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id());

-- 11. POLICIES SELECT: PENGIRIM
CREATE POLICY policy_pengirim_select ON pengirim
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id());

-- 12. POLICIES SELECT: SURAT MASUK
CREATE POLICY policy_surat_masuk_select ON surat_masuk
    FOR SELECT TO authenticated
    USING (lembaga_id = auth_lembaga_id());

-- 13. POLICIES SELECT: RIWAYAT PERUBAHAN
CREATE POLICY policy_riwayat_select ON riwayat_perubahan
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin' OR diubah_oleh = auth.uid());

-- 14. POLICIES SELECT: ANTREAN SINKRON
CREATE POLICY policy_antrean_sinkron_select ON antrean_sinkron
    FOR SELECT TO authenticated
    USING (auth_peran() = 'admin');

