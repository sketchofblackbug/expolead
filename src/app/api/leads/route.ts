import { NextResponse } from "next/server";
import {
  createSupabaseClient,
  createSupabaseServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { validatePhoneNumber } from "@/lib/phone";
import { fetchBoothById, toBoothPublicInfo } from "@/lib/booths";
import {
  hasRecentWhatsAppSend,
  normalizeLeadPhoneDigits,
  updateLeadWhatsApp,
} from "@/lib/leads-server";
import { decideWhatsAppFollowUp, sendWhatsAppTemplate } from "@/lib/whatsapp";
import type { Lead } from "@/types/lead";

export const runtime = "nodejs";

type CreateLeadBody = {
  booth_id?: string;
  name?: string;
  phone?: string;
  notes?: string | null;
  source?: string;
  consent?: boolean;
};

function getWriteClient() {
  try {
    return createSupabaseServiceClient();
  } catch {
    return createSupabaseClient();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateLeadBody;
    const boothId = (body.booth_id ?? "").trim();
    const name = (body.name ?? "").trim();
    const consent = Boolean(body.consent);
    const notes = (body.notes ?? "").trim() || null;
    const source = (body.source ?? "manual").trim() || "manual";

    if (!boothId) {
      return NextResponse.json({ error: "Booth ID is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json(
        { error: "Consent is required before we can save your details or contact you." },
        { status: 400 }
      );
    }

    const phoneResult = validatePhoneNumber(body.phone ?? "");
    if (!phoneResult.valid) {
      return NextResponse.json(
        { error: phoneResult.message ?? "Invalid phone number." },
        { status: 400 }
      );
    }

    const phoneDigits = normalizeLeadPhoneDigits(phoneResult.normalized);
    const consentAt = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      const localLead: Lead = {
        id: crypto.randomUUID(),
        booth_id: boothId,
        name,
        phone: phoneResult.normalized,
        email: null,
        notes,
        created_at: consentAt,
        source,
        consent: true,
        consent_at: consentAt,
        phone_digits: phoneDigits,
        whatsapp_status: "skipped",
        whatsapp_message_id: null,
        whatsapp_error: "Supabase is not configured — lead kept locally only.",
        whatsapp_sent_at: null,
      };
      return NextResponse.json({ lead: localLead, whatsapp: { status: "skipped" } });
    }

    const client = getWriteClient();

    let boothPublic = null;
    try {
      const booth = await fetchBoothById(client, boothId);
      if (booth) boothPublic = toBoothPublicInfo(booth);
    } catch {
      boothPublic = null;
    }

    const { data: inserted, error: insertError } = await client
      .from("leads")
      .insert({
        booth_id: boothId,
        name,
        phone: phoneResult.normalized,
        notes,
        source,
        consent: true,
        consent_at: consentAt,
        phone_digits: phoneDigits,
        whatsapp_status: "pending",
      })
      .select(
        "id, booth_id, name, phone, email, notes, created_at, source, consent, consent_at, phone_digits, whatsapp_status, whatsapp_message_id, whatsapp_error, whatsapp_sent_at"
      )
      .single();

    if (insertError || !inserted) {
      const message = insertError?.message || "Failed to save lead.";
      return NextResponse.json(
        {
          error:
            /consent|whatsapp|phone_digits/i.test(message)
              ? "Database is missing WhatsApp columns. Run supabase/migrate-whatsapp.sql in the Supabase SQL Editor."
              : message,
        },
        { status: 500 }
      );
    }

    const lead = inserted as Lead;

    let recentlySent = false;
    try {
      recentlySent = await hasRecentWhatsAppSend(client, boothId, phoneDigits);
    } catch {
      recentlySent = false;
    }

    const decision = decideWhatsAppFollowUp({
      consent: true,
      booth: boothPublic,
      recentlySent,
    });

    if (decision.action === "skip") {
      try {
        await updateLeadWhatsApp(client, lead.id, {
          whatsapp_status: decision.status,
          whatsapp_error: decision.reason,
          whatsapp_message_id: null,
          whatsapp_sent_at: null,
        });
      } catch {
        // Lead is already saved — don't fail the request
      }
      return NextResponse.json({
        lead: {
          ...lead,
          whatsapp_status: decision.status,
          whatsapp_error: decision.reason,
        },
        whatsapp: { status: decision.status, reason: decision.reason },
      });
    }

    const sendResult = await sendWhatsAppTemplate({
      toDigits: phoneDigits,
      visitorName: name,
      brandName: decision.booth.brand_name,
      boothLocation: decision.booth.booth_location,
      brochureUrl: decision.booth.brochure_url,
    });

    if (sendResult.ok) {
      const sentAt = new Date().toISOString();
      try {
        await updateLeadWhatsApp(client, lead.id, {
          whatsapp_status: "sent",
          whatsapp_message_id: sendResult.messageId,
          whatsapp_error: null,
          whatsapp_sent_at: sentAt,
        });
      } catch {
        // Lead saved; status update best-effort
      }
      return NextResponse.json({
        lead: {
          ...lead,
          whatsapp_status: "sent",
          whatsapp_message_id: sendResult.messageId,
          whatsapp_error: null,
          whatsapp_sent_at: sentAt,
        },
        whatsapp: { status: "sent", messageId: sendResult.messageId },
      });
    }

    try {
      await updateLeadWhatsApp(client, lead.id, {
        whatsapp_status: "failed",
        whatsapp_message_id: null,
        whatsapp_error: sendResult.error,
        whatsapp_sent_at: null,
      });
    } catch {
      // Lead saved; status update best-effort
    }

    return NextResponse.json({
      lead: {
        ...lead,
        whatsapp_status: "failed",
        whatsapp_error: sendResult.error,
      },
      whatsapp: { status: "failed", error: sendResult.error },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unexpected error saving lead.",
      },
      { status: 500 }
    );
  }
}
