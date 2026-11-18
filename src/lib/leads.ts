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
  },
  {
    id: "demo-2",
    booth_id: "booth-a1",
    name: "James Chen",
    phone: "+1 415 555 0198",
    email: null,
    notes: "Interested in enterprise plan",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    source: "manual",
  },
  {
    id: "demo-3",
    booth_id: "booth-b2",
    name: "Amelia Rossi",
    phone: "+39 333 123 4567",
    email: "amelia@example.com",
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    source: "voice",
  },
  {
    id: "demo-4",
    booth_id: "booth-c3",
    name: "Rahul Mehta",
    phone: "+91 91234 56789",
    email: null,
    notes: "Wants a demo tomorrow",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    source: "voice",
  },
];

function createLocalLead(payload: LeadInsert): Lead {
  return {
    id: crypto.randomUUID(),
    booth_id: payload.booth_id,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || null,
    notes: payload.notes ?? null,
    created_at: new Date().toISOString(),
    source: payload.source ?? "voice",
  };
}

export async function saveLead(payload: LeadInsert): Promise<Lead> {
  const localLead = createLocalLead(payload);

  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      const existing = readLocalLeads();
      writeLocalLeads([localLead, ...existing]);
    }
    return localLead;
  }

  const supabase = createSupabaseClient();

  const { error } = await supabase.from("leads").insert({
    booth_id: localLead.booth_id,
    name: localLead.name,
    phone: localLead.phone,
    email: localLead.email,
    notes: localLead.notes,
    source: localLead.source,
  });

  if (error) {
    throw new Error(error.message);
  }

  return localLead;
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
    .select("id, booth_id, name, phone, email, notes, created_at, source")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      error.message.includes("permission") || error.code === "42501"
        ? "Unable to read leads. Sign in as an admin, or run supabase/migrate-auth-select.sql if RLS is misconfigured."
        : error.message
    );
  }

  return { leads: (data as Lead[]) ?? [], source: "supabase" };
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
