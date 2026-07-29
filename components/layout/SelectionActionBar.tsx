// components/layout/SelectionActionBar.tsx
// Sliding bottom action bar for batch selection mode.
// Displays selected count and batch actions: Delete, Unlike, Mark as Read.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors as tokens, spacing } from '../../styles/tokens';

// ─── Types ───────────────────────────────────────────────────────────────

type BatchAction = 'delete' | 'unlike' | 'markRead';

type Props = {
  /** Whether the bar is visible */
  visible: boolean;
  /** Number of selected items */
  selectedCount: number;
  /** Called when an action is tapped */
  onAction: (action: BatchAction) => void;
  /** Called when Cancel/Done is tapped to exit selection mode */
  onCancel: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────

const BAR_HEIGHT = 72;
const SLIDE_DURATION = 250;

// ─── Component ───────────────────────────────────────────────────────────

const SelectionActionBar: React.FC<Props> = ({
  visible,
  selectedCount,
  onAction,
  onCancel,
}) => {
  const { colors: theme } = useTheme();
  const translateY = useRef(new Animated.Value(BAR_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : BAR_HEIGHT,
      duration: SLIDE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const barStyle: ViewStyle = {
    backgroundColor: theme.headerBg,
    borderTopColor: theme.border,
  };

  const actionTint = theme.accent;
  const cancelTint = theme.textMuted;

  return (
    <Animated.View
      style={[
        styles.container,
        barStyle,
        { transform: [{ translateY }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Left: Cancel */}
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        accessibilityLabel="Cancel selection"
      >
        <Text style={[styles.cancelText, { color: cancelTint }]}>Cancel</Text>
      </Pressable>

      {/* Center: action buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => selectedCount > 0 && onAction('markRead')}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
            selectedCount === 0 && styles.disabled,
          ]}
          accessibilityLabel={`Mark ${selectedCount} as read`}
          disabled={selectedCount === 0}
        >
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={26}
            color={selectedCount > 0 ? theme.success : theme.textMuted}
          />
          <Text
            style={[
              styles.actionLabel,
              {
                color: selectedCount > 0 ? theme.success : theme.textMuted,
              },
            ]}
          >
            Read
          </Text>
        </Pressable>

        <Pressable
          onPress={() => selectedCount > 0 && onAction('unlike')}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
            selectedCount === 0 && styles.disabled,
          ]}
          accessibilityLabel={`Unlike ${selectedCount} manga`}
          disabled={selectedCount === 0}
        >
          <MaterialCommunityIcons
            name="heart-broken-outline"
            size={26}
            color={selectedCount > 0 ? theme.warning : theme.textMuted}
          />
          <Text
            style={[
              styles.actionLabel,
              {
                color: selectedCount > 0 ? theme.warning : theme.textMuted,
              },
            ]}
          >
            Unlike
          </Text>
        </Pressable>

        <Pressable
          onPress={() => selectedCount > 0 && onAction('delete')}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
            selectedCount === 0 && styles.disabled,
          ]}
          accessibilityLabel={`Delete ${selectedCount} manga`}
          disabled={selectedCount === 0}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={26}
            color={selectedCount > 0 ? theme.error : theme.textMuted}
          />
          <Text
            style={[
              styles.actionLabel,
              {
                color: selectedCount > 0 ? theme.error : theme.textMuted,
              },
            ]}
          >
            Delete
          </Text>
        </Pressable>
      </View>

      {/* Right: selected count */}
      <View style={styles.countWrap}>
        <Text style={[styles.countText, { color: actionTint }]}>
          {selectedCount}
        </Text>
        <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
          selected
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.p12,
    borderTopWidth: 2,
    zIndex: 9990,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.p10,
    paddingVertical: spacing.p6,
    borderRadius: 8,
    minWidth: 56,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  countWrap: {
    alignItems: 'center',
    minWidth: 48,
  },
  countText: {
    fontSize: 18,
    fontWeight: '800',
  },
  countLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default SelectionActionBar;
