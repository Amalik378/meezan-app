import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface AnimatedProgressBarProps {
  /** Progress value from 0 to 1 */
  pct: number;
  height?: number;
  color?: string;
  /** Delay in ms before animation starts */
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedProgressBar({
  pct,
  height = 8,
  color = Colors.primary,
  delay = 0,
  style,
}: AnimatedProgressBarProps) {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const animWidth = useSharedValue(0);

  useEffect(() => {
    if (trackWidth > 0) {
      animWidth.value = withDelay(delay, withTiming(pct * trackWidth, { duration: 900 }));
    }
  }, [pct, trackWidth]);

  const animStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
  }));

  const radius = height / 2;

  return (
    <View
      style={[
        {
          height,
          borderRadius: radius,
          backgroundColor: Colors.surfaceAlt,
          overflow: 'hidden',
        },
        style,
      ]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            borderRadius: radius,
            backgroundColor: color,
          },
          animStyle,
        ]}
      />
    </View>
  );
}
