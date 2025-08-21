import { createClient } from "@supabase/supabase-js";

// Environment variables (loaded from .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Safety check
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local");
}

// Create a single Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
