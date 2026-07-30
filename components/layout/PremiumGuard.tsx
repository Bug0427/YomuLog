// components/layout/PremiumGuard.tsx
// Feature-gate wrapper: shows a lock overlay + "Premium" badge on gated features
// when the user is not subscribed. Tapping the lock opens the upgrade modal.

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borders } from '../../styles/tokens';
import PremiumUpgradeModal from './PremiumUpgradeModal';

type PremiumGuardProps = {
  /** The gated feature content to render when premium is active */
  children: React.ReactNode;
  /** Feature name for the lock badge tooltip */
  featureName: string;
  /** If true, renders children even when not premium (no lock overlay) */
  bypass?: boolean;
  /** Show a small lock badge inline instead of full overlay */
  inline?: boolean;
  /** Called when user taps the lock */
  onUpgradeRequest?: () => void;
};

/**
 * PremiumGuard wraps gated features. When the user lacks premium:
 * - `inline` mode: shows a small 🔒 Premium badge next to the feature
 * - Full mode: dims the content and overlays a lock with upgrade prompt
 */
export default function PremiumGuard({
  children,
  featureName,
  bypass = false,
  inline = false,
  onUpgradeRequest,
}: PremiumGuardProps) {
  const { isPremium } = usePremium();
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);

  // Bypass or premium active → render children normally
  if (bypass || isPremium) {
    return <>{children}</>;
  }

  // Inline lock badge mode
  if (inline) {
    return (
      <>
        <View style={s.inlineLock}>
          <Feather name="lock" size={12} color={theme.colors.textMuted} />
          <Text style={[s.inlineText, { color: theme.colors.textMuted }]}>Premium</Text>
        </View>
        <PremiumUpgradeModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onUpgrade={() => {
            setShowModal(false);
            onUpgradeRequest?.();
          }}
        />
      </>
    );
  }

  // Full overlay mode
  return (
    <>
      <View style={s.overlayWrap}>
        {/* Dimmed children */}
        <View style={s.dimmed} pointerEvents="none">
          {children}
        </View>
        {/* Lock overlay */}
        <Pressable
          style={s.overlayTouch}
          onPress={() => setShowModal(true)}
        >
          <View style={[s.lockBadge, { backgroundColor: theme.colors.bgCard, borderColor: theme.colors.border }]}>
            <Feather name="lock" size={18} color={theme.colors.accent} />
            <Text style={[s.lockLabel, { color: theme.colors.accent }]}>Premium</Text>
            <Text style={[s.lockSub, { color: theme.colors.textMuted }]}>
              Unlock {featureName}
            </Text>
          </View>
        </Pressable>
      </View>
      <PremiumUpgradeModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onUpgrade={() => {
          setShowModal(false);
          onUpgradeRequest?.();
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  overlayWrap: {
    position: 'relative',
  },
  dimmed: {
    opacity: 0.35,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: borders.br8,
  },
  lockBadge: {
    alignItems: 'center',
    paddingVertical: spacing.p12,
    paddingHorizontal: spacing.p16,
    borderRadius: borders.br12,
    borderWidth: 1.5,
    gap: spacing.p4,
  },
  lockLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  lockSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Inline
  inlineLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.p6,
    paddingVertical: spacing.p2,
  },
  inlineText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
