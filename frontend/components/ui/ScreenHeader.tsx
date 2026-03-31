import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  dark?: boolean;
}

export function ScreenHeader({ title, subtitle, right, dark = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        dark && styles.dark,
        { paddingTop: insets.top + Spacing.md },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.text}>
          <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dark: {
    backgroundColor: Colors.primary,
    borderBottomWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  text: { gap: 2 },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  titleDark: { color: Colors.textInverse },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  subtitleDark: { color: 'rgba(255,255,255,0.7)' },
});
