// components/layout/ReverseImageSearchModal.tsx
// Fullscreen modal that displays reverse image search results.

import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { RisMatch } from '../../services/reverseImageSearch';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../styles/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2; // 2 columns, 12px gap + 24px padding

interface Props {
  visible: boolean;
  onClose: () => void;
  queryImageUri: string | null;
  results: RisMatch[];
  loading: boolean;
  error: string | null;
  onSelectManga: (mangaId: string) => void;
}

export default function ReverseImageSearchModal({
  visible,
  onClose,
  queryImageUri,
  results,
  loading,
  error,
  onSelectManga,
}: Props) {
  const { colors: theme } = useTheme();

  const renderItem = ({ item }: { item: RisMatch }) => (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          width: CARD_W,
        },
      ]}
      onPress={() => onSelectManga(item.manga.id)}
    >
      {item.manga.coverImageUrl ? (
        <Image
          source={{ uri: item.manga.coverImageUrl }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardPlaceholder, { backgroundColor: theme.border }]}>
          <MaterialCommunityIcons name="image-off" size={24} color={theme.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
          {item.manga.title}
        </Text>
        <View style={styles.scoreRow}>
          <MaterialCommunityIcons
            name="chart-bell-curve"
            size={12}
            color={scoreColor(item.score)}
          />
          <Text style={[styles.scoreText, { color: scoreColor(item.score) }]}>
            {Math.round(item.score * 100)}% match
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const keyExtractor = (item: RisMatch) => item.manga.id;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modal, { backgroundColor: theme.bg }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Reverse Image Search
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              {/* Query image preview */}
              {queryImageUri ? (
                <View style={styles.queryPreview}>
                  <Image
                    source={{ uri: queryImageUri }}
                    style={styles.queryImage}
                    resizeMode="cover"
                  />
                  <Text style={[styles.queryLabel, { color: theme.textMuted }]}>
                    Searching with this image…
                  </Text>
                </View>
              ) : null}

              {/* Content */}
              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={theme.accent} />
                  <Text style={[styles.centeredText, { color: theme.textMuted, marginTop: 12 }]}>
                    Analyzing and matching covers…
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.centered}>
                  <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
                  <Text style={[styles.centeredText, { color: colors.error, marginTop: 12 }]}>
                    {error}
                  </Text>
                </View>
              ) : results.length === 0 && queryImageUri ? (
                <View style={styles.centered}>
                  <MaterialCommunityIcons name="image-search" size={48} color={theme.textMuted} />
                  <Text style={[styles.centeredText, { color: theme.textMuted, marginTop: 12 }]}>
                    No matches found. Try a different image.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 0.7) return '#4caf50';
  if (score >= 0.4) return '#ff9800';
  return '#f44336';
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mutedPlum,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  queryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.mutedPlum,
  },
  queryImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.mutedPlum,
  },
  queryLabel: {
    fontSize: 13,
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centeredText: {
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: CARD_W * 1.4,
  },
  cardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 8,
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
