export type LeadSource = "voice" | "manual" | "form";

/** WhatsApp delivery lifecycle for a lead. */
export type WhatsAppStatus =
  | "sent"
  | "failed"
  | "skipped"
  | "delivered"
  | "read"
  | "pending";

export interface Lead {
  id: string;
  booth_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  source: string;
  consent: boolean;
  consent_at: string | null;
  phone_digits: string | null;
  whatsapp_status: WhatsAppStatus | string | null;
  whatsapp_message_id: string | null;
  whatsapp_error: string | null;
  whatsapp_sent_at: string | null;
}

export interface LeadInsert {
  booth_id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  source?: string;
  consent?: boolean;
  consent_at?: string | null;
  phone_digits?: string | null;
  whatsapp_status?: WhatsAppStatus | string | null;
  whatsapp_message_id?: string | null;
  whatsapp_error?: string | null;
  whatsapp_sent_at?: string | null;
}

export interface LeadCaptureFormState {
  name: string;
  phone: string;
  notes: string;
}

export type ListeningField = "name" | "phone" | "auto" | null;

export type CaptureMode = "idle" | "listening" | "saving" | "success" | "error";

export interface Booth {
  id: string;
  brand_name: string;
  booth_location: string;
  brochure_url: string;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoothUpsert {
  id: string;
  brand_name: string;
  booth_location?: string;
  brochure_url?: string;
  whatsapp_enabled?: boolean;
}

/** Public booth fields safe for the capture page. */
export interface BoothPublicInfo {
  id: string;
  brand_name: string;
  booth_location: string;
  brochure_url: string;
  whatsapp_enabled: boolean;
}

/** @deprecated Prefer BoothPublicInfo */
export interface BoothInfo {
  id: string;
  name: string;
  company?: string;
}
