import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/stores/authStore';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 50_000, // Render free tier cold-start can take ~30s
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Platform-aware token retrieval.
 * 1. Try our cached 'access_token' key (set by authStore on login).
 * 2. If missing (e.g. first render after cold start), fall back to Supabase session directly.
 *    This covers the race where onAuthStateChange hasn't fired yet.
 */
const _ssrTokenStore = new Map<string, string>();

async function getCachedToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') return localStorage.getItem('access_token');
    return _ssrTokenStore.get('access_token') ?? null;
  }
  return SecureStore.getItemAsync('access_token');
}

async function setCachedToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('access_token', token);
    else _ssrTokenStore.set('access_token', token);
  } else {
    await SecureStore.setItemAsync('access_token', token);
  }
}

async function getAccessToken(): Promise<string | null> {
  const cached = await getCachedToken();
  if (cached) return cached;

  // Fallback: read directly from Supabase session (handles cold-start race)
  if (!DEV_MODE) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (token) await setCachedToken(token);
      return token;
    } catch {
      return null;
    }
  }
  return null;
}

// Attach auth token on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error messages + clear token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail: string }>) => {
    if (error.response?.status === 401) {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('access_token');
        else _ssrTokenStore.delete('access_token');
      } else {
        await SecureStore.deleteItemAsync('access_token');
      }
    }
    const message =
      error.response?.data?.detail ??
      error.message ??
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export type ApiError = Error;
