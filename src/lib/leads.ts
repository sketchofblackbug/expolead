import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Lead, LeadInsert } from "@/types/lead";

const DEMO_LEADS: Lead[] = [
  {
    id: "demo-1",
    booth_id: "booth-a1",
    name: "Priya Sharma",
    phone: "+91 98765 43210",
    notes: null,
    status: "new",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "demo-2",
    booth_id: "booth-a1",
    name: "James Chen",
    phone: "+1 415 555 0198",
    notes: "Interested in enterprise plan",
    status: "contacted",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "demo-3",
    booth_id: "booth-b2",
    name: "Amelia Rossi",
    phone: "+39 333 123 4567",
    notes: null,
    status: "qualified",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];

function createLocalLead(payload: LeadInsert): Lead {
  const now = new Date().toISOString();
  return {
    id: `local-${crypto.randomUUID()}`,
    booth_id: payload.booth_id,
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    notes: payload.notes ?? null,
    status: payload.status ?? "new",
    created_at: now,
    updated_at: now,
  };
}

export async function saveLead(payload: LeadInsert): Promise<Lead> {
  if (!isSupabaseConfigured()) {
    const lead = createLocalLead(payload);
    if (typeof window !== "undefined") {
      const existing = readLocalLeads();
      writeLocalLeads([lead, ...existing]);
    }
    return lead;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      booth_id: payload.booth_id,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      notes: payload.notes ?? null,
      status: payload.status ?? "new",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Lead;
}

export async function fetchLeads(): Promise<{ leads: Lead[]; source: "supabase" | "demo" }> {
  if (!isSupabaseConfigured()) {
    const local = typeof window !== "undefined" ? readLocalLeads() : [];
    return {
      leads: [...local, ...DEMO_LEADS],
      source: "demo",
    };
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { leads: DEMO_LEADS, source: "demo" };
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
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
