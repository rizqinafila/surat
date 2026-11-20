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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { SuratKeluar } from '../../../types/database';
import { formatTanggalIndo } from '../../../utils/formatSurat';

const PAGE_SIZE = 20;

export default function SuratKeluarListScreen() {
  const router = useRouter();
  const { lembaga, selectedPeriode, isReadonly } = useAuth();

  const [suratList, setSuratList] = useState<SuratKeluar[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<string | null>(null);
  const [filterBulan, setFilterBulan] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load Data
  useEffect(() => {
    let ignore = false;

    async function fetchSurat() {
      if (!lembaga || !selectedPeriode) {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('surat_keluar')
          .select('*')
          .eq('lembaga_id', lembaga.id)
          .eq('periode_id', selectedPeriode.id)
          .order('nomor_urut', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (filterJenis) {
          query = query.eq('jenis_surat', filterJenis);
        }

        const { data, error } = await query;

        if (!ignore && !error && data) {
          setSuratList(data);
          setHasMore(data.length === PAGE_SIZE);
          setPage(0);
        }
      } catch (err) {
        console.error('Error fetching surat keluar:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void fetchSurat();

    return () => {
      ignore = true;
    };
  }, [lembaga, selectedPeriode, filterJenis, reloadKey]);

  // Load More (Pagination)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !lembaga || !selectedPeriode) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('surat_keluar')
        .select('*')
        .eq('lembaga_id', lembaga.id)
        .eq('periode_id', selectedPeriode.id)
        .order('nomor_urut', { ascending: false })
        .range(from, to);

      if (filterJenis) {
        query = query.eq('jenis_surat', filterJenis);
      }

      const { data, error } = await query;

      if (!error && data) {
        setSuratList((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more surat:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((prev) => prev + 1);
  };

  // Filter & Search di sisi klien untuk pencarian teks dan filter bulan
  const filteredList = useMemo(() => {
    return suratList.filter((item) => {
      // 1. Filter Search (nomor_lengkap atau hal atau alamat atau tanggal)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = item.nomor_lengkap.toLowerCase().includes(q);
        const matchHal = item.hal.toLowerCase().includes(q);
        const matchAlamat = item.alamat.toLowerCase().includes(q);
        const matchTanggal = item.tanggal.includes(q);
        if (!matchNumber && !matchHal && !matchAlamat && !matchTanggal) {
          return false;
        }
      }

      // 2. Filter Bulan
      if (filterBulan !== null) {
        const parts = item.tanggal.split('-');
        if (parts.length === 3) {
          const b = parseInt(parts[1], 10);
          if (b !== filterBulan) return false;
        }
      }

      return true;
    });
  }, [suratList, searchQuery, filterBulan]);

  const daftarBulan = [
    { no: 1, label: 'Jan' },
    { no: 2, label: 'Feb' },
    { no: 3, label: 'Mar' },
    { no: 4, label: 'Apr' },
    { no: 5, label: 'Mei' },
    { no: 6, label: 'Jun' },
    { no: 7, label: 'Jul' },
    { no: 8, label: 'Agu' },
    { no: 9, label: 'Sep' },
    { no: 10, label: 'Okt' },
    { no: 11, label: 'Nov' },
    { no: 12, label: 'Des' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Surat Keluar</Text>
          <Text style={styles.headerSubtitle}>
            Periode {selectedPeriode?.kode_romawi ?? '-'} {isReadonly ? '(Arsip / Hanya Baca)' : ''}
          </Text>
        </View>

        {!isReadonly && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/keluar/buat')}
            accessibilityLabel="Buat Nomor Surat Baru"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Buat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nomor, perihal, alamat, tanggal..."
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

      {/* Filter Row: Jenis & Bulan */}
      <View style={styles.filterSection}>
        {/* Filter Jenis */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Jenis:</Text>
          <TouchableOpacity
            style={[styles.filterChip, filterJenis === null && styles.filterChipActive]}
            onPress={() => setFilterJenis(null)}
          >
            <Text style={[styles.filterChipText, filterJenis === null && styles.filterChipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>
          {['01', '02', '03', '04'].map((j) => (
            <TouchableOpacity
              key={j}
              style={[styles.filterChip, filterJenis === j && styles.filterChipActive]}
              onPress={() => setFilterJenis(filterJenis === j ? null : j)}
            >
              <Text style={[styles.filterChipText, filterJenis === j && styles.filterChipTextActive]}>
                {j}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter Bulan Chips */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Bulan:</Text>
          <TouchableOpacity
            style={[styles.filterChip, filterBulan === null && styles.filterChipActive]}
            onPress={() => setFilterBulan(null)}
          >
            <Text style={[styles.filterChipText, filterBulan === null && styles.filterChipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={daftarBulan}
            keyExtractor={(item) => item.no.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, filterBulan === item.no && styles.filterChipActive]}
                onPress={() => setFilterBulan(filterBulan === item.no ? null : item.no)}
              >
                <Text style={[styles.filterChipText, filterBulan === item.no && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* List Surat */}
      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0D9488']} />
          }
          renderItem={({ item }) => {
            const isDibatalkan = item.status === 'dibatalkan';
            return (
              <TouchableOpacity
                style={[styles.card, isDibatalkan && styles.cardDibatalkan]}
                onPress={() => router.push(`/(tabs)/keluar/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isDibatalkan ? styles.badgeCancelled : styles.badgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isDibatalkan ? styles.textCancelled : styles.textActive,
                        ]}
                      >
                        {isDibatalkan ? 'Dibatalkan' : 'Aktif'}
                      </Text>
                    </View>

                    <View style={styles.formatBadge}>
                      <Text style={styles.formatBadgeText}>
                        {item.format === 'kepanitiaan' ? 'Kepanitiaan' : 'Lembaga'}
                      </Text>
                    </View>

                    <View style={styles.jenisBadge}>
                      <Text style={styles.jenisBadgeText}>Jenis: {item.jenis_surat}</Text>
                    </View>
                  </View>

                  <Text style={styles.dateText}>{formatTanggalIndo(item.tanggal)}</Text>
                </View>

                {/* Nomor Lengkap */}
                <Text
                  style={[styles.nomorLengkap, isDibatalkan && styles.nomorLengkapDibatalkan]}
                  numberOfLines={1}
                >
                  {item.nomor_lengkap}
                </Text>

                {/* Hal */}
                <Text style={styles.halText} numberOfLines={2}>
                  {item.hal}
                </Text>

                {/* Alamat Tujuan */}
                <View style={styles.cardFooter}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.alamatText} numberOfLines={1}>
                    {item.alamat}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="document-text-outline" size={54} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Tidak Ada Surat Keluar</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filterJenis || filterBulan
                  ? 'Tidak ada surat yang sesuai dengan kata kunci atau filter pencarian.'
                  : 'Belum ada surat keluar yang dibuat pada periode ini.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && filteredList.length > 0 ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#0D9488" />
                ) : (
                  <Text style={styles.loadMoreText}>Muat Lebih Banyak...</Text>
                )}
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    marginRight: 4,
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDibatalkan: {
    backgroundColor: '#F9FAFB',
    borderColor: '#FCA5A5',
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
  },
  badgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textActive: {
    color: '#059669',
  },
  textCancelled: {
    color: '#DC2626',
  },
  formatBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formatBadgeText: {
    fontSize: 11,
    color: '#4B5563',
  },
  jenisBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  jenisBadgeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  nomorLengkap: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D9488',
    marginBottom: 6,
  },
  nomorLengkapDibatalkan: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  halText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  alamatText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  loadMoreBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
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
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
