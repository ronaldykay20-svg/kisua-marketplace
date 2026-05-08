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
  /** Dispositivo alvo — se null/undefined aplica-se a todos */
  device?: DeviceLayout | null;
}

/**
 * Devolve banners activos.
 * @param format   — filtra por formato (opcional)
 * @param device   — filtra por dispositivo; também inclui banners sem device (fallback)
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

      /* Se não foi pedido filtro por device, devolve tudo */
      if (!device) return rows;

      /*
       * Filtra: inclui banners que sejam do device pedido
       * OU que não tenham device definido (servem como fallback mobile)
       */
      return rows.filter(
        (b) => !b.device || b.device === device,
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};
