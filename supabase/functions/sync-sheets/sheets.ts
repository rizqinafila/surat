// =============================================================================
// Supabase Edge Function: Google Sheets API v4 Helper
// Mendukung pembuatan tab dinamis, pencarian baris berdasarkan ID tersembunyi (FR-025),
// dan operasi append/update baris
// =============================================================================

export const HEADERS_SURAT_KELUAR = [
  'No',
  'Nomor Surat',
  'Tanggal Surat',
  'Hal',
  'Alamat Surat',
  'Status',
  'ID Surat', // Kolom G (Index 6) - Kunci tersembunyi untuk update baris
];

export const HEADERS_SURAT_MASUK = [
  'No',
  'Tanggal Terima',
  'Nomor Asal',
  'Jenis',
  'Asal Surat',
  'Perihal',
  'Keterangan', // Softfile / Hardfile / Softfile & Hardfile
  'Catatan',
  'ID Surat', // Kolom I (Index 8) - Kunci tersembunyi untuk update baris
];

/**
 * Memastikan lembar kerja (tab) ada pada spreadsheet.
 * Jika belum ada, tab baru akan dibuat beserta baris header-nya.
 */
export async function ensureSheetExists(
  spreadsheetId: string,
  sheetTitle: string,
  headers: string[],
  accessToken: string
): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.text();
    throw new Error(`Gagal membaca metadata spreadsheet (${metaRes.status}): ${err}`);
  }

  const metaData = await metaRes.json();
  const existingSheets = metaData.sheets || [];
  const exists = existingSheets.some(
    (s: { properties: { title: string } }) => s.properties.title === sheetTitle
  );

  if (!exists) {
    // Buat sheet baru
    const addSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const addRes = await fetch(addSheetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      }),
    });

    if (!addRes.ok) {
      const err = await addRes.text();
      throw new Error(`Gagal membuat tab ${sheetTitle} (${addRes.status}): ${err}`);
    }

    // Tulis Header di baris 1
    const writeHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetTitle
    )}!A1?valueInputOption=USER_ENTERED`;

    await fetch(writeHeaderUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers],
      }),
    });
  }
}

/**
 * FR-025: Mencari indeks baris (1-based) berdasarkan nilai ID surat tersembunyi.
 * Menghindari salah update baris jika spreadsheet diurutkan atau disortir secara manual.
 */
export async function findRowIndexByHiddenId(
  spreadsheetId: string,
  sheetTitle: string,
  idColumnIndex: number,
  suratId: string,
  accessToken: string
): Promise<number> {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetTitle
  )}!A:Z`;

  const res = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return -1;
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[idColumnIndex] === suratId) {
      return i + 1; // 1-based index untuk range Google Sheets
    }
  }

  return -1;
}

/**
 * Menambahkan baris baru ke akhir sheet
 */
export async function appendRow(
  spreadsheetId: string,
  sheetTitle: string,
  rowValues: (string | number)[],
  accessToken: string
): Promise<void> {
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetTitle
  )}!A1:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal menambah baris ke ${sheetTitle}: ${err}`);
  }
}

/**
 * Memperbarui baris yang sudah ada pada sheet
 */
export async function updateRow(
  spreadsheetId: string,
  sheetTitle: string,
  rowIndex: number,
  rowValues: (string | number)[],
  accessToken: string
): Promise<void> {
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    sheetTitle
  )}!A${rowIndex}?valueInputOption=USER_ENTERED`;

  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal memperbarui baris ${rowIndex} di ${sheetTitle}: ${err}`);
  }
}

