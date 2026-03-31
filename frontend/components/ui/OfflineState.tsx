/**
 * OfflineState — shown when the device has no network connectivity.
 *
 * Usage:
 *   const { isOffline } = useNetworkState();
 *   if (isOffline) return <OfflineState onRetry={refetch} />;
 *
 * Or use the bundled hook + component together:
 *   <OfflineBanner />   ← unobtrusive banner at the top of a screen
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Hook — returns whether the device is currently offline.
// Uses navigator.onLine on web; falls back to a simple fetch probe on native.
// ---------------------------------------------------------------------------
export function useNetworkState() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    // On web, CORS blocks external fetch probes — use navigator.onLine instead.
    if (Platform.OS === 'web') {
      setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
      const handleOnline  = () => { if (mounted) setIsOffline(false); };
      const handleOffline = () => { if (mounted) setIsOffline(true); };
      window.addEventListener('online',  handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        mounted = false;
        window.removeEventListener('online',  handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native: lightweight fetch probe to Google's generate_204 endpoint.
    async function probe() {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch('https://connectivitycheck.gstatic.com/generate_204', {
          method: 'HEAD',
          signal: ctrl.signal,
          cache: 'no-store',
        });
        clearTimeout(timer);
        if (mounted) setIsOffline(!res.ok && res.status !== 204);
      } catch {
        if (mounted) setIsOffline(true);
      }
    }

    probe();
    const interval = setInterval(probe, 15_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOffline };
}

// ---------------------------------------------------------------------------
// Full-screen offline state
// ---------------------------------------------------------------------------
interface OfflineStateProps {
  onRetry?: () => void;
}

export function OfflineState({ onRetry }: OfflineStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={56} color={Colors.textTertiary} />
      </View>
      <Text style={styles.title}>You're offline</Text>
      <Text style={styles.message}>
        Check your internet connection and try again.
      </Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slim banner for non-blocking offline indication
// ---------------------------------------------------------------------------
export function OfflineBanner() {
  const { isOffline } = useNetworkState();
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={14} color={Colors.textInverse} />
      <Text style={styles.bannerText}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Full screen ──────────────────────────────────────────────────────────
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
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
  // ── Banner ───────────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.textSecondary,
    ...Shadow.sm,
  },
  bannerText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textInverse,
  },
});
