// screens/premium/UpgradeScreen.tsx
// Premium subscription paywall — shows plan comparison and Stripe checkout flow.
// Matches business plan pricing: $2.99/month or $24.99/year.

import React, { useState, useCallback } from 'react';
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
import {
  SUBSCRIPTION_PLANS,
  getPremiumFeatures,
  startCheckout,
  type SubscriptionPlan,
} from '../../services/stripeService';

type PlanCardProps = {
  plan: (typeof SUBSCRIPTION_PLANS)[SubscriptionPlan];
  isSelected: boolean;
  onSelect: () => void;
};

function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  const { colors: theme } = useTheme();
  return (
    <Pressable
      style={[
        styles.planCard,
        {
          backgroundColor: theme.bgCard,
          borderColor: isSelected ? colors.lavender : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
    >
      {plan.savingsLabel && (
        <View style={[styles.savingsBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.savingsText}>{plan.savingsLabel}</Text>
        </View>
      )}
      <Text style={[styles.planName, { color: theme.textPrimary }]}>{plan.name}</Text>
      <Text style={[styles.planPrice, { color: colors.lavender }]}>{plan.priceLabel}</Text>
      {plan.savingsLabel && (
        <Text style={[styles.planEquivalent, { color: theme.textSecondary }]}>
          ${(plan.priceUSD / 12).toFixed(2)}/month
        </Text>
      )}
      <View
        style={[
          styles.radioOuter,
          { borderColor: isSelected ? colors.lavender : theme.textSecondary },
        ]}
      >
        {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.lavender }]} />}
      </View>
    </Pressable>
  );
}

function FeatureRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  const { colors: theme } = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconBg, { backgroundColor: theme.bgSecondary }]}>
        <Feather name={icon as any} size={18} color={colors.lavender} />
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
  const { isPremium, activatePremium } = usePremium();
  const { colors: theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const result = await startCheckout(selectedPlan);
      if (result.canceled) {
        // User dismissed the payment sheet — do nothing
        return;
      }
      if (result.success) {
        await activatePremium();
        Alert.alert('Welcome to Premium! 🎉', 'All premium features are now unlocked.', [
          { text: 'Continue', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Payment Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, activatePremium, navigation]);

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.alreadyPremium}>
          <Feather name="check-circle" size={48} color={colors.success} />
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
          <Feather name="star" size={40} color={colors.lavender} />
          <Text style={[styles.headline, { color: theme.textPrimary }]}>YomuLog Premium</Text>
          <Text style={[styles.subheadline, { color: theme.textSecondary }]}>
            Unlock the full reading experience
          </Text>
        </View>

        {/* Plan selection */}
        <View style={styles.plans}>
          <PlanCard
            plan={SUBSCRIPTION_PLANS.monthly}
            isSelected={selectedPlan === 'monthly'}
            onSelect={() => setSelectedPlan('monthly')}
          />
          <PlanCard
            plan={SUBSCRIPTION_PLANS.yearly}
            isSelected={selectedPlan === 'yearly'}
            onSelect={() => setSelectedPlan('yearly')}
          />
        </View>

        {/* Subscribe button */}
        <Pressable
          style={[styles.subscribeButton, { backgroundColor: colors.plum, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe — {SUBSCRIPTION_PLANS[selectedPlan].priceLabel}
            </Text>
          )}
        </Pressable>
        <Text style={[styles.termsText, { color: theme.textSecondary }]}>
          Cancel anytime. Payment will be charged to your Apple ID / Google Play account.
        </Text>

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
  plans: { flexDirection: 'row', paddingHorizontal: spacing.p12, gap: spacing.p10, marginTop: spacing.p24 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: spacing.p16,
    alignItems: 'center',
    position: 'relative',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: spacing.p10,
    paddingVertical: spacing.p3,
    borderRadius: 8,
  },
  savingsText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 16, fontWeight: '600', marginTop: spacing.p10 },
  planPrice: { fontSize: 20, fontWeight: '700', marginTop: spacing.p6 },
  planEquivalent: { fontSize: 12, marginTop: spacing.p3 },
  radioOuter: {
    width: 20, height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.p12,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  subscribeButton: {
    marginHorizontal: spacing.p16,
    marginTop: spacing.p20,
    paddingVertical: spacing.p14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  termsText: { fontSize: 11, textAlign: 'center', marginTop: spacing.p8, paddingHorizontal: spacing.p24 },
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
