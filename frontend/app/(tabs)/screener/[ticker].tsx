import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useScreenTicker } from '@/lib/hooks/useScreening';
import { formatPercent } from '@/lib/utils/currency';

/** Visual bar showing actual value vs threshold with a threshold marker line */
function RatioBar({
  actual,
  threshold,
  pass,
}: {
  actual: number;
  threshold: number;
  pass: boolean;
}) {
  // Display range 0→threshold*1.5, threshold marker sits at 66.7% of track width
  const maxVal = threshold * 1.5;
  const fillPct = Math.min((actual / maxVal) * 100, 100);
  const thresholdPct = (threshold / maxVal) * 100;
  const fillColor = pass ? Colors.success : Colors.error;

  return (
    <View style={ratioStyles.container}>
      <View style={ratioStyles.track}>
        <View
          style={[
            ratioStyles.fill,
            { width: `${fillPct}%` as any, backgroundColor: fillColor },
          ]}
        />
        <View style={[ratioStyles.thresholdLine, { left: `${thresholdPct}%` as any }]} />
      </View>
      <View style={ratioStyles.labels}>
        <Text style={[ratioStyles.labelActual, !pass && { color: Colors.error }]}>
          {formatPercent(actual)} actual
        </Text>
        <Text style={ratioStyles.labelThreshold}>{formatPercent(threshold)} limit</Text>
      </View>
    </View>
  );
}

const ratioStyles = StyleSheet.create({
  container: { marginTop: Spacing.sm, gap: 4 },
  track: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  thresholdLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 1,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelActual: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  labelThreshold: { fontSize: Typography.xs, color: Colors.textTertiary },
});

