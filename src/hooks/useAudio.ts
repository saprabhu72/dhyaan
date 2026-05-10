import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const SAMPLE_RATE = 44100;

function buildSineWave(
  harmonics: { freq: number; amp: number; decay: number }[],
  durationSec: number
): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSec);
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (const h of harmonics) {
      sample += h.amp * Math.sin(2 * Math.PI * h.freq * t) * Math.exp(-h.decay * t);
    }
    buf[i] = sample;
  }
  return buf;
}

function float32ToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function toDataUri(wav: ArrayBuffer): string {
  const bytes = new Uint8Array(wav);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const CHIME_HARMONICS = [
  { freq: 880, amp: 0.18, decay: 2.5 },
  { freq: 1760, amp: 0.07, decay: 1.8 },
  { freq: 2640, amp: 0.025, decay: 1.2 },
];

const END_BELL_HARMONICS_1 = [
  { freq: 220, amp: 0.40, decay: 6.5 },
  { freq: 440, amp: 0.20, decay: 5.5 },
  { freq: 660, amp: 0.09, decay: 4.5 },
  { freq: 880, amp: 0.04, decay: 3.5 },
];
const END_BELL_HARMONICS_2 = [
  { freq: 220, amp: 0.22, decay: 5.0 },
  { freq: 330, amp: 0.11, decay: 4.0 },
  { freq: 440, amp: 0.05, decay: 3.0 },
];

function buildEndBell(): Float32Array {
  const totalDuration = 9;
  const length = Math.floor(SAMPLE_RATE * totalDuration);
  const buf = new Float32Array(length);
  const s1 = buildSineWave(END_BELL_HARMONICS_1, 7.5);
  for (let i = 0; i < s1.length && i < length; i++) buf[i] += s1[i];
  const offset = Math.floor(1.5 * SAMPLE_RATE);
  const s2 = buildSineWave(END_BELL_HARMONICS_2, 7.5);
  for (let i = 0; i < s2.length && i + offset < length; i++) buf[i + offset] += s2[i];
  return buf;
}

// 1-second near-silent tone (0.001 amplitude) that loops to hold the AVAudioSession active
function buildSilentKeepAlive(): Float32Array {
  const length = SAMPLE_RATE; // 1 second
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = 0.001 * Math.sin(2 * Math.PI * 110 * (i / SAMPLE_RATE));
  }
  return buf;
}

const AUDIO_MODE = {
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  shouldDuckAndroid: false,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

export function useAudio() {
  const chimeUriRef = useRef<string | null>(null);
  const endBellUriRef = useRef<string | null>(null);
  const silentUriRef = useRef<string | null>(null);
  const silentSoundRef = useRef<Audio.Sound | null>(null);
  // Single Promise that resolves once audio mode is set and buffers are rendered
  const readyRef = useRef<Promise<void> | null>(null);

  // ─── Eager init at mount ───────────────────────────────────────────────────
  useEffect(() => {
    readyRef.current = Audio.setAudioModeAsync(AUDIO_MODE).then(() => {
      chimeUriRef.current = toDataUri(float32ToWav(buildSineWave(CHIME_HARMONICS, 3.5), SAMPLE_RATE));
      endBellUriRef.current = toDataUri(float32ToWav(buildEndBell(), SAMPLE_RATE));
      silentUriRef.current = toDataUri(float32ToWav(buildSilentKeepAlive(), SAMPLE_RATE));
    });

    // Re-apply audio mode when returning from background or after an interruption
    // (phone call / Siri resets AVAudioSession; we must re-activate it)
    const prevState = { value: AppState.currentState };
    const sub = AppState.addEventListener('change', async (next) => {
      if (next === 'active') {
        await Audio.setAudioModeAsync(AUDIO_MODE).catch(() => {});
        // If silent loop was loaded but stopped (e.g. interrupted), restart it
        const sound = silentSoundRef.current;
        if (sound) {
          try {
            const status = await sound.getStatusAsync();
            if ('isLoaded' in status && status.isLoaded && !status.isPlaying) {
              await sound.playAsync();
            }
          } catch {}
        }
      }
      prevState.value = next;
    });

    return () => sub.remove();
  }, []);

  // Ensures readyRef.current is set (fallback for very early calls before useEffect fires)
  const ensureReady = useCallback((): Promise<void> => {
    if (!readyRef.current) {
      readyRef.current = Audio.setAudioModeAsync(AUDIO_MODE).then(() => {
        chimeUriRef.current = toDataUri(float32ToWav(buildSineWave(CHIME_HARMONICS, 3.5), SAMPLE_RATE));
        endBellUriRef.current = toDataUri(float32ToWav(buildEndBell(), SAMPLE_RATE));
        silentUriRef.current = toDataUri(float32ToWav(buildSilentKeepAlive(), SAMPLE_RATE));
      });
    }
    return readyRef.current;
  }, []);

  const playChime = useCallback(async () => {
    await ensureReady();
    const uri = chimeUriRef.current;
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });
      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn('playChime error', e);
    }
  }, [ensureReady]);

  const playEndBell = useCallback(async () => {
    await ensureReady();
    const uri = endBellUriRef.current;
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });
      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn('playEndBell error', e);
    }
  }, [ensureReady]);

  const startSilentLoop = useCallback(async () => {
    await ensureReady();
    if (silentSoundRef.current) return;
    const uri = silentUriRef.current;
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0, isLooping: true }
      );
      silentSoundRef.current = sound;
    } catch (e) {
      console.warn('startSilentLoop error', e);
    }
  }, [ensureReady]);

  const stopSilentLoop = useCallback(async () => {
    const sound = silentSoundRef.current;
    if (!sound) return;
    silentSoundRef.current = null;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {}
  }, []);

  return { playChime, playEndBell, startSilentLoop, stopSilentLoop };
}
