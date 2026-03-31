import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, prefix, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View
          style={[
            styles.inputWrapper,
            focused && styles.focused,
            error ? styles.errored : null,
          ]}
        >
          {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
          <TextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={Colors.textTertiary}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
        </View>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  focused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  errored: {
    borderColor: Colors.error,
  },
  prefix: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md - 2,
  },
  error: {
    fontSize: Typography.xs,
    color: Colors.error,
    marginTop: 2,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
