export type SpeechField = "name" | "phone" | "auto";

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
  results: ArrayLike<
    {
      isFinal?: boolean;
      0: { transcript: string };
    } & ArrayLike<{ transcript: string }>
  >;
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
      final += `${text} `;
    } else {
      interim += `${text} `;
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
      return "Microphone access was blocked. Allow mic permission in your browser, or type your details below.";
    case "no-speech":
      return "We didn’t catch that. Tap Start Voice Capture and try speaking a little louder.";
    case "audio-capture":
      return "No microphone was found on this device. Please type your details instead.";
    case "network":
      return "Voice recognition needs an internet connection. Check your network and try again.";
    case "aborted":
      return "";
    default:
      return "Voice capture had a problem. You can still type your name and phone number.";
  }
}

export function friendlySaveError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Couldn’t reach the server. Check your connection and try again.";
  }
  if (lower.includes("supabase") || lower.includes("invalid api key")) {
    return "Lead storage isn’t configured correctly. Please ask the exhibitor for help.";
  }
  if (lower.includes("permission") || lower.includes("rls") || lower.includes("42501")) {
    return "Saving was blocked by database permissions. Please ask the exhibitor for help.";
  }
  return message || "Unable to save your details. Please try again.";
}
