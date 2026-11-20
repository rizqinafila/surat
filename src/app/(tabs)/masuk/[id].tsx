import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { SuratMasuk, Pengirim, Periode, JenisSuratMasuk, BentukSuratMasuk } from '../../../types/database';
import { formatTanggalIndo } from '../../../utils/formatSurat';

export default function DetailSuratMasukScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isReadonly } = useAuth();

  const [surat, setSurat] = useState<SuratMasuk | null>(null);
  const [pengirim, setPengirim] = useState<Pengirim | null>(null);
  const [periodeData, setPeriodeData] = useState<Periode | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Edit Modal State (FR-018)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTanggalTerima, setEditTanggalTerima] = useState('');
  const [editNomorAsal, setEditNomorAsal] = useState('');
  const [editJenis, setEditJenis] = useState<JenisSuratMasuk>('undangan');
  const [editPerihal, setEditPerihal] = useState('');
  const [editBentuk, setEditBentuk] = useState<BentukSuratMasuk>('softfile');
  const [editCatatan, setEditCatatan] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      if (!id) return;

      try {
        const { data: suratData, error } = await supabase
          .from('surat_masuk')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!ignore && suratData) {
          setSurat(suratData);
          setEditTanggalTerima(suratData.tanggal_terima);
          setEditNomorAsal(suratData.nomor_asal);
          setEditJenis(suratData.jenis);
          setEditPerihal(suratData.perihal);
          setEditBentuk(suratData.bentuk);
          setEditCatatan(suratData.catatan ?? '');

          // Fetch Pengirim
          const { data: pData } = await supabase
            .from('pengirim')
            .select('*')
            .eq('id', suratData.pengirim_id)
            .maybeSingle();

          if (!ignore && pData) setPengirim(pData);

          // Fetch Periode
          const { data: perData } = await supabase
            .from('periode')
            .select('*')
            .eq('id', suratData.periode_id)
            .maybeSingle();

          if (!ignore && perData) setPeriodeData(perData);
        }
      } catch (err) {
        console.error('Error fetching detail surat masuk:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  // FR-017: Perbarui Bentuk Surat Menjadi 'Softfile & Hardfile'
  const handleJadikanKeduanya = async () => {
    if (!surat) return;

    Alert.alert(
      'Perbarui Bentuk Surat',
      'Apakah Anda ingin memperbarui status bentuk surat ini menjadi "Softfile & Hardfile"? Pembaruan akan disimpan pada baris yang sama tanpa menambah baris baru.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Perbarui',
          onPress: async () => {
            try {
              setActionLoading(true);
              const { error } = await supabase.rpc('perbarui_bentuk_surat_masuk', {
                p_id: surat.id,
                p_bentuk_baru: 'softfile_hardfile',
              });

              if (error) {
                Alert.alert('Gagal', error.message);
              } else {
                Alert.alert('Berhasil', 'Bentuk surat berhasil diperbarui menjadi Softfile & Hardfile.');
                setReloadKey((prev) => prev + 1);
              }
            } catch {
              Alert.alert('Error', 'Terjadi kesalahan sistem.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // FR-018: Simpan Edit Surat Masuk
  const handleSaveEdit = async () => {
    if (!surat) return;
    setEditError(null);

    if (!editTanggalTerima.trim() || !editNomorAsal.trim() || !editPerihal.trim()) {
      setEditError('Semua kolom wajib diisi.');
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase
        .from('surat_masuk')
        .update({
          tanggal_terima: editTanggalTerima.trim(),
          nomor_asal: editNomorAsal.trim(),
          jenis: editJenis,
          perihal: editPerihal.trim(),
          bentuk: editBentuk,
          catatan: editCatatan.trim() || null,
        })
        .eq('id', surat.id);

      if (error) {
        setEditError(error.message);
      } else {
        setIsEditModalOpen(false);
        Alert.alert('Sukses', 'Data surat masuk berhasil diperbarui.');
        setReloadKey((prev) => prev + 1);
      }
    } catch {
      setEditError('Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!surat) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={54} color="#DC2626" />
        <Text style={styles.emptyTitle}>Surat Masuk Tidak Ditemukan</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPeriodInactive = periodeData ? !periodeData.aktif : isReadonly;
  const canModify = !isPeriodInactive;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Nav */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Rincian Surat Masuk</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Readonly Alert Banner */}
        {isPeriodInactive && (
          <View style={styles.warningBanner}>
            <Ionicons name="lock-closed-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.warningBannerText}>
              Surat ini berada pada periode arsip (hanya baca).
            </Text>
          </View>
        )}

        {/* Agenda Header Card */}
        <View style={styles.agendaCard}>
          <Text style={styles.agendaLabel}>NOMOR AGENDA</Text>
          <Text style={styles.agendaNumber}>
            #{surat.nomor_urut < 10 ? `0${surat.nomor_urut}` : surat.nomor_urut}
          </Text>
          <Text style={styles.agendaTanggal}>Diterima: {formatTanggalIndo(surat.tanggal_terima)}</Text>
        </View>

        {/* Detail Meta Card */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionHeader}>Informasi Surat Masuk</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Perihal Surat</Text>
            <Text style={styles.metaValue}>{surat.perihal}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Asal Pengirim</Text>
            <Text style={styles.metaValue}>{pengirim?.nama ?? 'Tidak Diketahui'}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Nomor Surat Asal</Text>
            <Text style={styles.metaValue} selectable>
              {surat.nomor_asal}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Jenis Surat</Text>
            <View
              style={[
                styles.badgePill,
                surat.jenis === 'undangan' ? styles.badgeUndangan : styles.badgePemberitahuan,
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  surat.jenis === 'undangan' ? styles.textUndangan : styles.textPemberitahuan,
                ]}
              >
                {surat.jenis === 'undangan' ? 'Undangan' : 'Pemberitahuan'}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Bentuk Surat Fisik/Digital</Text>
            <View style={styles.bentukRow}>
              <View style={styles.bentukPill}>
                <Text style={styles.bentukPillText}>
                  {surat.bentuk === 'softfile_hardfile'
                    ? 'Softfile & Hardfile'
                    : surat.bentuk === 'hardfile'
                    ? 'Hardfile (Fisik Cetak)'
                    : 'Softfile (Digital PDF/Foto)'}
                </Text>
              </View>

              {/* FR-017: Pintasan Jadikan Keduanya */}
              {canModify && surat.bentuk !== 'softfile_hardfile' && (
                <TouchableOpacity
                  style={styles.btnJadikanKeduanya}
                  onPress={handleJadikanKeduanya}
                  disabled={actionLoading}
                >
                  <Ionicons name="add-circle-outline" size={14} color="#7C3AED" style={{ marginRight: 4 }} />
                  <Text style={styles.btnJadikanKeduanyaText}>Jadikan Softfile &amp; Hardfile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {surat.catatan ? (
            <>
              <View style={styles.separator} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Catatan</Text>
                <Text style={styles.catatanValue}>{surat.catatan}</Text>
              </View>
            </>
          ) : null}

        </View>

        {/* Action Button: Edit Surat Masuk */}
        {canModify && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setIsEditModalOpen(true)}
            disabled={actionLoading}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.editBtnText}>Edit Data Surat Masuk</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Edit Surat Masuk (FR-018) */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Surat Masuk</Text>
              <Text style={styles.modalSubtitle}>Nomor urut agenda #{surat.nomor_urut} terkunci.</Text>

              {editError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{editError}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Tanggal Terima (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={editTanggalTerima}
                onChangeText={setEditTanggalTerima}
              />

              <Text style={styles.fieldLabel}>Nomor Surat Asal</Text>
              <TextInput
                style={styles.modalInput}
                value={editNomorAsal}
                onChangeText={setEditNomorAsal}
              />

              <Text style={styles.fieldLabel}>Jenis Surat</Text>
              <View style={styles.segmentContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, editJenis === 'undangan' && styles.segmentBtnActive]}
                  onPress={() => setEditJenis('undangan')}
                >
                  <Text style={[styles.segmentBtnText, editJenis === 'undangan' && styles.segmentBtnTextActive]}>
                    Undangan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, editJenis === 'pemberitahuan' && styles.segmentBtnActive]}
                  onPress={() => setEditJenis('pemberitahuan')}
                >
                  <Text style={[styles.segmentBtnText, editJenis === 'pemberitahuan' && styles.segmentBtnTextActive]}>
                    Pemberitahuan
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Perihal Surat</Text>
              <TextInput
                style={styles.modalInput}
                value={editPerihal}
                onChangeText={setEditPerihal}
              />

              <Text style={styles.fieldLabel}>Bentuk Surat</Text>
              <View style={styles.bentukSegment}>
                {[
                  { key: 'softfile', label: 'Softfile' },
                  { key: 'hardfile', label: 'Hardfile' },
                  { key: 'softfile_hardfile', label: 'Keduanya' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.bentukBtn, editBentuk === item.key && styles.bentukBtnActive]}
                    onPress={() => setEditBentuk(item.key as BentukSuratMasuk)}
                  >
                    <Text style={[styles.bentukBtnText, editBentuk === item.key && styles.bentukBtnTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Catatan</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={editCatatan}
                onChangeText={setEditCatatan}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setIsEditModalOpen(false)}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSaveEdit}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveText}>Simpan Perubahan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBackBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  agendaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 18,
  },
  agendaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 1,
  },
  agendaNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6D28D9',
    marginTop: 4,
    marginBottom: 6,
  },
  agendaTanggal: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  metaRow: {
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeUndangan: {
    backgroundColor: '#EEF2FF',
  },
  badgePemberitahuan: {
    backgroundColor: '#FEF3C7',
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textUndangan: {
    color: '#4F46E5',
  },
  textPemberitahuan: {
    color: '#D97706',
  },
  textActive: {
    color: '#059669',
  },
  textCancelled: {
    color: '#DC2626',
  },
  bentukRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  bentukPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bentukPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  btnJadikanKeduanya: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  btnJadikanKeduanyaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  catatanValue: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 10,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentBtnText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  bentukSegment: {
    flexDirection: 'row',
    gap: 6,
  },
  bentukBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  bentukBtnActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  bentukBtnText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  bentukBtnTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

