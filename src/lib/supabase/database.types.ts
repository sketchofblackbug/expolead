export type LeadSource = "voice" | "manual" | "form" | string;

export type LeadRow = {
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
  whatsapp_status: string | null;
  whatsapp_message_id: string | null;
  whatsapp_error: string | null;
  whatsapp_sent_at: string | null;
};

export type LeadInsert = {
  id?: string;
  booth_id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
  source?: string;
  consent?: boolean;
  consent_at?: string | null;
  phone_digits?: string | null;
  whatsapp_status?: string | null;
  whatsapp_message_id?: string | null;
  whatsapp_error?: string | null;
  whatsapp_sent_at?: string | null;
};

export type LeadUpdate = Partial<LeadInsert>;

export type BoothRow = {
  id: string;
  brand_name: string;
  booth_location: string;
  brochure_url: string;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type BoothInsert = {
  id: string;
  brand_name: string;
  booth_location?: string;
  brochure_url?: string;
  whatsapp_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type BoothUpdate = Partial<Omit<BoothInsert, "id">> & { id?: string };

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: [];
      };
      booths: {
        Row: BoothRow;
        Insert: BoothInsert;
        Update: BoothUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
