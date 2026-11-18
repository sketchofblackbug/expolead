export type PhoneValidationResult = {
  valid: boolean;
  normalized: string;
  isIndian: boolean;
  message?: string;
};

export type ParsedSpokenLead = {
  name: string;
  phone: string;
  notes: string;
};

const DIGIT_WORDS =
  "zero|oh|o|one|two|three|four|five|six|seven|eight|nine|double|triple";

/** Digits only, preserving a leading + if present in the original. */
export function extractPhoneDigits(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function looksLikeIndianMobile(digitsOnly: string): boolean {
  if (/^[6-9]\d{0,9}$/.test(digitsOnly)) return true;
  if (/^0[6-9]\d{0,9}$/.test(digitsOnly)) return true;
  if (/^91[6-9]\d{0,9}$/.test(digitsOnly)) return true;
  return false;
}

/** Strip spaces, dashes, parentheses, and leading +91 / 91 / 0 → local digits only. */
export function stripToIndianLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length >= 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length >= 11) {
    digits = digits.slice(1);
  }

  // If user typed +91 and then the number gradually
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 10);
}

/**
 * Live input formatter for Indian mobiles.
 * Strips spaces, dashes, and +91 automatically; shows `98765 43210`.
 */
export function formatPhoneInput(input: string): string {
  const local = stripToIndianLocalDigits(input);
  if (!local) return "";
  if (local.length <= 5) return local;
  return `${local.slice(0, 5)} ${local.slice(5)}`;
}

/**
 * Strict: valid 10-digit Indian mobile starting with 6–9 only.
 * Spaces, dashes, and +91 are stripped before checking.
 */
export function validatePhoneNumber(input: string): PhoneValidationResult {
  const raw = input.trim();
  if (!raw) {
    return {
      valid: false,
      normalized: "",
      isIndian: true,
      message: "Please enter your 10-digit mobile number.",
    };
  }

  const local = stripToIndianLocalDigits(raw);

  if (/^[6-9]\d{9}$/.test(local)) {
    return {
      valid: true,
      normalized: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      isIndian: true,
    };
  }

  if (local.length > 0 && local.length < 10) {
    return {
      valid: false,
      normalized: formatPhoneInput(local),
      isIndian: true,
      message: `Enter all 10 digits. You have ${local.length} so far.`,
    };
  }

  if (local.length === 10 && !/^[6-9]/.test(local)) {
    return {
      valid: false,
      normalized: formatPhoneInput(local),
      isIndian: true,
      message: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }

  if (looksLikeIndianMobile(raw.replace(/\D/g, "")) || local.length > 0) {
    return {
      valid: false,
      normalized: formatPhoneInput(local),
      isIndian: true,
      message: "Enter a valid 10-digit Indian mobile number (starts with 6–9).",
    };
  }

  return {
    valid: false,
    normalized: raw,
    isIndian: true,
    message: "Enter a valid 10-digit Indian mobile number (starts with 6–9).",
  };
}

/** Turns spoken phone phrases into digits (e.g. "nine eight seven…"). */
export function normalizeSpokenPhone(transcript: string): string {
  const wordMap: Record<string, string> = {
    zero: "0",
    oh: "0",
    o: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    double: "",
  };

  let text = transcript.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();

  text = text.replace(
    /\bdouble\s+(zero|oh|o|one|two|three|four|five|six|seven|eight|nine|\d)\b/g,
    (_, token: string) => {
      const digit = wordMap[token] ?? token;
      return `${digit}${digit}`;
    }
  );

  text = text.replace(
    /\btriple\s+(zero|oh|o|one|two|three|four|five|six|seven|eight|nine|\d)\b/g,
    (_, token: string) => {
      const digit = wordMap[token] ?? token;
      return `${digit}${digit}${digit}`;
    }
  );

  const tokens = text.split(" ");
  const digits: string[] = [];

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits.push(token);
      continue;
    }
    if (wordMap[token]) {
      digits.push(wordMap[token]);
    }
  }

  if (digits.length === 0) {
    return transcript.replace(/\D/g, "");
  }

  return digits.join("");
}

