import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profil, Lembaga, Periode } from '../types/database';

export interface RegisterParams {
  email: string;
  password: string;
  kodeLembaga: string;
  namaLembaga?: string;
  kategoriLembaga?: string;
  kodePeriode?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profil | null;
  lembaga: Lembaga | null;
  periodeAktif: Periode | null;
  selectedPeriode: Periode | null;
  allPeriode: Periode[];
  isReadonly: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (params: RegisterParams) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setSelectedPeriode: (periode: Periode) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profil | null>(null);
  const [lembaga, setLembaga] = useState<Lembaga | null>(null);
  const [periodeAktif, setPeriodeAktif] = useState<Periode | null>(null);
  const [selectedPeriode, setSelectedPeriode] = useState<Periode | null>(null);
  const [allPeriode, setAllPeriode] = useState<Periode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (currentUser: User) => {
    try {
      // 1. Ambil Profil Pengguna
      let { data: profileData, error: profileError } = await supabase
        .from('profil')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      // Self-healing jika profil belum ada (misal akun HMPS Informatika)
      if (!profileData) {
        try {
          await supabase.rpc('auto_setup_profil_user');
          const { data: healedProfile } = await supabase
            .from('profil')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
          if (healedProfile) {
            profileData = healedProfile;
          }
        } catch {
          // ignore error
        }
      }

      if (profileError && !profileData) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // 2. Jika akun lembaga, ambil data lembaga dan periode
      if (profileData?.lembaga_id) {
        const { data: lembagaData, error: lembagaError } = await supabase
          .from('lembaga')
          .select('*')
          .eq('id', profileData.lembaga_id)
          .maybeSingle();

        if (!lembagaError && lembagaData) {
          setLembaga(lembagaData);
        }

        // Ambil semua periode milik lembaga ini
        const { data: periodeList, error: periodeError } = await supabase
          .from('periode')
          .select('*')
          .eq('lembaga_id', profileData.lembaga_id)
          .order('tanggal_mulai', { ascending: false });

        if (!periodeError && periodeList && periodeList.length > 0) {
          setAllPeriode(periodeList);
          const active = periodeList.find((p) => p.aktif);
          if (active) {
            setPeriodeAktif(active);
            setSelectedPeriode(active);
          } else {
            setPeriodeAktif(periodeList[0]);
            setSelectedPeriode(periodeList[0]);
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching user data:', err);
    }
  }, []);

  useEffect(() => {
    // Inisialisasi sesi Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Dengarkan perubahan autentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchUserData(currentSession.user);
      } else {
        setProfile(null);
        setLembaga(null);
        setPeriodeAktif(null);
        setSelectedPeriode(null);
        setAllPeriode([]);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // FR-001: Pesan umum tanpa membocorkan apakah email atau password yang salah
        return { error: 'Email atau kata sandi tidak valid. Silakan periksa kembali.' };
      }

      if (data.user) {
        await fetchUserData(data.user);
      }

      return {};
    } catch {
      return { error: 'Terjadi gangguan jaringan. Silakan coba beberapa saat lagi.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setLembaga(null);
      setPeriodeAktif(null);
      setSelectedPeriode(null);
      setAllPeriode([]);
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  // Periode bersifat readonly jika bukan periode aktif
  const isReadonly = Boolean(
    !selectedPeriode ||
    !selectedPeriode.aktif ||
    (periodeAktif && selectedPeriode.id !== periodeAktif.id)
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        lembaga,
        periodeAktif,
        selectedPeriode,
        allPeriode,
        isReadonly,
        isLoading,
        login,
        logout,
        setSelectedPeriode,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

