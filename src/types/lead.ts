export type LeadSource = "voice" | "manual" | "form";

export interface Lead {
  id: string;
  booth_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  source: string;
}

export interface LeadInsert {
  booth_id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  source?: string;
}

export interface LeadCaptureFormState {
  name: string;
  phone: string;
  email: string;
}

export type CaptureMode = "idle" | "listening" | "review" | "saving" | "success" | "error";

export interface BoothInfo {
  id: string;
  name: string;
  company?: string;
}
