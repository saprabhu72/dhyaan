import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// PCM sample rate
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
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);         // chunk size
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);          // block align
  view.setUint16(34, 16, true);         // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Convert float32 → int16
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

// Encode ArrayBuffer as base64 string (React Native compatible)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native's Hermes engine
  return btoa(binary);
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
  const totalDuration = 9; // 1.5s gap + second strike
  const length = Math.floor(SAMPLE_RATE * totalDuration);
  const buf = new Float32Array(length);

  // First strike
  const strike1 = buildSineWave(END_BELL_HARMONICS_1, 7.5);
  for (let i = 0; i < strike1.length && i < length; i++) {
    buf[i] += strike1[i];
  }

  // Second strike after 1.5s
  const offset = Math.floor(1.5 * SAMPLE_RATE);
  const strike2 = buildSineWave(END_BELL_HARMONICS_2, 7.5);
  for (let i = 0; i < strike2.length && i + offset < length; i++) {
    buf[i + offset] += strike2[i];
  }

  return buf;
}

async function playSoundFromWav(wavBuffer: ArrayBuffer): Promise<void> {
  const base64 = arrayBufferToBase64(wavBuffer);
  const uri = `data:audio/wav;base64,${base64}`;
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume: 1.0 }
  );
  // Unload after playback to free memory
  sound.setOnPlaybackStatusUpdate((status) => {
    if ('didJustFinish' in status && status.didJustFinish) {
      sound.unloadAsync();
    }
  });
}

export function useAudio() {
  const chimeWavRef = useRef<ArrayBuffer | null>(null);
  const endBellWavRef = useRef<ArrayBuffer | null>(null);
  const initRef = useRef(false);

  const init = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    // Pre-render PCM buffers
    const chimeSamples = buildSineWave(CHIME_HARMONICS, 3.5);
    chimeWavRef.current = float32ToWav(chimeSamples, SAMPLE_RATE);

    const endBellSamples = buildEndBell();
    endBellWavRef.current = float32ToWav(endBellSamples, SAMPLE_RATE);
  }, []);

  const playChime = useCallback(async () => {
    await init();
    if (!chimeWavRef.current) return;
    try {
      await playSoundFromWav(chimeWavRef.current);
    } catch (e) {
      console.warn('playChime error', e);
    }
  }, [init]);

  const playEndBell = useCallback(async () => {
    await init();
    if (!endBellWavRef.current) return;
    try {
      await playSoundFromWav(endBellWavRef.current);
    } catch (e) {
      console.warn('playEndBell error', e);
    }
  }, [init]);

  return { playChime, playEndBell };
}
