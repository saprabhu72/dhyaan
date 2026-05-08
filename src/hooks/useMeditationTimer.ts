import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudio } from './useAudio';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'complete';

export interface TimerState {
  phase: TimerPhase;
  currentInterval: number;    // 1-based index of current interval
  intervalProgress: number;   // 0..1, how far into the current interval
  secondsToNextChime: number;
  totalChimes: number;
}

export interface TimerControls {
  begin: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useMeditationTimer(
  intervalMinutes: number,
  chimeCount: number
): [TimerState, TimerControls] {
  const { playChime, playEndBell } = useAudio();

  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [currentInterval, setCurrentInterval] = useState(1);
  const [intervalProgress, setIntervalProgress] = useState(0);
  const [secondsToNextChime, setSecondsToNextChime] = useState(intervalMinutes * 60);

  // Internal refs for accurate timing
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);       // when current interval began
  const pausedElapsedRef = useRef<number>(0);   // ms elapsed in current interval before pause
  const currentIntervalRef = useRef(1);
  const phaseRef = useRef<TimerPhase>('idle');
  const intervalMsRef = useRef(intervalMinutes * 60 * 1000);
  const chimeCountRef = useRef(chimeCount);

  // Keep refs in sync with props
  useEffect(() => {
    intervalMsRef.current = intervalMinutes * 60 * 1000;
    chimeCountRef.current = chimeCount;
  }, [intervalMinutes, chimeCount]);

  const stopTick = useCallback(() => {
    if (rafRef.current !== null) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    const elapsed = Date.now() - startTimeRef.current + pausedElapsedRef.current;
    const intervalMs = intervalMsRef.current;
    const progress = Math.min(elapsed / intervalMs, 1);
    const remaining = Math.max(0, intervalMs - elapsed);

    setIntervalProgress(progress);
    setSecondsToNextChime(Math.ceil(remaining / 1000));

    if (elapsed >= intervalMs) {
      // Interval complete
      const nextInterval = currentIntervalRef.current + 1;

      if (nextInterval > chimeCountRef.current) {
        // Session complete
        phaseRef.current = 'complete';
        setPhase('complete');
        setIntervalProgress(1);
        setSecondsToNextChime(0);
        playEndBell();
        return;
      }

      // Advance to next interval
      currentIntervalRef.current = nextInterval;
      setCurrentInterval(nextInterval);
      pausedElapsedRef.current = 0;
      startTimeRef.current = Date.now();
      setIntervalProgress(0);
      setSecondsToNextChime(Math.ceil(intervalMsRef.current / 1000));

      // Play chime between intervals (not at start, not at the final end)
      playChime();
    }

    rafRef.current = setTimeout(tick, 250);
  }, [playChime, playEndBell]);

  const begin = useCallback(() => {
    currentIntervalRef.current = 1;
    setCurrentInterval(1);
    pausedElapsedRef.current = 0;
    startTimeRef.current = Date.now();
    phaseRef.current = 'running';
    setPhase('running');
    setIntervalProgress(0);
    setSecondsToNextChime(intervalMsRef.current / 1000);
    // Play opening chime
    playChime();
    rafRef.current = setTimeout(tick, 250);
  }, [tick, playChime]);

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
    phaseRef.current = 'idle';
    setPhase('idle');
    currentIntervalRef.current = 1;
    setCurrentInterval(1);
    pausedElapsedRef.current = 0;
    setIntervalProgress(0);
    setSecondsToNextChime(intervalMsRef.current / 1000);
  }, [stopTick]);

  // Reset countdown display when settings change while idle
  useEffect(() => {
    if (phase === 'idle') {
      setSecondsToNextChime(intervalMinutes * 60);
    }
  }, [intervalMinutes, phase]);

  // Cleanup on unmount
  useEffect(() => () => stopTick(), [stopTick]);

  return [
    { phase, currentInterval, intervalProgress, secondsToNextChime, totalChimes: chimeCount },
    { begin, pause, resume, reset },
  ];
}
