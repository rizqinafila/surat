// =============================================================================
// Supabase Edge Function: sync-sheets
// Memproses antrean sinkronisasi ke Google Sheets secara asinkron dan batch (FR-023 s.d. FR-026)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGoogleAccessToken, GoogleServiceAccountKey } from './auth.ts';
import {
  HEADERS_SURAT_KELUAR,
  HEADERS_SURAT_MASUK,
  ensureSheetExists,
  findRowIndexByHiddenId,
  appendRow,
  updateRow,
} from './sheets.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const googleKeyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') || '';

    if (!googleKeyJson) {
      throw new Error(
        'Variabel lingkungan GOOGLE_SERVICE_ACCOUNT_KEY belum diatur pada Edge Function.'
      );
    }

    const serviceAccount: GoogleServiceAccountKey = JSON.parse(googleKeyJson);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Ambil token akses Google Sheets
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // 2. Ambil antrean sinkron yang berstatus 'menunggu' (maks 15 per batch)
    const { data: queueItems, error: queueError } = await supabase
      .from('antrean_sinkron')
      .select('*')
      .eq('status', 'menunggu')
      .order('dibuat_pada', { ascending: true })
      .limit(15);

    if (queueError) {
      throw new Error(`Gagal membaca antrean sinkron: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Tidak ada antrean sinkronisasi yang menunggu.', diproses: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const results = [];

    // 3. Proses antrean satu per satu
    for (const item of queueItems) {
      try {
        if (item.tabel === 'surat_keluar') {
          // Ambil data surat keluar lengkap
          const { data: surat, error: suratError } = await supabase
            .from('surat_keluar')
            .select('*, lembaga:lembaga_id(spreadsheet_id, kode), kegiatan:kegiatan_id(singkatan)')
            .eq('id', item.surat_id)
            .maybeSingle();

          if (suratError || !surat) {
            throw new Error(`Data surat keluar ID ${item.surat_id} tidak ditemukan.`);
          }

          const spreadsheetId = surat.lembaga?.spreadsheet_id;
          if (!spreadsheetId) {
            throw new Error(`Lembaga belum memiliki spreadsheet_id yang terhubung.`);
          }

          // Tentukan tab sheet
          const tabTitle =
            surat.format === 'kepanitiaan'
              ? surat.kegiatan?.singkatan || 'Kepanitiaan'
              : 'Surat Keluar Lembaga';

          await ensureSheetExists(spreadsheetId, tabTitle, HEADERS_SURAT_KELUAR, accessToken);

          // FR-025: Cari baris berdasarkan ID Surat tersembunyi (Kolom Index 6 / Kolom G)
          const rowIndex = await findRowIndexByHiddenId(
            spreadsheetId,
            tabTitle,
            6,
            surat.id,
            accessToken
          );

          const statusTeks = surat.status === 'dibatalkan' ? 'Dibatalkan' : 'Aktif';
          const rowData = [
            surat.nomor_urut,
            surat.nomor_lengkap,
            surat.tanggal,
            surat.hal,
            surat.alamat,
            statusTeks,
            surat.id, // ID tersembunyi
          ];

          if (item.aksi === 'tambah') {
            if (rowIndex === -1) {
              await appendRow(spreadsheetId, tabTitle, rowData, accessToken);
            } else {
              await updateRow(spreadsheetId, tabTitle, rowIndex, rowData, accessToken);
            }
          } else if (item.aksi === 'perbarui' || item.aksi === 'batalkan') {
            if (rowIndex !== -1) {
              await updateRow(spreadsheetId, tabTitle, rowIndex, rowData, accessToken);
            } else {
              await appendRow(spreadsheetId, tabTitle, rowData, accessToken);
            }
          }
        } else if (item.tabel === 'surat_masuk') {
          // Ambil data surat masuk lengkap
          const { data: surat, error: suratError } = await supabase
            .from('surat_masuk')
            .select('*, lembaga:lembaga_id(spreadsheet_id), pengirim:pengirim_id(nama)')
            .eq('id', item.surat_id)
            .maybeSingle();

          if (suratError || !surat) {
            throw new Error(`Data surat masuk ID ${item.surat_id} tidak ditemukan.`);
          }

          const spreadsheetId = surat.lembaga?.spreadsheet_id;
          if (!spreadsheetId) {
            throw new Error(`Lembaga belum memiliki spreadsheet_id yang terhubung.`);
          }

          const tabTitle = 'Surat Masuk';
          await ensureSheetExists(spreadsheetId, tabTitle, HEADERS_SURAT_MASUK, accessToken);

          // FR-025: Cari baris berdasarkan ID Surat tersembunyi (Kolom Index 8 / Kolom I)
          const rowIndex = await findRowIndexByHiddenId(
            spreadsheetId,
            tabTitle,
            8,
            surat.id,
            accessToken
          );

          const bentukTeks =
            surat.bentuk === 'softfile_hardfile'
              ? 'Softfile & Hardfile'
              : surat.bentuk === 'hardfile'
              ? 'Hardfile'
              : 'Softfile';

          const rowData = [
            surat.nomor_urut,
            surat.tanggal_terima,
            surat.nomor_asal,
            surat.jenis === 'undangan' ? 'Undangan' : 'Pemberitahuan',
            surat.pengirim?.nama || 'Tidak Diketahui',
            surat.perihal,
            bentukTeks,
            surat.catatan || '',
            surat.id, // ID tersembunyi
          ];

          if (item.aksi === 'tambah') {
            if (rowIndex === -1) {
              await appendRow(spreadsheetId, tabTitle, rowData, accessToken);
            } else {
              await updateRow(spreadsheetId, tabTitle, rowIndex, rowData, accessToken);
            }
          } else if (item.aksi === 'perbarui') {
            if (rowIndex !== -1) {
              await updateRow(spreadsheetId, tabTitle, rowIndex, rowData, accessToken);
            } else {
              await appendRow(spreadsheetId, tabTitle, rowData, accessToken);
            }
          }
        }

        // Tandai sukses di tabel antrean
        await supabase
          .from('antrean_sinkron')
          .update({
            status: 'berhasil',
            pesan_error: null,
            diperbarui_pada: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'berhasil' });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const percobaanBaru = (item.percobaan || 0) + 1;
        const statusAkhir = percobaanBaru >= 5 ? 'gagal' : 'menunggu';

        await supabase
          .from('antrean_sinkron')
          .update({
            status: statusAkhir,
            percobaan: percobaanBaru,
            pesan_error: errorMsg,
            diperbarui_pada: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: statusAkhir, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Pemrosesan antrean selesai.',
        diproses: results.length,
        detail: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (globalErr: unknown) {
    const errorMsg = globalErr instanceof Error ? globalErr.message : String(globalErr);
    return new Response(
      JSON.stringify({
        error: errorMsg,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

