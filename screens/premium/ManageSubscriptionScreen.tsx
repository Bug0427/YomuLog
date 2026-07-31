// screens/premium/ManageSubscriptionScreen.tsx
// Shows current subscription status, next billing date, and cancel/reactivate options.

import React, { useState, useEffect, useCallback } from 'react';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/navigation';
import { usePremium } from '../../context/PremiumContext';
import { colors, spacing } from '../../styles/tokens';
import {
  fetchSubscriptionStatus,
  cancelSubscription,
  openCustomerPortal,
  SUBSCRIPTION_PLANS,
  type SubscriptionStatus,
} from '../../services/stripeService';

export default function ManageSubscriptionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPremium, deactivatePremium } = usePremium();
  const { colors: theme } = useTheme();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await fetchSubscriptionStatus();
      if (mounted) {
        setStatus(s);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCancel = useCallback(async () => {
    Alert.alert(
      'Cancel Subscription',
      'Your premium access will continue until the end of the current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await cancelSubscription();
            if (result.success) {
              await deactivatePremium();
              const s = await fetchSubscriptionStatus();
              setStatus(s);
              Alert.alert('Cancelled', 'Your subscription has been cancelled and will end at the period end.');
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel subscription.');
            }
            setActionLoading(false);
          },
        },
      ],
    );
  }, [deactivatePremium]);

  const handlePortal = useCallback(async () => {
    setActionLoading(true);
    const result = await openCustomerPortal();
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to open customer portal.');
    }
    setActionLoading(false);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.lavender} />
        </View>
      </SafeAreaView>
    );
  }

  const planLabel = status?.plan ? SUBSCRIPTION_PLANS[status.plan]?.priceLabel : null;
  const periodEnd = status?.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Feather name="arrow-left" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Manage Subscription</Text>
        </View>

        {/* Status card */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.statusRow}>
            <Feather
              name={status?.isActive ? 'check-circle' : 'x-circle'}
              size={24}
              color={status?.isActive ? colors.success : colors.error}
            />
            <Text style={[styles.statusText, { color: theme.textPrimary }]}>
              {status?.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {planLabel && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Plan</Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{planLabel}</Text>
            </View>
          )}

          {periodEnd && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                {status?.cancelAtPeriodEnd ? 'Expires' : 'Next billing date'}
              </Text>
              <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{periodEnd}</Text>
            </View>
          )}

          {status?.cancelAtPeriodEnd && (
            <View style={[styles.cancelNotice, { backgroundColor: theme.bgSecondary }]}>
              <Feather name="info" size={14} color={colors.mutedPlum} />
              <Text style={[styles.cancelNoticeText, { color: colors.mutedPlum }]}>
                Your subscription will end on {periodEnd}. You won't be charged again.
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {status?.isActive && (
          <View style={styles.actions}>
            {!status.cancelAtPeriodEnd && (
              <Pressable
                style={[styles.actionButton, { borderColor: colors.error }]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={[styles.actionText, { color: colors.error }]}>Cancel Subscription</Text>
                )}
              </Pressable>
            )}

            <Pressable
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={handlePortal}
              disabled={actionLoading}
            >
              <Text style={[styles.actionText, { color: theme.textPrimary }]}>
                Billing & Payment Methods
              </Text>
              <Feather name="external-link" size={14} color={theme.textSecondary} />
            </Pressable>
          </View>
        )}

        {!status?.isActive && (
          <View style={styles.resubscribe}>
            <Text style={[styles.resubscribeText, { color: theme.textSecondary }]}>
              Ready to come back?
            </Text>
            <Pressable
              style={[styles.resubscribeButton, { backgroundColor: colors.plum }]}
              onPress={() => navigation.navigate('UpgradeScreen')}
            >
              <Text style={styles.resubscribeButtonText}>Resubscribe</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.p50 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.p16,
    paddingHorizontal: spacing.p16,
    marginBottom: spacing.p20,
  },
  closeBtn: { marginRight: spacing.p12 },
  title: { fontSize: 20, fontWeight: '700' },
  card: {
    marginHorizontal: spacing.p16,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.p20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.p8,
    marginBottom: spacing.p16,
  },
  statusText: { fontSize: 18, fontWeight: '700' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.p10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.p8,
    marginTop: spacing.p14,
    padding: spacing.p12,
    borderRadius: 8,
  },
  cancelNoticeText: { fontSize: 12, flex: 1, lineHeight: 17 },
  actions: { marginTop: spacing.p24, paddingHorizontal: spacing.p16, gap: spacing.p12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.p6,
    paddingVertical: spacing.p14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: { fontSize: 15, fontWeight: '600' },
  resubscribe: {
    marginTop: spacing.p24,
    paddingHorizontal: spacing.p16,
    alignItems: 'center',
    gap: spacing.p12,
  },
  resubscribeText: { fontSize: 14 },
  resubscribeButton: {
    paddingVertical: spacing.p12,
    paddingHorizontal: spacing.p24,
    borderRadius: 10,
  },
  resubscribeButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
