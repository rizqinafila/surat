import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Pengirim, JenisSuratMasuk, BentukSuratMasuk } from '../../../types/database';

interface SuratMiripItem {
  id: string;
  nomor_urut: number;
  tanggal_terima: string;
  nomor_asal: string;
  bentuk: BentukSuratMasuk;
}

export default function CatatSuratMasukScreen() {
  const router = useRouter();
  const { lembaga, periodeAktif, isReadonly } = useAuth();

  // Form State
  const [tanggalTerima, setTanggalTerima] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [nomorAsal, setNomorAsal] = useState<string>('');
  const [jenis, setJenis] = useState<JenisSuratMasuk>('undangan');
  const [pengirimId, setPengirimId] = useState<string | null>(null);
  const [perihal, setPerihal] = useState<string>('');
  const [bentuk, setBentuk] = useState<BentukSuratMasuk>('softfile');
  const [catatan, setCatatan] = useState<string>('');

  // Pengirim List & Loading
  const [pengirimList, setPengirimList] = useState<Pengirim[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Tambah Pengirim Baru
  const [isModalPengirimOpen, setIsModalPengirimOpen] = useState(false);
  const [namaPengirimBaru, setNamaPengirimBaru] = useState('');
  const [pengirimLoading, setPengirimLoading] = useState(false);

  // Modal Surat Mirip (FR-016)
  const [suratMiripList, setSuratMiripList] = useState<SuratMiripItem[]>([]);
  const [isModalMiripOpen, setIsModalMiripOpen] = useState(false);

  // Modal Sukses
  const [nomorUrutSukses, setNomorUrutSukses] = useState<number | null>(null);

  // Load Pengirim
  useEffect(() => {
    let ignore = false;

    async function loadPengirim() {
      if (!lembaga) return;

      try {
        const { data, error } = await supabase
          .from('pengirim')
          .select('*')
          .eq('lembaga_id', lembaga.id)
          .order('nama', { ascending: true });

        if (!ignore && !error && data) {
          setPengirimList(data);
          if (data.length > 0) {
            setPengirimId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching pengirim:', err);
      } finally {
        if (!ignore) {
          setLoadingInit(false);
        }
      }
    }

    void loadPengirim();

    return () => {
      ignore = true;
    };
  }, [lembaga]);

  // Tambah Pengirim Baru
  const handleTambahPengirim = async () => {
    if (!lembaga || !namaPengirimBaru.trim()) {
      Alert.alert('Data Belum Lengkap', 'Nama asal pengirim surat wajib diisi.');
      return;
    }

    try {
      setPengirimLoading(true);
      const { data, error } = await supabase
        .from('pengirim')
        .insert({
          lembaga_id: lembaga.id,
          nama: namaPengirimBaru.trim(),
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Gagal Menambah Pengirim', error.message);
      } else if (data) {
        setPengirimList((prev) => [...prev, data]);
        setPengirimId(data.id);
        setIsModalPengirimOpen(false);
        setNamaPengirimBaru('');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan sistem.');
    } finally {
      setPengirimLoading(false);
    }
  };

  // Validasi Tanggal WIB
  const validateTanggalWIB = (tglStr: string): boolean => {
    // Format YYYY-MM-DD
    const parts = tglStr.split('-');
    if (parts.length !== 3) return false;

    const inputDate = new Date(tglStr);
    const nowWIB = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
    );

    // Bandingkan YYYY-MM-DD
    const inputYMD = inputDate.toISOString().split('T')[0];
    const nowYMD = nowWIB.toISOString().split('T')[0];

    return inputYMD <= nowYMD;
  };

  // Submit Catat Surat Masuk
  const handleSubmit = async (paksaBaru: boolean = false) => {
    setErrorMessage(null);

    if (isReadonly) {
      setErrorMessage('Periode saat ini adalah arsip (hanya baca). Pencatatan surat dinonaktifkan.');
      return;
    }

    if (!tanggalTerima.trim()) {
      setErrorMessage('Tanggal terima surat wajib diisi.');
      return;
    }

    // FR-015: Validasi tanggal terima tidak boleh setelah hari ini (WIB)
    if (!validateTanggalWIB(tanggalTerima.trim())) {
      setErrorMessage('Tanggal terima tidak boleh setelah hari ini (waktu server WIB).');
      return;
    }

    // Validasi berada dalam rentang periode aktif
    if (periodeAktif) {
      if (
        tanggalTerima < periodeAktif.tanggal_mulai ||
        tanggalTerima > periodeAktif.tanggal_selesai
      ) {
        setErrorMessage(
          `Tanggal terima harus berada dalam rentang periode aktif (${periodeAktif.tanggal_mulai} s.d. ${periodeAktif.tanggal_selesai}).`
        );
        return;
      }
    }

    if (!nomorAsal.trim()) {
      setErrorMessage('Nomor surat asal wajib diisi.');
      return;
    }

    if (!pengirimId) {
      setErrorMessage('Pilih asal pengirim surat terlebih dahulu.');
      return;
    }

    if (!perihal.trim()) {
      setErrorMessage('Perihal surat wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);

      // FR-016: Deteksi surat mirip sebelum simpan jika bukan paksa baru
      if (!paksaBaru) {
        const { data: miripData, error: miripError } = await supabase.rpc(
          'cari_surat_masuk_mirip',
          {
            p_nomor_asal: nomorAsal.trim(),
            p_pengirim_id: pengirimId,
          }
        );

        if (!miripError && miripData && miripData.length > 0) {
          setSuratMiripList(miripData as SuratMiripItem[]);
          setIsModalMiripOpen(true);
          setSubmitting(false);
          return;
        }
      }

      // Simpan Surat Masuk
      const { data, error } = await supabase.rpc('catat_surat_masuk', {
        p_tanggal_terima: tanggalTerima.trim(),
        p_nomor_asal: nomorAsal.trim(),
        p_jenis: jenis,
        p_pengirim_id: pengirimId,
        p_perihal: perihal.trim(),
        p_bentuk: bentuk,
        p_catatan: catatan.trim() || null,
        p_paksa_baru: paksaBaru,
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setNomorUrutSukses(data.nomor_urut);
      }
    } catch {
      setErrorMessage('Terjadi gangguan jaringan saat mencatat surat masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  // FR-017: Perbarui Bentuk Surat Masuk yang Mirip
  const handlePerbaruiBentukMirip = async (miripItem: SuratMiripItem) => {
    try {
      setSubmitting(true);
      setIsModalMiripOpen(false);

      // Ubah bentuk menjadi softfile_hardfile pada baris yang sama
      const { error } = await supabase.rpc('perbarui_bentuk_surat_masuk', {
        p_id: miripItem.id,
        p_bentuk_baru: 'softfile_hardfile',
      });

      if (error) {
        Alert.alert('Gagal Memperbarui Bentuk', error.message);
      } else {
        Alert.alert(
          'Bentuk Surat Diperbarui',
          `Surat No. Agenda ${miripItem.nomor_urut} berhasil diperbarui bentuknya menjadi 'Softfile & Hardfile' pada baris yang sama tanpa menambah baris baru.`,
          [{ text: 'Selesai', onPress: () => router.replace('/(tabs)/masuk') }]
        );
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPengirim = useMemo(() => {
    return pengirimList.find((p) => p.id === pengirimId);
  }, [pengirimList, pengirimId]);

  if (loadingInit) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Menyiapkan form surat masuk...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Catat Surat Masuk</Text>
          <Text style={styles.subtitle}>
            Nomor urut agenda dibentuk otomatis dan diurutkan berdasarkan tanggal terima.
          </Text>
        </View>

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Tanggal Terima */}
        <Text style={styles.fieldLabel}>Tanggal Terima (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={tanggalTerima}
          onChangeText={setTanggalTerima}
          placeholder="2026-03-01"
          editable={!submitting}
        />
        <Text style={styles.hintText}>
          Wajib diisi & tidak boleh setelah hari ini (acuan server WIB).
        </Text>

        {/* Nomor Surat Asal */}
        <Text style={styles.fieldLabel}>Nomor Surat Asal</Text>
        <TextInput
          style={styles.input}
          value={nomorAsal}
          onChangeText={setNomorAsal}
          placeholder="Contoh: 17.S04-Un.IX.02.A-I.V.2026"
          editable={!submitting}
        />

        {/* Jenis Surat Masuk */}
        <Text style={styles.fieldLabel}>Jenis Surat</Text>
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, jenis === 'undangan' && styles.segmentBtnActive]}
            onPress={() => setJenis('undangan')}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={jenis === 'undangan' ? '#7C3AED' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, jenis === 'undangan' && styles.segmentBtnTextActive]}>
              Undangan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, jenis === 'pemberitahuan' && styles.segmentBtnActive]}
            onPress={() => setJenis('pemberitahuan')}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={jenis === 'pemberitahuan' ? '#7C3AED' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, jenis === 'pemberitahuan' && styles.segmentBtnTextActive]}>
              Pemberitahuan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Asal Pengirim Surat */}
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>Asal Pengirim Surat</Text>
          <TouchableOpacity onPress={() => setIsModalPengirimOpen(true)}>
            <Text style={styles.addPengirimLink}>+ Pengirim Baru</Text>
          </TouchableOpacity>
        </View>

        {pengirimList.length === 0 ? (
          <View style={styles.noPengirimBox}>
            <Text style={styles.noPengirimText}>Belum ada data pengirim surat tersimpan.</Text>
            <TouchableOpacity
              style={styles.addPengirimBtn}
              onPress={() => setIsModalPengirimOpen(true)}
            >
              <Text style={styles.addPengirimBtnText}>Tambah Pengirim Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pengirimScroll}>
            {pengirimList.map((p) => {
              const isSel = p.id === pengirimId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pengirimChip, isSel && styles.pengirimChipActive]}
                  onPress={() => setPengirimId(p.id)}
                >
                  <Text style={[styles.pengirimChipText, isSel && styles.pengirimChipTextActive]}>
                    {p.nama}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Perihal */}
        <Text style={styles.fieldLabel}>Perihal Surat</Text>
        <TextInput
          style={styles.input}
          value={perihal}
          onChangeText={setPerihal}
          placeholder="Contoh: Undangan Diskusi Panel Kebangsaan"
          editable={!submitting}
        />

        {/* Bentuk Surat */}
        <Text style={styles.fieldLabel}>Bentuk Surat Fisik/Digital</Text>
        <View style={styles.bentukGrid}>
          {[
            { key: 'softfile', label: 'Softfile', desc: 'PDF / Dokumen Digital' },
            { key: 'hardfile', label: 'Hardfile', desc: 'Surat Cetak Fisik' },
            { key: 'softfile_hardfile', label: 'Keduanya', desc: 'Softfile & Hardfile' },
          ].map((item) => {
            const isSel = bentuk === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.bentukCard, isSel && styles.bentukCardActive]}
                onPress={() => setBentuk(item.key as BentukSuratMasuk)}
              >
                <Text style={[styles.bentukTitle, isSel && styles.bentukTitleActive]}>
                  {item.label}
                </Text>
                <Text style={styles.bentukDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Catatan (Opsional) */}
        <Text style={styles.fieldLabel}>Catatan Tambahan (Opsional)</Text>
        <TextInput
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          value={catatan}
          onChangeText={setCatatan}
          placeholder="Catatan khusus terkait surat..."
          multiline
          editable={!submitting}
        />

        {/* Tombol Simpan */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={() => handleSubmit(false)}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Simpan Surat Masuk</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Tambah Pengirim Baru */}
      <Modal visible={isModalPengirimOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Pengirim Baru</Text>
            <Text style={styles.modalSubtitle}>
              Pengirim akan otomatis disimpan ke daftar referensi lembaga Anda.
            </Text>

            <Text style={styles.fieldLabel}>Nama Lengkap / Instansi Pengirim</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: DEMA Universitas / SEMA Fakultas Syariah"
              value={namaPengirimBaru}
              onChangeText={setNamaPengirimBaru}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsModalPengirimOpen(false)}
                disabled={pengirimLoading}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleTambahPengirim}
                disabled={pengirimLoading}
              >
                {pengirimLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan Pengirim</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Deteksi Surat Mirip (FR-016 & FR-017) */}
      <Modal visible={isModalMiripOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.miripModalCard}>
            <View style={styles.miripIconBadge}>
              <Ionicons name="information-circle" size={44} color="#D97706" />
            </View>
            <Text style={styles.miripModalTitle}>Ditemukan Surat Masuk Serupa</Text>
            <Text style={styles.miripModalSubtitle}>
              Surat dengan nomor asal dan pengirim yang sama sudah pernah dicatat di periode ini:
            </Text>

            {suratMiripList.map((m) => (
              <View key={m.id} style={styles.miripItemBox}>
                <Text style={styles.miripItemNomor}>Agenda #{m.nomor_urut} — {m.nomor_asal}</Text>
                <Text style={styles.miripItemPengirim}>Pengirim: {selectedPengirim?.nama}</Text>
                <Text style={styles.miripItemBentuk}>Bentuk saat ini: {m.bentuk.toUpperCase()}</Text>

                <TouchableOpacity
                  style={styles.btnUpdateBentuk}
                  onPress={() => handlePerbaruiBentukMirip(m)}
                >
                  <Ionicons name="sync-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnUpdateBentukText}>
                    Perbarui Bentuk Menjadi &apos;Softfile &amp; Hardfile&apos;
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.miripActions}>
              <TouchableOpacity
                style={styles.btnSimpanBaru}
                onPress={() => {
                  setIsModalMiripOpen(false);
                  void handleSubmit(true); // paksa baru
                }}
              >
                <Text style={styles.btnSimpanBaruText}>Tetap Simpan Sebagai Surat Baru</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsModalMiripOpen(false)}
              >
                <Text style={styles.modalCancelText}>Batal &amp; Periksa Kembali</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Sukses Pencatatan */}
      <Modal visible={nomorUrutSukses !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-circle" size={48} color="#7C3AED" />
            </View>
            <Text style={styles.successModalTitle}>Surat Masuk Berhasil Dicatat!</Text>
            <Text style={styles.successModalSubtitle}>
              Nomor urut agenda resmi telah diterbitkan:
            </Text>

            <View style={styles.agendaNumberBox}>
              <Text style={styles.agendaNumberLabel}>NOMOR AGENDA</Text>
              <Text style={styles.agendaNumberText}>
                {nomorUrutSukses ? (nomorUrutSukses < 10 ? `0${nomorUrutSukses}` : nomorUrutSukses) : '-'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setNomorUrutSukses(null);
                router.replace('/(tabs)/masuk');
              }}
            >
              <Text style={styles.doneBtnText}>Lihat di Daftar Surat Masuk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  addPengirimLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentBtnTextActive: {
    color: '#7C3AED',
  },
  noPengirimBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  noPengirimText: {
    fontSize: 12,
    color: '#B45309',
  },
  addPengirimBtn: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addPengirimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pengirimScroll: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  pengirimChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  pengirimChipActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
    borderWidth: 2,
  },
  pengirimChipText: {
    fontSize: 13,
    color: '#374151',
  },
  pengirimChipTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  bentukGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bentukCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
  },
  bentukCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
  },
  bentukTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  bentukTitleActive: {
    color: '#7C3AED',
  },
  bentukDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#C4B5FD',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  miripModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },
  miripIconBadge: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  miripModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  miripModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  miripItemBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  miripItemNomor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  miripItemPengirim: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  miripItemBentuk: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 8,
  },
  btnUpdateBentuk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  btnUpdateBentukText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  miripActions: {
    gap: 8,
    marginTop: 4,
  },
  btnSimpanBaru: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnSimpanBaruText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIconBadge: {
    marginBottom: 10,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  successModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  agendaNumberBox: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  agendaNumberLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 1,
    marginBottom: 4,
  },
  agendaNumberText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6D28D9',
  },
  doneBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
