import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Periode } from '../../types/database';
import { eksporSuratKeExcel } from '../../utils/exportExcel';

export default function ArsipScreen() {
  const { allPeriode, selectedPeriode, setSelectedPeriode, periodeAktif, lembaga } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);

  const handleSelectPeriode = (item: Periode) => {
    setSelectedPeriode(item);
  };

  const handleExportPeriode = async () => {
    if (!lembaga || !selectedPeriode) {
      Alert.alert('Perhatian', 'Pilih periode yang ingin diekspor terlebih dahulu.');
      return;
    }

    try {
      setExportLoading(true);
      await eksporSuratKeExcel({
        lembagaId: lembaga.id,
        periodeId: selectedPeriode.id,
        kodeLembaga: lembaga.kode,
        namaPeriode: selectedPeriode.kode_romawi,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengekspor data.';
      Alert.alert('Gagal Mengekspor', msg);
    } finally {
      setExportLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Periode }) => {
    const isSelected = selectedPeriode?.id === item.id;
    const isActive = item.aktif;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
        onPress={() => handleSelectPeriode(item)}
        activeOpacity={0.8}
        accessibilityLabel={`Pilih Periode ${item.kode_romawi}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Ionicons
              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={isSelected ? '#0D9488' : '#9CA3AF'}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.periodName}>Periode {item.kode_romawi}</Text>
          </View>
          {isActive ? (
            <View style={styles.badgeActive}>
              <Text style={styles.badgeActiveText}>Periode Aktif</Text>
            </View>
          ) : (
            <View style={styles.badgePast}>
              <Text style={styles.badgePastText}>Arsip (Hanya Baca)</Text>
            </View>
          )}
        </View>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>
            {item.tanggal_mulai} s.d. {item.tanggal_selesai}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Arsip Periode Kepengurusan</Text>
        <Text style={styles.subtitle}>
          Pilih periode kepengurusan untuk meninjau data surat lama (mode hanya baca).
        </Text>
      </View>

      {/* Banner status yang sedang dipilih */}
      <View style={styles.currentBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.currentLabel}>Periode yang sedang dibuka:</Text>
          <Text style={styles.currentValue}>
            Periode {selectedPeriode ? selectedPeriode.kode_romawi : '-'}{' '}
            {selectedPeriode?.id === periodeAktif?.id ? '(Aktif)' : '(Arsip / Hanya Baca)'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exportLoading && styles.exportBtnDisabled]}
          onPress={handleExportPeriode}
          disabled={exportLoading}
          activeOpacity={0.8}
        >
          {exportLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.exportBtnText}>Unduh Excel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={allPeriode}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada riwayat periode lain untuk lembaga ini.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  currentBanner: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentLabel: {
    fontSize: 12,
    color: '#0F766E',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#134E4A',
    marginTop: 2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  exportBtnDisabled: {
    backgroundColor: '#6EE7B7',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  badgeActive: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActiveText: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '600',
  },
  badgePast: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePastText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

