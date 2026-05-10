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
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
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
  { freq: 880,  amp: 0.18,  decay: 2.5 },
  { freq: 1760, amp: 0.07,  decay: 1.8 },
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
  const length = Math.floor(SAMPLE_RATE * 9);
  const buf = new Float32Array(length);
  const s1 = buildSineWave(END_BELL_HARMONICS_1, 7.5);
  for (let i = 0; i < s1.length && i < length; i++) buf[i] += s1[i];
  const offset = Math.floor(1.5 * SAMPLE_RATE);
  const s2 = buildSineWave(END_BELL_HARMONICS_2, 7.5);
  for (let i = 0; i < s2.length && i + offset < length; i++) buf[i + offset] += s2[i];
  return buf;
}

function buildSilentKeepAlive(): Float32Array {
  const buf = new Float32Array(SAMPLE_RATE);
  for (let i = 0; i < buf.length; i++) {
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
  // Pre-encoded URI strings — built lazily on first use, then cached.
  // Keeping them separate means one failing can't block the others.
  const chimeUriRef    = useRef<string | null>(null);
  const endBellUriRef  = useRef<string | null>(null);
  const silentUriRef   = useRef<string | null>(null);
  const silentSoundRef = useRef<Audio.Sound | null>(null);

  // Promise for the audio mode call only — fast, no heavy CPU work.
  const modePromiseRef = useRef<Promise<void> | null>(null);

  // ─── Eager audio mode init at mount ──────────────────────────────────────
  useEffect(() => {
    modePromiseRef.current = Audio.setAudioModeAsync(AUDIO_MODE);

    // Re-apply mode on foreground return; iOS resets AVAudioSession after
    // interruptions (calls, Siri). Also restart the silent loop if it stopped.
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        await Audio.setAudioModeAsync(AUDIO_MODE).catch(() => {});
        const sound = silentSoundRef.current;
        if (sound) {
          try {
            const st = await sound.getStatusAsync();
            if ('isLoaded' in st && st.isLoaded && !st.isPlaying) {
              await sound.playAsync();
            }
          } catch {}
        }
      }
    });

    return () => sub.remove();
  }, []);

  // Waits for audio mode to be ready; starts the call if it hasn't begun yet.
  const ensureMode = useCallback(async () => {
    if (!modePromiseRef.current) {
      modePromiseRef.current = Audio.setAudioModeAsync(AUDIO_MODE);
    }
    await modePromiseRef.current;
  }, []);

  // ─── Playback helpers — buffers built lazily, errors are isolated ─────────
  const playChime = useCallback(async () => {
    await ensureMode();
    try {
      if (!chimeUriRef.current) {
        chimeUriRef.current = toDataUri(float32ToWav(buildSineWave(CHIME_HARMONICS, 3.5), SAMPLE_RATE));
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: chimeUriRef.current },
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn('playChime error', e);
    }
  }, [ensureMode]);

  const playEndBell = useCallback(async () => {
    await ensureMode();
    try {
      if (!endBellUriRef.current) {
        endBellUriRef.current = toDataUri(float32ToWav(buildEndBell(), SAMPLE_RATE));
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: endBellUriRef.current },
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate((s) => {
        if ('didJustFinish' in s && s.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      console.warn('playEndBell error', e);
    }
  }, [ensureMode]);

  const startSilentLoop = useCallback(async () => {
    await ensureMode();
    if (silentSoundRef.current) return;
    try {
      if (!silentUriRef.current) {
        silentUriRef.current = toDataUri(float32ToWav(buildSilentKeepAlive(), SAMPLE_RATE));
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: silentUriRef.current },
        { shouldPlay: true, volume: 1.0, isLooping: true }
      );
      silentSoundRef.current = sound;
    } catch (e) {
      console.warn('startSilentLoop error', e);
    }
  }, [ensureMode]);

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
