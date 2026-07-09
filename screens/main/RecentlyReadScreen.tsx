// screens/main/RecentlyReadScreen.tsx
// Displays the up-to-30 most recently read manga series with progress bars.

import React from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors, u, spacing } from '../../styles/tokens';
import Header from '../../components/layout/Header';

function toImageSource(img: any): any {
  if (!img) return undefined;
  return typeof img === 'string' ? { uri: img } : img;
}

export default function RecentlyReadScreen() {
  const navigation = useNavigation();
  const { recentlyRead, loading, refresh } = useReadingProgress();

  const renderItem = ({ item }: { item: typeof recentlyRead[number] }) => {
    const progressPct =
      item.totalChapters > 0
        ? Math.round((item.readChapters / item.totalChapters) * 100)
        : 0;

    return (
      <Pressable
        onPress={() =>
          (navigation as any).navigate('MangaInfoScreen', {
            mangaId: item.mangaId,
          })
        }
        style={[
          CardViewStyles.rowCard,
          { marginBottom: 8, alignItems: 'center' },
        ]}
      >
        {/* Thumbnail */}
        <View
          style={[
            CardViewStyles.rowMediaBase,
            { width: 50, height: 70 },
          ]}
        >
          {item.mangaImage ? (
            <Image
              source={toImageSource(item.mangaImage)}
              style={[CardViewStyles.rowImage, { width: 50, height: 70 }]}
              resizeMode="contain"
            />
          ) : (
            <View
              style={[
                CardViewStyles.placeholder,
                { width: 50, height: 70 },
              ]}
            />
          )}
        </View>

        {/* Text info */}
        <View style={[CardViewStyles.rowTextWrap, CardViewStyles.rowTextCenter, { flex: 1 }]}>
          <Text style={CardViewStyles.rowTitle} numberOfLines={1}>
            {item.mangaTitle}
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedPlum, marginTop: 2 }}>
            {item.readChapters}/{item.totalChapters} chapters
          </Text>

          {/* Progress bar */}
          <View
            style={{
              marginTop: 6,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.paleLavender,
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <View
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: colors.plum,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={GeneralStyles.container}>
      <Header />
      <View
        style={[
          GeneralStyles.alignment,
          { justifyContent: 'space-between', marginTop: 10 },
        ]}
      >
        <Text style={GeneralStyles.h1}>Recently Read</Text>
      </View>

      {recentlyRead.length === 0 && !loading ? (
        <View style={CardViewStyles.emptyWrap}>
          <Text style={CardViewStyles.emptyText}>
            No reading history yet. Start reading a manga to see it here!
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentlyRead}
          keyExtractor={(item) => item.mangaId}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: spacing.p10,
            paddingTop: spacing.p10,
            paddingBottom: spacing.p24,
          }}
          onRefresh={refresh}
          refreshing={loading}
        />
      )}
    </View>
  );
}