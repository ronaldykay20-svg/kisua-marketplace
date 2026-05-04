import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Star, Truck, Heart, Loader2, Flame, Users } from "lucide-react";

const PAGE_SIZE = 20;

const getDynamicInfo = (p: any, i: number) => {
  const options: JSX.Element[] = [];

  if (p.free_shipping)
    options.push(
      <span key="ship" className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
        <Truck className="w-3 h-3" /> Frete grátis
      </span>
    );

  if (p.sales_count > 0)
    options.push(
      <span key="sales" className="text-[10px] text-muted-foreground">
        {p.sales_count}+ vendidos
      </span>
    );

  if (p.rating > 0 && (p.total_reviews || 0) > 50)
    options.push(
      <span key="recurrent" className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Users className="w-3 h-3" /> Clientes recorrentes com alta taxa
      </span>
    );

  if (p.discount_percent >= 15)
    options.push(
      <span key="hot" className="flex items-center gap-1 text-[10px] font-semibold text-orange-500">
        <Flame className="w-3 h-3" /> Promoção imperdível
      </span>
    );

  if (p.free_shipping && p.sales_count > 0)
    options.push(
      <span key="fast" className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
        <Truck className="w-3 h-3" /> Entrega rápida
      </span>
    );

  if (options.length === 0) return null;
  return options[i % options.length];
};

const InfiniteProducts = () => {
  const navigate = useNavigate();
  const observerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
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

  // Masonry: separar em 2 colunas
  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  // Aspect ratios alternados para dar efeito masonry
  const ratios = ["3/4", "1/1", "4/3", "2/3", "1/1"];

  const ProductCard = ({ p, i }: { p: any; i: number }) => {
    const img = p.cover_url || p.image_url;
    const ratio = ratios[i % ratios.length];

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer mb-2.5 flex flex-col"
      >
        {/* Imagem com altura variável */}
        <div className="relative overflow-hidden bg-muted" style={{ aspectRatio: ratio }}>
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

          {p.discount_percent && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-500">
              -{p.discount_percent}%
            </span>
          )}
          {p.badge && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-orange-500">
              {p.badge}
            </span>
          )}

          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow"
          >
            <Heart className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-2 flex flex-col gap-1">
          {/* Badge Tendências + categoria */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded-sm">
              Tendências
            </span>
            {p.category && (
              <span className="text-[9px] font-semibold text-violet-500">{p.category}</span>
            )}
          </div>

          {/* Título */}
          <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
            {p.title}
          </h3>

          {/* Rating — aparece só em cards pares */}
          {p.rating > 0 && i % 2 === 0 && (
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold">{Number(p.rating).toFixed(1)}</span>
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[9px] text-muted-foreground">
                ({(p.total_reviews || 0) > 999 ? "1000+" : p.total_reviews || 0})
              </span>
            </div>
          )}

          {/* Preço */}
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-black text-red-500">
              {Number(p.price).toLocaleString("pt-AO")} Kz
            </span>
            {p.old_price && (
              <span className="text-[9px] text-muted-foreground line-through">
                {Number(p.old_price).toLocaleString("pt-AO")} Kz
              </span>
            )}
          </div>

          {/* Info dinâmica — muda por card */}
          {getDynamicInfo(p, i)}
        </div>
      </div>
    );
  };

  return (
    <section className="container mx-auto px-3 pt-4 pb-4">
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground">Tendências</h2>
      </div>

      {/* Layout masonry — 2 colunas com alturas diferentes */}
      <div className="flex gap-2">
        <div className="flex-1">
          {col1.map((p: any, i: number) => (
            <ProductCard key={`${p.id}-L`} p={p} i={i * 2} />
          ))}
        </div>
        <div className="flex-1 mt-4">
          {col2.map((p: any, i: number) => (
            <ProductCard key={`${p.id}-R`} p={p} i={i * 2 + 1} />
          ))}
        </div>
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
