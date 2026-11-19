import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { updateLeadWhatsAppByMessageId } from "@/lib/leads-server";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * Meta webhook verification (GET).
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const config = getWhatsAppConfig();
  const verifyToken = config?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

type StatusPayload = {
  id?: string;
  status?: string;
  errors?: Array<{ message?: string; title?: string }>;
};

type WebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        statuses?: StatusPayload[];
      };
    }>;
  }>;
};

/**
 * Delivery status callbacks (POST).
 * Maps Meta statuses → lead.whatsapp_status (delivered / read / failed).
 */
export async function POST(request: Request) {
  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Always ACK quickly so Meta doesn't retry; process best-effort
  try {
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    let client;
    try {
      client = createSupabaseServiceClient();
    } catch {
      return NextResponse.json({ ok: true, warning: "service role missing" });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          const messageId = status.id;
          const raw = (status.status ?? "").toLowerCase();
          if (!messageId || !raw) continue;

          let mapped: string | null = null;
          if (raw === "delivered") mapped = "delivered";
          else if (raw === "read") mapped = "read";
          else if (raw === "failed") mapped = "failed";
          else if (raw === "sent") mapped = "sent";

          if (!mapped) continue;

          const errorMessage =
            status.errors?.[0]?.message || status.errors?.[0]?.title || null;

          try {
            await updateLeadWhatsAppByMessageId(
              client,
              messageId,
              mapped,
              mapped === "failed" ? errorMessage : null
            );
          } catch {
            // swallow per-status errors; still ACK webhook
          }
        }
      }
    }
  } catch {
    // still return 200 to avoid webhook disablement
  }

  return NextResponse.json({ ok: true });
}
