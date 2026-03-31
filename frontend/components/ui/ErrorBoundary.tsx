/**
 * ErrorBoundary — catches unhandled render errors and shows a graceful fallback.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeScreen />
 *   </ErrorBoundary>
 *
 * Or wrap the root layout for app-wide coverage.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  /** Custom fallback UI. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, log to Sentry / analytics here.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    if (this.props.fallback && error) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.sm * Typography.lineHeightRelaxed,
  },
  button: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  buttonText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
});