export default function TickerDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ticker } = useLocalSearchParams<{ ticker: string }>();

  const { data: result, isLoading } = useScreenTicker(ticker ?? '', !!ticker);

  // Score count-up animation
  const [displayScore, setDisplayScore] = React.useState(0);
  React.useEffect(() => {
    if (!result) return;
    setDisplayScore(0);
    const target = result.compliance_score;
    const step = Math.max(1, Math.ceil(target / 30));
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayScore(current);
      if (current >= target) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [result?.compliance_score]);

  const isCompliant =
    result?.business_screen_pass &&
    result?.debt_ratio_pass &&
    result?.interest_income_pass &&
    result?.receivables_pass;

  const scoreColor = result
    ? result.compliance_score >= 75
      ? Colors.success
      : result.compliance_score >= 50
      ? Colors.warning
      : Colors.error
    : Colors.textTertiary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backLabel}>Screener</Text>
        </Pressable>
        <Text style={styles.navTitle}>{ticker}</Text>
        <View style={{ width: 80 }} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 8, flex: 1 }}>
              <Skeleton width={80} height={28} />
              <Skeleton width={160} height={14} />
            </View>
            <Skeleton width={72} height={72} borderRadius={36} />
          </View>
          <SkeletonCard lines={2} style={{ marginTop: 4 }} />
          <SkeletonCard lines={6} style={{ marginTop: 4 }} />
        </ScrollView>
      ) : !result ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load screening data.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Company header ── */}
          <View style={styles.companyHeader}>
            <View style={styles.companyLeft}>
              <Text style={styles.ticker}>{result.ticker}</Text>
              <Text style={styles.companyName}>{result.company_name}</Text>
              {result.sector ? <Text style={styles.sector}>{result.sector}</Text> : null}
            </View>
            {/* Score ring with grey background disc + count-up number */}
            <View style={styles.scoreRingWrapper}>
              <View style={styles.scoreRingBg} />
              <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreNum, { color: scoreColor }]}>{displayScore}</Text>
                <Text style={styles.scoreSubtext}>/ 100</Text>
              </View>
            </View>
          </View>

          {/* ── Verdict ── */}
          <Card
            style={[styles.verdictCard, isCompliant ? styles.verdictPass : styles.verdictFail]}
            padding="lg"
          >
            <View
              style={[
                styles.verdictIconBg,
                { backgroundColor: isCompliant ? Colors.successBg : Colors.errorBg },
              ]}
            >
              <Ionicons
                name={isCompliant ? 'checkmark-circle' : 'close-circle'}
                size={32}
                color={isCompliant ? Colors.success : Colors.error}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verdictTitle}>
                {isCompliant ? 'Shariah Compliant' : 'Not Shariah Compliant'}
              </Text>
              <Text style={styles.verdictSubtext}>
                {isCompliant
                  ? 'Passes all AAOIFI screening criteria.'
                  : `Fails ${result.fail_reasons.length} screening criterion.`}
              </Text>
            </View>
          </Card>

          {/* ── Screens detail ── */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Screening Criteria</Text>
          </View>
          <Card padding="base">
            {[
              {
                label: 'Business Activity',
                pass: result.business_screen_pass,
                description: 'No revenue from alcohol, pork, gambling, weapons, or conventional finance.',
                ratio: null,
                threshold: null,
              },
              {
                label: 'Revenue Purity',
                pass: result.receivables_pass,
                description: 'Non-permissible revenue must be less than 5% of total revenue.',
                // Show non-compliant % vs 5% threshold
                ratio: result.compliant_revenue_pct != null ? 1 - result.compliant_revenue_pct : null,
                threshold: 0.05,
              },
              {
                label: 'Debt Ratio',
                pass: result.debt_ratio_pass,
                description: 'Total debt must be less than 30% of market capitalisation.',
                ratio: result.debt_to_market_cap_ratio,
                threshold: 0.30,
              },
              {
                label: 'Securities Ratio',
                pass: result.interest_income_pass,
                description: 'Interest-bearing securities must be less than 30% of market capitalisation.',
                ratio: result.securities_to_market_cap_ratio,
                threshold: 0.30,
              },
            ].map(({ label, pass, description, ratio, threshold }, idx) => (
              <View key={label} style={[styles.criteriaRow, idx > 0 && styles.borderTop]}>
                <View style={styles.criteriaHeader}>
                  <View style={styles.criteriaLeft}>
                    <Ionicons
                      name={pass ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={pass ? Colors.success : Colors.error}
                    />
                    <Text style={styles.criteriaLabel}>{label}</Text>
                  </View>
                  <Badge label={pass ? 'Pass' : 'Fail'} variant={pass ? 'success' : 'error'} />
                </View>
                <Text style={styles.criteriaDesc}>{description}</Text>
                {ratio != null && threshold != null ? (
                  <RatioBar actual={ratio} threshold={threshold} pass={pass} />
                ) : null}
              </View>
            ))}
          </Card>

          {/* ── Fail reasons ── */}
          {result.fail_reasons.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Why It Fails</Text>
              </View>
              <Card padding="base">
                {result.fail_reasons.map((reason, idx) => (
                  <View key={idx} style={[styles.failRow, idx > 0 && styles.borderTop]}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.failText}>{reason}</Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* ── Methodology note ── */}
          <View style={styles.methodBox}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Methodology</Text>
            </View>
            <Text style={styles.methodText}>
              Screening data powered by Zoya Finance, following AAOIFI Shariah Standard No. 21.
              Business activity and revenue purity checks identify impermissible income sources.
              Financial ratios (debt and securities) are measured against market capitalisation.
              Compliance score (0–100) is derived from compliant revenue %, debt ratio, and
              securities ratio. This is not a religious ruling — consult a qualified scholar for
              personal financial decisions.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 80 },
  backLabel: { fontSize: Typography.base, color: Colors.primary },
  navTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary },

  content: { padding: Spacing.base, gap: Spacing.base },

  companyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companyLeft: { flex: 1, gap: 3 },
  ticker: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textPrimary },
  companyName: { fontSize: Typography.base, color: Colors.textSecondary },
  sector: { fontSize: Typography.sm, color: Colors.textTertiary },

  scoreRingWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingBg: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.surfaceAlt,
  },
  scoreRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scoreNum: { fontSize: Typography.xl, fontWeight: Typography.bold, lineHeight: 26 },
  scoreSubtext: { fontSize: 10, color: Colors.textTertiary },

  verdictCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  verdictPass: { borderWidth: 1, borderColor: Colors.successBg },
  verdictFail: { borderWidth: 1, borderColor: Colors.errorBg },
  verdictIconBg: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictTitle: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  verdictSubtext: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionAccent: { width: 3, height: 14, backgroundColor: Colors.accent, borderRadius: 2 },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  criteriaRow: { paddingVertical: Spacing.md, gap: Spacing.sm },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider },
  criteriaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  criteriaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  criteriaLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  criteriaDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },

  failRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  failText: { flex: 1, fontSize: Typography.sm, color: Colors.errorText, lineHeight: 20 },

  methodBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  methodText: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },
});
