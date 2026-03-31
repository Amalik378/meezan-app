import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
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
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AssetConfig, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useDeleteAsset, useZakatAssets, useZakatCalculation } from '@/lib/hooks/useZakat';
import { formatGBP } from '@/lib/utils/currency';
import { formatDate, hawlComplete, hawlProgress } from '@/lib/utils/date';

/** Computes the date when the lunar year (Hawl) completes for a given start date */
function hawlCompletionDate(startDate: string): string {
  const ms = new Date(startDate).getTime() + 354.37 * 24 * 60 * 60 * 1000;
  const d = new Date(ms);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Fade + slide-up entrance animation wrapper */
function FadeSlideIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 380 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export default function ZakatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: assets, isLoading, refetch } = useZakatAssets();
  const { data: calculation } = useZakatCalculation();
  const deleteAsset = useDeleteAsset();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function confirmDelete(id: string, description: string) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${description}" from your Zakat portfolio?`)) {
        deleteAsset.mutate(id);
      }
    } else {
      Alert.alert('Remove Asset', `Remove "${description}" from your Zakat portfolio?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteAsset.mutate(id) },
      ]);
    }
  }

  const totalValue = assets?.reduce((sum, a) => sum + a.value_gbp, 0) ?? 0;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>Zakat</Text>
          <Text style={styles.headerSubtitle}>Manage your Zakat portfolio</Text>
        </View>
        <Pressable
          style={styles.historyBtn}
          onPress={() => router.push('/zakat/history')}
        >
          <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* ── Calculation summary strip ── */}
      {calculation && (
        <Pressable
          style={styles.calcStrip}
          onPress={() => router.push('/zakat/calculator')}
        >
          <View style={styles.calcLeft}>
            <Text style={styles.calcLabel}>Total zakatable assets</Text>
            <Text style={styles.calcValue}>{formatGBP(totalValue)}</Text>
          </View>
          <View style={styles.calcRight}>
            <View style={[styles.calcBadge, calculation.meets_nisab ? styles.dueBadge : styles.clearBadge]}>
              <Text style={[styles.calcBadgeText, calculation.meets_nisab ? styles.dueText : styles.clearText]}>
                {calculation.meets_nisab
                  ? `£${calculation.zakat_due_gbp.toFixed(2)} due`
                  : 'Below Nisab'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
          </View>
        </Pressable>
      )}

      {/* ── Assets list ── */}
      {isLoading ? (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
        </ScrollView>
      ) : !assets?.length ? (
        <EmptyState
          icon="scale-outline"
          title="No assets yet"
          message="Add your savings, gold, stocks and other zakatable assets to calculate your Zakat."
          actionLabel="Add your first asset"
          onAction={() => router.push('/zakat/add-asset')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <Text style={styles.sectionLabel}>{assets.length} asset{assets.length !== 1 ? 's' : ''}</Text>
          {assets.map((asset, index) => {
            const config = AssetConfig[asset.asset_type] ?? AssetConfig.cash;
            const complete = hawlComplete(asset.hawl_start_date);
            const progress = hawlProgress(asset.hawl_start_date);
            const completionDate = hawlCompletionDate(asset.hawl_start_date);

            return (
              <FadeSlideIn key={asset.id} delay={index * 80}>
                <Card style={styles.assetCard}>
                  <View style={styles.assetHeader}>
                    <View style={[styles.assetIcon, { backgroundColor: `${config.color}18` }]}>
                      <Ionicons name={config.icon as any} size={20} color={config.color} />
                    </View>
                    <View style={styles.assetMeta}>
                      <Text style={styles.assetDescription} numberOfLines={1}>
                        {asset.description}
                      </Text>
                      <Text style={styles.assetType}>{config.label}</Text>
                    </View>
                    <Text style={styles.assetValue}>{formatGBP(asset.value_gbp)}</Text>
                  </View>

                  {/* Animated Hawl progress bar */}
                  <View style={styles.hawlRow}>
                    <AnimatedProgressBar
                      pct={progress}
                      height={8}
                      color={complete ? Colors.success : Colors.accent}
                      delay={index * 80 + 200}
                    />
                    <View style={styles.hawlStatus}>
                      <Ionicons
                        name={complete ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={complete ? Colors.success : Colors.textTertiary}
                      />
                      <Text style={[styles.hawlText, complete && styles.hawlTextComplete]}>
                        {complete ? 'Hawl complete' : `Hawl: ${Math.round(progress * 100)}%`}
                      </Text>
                      {!complete && (
                        <Text style={styles.hawlCompletionDate}>
                          · completes {completionDate}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.assetFooter}>
                    <Text style={styles.assetDate}>
                      Since {formatDate(asset.hawl_start_date)}
                    </Text>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(asset.id, asset.description)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </Pressable>
                  </View>
                </Card>
              </FadeSlideIn>
            );
          })}
        </ScrollView>
      )}

      <FAB onPress={() => router.push('/zakat/add-asset')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textInverse },
  headerSubtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calcStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  calcLeft: { gap: 2 },
  calcLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  calcValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  calcRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  calcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  dueBadge: { backgroundColor: Colors.accentLight },
  clearBadge: { backgroundColor: Colors.successBg },
  calcBadgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  dueText: { color: '#7A5C1E' },
  clearText: { color: Colors.successText },

  list: { padding: Spacing.base, gap: Spacing.md },
  sectionLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },

  assetCard: { gap: Spacing.md },
  assetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetMeta: { flex: 1, gap: 2 },
  assetDescription: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  assetType: { fontSize: Typography.xs, color: Colors.textSecondary },
  assetValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },

  hawlRow: { gap: 6 },
  hawlStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  hawlText: { fontSize: Typography.xs, color: Colors.textTertiary },
  hawlTextComplete: { color: Colors.success },
  hawlCompletionDate: { fontSize: Typography.xs, color: Colors.textTertiary },

  assetFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetDate: { fontSize: Typography.xs, color: Colors.textTertiary },
  deleteBtn: { padding: 4 },
});
