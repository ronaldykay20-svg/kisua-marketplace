import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap, Star, Truck } from "lucide-react";

const PromoProductCards = () => {
  const navigate = useNavigate();

  const { data: products = [] } = useQuery({
    queryKey: ["promo_products_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("discount_percent", "is", null)
        .gt("discount_percent", 0)
        .order("discount_percent", { ascending: false })
        .limit(20);
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
    },
  });

  if (products.length === 0) return null;

  const colors = [
    "from-walmart-red/10 to-walmart-orange/5",
    "from-primary/10 to-primary/5",
    "from-accent/10 to-accent/5",
    "from-secondary/10 to-secondary/5",
    "from-destructive/10 to-destructive/5",
  ];

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-card flex items-center justify-center" style={{ background: "var(--promo-gradient)" }}>
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Promoções imperdíveis</h2>
          <p className="text-[10px] text-muted-foreground">Os melhores descontos do momento</p>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p: any, i: number) => {
          const img = p.cover_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
          const colorClass = colors[i % colors.length];
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className={`flex-shrink-0 w-[calc(50%-5px)] sm:w-[calc(33.333%-7px)] md:w-[calc(25%-8px)] bg-gradient-to-br ${colorClass} rounded-card border border-border overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                {p.discount_percent && (
                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black text-primary-foreground animate-pulse"
                    style={{ background: "var(--promo-gradient)" }}>
                    -{p.discount_percent}%
                  </span>
                )}
                {p.badge && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-primary-foreground bg-walmart-red">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight mb-1.5">{p.title}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-destructive">{Number(p.price).toLocaleString("pt-AO")} Kz</span>
                </div>
                {p.old_price && (
                  <span className="text-[10px] text-muted-foreground line-through">{Number(p.old_price).toLocaleString("pt-AO")} Kz</span>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {p.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-secondary fill-secondary" />
                      <span className="text-[9px] text-muted-foreground">{p.rating}</span>
                    </div>
                  )}
                  {p.free_shipping && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-accent">
                      <Truck className="w-2.5 h-2.5" /> Grátis
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PromoProductCards;
