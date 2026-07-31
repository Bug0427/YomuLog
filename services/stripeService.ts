// services/stripeService.ts
// Stripe subscription integration for YomuLog Premium.
// Uses @stripe/stripe-react-native for payment sheet presentation.
// Backend checkout sessions are created via Supabase Edge Function.
//
// Environment variables required:
//   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
//   EXPO_PUBLIC_SUPABASE_URL=https://...
//
// The Supabase Edge Function (stripe-checkout) handles:
//   POST /stripe-checkout — creates a Checkout Session or Customer Portal session
//   POST /stripe-webhook  — receives webhook events, updates user_subscriptions table

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

// ─── Stripe SDK helpers ──────────────────────────────────────────────

let stripeModule: any = null;

async function getStripe() {
  if (stripeModule) return stripeModule;
  try {
    const mod = await import('@stripe/stripe-react-native');
    stripeModule = mod;
    return mod;
  } catch {
    console.warn('[@stripe/stripe-react-native] not available — Stripe functionality disabled');
    return null;
  }
}

/**
 * Initialize Stripe with publishable key.
 * Call once at app startup (e.g. in App.tsx or StripeProvider).
 */
export async function initStripe(): Promise<void> {
  const stripe = await getStripe();
  if (!stripe) return;

  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set — Stripe payments disabled');
    return;
  }

  await stripe.initStripe({
    publishableKey,
    merchantIdentifier: 'merchant.com.yomulog',
  });
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

async function getCachedSubscriptionStatus(): Promise<SubscriptionStatus> {
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

// ─── Checkout flow ───────────────────────────────────────────────────

/**
 * Start a new subscription via Stripe Checkout.
 * Calls the Supabase Edge Function to create a Checkout Session,
 * then presents the Stripe payment sheet.
 */
export async function startCheckout(plan: SubscriptionPlan): Promise<CheckoutResult> {
  const userId = await getUserId();
  if (!userId || !isSupabaseConfigured()) {
    return { success: false, error: 'You must be signed in to subscribe' };
  }

  try {
    // 1. Call Supabase Edge Function to create a checkout session
    const response = await fetch(getSupabaseFunctionUrl('stripe-checkout'), {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ plan, userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const { clientSecret, paymentIntentClientSecret } = await response.json();

    // 2. Present Stripe payment sheet
    const stripe = await getStripe();
    if (!stripe) {
      return { success: false, error: 'Stripe SDK not available' };
    }

    if (paymentIntentClientSecret) {
      // PaymentIntent flow (one-time setup for subscription)
      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret,
        merchantDisplayName: 'YomuLog',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        throw new Error(presentError.message);
      }
    } else if (clientSecret) {
      // Checkout Session flow (subscription — Stripe handles the UI)
      // This opens a browser-based checkout
      const { error: redirectError } = await stripe.openApplePaySetup();

      // Fallback: open the hosted checkout URL in browser
      const { error: confirmError } = await stripe.confirmPayment(clientSecret);
      if (confirmError) {
        if (confirmError.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        throw new Error(confirmError.message);
      }
    }

    // 3. Re-fetch subscription status after payment
    const status = await fetchSubscriptionStatus();
    return { success: status.isActive };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Payment failed';
    return { success: false, error: msg };
  }
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

    // In a real app, use Linking.openURL or a WebView
    const { Linking } = await import('react-native');
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
 * Check if a specific premium feature is available.
 */
export function isFeatureAvailable(
  feature: 'cloud_sync' | 'unlimited_downloads' | 'ai_search' | 'custom_themes' | 'reading_stats',
  isPremium: boolean,
): boolean {
  if (!isPremium) return false;

  // All features are available with an active subscription
  return true;
}

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
