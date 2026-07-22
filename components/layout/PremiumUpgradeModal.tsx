// components/layout/PremiumUpgradeModal.tsx
// Styled "Go Premium" upgrade promo modal shown when free-tier users
// attempt to enable Cloud Sync & Backup. Displays Stripe monthly pricing
// of $2.99/mo and annual pricing of $24.99/year.

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, borders, spacing, u } from '../../styles/tokens';

type PremiumUpgradeModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
};

export default function PremiumUpgradeModal({
  visible,
  onClose,
  onUpgrade,
}: PremiumUpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.plum} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Feather name="cloud-lightning" size={48} color={colors.deepPlum} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Go Premium</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Cloud Sync & Backup is a Premium feature. Upgrade to unlock
            seamless cross-device sync, unlimited offline downloads,
            AI-powered search, and personalized reading stats.
          </Text>

          {/* Pricing */}
          <View style={styles.pricingWrap}>
            <View style={styles.priceCard}>
              <Text style={styles.priceAmount}>$2.99</Text>
              <Text style={styles.pricePeriod}>/ month</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceCard}>
              <Text style={styles.priceAmount}>$24.99</Text>
              <Text style={styles.pricePeriod}>/ year</Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save 30%</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            style={styles.upgradeBtn}
            onPress={() => {
              onUpgrade?.();
              onClose();
            }}
          >
            <Feather name="zap" size={18} color={colors.creamWhite} style={{ marginRight: 8 }} />
            <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
          </Pressable>

          {/* Dismiss */}
          <Pressable onPress={onClose} style={styles.dismissWrap}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.p16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.creamWhite,
    borderRadius: 16,
    paddingVertical: spacing.p24,
    paddingHorizontal: spacing.p20,
    alignItems: 'center',
    borderWidth: borders.bw2,
    borderColor: colors.plum,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.p12,
    right: spacing.p12,
    width: 32,
    height: 32,
    ...u.center,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lavender,
    ...u.center,
    marginBottom: spacing.p16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.deepPlum,
    marginBottom: spacing.p8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.cocoa,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.p20,
    paddingHorizontal: spacing.p8,
  },
  pricingWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.p12,
    marginBottom: spacing.p20,
  },
  priceCard: {
    alignItems: 'center',
    paddingVertical: spacing.p10,
    paddingHorizontal: spacing.p16,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.deepPlum,
  },
  pricePeriod: {
    fontSize: 13,
    color: colors.mutedPlum,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 2,
    height: 50,
    backgroundColor: colors.lavender,
    borderRadius: 1,
  },
  savingsBadge: {
    marginTop: spacing.p6,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.p8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.creamWhite,
  },
  upgradeBtn: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.deepPlum,
    paddingVertical: spacing.p14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.p12,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.creamWhite,
  },
  dismissWrap: {
    paddingVertical: spacing.p8,
  },
  dismissText: {
    fontSize: 14,
    color: colors.mutedPlum,
    fontWeight: '600',
  },
});
