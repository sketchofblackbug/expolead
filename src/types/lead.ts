export type LeadStatus = "new" | "contacted" | "qualified" | "archived";

export interface Lead {
  id: string;
  booth_id: string;
  name: string;
  phone: string;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  booth_id: string;
  name: string;
  phone: string;
  notes?: string | null;
  status?: LeadStatus;
}

export interface LeadCaptureFormState {
  name: string;
  phone: string;
}

export type CaptureMode = "idle" | "listening" | "review" | "saving" | "success" | "error";

export interface BoothInfo {
  id: string;
  name: string;
  company?: string;
}
