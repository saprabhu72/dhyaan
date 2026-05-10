import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Stage } from '../types';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  stages: Stage[];
  startIndex: number; // 1-based label of the first entry
}

function formatInterval(stage: Stage): string {
  return stage.unit === 'minutes' ? `${stage.interval} min` : `${stage.interval} sec`;
}

export function UpcomingStages({ stages, startIndex }: Props) {
  const isDark = useColorScheme() === 'dark';
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;

  if (stages.length === 0) return null;

  return (
    <View style={styles.container}>
      {stages.map((s, i) => (
        <Text key={s.id} style={[styles.text, { color: textSub }]}>
          Stage {startIndex + i} · {formatInterval(s)} × {s.chimes}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
    opacity: 0.45,
    marginTop: Spacing.xs,
  },
  text: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
  },
});
