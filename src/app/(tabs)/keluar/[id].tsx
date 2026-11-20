import React, { useEffect, useState, useMemo } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { SuratKeluar, RefJenisSurat, RefPenandatangan, Periode } from '../../../types/database';
import { formatTanggalIndo } from '../../../utils/formatSurat';

export default function DetailSuratKeluarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isReadonly } = useAuth();

  const [surat, setSurat] = useState<SuratKeluar | null>(null);
  const [periodeData, setPeriodeData] = useState<Periode | null>(null);
  const [refJenisList, setRefJenisList] = useState<RefJenisSurat[]>([]);
  const [refTtdList, setRefTtdList] = useState<RefPenandatangan[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editJenisSurat, setEditJenisSurat] = useState('');
  const [editPenandatangan, setEditPenandatangan] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editHal, setEditHal] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Load Surat Data & References
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!id) return;

      try {
        const [suratRes, jenisRes, ttdRes] = await Promise.all([
          supabase.from('surat_keluar').select('*').eq('id', id).maybeSingle(),
          supabase.from('ref_jenis_surat').select('*').order('kode', { ascending: true }),
          supabase.from('ref_penandatangan').select('*').order('kode', { ascending: true }),
        ]);

        if (!ignore) {
          if (jenisRes.data) setRefJenisList(jenisRes.data);
          if (ttdRes.data) setRefTtdList(ttdRes.data);

          if (suratRes.data) {
            setSurat(suratRes.data);
            setEditJenisSurat(suratRes.data.jenis_surat);
            setEditPenandatangan(suratRes.data.penandatangan);
            setEditTanggal(suratRes.data.tanggal);
            setEditHal(suratRes.data.hal);
            setEditAlamat(suratRes.data.alamat);

            // Fetch periode info
            const { data: pData } = await supabase
              .from('periode')
              .select('*')
              .eq('id', suratRes.data.periode_id)
              .maybeSingle();

            if (!ignore && pData) {
              setPeriodeData(pData);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching surat detail:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  const handleCopy = async () => {
    if (!surat) return;
    await Clipboard.setStringAsync(surat.nomor_lengkap);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!surat) return;
    setEditError(null);
    setEditJenisSurat(surat.jenis_surat);
    setEditPenandatangan(surat.penandatangan);
    setEditTanggal(surat.tanggal);
    setEditHal(surat.hal);
    setEditAlamat(surat.alamat);
    setIsEditModalOpen(true);
  };

  // Handle Save Edit via RPC edit_surat_keluar
  const handleSaveEdit = async () => {
    if (!surat) return;
    setEditError(null);

    if (!editHal.trim() || !editAlamat.trim() || !editTanggal.trim()) {
      setEditError('Semua kolom wajib diisi.');
      return;
    }

    try {
      setActionLoading(true);
      const { data, error } = await supabase.rpc('edit_surat_keluar', {
        p_id: surat.id,
        p_jenis_surat: editJenisSurat,
        p_penandatangan: editPenandatangan,
        p_tanggal: editTanggal.trim(),
        p_hal: editHal.trim(),
        p_alamat: editAlamat.trim(),
      });

      if (error) {
        setEditError(error.message);
      } else if (data) {
        setIsEditModalOpen(false);
        // FR-009: Setelah simpan, aplikasi menampilkan pemberitahuan nomor lama -> nomor baru
        Alert.alert(
          'Surat Berhasil Diperbarui',
          `Nomor Surat telah diperbarui secara otomatis:\n\nNomor Lama:\n${data.nomor_lama}\n\nNomor Baru:\n${data.nomor_baru}`,
          [{ text: 'Mengerti', onPress: () => setReloadKey((prev) => prev + 1) }]
        );
      }
    } catch {
      setEditError('Terjadi kesalahan jaringan saat menyimpan perubahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Batalkan Surat via RPC batalkan_surat_keluar
  const handleBatalkan = () => {
    if (!surat) return;

    Alert.alert(
      'Konfirmasi Pembatalan Surat',
      `Apakah Anda yakin ingin membatalkan surat ini?\n\nNomor:\n${surat.nomor_lengkap}\n\nPenting: Nomor surat yang sudah dibatalkan TIDAK AKAN PERNAH dipakai ulang.`,
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Ya, Batalkan Surat',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const { error } = await supabase.rpc('batalkan_surat_keluar', {
                p_id: surat.id,
              });

              if (error) {
                Alert.alert('Gagal Membatalkan', error.message);
              } else {
                Alert.alert('Sukses', 'Surat telah ditandai sebagai dibatalkan.');
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

  const jenisSuratNama = useMemo(() => {
    return refJenisList.find((j) => j.kode === surat?.jenis_surat)?.nama ?? surat?.jenis_surat;
  }, [refJenisList, surat]);

  const penandatanganNama = useMemo(() => {
    return refTtdList.find((t) => t.kode === surat?.penandatangan)?.nama ?? surat?.penandatangan;
  }, [refTtdList, surat]);

  const filteredTtdList = useMemo(() => {
    return refTtdList.filter((item) =>
      surat?.format === 'kepanitiaan'
        ? item.kelompok === 'kepanitiaan' || item.kode === 'E-0'
        : item.kelompok === 'lembaga'
    );
  }, [refTtdList, surat]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  if (!surat) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={54} color="#DC2626" />
        <Text style={styles.emptyTitle}>Surat Tidak Ditemukan</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isDibatalkan = surat.status === 'dibatalkan';
  const isPeriodInactive = periodeData ? !periodeData.aktif : isReadonly;
  const canModify = !isDibatalkan && !isPeriodInactive;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Bar Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Rincian Surat Keluar</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Readonly or Cancelled Alert Banner */}
        {isPeriodInactive && (
          <View style={styles.warningBanner}>
            <Ionicons name="lock-closed-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.warningBannerText}>
              Surat ini berada pada periode arsip (hanya baca).
            </Text>
          </View>
        )}

        {isDibatalkan && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.cancelledBannerText}>
              Surat ini telah DIBATALKAN. Nomor surat terkunci dan tidak dapat dipakai ulang.
            </Text>
          </View>
        )}

        {/* Main Number Card with Copy Button */}
        <View style={styles.numberCard}>
          <Text style={styles.numberCardLabel}>NOMOR SURAT RESMI</Text>
          <Text
            style={[styles.numberCardText, isDibatalkan && styles.numberCardTextDibatalkan]}
            selectable
          >
            {surat.nomor_lengkap}
          </Text>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopy} activeOpacity={0.8}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color="#0D9488"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.copyButtonText}>
              {copied ? 'Nomor Berhasil Disalin!' : 'Salin Nomor ke Clipboard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Detail Meta Card */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionHeader}>Informasi Surat</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Perihal (Hal)</Text>
            <Text style={styles.metaValue}>{surat.hal}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Alamat / Tujuan</Text>
            <Text style={styles.metaValue}>{surat.alamat}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tanggal Surat</Text>
            <Text style={styles.metaValue}>{formatTanggalIndo(surat.tanggal)}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Format</Text>
            <Text style={styles.metaValue}>
              {surat.format === 'kepanitiaan' ? 'Surat Kepanitiaan' : 'Surat Lembaga'}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Jenis Surat</Text>
            <Text style={styles.metaValue}>
              Kode {surat.jenis_surat} — {jenisSuratNama}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Penandatangan</Text>
            <Text style={styles.metaValue}>
              {surat.penandatangan} ({penandatanganNama})
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Status Surat</Text>
            <View
              style={[
                styles.statusPill,
                isDibatalkan ? styles.statusPillCancelled : styles.statusPillActive,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isDibatalkan ? styles.textCancelled : styles.textActive,
                ]}
              >
                {isDibatalkan ? 'DIBATALKAN' : 'AKTIF'}
              </Text>
            </View>
          </View>

        </View>

        {/* Action Buttons (Edit & Batalkan) */}
        {canModify && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={openEditModal}
              disabled={actionLoading}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.editButtonText}>Edit Surat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleBatalkan}
              disabled={actionLoading}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.cancelButtonText}>Batalkan Surat</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal (FR-009) */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Surat Keluar</Text>
              <Text style={styles.modalSubtitle}>
                Nomor urut terkunci. Mengubah jenis, penandatangan, atau tanggal akan menyusun ulang nomor secara otomatis.
              </Text>

              {editError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{editError}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Jenis Surat</Text>
              <View style={styles.optionsGrid}>
                {refJenisList.map((j) => {
                  const isSel = j.kode === editJenisSurat;
                  return (
                    <TouchableOpacity
                      key={j.kode}
                      style={[styles.optionCard, isSel && styles.optionCardActive]}
                      onPress={() => setEditJenisSurat(j.kode)}
                    >
                      <Text style={[styles.optionText, isSel && styles.optionTextActive]}>
                        {j.kode} - {j.nama}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Penandatangan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ttdScroll}>
                {filteredTtdList.map((t) => {
                  const isSel = t.kode === editPenandatangan;
                  return (
                    <TouchableOpacity
                      key={t.kode}
                      style={[styles.ttdChip, isSel && styles.ttdChipActive]}
                      onPress={() => setEditPenandatangan(t.kode)}
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

              <Text style={styles.fieldLabel}>Tanggal Surat (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={editTanggal}
                onChangeText={setEditTanggal}
                placeholder="2026-03-01"
              />

              <Text style={styles.fieldLabel}>Perihal (Hal)</Text>
              <TextInput
                style={styles.modalInput}
                value={editHal}
                onChangeText={setEditHal}
              />

              <Text style={styles.fieldLabel}>Alamat Surat</Text>
              <TextInput
                style={styles.modalInput}
                value={editAlamat}
                onChangeText={setEditAlamat}
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
                    <Text style={styles.modalSaveText}>Simpan & Perbarui</Text>
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  cancelledBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  numberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  numberCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    letterSpacing: 1,
    marginBottom: 8,
  },
  numberCardText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  numberCardTextDibatalkan: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
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
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  statusPillActive: {
    backgroundColor: '#D1FAE5',
  },
  statusPillCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textActive: {
    color: '#059669',
  },
  textCancelled: {
    color: '#DC2626',
  },
  actionButtonsContainer: {
    gap: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 10,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#DC2626',
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
    backgroundColor: '#0D9488',
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
    marginBottom: 14,
    lineHeight: 16,
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
  optionsGrid: {
    gap: 6,
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
  },
  optionCardActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  optionText: {
    fontSize: 12,
    color: '#374151',
  },
  optionTextActive: {
    color: '#0D9488',
    fontWeight: '700',
  },
  ttdScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  ttdChip: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    alignItems: 'center',
  },
  ttdChipActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
    borderWidth: 1.5,
  },
  ttdChipCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  ttdChipCodeActive: {
    color: '#0D9488',
  },
  ttdChipName: {
    fontSize: 10,
    color: '#6B7280',
  },
  ttdChipNameActive: {
    color: '#0F766E',
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
    backgroundColor: '#0D9488',
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

