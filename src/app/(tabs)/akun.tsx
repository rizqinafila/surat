import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { eksporSuratKeExcel } from '../../utils/exportExcel';

export default function AkunScreen() {
  const { user, profile, lembaga, periodeAktif, logout, isLoading } = useAuth();
  const router = useRouter();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError('Gagal memperbarui kata sandi: ' + error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch {
      setPasswordError('Terjadi kesalahan saat memperbarui kata sandi.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!lembaga || !periodeAktif) {
      Alert.alert('Tidak Dapat Mengekspor', 'Data lembaga atau periode aktif belum dimuat.');
      return;
    }

    try {
      setExportLoading(true);
      await eksporSuratKeExcel({
        lembagaId: lembaga.id,
        periodeId: periodeAktif.id,
        kodeLembaga: lembaga.kode,
        namaPeriode: periodeAktif.kode_romawi,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengekspor data.';
      Alert.alert('Gagal Mengekspor', message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={32} color="#0D9488" />
          </View>
          <Text style={styles.institutionName}>
            {lembaga ? lembaga.nama : profile?.peran === 'admin' ? 'Administrator Sistem' : 'Pengguna'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>
              {profile?.peran === 'admin' ? 'Hak Akses: Administrator' : 'Hak Akses: Sekretaris Lembaga'}
            </Text>
          </View>
        </View>

        {/* Informasi Lembaga */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Detail Akun</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kode Lembaga</Text>
            <Text style={styles.infoValue}>{lembaga?.kode ?? '-'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategori</Text>
            <Text style={styles.infoValue}>{lembaga?.kategori ?? '-'}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Satu Akun Bersama</Text>
            <Text style={styles.infoValue}>Aktif (Turun-temurun)</Text>
          </View>
        </View>

        {/* Shortcut Panel Admin jika Admin */}
        {profile?.peran === 'admin' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Administrasi Sistem</Text>
            <TouchableOpacity
              style={styles.adminNavButton}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.adminNavLeft}>
                <Ionicons name="settings-outline" size={20} color="#4F46E5" style={{ marginRight: 10 }} />
                <Text style={styles.adminNavText}>Buka Panel Admin</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Ekspor Data ke Excel */}
        {profile?.peran !== 'admin' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ekspor Data Surat</Text>
            <Text style={styles.exportDesc}>
              Unduh seluruh data surat keluar dan surat masuk pada periode aktif ke dalam satu file Excel (.xlsx). File dapat dibuka di Microsoft Excel, Google Sheets, atau WPS Office.
            </Text>
            <TouchableOpacity
              style={[styles.exportButton, exportLoading && styles.exportButtonDisabled]}
              onPress={handleExportExcel}
              disabled={exportLoading}
              activeOpacity={0.8}
            >
              {exportLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.exportButtonText}>Unduh Excel Periode Aktif</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Ganti Password */}
        <View style={styles.sectionCard}>
          <View style={styles.passwordHeaderRow}>
            <Text style={styles.sectionTitle}>Keamanan Akun</Text>
            {!isChangingPassword && (
              <TouchableOpacity onPress={() => setIsChangingPassword(true)}>
                <Text style={styles.changePasswordLink}>Ganti Kata Sandi</Text>
              </TouchableOpacity>
            )}
          </View>

          {isChangingPassword ? (
            <View style={styles.passwordForm}>
              {passwordError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{passwordError}</Text>
                </View>
              )}
              {passwordSuccess && (
                <View style={styles.successBox}>
                  <Text style={styles.successBoxText}>Kata sandi berhasil diperbarui!</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Kata Sandi Baru</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimal 6 karakter"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!passwordLoading}
              />

              <Text style={styles.fieldLabel}>Konfirmasi Kata Sandi Baru</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ulangi kata sandi baru"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!passwordLoading}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setIsChangingPassword(false);
                    setPasswordError(null);
                  }}
                  disabled={passwordLoading}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, passwordLoading && styles.saveBtnDisabled]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Simpan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.passwordDesc}>
              Kata sandi disarankan diperbarui saat pergantian pengurus/periode kepengurusan baru.
            </Text>
          )}
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.8}
          accessibilityLabel="Keluar dari Akun"
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  institutionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  roleTag: {
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  adminNavButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  adminNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminNavText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changePasswordLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D9488',
  },
  passwordDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  passwordForm: {
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    backgroundColor: '#99F6E4',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  errorBoxText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  successBox: {
    backgroundColor: '#D1FAE5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  successBoxText: {
    color: '#065F46',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    height: 48,
    marginTop: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  exportDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  exportButtonDisabled: {
    backgroundColor: '#6EE7B7',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

