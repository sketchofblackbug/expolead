import type { TypedSupabaseClient } from "@/lib/supabase";
import { toLocalPhoneDigits } from "@/lib/whatsapp";
import type { Lead, WhatsAppStatus } from "@/types/lead";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const LEAD_SELECT =
  "id, booth_id, name, phone, email, notes, created_at, source, consent, consent_at, phone_digits, whatsapp_status, whatsapp_message_id, whatsapp_error, whatsapp_sent_at";

export async function hasRecentWhatsAppSend(
  client: TypedSupabaseClient,
  boothId: string,
  phoneDigits: string
): Promise<boolean> {
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  const { data, error } = await client
    .from("leads")
    .select("id, whatsapp_status, whatsapp_sent_at")
    .eq("booth_id", boothId)
    .eq("phone_digits", phoneDigits)
    .gte("whatsapp_sent_at", since)
    .in("whatsapp_status", ["sent", "delivered", "read"])
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

export async function updateLeadWhatsApp(
  client: TypedSupabaseClient,
  leadId: string,
  patch: {
    whatsapp_status: WhatsAppStatus | string;
    whatsapp_message_id?: string | null;
    whatsapp_error?: string | null;
    whatsapp_sent_at?: string | null;
  }
): Promise<void> {
  const { error } = await client
    .from("leads")
    .update({
      whatsapp_status: patch.whatsapp_status,
      whatsapp_message_id: patch.whatsapp_message_id ?? null,
      whatsapp_error: patch.whatsapp_error ?? null,
      whatsapp_sent_at: patch.whatsapp_sent_at ?? null,
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateLeadWhatsAppByMessageId(
  client: TypedSupabaseClient,
  messageId: string,
  status: WhatsAppStatus | string,
  errorMessage?: string | null
): Promise<boolean> {
  const patch: {
    whatsapp_status: string;
    whatsapp_error?: string | null;
  } = {
    whatsapp_status: status,
  };

  if (status === "failed" && errorMessage) {
    patch.whatsapp_error = errorMessage;
  }

  const { data, error } = await client
    .from("leads")
    .update(patch)
    .eq("whatsapp_message_id", messageId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function fetchLeadById(
  client: TypedSupabaseClient,
  leadId: string
): Promise<Lead | null> {
  const { data, error } = await client
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Lead | null) ?? null;
}

export function normalizeLeadPhoneDigits(phone: string): string {
  return toLocalPhoneDigits(phone);
}
