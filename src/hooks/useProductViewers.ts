import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Contagem REAL (não simulada) de quantas pessoas estão, neste preciso
 * momento, na página de detalhe de um produto — usando Presence do
 * Supabase Realtime.
 *
 * - `track = true`  → esta instância CONTA como uma pessoa a ver (usar na
 *   própria página de detalhe do produto, ProductDetail.tsx).
 * - `track = false` → esta instância só LÊ o número, sem se contar a si
 *   própria (usar em cards de listagem/feed, InfiniteProducts.tsx).
 * - `enabled = false` → não abre/mantém ligação nenhuma (poupa recursos —
 *   útil para só subscrever enquanto o card está visível no ecrã).
 *
 * O número devolvido é sempre o real: se ninguém estiver a ver o produto
 * agora, é 0 — não há piso artificial.
 */
export function useProductViewers(
  productId: string | null | undefined,
  options: { track?: boolean; enabled?: boolean } = {}
) {
  const { track = false, enabled = true } = options;
  const [count, setCount] = useState(0);
  const keyRef = useRef<string>(`${Date.now()}_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!productId || !enabled) return;

    const channel = supabase.channel(`product_viewers_${productId}`, {
      config: { presence: { key: keyRef.current } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && track) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, track, enabled]);

  return count;
}