/**
 * Pull only the person's name from spoken text.
 * "Hi, my name is Priya Sharma and my number is…" → "Priya Sharma"
 */
export function cleanSpokenName(transcript: string): string {
  let text = transcript.trim().replace(/\s+/g, " ");
  if (!text) return "";

  // Prefer explicit name cue, capture until phone/notes conjunction
  const named = text.match(
    /(?:(?:hi|hello|hey|namaste)[,!]?\s+)*(?:my name is|i am|i'm|this is|name is)\s+(.+?)(?=\s+and\b|\s+my\s+(?:phone|number|mobile|contact)\b|$)/i
  );

  if (named?.[1]) {
    text = named[1];
  } else {
    text = text
      .replace(/^(hi|hello|hey|namaste)[,!]?\s+/i, "")
      .replace(/^(my name is|i am|i'm|this is|name is|myself)\s+/i, "");
  }

  text = text
    .replace(/\s+and\s+(my\s+)?(phone|number|mobile|contact).*$/i, "")
    .replace(/\b(my\s+)?(phone|number|mobile|contact)( number)?( is)?\b.*$/i, "")
    .replace(new RegExp(`\\b(${DIGIT_WORDS})\\b.*$`, "i"), "")
    .replace(/\+?\d[\d\s().-]{3,}.*$/, "")
    .replace(/\b(also|notes?|additional|please|interested|looking).*$/i, "")
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Keep a reasonable personal name (1–4 words, letters)
  const filler = new Set([
    "this",
    "that",
    "something",
    "someone",
    "there",
    "here",
    "test",
    "testing",
    "abc",
    "xyz",
    "is",
    "am",
    "are",
    "the",
    "a",
    "an",
    "and",
    "my",
    "name",
  ]);
  const words = text.split(" ").filter(Boolean);
  const nameWords = words
    .filter((word) => /^[a-zA-Z][a-zA-Z'.-]*$/.test(word))
    .filter((word) => !filler.has(word.toLowerCase()))
    .slice(0, 4);

  return nameWords.join(" ");
}

function extractNotes(transcript: string): string {
  const match = transcript.match(
    /\b(?:also|notes?|additional(?:ly)?|please note|by the way|interested in|looking for)\s*[,:-]?\s*(.+)$/i
  );
  if (!match?.[1]) return "";

  return match[1]
    .replace(/\b(my\s+)?(phone|number|mobile|name).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract name + phone (+ optional notes) from continuous spoken text.
 */
export function parseSpokenLead(transcript: string): ParsedSpokenLead {
  const cleaned = transcript.trim().replace(/\s+/g, " ");
  if (!cleaned) return { name: "", phone: "", notes: "" };

  const notes = extractNotes(cleaned);
  const spokenDigits = normalizeSpokenPhone(cleaned);
  const digitMatch = cleaned.match(/(\+?\d[\d\s().-]{6,}\d)/);

  let phone = "";
  let forName = cleaned;

  if (spokenDigits.length >= 7) {
    phone = formatPhoneInput(spokenDigits);
    forName = cleaned
      .replace(/(\+?\d[\d\s().-]{6,}\d)/g, " ")
      .replace(
        new RegExp(
          `\\b(${DIGIT_WORDS})(\\s+(${DIGIT_WORDS}|\\d))*\\b`,
          "gi"
        ),
        " "
      );
  } else if (digitMatch) {
    phone = formatPhoneInput(digitMatch[1]);
    forName = cleaned.replace(digitMatch[0], " ");
  }

  forName = forName
    .replace(/\b(and )?(my )?(phone|number|mobile|contact)( number)?( is)?\b/gi, " ")
    .replace(/\b(?:also|notes?|additional(?:ly)?|please note|by the way|interested in|looking for)\b.*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  const name = cleanSpokenName(forName);

  // If phone incomplete, still return digits for the field — validation blocks submit
  return { name, phone, notes };
}
