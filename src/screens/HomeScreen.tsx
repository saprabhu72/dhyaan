import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  useColorScheme,
  StatusBar,
  Platform,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { StageRow } from '../components/StageRow';
import { RingTimer } from '../components/RingTimer';
import { ChimeDots } from '../components/ChimeDots';
import { UpcomingStages } from '../components/UpcomingStages';
import { useMeditationTimer } from '../hooks/useMeditationTimer';
import { useStages } from '../hooks/useStages';
import { Stage } from '../types';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  userName: string;
}

function totalSessionSeconds(stages: Stage[]): number {
  return stages.reduce(
    (sum, s) => sum + (s.unit === 'minutes' ? s.interval * 60 : s.interval) * s.chimes,
    0
  );
}

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

export function HomeScreen({ userName }: Props) {
  const isDark = useColorScheme() === 'dark';
  const bg = isDark ? Colors.darkBg : Colors.lightBg;
  const surface = isDark ? Colors.darkSurface : Colors.lightSurface;
  const textPrimary = isDark ? Colors.darkText : Colors.amberText;
  const textSub = isDark ? Colors.darkSubtext : Colors.lightSubtext;

  const { stages, updateStage, addStage, deleteStage, saved } = useStages();
  const totalSec = totalSessionSeconds(stages);

  const [timerState, timerControls] = useMeditationTimer(stages);
  const {
    phase,
    currentStageIndex,
    totalStages,
    currentChime,
    totalChimesInStage,
    intervalProgress,
    secondsToNextChime,
    completedStageIndex,
  } = timerState;
  const { begin, pause, resume, reset } = timerControls;

  const isRunning = phase === 'running';
  const isPaused = phase === 'paused';

  // Keep screen on while a session is in progress
  useKeepAwake(isRunning || isPaused || phase === 'transitioning' ? 'dhyaan-session' : undefined);
  const isActive = isRunning || isPaused;
  const isTransitioning = phase === 'transitioning';
  const isComplete = phase === 'complete';
  const isIdle = phase === 'idle';

  const upcomingStages = isActive ? stages.slice(currentStageIndex + 1) : [];

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

  const greeting = userName
    ? `Good ${getTimeGreeting()}, ${userName}`
    : '';

  const transitionMessage =
    completedStageIndex !== null
      ? userName
        ? `Well done, ${userName}. Stage ${completedStageIndex + 1} complete.`
        : `Stage ${completedStageIndex + 1} complete.`
      : '';

  const completeMessage = userName
    ? `Beautiful practice, ${userName}. ${formatDuration(totalSec)} of stillness.`
    : `${formatDuration(totalSec)} of stillness.`;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerSmall, { color: textSub }]}>ध्यान</Text>
        <Text style={[styles.headerLarge, { color: textPrimary }]}>Dhyaan</Text>
        {isIdle && greeting ? (
          <Text style={[styles.greeting, { color: textSub }]}>{greeting}</Text>
        ) : null}
      </View>

      {/* Main content */}
      <View style={styles.content}>

        {/* IDLE — stage list */}
        {isIdle && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.idleScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.omSymbol, { color: Colors.amber }]}>ॐ</Text>

            {stages.map((stage, index) => (
              <StageRow
                key={stage.id}
                stage={stage}
                index={index}
                showDelete={stages.length > 1}
                onUpdate={(patch) => updateStage(index, patch)}
                onDelete={() => deleteStage(index)}
              />
            ))}

            {stages.length < 6 && (
              <TouchableOpacity
                style={styles.addStageBtn}
                onPress={addStage}
                activeOpacity={0.7}
              >
                <Text style={[styles.addStageBtnText, { color: Colors.amber }]}>
                  + Add Stage
                </Text>
              </TouchableOpacity>
            )}

            <Animated.Text
              style={[styles.savedText, { color: Colors.amber, opacity: savedOpacity }]}
            >
              Saved
            </Animated.Text>

            <Text style={[styles.durationText, { color: textSub }]}>
              Total session: {formatDuration(totalSec)}
            </Text>
          </ScrollView>
        )}

        {/* RUNNING / PAUSED */}
        {isActive && (
          <View style={styles.activeContainer}>
            <Text style={[styles.stageProgress, { color: textSub }]}>
              Stage {currentStageIndex + 1} of {totalStages}
            </Text>

            <RingTimer
              progress={intervalProgress}
              secondsRemaining={secondsToNextChime}
              size={200}
            />

            <View style={styles.dotsArea}>
              <ChimeDots total={totalChimesInStage} current={currentChime} />
            </View>

            <Text style={[styles.chimeLabel, { color: textSub }]}>
              Chime {currentChime} of {totalChimesInStage}
            </Text>

            <UpcomingStages
              stages={upcomingStages}
              startIndex={currentStageIndex + 2}
            />
          </View>
        )}

        {/* TRANSITIONING */}
        {isTransitioning && (
          <View style={styles.transitionContainer}>
            <Text style={[styles.transitionMessage, { color: textPrimary }]}>
              {transitionMessage}
            </Text>
          </View>
        )}

        {/* COMPLETE */}
        {isComplete && (
          <View style={styles.completeContainer}>
            <Text style={[styles.shantiText, { color: Colors.amber }]}>शांति</Text>
            <Text style={[styles.completeSubtitle, { color: textSub }]}>
              {completeMessage}
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
              <Text style={[styles.primaryButtonText, { color: isRunning ? Colors.white : Colors.amber }]}>
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

        {isTransitioning && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: Colors.amberBorder }]}
            onPress={reset}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: textSub }]}>Reset</Text>
          </TouchableOpacity>
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
  greeting: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Idle
  scrollView: {
    flex: 1,
    width: '100%',
  },
  idleScrollContent: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  omSymbol: {
    fontSize: 56,
    fontFamily: 'Georgia',
    lineHeight: 68,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  addStageBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.amberBorder,
    marginTop: Spacing.xs,
  },
  addStageBtnText: {
    fontSize: Typography.body,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  savedText: {
    fontSize: Typography.small,
    letterSpacing: 1,
    height: 18,
  },
  durationText: {
    fontSize: Typography.small,
    letterSpacing: 0.5,
    marginTop: -Spacing.xs,
  },

  // Active
  activeContainer: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  stageProgress: {
    fontSize: Typography.small,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dotsArea: {
    width: '100%',
  },
  chimeLabel: {
    fontSize: Typography.small,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Transitioning
  transitionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  transitionMessage: {
    fontSize: Typography.body,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: Typography.body * 1.6,
    letterSpacing: 0.3,
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
