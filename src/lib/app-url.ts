/**
 * Base URL for public capture links.
 * Prefer NEXT_PUBLIC_APP_URL in production; fall back to the current origin in the browser.
 */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

/** True when a URL is safe to encode into a scannable booth QR. */
export function isScannableBaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    // localhost QR codes do not open on visitor phones
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Slug suitable for /lead/[boothId] — keeps letters, numbers, dash, underscore. */
export function normalizeBoothId(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

export function buildLeadCaptureUrl(boothId: string, baseUrl = getAppBaseUrl()): string {
  const id = normalizeBoothId(boothId);
  if (!baseUrl || !id) return "";
  return `${baseUrl.replace(/\/$/, "")}/lead/${encodeURIComponent(id)}`;
}
