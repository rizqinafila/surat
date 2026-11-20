import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Lembaga } from '../../types/database';

export default function AdminLembagaScreen() {
  const [lembagaList, setLembagaList] = useState<Lembaga[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLembaga, setSelectedLembaga] = useState<Lembaga | null>(null);
  const [kode, setKode] = useState('');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('lembaga')
          .select('*')
          .order('kode', { ascending: true });

        if (!ignore && !error && data) {
          setLembagaList(data);
        }
      } catch (err) {
        console.error('Error fetching lembaga:', err);
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
  }, [reloadKey]);

  const refreshLembaga = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) {
      return lembagaList;
    }
    const q = searchQuery.toLowerCase();
    return lembagaList.filter(
      (l) =>
        l.kode.toLowerCase().includes(q) ||
        l.nama.toLowerCase().includes(q) ||
        l.kategori.toLowerCase().includes(q)
    );
  }, [searchQuery, lembagaList]);

  const handleOpenModal = (item?: Lembaga) => {
    setFormError(null);
    if (item) {
      setSelectedLembaga(item);
      setKode(item.kode);
      setNama(item.nama);
      setKategori(item.kategori);
    } else {
      setSelectedLembaga(null);
      setKode('');
      setNama('');
      setKategori('');
    }
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!kode.trim() || !nama.trim() || !kategori.trim()) {
      setFormError('Semua kolom wajib diisi.');
      return;
    }

    try {
      setActionLoading(true);
      if (selectedLembaga) {
        // Edit Lembaga
        const { error } = await supabase
          .from('lembaga')
          .update({
            kode: kode.trim().toUpperCase(),
            nama: nama.trim(),
            kategori: kategori.trim(),
          })
          .eq('id', selectedLembaga.id);

        if (error) {
          setFormError(error.message);
        } else {
          setIsModalVisible(false);
          refreshLembaga();
        }
      } else {
        // Tambah Lembaga Baru
        const { error } = await supabase.from('lembaga').insert({
          kode: kode.trim().toUpperCase(),
          nama: nama.trim(),
          kategori: kategori.trim(),
          aktif: true,
        });

        if (error) {
          setFormError(error.message);
        } else {
          setIsModalVisible(false);
          refreshLembaga();
        }
      }
    } catch {
      setFormError('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatusLembaga = async (item: Lembaga) => {
    Alert.alert(
      item.aktif ? 'Nonaktifkan Lembaga' : 'Aktifkan Lembaga',
      `Ubah status ${item.nama} menjadi ${item.aktif ? 'Nonaktif' : 'Aktif'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ubah',
          onPress: async () => {
            try {
              setActionLoading(true);
              const { error } = await supabase
                .from('lembaga')
                .update({ aktif: !item.aktif })
                .eq('id', item.id);

              if (error) {
                Alert.alert('Gagal', error.message);
              } else {
                refreshLembaga();
              }
            } catch {
              Alert.alert('Error', 'Gagal memperbarui status.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search & Action Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kode atau nama lembaga..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleOpenModal()}
          accessibilityLabel="Tambah Lembaga"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.kode}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{item.nama}</Text>
                  <Text style={styles.cardCategory}>{item.kategori}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.statusBadge, item.aktif ? styles.badgeActive : styles.badgeInactive]}
                  onPress={() => toggleStatusLembaga(item)}
                >
                  <Text style={[styles.statusText, item.aktif ? styles.textActive : styles.textInactive]}>
                    {item.aktif ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleOpenModal(item)}
                  accessibilityLabel="Edit Lembaga"
                >
                  <Ionicons name="create-outline" size={18} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Tidak ada lembaga yang sesuai.</Text>
            </View>
          }
        />
      )}

      {/* Modal Tambah/Edit */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedLembaga ? 'Edit Master Lembaga' : 'Tambah Lembaga Baru'}
            </Text>

            {formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Kode Lembaga (tanpa -Un)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: M07 atau S04"
              value={kode}
              onChangeText={setKode}
              autoCapitalize="characters"
              editable={!actionLoading}
            />

            <Text style={styles.fieldLabel}>Nama Lengkap Lembaga</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: UKM Zenith"
              value={nama}
              onChangeText={setNama}
              editable={!actionLoading}
            />

            <Text style={styles.fieldLabel}>Kategori</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: UKM, HMPS, Senat Fakultas, dll."
              value={kategori}
              onChangeText={setKategori}
              editable={!actionLoading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setIsModalVisible(false);
                  setFormError(null);
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, actionLoading && { backgroundColor: '#A5B4FC' }]}
                onPress={handleSave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan</Text>
                )}
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
  topBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  codeBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  codeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
  },
  badgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textActive: {
    color: '#059669',
  },
  textInactive: {
    color: '#DC2626',
  },
  editBtn: {
    padding: 6,
  },
  loadingView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
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

