import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  computeReadingStats, ReadingStats,
  fmtTime as formatReadingTime,
  fmtLastRead as formatLastRead,
} from '../../services/readingStatsService';
import { colors, spacing } from '../../styles/tokens';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { openPremiumCheckout } from '../../services/stripeService';
import PremiumUpgradeModal from '../../components/layout/PremiumUpgradeModal';
import BackButton from '../../components/general/BackButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DONUT_SIZE = 160;
const DONUT_STROKE = 28;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRC = 2 * Math.PI * DONUT_RADIUS;

type Tab = 'overview' | 'genres' | 'calendar' | 'activity';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReadingStatsScreen() {
  const { colors: theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation();
  const { isPremium } = usePremium();
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    computeReadingStats()
      .then((data) => { if (!cancelled) { setStats(data); setLoading(false); } })
      .catch((err: any) => { if (!cancelled) { setError(err?.message || 'Failed to load stats'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [isPremium]);

  // ── Premium gate (fail-closed) ─────────────────────────────────
  // Free users see a locked state + checkout, never the analytics data.
  if (!isPremium) {
    return (
      <View style={s.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <View style={s.lockBadge}>
            <Feather name="lock" size={30} color={theme.textPrimary} />
          </View>
          <Text style={s.error}>Reading Stats is a Premium feature</Text>
          <Text style={s.muted}>
            Unlock personalized analytics — reading streaks, genre charts,
            calendar heatmap, and time distribution — with YomuLog Premium.
          </Text>
          <Pressable
            style={s.upgradeBtn}
            onPress={() => setShowPremiumModal(true)}
          >
            <Text style={s.upgradeBtnText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
        <PremiumUpgradeModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onUpgrade={openPremiumCheckout}
        />
      </View>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accentLight} />
          <Text style={s.muted}>Crunching your numbers…</Text>
        </View>
      </View>
    );
  }

  // ── Error / No data ──────────────────────────────────────────────
  if (error || !stats) {
    return (
      <View style={s.container}>
        <Header onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <Feather name="book-open" size={48} color={theme.textMuted} />
          <Text style={s.error}>{error || 'No reading data yet'}</Text>
          <Text style={s.muted}>Start reading manga to see your stats!</Text>
        </View>
      </View>
    );
  }

  const maxWeekly = Math.max(1, ...stats.weeklyActivity.map((w) => w.count));

  return (
    <View style={s.container}>
      <Header onBack={() => navigation.goBack()} />

      {/* Tab bar */}
      <View style={s.tabBar}>
        {([
          ['overview', 'Overview'],
          ['genres', 'Genres'],
          ['calendar', 'Calendar'],
          ['activity', 'Activity'],
        ] as [Tab, string][]).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[s.tab, tab === key && s.tabActive]}
          >
            <Text style={[s.tabLabel, tab === key && s.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
        {/* ── Overview Tab ────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            <SectionTitle title="Reading Summary" />
            <View style={s.grid}>
              <StatCard label="Chapters Read" value={String(stats.totalChaptersRead)} icon="📖" color={theme.accentLight} />
              <StatCard label="Series" value={String(stats.totalSeriesRead)} icon="📚" color={colors.modalPurple} />
              <StatCard label="Completed" value={String(stats.totalSeriesCompleted)} icon="✅" color={colors.success} />
              <StatCard label="Completion" value={`${stats.completionRate}%`} icon="🎯" color={theme.accentDark} />
            </View>

            <SectionTitle title="Streaks" />
            <View style={s.grid}>
              <StatCard label="Current Streak" value={`${stats.currentStreak}d`} icon="🔥" color="#f97316" />
              <StatCard label="Longest Streak" value={`${stats.longestStreak}d`} icon="🏆" color="#eab308" />
              <StatCard label="Time Spent" value={formatReadingTime(stats.estimatedReadingMinutes)} icon="⏱️" color={theme.accentLight} />
              <StatCard label="Favorite Day" value={DAY_NAMES[stats.favoriteReadingDay] || '—'} icon="⭐" color={DAY_COLORS[stats.favoriteReadingDay] || theme.accent} />
            </View>

            <SectionTitle title="This Week" />
            <View style={s.barChart}>
              {stats.weeklyActivity.map((w, i) => (
                <View key={w.day} style={s.barCol}>
                  <View style={[s.bar, { height: Math.max(4, (w.count / maxWeekly) * 80), backgroundColor: DAY_COLORS[i] }]} />
                  <Text style={s.barDay}>{w.day}</Text>
                  <Text style={s.barCount}>{w.count}</Text>
                </View>
              ))}
            </View>
            <View style={[s.timeRow, { marginTop: 8 }]}>
              <Text style={s.timeLabel}>Reading time this week</Text>
              <Text style={s.timeCount}>
                {formatReadingTime(stats.readingMinutesThisWeek)}
              </Text>
            </View>

            <SectionTitle title="Reading Time" />
            <View style={s.timeDist}>
              {stats.sessionDistribution.map((slot) => {
                const maxSession = Math.max(1, ...stats.sessionDistribution.map((s) => s.count));
                const pct = Math.round((slot.count / maxSession) * 100);
                return (
                  <View key={slot.label} style={s.timeRow}>
                    <Text style={s.timeLabel}>{slot.label}</Text>
                    <View style={s.timeBarTrack}>
                      <View style={[s.timeBarFill, { width: `${pct}%`, backgroundColor: slot.color }]} />
                    </View>
                    <Text style={s.timeCount}>{slot.count}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Genres Tab ──────────────────────────────────────────── */}
        {tab === 'genres' && (
          <>
            <SectionTitle title="Top Genres" />
            {stats.genreDistribution.length === 0 ? (
              <Text style={s.emptyHint}>Add manga to your library to see genre stats.</Text>
            ) : (
              <>
                {/* Donut chart */}
                <View style={s.donutWrap}>
                  <DonutChart segments={stats.genreDistribution} />
                  <View style={s.donutCenter}>
                    <Text style={s.donutCenterValue}>{stats.totalSeriesInLibrary}</Text>
                    <Text style={s.donutCenterLabel}>Series</Text>
                  </View>
                </View>

                {/* Legend */}
                <View style={s.legendWrap}>
                  {stats.genreDistribution.map((g) => {
                    const total = stats.genreDistribution.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
                    return (
                      <View key={g.label} style={s.legendRow}>
                        <View style={[s.legendDot, { backgroundColor: g.color }]} />
                        <Text style={s.legendLabel}>{g.label}</Text>
                        <Text style={s.legendPct}>{pct}%</Text>
                        <View style={s.legendBarTrack}>
                          <View style={[s.legendBarFill, { width: `${pct}%`, backgroundColor: g.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* ── Calendar Tab ────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <>
            <SectionTitle title="Reading Heatmap" />
            <Text style={s.heatmapSub}>Last 4 months • darker = more chapters</Text>
            <View style={s.heatmapWrap}>
              {/* Month labels */}
              <View style={s.heatmapMonths}>
                {(() => {
                  const months: string[] = [];
                  const seen = new Set<string>();
                  for (const day of stats.monthlyCalendar) {
                    const m = day.date.slice(0, 7);
                    if (!seen.has(m)) {
                      seen.add(m);
                      const [y, mo] = m.split('-');
                      months.push(MONTH_NAMES[parseInt(mo, 10) - 1]);
                    }
                  }
                  return months.map((m, i) => (
                    <Text key={i} style={s.heatmapMonth}>{m}</Text>
                  ));
                })()}
              </View>
              {/* Grid */}
              <View style={s.heatmapGrid}>
                {stats.monthlyCalendar.map((day, i) => (
                  <View
                    key={day.date}
                    style={[
                      s.heatmapCell,
                      {
                        backgroundColor:
                          day.level === 0 ? theme.bgSecondary :
                          day.level === 1 ? theme.bgSecondary :
                          day.level === 2 ? theme.accentDark :
                          day.level === 3 ? theme.accent : theme.accentLight,
                      },
                    ]}
                  />
                ))}
              </View>
              {/* Legend */}
              <View style={s.heatmapLegend}>
                <Text style={s.heatmapLegendLabel}>Less</Text>
                {[0, 1, 2, 3, 4].map((lvl) => (
                  <View key={lvl} style={[s.heatmapCell, {
                    width: 12, height: 12, borderRadius: 2,
                    backgroundColor: lvl === 0 ? theme.bgSecondary : lvl === 1 ? theme.bgSecondary : lvl === 2 ? theme.accentDark : lvl === 3 ? theme.accent : theme.accentLight,
                  }]} />
                ))}
                <Text style={s.heatmapLegendLabel}>More</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Activity Tab ────────────────────────────────────────── */}
        {tab === 'activity' && (
          <>
            <SectionTitle title="Recent Activity" />
            {stats.recentActivity.length === 0 ? (
              <Text style={s.emptyHint}>No recent reading activity.</Text>
            ) : (
              stats.recentActivity.map((ch, i) => (
                <View key={`${ch.chapterId}-${i}`} style={s.actRow}>
                  <View style={s.actLeft}>
                    <Text style={s.actTitle} numberOfLines={1}>{ch.mangaTitle}</Text>
                    <Text style={s.actSub}>Ch. {ch.chapterNumber} · {formatLastRead(ch.lastReadAt)}</Text>
                  </View>
                  <View style={s.actRight}>
                    <View style={[s.actBarBg]}>
                      <View style={[s.actBarFill, { width: `${ch.scrollPercentage}%` }]} />
                    </View>
                    <Text style={s.actPct}>{ch.scrollPercentage}%</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: spacing.p24 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  const { colors: theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <SafeAreaView style={s.header}>
      <BackButton onPress={onBack} />
      <Text style={s.headerTitle}>Reading Stats</Text>
      <View style={{ width: 70 }} />
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors: theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const { colors: theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/** Pure-RN donut chart using View borders and rotation */
function DonutChart({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const { colors: theme } = useTheme();
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let cumulativeAngle = -90; // start from top

  return (
    <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
      {/* Background ring */}
      <View style={{
        width: DONUT_SIZE, height: DONUT_SIZE, borderRadius: DONUT_SIZE / 2,
        borderWidth: DONUT_STROKE, borderColor: theme.bgSecondary,
        position: 'absolute',
      }} />
      {/* Segment slices */}
      {segments.map((seg, i) => {
        const pct = seg.count / total;
        if (pct <= 0) return null;
        const angle = pct * 360;
        const result = (
          <View
            key={seg.label}
            style={{
              width: DONUT_SIZE, height: DONUT_SIZE, borderRadius: DONUT_SIZE / 2,
              borderWidth: DONUT_STROKE,
              borderColor: 'transparent',
              borderTopColor: seg.color,
              borderRightColor: angle > 180 ? seg.color : 'transparent',
              borderBottomColor: angle > 180 ? 'transparent' : seg.color,
              borderLeftColor: angle > 180 ? 'transparent' : 'transparent',
              transform: [{ rotate: `${cumulativeAngle}deg` }],
              position: 'absolute',
            }}
          />
        );
        cumulativeAngle += angle;
        return result;
      })}
      {/* Inner circle to make it a donut */}
      <View style={{
        width: DONUT_SIZE - DONUT_STROKE * 2,
        height: DONUT_SIZE - DONUT_STROKE * 2,
        borderRadius: (DONUT_SIZE - DONUT_STROKE * 2) / 2,
        backgroundColor: theme.bgInput,
        position: 'absolute',
        top: DONUT_STROKE,
        left: DONUT_STROKE,
      }} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.p16,
    paddingBottom: spacing.p12, backgroundColor: c.bgCard,
    borderBottomWidth: 1, borderBottomColor: c.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
  scroll: { flex: 1, paddingHorizontal: spacing.p16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.p20 },
  muted: { color: c.textMuted, fontSize: 14, marginTop: spacing.p8, textAlign: 'center' },
  error: { color: c.error, fontSize: 16, fontWeight: '600', marginTop: spacing.p12 },

  // Tabs
  tabBar: {
    flexDirection: 'row', marginHorizontal: spacing.p16, marginTop: spacing.p12,
    backgroundColor: c.bgCard, borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: c.accentDark },
  tabLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  tabLabelActive: { color: colors.white },

  // Premium gate
  lockBadge: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: c.bgCard, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.p14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  premiumGate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accentLight, borderRadius: 12, padding: spacing.p10,
    marginTop: spacing.p12, gap: 8,
  },
  premiumGateText: { fontSize: 12, fontWeight: '600', color: c.textSecondary, flex: 1 },
  upgradeBtn: { backgroundColor: c.accentDark, borderRadius: 8, paddingHorizontal: spacing.p14, paddingVertical: spacing.p6 },
  upgradeBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginTop: spacing.p20, marginBottom: spacing.p12 },

  // Grid cards
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', backgroundColor: c.bgCard, borderRadius: 12, padding: spacing.p14,
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, marginBottom: spacing.p6,
  },
  statIcon: { fontSize: 24, marginBottom: spacing.p6 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: c.textMuted, marginTop: spacing.p4, fontWeight: '600' },

  // Bar chart
  barChart: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    height: 120, backgroundColor: c.bgCard, borderRadius: 12,
    padding: spacing.p12, marginBottom: spacing.p8,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 10, color: c.textMuted, marginTop: spacing.p4, fontWeight: '600' },
  barCount: { fontSize: 10, color: c.textSecondary, fontWeight: '700', marginTop: 2 },

  // Time distribution
  timeDist: { backgroundColor: c.bgCard, borderRadius: 12, padding: spacing.p14, marginBottom: spacing.p8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.p10 },
  timeLabel: { width: 70, fontSize: 12, fontWeight: '600', color: c.textSecondary },
  timeBarTrack: { flex: 1, height: 10, backgroundColor: c.bgSecondary, borderRadius: 5, marginHorizontal: spacing.p8 },
  timeBarFill: { height: 10, borderRadius: 5 },
  timeCount: { width: 30, fontSize: 12, fontWeight: '700', color: c.textMuted, textAlign: 'right' },

  // Donut
  donutWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.p12, height: DONUT_SIZE + 20,
  },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutCenterValue: { fontSize: 28, fontWeight: '800', color: c.textPrimary },
  donutCenterLabel: { fontSize: 12, color: c.textMuted },

  // Legend
  legendWrap: { backgroundColor: c.bgCard, borderRadius: 12, padding: spacing.p14, marginBottom: spacing.p8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.p8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.p8 },
  legendLabel: { width: 80, fontSize: 11, color: c.textSecondary, fontWeight: '500', textTransform: 'capitalize' },
  legendPct: { width: 35, fontSize: 11, fontWeight: '700', color: c.textMuted, textAlign: 'right' },
  legendBarTrack: { flex: 1, height: 6, backgroundColor: c.bgSecondary, borderRadius: 3, marginLeft: spacing.p8 },
  legendBarFill: { height: 6, borderRadius: 3 },

  // Heatmap
  heatmapSub: { fontSize: 11, color: c.textMuted, marginBottom: spacing.p8, marginTop: -spacing.p8 },
  heatmapWrap: { backgroundColor: c.bgCard, borderRadius: 12, padding: spacing.p12, marginBottom: spacing.p8 },
  heatmapMonths: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.p8 },
  heatmapMonth: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start' },
  heatmapCell: { width: 13, height: 13, borderRadius: 2 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.p10, gap: 3 },
  heatmapLegendLabel: { fontSize: 10, color: c.textMuted },

  // Activity
  emptyHint: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.p20 },
  actRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard,
    borderRadius: 10, padding: spacing.p12, marginBottom: spacing.p8,
  },
  actLeft: { flex: 1, marginRight: spacing.p10 },
  actTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  actSub: { fontSize: 11, color: c.textMuted, marginTop: spacing.p4 },
  actRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actBarBg: { width: 60, height: 4, backgroundColor: c.bgSecondary, borderRadius: 2 },
  actBarFill: { height: 4, backgroundColor: c.accentDark, borderRadius: 2 },
  actPct: { fontSize: 11, fontWeight: '600', color: c.textMuted, width: 30, textAlign: 'right' },

  // Premium footer
  premiumFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accentLight, borderRadius: 12, padding: spacing.p14,
    marginTop: spacing.p20, opacity: 0.9, gap: spacing.p8,
  },
  premiumFooterIcon: { fontSize: 18 },
  premiumFooterText: { fontSize: 11, color: c.textSecondary, fontWeight: '600', flex: 1 },
});
