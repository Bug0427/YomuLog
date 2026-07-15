// screens/main/DownLoadsScreen.tsx
// Displays downloaded chapters and download queue with progress.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import Header from '../../components/layout/Header';
import SearchBar from '../../components/layout/SearchBar';
import { useScrollTracker } from '../../hooks/useScrollTracker';
import Anchor from '../../components/layout/Anchor';
import { GeneralStyles, CardViewStyles } from '../../styles/global';
import { colors, spacing, t } from '../../styles/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getDownloadedChapters,
  getDownloadQueue,
  DownloadJob,
  DownloadedChapter,
  processAllDownloads,
  retryFailedDownloads,
  removeJob,
  clearCompleted,
  getDownloadStats,
} from '../../services/downloadManager';

// ─── Stat box component ────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.deepPlum }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.mutedPlum }}>{label}</Text>
    </View>
  );
}

// ─── Download job row ──────────────────────────────────────────────

function JobRow({ item, onRemove }: { item: DownloadJob; onRemove: (id: string) => void }) {
  return (
    <View style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}>
      <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
        <Text style={CardViewStyles.rowTitle} numberOfLines={1}>
          {item.mangaTitle} · Ch. {item.chapterNumber}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor:
                item.status === 'completed' ? colors.success :
                item.status === 'failed' ? colors.error :
                item.status === 'downloading' ? colors.lavender :
                colors.paleLavender,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.plum }}>
              {item.status === 'downloading' ? `${item.progress}%` : item.status}
            </Text>
          </View>
          {item.status === 'downloading' && (
            <View
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.paleLavender,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${item.progress}%`,
                  height: '100%',
                  backgroundColor: colors.plum,
                  borderRadius: 2,
                }}
              />
            </View>
          )}
        </View>
        {item.errorMessage && (
          <Text style={{ fontSize: 10, color: colors.error, marginTop: 2 }} numberOfLines={1}>
            {item.errorMessage}
          </Text>
        )}
      </View>
      {item.status === 'failed' && (
        <Pressable onPress={() => onRemove(item.jobId)}>
          <MaterialCommunityIcons name="close" size={18} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Downloaded chapter row ────────────────────────────────────────

function DownloadedRow({ item }: { item: DownloadedChapter }) {
  return (
    <View style={[CardViewStyles.rowCard, { marginBottom: 6, alignItems: 'center' }]}>
      <View
        style={[
          CardViewStyles.rowMediaBase,
          { width: 40, height: 56, backgroundColor: colors.sand },
        ]}
      />
      <View style={[CardViewStyles.rowTextWrap, { flex: 1 }]}>
        <Text style={CardViewStyles.rowTitle} numberOfLines={1}>
          {item.mangaTitle}
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedPlum, marginTop: 2 }}>
          Ch. {item.chapterNumber} · {item.totalPages} pages
        </Text>
      </View>
      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────

export default function DownLoadsScreen() {
  const { isScrolling, handleScrollStart, handleScrollEnd } = useScrollTracker();
  const scrollRef = React.useRef<any>(null);

  const [downloaded, setDownloaded] = useState<DownloadedChapter[]>([]);
  const [queue, setQueue] = useState<DownloadJob[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, pending: 0, downloading: 0 });
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    const [dl, q, s] = await Promise.all([
      getDownloadedChapters(),
      getDownloadQueue(),
      getDownloadStats(),
    ]);
    dl.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
    setDownloaded(dl);
    setQueue(q);
    setStats(s);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleProcessAll = useCallback(async () => {
    setProcessing(true);
    await processAllDownloads();
    await refresh();
    setProcessing(false);
  }, [refresh]);

  const handleRetry = useCallback(async () => {
    setProcessing(true);
    await retryFailedDownloads();
    await refresh();
    setProcessing(false);
  }, [refresh]);

  const handleRemove = useCallback(async (jobId: string) => {
    await removeJob(jobId);
    await refresh();
  }, [refresh]);

  const handleClearCompleted = useCallback(async () => {
    await clearCompleted();
    await refresh();
  }, [refresh]);

  const hasActiveDownload = stats.pending > 0 || stats.downloading > 0 || stats.failed > 0;
  const isEmpty = downloaded.length === 0 && queue.length === 0;

  return (
    <View style={GeneralStyles.container}>
      <FlatList
        ref={scrollRef as any}
        data={downloaded}
        keyExtractor={(item) => item.chapterId}
        renderItem={({ item }) => <DownloadedRow item={item} />}
        onScrollBeginDrag={handleScrollStart}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        ListHeaderComponent={
          <>
            <Header />
            <SearchBar />
            <View style={[GeneralStyles.alignment, { justifyContent: 'space-between', marginTop: 10 }]}>
              <Text style={GeneralStyles.h1}>Downloads</Text>
            </View>

            {/* Stats row */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingVertical: spacing.p10,
                marginHorizontal: spacing.p12,
                backgroundColor: colors.paleLavender,
                borderRadius: 8,
                marginBottom: spacing.p10,
              }}
            >
              <StatBox label="Downloaded" value={stats.completed} />
              <StatBox label="Pending" value={stats.pending} />
              <StatBox label="Failed" value={stats.failed} />
            </View>

            {/* Action buttons */}
            {hasActiveDownload && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  paddingHorizontal: spacing.p12,
                  marginBottom: spacing.p10,
                }}
              >
                <Pressable
                  onPress={handleProcessAll}
                  disabled={processing}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    backgroundColor: colors.deepPlum,
                    borderRadius: 6,
                    alignItems: 'center',
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.paleLavender, fontWeight: '600', fontSize: 13 }}>
                    {processing ? 'Processing…' : 'Download All'}
                  </Text>
                </Pressable>
                {stats.failed > 0 && (
                  <Pressable
                    onPress={handleRetry}
                    disabled={processing}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      backgroundColor: colors.error,
                      borderRadius: 6,
                      alignItems: 'center',
                      opacity: processing ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                      Retry Failed
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleClearCompleted}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: colors.sand,
                    borderRadius: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="delete-sweep" size={18} color={colors.deepPlum} />
                </Pressable>
              </View>
            )}

            {/* Queue section */}
            {queue.length > 0 && (
              <>
                <Text style={[t.h2, { marginHorizontal: spacing.p12, marginTop: spacing.p8, marginBottom: spacing.p6 }]}>
                                Queue ({queue.length})
                              </Text>
                {queue.map((job) => (
                  <View key={job.jobId} style={{ marginHorizontal: spacing.p12 }}>
                    <JobRow item={job} onRemove={handleRemove} />
                  </View>
                ))}
              </>
            )}

            {/* Section header for downloaded */}
            {downloaded.length > 0 && (
              <Text style={[t.h2, { marginHorizontal: spacing.p12, marginTop: spacing.p8, marginBottom: spacing.p6 }]}>
                Saved Chapters ({downloaded.length})
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          !isEmpty ? null : (
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 24 }}>
              <MaterialCommunityIcons name="download-off" size={48} color={colors.mutedPlum} />
              <Text style={{ fontSize: 16, color: colors.mutedPlum, marginTop: 12, textAlign: 'center' }}>
                No downloads yet. Open a manga and save chapters for offline reading.
              </Text>
            </View>
          )
        }
      />
      <Anchor scrollRef={scrollRef} isScrolling={isScrolling} />
    </View>
  );
}