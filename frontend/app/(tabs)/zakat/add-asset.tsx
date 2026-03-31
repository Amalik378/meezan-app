import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AssetConfig, Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAddAsset } from '@/lib/hooks/useZakat';
import { today } from '@/lib/utils/date';
import { Ionicons } from '@expo/vector-icons';

const ASSET_TYPES = Object.entries(AssetConfig).map(([value, { label, icon, color }]) => ({
  value,
  label,
  icon,
  color,
}));

const schema = z.object({
  asset_type: z.string().min(1, 'Select an asset type'),
  description: z.string().min(1, 'Description is required').max(200),
  value_gbp: z
    .string()
    .min(1, 'Value is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  hawl_start_date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
});

type FormData = z.infer<typeof schema>;

export default function AddAssetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addAsset = useAddAsset();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      asset_type: '',
      description: '',
      value_gbp: '',
      hawl_start_date: today(),
    },
  });

  const selectedType = watch('asset_type');

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      await addAsset.mutateAsync({
        asset_type: data.asset_type,
        description: data.description,
        value_gbp: Number(data.value_gbp),
        hawl_start_date: data.hawl_start_date,
      });
      router.back();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add asset.');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backLabel}>Zakat</Text>
        </Pressable>
        <Text style={styles.navTitle}>Add Asset</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Asset type picker ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asset Type</Text>
          <View style={styles.typeGrid}>
            {ASSET_TYPES.map(({ value, label, icon, color }) => (
              <Pressable
                key={value}
                style={[
                  styles.typeChip,
                  selectedType === value && styles.typeChipSelected,
                  selectedType === value && { borderColor: color },
                ]}
                onPress={() => setValue('asset_type', value)}
              >
                <View style={[styles.typeChipIcon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={icon as any} size={16} color={color} />
                </View>
                <Text
                  style={[
                    styles.typeChipLabel,
                    selectedType === value && { color: Colors.textPrimary, fontWeight: Typography.semibold },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.asset_type ? (
            <Text style={styles.error}>{errors.asset_type.message}</Text>
          ) : null}
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Description"
                placeholder="e.g. Lloyds ISA, AAPL shares, Gold jewellery"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.description?.message}
              />
            )}
          />
        </View>

        {/* ── Value ── */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="value_gbp"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Current Value (GBP)"
                prefix="£"
                placeholder="0.00"
                keyboardType="decimal-pad"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.value_gbp?.message}
              />
            )}
          />
        </View>

        {/* ── Hawl start date ── */}
        <View style={styles.section}>
          <Controller
            control={control}
            name="hawl_start_date"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date Acquired (Hawl Start)"
                placeholder="YYYY-MM-DD"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                error={errors.hawl_start_date?.message}
                hint="The date you first owned or received this asset"
              />
            )}
          />
        </View>

        {/* ── Nisab info ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={Colors.info} />
          <Text style={styles.infoText}>
            Zakat is only due on assets held for a complete lunar year (Hawl) above the
            Nisab threshold. Non-zakatable assets (e.g. your home, car) should not be added.
          </Text>
        </View>

        {submitError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{submitError}</Text>
          </View>
        ) : null}

        <Button
          label="Add Asset"
          onPress={handleSubmit(onSubmit)}
          loading={addAsset.isPending}
          fullWidth
        />
      </ScrollView>
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

  content: { padding: Spacing.base, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipSelected: { backgroundColor: Colors.surface, borderWidth: 2 },
  typeChipIcon: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  typeChipLabel: { fontSize: Typography.sm, color: Colors.textSecondary },

  error: { fontSize: Typography.xs, color: Colors.error },

  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.infoBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoText: { flex: 1, fontSize: Typography.sm, color: Colors.info, lineHeight: 20 },

  errorBox: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.md },
  errorBoxText: { fontSize: Typography.sm, color: Colors.error, lineHeight: 20 },
});
