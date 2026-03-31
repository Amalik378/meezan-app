import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  fullWidth = false,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.textInverse : Colors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },

  // Variants
  primary: { backgroundColor: Colors.primary },
  secondary: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },

  // Sizes
  size_sm: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  size_md: { paddingVertical: Spacing.md - 2, paddingHorizontal: Spacing.lg },
  size_lg: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },

  // Labels
  label: { fontWeight: Typography.semibold },
  label_primary: { color: Colors.textInverse },
  label_secondary: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.textInverse },

  labelSize_sm: { fontSize: Typography.sm },
  labelSize_md: { fontSize: Typography.base },
  labelSize_lg: { fontSize: Typography.md },
});
