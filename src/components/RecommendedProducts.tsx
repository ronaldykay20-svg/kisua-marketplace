import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

// "Recomendado para si" — busca produtos já pensados para esta pessoa em
// concreto (get_recommended_products olha só para o perfil dela, na hora).
// Funciona também para quem não tem sessão (mostra produtos populares).
const RecommendedProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: products = [] } = useQuery({
    queryKey: ["recommended_products_home", user?.id || "anon"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recommended_products", { p_limit: 12 });
      if (error) throw error;
      return (data || []) as RecommendedProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 min — não precisa de recalcular a cada render
  });

  if (products.length === 0) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Recomendado para si</h2>
          <p className="text-[11px] text-muted-foreground">
            {user ? "Baseado no que costuma ver e comprar" : "Os produtos mais procurados"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {products.map((p) => {
          const img = p.cover_image_url || FALLBACK_IMG;
          const fav = isFavorite(p.id);
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-background border border-border rounded-xl overflow-hidden cursor-pointer flex flex-col"
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
    </section>
  );
};

export default RecommendedProducts;
