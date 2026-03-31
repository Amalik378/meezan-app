import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import {
  CHAPTERS,
  LEVELS,
  getLevel,
  isLessonUnlocked,
  isChapterComplete,
} from '@/constants/learnData';

// ─── Node size constants ──────────────────────────────────────────────────────

const NODE_SIZE = 64;
const BONUS_NODE_SIZE = 72;
const PATH_WIDTH = 280;
const ZIGZAG_OFFSET = 80;

export default function LearnPathScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [stars, setStars] = useState<Record<string, number>>({});
  const [totalXP, setTotalXP] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for current lesson node
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  async function loadProgress() {
    try {
      const keys: string[] = [];
      for (const ch of CHAPTERS) {
        for (const l of ch.lessons) {
          keys.push(`learn_${ch.id}_${l.id}_stars`);
        }
      }
      keys.push('learn_total_xp', 'learn_daily_streak');

      const pairs = await AsyncStorage.multiGet(keys);
      const newStars: Record<string, number> = {};
      let xp = 0;
      let streak = 0;

      for (const [key, value] of pairs) {
        if (key === 'learn_total_xp') {
          xp = parseInt(value ?? '0', 10) || 0;
        } else if (key === 'learn_daily_streak') {
          streak = parseInt(value ?? '0', 10) || 0;
        } else if (key.startsWith('learn_') && key.endsWith('_stars')) {
          const middle = key.slice(6, -6); // remove "learn_" and "_stars"
          newStars[middle] = parseInt(value ?? '0', 10) || 0;
        }
      }

      setStars(newStars);
      setTotalXP(xp);
      setDailyStreak(streak);
    } catch (_) {}
  }

  // Find the first locked lesson to auto-scroll to
  let currentChapterIdx = 0;
  let currentLessonIdx = 0;
  let foundCurrent = false;
  for (let ci = 0; ci < CHAPTERS.length && !foundCurrent; ci++) {
    for (let li = 0; li < CHAPTERS[ci].lessons.length; li++) {
      const key = `${CHAPTERS[ci].id}_${CHAPTERS[ci].lessons[li].id}`;
      if ((stars[key] ?? 0) === 0) {
        currentChapterIdx = ci;
        currentLessonIdx = li;
        foundCurrent = true;
        break;
      }
    }
  }

  const currentLevel = getLevel(totalXP);
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const levelProgress = nextLevel
    ? (totalXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)
    : 1;

  const completedLessons = Object.values(stars).filter((s) => s > 0).length;
  const totalLessons = CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);

  function handleLessonPress(chapterIdx: number, lessonIdx: number) {
    const chapter = CHAPTERS[chapterIdx];
    const lesson = chapter.lessons[lessonIdx];
    if (!isLessonUnlocked(chapterIdx, lessonIdx, stars)) return;
    router.push({
      pathname: '/learn/lesson',
      params: { chapterId: chapter.id, lessonId: lesson.id },
    });
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Learn</Text>
            <Text style={styles.headerSubtitle}>Islamic Finance</Text>
          </View>
          {dailyStreak > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{dailyStreak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>
          )}
        </View>

        {/* Level row */}
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv.{currentLevel.level}</Text>
          </View>
          <Text style={styles.levelTitle}>{currentLevel.title}</Text>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color={Colors.accent} />
            <Text style={styles.xpText}>{totalXP} XP</Text>
          </View>
        </View>

        {/* Level progress bar */}
        <View style={styles.levelProgressTrack}>
          <View
            style={[
              styles.levelProgressFill,
              { width: `${Math.round(levelProgress * 100)}%` as any },
            ]}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {completedLessons}/{totalLessons} lessons
            </Text>
          </View>
        </View>
      </View>

      {/* ── Path ScrollView ── */}
      <ScrollView
        contentContainerStyle={[styles.pathContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {CHAPTERS.map((chapter, chapterIdx) => {
          const chapterDone = isChapterComplete(chapterIdx, stars);

          return (
            <View key={chapter.id}>
              {/* ── Chapter Banner ── */}
              <View style={[styles.chapterBanner, { backgroundColor: chapter.color }]}>
                <View style={styles.chapterBannerLeft}>
                  <Text style={styles.chapterUnit}>UNIT {chapter.unitNumber}</Text>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Text style={styles.chapterSubtitle}>{chapter.subtitle}</Text>
                </View>
                <View style={styles.chapterIconWrap}>
                  <Ionicons name={chapter.icon as any} size={28} color="rgba(255,255,255,0.9)" />
                </View>
                {chapterDone && (
                  <View style={styles.chapterDoneBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  </View>
                )}
              </View>

              {/* ── Lesson Nodes ── */}
              <View style={styles.nodesContainer}>
                {chapter.lessons.map((lesson, lessonIdx) => {
                  const key = `${chapter.id}_${lesson.id}`;
                  const lessonStars = stars[key] ?? 0;
                  const unlocked = isLessonUnlocked(chapterIdx, lessonIdx, stars);
                  const completed = lessonStars > 0;
                  const isCurrent =
                    chapterIdx === currentChapterIdx &&
                    lessonIdx === currentLessonIdx &&
                    unlocked &&
                    !completed;
                  const isBonus = lesson.isBonus;
                  const nodeSize = isBonus ? BONUS_NODE_SIZE : NODE_SIZE;

                  // Zigzag: alternate left/right
                  const zigzagX =
                    lessonIdx % 2 === 0 ? -ZIGZAG_OFFSET : ZIGZAG_OFFSET;

                  return (
                    <View
                      key={lesson.id}
                      style={[
                        styles.nodeRow,
                        { transform: [{ translateX: zigzagX }] },
                      ]}
                    >
                      {/* Connector line to previous (skip first) */}
                      {lessonIdx > 0 && (
                        <View
                          style={[
                            styles.connector,
                            {
                              backgroundColor: completed
                                ? chapter.color
                                : Colors.border,
                              left: nodeSize / 2 - 2,
                              top: -20,
                              height: 20,
                            },
                          ]}
                        />
                      )}

                      {/* The node */}
                      <Pressable
                        onPress={() => handleLessonPress(chapterIdx, lessonIdx)}
                        disabled={!unlocked}
                        style={({ pressed }) => [pressed && unlocked && { opacity: 0.8 }]}
                      >
                        <Animated.View
                          style={[
                            styles.node,
                            {
                              width: nodeSize,
                              height: nodeSize,
                              borderRadius: nodeSize / 2,
                            },
                            // State-based styling
                            !unlocked && styles.nodeLocked,
                            unlocked && !completed && {
                              backgroundColor: chapter.color + '20',
                              borderColor: chapter.color,
                              borderWidth: 3,
                            },
                            completed && {
                              backgroundColor: chapter.color,
                              borderColor: chapter.color,
                              borderWidth: 0,
                            },
                            isCurrent && {
                              transform: [{ scale: pulseAnim }],
                              ...Shadow.md,
                              shadowColor: chapter.color,
                            },
                            isBonus && completed && {
                              backgroundColor: Colors.accent,
                            },
                          ]}
                        >
                          {!unlocked ? (
                            <Ionicons name="lock-closed" size={22} color={Colors.textTertiary} />
                          ) : completed ? (
                            isBonus ? (
                              <Ionicons name="trophy" size={26} color="#fff" />
                            ) : (
                              <Ionicons name="checkmark" size={28} color="#fff" />
                            )
                          ) : isBonus ? (
                            <Ionicons name="trophy-outline" size={26} color={chapter.color} />
                          ) : (
                            <Ionicons name={lesson.icon as any} size={24} color={chapter.color} />
                          )}
                        </Animated.View>

                        {/* Stars row under completed nodes */}
                        {completed && (
                          <View style={styles.nodeStarsRow}>
                            {[1, 2, 3].map((s) => (
                              <Ionicons
                                key={s}
                                name={s <= lessonStars ? 'star' : 'star-outline'}
                                size={14}
                                color={s <= lessonStars ? Colors.accent : Colors.border}
                              />
                            ))}
                          </View>
                        )}
                      </Pressable>

                      {/* Lesson title */}
                      <Text
                        style={[
                          styles.nodeLabel,
                          !unlocked && { color: Colors.textTertiary },
                          isCurrent && { color: chapter.color, fontWeight: Typography.bold },
                        ]}
                        numberOfLines={2}
                      >
                        {lesson.title}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Chapter completion verse */}
              {chapterDone && (
                <View style={[styles.chapterVerseCard, { borderLeftColor: chapter.color }]}>
                  <Text style={styles.chapterVerseText}>"{chapter.verse}"</Text>
                  <Text style={styles.chapterVerseRef}>{chapter.verseRef}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
  },
  headerSubtitle: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  streakEmoji: { fontSize: 20 },
  streakCount: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
    lineHeight: 22,
  },
  streakLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 13,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  levelTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
    flex: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  xpText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.accent,
  },
  levelProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  progressPillText: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Path ──
  pathContainer: {
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },

  // ── Chapter Banner ──
  chapterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    width: PATH_WIDTH,
    ...Shadow.sm,
  },
  chapterBannerLeft: { flex: 1, gap: 2 },
  chapterUnit: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chapterTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  chapterSubtitle: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  chapterIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterDoneBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },

  // ── Nodes ──
  nodesContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  nodeRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  connector: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  nodeLocked: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 2,
    opacity: 0.5,
  },
  nodeStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    justifyContent: 'center',
  },
  nodeLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 100,
    marginTop: 2,
  },

  // ── Chapter verse card ──
  chapterVerseCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    width: PATH_WIDTH,
    gap: 4,
  },
  chapterVerseText: {
    fontSize: Typography.sm,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  chapterVerseRef: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
});
