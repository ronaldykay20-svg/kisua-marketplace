import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { Sparkles, Star, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { getViewedProducts, getSearchQueries } from "@/lib/recentBrowsing";

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
  reason?: string;
  basedOnCategory?: string | null;
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
const MIN_TO_SHOW = 10;
const MAX_TO_SHOW = 18;

// "Recomendado para si" — combina várias fontes para garantir sempre 10-18 produtos:
//   0. RPC get_products_by_last_viewed_category — a última categoria que o
//      user viu (tocando no menu de categorias OU abrindo um produto):
//      primeiro produtos da mesma família de subcategorias, depois da
//      mesma família de categorias (ver useCategoryTracking.ts + SQL).
//   1. RPC get_recommended_products (categorias/lojas favoritas)
//   2. Produtos vistos recentemente (localStorage)
//   3. Produtos que combinam com pesquisas recentes (localStorage)
//   4. Fallback: produtos populares (por vendas/rating)
// Deduplica e limita a MAX_TO_SHOW.
const RecommendedProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: result } = useQuery({
    queryKey: ["recommended_products_home_mixed", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<{ products: RecommendedProduct[]; basedOnCategory: string | null }> => {
      const seen = new Set<string>();
      const out: RecommendedProduct[] = [];
      let basedOnCategory: string | null = null;

      const pushMany = (rows: any[]) => {
        for (const r of rows || []) {
          if (!r?.id || seen.has(r.id)) continue;
          if (out.length >= MAX_TO_SHOW) return;
          seen.add(r.id);
          out.push(normalize(r));
        }
      };

      // 0) Última categoria vista (menu ou produto) → família de subcategorias,
      //    depois família de categorias
      try {
        const { data } = await supabase.rpc("get_products_by_last_viewed_category", { _limit: MAX_TO_SHOW });
        const rows = (data as any[]) || [];
        if (rows.length && rows[0]?.based_on_category) basedOnCategory = rows[0].based_on_category;
        pushMany(rows);
      } catch { /* ignora — segue para as outras fontes */ }

      // 1) RPC personalizada
      if (out.length < MAX_TO_SHOW) {
        try {
          const { data } = await supabase.rpc("get_recommended_products", { p_limit: MAX_TO_SHOW });
          pushMany((data as any[]) || []);
        } catch { /* ignora — segue para as outras fontes */ }
      }

      // 2) Produtos vistos recentemente
      if (out.length < MAX_TO_SHOW) {
        const viewedIds = getViewedProducts().filter((id) => !seen.has(id)).slice(0, 15);
        if (viewedIds.length) {
          const { data } = await supabase
            .from("products")
            .select("*, product_media(url, is_cover, sort_order)")
            .in("id", viewedIds)
            .eq("is_active", true);
          // preserva a ordem de "mais recente primeiro"
          const byId = new Map((data || []).map((p: any) => [p.id, p]));
          pushMany(viewedIds.map((id) => byId.get(id)).filter(Boolean));
        }
      }

      // 3) Pesquisas recentes → produtos que combinam
      if (out.length < MAX_TO_SHOW) {
        const queries = getSearchQueries().slice(0, 3);
        for (const q of queries) {
          if (out.length >= MAX_TO_SHOW) break;
          const { data } = await supabase
            .from("products")
            .select("*, product_media(url, is_cover, sort_order)")
            .ilike("title", `%${q}%`)
            .eq("is_active", true)
            .order("sales_count", { ascending: false })
            .limit(MAX_TO_SHOW);
          pushMany(data || []);
        }
      }

      // 4) Fallback: produtos populares para completar
      if (out.length < MIN_TO_SHOW) {
        const { data } = await supabase
          .from("products")
          .select("*, product_media(url, is_cover, sort_order)")
          .eq("is_active", true)
          .order("sales_count", { ascending: false })
          .limit(MAX_TO_SHOW * 2);
        pushMany(data || []);
      }

      return { products: out.slice(0, MAX_TO_SHOW), basedOnCategory };
    },
  });

  const products = result?.products ?? [];
  const basedOnCategory = result?.basedOnCategory ?? null;

  if (!user || products.length < MIN_TO_SHOW) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 pt-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-foreground tracking-tight">Recomendado para si</h2>
            <p className="text-[11px] text-muted-foreground">
              {basedOnCategory
                ? `Baseado na categoria "${basedOnCategory}" que viu`
                : "Baseado no que costuma ver, procurar e comprar"}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-0.5 px-0.5"
      >
        {products.map((p) => {
          const img = p.cover_image_url || FALLBACK_IMG;
          const fav = isFavorite(p.id);
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="rounded-gpu-fix group flex-shrink-0 w-[148px] sm:w-[172px] snap-start bg-card border border-border/60 rounded-2xl overflow-hidden cursor-pointer flex flex-col shadow-sm hover:shadow-lg hover:border-border transition-all duration-200 active:scale-[0.98]"
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={img}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

                {p.discount_percent ? (
                  <span className="rounded-gpu-fix absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-sm">
                    -{p.discount_percent}%
                  </span>
                ) : p.badge ? (
                  <span className="rounded-gpu-fix absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[10px] font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 shadow-sm">
                    {p.badge}
                  </span>
                ) : null}

                <button
                  onClick={(e) => handleHeart(e, p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-transform active:scale-90"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="p-2.5 flex flex-col gap-1">
                <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.4em]">
                  {p.title}
                </h3>

                {(p.reason === "subcategoria" || p.reason === "categoria") && p.basedOnCategory && (
                  <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-medium text-primary bg-primary/10 -mt-0.5">
                    {p.reason === "subcategoria" ? "Também em" : "Relacionado com"} {p.basedOnCategory}
                  </span>
                )}

                {p.rating != null && Number(p.rating) > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-semibold text-foreground">{p.rating}</span>
                    {p.total_reviews ? (
                      <span className="text-[9.5px] text-muted-foreground">({p.total_reviews})</span>
                    ) : null}
                  </div>
                )}

                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[14px] font-black text-foreground">
                    {Number(p.price).toLocaleString("pt-AO")}
                  </span>
                  <span className="text-[10.5px] font-semibold text-muted-foreground">{p.currency || "Kz"}</span>
                </div>
                {p.old_price && (
                  <span className="text-[10.5px] text-muted-foreground line-through -mt-0.5">
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

// Normaliza tanto rows da RPC (que já têm cover_image_url) como rows da tabela
// products (que trazem product_media[] em vez de cover_image_url).
function normalize(r: any): RecommendedProduct {
  let cover = r.cover_image_url ?? null;
  if (!cover && Array.isArray(r.product_media) && r.product_media.length) {
    const media = [...r.product_media].sort((a: any, b: any) => {
      if (a.is_cover && !b.is_cover) return -1;
      if (!a.is_cover && b.is_cover) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    cover = media[0]?.url ?? null;
  }
  return {
    id: r.id,
    title: r.title,
    price: r.price,
    old_price: r.old_price ?? null,
    discount_percent: r.discount_percent ?? null,
    currency: r.currency ?? "Kz",
    rating: r.rating ?? null,
    total_reviews: r.total_reviews ?? null,
    sales_count: r.sales_count ?? null,
    stock: r.stock ?? null,
    badge: r.badge ?? null,
    is_featured: r.is_featured ?? false,
    seller_id: r.seller_id,
    category_id: r.category_id ?? null,
    cover_image_url: cover,
    reason: r.reason,
    basedOnCategory: r.based_on_category ?? null,
  };
}

export default RecommendedProducts;
