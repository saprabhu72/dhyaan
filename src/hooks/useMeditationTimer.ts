import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from './useAudio';
import { Stage } from '../types';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'transitioning' | 'complete';

export interface TimerState {
  phase: TimerPhase;
  currentStageIndex: number;
  totalStages: number;
  currentChime: number;          // 1-based within current stage
  totalChimesInStage: number;
  intervalProgress: number;      // 0..1
  secondsToNextChime: number;
  completedStageIndex: number | null; // set during 'transitioning'
}

export interface TimerControls {
  begin: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

function stageIntervalSec(stage: Stage): number {
  return stage.unit === 'minutes' ? stage.interval * 60 : stage.interval;
}

function stageIntervalMs(stage: Stage): number {
  return stageIntervalSec(stage) * 1000;
}

export function useMeditationTimer(stages: Stage[]): [TimerState, TimerControls] {
  const { playChime, playEndBell, startSilentLoop, stopSilentLoop } = useAudio();

  const firstStageSec = stages[0] ? stageIntervalSec(stages[0]) : 300;

  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [currentChime, setCurrentChime] = useState(1);
  const [intervalProgress, setIntervalProgress] = useState(0);
  const [secondsToNextChime, setSecondsToNextChime] = useState(firstStageSec);
  const [completedStageIndex, setCompletedStageIndex] = useState<number | null>(null);

  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const currentStageIndexRef = useRef(0);
  const currentChimeRef = useRef(1);
  const phaseRef = useRef<TimerPhase>('idle');
  const stagesRef = useRef(stages);

  useEffect(() => {
    stagesRef.current = stages;
  }, [stages]);

  // Keep countdown display in sync when stages change while idle
  useEffect(() => {
    if (phase === 'idle') {
      const first = stages[0];
      setSecondsToNextChime(first ? stageIntervalSec(first) : 300);
    }
  }, [stages, phase]);

  const stopTick = useCallback(() => {
    if (rafRef.current !== null) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startStage = useCallback((stageIndex: number) => {
    const stage = stagesRef.current[stageIndex];
    currentStageIndexRef.current = stageIndex;
    currentChimeRef.current = 1;
    setCurrentStageIndex(stageIndex);
    setCurrentChime(1);
    pausedElapsedRef.current = 0;
    startTimeRef.current = Date.now();
    setIntervalProgress(0);
    setSecondsToNextChime(stageIntervalSec(stage));
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    const stageIndex = currentStageIndexRef.current;
    const chimeIndex = currentChimeRef.current;
    const stage = stagesRef.current[stageIndex];
    const intervalMs = stageIntervalMs(stage);
    const elapsed = Date.now() - startTimeRef.current + pausedElapsedRef.current;
    const progress = Math.min(elapsed / intervalMs, 1);
    const remaining = Math.max(0, intervalMs - elapsed);

    setIntervalProgress(progress);
    setSecondsToNextChime(Math.ceil(remaining / 1000));

    if (elapsed < intervalMs) {
      rafRef.current = setTimeout(tick, 250);
      return;
    }

    // Advance chime within stage
    const nextChime = chimeIndex + 1;
    if (nextChime <= stage.chimes) {
      currentChimeRef.current = nextChime;
      setCurrentChime(nextChime);
      pausedElapsedRef.current = 0;
      startTimeRef.current = Date.now();
      setIntervalProgress(0);
      setSecondsToNextChime(stageIntervalSec(stage));
      playChime();
      rafRef.current = setTimeout(tick, 250);
      return;
    }

    // All chimes in this stage complete
    const nextStageIndex = stageIndex + 1;
    if (nextStageIndex >= stagesRef.current.length) {
      phaseRef.current = 'complete';
      setPhase('complete');
      setIntervalProgress(1);
      setSecondsToNextChime(0);
      setCompletedStageIndex(null);
      playEndBell();
      stopSilentLoop();
      return;
    }

    // Transition to next stage
    phaseRef.current = 'transitioning';
    setPhase('transitioning');
    setIntervalProgress(1);
    setCompletedStageIndex(stageIndex);
    playChime();

    transitionTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== 'transitioning') return;
      phaseRef.current = 'running';
      setPhase('running');
      setCompletedStageIndex(null);
      startStage(nextStageIndex);
      rafRef.current = setTimeout(tick, 250);
    }, 2000);
  }, [playChime, playEndBell, startStage, stopSilentLoop]);

  const begin = useCallback(() => {
    currentStageIndexRef.current = 0;
    currentChimeRef.current = 1;
    setCurrentStageIndex(0);
    setCurrentChime(1);
    pausedElapsedRef.current = 0;
    startTimeRef.current = Date.now();
    phaseRef.current = 'running';
    setPhase('running');
    setIntervalProgress(0);
    setCompletedStageIndex(null);
    const first = stagesRef.current[0];
    setSecondsToNextChime(first ? stageIntervalSec(first) : 300);
    startSilentLoop();
    playChime();
    rafRef.current = setTimeout(tick, 250);
  }, [tick, playChime, startSilentLoop]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    stopTick();
    pausedElapsedRef.current += Date.now() - startTimeRef.current;
    phaseRef.current = 'paused';
    setPhase('paused');
  }, [stopTick]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    startTimeRef.current = Date.now();
    phaseRef.current = 'running';
    setPhase('running');
    rafRef.current = setTimeout(tick, 250);
  }, [tick]);

  const reset = useCallback(() => {
    stopTick();
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    stopSilentLoop();
    phaseRef.current = 'idle';
    setPhase('idle');
    currentStageIndexRef.current = 0;
    currentChimeRef.current = 1;
    setCurrentStageIndex(0);
    setCurrentChime(1);
    pausedElapsedRef.current = 0;
    setIntervalProgress(0);
    setCompletedStageIndex(null);
    const first = stagesRef.current[0];
    setSecondsToNextChime(first ? stageIntervalSec(first) : 300);
  }, [stopTick, stopSilentLoop]);

  useEffect(
    () => () => {
      stopTick();
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      stopSilentLoop();
    },
    [stopTick, stopSilentLoop]
  );

  const currentStage = stages[currentStageIndex];

  return [
    {
      phase,
      currentStageIndex,
      totalStages: stages.length,
      currentChime,
      totalChimesInStage: currentStage?.chimes ?? 1,
      intervalProgress,
      secondsToNextChime,
      completedStageIndex,
    },
    { begin, pause, resume, reset },
  ];
}
