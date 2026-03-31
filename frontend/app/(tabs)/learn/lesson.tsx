import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { CHAPTERS, HEARTS_PER_QUIZ } from '@/constants/learnData';

export default function LessonIntroScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { chapterId, lessonId } = useLocalSearchParams<{
    chapterId: string;
    lessonId: string;
  }>();

  const chapter = CHAPTERS.find((c) => c.id === chapterId);
  const lesson = chapter?.lessons.find((l) => l.id === lessonId);
  const [bestStars, setBestStars] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!chapter || !lesson) return;
      AsyncStorage.multiGet([
        `learn_${chapter.id}_${lesson.id}_stars`,
        `learn_${chapter.id}_${lesson.id}_best`,
      ]).then(([[, starsStr], [, bestStr]]) => {
        setBestStars(parseInt(starsStr ?? '0', 10) || 0);
        setBestScore(parseInt(bestStr ?? '0', 10) || 0);
      });
    }, [chapterId, lessonId])
  );

  if (!chapter || !lesson) return null;

  const color = chapter.color;
  const totalQuestions = lesson.questions.length;
  const hasAttempted = bestStars > 0;

  function handleStart() {
    router.push({
      pathname: '/learn/quiz',
      params: { chapterId: chapter!.id, lessonId: lesson!.id },
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarUnit}>Unit {chapter.unitNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson icon */}
        <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
          <Ionicons
            name={lesson.isBonus ? 'trophy' : (lesson.icon as any)}
            size={48}
            color={color}
          />
        </View>

        {/* Title */}
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={[styles.chapterLabel, { color }]}>
          {chapter.title}
          {lesson.isBonus ? ' — Bonus' : ''}
        </Text>

        {/* Best score if attempted */}
        {hasAttempted && (
          <View style={styles.bestScoreRow}>
            <View style={styles.bestStarsRow}>
              {[1, 2, 3].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= bestStars ? 'star' : 'star-outline'}
                  size={20}
                  color={s <= bestStars ? Colors.accent : Colors.border}
                />
              ))}
            </View>
            <Text style={styles.bestScoreText}>
              Best: {bestScore}/{totalQuestions}
            </Text>
          </View>
        )}

        {/* What you'll learn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you'll learn</Text>
          {lesson.topics.map((topic, i) => (
            <View key={i} style={styles.topicRow}>
              <View style={[styles.topicDot, { backgroundColor: color }]} />
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>

        {/* Lesson info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="help-circle-outline" size={22} color={color} />
            <Text style={styles.infoValue}>{totalQuestions}</Text>
            <Text style={styles.infoLabel}>Questions</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="star-outline" size={22} color={Colors.accent} />
            <Text style={styles.infoValue}>{lesson.xpReward}</Text>
            <Text style={styles.infoLabel}>XP to earn</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="heart" size={22} color={Colors.error} />
            <Text style={styles.infoValue}>{HEARTS_PER_QUIZ}</Text>
            <Text style={styles.infoLabel}>Hearts</Text>
          </View>
        </View>

        {/* Hearts explanation */}
        <View style={styles.heartsExplainer}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textTertiary} />
          <Text style={styles.heartsExplainerText}>
            You start with {HEARTS_PER_QUIZ} hearts. Each wrong answer costs one heart. Lose all hearts and the lesson fails.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom START button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: color },
            pressed && { opacity: 0.88 },
          ]}
          onPress={handleStart}
        >
          <Text style={styles.startBtnText}>
            {hasAttempted ? 'Try Again' : 'Start Lesson'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topBarUnit: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },

  content: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lessonTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  chapterLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    marginTop: -8,
  },

  bestScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  bestStarsRow: { flexDirection: 'row', gap: 3 },
  bestScoreText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },

  section: {
    width: '100%',
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topicText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },

  infoGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  infoValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  infoLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },

  heartsExplainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
  },
  heartsExplainerText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    flex: 1,
    lineHeight: 18,
  },

  bottomBar: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.md,
    ...Shadow.sm,
  },
  startBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: '#fff',
  },
});
