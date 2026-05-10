import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Stage } from '../types';
import { StepperControl } from './StepperControl';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  stage: Stage;
  index: number;
  showDelete: boolean;
  onUpdate: (patch: Partial<Stage>) => void;
  onDelete: () => void;
}

export function StageRow({ stage, index, showDelete, onUpdate, onDelete }: Props) {
  const isDark = useColorScheme() === 'dark';
  const surface = isDark ? Colors.darkSurface : Colors.lightSurface;
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;
  const isMinutes = stage.unit === 'minutes';

  const handleUnitToggle = (unit: 'minutes' | 'seconds') => {
    if (unit === stage.unit) return;
    onUpdate({ unit, interval: unit === 'minutes' ? 5 : 30 });
  };

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.stageLabel, { color: textSub }]}>Stage {index + 1}</Text>

        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[styles.unitBtn, isMinutes ? styles.unitBtnActive : { borderColor: Colors.amberBorder }]}
            onPress={() => handleUnitToggle('minutes')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitBtnText, { color: isMinutes ? Colors.white : textSub }]}>
              min
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, !isMinutes ? styles.unitBtnActive : { borderColor: Colors.amberBorder }]}
            onPress={() => handleUnitToggle('seconds')}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitBtnText, { color: !isMinutes ? Colors.white : textSub }]}>
              sec
            </Text>
          </TouchableOpacity>
        </View>

        {showDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Text style={[styles.deleteBtn, { color: Colors.amberBorder }]}>✕</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.deletePlaceholder} />
        )}
      </View>

      <View style={styles.steppers}>
        <StepperControl
          label="Interval"
          unit={isMinutes ? 'min' : 'sec'}
          value={stage.interval}
          min={isMinutes ? 1 : 10}
          max={isMinutes ? 10 : 60}
          onChange={(v) => onUpdate({ interval: v })}
        />
        <View style={[styles.divider, { backgroundColor: Colors.amberBorder }]} />
        <StepperControl
          label="Chimes"
          unit="×"
          value={stage.chimes}
          min={1}
          max={20}
          onChange={(v) => onUpdate({ chimes: v })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  stageLabel: {
    fontSize: Typography.small,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
    minWidth: 58,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  unitBtnActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
  },
  unitBtnText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    minWidth: 20,
    textAlign: 'right',
  },
  deletePlaceholder: {
    minWidth: 20,
  },
  steppers: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  divider: {
    width: 1,
    height: 48,
    marginHorizontal: Spacing.md,
    opacity: 0.4,
  },
});
