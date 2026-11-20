import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  if (!isLoading && profile?.peran !== 'admin') {
    return (
      <SafeAreaView style={styles.unauthorizedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#DC2626" />
        <Text style={styles.unauthorizedTitle}>Akses Ditolak</Text>
        <Text style={styles.unauthorizedDesc}>
          Halaman ini khusus untuk pengguna dengan hak akses Administrator.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.backButtonText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Panel Administrator' }} />
      <Stack.Screen name="periode" options={{ title: 'Kelola Periode Lembaga' }} />
      <Stack.Screen name="lembaga" options={{ title: 'Kelola Master Lembaga' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  unauthorizedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

