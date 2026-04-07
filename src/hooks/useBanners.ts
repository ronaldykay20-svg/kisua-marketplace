import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  extra_images?: string[];
  format: string;
  bg_color: string;
  sort_order: number;
  is_active: boolean;
  text_position?: string;
}

export const useBanners = (format?: string) => {
  return useQuery({
    queryKey: ["banners", format],
    queryFn: async () => {
      let q = supabase.from("banners").select("*").eq("is_active", true).order("sort_order").order("created_at");
      if (format) q = q.eq("format", format);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Banner[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
