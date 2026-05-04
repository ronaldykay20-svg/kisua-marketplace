import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Star, Truck, Heart, Loader2, Flame, Users, ShieldCheck } from "lucide-react";

const PAGE_SIZE = 20;
const RATIOS = ["3/4", "1/1", "4/5", "2/3", "1/1", "3/4"];

// Monta a lista de infos disponíveis para um produto
const buildInfoList = (p: any): JSX.Element[] => {
  const list: JSX.Element[] = [];

  if (p.free_shipping)
    list.push(
      <span key="ship" className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
        <Truck className="w-3 h-3" /> Frete grátis
      </span>
    );

  if (p.sales_count > 0)
    list.push(
      <span key="sales" className="text-[10px] text-muted-foreground">
        {p.sales_count}+ vendidos
      </span>
    );

  if ((p.total_reviews || 0) > 10)
    list.push(
      <span key="recurrent" className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Users className="w-3 h-3" /> Clientes recorrentes com alta taxa
      </span>
    );

  if (p.discount_percent > 0)
    list.push(
      <span key="promo" className="flex items-center gap-1 text-[10px] font-semibold text-orange-500">
        <Flame className="w-3 h-3" /> Promoção imperdível
      </span>
    );

  if (p.free_shipping && p.sales_count > 5)
    list.push(
      <span key="fast" className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
        <Truck className="w-3 h-3" /> Entrega rápida
      </span>
    );

  if (p.rating > 4)
    list.push(
      <span key="rated" className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Muito bem avaliado
      </span>
    );

  list.push(
    <span key="secure" className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <ShieldCheck className="w-3 h-3" /> Compra 100% segura
    </span>
  );

  return list;
};

// Componente da info rotativa — troca a cada 3s com fade
const RotatingInfo = ({ p, startOffset }: { p: any; startOffset: number }) => {
  const infoList = buildInfoList(p);
  const [idx, setIdx] = useState(startOffset % infoList.length);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (infoList.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % infoList.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, [infoList.length]);

  if (infoList.length === 0) return null;

  return (
    <div
      style={{
        transition: "opacity 0.4s ease",
        opacity: visible ? 1 : 0,
        minHeight: "16px",
      }}
    >
      {infoList[idx]}
    </div>
  );
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

  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  const ProductCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const ratio = RATIOS[globalIndex % RATIOS.length];
    const showRating = p.rating > 0 && globalIndex % 3 !== 1;

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer flex flex-col mb-2"
      >
        <div className="relative overflow-hidden bg-muted w-full" style={{ aspectRatio: ratio }}>
          {img ? (
            <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
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

        <div className="p-2 flex flex-col gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded-sm">
              Tendências
            </span>
            {p.category && (
              <span className="text-[9px] font-semibold text-violet-500">{p.category}</span>
            )}
          </div>

          <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
            {p.title}
          </h3>

          {showRating && (
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold">{Number(p.rating).toFixed(1)}</span>
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[9px] text-muted-foreground">
                ({(p.total_reviews || 0) > 999 ? "1000+" : p.total_reviews || 0})
              </span>
            </div>
          )}

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

          {/* Info rotativa — troca a cada 3s com fade */}
          <RotatingInfo p={p} startOffset={globalIndex} />
        </div>
      </div>
    );
  };

  return (
    <section className="container mx-auto px-3 pt-4 pb-4">
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground">Tendências</h2>
      </div>

      {/* Tablet: 3 colunas CSS masonry */}
      <div className="hidden sm:block" style={{ columnCount: 3, columnGap: "8px" }}>
        {allProducts.map((p: any, i: number) => (
          <div key={p.id} style={{ breakInside: "avoid", marginBottom: "8px" }}>
            <ProductCard p={p} globalIndex={i} />
          </div>
        ))}
      </div>

      {/* Mobile: 2 colunas */}
      <div className="flex gap-2 sm:hidden">
        <div className="flex-1">
          {col1.map((p: any, colI: number) => (
            <ProductCard key={p.id} p={p} globalIndex={colI * 2} />
          ))}
        </div>
        <div className="flex-1">
          {col2.map((p: any, colI: number) => (
            <ProductCard key={p.id} p={p} globalIndex={colI * 2 + 1} />
          ))}
        </div>
      </div>

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
