// services/supabaseClient.ts
// Supabase client singleton for YomuLog.
// Uses env vars SUPABASE_URL and SUPABASE_ANON_KEY — configure via Expo EAS secrets
// or .env file for local development.

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Singleton Supabase client.
 * Uses AsyncStorage for session persistence (React Native compatible).
 * Falls back gracefully if env vars aren't set — sync operations will
 * skip gracefully until credentials are configured.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Check if Supabase is configured (env vars are set). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
