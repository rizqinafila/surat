-- =============================================================================
-- Seed Data: Data Master Referensi Awal
-- Sesuai Lampiran A Blueprint Aplikasi Sirkulasi Surat Masuk dan Keluar
-- =============================================================================

-- 1. DATA REFERENSI JENIS SURAT (A.3)
INSERT INTO public.ref_jenis_surat (kode, nama) VALUES
('01', 'Internal khusus (surat keputusan, undangan pengurus, peringatan, sertifikat)'),
('02', 'Internal umum (undangan dan pemberitahuan ke lembaga internal PM)'),
('03', 'Eksternal khusus (rekomendasi, audiensi pejabat kampus di luar PM)'),
('04', 'Eksternal umum (audiensi pemda, perizinan, untuk umum di luar PM)')
ON CONFLICT (kode) DO NOTHING;

-- 2. DATA REFERENSI PENANDATANGAN (A.4)
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

-- 3. DATA 67 LEMBAGA MAHASISWA (A.5)
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

