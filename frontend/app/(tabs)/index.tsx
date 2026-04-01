import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { CHAPTERS } from '@/constants/learnData';
import { useNisab } from '@/lib/hooks/useNisab';
import { useWatchlist } from '@/lib/hooks/useScreening';
import { useZakatAssets, useZakatCalculation } from '@/lib/hooks/useZakat';
import { useAuthStore } from '@/lib/stores/authStore';
import { formatGBP } from '@/lib/utils/currency';
import { getHijriDateString } from '@/lib/utils/date';

const QUOTES = [
  {
    text: 'Protect yourselves from the Fire, even with half a date in charity.',
    source: 'Al-Bukhari & Muslim',
  },
  {
    text: 'Charity does not decrease wealth.',
    source: 'Muslim',
  },
  {
    text: 'The believer\'s shade on the Day of Resurrection will be their Sadaqah.',
    source: 'Al-Tirmidhi',
  },
  {
    text: 'Give in charity without delay, for it stands in the way of calamity.',
    source: 'Al-Tirmidhi',
  },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: zakatCalc, isLoading: zakatLoading, refetch: refetchZakat } = useZakatCalculation();
  const { data: nisab } = useNisab();
  const { data: watchlist } = useWatchlist();
  const { data: assets } = useZakatAssets();

  const [refreshing, setRefreshing] = React.useState(false);
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [totalXP, setTotalXP] = React.useState(0);
  const [completedLessons, setCompletedLessons] = React.useState(0);

  const totalLessons = CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);

  useFocusEffect(
    useCallback(() => {
      async function loadLearnStats() {
        try {
          const keys: string[] = ['learn_total_xp'];
          for (const ch of CHAPTERS) {
            for (const l of ch.lessons) {
              keys.push(`learn_${ch.id}_${l.id}_stars`);
            }
          }
          const pairs = await AsyncStorage.multiGet(keys);
          let xp = 0;
          let completed = 0;
          for (const [key, value] of pairs) {
            if (key === 'learn_total_xp') xp = parseInt(value ?? '0', 10) || 0;
            else if (key.endsWith('_stars') && parseInt(value ?? '0', 10) > 0) completed++;
          }
          setTotalXP(xp);
          setCompletedLessons(completed);
        } catch (_) {}
      }
      loadLearnStats();
    }, [])
  );

  const progressAnim = useSharedValue(0);

  async function onRefresh() {
    setRefreshing(true);
    await refetchZakat();
    setRefreshing(false);
  }

  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const nisabValue = nisab?.nisab_silver_gbp ?? 0;
  const totalAssets = zakatCalc?.net_zakatable_gbp ?? 0;
  const nisabProgress = nisabValue > 0 ? Math.min(totalAssets / nisabValue, 1) : 0;
  const meetsNisab = zakatCalc?.meets_nisab ?? false;
  const zakatDue = zakatCalc?.zakat_due_gbp ?? 0;

  React.useEffect(() => {
    if (trackWidth > 0 && nisabProgress > 0) {
      progressAnim.value = withDelay(400, withTiming(nisabProgress * trackWidth, { duration: 900 }));
    }
  }, [nisabProgress, trackWidth]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: progressAnim.value,
  }));

  const compliantCount =
    watchlist?.filter((w) => {
      const s = w.screening;
      return s?.business_screen_pass && s?.debt_ratio_pass && s?.interest_income_pass && s?.receivables_pass;
    }).length ?? 0;
  const watchlistTotal = watchlist?.length ?? 0;

  const assetCount = assets?.length ?? 0;

  const nisabPct = nisabValue > 0 ? Math.round((totalAssets / nisabValue) * 100) : 0;
  const nisabInsight =
    nisabProgress >= 1
      ? `${nisabPct}% above Nisab threshold`
      : `${Math.round((1 - nisabProgress) * 100)}% below Nisab threshold`;

  const quote = getDailyQuote();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View>
          <Text style={styles.greeting}>As-salamu alaykum,</Text>
          <Text style={styles.name}>{firstName} ✦</Text>
          <Text style={styles.hijriDate}>{getHijriDateString()}</Text>
        </View>
        <Pressable
          style={styles.avatarBtn}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-circle" size={38} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* ── Zakat Overview Card ── */}
      <Card style={styles.zakatCard} padding="lg">
        <View style={styles.zakatHeader}>
          <Text style={styles.cardLabel}>Zakat Overview</Text>
          {meetsNisab ? (
            <View style={styles.dueBadge}>
              <Text style={styles.dueBadgeText}>Due</Text>
            </View>
          ) : (
            <View style={styles.noDueBadge}>
              <Text style={styles.noDueBadgeText}>Below Nisab</Text>
            </View>
          )}
        </View>

        {zakatLoading ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <Skeleton width="50%" height={36} />
            <Skeleton width="70%" height={12} />
            <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        ) : (
          <>
            <Text style={styles.zakatAmount}>{formatGBP(totalAssets)}</Text>
            <Text style={styles.zakatSubtext}>
              Nisab threshold: {formatGBP(nisabValue)}
            </Text>

            {/* Animated progress bar */}
            <View
              style={styles.progressTrack}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: meetsNisab ? Colors.accent : Colors.primary },
                  progressFillStyle,
                ]}
              />
              <View
                style={[
                  styles.nisabMark,
                  { left: `${Math.min(nisabValue / Math.max(totalAssets, nisabValue), 1) * 100}%` as any },
                ]}
              />
            </View>

            <View style={styles.zakatInsightRow}>
              <Ionicons
                name={meetsNisab ? 'trending-up' : 'information-circle-outline'}
                size={14}
                color={meetsNisab ? Colors.accent : Colors.textSecondary}
              />
              <Text style={[styles.zakatInsightText, meetsNisab && { color: Colors.accent }]}>
                {meetsNisab
                  ? `Zakat due: ${formatGBP(zakatDue)} · ${nisabInsight}`
                  : nisabInsight}
              </Text>
            </View>

            {/* Next Hawl date */}
            {(() => {
              if (!assets?.length) return null;
              const now = Date.now();
              const upcoming = assets
                .map((a) => new Date(new Date(a.hawl_start_date).getTime() + 354.37 * 86_400_000))
                .filter((d) => d.getTime() > now)
                .sort((a, b) => a.getTime() - b.getTime());
              if (!upcoming.length) return null;
              const next = upcoming[0];
              const daysLeft = Math.ceil((next.getTime() - now) / 86_400_000);
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const dateStr = `${next.getDate()} ${months[next.getMonth()]} ${next.getFullYear()}`;
              return (
                <View style={[styles.zakatInsightRow, { marginTop: 2 }]}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
                  <Text style={styles.zakatInsightText}>
                    {daysLeft <= 7
                      ? `Next Hawl in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} · ${dateStr}`
                      : `Next Hawl: ${dateStr}`}
                  </Text>
                </View>
              );
            })()}
          </>
        )}
      </Card>

      {/* ── Islamic Quote Strip ── */}
      <View style={styles.quoteStrip}>
        <View style={styles.quoteAccentBar} />
        <View style={styles.quoteContent}>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <Text style={styles.quoteSource}>— {quote.source}</Text>
        </View>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        {/* Learn card */}
        <Pressable
          style={[styles.statCard, styles.statCardLearn]}
          onPress={() => router.push('/learn')}
        >
          <View style={[styles.statIcon, { backgroundColor: Colors.primaryMuted }]}>
            <Ionicons name="book" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>
            {completedLessons > 0 ? `${completedLessons}/${totalLessons}` : `${totalLessons}`}
          </Text>
          <Text style={styles.statLabel}>
            {completedLessons > 0 ? 'Lessons done' : 'Lessons to explore'}
          </Text>
          <Text style={styles.statSubtext}>
            {totalXP > 0 ? `${totalXP} XP earned` : 'Islamic finance basics'}
          </Text>
        </Pressable>

        {/* Portfolio card */}
        <Pressable
          style={[styles.statCard, styles.statCardPortfolio]}
          onPress={() => router.push('/screener')}
        >
          <View style={[styles.statIcon, { backgroundColor: Colors.primaryMuted }]}>
            <Ionicons name="bar-chart" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>
            {watchlistTotal > 0 ? `${compliantCount}/${watchlistTotal}` : '—'}
          </Text>
          <Text style={styles.statLabel}>
            {watchlistTotal > 0 ? 'Halal compliant' : 'No watchlist yet'}
          </Text>
          <Text style={styles.statSubtext}>
            {watchlistTotal > 0 ? 'in your watchlist' : 'screen a stock to start'}
          </Text>
        </Pressable>
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <View style={styles.actionsGrid}>
        <QuickAction
          icon="scale"
          label="Calculate Zakat"
          color={Colors.accent}
          onPress={() => router.push('/zakat')}
        />
        <QuickAction
          icon="add-circle"
          label="Add Asset"
          color={Colors.primary}
          onPress={() => router.push('/zakat/add-asset')}
        />
        <QuickAction
          icon="search"
          label="Screen Stock"
          color={Colors.info}
          onPress={() => router.push('/screener')}
        />
        <QuickAction
          icon="book"
          label="Learn"
          color={Colors.primary}
          onPress={() => router.push('/learn')}
        />
      </View>

      {/* ── Asset Summary ── */}
      {assets && assets.length > 0 && (
        <>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>
              Your Assets
              <Text style={styles.sectionCount}> · {assetCount}</Text>
            </Text>
          </View>
          <Card padding="base">
            {assets.slice(0, 4).map((asset, idx) => (
              <View key={asset.id} style={[styles.assetRow, idx > 0 && styles.assetRowBorder]}>
                <View style={styles.assetLeft}>
                  <Text style={styles.assetType}>{asset.asset_type.replace('_', ' ')}</Text>
                  <Text style={styles.assetDesc} numberOfLines={1}>{asset.description}</Text>
                </View>
                <Text style={styles.assetValue}>{formatGBP(asset.value_gbp)}</Text>
              </View>
            ))}
            {assets.length > 4 && (
              <Pressable
                style={styles.viewAllRow}
                onPress={() => router.push('/zakat')}
              >
                <Text style={styles.viewAllText}>View all {assets.length} assets</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </Pressable>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, gap: Spacing.base },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  greeting: { fontSize: Typography.base, color: 'rgba(255,255,255,0.75)' },
  name: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
    marginTop: 2,
  },
  hijriDate: { fontSize: Typography.sm, color: Colors.accentLight, marginTop: 4 },
  avatarBtn: { padding: 4 },

  // Zakat card
  zakatCard: { marginTop: -Spacing.xl, ...Shadow.md },
  zakatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dueBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  dueBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textPrimary },
  noDueBadge: {
    backgroundColor: Colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  noDueBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.successText },
  zakatAmount: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  zakatSubtext: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.full,
  },
  nisabMark: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 1,
  },
  zakatInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  zakatInsightText: { fontSize: Typography.sm, color: Colors.textSecondary, flex: 1 },

  // Quote strip
  quoteStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    overflow: 'hidden',
    gap: Spacing.md,
  },
  quoteAccentBar: {
    width: 4,
    backgroundColor: Colors.accent,
  },
  quoteContent: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    gap: 4,
  },
  quoteText: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quoteSource: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: 2,
    ...Shadow.sm,
    borderLeftWidth: 3,
  },
  statCardLearn: { borderLeftColor: Colors.accent },
  statCardPortfolio: { borderLeftColor: Colors.primary },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  statSubtext: { fontSize: Typography.xs, color: Colors.textTertiary },

  // Section headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionAccent: { width: 3, height: 14, backgroundColor: Colors.accent, borderRadius: 2 },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: { fontWeight: Typography.regular, color: Colors.textTertiary },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  quickAction: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },

  // Asset rows
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  assetRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider },
  assetLeft: { flex: 1, marginRight: Spacing.sm },
  assetType: { fontSize: Typography.xs, color: Colors.textTertiary, textTransform: 'capitalize' },
  assetDesc: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  assetValue: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  viewAllText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
});
