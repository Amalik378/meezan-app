import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthStore } from '@/lib/stores/authStore';

const SLIDES = [
  {
    id: '1',
    arabicTitle: 'ميزان',
    title: 'Welcome to Meezan',
    subtitle: 'Your complete Islamic finance companion — built on AAOIFI standards.',
    icon: 'scale' as const,
    bullets: [
      'Calculate Zakat with precision',
      'Screen stocks for Shariah compliance',
      'Learn Islamic finance fundamentals',
    ],
    accent: Colors.primary,
  },
  {
    id: '2',
    arabicTitle: 'الزكاة',
    title: 'Intelligent Zakat',
    subtitle: 'The app tracks your Hawl cycle and Nisab threshold automatically.',
    icon: 'calculator' as const,
    bullets: [
      '2.5% of net zakatable assets',
      'Gold & silver Nisab standards',
      'Hawl (lunar year) progress tracking',
    ],
    accent: Colors.accent,
  },
  {
    id: '3',
    arabicTitle: 'حلال',
    title: 'Shariah Screener',
    subtitle: 'AI-powered stock analysis using AAOIFI financial ratios.',
    icon: 'bar-chart' as const,
    bullets: [
      'Business activity screening',
      'Debt & interest income ratios',
      'XGBoost ML compliance scoring',
    ],
    accent: Colors.info,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  async function handleFinish() {
    await completeOnboarding();
  }

  function goToSlide(index: number) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setActiveIndex(index);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      goToSlide(activeIndex + 1);
    } else {
      handleFinish();
    }
  }

  const slide = SLIDES[activeIndex];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.xl }]}>
      {/* Slide content — fades between slides */}
      <Animated.View style={[styles.slideWrap, { opacity: fadeAnim }]}>
        <View style={[styles.slide, { paddingTop: insets.top + Spacing.xxl }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${slide.accent}18` }]}>
            <Ionicons name={slide.icon} size={52} color={slide.accent} />
          </View>
          <Text style={[styles.arabicTitle, { color: slide.accent }]}>{slide.arabicTitle}</Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          <View style={styles.bullets}>
            {slide.bullets.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: slide.accent }]} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Dots + Navigation */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goToSlide(i)}>
              <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.navRow}>
          {activeIndex < SLIDES.length - 1 ? (
            <>
              <Pressable style={styles.skipBtn} onPress={handleFinish}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
              <Pressable style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
              </Pressable>
            </>
          ) : (
            <Pressable style={[styles.nextBtn, styles.getStartedBtn]} onPress={handleFinish}>
              <Text style={styles.nextBtnText}>Get Started</Text>
              <Ionicons name="checkmark" size={18} color={Colors.textInverse} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  slideWrap: { flex: 1 },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  arabicTitle: {
    fontSize: 40,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  slideTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  bullets: { gap: Spacing.md, alignSelf: 'stretch' },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  bulletText: { fontSize: Typography.base, color: Colors.textPrimary, flex: 1 },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.base,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base },
  skipText: { fontSize: Typography.base, color: Colors.textTertiary },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
  },
  getStartedBtn: { flex: 1, justifyContent: 'center' },
  nextBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textInverse },
});
