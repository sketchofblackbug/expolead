export type PhoneValidationResult = {
  valid: boolean;
  normalized: string;
  isIndian: boolean;
  message?: string;
};

/** Digits only, preserving a leading + if present in the original. */
export function extractPhoneDigits(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Prefers Indian mobile (10 digits starting 6–9), including +91 / 91 / 0 prefixes.
 * Also accepts other international numbers with 7–15 digits.
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

  // +91XXXXXXXXXX or 91XXXXXXXXXX
  if (/^(?:91)?[6-9]\d{9}$/.test(digitsOnly) && (digitsOnly.length === 10 || digitsOnly.length === 12)) {
    const local = digitsOnly.slice(-10);
    return {
      valid: true,
      normalized: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      isIndian: true,
    };
  }

  // 0XXXXXXXXXX (common India trunk prefix)
  if (/^0[6-9]\d{9}$/.test(digitsOnly)) {
    const local = digitsOnly.slice(1);
    return {
      valid: true,
      normalized: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
      isIndian: true,
    };
  }

  // Plain Indian 10-digit
  if (/^[6-9]\d{9}$/.test(digitsOnly)) {
    return {
      valid: true,
      normalized: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
      isIndian: true,
    };
  }

  // Other international: 7–15 digits total
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    const normalized = raw.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
    return {
      valid: true,
      normalized,
      isIndian: false,
    };
  }

  return {
    valid: false,
    normalized: raw,
    isIndian: false,
    message:
      "Enter a valid Indian mobile (10 digits) or an international number with 7–15 digits.",
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
    double: "", // handled specially below
  };

  let text = transcript.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();

  // "double nine" → "99"
  text = text.replace(
    /\bdouble\s+(zero|oh|o|one|two|three|four|five|six|seven|eight|nine|\d)\b/g,
    (_, token: string) => {
      const digit = wordMap[token] ?? token;
      return `${digit}${digit}`;
    }
  );

  // "triple eight" → "888"
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

  // Also pull any digit sequences already in the transcript
  if (digits.length === 0) {
    const match = transcript.replace(/\D/g, "");
    return match;
  }

  return digits.join("");
}

export function cleanSpokenName(transcript: string): string {
  return transcript
    .trim()
    .replace(/^(my name is|i am|i'm|this is|name is|myself)\s+/i, "")
    .replace(/[.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
