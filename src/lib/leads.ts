import { createSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Lead, LeadInsert } from "@/types/lead";

const DEMO_LEADS: Lead[] = [
  {
    id: "demo-1",
    booth_id: "booth-a1",
    name: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya@example.com",
    notes: "Asked about pricing",
    created_at: new Date().toISOString(),
    source: "voice",
    consent: true,
    consent_at: new Date().toISOString(),
    phone_digits: "9876543210",
    whatsapp_status: "delivered",
    whatsapp_message_id: "wamid.demo1",
    whatsapp_error: null,
    whatsapp_sent_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    booth_id: "booth-a1",
    name: "James Chen",
    phone: "+91 91234 56789",
    email: null,
    notes: "Interested in enterprise plan",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    source: "manual",
    consent: true,
    consent_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    phone_digits: "9123456789",
    whatsapp_status: "failed",
    whatsapp_message_id: null,
    whatsapp_error: "Demo failure — use Resend after connecting WhatsApp.",
    whatsapp_sent_at: null,
  },
  {
    id: "demo-3",
    booth_id: "booth-b2",
    name: "Amelia Rossi",
    phone: "+91 99887 76655",
    email: "amelia@example.com",
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    source: "voice",
    consent: true,
    consent_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    phone_digits: "9988776655",
    whatsapp_status: "skipped",
    whatsapp_message_id: null,
    whatsapp_error: "WhatsApp disabled for booth (demo).",
    whatsapp_sent_at: null,
  },
  {
    id: "demo-4",
    booth_id: "booth-c3",
    name: "Rahul Mehta",
    phone: "+91 90123 45678",
    email: null,
    notes: "Wants a demo tomorrow",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    source: "voice",
    consent: true,
    consent_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    phone_digits: "9012345678",
    whatsapp_status: "sent",
    whatsapp_message_id: "wamid.demo4",
    whatsapp_error: null,
    whatsapp_sent_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
];

const LEAD_SELECT =
  "id, booth_id, name, phone, email, notes, created_at, source, consent, consent_at, phone_digits, whatsapp_status, whatsapp_message_id, whatsapp_error, whatsapp_sent_at";

function createLocalLead(payload: LeadInsert): Lead {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    booth_id: payload.booth_id,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || null,
    notes: payload.notes ?? null,
    created_at: now,
    source: payload.source ?? "voice",
    consent: payload.consent ?? false,
    consent_at: payload.consent_at ?? (payload.consent ? now : null),
    phone_digits: payload.phone_digits ?? null,
    whatsapp_status: payload.whatsapp_status ?? "skipped",
    whatsapp_message_id: payload.whatsapp_message_id ?? null,
    whatsapp_error: payload.whatsapp_error ?? null,
    whatsapp_sent_at: payload.whatsapp_sent_at ?? null,
  };
}

/**
 * Save a lead via the server API (consent + WhatsApp follow-up run server-side).
 */
export async function saveLead(payload: LeadInsert & { consent: boolean }): Promise<Lead> {
  if (!payload.consent) {
    throw new Error("Consent is required.");
  }

  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booth_id: payload.booth_id,
      name: payload.name,
      phone: payload.phone,
      notes: payload.notes ?? null,
      source: payload.source ?? "voice",
      consent: true,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    lead?: Lead;
    error?: string;
  };

  if (!response.ok || !data.lead) {
    // Offline / API missing: keep local fallback for demos without Supabase
    if (!isSupabaseConfigured() && typeof window !== "undefined") {
      const localLead = createLocalLead({ ...payload, consent: true });
      const existing = readLocalLeads();
      writeLocalLeads([localLead, ...existing]);
      return localLead;
    }
    throw new Error(data.error || "Failed to save lead.");
  }

  if (!isSupabaseConfigured() && typeof window !== "undefined") {
    const existing = readLocalLeads();
    writeLocalLeads([data.lead, ...existing]);
  }

  return data.lead;
}

export async function fetchLeads(): Promise<{
  leads: Lead[];
  source: "supabase" | "demo";
}> {
  if (!isSupabaseConfigured()) {
    const local = typeof window !== "undefined" ? readLocalLeads() : [];
    return {
      leads: [...local, ...DEMO_LEADS],
      source: "demo",
    };
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    // Older DB without WhatsApp columns — fall back to core fields
    if (/consent|whatsapp|phone_digits/i.test(error.message)) {
      const fallback = await supabase
        .from("leads")
        .select("id, booth_id, name, phone, email, notes, created_at, source")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        throw new Error(
          fallback.error.message.includes("permission") || fallback.error.code === "42501"
            ? "Unable to read leads. Sign in as an admin, or run supabase/migrate-auth-select.sql if RLS is misconfigured."
            : fallback.error.message
        );
      }

      const mapped = ((fallback.data as Omit<Lead, "consent">[]) ?? []).map((row) => ({
        ...row,
        consent: false,
        consent_at: null,
        phone_digits: null,
        whatsapp_status: null,
        whatsapp_message_id: null,
        whatsapp_error: null,
        whatsapp_sent_at: null,
      })) as Lead[];

      return { leads: mapped, source: "supabase" };
    }

    throw new Error(
      error.message.includes("permission") || error.code === "42501"
        ? "Unable to read leads. Sign in as an admin, or run supabase/migrate-auth-select.sql if RLS is misconfigured."
        : error.message
    );
  }

  return { leads: (data as Lead[]) ?? [], source: "supabase" };
}

export async function resendWhatsApp(leadId: string): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
  messageId?: string;
}> {
  const response = await fetch("/api/whatsapp/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    status?: string;
    error?: string;
    messageId?: string;
  };
  if (!response.ok) {
    return { ok: false, error: data.error || "Resend failed." };
  }
  return {
    ok: Boolean(data.ok),
    status: data.status,
    error: data.error,
    messageId: data.messageId,
  };
}

const LOCAL_STORAGE_KEY = "expolead.local-leads";

function readLocalLeads(): Lead[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Lead[];
  } catch {
    return [];
  }
}

function writeLocalLeads(leads: Lead[]): void {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
}
