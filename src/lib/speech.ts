export type SpeechField = "name" | "phone";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal?: boolean;
    0: { transcript: string };
  } & ArrayLike<{ transcript: string }>>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!Recognition) return null;
  return new Recognition();
}

export function getTranscriptFromEvent(event: SpeechRecognitionEventLike): {
  interim: string;
  final: string;
} {
  let interim = "";
  let final = "";

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) {
      final += text;
    } else {
      interim += text;
    }
  }

  return {
    interim: interim.trim(),
    final: final.trim(),
  };
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. You can still type your details.";
    case "no-speech":
      return "No speech detected. Tap the button and try again.";
    case "audio-capture":
      return "No microphone found. Please type your details instead.";
    case "network":
      return "Speech recognition needs a network connection. Please try again.";
    case "aborted":
      return "";
    default:
      return "Voice capture failed. Please try again or type your details.";
  }
}
