import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { formatGBP } from '@/lib/utils/currency';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}

// Wrap SVG Circle so we can animate strokeDashoffset via Animated
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function DonutChart({ segments, size = 180, strokeWidth = 28 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  // One Animated.Value per segment (drives strokeDasharray length 0 → actual)
  const anims = useRef(segments.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Stagger each segment in
    const animations = segments.map((seg, i) =>
      Animated.timing(anims[i], {
        toValue: (seg.value / total) * circumference,
        duration: 600,
        delay: i * 120,
        useNativeDriver: false, // SVG props can't use native driver
      })
    );
    Animated.parallel(animations).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Each segment starts where the previous one ended.
  // SVG circles start at 3 o'clock; rotate -90° so we start at 12 o'clock.
  let offset = 0;
  const segmentData = segments.map((seg, i) => {
    const arcLen = (seg.value / total) * circumference;
    const rotation = -90 + (offset / circumference) * 360;
    offset += arcLen;
    return { seg, arcLen, rotation, anim: anims[i] };
  });

  return (
    <View style={styles.wrapper}>
      {/* Donut */}
      <View style={styles.chartWrap}>
        <Svg width={size} height={size}>
          {/* Track ring */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={Colors.surfaceAlt}
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          <G>
            {segmentData.map(({ seg, arcLen, rotation, anim }, i) => (
              <AnimatedCircle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth - 2}
                strokeDasharray={anim.interpolate({
                  inputRange: [0, arcLen],
                  outputRange: [`0 ${circumference}`, `${arcLen} ${circumference}`],
                })}
                strokeDashoffset={0}
                strokeLinecap="butt"
                transform={`rotate(${rotation} ${cx} ${cy})`}
              />
            ))}
          </G>
        </Svg>

        {/* Center label */}
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerAmount}>{formatGBP(total)}</Text>
          <Text style={styles.centerLabel}>Total Assets</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{seg.label}</Text>
              <Text style={styles.legendPct}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  chartWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAmount: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  centerLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  legend: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  legendPct: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
});
