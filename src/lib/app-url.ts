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

  return "http://localhost:3000";
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
  return `${baseUrl}/lead/${encodeURIComponent(id)}`;
}
