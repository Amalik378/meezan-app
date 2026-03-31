import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'neutral', size = 'sm' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`bg_${variant}`], size === 'md' && styles.md]}>
      <Text style={[styles.label, styles[`text_${variant}`], size === 'md' && styles.labelMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelMd: {
    fontSize: Typography.sm,
  },

  bg_success: { backgroundColor: Colors.successBg },
  bg_error: { backgroundColor: Colors.errorBg },
  bg_warning: { backgroundColor: Colors.warningBg },
  bg_info: { backgroundColor: Colors.infoBg },
  bg_neutral: { backgroundColor: Colors.surfaceAlt },

  text_success: { color: Colors.successText },
  text_error: { color: Colors.errorText },
  text_warning: { color: Colors.warning },
  text_info: { color: Colors.info },
  text_neutral: { color: Colors.textSecondary },
});
