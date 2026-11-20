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
import { SuratMasuk } from '../../../types/database';
import { formatTanggalIndo } from '../../../utils/formatSurat';
import { saveSuratMasukCache, getSuratMasukCache } from '../../../utils/offlineCache';

const PAGE_SIZE = 20;

export default function SuratMasukListScreen() {
  const router = useRouter();
  const { lembaga, selectedPeriode, isReadonly } = useAuth();

  const [suratList, setSuratList] = useState<SuratMasuk[]>([]);
  const [pengirimMap, setPengirimMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<string | null>(null);
  const [filterBentuk, setFilterBentuk] = useState<string | null>(null);
  const [sortAscending, setSortAscending] = useState<boolean>(false); // default: terbaru di atas (DESC)

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Load Pengirim Map
  useEffect(() => {
    let ignore = false;
    async function loadPengirim() {
      if (!lembaga) return;
      try {
        const { data } = await supabase
          .from('pengirim')
          .select('id, nama')
          .eq('lembaga_id', lembaga.id);
        if (!ignore && data) {
          const map: Record<string, string> = {};
          data.forEach((p: { id: string; nama: string }) => {
            map[p.id] = p.nama;
          });
          setPengirimMap(map);
        }
      } catch (err) {
        console.error('Error fetching pengirim map:', err);
      }
    }
    void loadPengirim();
    return () => {
      ignore = true;
    };
  }, [lembaga]);

  // Load Data with Offline Cache Fallback (FR-019 & FR-022)
  useEffect(() => {
    let ignore = false;

    async function fetchSuratMasuk() {
      if (!lembaga || !selectedPeriode) {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('surat_masuk')
          .select('*')
          .eq('lembaga_id', lembaga.id)
          .eq('periode_id', selectedPeriode.id)
          .order('tanggal_terima', { ascending: sortAscending })
          .order('dicatat_pada', { ascending: sortAscending })
          .range(0, PAGE_SIZE - 1);

        if (filterJenis) {
          query = query.eq('jenis', filterJenis);
        }
        if (filterBentuk) {
          query = query.eq('bentuk', filterBentuk);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!ignore && data) {
          setSuratList(data);
          setHasMore(data.length === PAGE_SIZE);
          setPage(0);
          setIsOfflineData(false);
          // Simpan ke cache offline
          void saveSuratMasukCache(lembaga.id, selectedPeriode.id, data);
        }
      } catch {
        // Gagal / Offline: Coba baca dari cache lokal
        if (!ignore && lembaga && selectedPeriode) {
          const cached = await getSuratMasukCache(lembaga.id, selectedPeriode.id);
          if (cached && cached.data) {
            setSuratList(cached.data);
            setIsOfflineData(true);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void fetchSuratMasuk();

    return () => {
      ignore = true;
    };
  }, [lembaga, selectedPeriode, sortAscending, filterJenis, filterBentuk, reloadKey]);

  // Load More (Paginasi)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !lembaga || !selectedPeriode || isOfflineData) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('surat_masuk')
        .select('*')
        .eq('lembaga_id', lembaga.id)
        .eq('periode_id', selectedPeriode.id)
        .order('tanggal_terima', { ascending: sortAscending })
        .order('dicatat_pada', { ascending: sortAscending })
        .range(from, to);

      if (filterJenis) query = query.eq('jenis', filterJenis);
      if (filterBentuk) query = query.eq('bentuk', filterBentuk);

      const { data, error } = await query;

      if (!error && data) {
        setSuratList((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error loading more surat masuk:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((prev) => prev + 1);
  };

  // Filter & Search di sisi klien
  const filteredList = useMemo(() => {
    return suratList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const namaPengirim = (pengirimMap[item.pengirim_id] ?? '').toLowerCase();
        const matchNomorAsal = item.nomor_asal.toLowerCase().includes(q);
        const matchPerihal = item.perihal.toLowerCase().includes(q);
        const matchPengirim = namaPengirim.includes(q);
        const matchTanggal = item.tanggal_terima.includes(q);
        if (!matchNomorAsal && !matchPerihal && !matchPengirim && !matchTanggal) {
          return false;
        }
      }
      return true;
    });
  }, [suratList, searchQuery, pengirimMap]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Surat Masuk</Text>
          <Text style={styles.headerSubtitle}>
            Periode {selectedPeriode?.kode_romawi ?? '-'} {isReadonly ? '(Arsip / Hanya Baca)' : ''}
          </Text>
        </View>

        {!isReadonly && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/masuk/buat')}
            accessibilityLabel="Catat Surat Masuk Baru"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Catat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Offline Banner jika data berasal dari cache */}
      {isOfflineData && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" style={{ marginRight: 6 }} />
          <Text style={styles.offlineBannerText}>
            Mode Offline: Menampilkan data cache lokal terakhir.
          </Text>
        </View>
      )}

      {/* Search Input & Sort Toggle Button */}
      <View style={styles.topActionRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nomor asal, perihal, pengirim..."
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

        {/* FR-019: Tombol Balik Urutan Tanggal */}
        <TouchableOpacity
          style={[styles.sortButton, sortAscending && styles.sortButtonActive]}
          onPress={() => setSortAscending(!sortAscending)}
          accessibilityLabel="Balik Urutan Tanggal Terima"
        >
          <Ionicons
            name={sortAscending ? 'arrow-up' : 'arrow-down'}
            size={16}
            color={sortAscending ? '#FFFFFF' : '#7C3AED'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.sortButtonText, sortAscending && styles.sortButtonTextActive]}>
            {sortAscending ? 'Terlama' : 'Terbaru'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Row: Jenis & Bentuk */}
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
          {['undangan', 'pemberitahuan'].map((j) => (
            <TouchableOpacity
              key={j}
              style={[styles.filterChip, filterJenis === j && styles.filterChipActive]}
              onPress={() => setFilterJenis(filterJenis === j ? null : j)}
            >
              <Text style={[styles.filterChipText, filterJenis === j && styles.filterChipTextActive]}>
                {j === 'undangan' ? 'Undangan' : 'Pemberitahuan'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter Bentuk */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Bentuk:</Text>
          <TouchableOpacity
            style={[styles.filterChip, filterBentuk === null && styles.filterChipActive]}
            onPress={() => setFilterBentuk(null)}
          >
            <Text style={[styles.filterChipText, filterBentuk === null && styles.filterChipTextActive]}>
              Semua
            </Text>
          </TouchableOpacity>
          {[
            { k: 'softfile', l: 'Softfile' },
            { k: 'hardfile', l: 'Hardfile' },
            { k: 'softfile_hardfile', l: 'Keduanya' },
          ].map((b) => (
            <TouchableOpacity
              key={b.k}
              style={[styles.filterChip, filterBentuk === b.k && styles.filterChipActive]}
              onPress={() => setFilterBentuk(filterBentuk === b.k ? null : b.k)}
            >
              <Text style={[styles.filterChipText, filterBentuk === b.k && styles.filterChipTextActive]}>
                {b.l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List Surat Masuk */}
      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#7C3AED']} />
          }
          renderItem={({ item }) => {
            const namaPengirim = pengirimMap[item.pengirim_id] ?? 'Pengirim Tidak Diketahui';
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(tabs)/masuk/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.agendaBadge}>
                    <Text style={styles.agendaBadgeText}>
                      No. {item.nomor_urut < 10 ? `0${item.nomor_urut}` : item.nomor_urut}
                    </Text>
                  </View>

                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.jenisBadge,
                        item.jenis === 'undangan' ? styles.badgeUndangan : styles.badgePemberitahuan,
                      ]}
                    >
                      <Text
                        style={[
                          styles.jenisBadgeText,
                          item.jenis === 'undangan' ? styles.textUndangan : styles.textPemberitahuan,
                        ]}
                      >
                        {item.jenis === 'undangan' ? 'Undangan' : 'Pemberitahuan'}
                      </Text>
                    </View>

                    <View style={styles.bentukBadge}>
                      <Text style={styles.bentukBadgeText}>
                        {item.bentuk === 'softfile_hardfile'
                          ? 'Softfile & Hardfile'
                          : item.bentuk === 'hardfile'
                          ? 'Hardfile'
                          : 'Softfile'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.dateText}>{formatTanggalIndo(item.tanggal_terima)}</Text>
                </View>

                {/* Perihal */}
                <Text style={styles.perihalText} numberOfLines={2}>
                  {item.perihal}
                </Text>

                {/* Pengirim */}
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.pengirimText} numberOfLines={1}>
                    Dari: {namaPengirim}
                  </Text>
                </View>

                {/* Nomor Asal */}
                <View style={styles.infoRow}>
                  <Ionicons name="document-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.nomorAsalText} numberOfLines={1}>
                    No. Asal: {item.nomor_asal}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Ionicons name="mail-unread-outline" size={54} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Tidak Ada Surat Masuk</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filterJenis || filterBentuk
                  ? 'Tidak ada surat yang sesuai dengan kata kunci atau filter pencarian.'
                  : 'Belum ada surat masuk yang dicatat pada periode ini.'}
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
                  <ActivityIndicator size="small" color="#7C3AED" />
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
    backgroundColor: '#7C3AED',
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 10,
  },
  sortButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#7C3AED',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agendaBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  agendaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  jenisBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeUndangan: {
    backgroundColor: '#EEF2FF',
  },
  badgePemberitahuan: {
    backgroundColor: '#FEF3C7',
  },
  jenisBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textUndangan: {
    color: '#4F46E5',
  },
  textPemberitahuan: {
    color: '#D97706',
  },
  bentukBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bentukBadgeText: {
    fontSize: 11,
    color: '#4B5563',
  },
  dateText: {
    fontSize: 11,
    color: '#6B7280',
  },
  perihalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  pengirimText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  nomorAsalText: {
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
    color: '#7C3AED',
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
