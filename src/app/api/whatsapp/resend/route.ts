import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-api";
import {
  createSupabaseServiceClient,
  createSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { fetchBoothById, toBoothPublicInfo } from "@/lib/booths";
import {
  fetchLeadById,
  hasRecentWhatsAppSend,
  updateLeadWhatsApp,
} from "@/lib/leads-server";
import { decideWhatsAppFollowUp, sendWhatsAppTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";

function getWriteClient() {
  try {
    return createSupabaseServiceClient();
  } catch {
    return createSupabaseClient();
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminUser();
  if (auth.response) return auth.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { leadId?: string };
  const leadId = (body.leadId ?? "").trim();
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }

  const client = getWriteClient();
  const lead = await fetchLeadById(client, leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (!lead.consent) {
    return NextResponse.json(
      { error: "Cannot resend — visitor did not consent to WhatsApp contact." },
      { status: 400 }
    );
  }

  if (lead.whatsapp_status !== "failed" && lead.whatsapp_status !== "skipped") {
    return NextResponse.json(
      {
        error: `Resend is only available for failed/skipped leads (current: ${lead.whatsapp_status ?? "none"}).`,
      },
      { status: 400 }
    );
  }

  const phoneDigits = lead.phone_digits || lead.phone.replace(/\D/g, "").slice(-10);
  const booth = await fetchBoothById(client, lead.booth_id);
  const recentlySent = await hasRecentWhatsAppSend(client, lead.booth_id, phoneDigits);

  const decision = decideWhatsAppFollowUp({
    consent: true,
    booth: booth ? toBoothPublicInfo(booth) : null,
    recentlySent,
  });

  if (decision.action === "skip") {
    await updateLeadWhatsApp(client, lead.id, {
      whatsapp_status: "skipped",
      whatsapp_error: decision.reason,
      whatsapp_message_id: lead.whatsapp_message_id,
      whatsapp_sent_at: lead.whatsapp_sent_at,
    });
    return NextResponse.json({
      ok: false,
      status: "skipped",
      error: decision.reason,
    });
  }

  const sendResult = await sendWhatsAppTemplate({
    toDigits: phoneDigits,
    visitorName: lead.name,
    brandName: decision.booth.brand_name,
    boothLocation: decision.booth.booth_location,
    brochureUrl: decision.booth.brochure_url,
  });

  if (!sendResult.ok) {
    await updateLeadWhatsApp(client, lead.id, {
      whatsapp_status: "failed",
      whatsapp_error: sendResult.error,
      whatsapp_message_id: null,
      whatsapp_sent_at: null,
    });
    return NextResponse.json({
      ok: false,
      status: "failed",
      error: sendResult.error,
    });
  }

  const sentAt = new Date().toISOString();
  await updateLeadWhatsApp(client, lead.id, {
    whatsapp_status: "sent",
    whatsapp_message_id: sendResult.messageId,
    whatsapp_error: null,
    whatsapp_sent_at: sentAt,
  });

  return NextResponse.json({
    ok: true,
    status: "sent",
    messageId: sendResult.messageId,
  });
}
