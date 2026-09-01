import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Client is optional: the app runs fully without Supabase (privacy-first).
// It's only used to read whether the current checkout session was paid.
export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const supabaseConfigured = Boolean(url && anon);
