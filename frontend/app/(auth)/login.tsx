import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
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
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthStore, supabase } from '@/lib/stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: FormData) {
    setLoginError(null);
    setEmailUnconfirmed(false);
    setResendMessage(null);
    try {
      await signIn(data.email, data.password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please check your credentials and try again.';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('email_not_confirmed')) {
        setEmailUnconfirmed(true);
        setUnconfirmedEmail(data.email);
      } else {
        setLoginError(msg);
      }
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: unconfirmedEmail });
      if (error) throw error;
      setResendMessage('Confirmation email resent. Check your inbox.');
    } catch {
      setResendMessage('Could not resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Brand ── */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Ionicons name="scale" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.appName}>Meezan</Text>
          <Text style={styles.tagline}>ميزان — Balance your financial obligations</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          <View style={styles.fields}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />
            <Pressable
              style={styles.showPassword}
              onPress={() => setShowPassword((p) => !p)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.showPasswordText}>
                {showPassword ? 'Hide' : 'Show'} password
              </Text>
            </Pressable>
          </View>

          {emailUnconfirmed && (
            <View style={styles.unconfirmedBox}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              <View style={styles.unconfirmedText}>
                <Text style={styles.unconfirmedTitle}>Email not confirmed</Text>
                <Text style={styles.unconfirmedBody}>
                  Check your inbox for <Text style={styles.unconfirmedEmail}>{unconfirmedEmail}</Text> and click the confirmation link.
                </Text>
                {resendMessage ? (
                  <Text style={[styles.resendMsg, resendMessage.includes('resent') && styles.resendMsgSuccess]}>
                    {resendMessage}
                  </Text>
                ) : null}
                <Pressable onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendLink}>{resending ? 'Sending…' : 'Resend confirmation email'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {loginError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          )}

          <Button
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
          />

          <Pressable
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account?{' '}
              <Text style={styles.registerLinkBold}>Create one</Text>
            </Text>
          </Pressable>
        </View>

        {/* ── Disclaimer ── */}
        <Text style={styles.disclaimer}>
          Meezan is an Islamic personal finance tool. It does not provide financial or religious
          advice. Consult a qualified scholar for Zakat rulings.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: Colors.primary },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },

  brand: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  cardSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: -Spacing.md },

  fields: { gap: Spacing.md },
  showPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: -Spacing.sm,
  },
  showPasswordText: { fontSize: Typography.sm, color: Colors.textSecondary },

  registerLink: { alignItems: 'center', paddingVertical: Spacing.sm },
  registerLinkText: { fontSize: Typography.base, color: Colors.textSecondary },
  registerLinkBold: { color: Colors.primary, fontWeight: Typography.semibold },

  disclaimer: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: Typography.sm,
    textAlign: 'center',
  },
  unconfirmedBox: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  unconfirmedText: { flex: 1, gap: Spacing.xs },
  unconfirmedTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.primary },
  unconfirmedBody: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 18 },
  unconfirmedEmail: { fontWeight: Typography.semibold, color: Colors.textPrimary },
  resendLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium, marginTop: 2 },
  resendMsg: { fontSize: Typography.xs, color: Colors.error },
  resendMsgSuccess: { color: Colors.success },
});
