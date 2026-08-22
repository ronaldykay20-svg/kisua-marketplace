import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingToMidnight } from "@/lib/flashTime";

// ─────────────────────────────────────────────────────────────────────────
// Ofertas relâmpago — exatamente 3 produtos, fixos e centralizados, sem
// scroll (nada de um 4º card "espiando" na borda). Ao tocar num deles,
// abre a página de campanha com esse produto em destaque no topo. Mesmo
// formato de card usado em toda a página de campanha: foto + selo de
// vendedor sobreposto + preço + vendidos.
// ─────────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(n);

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop";

interface FlashProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  sales_count: number | null;
  company_id: string | null;
  store_name: string | null;
  cover_url?: string;
  image_url: string | null;
}

const FlashDealsStrip = () => {
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(getRemainingToMidnight());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getRemainingToMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: products = [] } = useQuery({
    queryKey: ["flash_deals_strip"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent, sales_count, company_id, image_url")
        .eq("is_active", true)
        .gt("discount_percent", 0)
        .order("discount_percent", { ascending: false })
        .limit(3);

      if (error) {
        // Antes, um erro aqui fazia a secção sumir sem deixar rasto nenhum.
        // Agora fica registado na consola do navegador (F12 → Console),
        // pra dar pra saber exatamente o que a Supabase respondeu.
        console.error("[FlashDealsStrip] erro ao buscar produtos:", error);
        return [];
      }

      const list = (data as FlashProduct[]) || [];
      const ids = list.map((p) => p.id);
      let coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      // O nome da loja não vive em products — vem de companies (ligada
      // por company_id). Busca à parte, como já se faz em ProductDetail.
      const companyIds = [...new Set(list.map((p) => p.company_id).filter(Boolean))] as string[];
      let storeNameMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        (companies || []).forEach((c: any) => { storeNameMap[c.id] = c.name; });
      }

      return list.map((p) => ({
        ...p,
        cover_url: coverMap[p.id],
        store_name: p.company_id ? storeNameMap[p.company_id] || null : null,
      }));
    },
    staleTime: 60000,
  });

  if (products.length === 0) return null;

  return (
    <section className="bg-white pt-1 pb-3">
      <div className="flex items-center justify-end px-3 mb-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-semibold">termina em</span>
          <span
            className="text-[11px] font-black text-white px-1.5 py-0.5 rounded font-mono"
            style={{ background: "#e53935" }}
          >
            {remaining}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-3">
        {products.map((p) => {
          const img = p.cover_url || p.image_url || FALLBACK_IMG;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/campanha/ofertas-relampago?produto=${p.id}`)}
              className="flex flex-col text-left rounded-xl overflow-hidden bg-white border active:opacity-80 transition-opacity"
              style={{ borderColor: "#F0EBDF" }}
            >
              <div className="relative w-full aspect-square bg-muted">
                <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                {!!p.discount_percent && (
                  <span
                    className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black text-white rounded-br-lg"
                    style={{ background: "#e53935" }}
                  >
                    -{p.discount_percent}%
                  </span>
                )}
                {p.store_name && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/55 backdrop-blur-sm px-1.5 py-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                    <span className="text-[9.5px] font-semibold text-white truncate">{p.store_name}</span>
                  </span>
                )}
              </div>
              <div className="px-1.5 py-1.5">
                <span className="text-[13px] font-black block" style={{ color: "#1a1a1a" }}>{fmt(p.price)}</span>
                {p.old_price && (
                  <span className="text-[10px] text-muted-foreground line-through block">{fmt(p.old_price)}</span>
                )}
                {!!p.sales_count && (
                  <span className="text-[9.5px] text-muted-foreground block">🔥 {p.sales_count}+ vendidos</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FlashDealsStrip;
