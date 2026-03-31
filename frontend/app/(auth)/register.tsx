import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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

const schema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);
  const [sentToEmail, setSentToEmail] = React.useState('');
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      await signUp(data.email, data.password, data.fullName);
      setSentToEmail(data.email);
      setEmailSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Please try again.');
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: sentToEmail });
      if (error) throw error;
      setResendMessage('Confirmation email resent.');
    } catch {
      setResendMessage('Could not resend. Please try again.');
    } finally {
      setResending(false);
    }
  }

  if (emailSent) {
    return (
      <KeyboardAvoidingView style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>One more step</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.mailIconWrap}>
              <Ionicons name="mail-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.confirmTitle}>Confirm your email</Text>
            <Text style={styles.confirmBody}>
              We sent a confirmation link to{' '}
              <Text style={styles.confirmEmail}>{sentToEmail}</Text>
              {'. '}Click it to activate your account, then sign in.
            </Text>

            {resendMessage && (
              <Text style={[styles.resendMsg, resendMessage.includes('resent') && styles.resendMsgSuccess]}>
                {resendMessage}
              </Text>
            )}

            <Button
              label={resending ? 'Sending…' : 'Resend Email'}
              onPress={handleResend}
              loading={resending}
              fullWidth
            />

            <Pressable style={styles.backToLogin} onPress={() => router.replace('/(auth)/login')}>
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.backLabel}>Sign In</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start managing your Islamic finances</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fields}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  autoComplete="name"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.fullName?.message}
                />
              )}
            />
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
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  secureTextEntry
                  autoComplete="new-password"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </View>

          {submitError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          <Button
            label="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
          />

          <Text style={styles.terms}>
            By creating an account you agree to our Terms of Service and Privacy Policy. Your
            financial data is encrypted and stored securely.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: Colors.primary },
  container: { flexGrow: 1, padding: Spacing.base, gap: Spacing.xl },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backLabel: { fontSize: Typography.base, color: 'rgba(255,255,255,0.8)' },

  heading: { gap: Spacing.sm },
  title: { fontSize: Typography.xxl, fontWeight: Typography.bold, color: Colors.textInverse },
  subtitle: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  fields: { gap: Spacing.md },

  terms: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
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

  // Email confirmation state
  mailIconWrap: { alignItems: 'center', paddingVertical: Spacing.md },
  confirmTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmEmail: { fontWeight: Typography.semibold, color: Colors.textPrimary },
  resendMsg: { fontSize: Typography.sm, color: Colors.error, textAlign: 'center' },
  resendMsgSuccess: { color: Colors.success },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  backToLoginText: { fontSize: Typography.base, color: Colors.primary, fontWeight: Typography.medium },
});
