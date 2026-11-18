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

/**
 * Live input formatter — prefers Indian mobile spacing: `98765 43210` or `+91 98765 43210`.
 */
export function formatPhoneInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  // +91… or 91…
  if ((hasPlus && digits.startsWith("91")) || (!hasPlus && digits.startsWith("91") && digits.length >= 3)) {
    const rest = digits.startsWith("91") ? digits.slice(2) : digits;
    const local = rest.slice(0, 10);
    if (!local) return "+91 ";
    if (local.length <= 5) return `+91 ${local}`;
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  if (hasPlus && !digits.startsWith("91")) {
    return `+${digits.slice(0, 15)}`;
  }

  // 0XXXXXXXXXX while typing
  if (digits.startsWith("0") && digits.length <= 11) {
    const local = digits.slice(1, 11);
    if (!local) return "0";
    if (local.length <= 5) return `0${local}`;
    return `0${local.slice(0, 5)} ${local.slice(5)}`;
  }

  // Plain local Indian mobile
  if (/^[6-9]/.test(digits) && digits.length <= 10) {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (digits.length <= 15) {
    return digits;
  }

  return digits.slice(0, 15);
}

/**
 * Strict validation: Indian mobiles must be a full 10-digit number (6–9…).
 * Incomplete Indian-looking numbers are rejected (no 7-digit loophole).
 */
export function validatePhoneNumber(input: string): PhoneValidationResult {
  const raw = input.trim();
  if (!raw) {
    return {
      valid: false,
      normalized: "",
      isIndian: false,
      message: "Please enter a phone number.",
    };
  }

  const digitsOnly = raw.replace(/\D/g, "");

  // Full Indian mobile with optional +91 / 91 / 0
  if (
    (/^[6-9]\d{9}$/.test(digitsOnly) && digitsOnly.length === 10) ||
    (/^91[6-9]\d{9}$/.test(digitsOnly) && digitsOnly.length === 12) ||
    (/^0[6-9]\d{9}$/.test(digitsOnly) && digitsOnly.length === 11)
  ) {
    const local = digitsOnly.slice(-10);
    return {
      valid: true,
      normalized: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      isIndian: true,
    };
  }

  // Incomplete Indian-looking number
  if (looksLikeIndianMobile(digitsOnly)) {
    const localLen = digitsOnly.startsWith("91")
      ? digitsOnly.length - 2
      : digitsOnly.startsWith("0")
        ? digitsOnly.length - 1
        : digitsOnly.length;

    return {
      valid: false,
      normalized: raw,
      isIndian: true,
      message: `Indian mobile numbers need 10 digits. You entered ${Math.max(localLen, 0)} — please complete it.`,
    };
  }

  // Explicit international with + and non-India country code (E.164-ish)
  if (raw.startsWith("+") && !digitsOnly.startsWith("91") && digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return {
      valid: true,
      normalized: `+${digitsOnly}`,
      isIndian: false,
    };
  }

  return {
    valid: false,
    normalized: raw,
    isIndian: false,
    message:
      "Enter a valid 10-digit Indian mobile (starting 6–9), or an international number with +country code.",
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
