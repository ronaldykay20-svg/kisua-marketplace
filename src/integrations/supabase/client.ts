import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://acpypesqcyjpmmsquvxj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcHlwZXNxY3lqcG1tc3F1dnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTU0NzksImV4cCI6MjA5MDczMTQ3OX0.20Nx9nSbOUDpNoO1eNwoPdamyv7PL-274cv-n_daItI";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
