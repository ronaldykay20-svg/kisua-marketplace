import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { Sparkles, Star, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  currency: string;
  rating: number | null;
  total_reviews: number | null;
  sales_count: number | null;
  stock: number | null;
  badge: string | null;
  is_featured: boolean;
  seller_id: string;
  category_id: string | null;
  cover_image_url: string | null;
  reason: "categoria_favorita" | "loja_favorita" | "popular";
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
const MIN_TO_SHOW = 4;

// "Recomendado para si" — só aparece para quem já tem histórico real de
// navegação/compra (get_recommended_products devolve [] para quem nunca viu
// nada), e só se houver pelo menos 4 produtos para mostrar. Carrossel
// arrastável, igual ao das Promoções.
const RecommendedProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["recommended_products_home", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recommended_products", { p_limit: 20 });
      if (error) throw error;
      return (data || []) as RecommendedProduct[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min — não precisa de recalcular a cada render
  });

  if (!user || products.length < MIN_TO_SHOW) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    toggleFavorite(productId);
  };

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement;
    const cardWidth = (firstCard?.offsetWidth || 150) + 10;
    el.scrollBy({ left: dir * cardWidth * 2, behavior: "smooth" });
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Recomendado para si</h2>
            <p className="text-[11px] text-muted-foreground">Baseado no que costuma ver e comprar</p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
      >
        {products.map((p) => {
          const img = p.cover_image_url || FALLBACK_IMG;
          const fav = isFavorite(p.id);
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start bg-background border border-border rounded-xl overflow-hidden cursor-pointer flex flex-col"
            >
              <div className="relative aspect-square bg-muted">
                <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                {p.discount_percent ? (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-500">
                    -{p.discount_percent}%
                  </span>
                ) : p.badge ? (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-primary">
                    {p.badge}
                  </span>
                ) : null}
                <button
                  onClick={(e) => handleHeart(e, p.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="p-2 flex flex-col gap-0.5">
                <h3 className="text-[12px] font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.4em]">
                  {p.title}
                </h3>

                {p.rating != null && Number(p.rating) > 0 && (
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-semibold text-foreground">{p.rating}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[13px] font-black text-foreground">
                    {Number(p.price).toLocaleString("pt-AO")} {p.currency || "Kz"}
                  </span>
                </div>
                {p.old_price && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    {Number(p.old_price).toLocaleString("pt-AO")} {p.currency || "Kz"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-1.5">
        ↔ Arraste para ver mais
      </p>
    </section>
  );
};

export default RecommendedProducts;
