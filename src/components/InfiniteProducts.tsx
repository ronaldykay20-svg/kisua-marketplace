import { useState, useEffect, useRef, useCallback } from "react";
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

  const cardColors = [
    "border-l-primary/30",
    "border-l-secondary/30",
    "border-l-accent/30",
    "border-l-destructive/30",
    "border-l-walmart-orange/30",
  ];

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
      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-foreground">Descubra mais produtos</h2>
        <p className="text-[11px] text-muted-foreground">Deslize para explorar milhares de ofertas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {allProducts.map((p: any, i: number) => {
          const img = p.cover_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
          const colorClass = cardColors[i % cardColors.length];

          return (
            <div
              key={`${p.id}-${i}`}
              onClick={() => navigate(`/produto/${p.id}`)}
              className={`bg-card rounded-card border border-border border-l-4 ${colorClass} overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300 flex flex-col`}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={img}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {p.discount_percent && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-primary-foreground bg-walmart-red">
                    -{p.discount_percent}%
                  </span>
                )}
                {p.badge && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-primary-foreground"
                    style={{ background: "var(--promo-gradient)" }}>
                    {p.badge}
                  </span>
                )}
                <button className="absolute top-1.5 right-1.5 p-1 rounded-full bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); }}>
                  <Heart className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-2 flex flex-col flex-1">
                <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight mb-1.5">{p.title}</h3>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-foreground">{Number(p.price).toLocaleString("pt-AO")} Kz</span>
                  </div>
                  {p.old_price && (
                    <span className="text-[10px] text-muted-foreground line-through">{Number(p.old_price).toLocaleString("pt-AO")} Kz</span>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {p.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star key={si} className={`w-2.5 h-2.5 ${si < Math.floor(p.rating) ? "text-secondary fill-secondary" : "text-border"}`} />
                        ))}
                        <span className="text-[9px] text-muted-foreground ml-0.5">({p.total_reviews || 0})</span>
                      </div>
                    )}
                  </div>
                  {p.free_shipping && (
                    <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-bold text-accent">
                      <Truck className="w-2.5 h-2.5" /> FRETE GRÁTIS
                    </span>
                  )}
                  {p.sales_count > 0 && (
                    <p className="text-[9px] text-muted-foreground mt-0.5">🔥 {p.sales_count} vendidos</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
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
