import type { LeadStatus } from "@/types/lead";

export type LeadRow = {
  id: string;
  booth_id: string;
  name: string;
  phone: string;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

export type LeadInsert = {
  id?: string;
  booth_id: string;
  name: string;
  phone: string;
  notes?: string | null;
  status?: LeadStatus;
  created_at?: string;
  updated_at?: string;
};

export type LeadUpdate = {
  id?: string;
  booth_id?: string;
  name?: string;
  phone?: string;
  notes?: string | null;
  status?: LeadStatus;
  created_at?: string;
  updated_at?: string;
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
      lead_status: LeadStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
