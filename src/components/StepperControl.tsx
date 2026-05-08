import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function StepperControl({ label, unit, value, min, max, onChange }: Props) {
  const isDark = useColorScheme() === 'dark';
  const textColor = isDark ? Colors.darkText : Colors.amberText;
  const subtextColor = isDark ? Colors.darkSubtext : Colors.lightSubtext;
  const borderColor = isDark ? Colors.amberBorder : Colors.amberBorder;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: subtextColor }]}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, { borderColor }]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          activeOpacity={0.6}
        >
          <Text style={[styles.buttonText, { color: value <= min ? borderColor : Colors.amber }]}>
            −
          </Text>
        </TouchableOpacity>

        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: textColor }]}>{value}</Text>
          <Text style={[styles.unit, { color: subtextColor }]}>{unit}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { borderColor }]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          activeOpacity={0.6}
        >
          <Text style={[styles.buttonText, { color: value >= max ? borderColor : Colors.amber }]}>
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: Typography.small,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    fontFamily: 'System',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.stepper,
    lineHeight: Typography.stepper,
    fontWeight: '300',
    includeFontPadding: false,
  },
  valueContainer: {
    alignItems: 'center',
    minWidth: 56,
  },
  value: {
    fontSize: Typography.stepperValue,
    fontWeight: '500',
    lineHeight: Typography.stepperValue + 4,
  },
  unit: {
    fontSize: Typography.small,
    marginTop: 2,
  },
});
