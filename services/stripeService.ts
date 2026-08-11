// services/stripeService.ts
// Stripe subscription integration for YomuLog Premium.
//
// Purchases use the Stripe Hosted Checkout payment link (created by the
// business lead via Stripe Dashboard) — the app never calls Stripe APIs.
// The link is opened with Linking.openURL (native) / window.open (web).
//
// Subscription status is read from Supabase (user_subscriptions table,
// maintained by Stripe webhooks) and kept fresh via Supabase Realtime.

import { Linking, Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────

export type SubscriptionPlan = 'monthly' | 'yearly';

export type SubscriptionTier = {
  id: SubscriptionPlan;
  name: string;
  priceUSD: number;
  period: string;
  priceLabel: string;
  savingsLabel?: string;
};

export type SubscriptionStatus = {
  isActive: boolean;
  plan: SubscriptionPlan | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
  subscriptionId: string | null;
};

export type CheckoutResult = {
  success: boolean;
  error?: string;
  canceled?: boolean;
};

// ─── Plan definitions (matches business plan: $2.99/mo, $24.99/yr) ──

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionTier> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceUSD: 2.99,
    period: 'month',
    priceLabel: '$2.99/month',
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    priceUSD: 24.99,
    period: 'year',
    priceLabel: '$24.99/year',
    savingsLabel: 'Save 30%',
  },
};

// ─── Hosted Checkout ─────────────────────────────────────────────────

/**
 * Stripe Hosted Checkout payment link for YomuLog Premium Monthly ($2.99/mo).
 * Created by the business lead in the Stripe Dashboard (product prod_Uv4y6lI1wyA2rs,
 * price price_1TvEozDe09OesIbmCcWKwh4a). The app opens this link — it never
 * calls Stripe APIs directly.
 */
export const PREMIUM_CHECKOUT_URL =
  'https://buy.stripe.com/00w4gz6pudxJ1wy3f57ss08';

// ─── Storage keys ────────────────────────────────────────────────────

const SUBSCRIPTION_CACHE_KEY = '@YomuLog:subscriptionStatus';

// ─── Helpers ─────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function getSupabaseFunctionUrl(functionName: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set');
  return `${baseUrl}/functions/v1/${functionName}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Checkout flow ───────────────────────────────────────────────────

/**
 * Open the Stripe Hosted Checkout page for YomuLog Premium.
 * Native: Linking.openURL. Web: window.open (new tab).
 * No Stripe SDK calls — entitlement is granted server-side after payment
 * is confirmed (Supabase Realtime updates the app automatically).
 */
export async function openPremiumCheckout(): Promise<CheckoutResult> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(PREMIUM_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
        return { success: true };
      }
      return { success: false, error: 'Unable to open checkout in this browser' };
    }

    const supported = await Linking.canOpenURL(PREMIUM_CHECKOUT_URL);
    if (!supported) {
      return { success: false, error: 'Unable to open the secure checkout page' };
    }
    await Linking.openURL(PREMIUM_CHECKOUT_URL);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to open checkout';
    return { success: false, error: msg };
  }
}

// ─── Subscription status ─────────────────────────────────────────────

/**
 * Fetch real subscription status from Supabase (set by Stripe webhooks).
 * Falls back to local cache if offline or Supabase is unreachable.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) {
    return getCachedSubscriptionStatus();
  }

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const status: SubscriptionStatus = data
      ? {
          isActive: data.is_active ?? false,
          plan: data.plan as SubscriptionPlan | null,
          currentPeriodEnd: data.current_period_end ?? null,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
          customerId: data.stripe_customer_id ?? null,
          subscriptionId: data.stripe_subscription_id ?? null,
        }
      : { isActive: false, plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, customerId: null, subscriptionId: null };

    // Cache locally
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(status));
    return status;
  } catch {
    return getCachedSubscriptionStatus();
  }
}

/** Read the locally cached subscription status (no network). */
export async function getCachedSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (raw) return JSON.parse(raw) as SubscriptionStatus;
  } catch { /* ignore */ }
  return { isActive: false, plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, customerId: null, subscriptionId: null };
}

/**
 * Listen to real-time subscription changes via Supabase Realtime.
 * Calls onStatusChange whenever the subscription row changes.
 */
export function subscribeToSubscriptionChanges(
  onStatusChange: (status: SubscriptionStatus) => void,
): () => void {
  const userId_promise = getUserId();
  let channel: any = null;
  let mounted = true;

  (async () => {
    const userId = await userId_promise;
    if (!userId || !isSupabaseConfigured() || !mounted) return;

    channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newData = payload.new;
          if (newData) {
            onStatusChange({
              isActive: newData.is_active ?? false,
              plan: newData.plan as SubscriptionPlan | null,
              currentPeriodEnd: newData.current_period_end ?? null,
              cancelAtPeriodEnd: newData.cancel_at_period_end ?? false,
              customerId: newData.stripe_customer_id ?? null,
              subscriptionId: newData.stripe_subscription_id ?? null,
            });
          }
        },
      )
      .subscribe();
  })();

  return () => {
    mounted = false;
    if (channel) supabase.removeChannel(channel);
  };
}

// ─── Customer Portal ────────────────────────────────────────────────

/**
 * Open the Stripe Customer Portal for managing existing subscriptions
 * (cancel, update payment method, view invoices).
 */
export async function openCustomerPortal(): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { success: false, error: 'You must be signed in' };
  }

  try {
    const response = await fetch(getSupabaseFunctionUrl('stripe-portal'), {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const { url } = await response.json();
    if (!url) throw new Error('No portal URL returned');

    await Linking.openURL(url);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to open customer portal';
    return { success: false, error: msg };
  }
}

// ─── Cancel subscription ─────────────────────────────────────────────

/**
 * Cancel the current subscription at period end.
 * Uses the Customer Portal approach, or a direct Edge Function call.
 */
export async function cancelSubscription(): Promise<CheckoutResult> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(getSupabaseFunctionUrl('stripe-cancel'), {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    // Re-fetch status
    const status = await fetchSubscriptionStatus();
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Cancellation failed';
    return { success: false, error: msg };
  }
}

// ─── Feature gating helpers ─────────────────────────────────────────

/**
 * Get the feature description for the paywall.
 */
export function getPremiumFeatures(): Array<{ id: string; title: string; description: string; icon: string }> {
  return [
    {
      id: 'cloud_sync',
      title: 'Cloud Backup & Sync',
      description: 'Sync your reading progress, favorites, and library across all your devices instantly.',
      icon: 'cloud',
    },
    {
      id: 'unlimited_downloads',
      title: 'Unlimited Offline Downloads',
      description: 'Download as many chapters as you want for offline reading — no limits.',
      icon: 'download',
    },
    {
      id: 'ai_search',
      title: 'AI-Powered Search',
      description: 'Find manga with natural language. Search by plot, themes, art style, and more.',
      icon: 'search',
    },
    {
      id: 'custom_themes',
      title: 'Custom Reader Themes',
      description: 'Personalize your reading experience with custom colors, fonts, and layouts.',
      icon: 'edit',
    },
    {
      id: 'reading_stats',
      title: 'Advanced Reading Analytics',
      description: 'Track your reading streaks, favorite genres, and completion rates over time.',
      icon: 'bar-chart-2',
    },
  ];
}
