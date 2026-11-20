export function bulanKeRomawi(bulan: number): string {
  const romawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  if (bulan >= 1 && bulan <= 12) {
    return romawi[bulan - 1];
  }
  return 'I';
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const [tahun, bulanStr, tanggal] = parts;
  const bulanNama = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const b = parseInt(bulanStr, 10);
  if (b >= 1 && b <= 12) {
    return `${parseInt(tanggal, 10)} ${bulanNama[b - 1]} ${tahun}`;
  }
  return dateStr;
}

export interface PratinjauNomorParams {
  format: 'lembaga' | 'kepanitiaan';
  kodeLembaga: string;
  kodePeriode: string;
  jenisSurat: string;
  penandatangan: string;
  tanggal: string; // YYYY-MM-DD
  kegiatanSingkatan?: string;
  kegiatanNomorSk?: string;
}

/**
 * Menghasilkan pratinjau format nomor surat sebelum disimpan ke database.
 * Nomor urut sementara dilambangkan dengan 'NN'.
 */
export function susunPratinjauNomor(params: PratinjauNomorParams): string {
  const {
    format,
    kodeLembaga,
    kodePeriode,
    jenisSurat,
    penandatangan,
    tanggal,
    kegiatanSingkatan,
    kegiatanNomorSk,
  } = params;

  let bulanRomawi = 'I';
  let tahun = '2026';

  if (tanggal && tanggal.includes('-')) {
    const parts = tanggal.split('-');
    if (parts.length === 3) {
      const b = parseInt(parts[1], 10);
      bulanRomawi = bulanKeRomawi(b);
      tahun = parts[0];
    }
  }

  const kodeUniv = kodeLembaga ? `${kodeLembaga}-Un` : 'KODE-Un';
  const periode = kodePeriode || 'PERIODE';
  const jenis = jenisSurat || '01';
  const ttd = penandatangan || 'A-0';

  if (format === 'lembaga') {
    // Format: NN.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
    return `NN.${kodeUniv}.${periode}.${jenis}.${ttd}.${bulanRomawi}.${tahun}`;
  } else {
    // Format: NN.Pan-XX.NomorSK.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
    const singkatan = kegiatanSingkatan || 'Pan-XX';
    const sk = kegiatanNomorSk || '01';
    return `NN.${singkatan}.${sk}.${kodeUniv}.${periode}.${jenis}.${ttd}.${bulanRomawi}.${tahun}`;
  }
}

