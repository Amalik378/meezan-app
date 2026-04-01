import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { create } from 'zustand';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// When EXPO_PUBLIC_DEV_MODE=true the app bypasses Supabase entirely.
// The backend accepts the static token "dev" in DEBUG mode.
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
const DEV_USER = { id: '00000000-0000-0000-0000-000000000001', email: 'dev@meezan.local', fullName: undefined as string | undefined };

// Use || (not ??) so empty strings from app.json fall through to the .env vars
const SUPABASE_URL =
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_ANON_KEY =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Platform-aware storage:
//   Native      → expo-secure-store (encrypted keychain)
//   Web SSR     → in-memory Map (Node.js; Supabase never used in dev mode anyway)
//   Web browser → localStorage
const _ssrStore = new Map<string, string>();
const authStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') return Promise.resolve(localStorage.getItem(key));
      return Promise.resolve(_ssrStore.get(key) ?? null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      else _ssrStore.set(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      else _ssrStore.delete(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Supabase client — only used when DEV_MODE is false
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder', {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingDone: boolean;

  initialize: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  onboardingDone: false,

  initialize: async () => {
    // Read onboarding flag in parallel with auth
    const onboardingVal = await AsyncStorage.getItem('onboarding_done');
    const onboardingDone = onboardingVal === 'true';

    // ── Dev mode: skip Supabase, use static token ──────────────────────────
    if (DEV_MODE) {
      const storedDevUser = await AsyncStorage.getItem('dev_user');
      if (storedDevUser) {
        // Returning user — restore session
        let user = JSON.parse(storedDevUser);
        // Migration: strip legacy 'Developer' placeholder name stored by older builds
        if (user.fullName === 'Developer') user = { ...user, fullName: undefined };
        await authStorage.setItem('access_token', 'dev');
        set({ user, isAuthenticated: true, isLoading: false, onboardingDone });
      } else {
        // New user — not authenticated, must register
        set({ isLoading: false, onboardingDone });
      }
      return;
    }

    // ── Production: verify Supabase session ───────────────────────────────
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        await authStorage.setItem('access_token', session.access_token);
        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            fullName: session.user.user_metadata?.full_name as string | undefined,
          },
          isAuthenticated: true,
          onboardingDone,
        });
      } else {
        set({ onboardingDone });
      }
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await authStorage.setItem('access_token', session.access_token);
        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            fullName: session.user.user_metadata?.full_name as string | undefined,
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        await authStorage.removeItem('access_token');
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    set({ onboardingDone: true });
  },

  resetOnboarding: async () => {
    await AsyncStorage.removeItem('onboarding_done');
    set({ onboardingDone: false });
  },

  signIn: async (email, password) => {
    if (DEV_MODE) {
      await authStorage.setItem('access_token', 'dev');
      // Restore stored user — sign-in can't know the name, so preserve whatever was saved at sign-up
      const storedDevUser = await AsyncStorage.getItem('dev_user');
      let user = storedDevUser ? JSON.parse(storedDevUser) : { ...DEV_USER, email };
      // Migration: strip legacy 'Developer' placeholder name
      if (user.fullName === 'Developer') user = { ...user, fullName: undefined };
      set({ user, isAuthenticated: true });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Store token immediately — don't rely on onAuthStateChange timing
    if (data.session) {
      await authStorage.setItem('access_token', data.session.access_token);
      set({
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          fullName: data.session.user.user_metadata?.full_name as string | undefined,
        },
        isAuthenticated: true,
      });
    }
  },

  signUp: async (email, password, fullName) => {
    if (DEV_MODE) {
      const user = { ...DEV_USER, email, fullName };
      await authStorage.setItem('access_token', 'dev');
      await AsyncStorage.setItem('dev_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
  },

  signOut: async () => {
    if (!DEV_MODE) await supabase.auth.signOut();
    await authStorage.removeItem('access_token');
    // Keep dev_user in storage so name persists if they sign back in
    set({ user: null, isAuthenticated: false });
  },
}));
