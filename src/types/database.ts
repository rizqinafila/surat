export type PeranUser = 'admin' | 'lembaga';
export type KelompokPenandatangan = 'lembaga' | 'kepanitiaan';
export type JenisPenghitung = 'keluar_lembaga' | 'keluar_panitia' | 'masuk';
export type FormatSuratKeluar = 'lembaga' | 'kepanitiaan';
export type StatusSuratKeluar = 'aktif' | 'dibatalkan';
export type JenisSuratMasuk = 'undangan' | 'pemberitahuan';
export type BentukSuratMasuk = 'softfile' | 'hardfile' | 'softfile_hardfile';
export type AksiSinkron = 'tambah' | 'perbarui' | 'batalkan';
export type StatusSinkron = 'menunggu' | 'berhasil' | 'gagal';

export interface Lembaga {
  id: string;
  nama: string;
  kode: string;
  kategori: string;
  spreadsheet_id: string | null;
  aktif: boolean;
}

export interface Periode {
  id: string;
  lembaga_id: string;
  kode_romawi: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
}

export interface Profil {
  user_id: string;
  lembaga_id: string | null;
  peran: PeranUser;
}

export interface RefJenisSurat {
  kode: string;
  nama: string;
}

export interface RefPenandatangan {
  kode: string;
  nama: string;
  kelompok: KelompokPenandatangan;
}

export interface Kegiatan {
  id: string;
  lembaga_id: string;
  periode_id: string;
  singkatan: string;
  nomor_sk: string;
}

export interface Penghitung {
  id: string;
  lembaga_id: string;
  periode_id: string;
  kegiatan_id: string | null;
  jenis: JenisPenghitung;
  nomor_terakhir: number;
}

export interface SuratKeluar {
  id: string;
  lembaga_id: string;
  periode_id: string;
  kegiatan_id: string | null;
  format: FormatSuratKeluar;
  nomor_urut: number;
  jenis_surat: string;
  penandatangan: string;
  tanggal: string;
  hal: string;
  alamat: string;
  nomor_lengkap: string;
  status: StatusSuratKeluar;
  dibuat_pada: string;
  diubah_pada: string;
}

export interface Pengirim {
  id: string;
  lembaga_id: string;
  nama: string;
}

export interface SuratMasuk {
  id: string;
  lembaga_id: string;
  periode_id: string;
  nomor_urut: number;
  tanggal_terima: string;
  nomor_asal: string;
  jenis: JenisSuratMasuk;
  pengirim_id: string;
  perihal: string;
  bentuk: BentukSuratMasuk;
  catatan: string | null;
  dicatat_pada: string;
}

export interface RiwayatPerubahan {
  id: string;
  tabel: string;
  surat_id: string;
  waktu: string;
  diubah_oleh: string;
  nilai_lama: Record<string, unknown>;
  nilai_baru: Record<string, unknown>;
}

export interface AntreanSinkron {
  id: string;
  tabel: string;
  surat_id: string;
  aksi: AksiSinkron;
  status: StatusSinkron;
  percobaan: number;
  pesan_error: string | null;
  dibuat_pada: string;
  diperbarui_pada: string;
}

// RPC Parameter & Response types
export interface BuatNomorSuratKeluarParams {
  p_format: FormatSuratKeluar;
  p_kegiatan_id?: string | null;
  p_jenis_surat: string;
  p_penandatangan: string;
  p_tanggal: string; // YYYY-MM-DD
  p_hal: string;
  p_alamat: string;
}

export interface BuatNomorSuratKeluarResult {
  id: string;
  nomor_urut: number;
  nomor_lengkap: string;
  status: StatusSuratKeluar;
}

export interface EditSuratKeluarParams {
  p_id: string;
  p_jenis_surat: string;
  p_penandatangan: string;
  p_tanggal: string; // YYYY-MM-DD
}

export interface EditSuratKeluarResult {
  id: string;
  nomor_lama: string;
  nomor_baru: string;
}

export interface CatatSuratMasukParams {
  p_tanggal_terima: string; // YYYY-MM-DD
  p_nomor_asal: string;
  p_jenis: JenisSuratMasuk;
  p_pengirim_id: string;
  p_perihal: string;
  p_bentuk: BentukSuratMasuk;
  p_catatan?: string | null;
  p_paksa_baru?: boolean;
}

export interface CatatSuratMasukResult {
  id: string;
  nomor_urut: number;
}

