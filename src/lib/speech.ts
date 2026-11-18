export interface ParsedSpeechLead {
  name: string;
  phone: string;
  transcript: string;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
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
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;
  return new Recognition();
}

/**
 * Extracts a name and phone number from free-form spoken text.
 * Examples:
 * - "My name is Priya Sharma and my number is 98765 43210"
 * - "James Chen 415-555-0198"
 */
export function parseSpokenLead(transcript: string): ParsedSpeechLead {
  const cleaned = transcript.trim().replace(/\s+/g, " ");
  const phoneMatch = cleaned.match(
    /(\+?\d[\d\s().-]{6,}\d)/
  );

  let phone = "";
  let remainder = cleaned;

  if (phoneMatch) {
    phone = phoneMatch[1].replace(/\s+/g, " ").trim();
    remainder = cleaned.replace(phoneMatch[0], " ").replace(/\s+/g, " ").trim();
  }

  const name = remainder
    .replace(/^(my name is|i am|i'm|this is|name is)\s+/i, "")
    .replace(/\b(and )?(my )?(phone|number|mobile|contact)( number)?( is)?\b/gi, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    name,
    phone,
    transcript: cleaned,
  };
}
