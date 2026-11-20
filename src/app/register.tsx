import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { DAFTAR_67_LEMBAGA, LembagaPreset } from '../constants/lembagaList';

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [kodePeriode, setKodePeriode] = useState('IV');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pilihan Lembaga (Default ke HMPS Informatika P24)
  const defaultLembaga = useMemo(
    () => DAFTAR_67_LEMBAGA.find((l) => l.kode === 'P24') || DAFTAR_67_LEMBAGA[0],
    []
  );
  const [selectedLembaga, setSelectedLembaga] = useState<LembagaPreset>(defaultLembaga);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLembaga = useMemo(() => {
    if (!searchQuery.trim()) return DAFTAR_67_LEMBAGA;
    const q = searchQuery.toLowerCase();
    return DAFTAR_67_LEMBAGA.filter(
      (l) => l.nama.toLowerCase().includes(q) || l.kode.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Harap isi seluruh kolom yang wajib.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal harus 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    const res = await register({
      email: email.trim(),
      password,
      kodeLembaga: selectedLembaga.kode,
      namaLembaga: selectedLembaga.nama,
      kategoriLembaga: selectedLembaga.kategori,
      kodePeriode: kodePeriode.trim() || '2026',
    });

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="person-add-outline" size={36} color="#0D9488" />
            </View>
            <Text style={styles.appTitle}>Daftar Akun Lembaga</Text>
            <Text style={styles.appSubtitle}>
              Buat akun baru untuk kepengurusan lembaga mahasiswa Anda
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color="#DC2626" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Pilihan Lembaga */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lembaga Kemahasiswaan</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setIsPickerOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.pickerContent}>
                <View style={styles.kodeBadge}>
                  <Text style={styles.kodeBadgeText}>{selectedLembaga.kode}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lembagaNama}>{selectedLembaga.nama}</Text>
                  <Text style={styles.lembagaKategori}>{selectedLembaga.kategori}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Kode Periode */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kode Periode Kepengurusan Aktif</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contoh: IV atau 2026"
                placeholderTextColor="#9CA3AF"
                value={kodePeriode}
                onChangeText={setKodePeriode}
                autoCapitalize="characters"
                editable={!isLoading}
              />
            </View>
            <Text style={styles.helperText}>
              Nomor surat akan disusun berdasarkan kode romawi periode ini.
            </Text>
          </View>

          {/* Form Fields: Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alamat Email Akun</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="misal: informatika@suratin.local"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Form Fields: Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields: Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Konfirmasi Kata Sandi</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ulangi kata sandi"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.registerButtonText}>Daftar &amp; Aktifkan Akun</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Sudah memiliki akun lembaga?</Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Masuk di sini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Picker Lembaga */}
      <Modal visible={isPickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Lembaga Kemahasiswaan</Text>
              <TouchableOpacity onPress={() => setIsPickerOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchWrapper}>
              <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Cari kode (misal: P24) atau nama lembaga..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredLembaga}
              keyExtractor={(item) => item.kode}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.kode === selectedLembaga.kode;
                return (
                  <TouchableOpacity
                    style={[styles.lembagaItem, isSelected && styles.lembagaItemSelected]}
                    onPress={() => {
                      setSelectedLembaga(item);
                      setIsPickerOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={[styles.itemKodeBadge, isSelected && styles.itemKodeBadgeSelected]}>
                      <Text style={[styles.itemKodeText, isSelected && styles.itemKodeTextSelected]}>
                        {item.kode}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemNamaText, isSelected && styles.itemNamaTextSelected]}>
                        {item.nama}
                      </Text>
                      <Text style={styles.itemKategoriText}>{item.kategori}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color="#0D9488" /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    height: 48,
  },
  fieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  eyeButton: {
    padding: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    padding: 12,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  kodeBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  kodeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  lembagaNama: {
    fontSize: 14,
    fontWeight: '700',
    color: '#134E4A',
  },
  lembagaKategori: {
    fontSize: 11,
    color: '#0F766E',
  },
  registerButton: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#99F6E4',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPrompt: {
    fontSize: 13,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  lembagaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lembagaItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  itemKodeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
    minWidth: 44,
    alignItems: 'center',
  },
  itemKodeBadgeSelected: {
    backgroundColor: '#0D9488',
  },
  itemKodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  itemKodeTextSelected: {
    color: '#FFFFFF',
  },
  itemNamaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  itemNamaTextSelected: {
    color: '#0F766E',
    fontWeight: '700',
  },
  itemKategoriText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
});

