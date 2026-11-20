import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bulanKeRomawi, formatTanggalIndo, susunPratinjauNomor } from '../utils/formatSurat.ts';

describe('Unit Test: bulanKeRomawi', () => {
  it('harus mengonversi bulan 1 sampai 12 ke angka Romawi dengan benar', () => {
    const expected = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    for (let i = 1; i <= 12; i++) {
      assert.strictEqual(bulanKeRomawi(i), expected[i - 1], `Gagal untuk bulan ke-${i}`);
    }
  });

  it('harus memberikan nilai fallback I jika angka di luar rentang 1-12', () => {
    assert.strictEqual(bulanKeRomawi(0), 'I');
    assert.strictEqual(bulanKeRomawi(13), 'I');
    assert.strictEqual(bulanKeRomawi(-5), 'I');
  });
});

describe('Unit Test: formatTanggalIndo', () => {
  it('harus memformat tanggal YYYY-MM-DD ke penamaan bulan Indonesia', () => {
    assert.strictEqual(formatTanggalIndo('2026-03-01'), '1 Maret 2026');
    assert.strictEqual(formatTanggalIndo('2026-11-10'), '10 November 2026');
    assert.strictEqual(formatTanggalIndo('2026-01-25'), '25 Januari 2026');
    assert.strictEqual(formatTanggalIndo('2026-08-17'), '17 Agustus 2026');
  });

  it('harus mengembalikan string asli jika format tanggal tidak valid atau kosong', () => {
    assert.strictEqual(formatTanggalIndo(''), '');
    assert.strictEqual(formatTanggalIndo('invalid-date'), 'invalid-date');
  });
});

describe('Unit Test: susunPratinjauNomor', () => {
  it('harus menyusun pratinjau nomor surat format Lembaga dengan benar (FR-005)', () => {
    const pratinjau = susunPratinjauNomor({
      format: 'lembaga',
      kodeLembaga: 'S04',
      kodePeriode: 'IX',
      jenisSurat: '01',
      penandatangan: 'A-0',
      tanggal: '2026-02-15',
    });

    // Format: NN.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
    assert.strictEqual(pratinjau, 'NN.S04-Un.IX.01.A-0.II.2026');
  });

  it('harus menyusun pratinjau nomor surat format Kepanitiaan dengan sembilan bagian (FR-006)', () => {
    const pratinjau = susunPratinjauNomor({
      format: 'kepanitiaan',
      kodeLembaga: 'M07',
      kodePeriode: 'XXVI',
      jenisSurat: '03',
      penandatangan: 'E-II',
      tanggal: '2026-03-25',
      kegiatanSingkatan: 'Pan-WK',
      kegiatanNomorSk: '01',
    });

    // Format: NN.Pan-XX.NomorSK.Kode-Un.Periode.Jenis.Penandatangan.Bulan.Tahun
    assert.strictEqual(pratinjau, 'NN.Pan-WK.01.M07-Un.XXVI.03.E-II.III.2026');
  });

  it('harus menangani nilai bawaan jika ada parameter yang belum diisi', () => {
    const pratinjau = susunPratinjauNomor({
      format: 'lembaga',
      kodeLembaga: '',
      kodePeriode: '',
      jenisSurat: '',
      penandatangan: '',
      tanggal: '',
    });

    assert.strictEqual(pratinjau, 'NN.KODE-Un.PERIODE.01.A-0.I.2026');
  });
});

