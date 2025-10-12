import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GeneralStyles, SettingButtonStyles, FeedBackStyles } from '../../styles/global';
import { profileIcons } from '../../data/profileIcons';
import CardView from '../../components/cardLayouts/CardView';
import { updateProfileIcon } from '../../services/feedbackRepo';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';


const CardViewAny = CardView as unknown as React.ComponentType<any>;


// Icon choices (can be swapped to images later)
const ICON_ITEMS = [
  ...profileIcons.animals,
  ...profileIcons.female,
  ...profileIcons.male,
];

export default function ChooseProfileIcon() {
  const navigation = useNavigation<any>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = React.useRef<any>(null);
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();

  // Helper to robustly go to UserAccount across stacks
  function navigateToUserAccount() {
    // 1) Prefer going back if we came from UserAccount
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    // 2) Try current navigator
    try {
      navigation.navigate('UserAccount' as never);
      return;
    } catch {}
    // 3) Try parent navigator (nested stacks)
    const parent = navigation.getParent?.();
    if (parent) {
      try {
        // @ts-ignore nested navigation
        parent.navigate('UserAccount');
        return;
      } catch {}
    }
    // 4) Last resort: reset to a stack with UserAccount
    navigation.reset?.({
      index: 0,
      routes: [{ name: 'UserAccount' as never }],
    } as any);
  }

  async function handleSave() {
    if (!selectedId) return;
    try {
      const accountId = (globalThis as any).currentAccountId as string | undefined;
      if (!accountId) {
        // Not logged in – send to login
        // @ts-ignore
        navigation.replace?.('LoginScreen');
        return;
      }

      // Persist selected icon id to the user row
      await updateProfileIcon(accountId, selectedId);

      // Cache in memory for immediate use
      (globalThis as any).currentProfileIconId = selectedId;

      // Return to account screen (works across nested stacks)
      navigateToUserAccount();
    } catch (e) {
      console.error('❌ Failed to save profile icon', e);
    }
  }

  const cardData = ICON_ITEMS.map((i) => ({
    id: i.name,
    title: '',
    image: i.path,
    imageUrl: i.path,
  }));

  useFocusEffect(
    React.useCallback(() => {
      // reset selection every time this screen gains focus
      setSelectedId(null);
      return () => {};
    }, [])
  );

  const HeaderContent = (
    <View>
      <View style={[GeneralStyles.header, { marginTop: 30, marginBottom: 15, paddingBottom: 20, borderBottomWidth: 2, borderColor: '#463B54' }]}>
        <Pressable onPress={navigateToUserAccount} style={[FeedBackStyles.item, { width: 57, paddingVertical: 7 }]}>
          <Text style={GeneralStyles.plainText}>Back</Text>
        </Pressable>
        <Text style={[SettingButtonStyles.Icon, {}]}>Profile Icon</Text>
        <Pressable
          onPress={handleSave}
          style={[FeedBackStyles.item, { width: 57, paddingVertical: 7, opacity: selectedId ? 1 : 0.4 }]}
          disabled={!selectedId}
          accessibilityState={{ disabled: !selectedId }}
        >
          <Text style={GeneralStyles.plainText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={GeneralStyles.container}>
      <CardViewAny
        listRef={listRef}
        data={cardData}
        viewMode="grid"
        numColumnsGrid={4}
        headerComponent={HeaderContent}
        emptyMessage={'No icons'}
        onPressItem={(item: any) => setSelectedId(item.id)}
        onScrollBeginDrag={handleScrollStart}
        onMomentumScrollEnd={handleScrollEnd}
        itemStyle={(item: any) =>
          item.id === selectedId
            ? { borderColor: '#463B54', borderWidth: 3, backgroundColor: '#D7D2EE' }
            : undefined
        }
      />
      <Anchor scrollRef={listRef} isScrolling={isScrolling} />
    </View>
  );
}