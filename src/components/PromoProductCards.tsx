import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap, Star, Truck, Heart, ArrowRight, ChevronRight, Flame, Trophy } from "lucide-react";
import { useState, useRef } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PromoProductCards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const firstCard = el.firstElementChild as HTMLElement;
    const cardWidth = firstCard?.offsetWidth || el.offsetWidth;
    const perView = Math.max(1, Math.round(el.offsetWidth / cardWidth));
    setItemsPerView(perView);
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(index);
  };

  const totalPages = Math.ceil(products.length / itemsPerView);
  const activePage = Math.floor(activeIndex / itemsPerView);

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--promo-gradient)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Promoções imperdíveis</h2>
            <p className="text-[11px] text-muted-foreground">Os melhores descontos do momento</p>
          </div>
        </div>
        <button onClick={() => navigate("/promocoes")} className="flex items-center gap-1 text-sm font-semibold text-primary">
          Ver mais <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="border border-border rounded-2xl p-3 bg-background relative">
        <div ref={scrollRef} onScroll={handleScroll} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {products.map((p: any) => {
            const img = p.cover_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
            const fav = isFavorite(p.id);
            return (
              <div key={p.id} className="flex-shrink-0 w-[calc(100%-8px)] sm:w-[calc(50%-6px)] snap-start flex flex-row gap-3 bg-background rounded-xl overflow-hidden">
                <div className="relative w-[140px] min-w-[140px] aspect-square rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  {p.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-500">{p.badge}</span>
                  )}
                  {p.discount_percent && !p.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-green-500">-{p.discount_percent}%</span>
                  )}
                </div>

                <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {p.is_trending && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                        <Flame className="w-3 h-3" /> Em alta
                      </span>
                    )}
                    {p.is_bestseller && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                        <Trophy className="w-3 h-3" /> Campeão de vendas
                      </span>
                    )}
                    {p.discount_percent && (p.badge || p.is_trending || p.is_bestseller) && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">-{p.discount_percent}%</span>
                    )}
                  </div>

                  <h3 className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug mb-0.5">{p.title}</h3>

                  {p.store_name && (
                    <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                      Loja: <span className="font-medium text-foreground">{p.store_name}</span>
                      <span className="text-blue-500">✓</span>
                    </p>
                  )}

                  {p.rating > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[11px] font-semibold text-foreground">{p.rating}</span>
                      {p.review_count > 0 && <span className="text-[10px] text-muted-foreground">({p.review_count})</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-black text-red-500">{Number(p.price).toLocaleString("pt-AO")} Kz</span>
                    {p.discount_percent && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">-{p.discount_percent}%</span>
                    )}
                  </div>

                  {p.old_price && (
                    <span className="text-[11px] text-muted-foreground line-through mb-1">{Number(p.old_price).toLocaleString("pt-AO")} Kz</span>
                  )}

                  {p.free_shipping && (
                    <div className="flex items-center gap-2 mb-2 text-[10px]">
                      <span className="flex items-center gap-1 text-green-600 font-semibold">
                        <Truck className="w-3 h-3" /> Frete grátis
                      </span>
                      <span className="text-muted-foreground">• Entrega rápida</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={(e) => handleHeart(e, p.id)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center transition-colors"
                    >
                      <Heart className={`w-4 h-4 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-muted-foreground"}`} />
                    </button>
                    <button onClick={() => navigate(`/produto/${p.id}`)} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-primary text-primary text-[12px] font-semibold hover:bg-primary hover:text-white transition-colors">
                      Explorar <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activePage ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
          ↔ Arraste para ver mais ofertas
        </p>
      </div>
    </section>
  );
};

export default PromoProductCards;
