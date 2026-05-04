import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Star, Truck, Heart, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

const InfiniteProducts = () => {
  const navigate = useNavigate();
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["infinite_products"],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(from, to);
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
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allProducts = data?.pages.flat() || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <section className="container mx-auto px-3 pt-4 pb-4">
      <div className="mb-4">
        <h2 className="text-base font-bold text-foreground">Tendências</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {allProducts.map((p: any, i: number) => {
          const img = p.cover_url || p.image_url;

          return (
            <div
              key={`${p.id}-${i}`}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer flex flex-col"
            >
              {/* Imagem */}
              <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: "1/1" }}>
                {img ? (
                  <img
                    src={img}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    Sem foto
                  </div>
                )}

                {/* Badge desconto */}
                {p.discount_percent && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-red-500">
                    -{p.discount_percent}%
                  </span>
                )}

                {/* Badge tipo (NOVO, LIMITED, etc) */}
                {p.badge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-orange-500">
                    {p.badge}
                  </span>
                )}

                {/* Botão coração */}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow"
                >
                  <Heart className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>

              {/* Info */}
              <div className="p-2.5 flex flex-col gap-1 flex-1">

                {/* Badge "Tendências" + categoria */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded-sm">
                    Tendências
                  </span>
                  {p.category && (
                    <span className="text-[9px] font-semibold text-violet-600">
                      {p.category}
                    </span>
                  )}
                </div>

                {/* Título */}
                <h3 className="text-[12px] font-semibold text-foreground line-clamp-2 leading-snug">
                  {p.title}
                </h3>

                {/* Rating */}
                {p.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-foreground">{Number(p.rating).toFixed(1)}</span>
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] text-muted-foreground">
                      ({p.total_reviews > 999 ? "1000+" : p.total_reviews || 0})
                    </span>
                  </div>
                )}

                {/* Preço */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[14px] font-black text-red-500">
                    {Number(p.price).toLocaleString("pt-AO")} Kz
                  </span>
                  {p.old_price && (
                    <span className="text-[10px] text-muted-foreground line-through">
                      {Number(p.old_price).toLocaleString("pt-AO")} Kz
                    </span>
                  )}
                </div>

                {/* Frete grátis */}
                {p.free_shipping && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <Truck className="w-3 h-3" /> Frete grátis
                  </span>
                )}

                {/* Vendidos */}
                {p.sales_count > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {p.sales_count}+ vendidos
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trigger scroll infinito */}
      <div ref={observerRef} className="py-6 flex justify-center">
        {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        {!hasNextPage && allProducts.length > 0 && (
          <p className="text-xs text-muted-foreground">Você viu todos os produtos 🎉</p>
        )}
      </div>
    </section>
  );
};

export default InfiniteProducts;
