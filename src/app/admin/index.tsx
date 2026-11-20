import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [totalLembaga, setTotalLembaga] = useState<number>(0);
  const [totalPeriodeAktif, setTotalPeriodeAktif] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const { count: countLembaga } = await supabase
          .from('lembaga')
          .select('*', { count: 'exact', head: true });

        const { count: countPeriode } = await supabase
          .from('periode')
          .select('*', { count: 'exact', head: true })
          .eq('aktif', true);

        setTotalLembaga(countLembaga ?? 0);
        setTotalPeriodeAktif(countPeriode ?? 0);
      } catch (err) {
        console.error('Error loading admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Selamat datang di modul administrasi master data dan sistem.</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="business" size={24} color="#4F46E5" />
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text style={styles.statNumber}>{totalLembaga}</Text>
            )}
            <Text style={styles.statLabel}>Lembaga Terdaftar</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="checkmark-done-circle" size={24} color="#16A34A" />
            </View>
            {loading ? (
              <ActivityIndicator size="small" color="#16A34A" />
            ) : (
              <Text style={styles.statNumber}>{totalPeriodeAktif}</Text>
            )}
            <Text style={styles.statLabel}>Periode Aktif</Text>
          </View>
        </View>

        {/* Menu Cards */}
        <Text style={styles.sectionTitle}>Menu Master Data</Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/admin/periode')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar-outline" size={24} color="#D97706" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Kelola Periode Lembaga</Text>
            <Text style={styles.menuDesc}>
              Atur tanggal kepengurusan dan ganti periode aktif tiap lembaga secara manual.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/admin/lembaga')}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="list-outline" size={24} color="#4F46E5" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Kelola Master Lembaga</Text>
            <Text style={styles.menuDesc}>
              Lihat daftar 67 lembaga, kode referensi resmi, kategori, dan status keaktifan.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Security / Policy Note */}
        <View style={styles.policyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4B5563" style={{ marginRight: 8 }} />
          <Text style={styles.policyText}>
            Perubahan periode lama dijaga langsung oleh aturan database (RLS & RPC). Admin tidak membaca surat lembaga (default konservatif TBD-6).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
    marginRight: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
});

