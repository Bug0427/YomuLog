import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { computeReadingStats, ReadingStats, fmtTime as formatReadingTime, fmtLastRead as formatLastRead } from '../../services/readingStatsService';
import { colors, spacing, u, borders } from '../../styles/tokens';

export default function ReadingStatsScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'weekly'>('overview');

  useEffect(() => {
    let cancelled = false;
    computeReadingStats().then((data: ReadingStats) => {
      if (!cancelled) { setStats(data); setLoading(false); }
    }).catch((err: any) => {
      if (!cancelled) { setError(err?.message || 'Failed to load stats'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Reading Stats</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.lavender} />
          <Text style={styles.loadingText}>Crunching your numbers…</Text>
        </View>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.title}>Reading Stats</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{error || 'No reading data yet'}</Text>
          <Text style={styles.hintText}>Start reading manga to see your stats!</Text>
        </View>
      </View>
    );
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
  const maxWeeklyCount = Math.max(1, ...stats.weeklyActivity.map((w: any) => w.count));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Reading Stats</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        {/* Overview Stat Cards */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statGrid}>
          <StatCard label="Chapters Read" value={String(stats.totalChaptersRead)} icon="📖" color={colors.lavender} />
          <StatCard label="Series Read" value={String(stats.totalSeriesRead)} icon="📚" color={colors.modalPurple} />
          <StatCard label="Completed" value={String(stats.totalSeriesCompleted)} icon="✅" color={colors.success} />
          <StatCard label="Completion" value={`${stats.completionRate}%`} icon="🎯" color={colors.cocoa} />
        </View>

        {/* Time & Streak */}
        <Text style={styles.sectionTitle}>Reading Time</Text>
        <View style={styles.statGrid}>
          <StatCard label="Time Spent" value={formatReadingTime(stats.estimatedReadingMinutes)} icon="⏱️" color={colors.lavender} />
          <StatCard label="Streak" value={`${stats.readingStreakDays} days`} icon="🔥" color="#f97316" />
          <StatCard label="Avg Scroll" value={`${stats.averageScrollDepth}%`} icon="📏" color={colors.mutedPlum} />
          <StatCard label="Favorite Day" value={DAY_NAMES[stats.favoriteReadingDay] || '—'} icon="⭐" color={dayColors[stats.favoriteReadingDay] || colors.modalPurple} />
        </View>

        {/* Weekly Activity */}
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weeklyChart}>
          {stats.weeklyActivity.map((w: any, i: number) => (
            <View key={w.day} style={styles.barColumn}>
              <View style={[styles.bar, { height: Math.max(4, (w.count / maxWeeklyCount) * 80), backgroundColor: dayColors[i] }]} />
              <Text style={styles.barLabel}>{w.day}</Text>
              <Text style={styles.barCount}>{w.count}</Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {stats.recentActivity.length === 0 ? (
          <Text style={styles.hintText}>No recent reading activity</Text>
        ) : (
          stats.recentActivity.slice(0, 5).map((ch: any, i: number) => (
            <View key={`${ch.chapterId}-${i}`} style={styles.activityRow}>
              <Text style={styles.activityTitle} numberOfLines={1}>{ch.mangaTitle}</Text>
              <Text style={styles.activityDetail}>Ch. {ch.chapterNumber} — {formatLastRead(ch.lastReadAt)}</Text>
              <View style={[styles.activityBar, { width: `${ch.scrollPercentage}%` }]} />
            </View>
          ))
        )}

        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumIcon}>👑</Text>
          <Text style={styles.premiumText}>Premium Feature — Syncs across all your devices</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.creamWhite },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.p16, paddingTop: 50, paddingBottom: spacing.p12, backgroundColor: colors.sand, borderBottomWidth: 1, borderBottomColor: colors.lavender },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: colors.creamWhite, borderWidth: 1, borderColor: colors.lavender },
  backBtnText: { fontSize: 20, color: colors.deepPlum, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: colors.deepPlum },
  scrollArea: { flex: 1, paddingHorizontal: spacing.p16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.plum, marginTop: spacing.p20, marginBottom: spacing.p12 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.mutedPlum, marginTop: spacing.p12, fontSize: 15 },
  errorText: { color: colors.error, fontSize: 16, textAlign: 'center' },
  hintText: { color: colors.mutedPlum, fontSize: 14, textAlign: 'center', marginTop: spacing.p8, marginBottom: spacing.p20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: colors.white, borderRadius: 12, padding: spacing.p14, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, marginBottom: spacing.p10 },
  statIcon: { fontSize: 24, marginBottom: spacing.p6 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.mutedPlum, marginTop: spacing.p4, fontWeight: '600' },
  weeklyChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, backgroundColor: colors.white, borderRadius: 12, padding: spacing.p12, marginBottom: spacing.p20 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: colors.mutedPlum, marginTop: spacing.p4, fontWeight: '600' },
  barCount: { fontSize: 10, color: colors.plum, fontWeight: '700', marginTop: 2 },
  activityRow: { backgroundColor: colors.white, borderRadius: 10, padding: spacing.p12, marginBottom: spacing.p8 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: colors.deepPlum },
  activityDetail: { fontSize: 12, color: colors.mutedPlum, marginTop: spacing.p4 },
  activityBar: { height: 3, backgroundColor: colors.lavender, borderRadius: 2, marginTop: spacing.p8, maxWidth: '100%' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender, borderRadius: 12, padding: spacing.p14, marginTop: spacing.p20, opacity: 0.9 },
  premiumIcon: { fontSize: 18, marginRight: spacing.p8 },
  premiumText: { fontSize: 12, color: colors.deepPlum, fontWeight: '600' },
});