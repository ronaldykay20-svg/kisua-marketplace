import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DeviceLayout } from "@/hooks/useDeviceLayout";

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
  extra_links?: string[];
  category_id?: string | null;
  device?: DeviceLayout | null;
  split_side?: "left" | "right" | null;
}

/**
 * Devolve banners activos.
 * @param format   — filtra por formato (opcional)
 * @param device   — filtra por dispositivo; se não definido, devolve tudo
 */
export const useBanners = (format?: string, device?: DeviceLayout) => {
  return useQuery({
    queryKey: ["banners", format, device],
    queryFn: async () => {
      let q = supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");

      if (format) q = q.eq("format", format);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as Banner[];

      /* Sem filtro de device — devolve tudo */
      if (!device) return rows;

      /*
       * Filtra estritamente pelo device pedido.
       * Banners sem device definido só aparecem no mobile (fallback).
       */
      return rows.filter((b) => {
        if (b.device === device) return true;
        // fallback: banners sem device só servem o mobile
        if (!b.device && device === "mobile") return true;
        return false;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};
