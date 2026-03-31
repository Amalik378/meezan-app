import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { AssetConfig, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useFinaliseZakat, useZakatCalculation } from '@/lib/hooks/useZakat';
import { useNisab } from '@/lib/hooks/useNisab';
import { formatGBP } from '@/lib/utils/currency';

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nisabType, setNisabType] = useState<'silver' | 'gold'>('silver');
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [finaliseResult, setFinaliseResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const { data: calc, isLoading } = useZakatCalculation(nisabType);
  const { data: nisab } = useNisab();
  const finalise = useFinaliseZakat();

  function handleFinalise() {
    if (!calc?.meets_nisab) {
      setFinaliseResult({
        success: false,
        message: 'Your assets are below the Nisab threshold. No Zakat is due.',
      });
      return;
    }
    setConfirmVisible(true);
  }

  async function handleConfirm() {
    try {
      await finalise.mutateAsync(nisabType);
      setConfirmVisible(false);
      setFinaliseResult({ success: true, message: 'Your Zakat calculation has been saved.' });
    } catch (err) {
      setConfirmVisible(false);
      setFinaliseResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to save.',
      });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backLabel}>Zakat</Text>
        </Pressable>
        <Text style={styles.navTitle}>Calculator</Text>
        <View style={{ width: 70 }} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 }]}>
          <Skeleton width="100%" height={80} borderRadius={12} />
          <SkeletonCard lines={4} style={{ marginTop: 12 }} />
          <SkeletonCard lines={5} style={{ marginTop: 12 }} />
        </ScrollView>
      ) : !calc ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Nisab selector ── */}
          <View style={styles.nisabSelector}>
            <Text style={styles.selectorLabel}>Nisab standard</Text>
            <View style={styles.selectorRow}>
              {(['silver', 'gold'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.selectorChip, nisabType === type && styles.selectorChipActive]}
                  onPress={() => setNisabType(type)}
                >
                  <Text style={[styles.selectorText, nisabType === type && styles.selectorTextActive]}>
                    {type === 'silver'
                      ? `Silver (612g) — £${(nisab?.nisab_silver_gbp ?? 0).toFixed(0)}`
                      : `Gold (87g) — £${(nisab?.nisab_gold_gbp ?? 0).toFixed(0)}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.selectorHint}>
              Hanafi: silver Nisab is typically used (lower threshold). Other madhabs often prefer gold.
            </Text>
          </View>

          {/* ── Result card ── */}
          <Card
            style={[styles.resultCard, calc.meets_nisab ? styles.resultDue : styles.resultClear]}
            padding="xl"
          >
            <Ionicons
              name={calc.meets_nisab ? 'scale' : 'checkmark-circle'}
              size={40}
              color={calc.meets_nisab ? Colors.accent : Colors.success}
            />
            <Text style={styles.resultTitle}>
              {calc.meets_nisab ? 'Zakat is due' : 'No Zakat due'}
            </Text>
            {calc.meets_nisab ? (
              <>
                <Text style={styles.resultAmount}>{formatGBP(calc.zakat_due_gbp)}</Text>
                <Text style={styles.resultSubtext}>
                  2.5% of {formatGBP(calc.net_zakatable_gbp)}
                </Text>
              </>
            ) : (
              <Text style={styles.resultSubtext}>
                Your assets are {formatGBP(calc.nisab_value_gbp - calc.net_zakatable_gbp)} below the
                Nisab threshold of {formatGBP(calc.nisab_value_gbp)}.
              </Text>
            )}
          </Card>

          {/* ── Breakdown ── */}
          <Text style={styles.sectionTitle}>Breakdown</Text>
          <Card padding="base">
            {calc.breakdown.map((item, idx) => {
              const config = AssetConfig[item.asset_type] ?? AssetConfig.cash;
              return (
                <View key={item.asset_type} style={[styles.breakdownRow, idx > 0 && styles.borderTop]}>
                  <View style={[styles.breakdownIcon, { backgroundColor: `${config.color}18` }]}>
                    <Ionicons name={config.icon as any} size={16} color={config.color} />
                  </View>
                  <View style={styles.breakdownMeta}>
                    <Text style={styles.breakdownLabel}>{config.label}</Text>
                    <Text style={styles.breakdownCount}>{item.count} asset{item.count !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownValue}>{formatGBP(item.total_value_gbp)}</Text>
                    <Text style={[styles.breakdownStatus, item.is_zakatable ? styles.zakatableText : styles.nonZakatableText]}>
                      {item.is_zakatable ? 'Zakatable' : 'Excluded'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>

          {/* ── Hawl warnings ── */}
          {calc.assets_below_hawl.length > 0 && (
            <View style={styles.hawlWarning}>
              <Ionicons name="time-outline" size={16} color={Colors.warning} />
              <Text style={styles.hawlWarningText}>
                {calc.assets_below_hawl.length} asset{calc.assets_below_hawl.length !== 1 ? 's' : ''} excluded — Hawl not yet complete.
              </Text>
            </View>
          )}

          {/* ── Summary ── */}
          <Card padding="base">
            {[
              { label: 'Total zakatable assets', value: formatGBP(calc.total_assets_gbp) },
              { label: 'Nisab threshold', value: formatGBP(calc.nisab_value_gbp) },
              { label: 'Net zakatable', value: formatGBP(calc.net_zakatable_gbp) },
              { label: 'Zakat rate', value: '2.5%' },
              { label: 'Zakat due', value: formatGBP(calc.zakat_due_gbp), bold: true },
            ].map(({ label, value, bold }, idx) => (
              <View key={label} style={[styles.summaryRow, idx > 0 && styles.borderTop]}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
              </View>
            ))}
          </Card>

          {/* ── Confirm box ── */}
          {confirmVisible && calc && (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Save Zakat record of {formatGBP(calc.zakat_due_gbp)} for {new Date().getFullYear()}? This cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  style={[styles.confirmBtn, styles.confirmBtnCancel]}
                  onPress={() => setConfirmVisible(false)}
                >
                  <Text style={styles.confirmBtnCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, styles.confirmBtnConfirm, finalise.isPending && { opacity: 0.6 }]}
                  onPress={handleConfirm}
                  disabled={finalise.isPending}
                >
                  <Text style={styles.confirmBtnConfirmText}>
                    {finalise.isPending ? 'Saving…' : 'Confirm'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Inline result ── */}
          {finaliseResult && (
            <View style={[styles.resultBox, finaliseResult.success ? styles.resultBoxSuccess : styles.resultBoxError]}>
              <Ionicons
                name={finaliseResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={finaliseResult.success ? Colors.success : Colors.error}
              />
              <Text style={[styles.resultBoxText, finaliseResult.success ? styles.resultBoxSuccessText : styles.resultBoxErrorText]}>
                {finaliseResult.message}
              </Text>
              {finaliseResult.success && (
                <Pressable onPress={() => router.push('/zakat/history')}>
                  <Text style={styles.viewHistoryLink}>View History →</Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.finaliseBtn, pressed && { opacity: 0.85 }, (finalise.isPending || confirmVisible) && { opacity: 0.6 }]}
            onPress={handleFinalise}
            disabled={finalise.isPending || confirmVisible}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.textInverse} />
            <Text style={styles.finaliseBtnText}>
              {finalise.isPending ? 'Saving…' : 'Finalise & Save Record'}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 70 },
  backLabel: { fontSize: Typography.base, color: Colors.primary },
  navTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },

  content: { padding: Spacing.base, gap: Spacing.base },

  nisabSelector: { gap: Spacing.sm },
  selectorLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  selectorRow: { flexDirection: 'row', gap: Spacing.sm },
  selectorChip: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  selectorChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  selectorText: { fontSize: Typography.xs, color: Colors.textSecondary, textAlign: 'center' },
  selectorTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
  selectorHint: { fontSize: Typography.xs, color: Colors.textTertiary, lineHeight: 18 },

  resultCard: { alignItems: 'center', gap: Spacing.sm },
  resultDue: { borderWidth: 1, borderColor: Colors.accentLight },
  resultClear: { borderWidth: 1, borderColor: Colors.successBg },
  resultTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  resultAmount: { fontSize: Typography.xxxl, fontWeight: Typography.bold, color: Colors.accent },
  resultSubtext: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },

  sectionTitle: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  borderTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider },
  breakdownIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  breakdownMeta: { flex: 1, gap: 2 },
  breakdownLabel: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  breakdownCount: { fontSize: Typography.xs, color: Colors.textTertiary },
  breakdownRight: { alignItems: 'flex-end', gap: 2 },
  breakdownValue: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  breakdownStatus: { fontSize: Typography.xs },
  zakatableText: { color: Colors.success },
  nonZakatableText: { color: Colors.textTertiary },

  hawlWarning: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.warningBg, borderRadius: Radius.md, padding: Spacing.md },
  hawlWarningText: { flex: 1, fontSize: Typography.sm, color: Colors.warning },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  summaryLabel: { fontSize: Typography.base, color: Colors.textSecondary },
  summaryValue: { fontSize: Typography.base, color: Colors.textPrimary },
  summaryValueBold: { fontWeight: Typography.bold, color: Colors.accent },

  finaliseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md + 2 },
  finaliseBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },

  confirmBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.base, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  confirmText: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', gap: Spacing.md },
  confirmBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  confirmBtnCancel: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  confirmBtnCancelText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  confirmBtnConfirm: { backgroundColor: Colors.primary },
  confirmBtnConfirmText: { fontSize: Typography.sm, color: Colors.textInverse, fontWeight: Typography.semibold },

  resultBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, flexWrap: 'wrap' },
  resultBoxSuccess: { backgroundColor: Colors.successBg },
  resultBoxError: { backgroundColor: Colors.errorBg },
  resultBoxText: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
  resultBoxSuccessText: { color: Colors.successText },
  resultBoxErrorText: { color: Colors.error },
  viewHistoryLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.semibold, marginTop: 2 },
});
