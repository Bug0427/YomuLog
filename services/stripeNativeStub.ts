// services/stripeNativeStub.ts
// No-op stub for @stripe/stripe-react-native on web.
// Metro aliases to this module when bundling for web platform,
// preventing native module resolution errors.

// All methods return null/undefined so callers can check and fall back.
export const initStripe = () => Promise.resolve();
export const presentPaymentSheet = () =>
  Promise.resolve({ error: { code: 'unavailable', message: 'Stripe unavailable on web' } });
export const initPaymentSheet = () =>
  Promise.resolve({ error: { code: 'unavailable', message: 'Stripe unavailable on web' } });
export const confirmPayment = () =>
  Promise.resolve({ error: { code: 'unavailable', message: 'Stripe unavailable on web' } });
export const openApplePaySetup = () =>
  Promise.resolve({ error: { code: 'unavailable', message: 'Stripe unavailable on web' } });

export const useStripe = () => ({});
export const StripeProvider = ({ children }: { children: any }) => children;

export default {
  initStripe,
  presentPaymentSheet,
  initPaymentSheet,
  confirmPayment,
  openApplePaySetup,
  useStripe,
  StripeProvider,
};
