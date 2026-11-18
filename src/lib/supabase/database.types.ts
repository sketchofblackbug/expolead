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
};

export type LeadUpdate = {
  id?: string;
  booth_id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
  created_at?: string;
  source?: string;
};

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
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
