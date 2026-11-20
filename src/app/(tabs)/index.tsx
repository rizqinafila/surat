import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { eksporSuratKeExcel } from '../../utils/exportExcel';

export default function HomeScreen() {
  const { lembaga, profile, selectedPeriode, periodeAktif, isReadonly } = useAuth();
  const router = useRouter();
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportExcel = async () => {
    const targetPeriode = selectedPeriode ?? periodeAktif;
    if (!lembaga || !targetPeriode) {
      Alert.alert('Perhatian', 'Data lembaga atau periode belum siap.');
      return;
    }

    try {
      setExportLoading(true);
      await eksporSuratKeExcel({
        lembagaId: lembaga.id,
        periodeId: targetPeriode.id,
        kodeLembaga: lembaga.kode,
        namaPeriode: targetPeriode.kode_romawi,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengekspor data.';
      Alert.alert('Gagal Mengekspor', msg);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.greetingText}>Selamat Datang,</Text>
            <Text style={styles.institutionName}>
              {lembaga ? lembaga.nama : profile?.peran === 'admin' ? 'Administrator Sistem' : 'Akun Lembaga'}
            </Text>
            {lembaga?.kode ? (
              <Text style={styles.institutionCode}>Kode Lembaga: {lembaga.kode}</Text>
            ) : null}
          </View>
          {profile?.peran === 'admin' ? (
            <TouchableOpacity
              style={styles.adminBadge}
              onPress={() => router.push('/admin')}
              accessibilityLabel="Buka Panel Administrator"
            >
              <Ionicons name="shield-checkmark" size={16} color="#4F46E5" />
              <Text style={styles.adminBadgeText}>Panel Admin</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Periode Banner */}
        <View style={[styles.periodBanner, isReadonly ? styles.periodBannerReadonly : styles.periodBannerActive]}>
          <View style={styles.periodRow}>
            <Ionicons
              name={isReadonly ? 'time-outline' : 'checkmark-circle-outline'}
              size={20}
              color={isReadonly ? '#D97706' : '#0D9488'}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.periodTitle}>
                Periode {selectedPeriode ? selectedPeriode.kode_romawi : '-'}
              </Text>
              <Text style={styles.periodSubtitle}>
                {isReadonly
                  ? 'Mode Arsip: Hanya baca. Tombol buat, edit, dan batalkan dinonaktifkan.'
                  : `Periode Aktif (${periodeAktif?.tanggal_mulai ?? ''} s.d. ${periodeAktif?.tanggal_selesai ?? ''})`}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions (Pintasan Aksi Cepat) */}
        <Text style={styles.sectionTitle}>Pintasan Aksi</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionCard, isReadonly && styles.actionCardDisabled]}
            onPress={() => router.push('/keluar/buat')}
            disabled={isReadonly}
            activeOpacity={0.8}
            accessibilityLabel="Buat Nomor Surat Keluar"
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: '#CCFBF1' }]}>
              <Ionicons name="paper-plane" size={24} color="#0D9488" />
            </View>
            <Text style={styles.actionCardTitle}>Buat Surat Keluar</Text>
            <Text style={styles.actionCardDesc}>
              {isReadonly ? 'Terkunci di periode lama' : 'Format Lembaga & Panitia'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, isReadonly && styles.actionCardDisabled]}
            onPress={() => router.push('/masuk/buat')}
            disabled={isReadonly}
            activeOpacity={0.8}
            accessibilityLabel="Catat Surat Masuk"
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="mail-unread" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.actionCardTitle}>Catat Surat Masuk</Text>
            <Text style={styles.actionCardDesc}>
              {isReadonly ? 'Terkunci di periode lama' : 'Agenda otomatis & deteksi mirip'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Excel Export Card */}
        {profile?.peran !== 'admin' && (
          <TouchableOpacity
            style={[styles.excelCard, exportLoading && styles.excelCardDisabled]}
            onPress={handleExportExcel}
            disabled={exportLoading}
            activeOpacity={0.8}
            accessibilityLabel="Unduh Rekap Excel"
          >
            <View style={styles.excelIconWrapper}>
              {exportLoading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Ionicons name="document-text" size={24} color="#059669" />
              )}
            </View>
            <View style={styles.excelTextWrapper}>
              <Text style={styles.excelTitle}>Unduh Rekap Excel (.xlsx)</Text>
              <Text style={styles.excelDesc}>
                Ekspor surat keluar & masuk Periode {selectedPeriode ? selectedPeriode.kode_romawi : ''} ke format Excel
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#059669" />
          </TouchableOpacity>
        )}

        {/* Recent Letters / Empty State */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Surat Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/keluar')}>
            <Text style={styles.seeAllText}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyCard}>
          <Ionicons name="document-text-outline" size={44} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Belum Ada Surat yang Dicatat</Text>
          <Text style={styles.emptyDesc}>
            {isReadonly
              ? 'Tidak ada aktivitas surat pada periode arsip ini.'
              : 'Gunakan tombol di atas untuk membuat nomor surat keluar atau mencatat surat masuk baru.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  institutionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  institutionCode: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  adminBadgeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  periodBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
  },
  periodBannerActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  periodBannerReadonly: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  periodSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionCardDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  excelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  excelCardDisabled: {
    opacity: 0.6,
  },
  excelIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  excelTextWrapper: {
    flex: 1,
    marginRight: 8,
  },
  excelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  excelDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
