import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingToMidnight } from "@/lib/flashTime";

// ─────────────────────────────────────────────────────────────────────────
// Ofertas relâmpago — tira horizontal de mini-cards (imagem pequena +
// selo de desconto + preço), no mesmo espírito do "Bundle deals" da
// AliExpress / "SuperOfertas" da Shein. Compacto e denso de propósito:
// o objetivo é caber muita oferta visível em pouco espaço vertical,
// sem pesar a página (sem imagens extra, sem libs — só a query de
// produtos que já têm desconto real cadastrado).
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
        .select("id, title, price, old_price, discount_percent, image_url")
        .eq("is_active", true)
        .gt("discount_percent", 0)
        .order("discount_percent", { ascending: false })
        .limit(10);
      if (error) throw error;

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
      return list.map((p) => ({ ...p, cover_url: coverMap[p.id] }));
    },
    staleTime: 60000,
  });

  if (products.length === 0) return null;

  return (
    <section className="bg-white pt-1 pb-3">
      <div className="flex items-center justify-between px-3 mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4" style={{ color: "#e53935" }} fill="#e53935" />
          <h2 className="text-[14px] font-black" style={{ color: "#4A2E0A" }}>Ofertas relâmpago</h2>
        </div>
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

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-3 snap-x">
        {products.map((p) => {
          const img = p.cover_url || p.image_url || FALLBACK_IMG;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="flex flex-col shrink-0 w-[108px] snap-start text-left active:opacity-70 transition-opacity"
            >
              <div className="relative w-[108px] h-[108px] rounded-lg overflow-hidden bg-muted">
                <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                {!!p.discount_percent && (
                  <span
                    className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black text-white rounded-br-lg"
                    style={{ background: "#e53935" }}
                  >
                    -{p.discount_percent}%
                  </span>
                )}
              </div>
              <span className="text-[13px] font-black mt-1" style={{ color: "#1a1a1a" }}>
                {fmt(p.price)}
              </span>
              {p.old_price && (
                <span className="text-[10px] text-muted-foreground line-through">
                  {fmt(p.old_price)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FlashDealsStrip;
