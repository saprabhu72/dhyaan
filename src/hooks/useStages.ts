import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stage } from '../types';

const STAGES_KEY = 'dhyaan_stages';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function makeDefaultStages(): Stage[] {
  return [{ id: genId(), interval: 5, unit: 'minutes', chimes: 3 }];
}

function migrateStage(raw: unknown): Stage {
  const s = raw as Record<string, unknown>;
  if (
    typeof s.interval === 'number' &&
    (s.unit === 'minutes' || s.unit === 'seconds') &&
    typeof s.chimes === 'number'
  ) {
    return {
      id: typeof s.id === 'string' ? s.id : genId(),
      interval: s.interval,
      unit: s.unit,
      chimes: s.chimes,
    };
  }
  // Migrate old format (intervalMinutes / chimeCount)
  return {
    id: genId(),
    interval: typeof s.intervalMinutes === 'number' ? Math.min(s.intervalMinutes, 10) : 5,
    unit: 'minutes',
    chimes: typeof s.chimeCount === 'number' ? s.chimeCount : 3,
  };
}

export function useStages() {
  const [stages, setStages] = useState<Stage[]>(makeDefaultStages);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STAGES_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStages(parsed.map(migrateStage));
          }
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Stage[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      AsyncStorage.setItem(STAGES_KEY, JSON.stringify(next));
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    }, 400);
  }, []);

  const updateStage = useCallback(
    (index: number, patch: Partial<Stage>) => {
      setStages((prev) => {
        const next = prev.map((s, i) => (i === index ? { ...s, ...patch } : s));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const addStage = useCallback(() => {
    setStages((prev) => {
      if (prev.length >= 6) return prev;
      const next = [...prev, { id: genId(), interval: 5, unit: 'minutes' as const, chimes: 3 }];
      persist(next);
      return next;
    });
  }, [persist]);

  const deleteStage = useCallback(
    (index: number) => {
      setStages((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return { stages, updateStage, addStage, deleteStage, saved };
}
