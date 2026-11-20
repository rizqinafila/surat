import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuratKeluar, SuratMasuk } from '../types/database';

const PREFIX_KELUAR = 'cache_surat_keluar_';
const PREFIX_MASUK = 'cache_surat_masuk_';

export async function saveSuratKeluarCache(
  lembagaId: string,
  periodeId: string,
  data: SuratKeluar[]
): Promise<void> {
  try {
    const key = `${PREFIX_KELUAR}${lembagaId}_${periodeId}`;
    const payload = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('Gagal menyimpan cache surat keluar:', err);
  }
}

export async function getSuratKeluarCache(
  lembagaId: string,
  periodeId: string
): Promise<{ data: SuratKeluar[]; timestamp: number } | null> {
  try {
    const key = `${PREFIX_KELUAR}${lembagaId}_${periodeId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Gagal membaca cache surat keluar:', err);
    return null;
  }
}

export async function saveSuratMasukCache(
  lembagaId: string,
  periodeId: string,
  data: SuratMasuk[]
): Promise<void> {
  try {
    const key = `${PREFIX_MASUK}${lembagaId}_${periodeId}`;
    const payload = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('Gagal menyimpan cache surat masuk:', err);
  }
}

export async function getSuratMasukCache(
  lembagaId: string,
  periodeId: string
): Promise<{ data: SuratMasuk[]; timestamp: number } | null> {
  try {
    const key = `${PREFIX_MASUK}${lembagaId}_${periodeId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Gagal membaca cache surat masuk:', err);
    return null;
  }
}

