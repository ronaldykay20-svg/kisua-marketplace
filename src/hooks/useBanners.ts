import { useMemo } from "react";
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
  text_layout?: "before" | "over" | "after";
  text_align?: "left" | "center" | "right";
  text_color?: string | null;
  text_bg_color?: string | null;
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

/**
 * Devolve o conjunto de slots (sort_order) que TÊM banner activo para o
 * device pedido, mais isLoading. Reaproveita a mesma queryKey de
 * useBanners(undefined, device), por isso não faz nenhum pedido extra à
 * rede — só reprocessa os dados já em cache.
 *
 * Serve para o Index.tsx decidir, ANTES de renderizar, se vale a pena
 * reservar espaço (placeholder) para um slot: slots sem banner não devem
 * reservar altura nenhuma, senão ao tornarem-se visíveis colapsam de
 * repente e o scroll "salta".
 *
 * IMPORTANTE: enquanto isLoading é true (a busca dos banners ainda não
 * respondeu), o chamador deve continuar a reservar espaço normalmente —
 * só deve deixar de reservar quando isLoading for false E o slot não
 * estiver no conjunto. Decidir com base só no conjunto (que começa vazio
 * antes da busca responder) faz os banners "aparecerem de repente" e
 * empurrarem o conteúdo para baixo assim que a busca termina — foi isso
 * que causou o novo salto/travamento no scroll.
 */
export const useOccupiedBannerSlots = (device: DeviceLayout) => {
  const { data: banners = [], isLoading } = useBanners(undefined, device);
  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    for (const b of banners) {
      const matches = b.device === device || (!b.device && device === "mobile");
      if (matches) set.add(b.sort_order);
    }
    return set;
  }, [banners, device]);
  return { occupiedSlots, isLoading };
};
