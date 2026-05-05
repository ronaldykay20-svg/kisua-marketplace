import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Star, Heart, ShoppingCart, Flame, ChevronRight, Shield } from "lucide-react";

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
      const coverMap: Record<string, string> = {};
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

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-bold text-foreground">Ofertas imperdíveis</h2>
        </div>
        <button onClick={() => navigate("/promocoes")} className="flex items-center gap-0.5 text-sm font-semibold text-[#c8a97e]">
          Ver todas <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 6).map((p: any) => {
          const img = p.cover_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
          return (
            <div key={p.id} className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border flex flex-col">
              <button onClick={() => navigate(`/produto/${p.id}`)} className="relative aspect-square bg-muted block">
                <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                {p.discount_percent && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-bold text-white bg-red-500">
                    -{p.discount_percent}%
                  </span>
                )}
                {p.badge && (
                  <span className="absolute top-2 right-9 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-orange-500">
                    {p.badge}
                  </span>
                )}
                <span onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-muted-foreground shadow">
                  <Heart className="w-3.5 h-3.5" />
                </span>
              </button>

              <div className="p-3 flex flex-col flex-1">
                <h3 className="text-[14px] font-bold text-foreground line-clamp-1 mb-1">{p.title}</h3>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-foreground">{p.rating || 0}</span>
                  {p.review_count > 0 && <span>({p.review_count})</span>}
                  <span className="text-muted-foreground/50">|</span>
                  <span>{p.sold_count || 0} vendidos</span>
                </div>

                {p.discount_percent ? (
                  <span className="self-start mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                    <Flame className="w-3 h-3" /> -{p.discount_percent}% hoje
                  </span>
                ) : p.free_shipping ? (
                  <span className="self-start mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    <Shield className="w-3 h-3" /> Compra segura
                  </span>
                ) : null}

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[16px] font-black text-red-500">
                    {Number(p.price).toLocaleString("pt-AO")} Kz
                  </span>
                  {p.old_price && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {Number(p.old_price).toLocaleString("pt-AO")} Kz
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <button onClick={(e) => e.stopPropagation()} className="w-9 h-9 rounded-xl bg-[#f5e6d0] flex items-center justify-center text-[#c8a97e]">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                  <button onClick={() => navigate(`/produto/${p.id}`)} className="flex-1 h-9 rounded-xl text-white text-[12px] font-bold flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}>
                    <ShoppingCart className="w-3.5 h-3.5" /> Adicionar
                  </button>
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
