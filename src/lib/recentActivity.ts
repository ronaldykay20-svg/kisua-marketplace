import { supabase } from "@/integrations/supabase/client";

export interface RecentActivityItem {
  title: string;
  province: string | null;
  created_at: string;
}

export async function fetchRecentActivity(limit = 12): Promise<RecentActivityItem[]> {
  const { data, error } = await (supabase as any).rpc("list_recent_activity", { p_limit: limit });
  if (error) throw error;
  return data || [];
}
