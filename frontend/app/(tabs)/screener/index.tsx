import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useScreenTicker,
  useWatchlist,
} from '@/lib/hooks/useScreening';
import type { ScreeningResult } from '@/lib/api/screening';

export default function ScreenerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [submittedTicker, setSubmittedTicker] = useState('');
  const [browseTicker, setBrowseTicker] = useState('');
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const POPULAR_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'NESN', '2222.SR'];

  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();
  const { data: searchResult, isLoading: searchLoading } = useScreenTicker(
    submittedTicker,
    submittedTicker.length > 0
  );
  const { data: browseResult, isLoading: browseLoading } = useScreenTicker(
    browseTicker,
    browseTicker.length > 0
  );
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  function handleSearch() {
    const ticker = searchQuery.trim().toUpperCase();
    if (ticker.length > 0) setSubmittedTicker(ticker);
  }

  async function handleAddToWatchlist(ticker: string) {
    setWatchlistError(null);
    try {
      await addToWatchlist.mutateAsync(ticker);
      setSearchQuery('');
      setSubmittedTicker('');
    } catch (err) {
      setWatchlistError(err instanceof Error ? err.message : 'Could not add to watchlist.');
    }
  }

  function handleRemoveFromWatchlist(ticker: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${ticker} from your watchlist?`)) {
        removeFromWatchlist.mutate(ticker);
      }
    } else {
      Alert.alert('Remove from Watchlist', `Remove ${ticker}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromWatchlist.mutate(ticker) },
      ]);
    }
  }

  const watchlistTickers = new Set(watchlist?.map((w) => w.ticker) ?? []);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Screener</Text>
        <Text style={styles.headerSubtitle}>AAOIFI Shariah compliance</Text>
        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ticker (e.g. AAPL, MSFT)"
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="characters"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setSubmittedTicker(''); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Popular Stocks ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Popular Stocks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {POPULAR_STOCKS.map((ticker) => (
              <Pressable
                key={ticker}
                style={[styles.chip, browseTicker === ticker && styles.chipActive]}
                onPress={() => setBrowseTicker(browseTicker === ticker ? '' : ticker)}
              >
                <Text style={[styles.chipText, browseTicker === ticker && styles.chipTextActive]}>{ticker}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {browseLoading && browseTicker.length > 0 && <SkeletonCard lines={2} />}
          {!browseLoading && browseResult && browseTicker.length > 0 && (
            <ScreeningCard
              result={browseResult}
              inWatchlist={watchlistTickers.has(browseResult.ticker)}
              onAddWatchlist={() => handleAddToWatchlist(browseResult.ticker)}
              onRemoveWatchlist={() => handleRemoveFromWatchlist(browseResult.ticker)}
              onPress={() => router.push(`/screener/${browseResult.ticker}`)}
              addingWatchlist={addToWatchlist.isPending}
            />
          )}
        </View>

        {/* ── Search result ── */}
        {submittedTicker.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Search Result</Text>
            {searchLoading ? (
              <SkeletonCard lines={2} />
            ) : searchResult ? (
              <ScreeningCard
                result={searchResult}
                inWatchlist={watchlistTickers.has(searchResult.ticker)}
                onAddWatchlist={() => handleAddToWatchlist(searchResult.ticker)}
                onRemoveWatchlist={() => handleRemoveFromWatchlist(searchResult.ticker)}
                onPress={() => router.push(`/screener/${searchResult.ticker}`)}
                addingWatchlist={addToWatchlist.isPending}
              />
            ) : null}
          </View>
        )}

        {/* ── Watchlist error ── */}
        {watchlistError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{watchlistError}</Text>
          </View>
        ) : null}

        {/* ── Watchlist ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            My Watchlist {watchlist ? `(${watchlist.length})` : ''}
          </Text>
          {watchlistLoading ? (
            <View style={{ gap: 12 }}>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </View>
          ) : !watchlist?.length ? (
            <EmptyState
              icon="bookmark-outline"
              title="Your watchlist is empty"
              message="Search for a stock ticker above and save it to track its Shariah compliance."
            />
          ) : (
            watchlist.map((item) =>
              item.screening ? (
                <ScreeningCard
                  key={item.id}
                  result={item.screening}
                  inWatchlist={true}
                  onAddWatchlist={() => {}}
                  onRemoveWatchlist={() => handleRemoveFromWatchlist(item.ticker)}
                  onPress={() => router.push(`/screener/${item.ticker}`)}
                  addingWatchlist={false}
                />
              ) : (
                <Card key={item.id} padding="base">
                  <Text style={styles.pendingTicker}>{item.ticker}</Text>
                  <Text style={styles.pendingText}>Screening pending…</Text>
                </Card>
              )
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ScreeningCard({
  result,
  inWatchlist,
  onAddWatchlist,
  onRemoveWatchlist,
  onPress,
  addingWatchlist,
}: {
  result: ScreeningResult;
  inWatchlist: boolean;
  onAddWatchlist: () => void;
  onRemoveWatchlist: () => void;
  onPress: () => void;
  addingWatchlist: boolean;
}) {
  const isCompliant =
    result.business_screen_pass &&
    result.debt_ratio_pass &&
    result.interest_income_pass &&
    result.receivables_pass;

  const scoreColor =
    result.compliance_score >= 75
      ? Colors.success
      : result.compliance_score >= 50
      ? Colors.warning
      : Colors.error;

  function daysAgo(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  return (
    <Card style={styles.screenCard} onPress={onPress}>
      <View style={styles.screenHeader}>
        <View style={styles.screenLeft}>
          <View style={styles.tickerRow}>
            <Text style={styles.ticker}>{result.ticker}</Text>
            <Badge
              label={isCompliant ? `PASS · ${result.compliance_score}` : `FAIL · ${result.compliance_score}`}
              variant={isCompliant ? 'success' : 'error'}
            />
          </View>
          <Text style={styles.companyName} numberOfLines={1}>{result.company_name}</Text>
          {result.sector ? <Text style={styles.sector}>{result.sector}</Text> : null}
          <Text style={styles.lastUpdated}>Updated {daysAgo(result.last_updated)}</Text>
        </View>

        {/* Score ring */}
        <View style={styles.scoreCol}>
          <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{result.compliance_score}</Text>
          </View>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>

      {/* Screen indicators */}
      <View style={styles.screenChecks}>
        {[
          { label: 'Business', pass: result.business_screen_pass },
          { label: 'Debt', pass: result.debt_ratio_pass },
          { label: 'Interest', pass: result.interest_income_pass },
          { label: 'Receivables', pass: result.receivables_pass },
        ].map(({ label, pass }) => (
          <View key={label} style={styles.checkItem}>
            <Ionicons
              name={pass ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={pass ? Colors.success : Colors.error}
            />
            <Text style={[styles.checkLabel, !pass && styles.checkFail]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Progress bar */}
      <View style={styles.scoreBar}>
        <View style={[styles.scoreFill, { width: `${result.compliance_score}%`, backgroundColor: scoreColor }]} />
      </View>

      {/* Watchlist button */}
      <Pressable
        style={[styles.watchlistBtn, inWatchlist && styles.watchlistBtnActive]}
        onPress={inWatchlist ? onRemoveWatchlist : onAddWatchlist}
        disabled={addingWatchlist}
      >
        {addingWatchlist ? (
          <Skeleton width={80} height={14} borderRadius={7} />
        ) : (
          <>
            <Ionicons
              name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={inWatchlist ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.watchlistBtnText, inWatchlist && styles.watchlistBtnTextActive]}>
              {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </Text>
          </>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  headerTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textInverse },
  headerSubtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: -Spacing.xs },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textInverse },

  content: { padding: Spacing.base, gap: Spacing.lg },
  section: { gap: Spacing.md },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  screenCard: { gap: Spacing.md },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  screenLeft: { flex: 1, gap: 3 },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticker: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  companyName: { fontSize: Typography.base, color: Colors.textSecondary },
  sector: { fontSize: Typography.xs, color: Colors.textTertiary },

  scoreCol: { alignItems: 'center', gap: 4 },
  scoreRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: Typography.md, fontWeight: Typography.bold },
  scoreLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },

  screenChecks: { flexDirection: 'row', gap: Spacing.base },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  checkLabel: { fontSize: Typography.xs, color: Colors.textSecondary },
  checkFail: { color: Colors.error },

  scoreBar: { height: 4, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: Radius.full },

  watchlistBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt },
  watchlistBtnActive: { backgroundColor: Colors.primaryMuted },
  watchlistBtnText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  watchlistBtnTextActive: { color: Colors.primary },

  lastUpdated: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },

  pendingTicker: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  pendingText: { fontSize: Typography.sm, color: Colors.textTertiary },

  errorBox: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.md },
  errorBoxText: { fontSize: Typography.sm, color: Colors.error, lineHeight: 20 },

  chipsRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
});
