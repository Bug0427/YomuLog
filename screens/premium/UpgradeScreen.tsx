// screens/premium/UpgradeScreen.tsx
// Premium subscription paywall — shows what Premium unlocks, the
// $2.99/month price, and an "Upgrade" button that opens the Stripe
// Hosted Checkout link (Linking.openURL on native / window.open on web).
// Entitlement is granted server-side after payment confirmation and the
// app learns about it via Supabase Realtime (PremiumContext).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { colors, spacing } from '../../styles/tokens';
import { getPremiumFeatures, openPremiumCheckout } from '../../services/stripeService';
import { recordFunnelEvent } from '../../services/funnelService';

function FeatureRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  const { colors: theme } = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconBg, { backgroundColor: theme.bgSecondary }]}>
        <Feather name={icon as any} size={18} color={theme.accentLight} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

export default function UpgradeScreen() {
  const navigation = useNavigation();
  const { isPremium } = usePremium();
  const { colors: theme } = useTheme();
  const [loading, setLoading] = useState(false);

  // G-6: paywall_viewed when the paywall actually renders (skips the
  // already-premium "You're Premium!" view). Fire-and-forget.
  useEffect(() => {
    if (!isPremium) {
      void recordFunnelEvent('paywall_viewed', { source: 'upgrade_screen' });
    }
  }, [isPremium]);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const result = await openPremiumCheckout();
      if (result.success) {
        Alert.alert(
          'Checkout Opened',
          'Complete payment in the secure Stripe checkout to activate your subscription. Premium unlocks automatically once payment is confirmed.',
        );
      } else {
        Alert.alert('Could Not Open Checkout', result.error || 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.alreadyPremium}>
          <Feather name="check-circle" size={48} color={theme.success} />
          <Text style={[styles.alreadyTitle, { color: theme.textPrimary }]}>
            You're Premium!
          </Text>
          <Text style={[styles.alreadyDesc, { color: theme.textSecondary }]}>
            Manage your subscription in Settings → Manage Subscription.
          </Text>
          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: theme.textPrimary }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const features = getPremiumFeatures();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Feather name="x" size={24} color={theme.textPrimary} />
          </Pressable>
          <Feather name="star" size={40} color={theme.accentLight} />
          <Text style={[styles.headline, { color: theme.textPrimary }]}>YomuLog Premium</Text>
          <Text style={[styles.subheadline, { color: theme.textSecondary }]}>
            Unlock the full reading experience
          </Text>
        </View>

        {/* Price */}
        <View style={[styles.priceCard, { backgroundColor: theme.bgCard, borderColor: theme.accentLight }]}>
          <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>$2.99</Text>
          <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}>/ month</Text>
          <Text style={[styles.priceNote, { color: theme.textSecondary }]}>
            Cancel anytime. Billed securely via Stripe.
          </Text>
        </View>

        {/* Upgrade button */}
        <Pressable
          style={[styles.upgradeButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Feather name="zap" size={18} color={colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium — $2.99/month</Text>
            </>
          )}
        </Pressable>

        {/* Feature list */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Everything included in Premium
          </Text>
          {features.map((f) => (
            <FeatureRow key={f.id} {...f} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.p24 },
  header: { alignItems: 'center', paddingTop: spacing.p24, paddingHorizontal: spacing.p16 },
  closeBtn: { position: 'absolute', top: spacing.p16, right: spacing.p16, zIndex: 1 },
  headline: { fontSize: 26, fontWeight: '700', marginTop: spacing.p12 },
  subheadline: { fontSize: 15, marginTop: spacing.p6, textAlign: 'center' },
  priceCard: {
    marginHorizontal: spacing.p16,
    marginTop: spacing.p24,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: spacing.p18,
  },
  priceAmount: { fontSize: 34, fontWeight: '800' },
  pricePeriod: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  priceNote: { fontSize: 12, marginTop: spacing.p10, paddingHorizontal: spacing.p16, textAlign: 'center' },
  upgradeButton: {
    marginHorizontal: spacing.p16,
    marginTop: spacing.p16,
    paddingVertical: spacing.p14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  upgradeButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  featuresSection: { marginTop: spacing.p24, paddingHorizontal: spacing.p16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.p14 },
  featureRow: { flexDirection: 'row', marginBottom: spacing.p14, alignItems: 'flex-start' },
  featureIconBg: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.p12,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing.p3 },
  featureDesc: { fontSize: 12, lineHeight: 17 },
  alreadyPremium: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.p24 },
  alreadyTitle: { fontSize: 22, fontWeight: '700', marginTop: spacing.p14 },
  alreadyDesc: { fontSize: 14, textAlign: 'center', marginTop: spacing.p8, lineHeight: 20 },
  backButton: {
    marginTop: spacing.p24,
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p24,
    borderRadius: 10,
    borderWidth: 1,
  },
  backButtonText: { fontSize: 15, fontWeight: '600' },
});
