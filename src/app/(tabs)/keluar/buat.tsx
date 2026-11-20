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
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { susunPratinjauNomor } from '../../../utils/formatSurat';
import { RefJenisSurat, RefPenandatangan, Kegiatan, BuatNomorSuratKeluarResult } from '../../../types/database';

export default function BuatSuratKeluarScreen() {
  const router = useRouter();
  const { lembaga, periodeAktif, isReadonly } = useAuth();

  // Form State
  const [format, setFormat] = useState<'lembaga' | 'kepanitiaan'>('lembaga');
  const [kegiatanId, setKegiatanId] = useState<string | null>(null);
  const [jenisSurat, setJenisSurat] = useState<string>('01');
  const [penandatangan, setPenandatangan] = useState<string>('A-0');
  const [tanggal, setTanggal] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [hal, setHal] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');

  // Data Referensi
  const [refJenisList, setRefJenisList] = useState<RefJenisSurat[]>([]);
  const [refTtdList, setRefTtdList] = useState<RefPenandatangan[]>([]);
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [loadingInit, setLoadingInit] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Tambah Kegiatan
  const [isModalKegiatanOpen, setIsModalKegiatanOpen] = useState(false);
  const [singkatanBaru, setSingkatanBaru] = useState('');
  const [nomorSkBaru, setNomorSkBaru] = useState('');
  const [kegiatanLoading, setKegiatanLoading] = useState(false);

  // Modal Sukses
  const [hasilSukses, setHasilSukses] = useState<BuatNomorSuratKeluarResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Load Data Referensi
  useEffect(() => {
    let ignore = false;

    async function loadRefs() {
      try {
        const [jenisRes, ttdRes] = await Promise.all([
          supabase.from('ref_jenis_surat').select('*').order('kode', { ascending: true }),
          supabase.from('ref_penandatangan').select('*').order('kode', { ascending: true }),
        ]);

        if (!ignore) {
          if (jenisRes.data) setRefJenisList(jenisRes.data);
          if (ttdRes.data) setRefTtdList(ttdRes.data);
        }

        if (lembaga && periodeAktif) {
          const kegiatanRes = await supabase
            .from('kegiatan')
            .select('*')
            .eq('lembaga_id', lembaga.id)
            .eq('periode_id', periodeAktif.id)
            .order('singkatan', { ascending: true });

          if (!ignore && kegiatanRes.data) {
            setKegiatanList(kegiatanRes.data);
            if (kegiatanRes.data.length > 0) {
              setKegiatanId(kegiatanRes.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Error loading reference data:', err);
      } finally {
        if (!ignore) {
          setLoadingInit(false);
        }
      }
    }

    void loadRefs();

    return () => {
      ignore = true;
    };
  }, [lembaga, periodeAktif]);

  // Penandatangan yang relevan dengan format terpilih
  const filteredTtdList = useMemo(() => {
    return refTtdList.filter((item) =>
      format === 'kepanitiaan'
        ? item.kelompok === 'kepanitiaan' || item.kode === 'E-0'
        : item.kelompok === 'lembaga'
    );
  }, [refTtdList, format]);

  const handleSelectFormat = (newFormat: 'lembaga' | 'kepanitiaan') => {
    setFormat(newFormat);
    setPenandatangan(newFormat === 'kepanitiaan' ? 'E-I' : 'A-0');
  };

  // Kegiatan terpilih
  const selectedKegiatan = useMemo(() => {
    return kegiatanList.find((k) => k.id === kegiatanId);
  }, [kegiatanList, kegiatanId]);

  // Pratinjau Nomor Realtime
  const pratinjauNomor = useMemo(() => {
    return susunPratinjauNomor({
      format,
      kodeLembaga: lembaga?.kode ?? '',
      kodePeriode: periodeAktif?.kode_romawi ?? '',
      jenisSurat,
      penandatangan,
      tanggal,
      kegiatanSingkatan: selectedKegiatan?.singkatan,
      kegiatanNomorSk: selectedKegiatan?.nomor_sk,
    });
  }, [format, lembaga, periodeAktif, jenisSurat, penandatangan, tanggal, selectedKegiatan]);

  // Tambah Kegiatan Baru
  const handleTambahKegiatan = async () => {
    if (!singkatanBaru.trim() || !nomorSkBaru.trim()) {
      Alert.alert('Form Belum Lengkap', 'Singkatan kegiatan dan nomor SK wajib diisi.');
      return;
    }

    try {
      setKegiatanLoading(true);
      const { data, error } = await supabase.rpc('buat_kegiatan', {
        p_singkatan: singkatanBaru.trim(),
        p_nomor_sk: nomorSkBaru.trim(),
      });

      if (error) {
        Alert.alert('Gagal Menambah Kegiatan', error.message);
      } else if (data) {
        const itemBaru: Kegiatan = {
          id: data.id,
          lembaga_id: lembaga?.id ?? '',
          periode_id: periodeAktif?.id ?? '',
          singkatan: data.singkatan,
          nomor_sk: data.nomor_sk,
        };
        setKegiatanList((prev) => [...prev, itemBaru]);
        setKegiatanId(itemBaru.id);
        setIsModalKegiatanOpen(false);
        setSingkatanBaru('');
        setNomorSkBaru('');
      }
    } catch {
      Alert.alert('Error', 'Terjadi kesalahan sistem saat membuat kegiatan.');
    } finally {
      setKegiatanLoading(false);
    }
  };

  // Submit Buat Nomor
  const handleSubmit = async () => {
    setErrorMessage(null);

    if (isReadonly) {
      setErrorMessage('Periode saat ini bukan periode aktif. Pembuatan surat dinonaktifkan.');
      return;
    }

    if (!hal.trim()) {
      setErrorMessage('Perihal surat (Hal) wajib diisi.');
      return;
    }

    if (!alamat.trim()) {
      setErrorMessage('Alamat tujuan surat wajib diisi.');
      return;
    }

    if (format === 'kepanitiaan' && !kegiatanId) {
      setErrorMessage('Pilih kegiatan kepanitiaan terlebih dahulu.');
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('buat_nomor_surat_keluar', {
        p_format: format,
        p_kegiatan_id: format === 'kepanitiaan' ? kegiatanId : null,
        p_jenis_surat: jenisSurat,
        p_penandatangan: penandatangan,
        p_tanggal: tanggal,
        p_hal: hal.trim(),
        p_alamat: alamat.trim(),
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setHasilSukses(data as BuatNomorSuratKeluarResult);
      }
    } catch {
      setErrorMessage('Gagal menghubungi server untuk pembuatan nomor surat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyNomor = async (nomor: string) => {
    await Clipboard.setStringAsync(nomor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingInit) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
        <Text style={styles.loadingText}>Menyiapkan data referensi...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Buat Nomor Surat Keluar</Text>
          <Text style={styles.subtitle}>
            Nomor resmi akan dihitung dan diamankan langsung di database.
          </Text>
        </View>

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Format Selector */}
        <Text style={styles.fieldLabel}>Pilih Format Surat</Text>
        <View style={styles.formatSegment}>
          <TouchableOpacity
            style={[styles.segmentBtn, format === 'lembaga' && styles.segmentBtnActive]}
            onPress={() => handleSelectFormat('lembaga')}
          >
            <Ionicons
              name="business-outline"
              size={18}
              color={format === 'lembaga' ? '#0D9488' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, format === 'lembaga' && styles.segmentBtnTextActive]}>
              Surat Lembaga
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, format === 'kepanitiaan' && styles.segmentBtnActive]}
            onPress={() => handleSelectFormat('kepanitiaan')}
          >
            <Ionicons
              name="people-outline"
              size={18}
              color={format === 'kepanitiaan' ? '#0D9488' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentBtnText, format === 'kepanitiaan' && styles.segmentBtnTextActive]}>
              Surat Kepanitiaan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Kegiatan Kepanitiaan (Jika format kepanitiaan) */}
        {format === 'kepanitiaan' && (
          <View style={styles.kegiatanContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Kegiatan Kepanitiaan</Text>
              <TouchableOpacity onPress={() => setIsModalKegiatanOpen(true)}>
                <Text style={styles.addKegiatanLink}>+ Tambah Kegiatan</Text>
              </TouchableOpacity>
            </View>

            {kegiatanList.length === 0 ? (
              <View style={styles.noKegiatanBox}>
                <Text style={styles.noKegiatanText}>
                  Belum ada kegiatan kepanitiaan di periode ini.
                </Text>
                <TouchableOpacity
                  style={styles.addKegiatanBtn}
                  onPress={() => setIsModalKegiatanOpen(true)}
                >
                  <Text style={styles.addKegiatanBtnText}>Buat Kegiatan Pertama</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kegiatanScroll}>
                {kegiatanList.map((keg) => {
                  const isSel = keg.id === kegiatanId;
                  return (
                    <TouchableOpacity
                      key={keg.id}
                      style={[styles.kegiatanChip, isSel && styles.kegiatanChipActive]}
                      onPress={() => setKegiatanId(keg.id)}
                    >
                      <Text style={[styles.kegiatanChipText, isSel && styles.kegiatanChipTextActive]}>
                        {keg.singkatan} (SK: {keg.nomor_sk})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Jenis Surat */}
        <Text style={styles.fieldLabel}>Jenis Surat</Text>
        <View style={styles.optionsGrid}>
          {refJenisList.map((j) => {
            const isSel = j.kode === jenisSurat;
            return (
              <TouchableOpacity
                key={j.kode}
                style={[styles.optionCard, isSel && styles.optionCardActive]}
                onPress={() => setJenisSurat(j.kode)}
              >
                <View style={[styles.codeBadge, isSel && styles.codeBadgeActive]}>
                  <Text style={[styles.codeBadgeText, isSel && styles.codeBadgeTextActive]}>
                    {j.kode}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSel && styles.optionTextActive]}>
                  {j.nama}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Penandatangan */}
        <Text style={styles.fieldLabel}>Penandatangan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ttdScroll}>
          {filteredTtdList.map((t) => {
            const isSel = t.kode === penandatangan;
            return (
              <TouchableOpacity
                key={t.kode}
                style={[styles.ttdChip, isSel && styles.ttdChipActive]}
                onPress={() => setPenandatangan(t.kode)}
              >
                <Text style={[styles.ttdChipCode, isSel && styles.ttdChipCodeActive]}>
                  {t.kode}
                </Text>
                <Text style={[styles.ttdChipName, isSel && styles.ttdChipNameActive]}>
                  {t.nama}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tanggal Surat */}
        <Text style={styles.fieldLabel}>Tanggal Surat (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={tanggal}
          onChangeText={setTanggal}
          placeholder="2026-03-01"
          editable={!submitting}
        />
        <Text style={styles.hintText}>
          Bulan (romawi) dan tahun nomor surat disusun otomatis dari tanggal ini.
        </Text>

        {/* Perihal (Hal) */}
        <Text style={styles.fieldLabel}>Perihal (Hal Surat)</Text>
        <TextInput
          style={styles.input}
          value={hal}
          onChangeText={setHal}
          placeholder="Contoh: Undangan Rapat Evaluasi Bulanan"
          editable={!submitting}
        />

        {/* Alamat Surat / Tujuan */}
        <Text style={styles.fieldLabel}>Alamat Surat (Tujuan)</Text>
        <TextInput
          style={styles.input}
          value={alamat}
          onChangeText={setAlamat}
          placeholder="Contoh: Seluruh Pengurus SEMA-F / Dekan FEBI"
          editable={!submitting}
        />

        {/* Kotak Pratinjau Nomor */}
        <View style={styles.previewBox}>
          <View style={styles.previewHeader}>
            <Ionicons name="eye-outline" size={16} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.previewLabel}>Pratinjau Pola Nomor Surat</Text>
          </View>
          <Text style={styles.previewNumber}>{pratinjauNomor}</Text>
          <Text style={styles.previewNote}>
            * Bagian &apos;NN&apos; akan otomatis diganti nomor urut resmi saat tombol ditekan.
          </Text>
        </View>

        {/* Tombol Buat Nomor */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Buat Nomor Surat Keluar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Tambah Kegiatan */}
      <Modal visible={isModalKegiatanOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Kegiatan Kepanitiaan</Text>
            <Text style={styles.modalSubtitle}>
              Nomor urut surat kepanitiaan terpisah per kegiatan dan dimulai dari 02.
            </Text>

            <Text style={styles.fieldLabel}>Singkatan Kegiatan</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: Pan-WK atau Pan-Dies"
              value={singkatanBaru}
              onChangeText={setSingkatanBaru}
            />

            <Text style={styles.fieldLabel}>Nomor SK Kepanitiaan</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 01 atau 02"
              value={nomorSkBaru}
              onChangeText={setNomorSkBaru}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setIsModalKegiatanOpen(false)}
                disabled={kegiatanLoading}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleTambahKegiatan}
                disabled={kegiatanLoading}
              >
                {kegiatanLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan Kegiatan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Sukses Pembuatan Nomor */}
      <Modal visible={Boolean(hasilSukses)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-circle" size={48} color="#0D9488" />
            </View>
            <Text style={styles.successModalTitle}>Nomor Surat Berhasil Dibuat!</Text>
            <Text style={styles.successModalSubtitle}>
              Nomor telah tercatat di database dan diantrekan untuk sinkronisasi.
            </Text>

            <View style={styles.generatedNumberBox}>
              <Text style={styles.generatedNumberText}>{hasilSukses?.nomor_lengkap}</Text>
            </View>

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopyNomor(hasilSukses?.nomor_lengkap ?? '')}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color="#0D9488"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.copyBtnText}>
                {copied ? 'Tersalin ke Clipboard!' : 'Salin Nomor Surat'}
              </Text>
            </TouchableOpacity>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.viewDetailBtn}
                onPress={() => {
                  const id = hasilSukses?.id;
                  setHasilSukses(null);
                  if (id) {
                    router.replace(`/(tabs)/keluar/${id}`);
                  }
                }}
              >
                <Text style={styles.viewDetailBtnText}>Lihat Detail Surat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setHasilSukses(null);
                  router.replace('/(tabs)/keluar');
                }}
              >
                <Text style={styles.closeBtnText}>Kembali ke Daftar</Text>
              </TouchableOpacity>
            </View>
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
  formatSegment: {
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
    color: '#0D9488',
  },
  kegiatanContainer: {
    marginTop: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addKegiatanLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
  },
  kegiatanScroll: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  kegiatanChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  kegiatanChipActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
    borderWidth: 2,
  },
  kegiatanChipText: {
    fontSize: 13,
    color: '#374151',
  },
  kegiatanChipTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  noKegiatanBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  noKegiatanText: {
    fontSize: 12,
    color: '#B45309',
  },
  addKegiatanBtn: {
    marginTop: 8,
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addKegiatanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsGrid: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
  },
  optionCardActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
  },
  codeBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  codeBadgeActive: {
    backgroundColor: '#CCFBF1',
  },
  codeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  codeBadgeTextActive: {
    color: '#0D9488',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  optionTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  ttdScroll: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  ttdChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  ttdChipActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
    borderWidth: 1.5,
  },
  ttdChipCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  ttdChipCodeActive: {
    color: '#0D9488',
  },
  ttdChipName: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  ttdChipNameActive: {
    color: '#0F766E',
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
  previewBox: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  previewNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#115E59',
    letterSpacing: 0.5,
  },
  previewNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  submitBtn: {
    backgroundColor: '#0D9488',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#99F6E4',
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
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  generatedNumberBox: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  generatedNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  successActions: {
    width: '100%',
    gap: 8,
  },
  viewDetailBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
