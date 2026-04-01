import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AssetConfig, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useDeleteAsset, useUpdateAsset, useZakatAssets, useZakatCalculation } from '@/lib/hooks/useZakat';
import type { ZakatAsset } from '@/lib/api/zakat';
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
  const updateAsset = useUpdateAsset();
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editingAsset, setEditingAsset] = useState<ZakatAsset | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const modalSlide = useSharedValue(300);
  const modalSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalSlide.value }],
  }));

  function openEdit(asset: ZakatAsset) {
    setEditingAsset(asset);
    setEditValue(asset.value_gbp.toString());
    setEditDesc(asset.description);
    modalSlide.value = withSpring(0, { damping: 14, stiffness: 120 });
  }

  function closeEdit() {
    modalSlide.value = withTiming(300, { duration: 200 }, (finished) => {
      if (finished) {
        // Must run on JS thread
      }
    });
    setTimeout(() => setEditingAsset(null), 210);
  }

  async function saveEdit() {
    if (!editingAsset) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid value', 'Please enter a valid amount greater than 0.');
      return;
    }
    setEditSaving(true);
    try {
      await updateAsset.mutateAsync({
        id: editingAsset.id,
        payload: { value_gbp: val, description: editDesc.trim() || editingAsset.description },
      });
      closeEdit();
    } catch {
      Alert.alert('Error', 'Could not update asset. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

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
                    <View style={styles.assetActions}>
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => openEdit(asset)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => confirmDelete(asset.id, asset.description)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </FadeSlideIn>
            );
          })}
        </ScrollView>
      )}

      <FAB onPress={() => router.push('/zakat/add-asset')} />

      {/* ── Edit Asset Modal ── */}
      <Modal
        visible={editingAsset !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <TouchableWithoutFeedback onPress={closeEdit}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKav}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.modalSheet, modalSheetStyle]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Edit Asset</Text>
                {editingAsset && (
                  <Text style={styles.modalSubtitle}>
                    {AssetConfig[editingAsset.asset_type]?.label ?? editingAsset.asset_type}
                  </Text>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder="e.g. Current account"
                    placeholderTextColor={Colors.textTertiary}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Value (£)</Text>
                  <TextInput
                    style={styles.input}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={saveEdit}
                  />
                </View>

                <View style={styles.modalBtns}>
                  <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={closeEdit}>
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSave, editSaving && { opacity: 0.6 }]}
                    onPress={saveEdit}
                    disabled={editSaving}
                  >
                    <Text style={styles.modalBtnSaveText}>
                      {editSaving ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
  assetActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalKav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: -Spacing.md,
  },
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnCancelText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  modalBtnSave: {
    backgroundColor: Colors.primary,
  },
  modalBtnSaveText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
