import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

/**
 * Utilitas Ekspor Data Surat ke File Excel (.xlsx)
 * Menggantikan sinkronisasi Google Sheets agar aplikasi 100% gratis.
 *
 * Data diambil langsung dari Supabase PostgreSQL (sumber kebenaran utama),
 * diformat ke dalam workbook Excel dengan tab terpisah, lalu dibagikan
 * melalui mekanisme native sharing Android.
 */

interface ExportOptions {
  lembagaId: string;
  periodeId: string;
  kodeLembaga: string;
  namaPeriode: string;
}

/**
 * Ekspor seluruh data surat (keluar & masuk) pada satu periode
 * ke dalam satu file Excel dengan 2+ tab (sheet).
 */
export async function eksporSuratKeExcel(options: ExportOptions): Promise<void> {
  const { lembagaId, periodeId, kodeLembaga, namaPeriode } = options;

  // 1. Ambil data surat keluar
  const { data: suratKeluar, error: errKeluar } = await supabase
    .from('surat_keluar')
    .select('nomor_urut, nomor_lengkap, tanggal, hal, alamat, jenis_surat, penandatangan, format, status')
    .eq('lembaga_id', lembagaId)
    .eq('periode_id', periodeId)
    .order('nomor_urut', { ascending: true });

  if (errKeluar) throw new Error(`Gagal mengambil data surat keluar: ${errKeluar.message}`);

  // 2. Ambil data surat masuk beserta nama pengirim
  const { data: suratMasuk, error: errMasuk } = await supabase
    .from('surat_masuk')
    .select('nomor_urut, tanggal_terima, nomor_asal, jenis, pengirim_id, perihal, bentuk, catatan')
    .eq('lembaga_id', lembagaId)
    .eq('periode_id', periodeId)
    .order('nomor_urut', { ascending: true });

  if (errMasuk) throw new Error(`Gagal mengambil data surat masuk: ${errMasuk.message}`);

  // 3. Ambil daftar pengirim untuk resolusi nama
  const { data: pengirimList } = await supabase
    .from('pengirim')
    .select('id, nama')
    .eq('lembaga_id', lembagaId);

  const pengirimMap = new Map<string, string>();
  if (pengirimList) {
    for (const p of pengirimList) {
      pengirimMap.set(p.id, p.nama);
    }
  }

  // 4. Susun worksheet Surat Keluar
  const headerKeluar = ['No', 'Nomor Surat', 'Tanggal Surat', 'Hal', 'Alamat Surat', 'Jenis', 'Penandatangan', 'Format', 'Status'];
  const rowsKeluar = (suratKeluar ?? []).map((s) => [
    s.nomor_urut,
    s.nomor_lengkap,
    s.tanggal,
    s.hal,
    s.alamat,
    s.jenis_surat,
    s.penandatangan,
    s.format === 'kepanitiaan' ? 'Kepanitiaan' : 'Lembaga',
    s.status === 'dibatalkan' ? 'DIBATALKAN' : 'Aktif',
  ]);

  const wsKeluar = XLSX.utils.aoa_to_sheet([headerKeluar, ...rowsKeluar]);

  // Atur lebar kolom
  wsKeluar['!cols'] = [
    { wch: 5 },   // No
    { wch: 40 },  // Nomor Surat
    { wch: 14 },  // Tanggal
    { wch: 35 },  // Hal
    { wch: 30 },  // Alamat
    { wch: 8 },   // Jenis
    { wch: 10 },  // Penandatangan
    { wch: 14 },  // Format
    { wch: 14 },  // Status
  ];

  // 5. Susun worksheet Surat Masuk
  const labelBentuk = (b: string) => {
    if (b === 'softfile_hardfile') return 'Softfile & Hardfile';
    if (b === 'hardfile') return 'Hardfile';
    return 'Softfile';
  };

  const headerMasuk = ['No', 'Tanggal Terima', 'Nomor Surat Asal', 'Jenis', 'Asal Surat (Pengirim)', 'Perihal', 'Bentuk', 'Catatan'];
  const rowsMasuk = (suratMasuk ?? []).map((s) => [
    s.nomor_urut,
    s.tanggal_terima,
    s.nomor_asal,
    s.jenis === 'undangan' ? 'Undangan' : 'Pemberitahuan',
    pengirimMap.get(s.pengirim_id) ?? '-',
    s.perihal,
    labelBentuk(s.bentuk),
    s.catatan ?? '',
  ]);

  const wsMasuk = XLSX.utils.aoa_to_sheet([headerMasuk, ...rowsMasuk]);

  wsMasuk['!cols'] = [
    { wch: 5 },   // No
    { wch: 14 },  // Tanggal
    { wch: 30 },  // Nomor Asal
    { wch: 16 },  // Jenis
    { wch: 35 },  // Pengirim
    { wch: 35 },  // Perihal
    { wch: 20 },  // Bentuk
    { wch: 25 },  // Catatan
  ];

  // 6. Buat Workbook dan tambahkan kedua sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsKeluar, 'Surat Keluar');
  XLSX.utils.book_append_sheet(wb, wsMasuk, 'Surat Masuk');

  // 7. Tulis ke binary buffer
  const wbOut = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  // 8. Simpan ke direktori cache perangkat
  const sanitizedPeriode = namaPeriode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Surat_${kodeLembaga}_${sanitizedPeriode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, wbOut, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 9. Bagikan file melalui mekanisme sharing native Android
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Fitur berbagi file tidak tersedia di perangkat ini.');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Ekspor Data Surat ${kodeLembaga} - ${namaPeriode}`,
  });
}

