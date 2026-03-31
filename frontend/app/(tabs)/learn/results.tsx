import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
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
import { CHAPTERS, HEARTS_PER_QUIZ } from '@/constants/learnData';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    chapterId: string;
    lessonId: string;
    correct: string;
    total: string;
    hearts: string;
    xp: string;
    stars: string;
  }>();

  const chapter = CHAPTERS.find((c) => c.id === params.chapterId);
  const lesson = chapter?.lessons.find((l) => l.id === params.lessonId);

  const correctCount = parseInt(params.correct ?? '0', 10);
  const totalQ = parseInt(params.total ?? '0', 10);
  const heartsLeft = parseInt(params.hearts ?? '0', 10);
  const xpEarned = parseInt(params.xp ?? '0', 10);
  const earnedStars = parseInt(params.stars ?? '0', 10);
  const isPerfect = correctCount === totalQ;
  const color = chapter?.color ?? Colors.primary;

  // Animations
  const trophyScale = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Trophy bounce in
    Animated.spring(trophyScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();

    // Stars appear sequentially
    starAnims.forEach((anim, i) => {
      setTimeout(() => {
        if (i < earnedStars) {
          Animated.spring(anim, {
            toValue: 1,
            friction: 5,
            tension: 180,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.timing(anim, {
            toValue: 0.65,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      }, 400 + i * 200);
    });

    // XP counter
    Animated.timing(xpAnim, {
      toValue: 1,
      duration: 800,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    // Content fade in
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 500,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!chapter || !lesson) return null;

  // Find the next lesson
  const lessonIdx = chapter.lessons.findIndex((l) => l.id === lesson.id);
  const chapterIdx = CHAPTERS.findIndex((c) => c.id === chapter.id);
  const hasNextInChapter = lessonIdx < chapter.lessons.length - 1;
  const hasNextChapter = chapterIdx < CHAPTERS.length - 1;
  const nextLesson = hasNextInChapter
    ? chapter.lessons[lessonIdx + 1]
    : hasNextChapter
    ? CHAPTERS[chapterIdx + 1].lessons[0]
    : null;
  const nextChapter = hasNextInChapter
    ? chapter
    : hasNextChapter
    ? CHAPTERS[chapterIdx + 1]
    : null;

  function handleContinue() {
    if (nextLesson && nextChapter) {
      router.replace({
        pathname: '/learn/lesson',
        params: { chapterId: nextChapter.id, lessonId: nextLesson.id },
      });
    } else {
      // All done — go back to path
      router.replace('/learn');
    }
  }

  function handleBackToPath() {
    router.replace('/learn');
  }

  function handleRetry() {
    router.replace({
      pathname: '/learn/quiz',
      params: { chapterId: chapter!.id, lessonId: lesson!.id },
    });
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy */}
        <Animated.View
          style={[
            styles.trophyCircle,
            { backgroundColor: color + '22', transform: [{ scale: trophyScale }] },
          ]}
        >
          <Ionicons
            name={isPerfect ? 'trophy' : 'checkmark-circle'}
            size={52}
            color={color}
          />
        </Animated.View>

        <Text style={styles.title}>
          {isPerfect ? 'Perfect!' : 'Lesson Complete!'}
        </Text>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={{
                transform: [{ scale: starAnims[i] }],
                opacity: starAnims[i].interpolate({
                  inputRange: [0, 0.65, 1],
                  outputRange: [0, 0.5, 1],
                }),
              }}
            >
              <Ionicons
                name={i < earnedStars ? 'star' : 'star-outline'}
                size={46}
                color={i < earnedStars ? Colors.accent : Colors.border}
              />
            </Animated.View>
          ))}
        </View>

        {/* Stats cards */}
        <Animated.View style={[styles.statsGrid, { opacity: contentFade }]}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>
              {correctCount}/{totalQ}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hearts</Text>
            <View style={styles.heartsDisplayRow}>
              {Array.from({ length: HEARTS_PER_QUIZ }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < heartsLeft ? 'heart' : 'heart-outline'}
                  size={18}
                  color={i < heartsLeft ? Colors.error : Colors.border}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* XP earned */}
        <Animated.View
          style={[
            styles.xpRow,
            {
              opacity: xpAnim,
              transform: [
                {
                  translateY: xpAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="star" size={22} color={Colors.accent} />
          <Text style={styles.xpText}>+{xpEarned} XP earned</Text>
        </Animated.View>

        {/* Encouragement */}
        <Animated.View style={{ opacity: contentFade }}>
          {!isPerfect && (
            <Text style={styles.encouragement}>
              {totalQ - correctCount === 1
                ? 'So close! One more for a perfect score.'
                : 'Keep going! Try again to earn more stars.'}
            </Text>
          )}
        </Animated.View>

        {/* Verse card */}
        <Animated.View
          style={[
            styles.verseCard,
            { borderLeftColor: color, opacity: contentFade },
          ]}
        >
          <Ionicons name="book" size={14} color={color} style={{ opacity: 0.7 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.verseText}>"{chapter.verse}"</Text>
            <Text style={styles.verseRef}>{chapter.verseRef}</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.btns, { opacity: contentFade }]}>
          {!isPerfect && (
            <Pressable
              style={[styles.btn, styles.btnOutline]}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text style={styles.btnOutlineText}>Try Again</Text>
            </Pressable>
          )}

          {nextLesson && (
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: color },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleContinue}
            >
              <Text style={styles.btnPrimaryText}>Next Lesson</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          )}

          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={handleBackToPath}
          >
            <Text style={styles.btnGhostText}>Back to Path</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: {
    flexGrow: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  trophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  starsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 36,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  heartsDisplayRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },

  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  xpText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.accent,
  },

  encouragement: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  verseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderLeftWidth: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    width: '100%',
  },
  verseText: {
    fontSize: Typography.sm,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  verseRef: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },

  btns: { width: '100%', gap: Spacing.md },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
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
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textTertiary,
  },
});
