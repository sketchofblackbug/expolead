import { stripToIndianLocalDigits } from "@/lib/phone";
import type { BoothPublicInfo } from "@/types/lead";

export type WhatsAppConfig = {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  templateName: string;
  verifyToken: string;
};

export type SendTemplateParams = {
  toDigits: string;
  visitorName: string;
  brandName: string;
  boothLocation: string;
  brochureUrl: string;
};

export type SendTemplateResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/** 10-digit Indian mobile (no country code). */
export function toLocalPhoneDigits(phone: string): string {
  return stripToIndianLocalDigits(phone);
}

/** WhatsApp Cloud API `to` field: 91XXXXXXXXXX */
export function toWhatsAppRecipient(phone: string): string {
  const local = toLocalPhoneDigits(phone);
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new Error("Phone must be a valid 10-digit Indian mobile number.");
  }
  return `91${local}`;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION?.trim() || "v21.0").replace(
    /^\/+|\/+$/g,
    ""
  );
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "";

  if (!token || !phoneNumberId || !templateName) {
    return null;
  }

  return { token, phoneNumberId, apiVersion, templateName, verifyToken };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null;
}

function sanitizeTemplateText(value: string, fallback = "—"): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  // WhatsApp rejects empty body parameters
  return cleaned || fallback;
}

/**
 * Send an approved template message via WhatsApp Cloud API.
 * Server-only — never call from the browser.
 */
export async function sendWhatsAppTemplate(
  params: SendTemplateParams
): Promise<SendTemplateResult> {
  const config = getWhatsAppConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "WhatsApp is not configured. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_NAME.",
    };
  }

  let to: string;
  try {
    to = toWhatsAppRecipient(params.toDigits);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid phone number.",
    };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: config.templateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: sanitizeTemplateText(params.visitorName, "Visitor") },
            { type: "text", text: sanitizeTemplateText(params.brandName, "Exhibitor") },
            {
              type: "text",
              text: sanitizeTemplateText(params.boothLocation, "Exhibition booth"),
            },
            {
              type: "text",
              text: sanitizeTemplateText(params.brochureUrl, "https://example.com"),
            },
          ],
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; error_user_msg?: string; code?: number };
    };

    if (!response.ok) {
      const message =
        payload.error?.error_user_msg ||
        payload.error?.message ||
        `WhatsApp API error (${response.status})`;
      return { ok: false, error: message };
    }

    const messageId = payload.messages?.[0]?.id;
    if (!messageId) {
      return { ok: false, error: "WhatsApp API returned no message id." };
    }

    return { ok: true, messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error calling WhatsApp API.",
    };
  }
}

export type FollowUpDecision =
  | { action: "send"; booth: BoothPublicInfo }
  | { action: "skip"; reason: string; status: "skipped" };

export function decideWhatsAppFollowUp(options: {
  consent: boolean;
  booth: BoothPublicInfo | null;
  recentlySent: boolean;
}): FollowUpDecision {
  if (!options.consent) {
    return {
      action: "skip",
      reason: "Visitor did not consent to WhatsApp contact.",
      status: "skipped",
    };
  }

  if (!options.booth) {
    return {
      action: "skip",
      reason: "Booth settings not found — create the booth in Admin → Booths.",
      status: "skipped",
    };
  }

  if (!options.booth.whatsapp_enabled) {
    return {
      action: "skip",
      reason: "WhatsApp follow-up is disabled for this booth.",
      status: "skipped",
    };
  }

  if (!isWhatsAppConfigured()) {
    return {
      action: "skip",
      reason: "WhatsApp Cloud API credentials are not configured on the server.",
      status: "skipped",
    };
  }

  if (options.recentlySent) {
    return {
      action: "skip",
      reason: "A WhatsApp message was already sent to this number for this booth within 24 hours.",
      status: "skipped",
    };
  }

  return { action: "send", booth: options.booth };
}
