import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../theme';

interface Props {
  progress: number;       // 0..1
  secondsRemaining: number;
  size?: number;
}

export function RingTimer({ progress, secondsRemaining, size = 220 }: Props) {
  const isDark = useColorScheme() === 'dark';
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const trackColor = isDark ? Colors.darkSurface : 'rgba(239,159,39,0.15)';
  const textColor = isDark ? Colors.darkText : Colors.amberText;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, '0')}`
      : `${seconds}s`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.amber}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text style={[styles.countdown, { color: textColor }]}>{timeStr}</Text>
        <Text style={[styles.label, { color: Colors.amberText }]}>next chime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
  },
  countdown: {
    fontSize: Typography.countdownLarge,
    fontWeight: '300',
    letterSpacing: 1,
  },
  label: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
    marginTop: 4,
    opacity: 0.7,
  },
});
