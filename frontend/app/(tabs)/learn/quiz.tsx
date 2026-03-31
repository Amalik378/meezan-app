import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  CHAPTERS,
  HEARTS_PER_QUIZ,
  XP_PER_CORRECT,
  PERFECT_BONUS,
  getStarsForLesson,
} from '@/constants/learnData';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function QuizScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chapterId, lessonId } = useLocalSearchParams<{
    chapterId: string;
    lessonId: string;
  }>();

  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  const lesson = chapter?.lessons.find((l) => l.id === lessonId);

  // ── State ──
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [hearts, setHearts] = useState(HEARTS_PER_QUIZ);
  const [streak, setStreak] = useState(0);
  const [failed, setFailed] = useState(false);

  // ── Animations ──
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnims = useRef(
    Array.from({ length: HEARTS_PER_QUIZ }, () => new Animated.Value(1))
  ).current;

  if (!chapter || !lesson) return null;

  const totalQ = lesson.questions.length;
  const question = lesson.questions[currentQ];
  const color = chapter.color;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentQ + 1) / totalQ,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentQ]);

  // ── Handlers ──

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);

    if (idx === question.correct) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
      triggerShake();
      loseHeart();
    }
  }

  function loseHeart() {
    const newHearts = hearts - 1;
    setHearts(newHearts);

    // Animate the heart that's being lost
    const heartIdx = newHearts; // 0-indexed: if 2 hearts left, animate index 2
    if (heartIdx >= 0 && heartIdx < heartScaleAnims.length) {
      Animated.sequence([
        Animated.timing(heartScaleAnims[heartIdx], {
          toValue: 1.4,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartScaleAnims[heartIdx], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (newHearts <= 0) {
      // Delay to show the wrong answer feedback before failing
      setTimeout(() => setFailed(true), 1200);
    }
  }

  function triggerShake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function handleNext() {
    if (failed) return;

    const isCorrect = selected === question.correct;
    const newCorrect = correctCount + (isCorrect ? 1 : 0);

    if (currentQ + 1 < totalQ) {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -18, duration: 140, useNativeDriver: true }),
      ]).start(() => {
        setCorrectCount(newCorrect);
        setCurrentQ((q) => q + 1);
        setSelected(null);
        slideAnim.setValue(18);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start();
      });
    } else {
      // Quiz complete — navigate to results
      const xp = newCorrect * XP_PER_CORRECT + (newCorrect === totalQ ? PERFECT_BONUS : 0);
      const earnedStars = getStarsForLesson(hearts, HEARTS_PER_QUIZ);
      saveProgress(newCorrect, xp, earnedStars);
      updateDailyStreak();
      router.replace({
        pathname: '/learn/results',
        params: {
          chapterId: chapter!.id,
          lessonId: lesson!.id,
          correct: String(newCorrect),
          total: String(totalQ),
          hearts: String(hearts),
          xp: String(xp),
          stars: String(earnedStars),
        },
      });
    }
  }

  async function saveProgress(score: number, xp: number, earnedStars: number) {
    try {
      const [[, xpStr], [, bestStr], [, prevStarsStr]] = await AsyncStorage.multiGet([
        'learn_total_xp',
        `learn_${chapter!.id}_${lesson!.id}_best`,
        `learn_${chapter!.id}_${lesson!.id}_stars`,
      ]);
      const currentXP = parseInt(xpStr ?? '0', 10) || 0;
      const currentBest = parseInt(bestStr ?? '0', 10) || 0;
      const prevStars = parseInt(prevStarsStr ?? '0', 10) || 0;
      const newBest = Math.max(score, currentBest);
      const newStars = Math.max(earnedStars, prevStars);
      const xpToAdd = score > currentBest ? xp : 0;

      await AsyncStorage.multiSet([
        [`learn_${chapter!.id}_${lesson!.id}_best`, String(newBest)],
        [`learn_${chapter!.id}_${lesson!.id}_stars`, String(newStars)],
        ['learn_total_xp', String(currentXP + xpToAdd)],
      ]);
    } catch (_) {}
  }

  async function updateDailyStreak() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [[, lastDate], [, streakStr]] = await AsyncStorage.multiGet([
        'learn_last_date',
        'learn_daily_streak',
      ]);
      if (lastDate === today) return;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const current = parseInt(streakStr ?? '0', 10) || 0;
      const newStreak = lastDate === yesterday ? current + 1 : 1;
      await AsyncStorage.multiSet([
        ['learn_last_date', today],
        ['learn_daily_streak', String(newStreak)],
      ]);
    } catch (_) {}
  }

  // ── Failed screen (out of hearts) ──

  if (failed) {
    return (
      <View
        style={[
          styles.container,
          styles.failedContainer,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.failedContent}>
          <View style={styles.failedIconCircle}>
            <Ionicons name="heart-dislike" size={52} color={Colors.error} />
          </View>
          <Text style={styles.failedTitle}>Out of Hearts!</Text>
          <Text style={styles.failedSubtitle}>
            You got {correctCount}/{totalQ} correct. Review the material and try again.
          </Text>

          <View style={styles.failedBtns}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                // Reset and retry
                setCurrentQ(0);
                setSelected(null);
                setCorrectCount(0);
                setHearts(HEARTS_PER_QUIZ);
                setStreak(0);
                setFailed(false);
                fadeAnim.setValue(1);
                slideAnim.setValue(0);
                shakeAnim.setValue(0);
                heartScaleAnims.forEach((a) => a.setValue(1));
                progressAnim.setValue(0);
                Animated.timing(progressAnim, {
                  toValue: 1 / totalQ,
                  duration: 400,
                  useNativeDriver: false,
                }).start();
              }}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Try Again</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnOutline]}
              onPress={() => router.back()}
            >
              <Text style={styles.btnOutlineText}>Back to Lessons</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Quiz UI ──

  const answeredCorrectly = selected !== null && selected === question.correct;
  const answeredWrong = selected !== null && selected !== question.correct;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.quizHeader}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.heartsRow}>
          {Array.from({ length: HEARTS_PER_QUIZ }).map((_, i) => (
            <Animated.View
              key={i}
              style={{ transform: [{ scale: heartScaleAnims[i] }] }}
            >
              <Ionicons
                name={i < hearts ? 'heart' : 'heart-outline'}
                size={22}
                color={i < hearts ? Colors.error : Colors.border}
              />
            </Animated.View>
          ))}
        </View>

        <View style={styles.quizHeaderRight}>
          {streak >= 2 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          )}
          <Text style={styles.questionCounter}>
            {currentQ + 1}/{totalQ}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: color,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.quizContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Question card */}
        <Animated.View
          style={[
            styles.questionCard,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <Text style={[styles.questionNum, { color }]}>
            Question {currentQ + 1}
          </Text>
          <Text style={styles.questionText}>{question.q}</Text>
          {question.type === 'tf' && (
            <View style={[styles.typeBadge, { backgroundColor: color + '15' }]}>
              <Text style={[styles.typeBadgeText, { color }]}>True or False</Text>
            </View>
          )}
        </Animated.View>

        {/* Options */}
        <Animated.View
          style={{ gap: Spacing.sm, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}
        >
          {question.options.map((option, idx) => {
            const isCorrectOption = idx === question.correct;
            const isSelectedWrong = idx === selected && !isCorrectOption;

            let optionBg = Colors.surface;
            let optionBorder = Colors.border;
            let textColor = Colors.textPrimary;
            let labelBg = color + '18';
            let labelBorder = color + '40';
            let labelColor = color;
            let trailingIcon: keyof typeof Ionicons.glyphMap = 'radio-button-off';
            let trailingColor = Colors.border;

            if (selected !== null) {
              if (isCorrectOption) {
                optionBg = '#D4EDDA';
                optionBorder = Colors.success;
                textColor = '#155724';
                labelBg = Colors.success + '30';
                labelBorder = Colors.success;
                labelColor = Colors.success;
                trailingIcon = 'checkmark-circle';
                trailingColor = Colors.success;
              } else if (isSelectedWrong) {
                optionBg = '#FDECEA';
                optionBorder = Colors.error;
                textColor = '#7D1A1A';
                labelBg = Colors.error + '25';
                labelBorder = Colors.error;
                labelColor = Colors.error;
                trailingIcon = 'close-circle';
                trailingColor = Colors.error;
              } else {
                optionBg = Colors.surfaceAlt;
                optionBorder = Colors.border;
                textColor = Colors.textTertiary;
                labelBg = Colors.surfaceAlt;
                labelBorder = Colors.border;
                labelColor = Colors.textTertiary;
              }
            }

            const label = question.type === 'tf'
              ? (idx === 0 ? 'T' : 'F')
              : OPTION_LABELS[idx];

            return (
              <Animated.View
                key={idx}
                style={
                  isSelectedWrong
                    ? { transform: [{ translateX: shakeAnim }] }
                    : undefined
                }
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: optionBg, borderColor: optionBorder },
                    selected === null && pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleSelect(idx)}
                  disabled={selected !== null}
                >
                  <View
                    style={[
                      styles.labelCircle,
                      { backgroundColor: labelBg, borderColor: labelBorder },
                    ]}
                  >
                    <Text style={[styles.labelText, { color: labelColor }]}>
                      {label}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
                  {selected !== null && (
                    <Ionicons name={trailingIcon} size={20} color={trailingColor} />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Feedback banner */}
        {selected !== null && !failed && (
          <View
            style={[
              styles.feedback,
              answeredCorrectly ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            <Ionicons
              name={answeredCorrectly ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={answeredCorrectly ? Colors.success : Colors.error}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1, gap: 5 }}>
              <Text
                style={[
                  styles.feedbackHeadline,
                  answeredCorrectly
                    ? styles.feedbackHeadlineCorrect
                    : styles.feedbackHeadlineWrong,
                ]}
              >
                {answeredCorrectly
                  ? `Correct! +${XP_PER_CORRECT} XP`
                  : `Incorrect`}
              </Text>
              {question.explanation ? (
                <Text
                  style={
                    answeredCorrectly
                      ? styles.explanationTextCorrect
                      : styles.explanationText
                  }
                >
                  {question.explanation}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Next button */}
      {selected !== null && !failed && (
        <View style={[styles.nextContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnPrimary,
              styles.nextBtn,
              pressed && { opacity: 0.88 },
            ]}
            onPress={handleNext}
          >
            <Text style={styles.btnPrimaryText}>
              {currentQ + 1 < totalQ ? 'Next Question' : 'See Results'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  closeBtn: { padding: 4 },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quizHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  questionCounter: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: '#D4780A',
  },

  // ── Progress ──
  progressTrack: { height: 5, backgroundColor: Colors.surfaceAlt },
  progressFill: { height: '100%' },

  // ── Quiz content ──
  quizContent: { padding: Spacing.base, gap: Spacing.lg },

  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  questionNum: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  questionText: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
  },
  typeBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },

  // ── Options ──
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  optionPressed: { backgroundColor: Colors.surfaceAlt },
  labelCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  labelText: { fontSize: Typography.sm, fontWeight: Typography.bold },
  optionText: { flex: 1, fontSize: Typography.base, lineHeight: 22 },

  // ── Feedback ──
  feedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  feedbackCorrect: { backgroundColor: '#D4EDDA', borderColor: Colors.success },
  feedbackWrong: { backgroundColor: '#FDECEA', borderColor: Colors.error },
  feedbackHeadline: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    lineHeight: 20,
  },
  feedbackHeadlineCorrect: { color: '#155724' },
  feedbackHeadlineWrong: { color: '#7D1A1A' },
  explanationText: {
    fontSize: Typography.xs,
    color: '#5A3030',
    lineHeight: 18,
  },
  explanationTextCorrect: {
    fontSize: Typography.xs,
    color: '#1A4A1A',
    lineHeight: 18,
  },

  // ── Next button ──
  nextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  nextBtn: { width: '100%' },

  // ── Failed screen ──
  failedContainer: { justifyContent: 'center' },
  failedContent: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  failedIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedTitle: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.error,
  },
  failedSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  failedBtns: { width: '100%', gap: Spacing.md, marginTop: Spacing.lg },

  // ── Shared buttons ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: '#fff',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  btnOutlineText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
});
