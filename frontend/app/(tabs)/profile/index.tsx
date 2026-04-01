import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/authStore';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, resetOnboarding } = useAuthStore();

  const [hawlReminders, setHawlReminders] = useState(false);
  const [zakatReminders, setZakatReminders] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const vals = await AsyncStorage.multiGet(['profile_hawl_reminder', 'profile_annual_reminder']);
        for (const [key, val] of vals) {
          if (key === 'profile_hawl_reminder' && val !== null) setHawlReminders(val === 'true');
          if (key === 'profile_annual_reminder' && val !== null) setZakatReminders(val === 'true');
        }
      } catch (_) {}
    }
    loadSettings();
  }, []);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'ME';

  async function handleSignOut() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await signOut();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }
  }

  async function handleResetOnboarding() {
    await resetOnboarding(); // clears AsyncStorage + sets onboardingDone: false in store
    router.replace('/onboarding');
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* ── Avatar & user info ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName ?? 'Meezan User'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* ── Zakat Settings ── */}
      <SectionHeader title="Zakat Settings" />
      <View style={styles.settingsGroup}>
        <SettingsItem
          icon="notifications"
          label="Hawl Reminders"
          iconBg={Colors.primaryMuted}
          iconColor={Colors.primary}
          right={
            <Switch
              value={hawlReminders}
              onValueChange={(v) => {
                setHawlReminders(v);
                AsyncStorage.setItem('profile_hawl_reminder', String(v));
              }}
              trackColor={{ true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          }
        />
        <SettingsItemDivider />
        <SettingsItem
          icon="calendar"
          label="Annual Zakat Reminder"
          iconBg={Colors.primaryMuted}
          iconColor={Colors.primary}
          right={
            <Switch
              value={zakatReminders}
              onValueChange={(v) => {
                setZakatReminders(v);
                AsyncStorage.setItem('profile_annual_reminder', String(v));
              }}
              trackColor={{ true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          }
        />
        <SettingsItemDivider />
        <SettingsItem
          icon="scale"
          label="Default Nisab Standard"
          iconBg="#F0EFE9"
          iconColor={Colors.accent}
          value="Silver (Conservative)"
          onPress={() => Alert.alert('Nisab Standard', 'Silver Nisab (612g) is the more conservative and commonly used standard.\n\nGold Nisab (87.48g) results in a higher threshold.')}
        />
      </View>

      {/* ── App ── */}
      <SectionHeader title="App" />
      <View style={styles.settingsGroup}>
        <SettingsItem
          icon="information-circle"
          label="About Meezan"
          iconBg={Colors.infoBg}
          iconColor={Colors.info}
          onPress={() =>
            Alert.alert(
              'Meezan v1.0.0',
              'A halal finance companion built on AAOIFI Islamic accounting standards.\n\nZakat calculations follow classical fiqh — 2.5% of net zakatable assets held for one lunar year (Hawl) above the Nisab threshold.',
              [{ text: 'Close' }]
            )
          }
        />
        <SettingsItemDivider />
        <SettingsItem
          icon="refresh-circle"
          label="Replay Onboarding"
          iconBg={Colors.warningBg}
          iconColor={Colors.warning}
          onPress={handleResetOnboarding}
        />
        <SettingsItemDivider />
        <SettingsItem
          icon="shield-checkmark"
          label="Privacy & Data"
          iconBg={Colors.successBg}
          iconColor={Colors.success}
          onPress={() =>
            Alert.alert(
              'Privacy',
              'All financial data is stored locally on this device and your private server. We do not share your data with third parties.'
            )
          }
        />
      </View>

      {/* ── Account ── */}
      <SectionHeader title="Account" />
      <View style={styles.settingsGroup}>
        <Pressable
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.7 }]}
          onPress={handleSignOut}
        >
          <View style={[styles.itemIcon, { backgroundColor: Colors.errorBg }]}>
            <Ionicons name="log-out" size={18} color={Colors.error} />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* ── Footer ── */}
      <Text style={styles.footerText}>Meezan v1.0.0 · Built with ❤️ for the Ummah</Text>
    </ScrollView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsItemDivider() {
  return <View style={styles.divider} />;
}

function SettingsItem({
  icon,
  label,
  iconBg,
  iconColor,
  value,
  right,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  iconBg: string;
  iconColor: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.settingsItem}>
      <View style={[styles.itemIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
      <View style={styles.itemRight}>
        {value ? <Text style={styles.itemValue}>{value}</Text> : null}
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} /> : null)}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable style={({ pressed }) => [pressed && { opacity: 0.7 }]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { gap: Spacing.md },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
  },

  profileCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: -Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    ...Shadow.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: Typography.sm, color: Colors.textSecondary },

  sectionHeader: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },

  settingsGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.base,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  itemValue: { fontSize: Typography.sm, color: Colors.textTertiary },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
    marginLeft: Spacing.base + 34 + Spacing.md,
  },

  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  signOutText: { fontSize: Typography.base, color: Colors.error, fontWeight: Typography.medium },

  footerText: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
});
