import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Report {
  id: string;
  user_email: string;
  user_name: string;
  user_id: string;
  images: string[];
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  category: string;
  description: string;
  nagar_nigam: string;
  voice_note: string | null;
  status: "submitted" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
}

export interface MunicipalAdmin {
  id: string; // UUID
  email: string;
  name: string;
  nagar_nigam: string;
  created_at: string; // timestamp with timezone (ISO string)
}
