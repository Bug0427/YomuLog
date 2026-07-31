// components/layout/SyncStatusBanner.tsx
// Transient banner showing sync status with auto-dismiss on success.
// Persistent on error with manual retry button.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { SyncStatus } from '../../services/supabaseSyncService';

type Props = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncEnabled: boolean;
  isOnline: boolean;
  onSyncNow: () => void;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 4000; // hide after 4s on success
const ANIM_DURATION = 300;

export default function SyncStatusBanner({
  const { colors: theme } = useTheme();
  status,
  lastSyncedAt,
  lastError,
  syncEnabled,
  isOnline,
  onSyncNow,
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Show banner when status changes to 'syncing', 'synced', or 'error'
    if (status === 'syncing' || status === 'synced' || status === 'error') {
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss on success
      if (status === 'synced') {
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => {
          hide();
        }, AUTO_DISMISS_MS);
      }
    } else {
      hide();
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [status]);

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (status === 'synced') onDismiss();
    });
  };

  if (!visible || !syncEnabled) return null;

  const isSyncing = status === 'syncing';
  const isSynced = status === 'synced';
  const isError = status === 'error';

  const bgColor = isSyncing ? theme.bgSecondary : isSynced ? theme.bgCard : '#3a1a1a';
  const borderColor = isSyncing ? theme.accent : isSynced ? theme.success : theme.error;
  const iconColor = isSyncing ? theme.accentLight : isSynced ? theme.success : theme.error;

  const icon = isSyncing ? (
    <ActivityIndicator size="small" color={iconColor} />
  ) : isSynced ? (
    <Feather name="check-circle" size={18} color={iconColor} />
  ) : (
    <Feather name="alert-circle" size={18} color={iconColor} />
  );

  const message = isSyncing
    ? 'Syncing your data...'
    : isSynced
      ? 'All data synced successfully'
      : lastError || 'Sync failed — tap to retry';

  if (!isOnline && isError) {
    // Override message for offline state
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        opacity,
        backgroundColor: bgColor,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        {icon}
        <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={2}>
          {message}
        </Text>
      </View>

      {/* Retry / Dismiss buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {isError && (
          <Pressable
            onPress={onSyncNow}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: borderColor,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        )}
        <Pressable onPress={hide} hitSlop={8}>
          <Feather name="x" size={16} color="#888" />
        </Pressable>
      </View>
    </Animated.View>
  );
}
