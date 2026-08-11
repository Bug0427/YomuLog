// services/supabaseClient.ts
// Supabase client singleton for YomuLog.
// Configuration is env-only — set EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example; values come from the
// Supabase dashboard: Settings > API). When those env vars are absent the
// app runs in local-only mode: isSupabaseConfigured() returns false and
// every consumer skips Supabase work (auth, cloud sync, premium checks).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton Supabase client. Uses AsyncStorage for session persistence
 * (React Native compatible).
 *
 * createClient throws when given an empty URL, so when env vars are absent
 * the client is built with inert placeholders (the `.invalid` TLD is
 * reserved and never resolves). Those placeholders are never used — every
 * consumer gates on isSupabaseConfigured() first — which is what lets the
 * app boot in local-only mode until credentials are configured.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://supabase-unconfigured.invalid',
  supabaseAnonKey ?? 'sb_publishable_unconfigured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/** Check if Supabase is configured (env vars are set). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
