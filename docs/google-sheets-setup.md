# Panduan Ekspor Excel (.xlsx) & Alternatif Spreadsheet (100% Bebas Biaya)

Aplikasi **Surat-in** kini mengadopsi mekanisme **Ekspor File Excel (.xlsx) Mandiri Secara Lokal** menggunakan pustaka SheetJS (`xlsx`), `expo-file-system`, dan `expo-sharing`.

> [!TIP]
> **Mengapa Beralih ke Ekspor Excel Lokal?**
> 1. **100% Gratis Selamanya:** Tidak memerlukan Google Cloud Platform (GCP) Console, kartu kredit (*billing account*), atau pembayaran sepeser pun.
> 2. **Tanpa Setup Kredensial:** Mahasiswa/pengurus tidak perlu membuat Google Service Account JSON atau menghubungkan Spreadsheet ID manual.
> 3. **Format Standar Industri (.xlsx):** File dapat langsung dibuka di Microsoft Excel, Google Sheets, LibreOffice Calc, maupun WPS Office di smartphone Android.
> 4. **Multi-Sheet Otomatis:** Menghasilkan dua tab terpisah dalam satu berkas: tab **Surat Keluar** dan tab **Surat Masuk**.

---

## 1. Cara Mengunduh Rekap Excel di Aplikasi

1. **Dari Halaman Beranda (Home):**
   - Tekan kartu **Unduh Rekap Excel (.xlsx)** yang berwarna hijau.
2. **Dari Tab Arsip:**
   - Pilih periode kepengurusan yang diinginkan (aktif maupun lampau).
   - Tekan tombol **Unduh Excel** pada banner periode yang sedang dibuka.
3. **Dari Tab Akun:**
   - Gulir ke bagian **Ekspor Data Surat**, lalu tekan tombol **Unduh Excel Periode Aktif**.

Aplikasi akan otomatis menyusun file biner `.xlsx` dan memunculkan dialog berbagi bawaan Android (*Android Share Sheet*) untuk disimpan ke penyimpanan internal ponsel, dikirim via WhatsApp/Email, atau langsung dibuka di aplikasi Excel/Google Sheets.

---

## 2. Struktur Kolom Rekapitulasi Excel

### Tab 1: `Surat Keluar`
| No | Nomor Surat | Tanggal Surat | Hal | Alamat Surat | Jenis | Penandatangan | Format | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | 01.S04-Un.IX.01.A-0.II.2026 | 2026-02-16 | Undangan Rapat Kerja | Pengurus SEMA FEBI | 01 | A-0 | Lembaga | Aktif |
| 2 | 02.Pan-WK.01.S04-Un.IX.02.E-II.II.2026 | 2026-02-18 | Peminjaman Aula | Bagian Umum Kampus | 02 | E-II | Kepanitiaan | Aktif |

### Tab 2: `Surat Masuk`
| No | Tanggal Terima | Nomor Surat Asal | Jenis | Asal Surat (Pengirim) | Perihal | Bentuk | Catatan |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | 2026-02-16 | 018/DEMA-U/UND/II/2026 | Undangan | DEMA Universitas | Festival Budaya Mahasiswa | Softfile & Hardfile | Diterima via WA |

---

## 3. (Opsional / Legacy) Sinkronisasi Otomatis Google Sheets via Edge Function

Bagi institusi yang ingin tetap mengaktifkan sinkronisasi cloud real-time ke Google Sheets:
- Anda dapat memanfaatkan Supabase Edge Function `sync-sheets` yang tersedia di direktori `supabase/functions/sync-sheets/`.
- Gunakan akun Google Cloud dengan kuota gratis Google Sheets API (300 req/menit).
- Alternatif bebas kartu kredit untuk Google Sheets: gunakan **Google Apps Script Web App** yang di-*deploy* dari menu Extensions spreadsheet tanpa perlu membuka Google Cloud Console.
