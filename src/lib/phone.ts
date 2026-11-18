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
 * Live input formatter — prefers Indian mobile spacing: `98765 43210` or `+91 98765 43210`.
 */
export function formatPhoneInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  // +91… or 91…
  if (hasPlus || digits.startsWith("91")) {
    const rest = digits.startsWith("91") ? digits.slice(2) : digits;
    const local = rest.slice(0, 10);
    if (!local) return hasPlus || digits.startsWith("91") ? "+91 " : trimmed;

    if (local.length <= 5) {
      return `+91 ${local}`;
    }
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
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

  // Other / partial international — keep digits, lightly spaced
  if (digits.length <= 15) {
    return hasPlus ? `+${digits}` : digits;
  }

  return hasPlus ? `+${digits.slice(0, 15)}` : digits.slice(0, 15);
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
  if (
    /^(?:91)?[6-9]\d{9}$/.test(digitsOnly) &&
    (digitsOnly.length === 10 || digitsOnly.length === 12)
  ) {
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
      "Enter a valid Indian mobile (10 digits starting 6–9) or an international number with 7–15 digits.",
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

export function cleanSpokenName(transcript: string): string {
  return transcript
    .trim()
    .replace(/^(my name is|i am|i'm|this is|name is|myself)\s+/i, "")
    .replace(/[.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract name + phone from a continuous spoken phrase.
 * Example: "My name is Priya Sharma and my number is 98765 43210"
 */
export function parseSpokenLead(transcript: string): { name: string; phone: string } {
  const cleaned = transcript.trim().replace(/\s+/g, " ");
  if (!cleaned) return { name: "", phone: "" };

  const spokenDigits = normalizeSpokenPhone(cleaned);
  const digitMatch = cleaned.match(/(\+?\d[\d\s().-]{6,}\d)/);

  let phone = "";
  let remainder = cleaned;

  if (spokenDigits.length >= 7) {
    phone = formatPhoneInput(spokenDigits);
    // Strip digit words / number phrases from name remainder approximately
    remainder = cleaned
      .replace(/(\+?\d[\d\s().-]{6,}\d)/g, " ")
      .replace(
        /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine|double|triple)(\s+(zero|oh|one|two|three|four|five|six|seven|eight|nine))*\b/gi,
        " "
      );
  } else if (digitMatch) {
    phone = formatPhoneInput(digitMatch[1]);
    remainder = cleaned.replace(digitMatch[0], " ");
  }

  const name = cleanSpokenName(
    remainder
      .replace(/\b(and )?(my )?(phone|number|mobile|contact)( number)?( is)?\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  return { name, phone };
}
