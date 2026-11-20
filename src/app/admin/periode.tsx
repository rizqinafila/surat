import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Lembaga, Periode } from '../../types/database';

export default function AdminPeriodeScreen() {
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [selectedLembaga, setSelectedLembaga] = useState<Lembaga | null>(null);
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal Tambah Periode
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [kodeRomawi, setKodeRomawi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [periodeReloadKey, setPeriodeReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadLembagaData() {
      try {
        const { data, error } = await supabase
          .from('lembaga')
          .select('*')
          .order('kode', { ascending: true });

        if (!ignore && !error && data) {
          setLembagaList(data);
          setSelectedLembaga((prev) => prev ?? (data.length > 0 ? data[0] : null));
        }
      } catch (err) {
        console.error('Error fetching lembaga:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadLembagaData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadPeriodeData(lembagaId: string) {
      try {
        const { data, error } = await supabase
          .from('periode')
          .select('*')
          .eq('lembaga_id', lembagaId)
          .order('tanggal_mulai', { ascending: false });

        if (!ignore && !error && data) {
          setPeriodeList(data);
        }
      } catch (err) {
        console.error('Error fetching periode:', err);
      } finally {
        if (!ignore) {
          setActionLoading(false);
        }
      }
    }

    if (selectedLembaga) {
      void loadPeriodeData(selectedLembaga.id);
    }

    return () => {
      ignore = true;
    };
  }, [selectedLembaga, periodeReloadKey]);

  const refreshPeriode = () => {
    setActionLoading(true);
    setPeriodeReloadKey((prev) => prev + 1);
  };

  const handleActivatePeriode = async (periode: Periode) => {
    if (!selectedLembaga) return;

    Alert.alert(
      'Aktifkan Periode',
      `Jadikan Periode ${periode.kode_romawi} sebagai periode aktif untuk ${selectedLembaga.nama}? Periode lain akan menjadi hanya-baca.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Aktifkan',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const { error } = await supabase.rpc('admin_ganti_periode_aktif', {
                p_lembaga_id: selectedLembaga.id,
                p_periode_id: periode.id,
              });

              if (error) {
                Alert.alert('Gagal', 'Tidak dapat mengganti periode: ' + error.message);
              } else {
                Alert.alert('Berhasil', `Periode ${periode.kode_romawi} kini aktif.`);
                refreshPeriode();
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

  const handleTambahPeriode = async () => {
    setFormError(null);
    if (!selectedLembaga) return;

    if (!kodeRomawi.trim() || !tanggalMulai.trim() || !tanggalSelesai.trim()) {
      setFormError('Semua kolom wajib diisi.');
      return;
    }

    try {
      setActionLoading(true);
      const { error } = await supabase.from('periode').insert({
        lembaga_id: selectedLembaga.id,
        kode_romawi: kodeRomawi.trim().toUpperCase(),
        tanggal_mulai: tanggalMulai.trim(),
        tanggal_selesai: tanggalSelesai.trim(),
        aktif: periodeList.length === 0, // jika periode pertama, langsung jadikan aktif
      });

      if (error) {
        setFormError(error.message);
      } else {
        setIsModalVisible(false);
        setKodeRomawi('');
        setTanggalMulai('');
        setTanggalSelesai('');
        refreshPeriode();
      }
    } catch {
      setFormError('Gagal menambahkan periode baru.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Lembaga Selector Chips */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Pilih Lembaga:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={lembagaList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const isSelected = selectedLembaga?.id === item.id;
            return (
              <TouchableOpacity
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedLembaga(item)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {item.kode} - {item.nama}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Selected Lembaga Header */}
      {selectedLembaga && (
        <View style={styles.lembagaInfoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lembagaInfoTitle}>{selectedLembaga.nama}</Text>
            <Text style={styles.lembagaInfoSubtitle}>
              Kode: {selectedLembaga.kode} · Kategori: {selectedLembaga.kategori}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsModalVisible(true)}
            accessibilityLabel="Tambah Periode Baru"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Periode Baru</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Daftar Periode */}
      {actionLoading || loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={periodeList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.periodCard, item.aktif && styles.periodCardActive]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.periodRomawi}>Periode {item.kode_romawi}</Text>
                  <Text style={styles.periodDates}>
                    {item.tanggal_mulai} s.d. {item.tanggal_selesai}
                  </Text>
                </View>
                {item.aktif ? (
                  <View style={styles.badgeActive}>
                    <Text style={styles.badgeActiveText}>Periode Aktif</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.activateButton}
                    onPress={() => handleActivatePeriode(item)}
                  >
                    <Text style={styles.activateButtonText}>Aktifkan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Belum ada periode untuk lembaga ini.</Text>
            </View>
          }
        />
      )}

      {/* Modal Tambah Periode */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Periode Baru</Text>
            <Text style={styles.modalSubtitle}>Untuk lembaga: {selectedLembaga?.nama}</Text>

            {formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Kode Romawi</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: XXVI atau IX"
              value={kodeRomawi}
              onChangeText={setKodeRomawi}
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Tanggal Mulai (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 2026-01-01"
              value={tanggalMulai}
              onChangeText={setTanggalMulai}
            />

            <Text style={styles.fieldLabel}>Tanggal Selesai (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 2026-12-31"
              value={tanggalSelesai}
              onChangeText={setTanggalSelesai}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setIsModalVisible(false);
                  setFormError(null);
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleTambahPeriode}>
                <Text style={styles.modalSaveText}>Simpan</Text>
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
  selectorContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  lembagaInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lembagaInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  lembagaInfoSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodRomawi: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  periodDates: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActiveText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  activateButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activateButtonText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 14,
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
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
});

