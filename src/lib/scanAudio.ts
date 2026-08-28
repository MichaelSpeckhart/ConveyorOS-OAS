import type { ScanAudioCueName } from "../hooks/useScanHandler";

type ToneSegment = {
  frequency: number;
  seconds: number;
  volume: number;
};

const SAMPLE_RATE = 44100;
const wavCache = new Map<string, string>();

const SCAN_TONES: Record<"success" | "error", ToneSegment[]> = {
  success: [
    { frequency: 880, seconds: 0.08, volume: 0.32 },
    { frequency: 1175, seconds: 0.12, volume: 0.34 },
  ],
  error: [
    { frequency: 220, seconds: 0.16, volume: 0.42 },
    { frequency: 165, seconds: 0.18, volume: 0.4 },
  ],
};

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function base64Encode(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function makeToneWavDataUri(segments: ToneSegment[]) {
  const cacheKey = JSON.stringify(segments);
  const cached = wavCache.get(cacheKey);
  if (cached) return cached;

  const samples = segments.flatMap((segment) => {
    const count = Math.floor(segment.seconds * SAMPLE_RATE);

    return Array.from({ length: count }, (_, i) => {
      const t = i / SAMPLE_RATE;
      const fadeIn = Math.min(1, i / Math.floor(0.012 * SAMPLE_RATE));
      const fadeOut = Math.min(1, (count - i) / Math.floor(0.025 * SAMPLE_RATE));
      const envelope = Math.min(fadeIn, fadeOut);
      const value = Math.sin(2 * Math.PI * segment.frequency * t) * segment.volume * envelope;

      return Math.max(-1, Math.min(1, value));
    });
  });

  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  samples.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  });

  const url = `data:audio/wav;base64,${base64Encode(new Uint8Array(buffer))}`;
  wavCache.set(cacheKey, url);
  return url;
}

function playWavTone(kind: "success" | "error") {
  if (typeof Audio === "undefined" || typeof btoa === "undefined") return;

  const audio = new Audio(makeToneWavDataUri(SCAN_TONES[kind]));
  audio.volume = kind === "success" ? 0.45 : 0.55;
  void audio.play().catch((err) => {
    console.warn("Scan audio playback failed:", err);
  });
}

function chooseVoice(synth: SpeechSynthesis) {
  const voices = synth.getVoices();

  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
}

function speak(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return;
  }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = chooseVoice(synth);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  synth.cancel();
  synth.speak(utterance);
}

export function playScanAudioCue(cue: ScanAudioCueName) {
  switch (cue) {
    case "scan-success":
      playWavTone("success");
      return;
    case "scan-error":
      playWavTone("error");
      return;
    case "ticket-complete":
      speak("ticket complete");
      return;
    case "garment-on-conveyor":
      speak("garment on conveyor");
      return;
  }
}
