import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useZakatRecords } from '@/lib/hooks/useZakat';
import { formatGBP } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';

export default function ZakatHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: records, isLoading } = useZakatRecords();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backLabel}>Zakat</Text>
        </Pressable>
        <Text style={styles.navTitle}>History</Text>
        <View style={{ width: 70 }} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.content}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </ScrollView>
      ) : !records?.length ? (
        <EmptyState
          icon="time-outline"
          title="No records yet"
          message="Finalise your annual Zakat calculation to create a permanent record."
          actionLabel="Calculate now"
          onAction={() => router.push('/zakat/calculator')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.countLabel}>
            {records.length} record{records.length !== 1 ? 's' : ''}
          </Text>
          {records.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => router.push(`/zakat/record/${record.id}`)}
            >
              {({ pressed }) => (
                <Card style={[styles.recordCard, pressed && styles.cardPressed]} padding="base">
                  <View style={styles.recordHeader}>
                    <View>
                      <Text style={styles.recordYear}>{record.hijri_year ?? '—'}</Text>
                      <Text style={styles.recordDate}>{formatDate(record.calculation_date)}</Text>
                    </View>
                    <View style={styles.recordRight}>
                      <View style={styles.recordAmountCol}>
                        <Text style={styles.recordAmountLabel}>Zakat paid</Text>
                        <Text style={styles.recordAmount}>{formatGBP(record.zakat_due_gbp)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                    </View>
                  </View>
                  <View style={styles.recordMeta}>
                    <MetaItem label="Total assets" value={formatGBP(record.total_assets_gbp)} />
                    <MetaItem label="Nisab" value={formatGBP(record.nisab_value_gbp)} />
                    <MetaItem label="Standard" value={record.nisab_type_used} />
                  </View>
                </Card>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordMetaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 70 },
  backLabel: { fontSize: Typography.base, color: Colors.primary },
  navTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },

  content: { padding: Spacing.base, gap: Spacing.md },
  countLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  recordCard: { gap: Spacing.md },
  cardPressed: { opacity: 0.8 },

  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordYear: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  recordDate: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  recordRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordAmountCol: { alignItems: 'flex-end' },
  recordAmountLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recordAmount: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.accent },

  recordMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  recordMetaItem: { flex: 1, gap: 2 },
  metaLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
});
