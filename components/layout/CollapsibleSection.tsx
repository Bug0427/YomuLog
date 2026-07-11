// components/layout/CollapsibleSection.tsx
// Reusable collapsible/expandable section wrapper with animated transitions.

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, u } from '../../styles/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badgeCount?: number;
};

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  badgeCount,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((p) => !p);
  }, []);

  return (
    <View style={{ marginBottom: spacing.p8 }}>
      <Pressable
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.p10,
          paddingHorizontal: spacing.p12,
        }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? `Collapse ${title}` : `Expand ${title}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.plum }}>
            {title}
          </Text>
          {badgeCount != null && badgeCount > 0 && (
            <View
              style={{
                backgroundColor: colors.deepPlum,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                ...u.center,
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: colors.paleLavender, fontSize: 11, fontWeight: '700' }}>
                {badgeCount}
              </Text>
            </View>
          )}
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.plum}
        />
      </Pressable>

      {expanded && <View style={{ paddingHorizontal: spacing.p10 }}>{children}</View>}
    </View>
  );
}