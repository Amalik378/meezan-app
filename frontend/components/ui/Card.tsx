import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: keyof typeof Spacing | number;
}

export function Card({ children, style, onPress, padding = 'base' }: CardProps) {
  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { padding: paddingValue },
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { padding: paddingValue }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  pressed: { opacity: 0.92 },
});
