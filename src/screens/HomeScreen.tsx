import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useColorScheme,
  StatusBar,
  Platform,
} from 'react-native';
import { StepperControl } from '../components/StepperControl';
import { RingTimer } from '../components/RingTimer';
import { ChimeDots } from '../components/ChimeDots';
import { useMeditationTimer } from '../hooks/useMeditationTimer';
import { useSettings } from '../hooks/useSettings';
import { Colors, Typography, Spacing, Radius } from '../theme';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? Colors.darkBg : Colors.lightBg;
  const surface = isDark ? Colors.darkSurface : Colors.lightSurface;
  const textPrimary = isDark ? Colors.darkText : Colors.amberText;
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;

  const { settings, updateSettings, saved } = useSettings();
  const { intervalMinutes, chimeCount } = settings;
  const totalMinutes = intervalMinutes * chimeCount;

  const [timerState, timerControls] = useMeditationTimer(intervalMinutes, chimeCount);
  const { phase, currentInterval, intervalProgress, secondsToNextChime, totalChimes } = timerState;
  const { begin, pause, resume, reset } = timerControls;

  // Saved confirmation fade
  const savedOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (saved) {
      Animated.sequence([
        Animated.timing(savedOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(savedOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [saved, savedOpacity]);

  const isRunning = phase === 'running';
  const isActive = phase === 'running' || phase === 'paused';
  const isComplete = phase === 'complete';
  const isIdle = phase === 'idle';

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerSmall, { color: textSub }]}>ध्यान</Text>
        <Text style={[styles.headerLarge, { color: textPrimary }]}>Dhyaan</Text>
      </View>

      {/* Main content area */}
      <View style={styles.content}>

        {/* IDLE STATE */}
        {isIdle && (
          <View style={styles.idleContainer}>
            <Text style={[styles.omSymbol, { color: Colors.amber }]}>ॐ</Text>

            <View style={[styles.stepperRow, { backgroundColor: surface }]}>
              <StepperControl
                label="Interval"
                unit="min"
                value={intervalMinutes}
                min={1}
                max={60}
                onChange={(v) => updateSettings({ intervalMinutes: v })}
              />
              <View style={[styles.stepperDivider, { backgroundColor: Colors.amberBorder }]} />
              <StepperControl
                label="Chimes"
                unit="times"
                value={chimeCount}
                min={1}
                max={20}
                onChange={(v) => updateSettings({ chimeCount: v })}
              />
            </View>

            <Animated.Text style={[styles.savedText, { color: Colors.amber, opacity: savedOpacity }]}>
              Saved
            </Animated.Text>

            <Text style={[styles.durationText, { color: textSub }]}>
              Total session: {formatDuration(totalMinutes)}
            </Text>
          </View>
        )}

        {/* RUNNING / PAUSED STATE */}
        {isActive && (
          <View style={styles.activeContainer}>
            <RingTimer
              progress={intervalProgress}
              secondsRemaining={secondsToNextChime}
              size={220}
            />

            <View style={styles.dotsArea}>
              <ChimeDots total={totalChimes} current={currentInterval} />
            </View>

            <Text style={[styles.chimeLabel, { color: textSub }]}>
              Chime {currentInterval} of {totalChimes}
            </Text>
          </View>
        )}

        {/* COMPLETE STATE */}
        {isComplete && (
          <View style={styles.completeContainer}>
            <Text style={[styles.shantiText, { color: Colors.amber }]}>शांति</Text>
            <Text style={[styles.completeSubtitle, { color: textSub }]}>
              Session complete. Well done, Rupa.
            </Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonArea}>
        {isIdle && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: Colors.amber, borderColor: Colors.amber }]}
            onPress={begin}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: Colors.white }]}>Begin</Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isRunning
                  ? { backgroundColor: Colors.amber, borderColor: Colors.amber }
                  : { backgroundColor: 'transparent', borderColor: Colors.amber },
              ]}
              onPress={isRunning ? pause : resume}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: isRunning ? Colors.white : Colors.amber },
                ]}
              >
                {isRunning ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: Colors.amberBorder }]}
              onPress={reset}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: textSub }]}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {isComplete && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: 'transparent', borderColor: Colors.amber }]}
            onPress={reset}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: Colors.amber }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerSmall: {
    fontSize: Typography.headerSmall,
    fontFamily: 'Georgia',
    letterSpacing: 3,
  },
  headerLarge: {
    fontSize: Typography.headerLarge,
    fontFamily: 'Georgia',
    fontWeight: '400',
    letterSpacing: 2,
    marginTop: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Idle
  idleContainer: {
    alignItems: 'center',
    width: '100%',
    gap: Spacing.xl,
  },
  omSymbol: {
    fontSize: Typography.omSymbol,
    fontFamily: 'Georgia',
    lineHeight: Typography.omSymbol + 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    width: '100%',
  },
  stepperDivider: {
    width: 1,
    height: 48,
    marginHorizontal: Spacing.md,
    opacity: 0.4,
  },
  savedText: {
    fontSize: Typography.small,
    letterSpacing: 1,
    marginTop: -Spacing.md,
    height: 18,
  },
  durationText: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
    marginTop: -Spacing.sm,
  },

  // Active
  activeContainer: {
    alignItems: 'center',
    gap: Spacing.xl,
    width: '100%',
  },
  dotsArea: {
    width: '100%',
  },
  chimeLabel: {
    fontSize: Typography.small,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Complete
  completeContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  shantiText: {
    fontSize: Typography.shantiSize,
    fontFamily: 'Georgia',
    lineHeight: Typography.shantiSize + 16,
  },
  completeSubtitle: {
    fontSize: Typography.body,
    textAlign: 'center',
    lineHeight: Typography.body * 1.5,
    fontStyle: 'italic',
  },

  // Buttons
  buttonArea: {
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  primaryButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  primaryButtonText: {
    fontSize: Typography.button,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.button,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
