import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme';

interface Props {
  total: number;
  current: number;  // 1-based, currently active interval
}

function PulsingDot({ isActive }: { isActive: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isActive) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isActive, opacity, scale]);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <View style={[styles.dot, isActive ? styles.dotActive : null]} />
    </Animated.View>
  );
}

export function ChimeDots({ total, current }: Props) {
  const dots = Array.from({ length: total }, (_, i) => {
    const index = i + 1; // 1-based
    const isDone = index < current;
    const isActive = index === current;
    return { index, isDone, isActive };
  });

  return (
    <View style={styles.row}>
      {dots.map(({ index, isDone, isActive }) => (
        <View key={index} style={styles.dotWrapper}>
          {isActive ? (
            <PulsingDot isActive />
          ) : (
            <View style={[styles.dot, isDone ? styles.dotDone : styles.dotUpcoming]} />
          )}
        </View>
      ))}
    </View>
  );
}

const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  dotWrapper: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotDone: {
    backgroundColor: Colors.amber,
  },
  dotActive: {
    backgroundColor: Colors.amber,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotUpcoming: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.amberBorder,
  },
});
