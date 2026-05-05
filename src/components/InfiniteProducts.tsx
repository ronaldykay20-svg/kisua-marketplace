import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Star, Truck, Heart, Loader2, Flame, Users, ShieldCheck, Tag } from "lucide-react";

const PAGE_SIZE = 20;
const RATIOS = ["3/4", "1/1", "4/5", "2/3", "1/1", "3/4"];

// Pill colorido por tipo de info
const InfoPill = ({ type, children }: { type: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    shipping:   "bg-green-100 text-green-700",
    sales:      "bg-blue-100 text-blue-700",
    recurrent:  "bg-purple-100 text-purple-700",
    promo:      "bg-orange-100 text-orange-600",
    fast:       "bg-teal-100 text-teal-700",
    rated:      "bg-yellow-100 text-yellow-700",
    secure:     "bg-gray-100 text-gray-600",
    category:   "bg-indigo-100 text-indigo-600",
    trending:   "bg-rose-100 text-rose-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${styles[type] || styles.secure}`}>
      {children}
    </span>
  );
};

// Monta infos disponíveis para este produto
const buildInfoList = (p: any, isTrending: boolean) => {
  const list: { type: string; el: JSX.Element }[] = [];

  if (isTrending)
    list.push({ type: "trending", el: <InfoPill type="trending"><Flame className="w-2.5 h-2.5" /> Tendência na categoria</InfoPill> });

  if (p.category)
    list.push({ type: "category", el: <InfoPill type="category"><Tag className="w-2.5 h-2.5" /> {p.category}</InfoPill> });

  if (p.free_shipping)
    list.push({ type: "shipping", el: <InfoPill type="shipping"><Truck className="w-2.5 h-2.5" /> Frete grátis</InfoPill> });

  if (p.sales_count > 0)
    list.push({ type: "sales", el: <InfoPill type="sales"><Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos</InfoPill> });

  if ((p.total_reviews || 0) > 10)
    list.push({ type: "recurrent", el: <InfoPill type="recurrent"><Users className="w-2.5 h-2.5" /> Clientes recorrentes</InfoPill> });

  if (p.discount_percent > 0)
    list.push({ type: "promo", el: <InfoPill type="promo"><Flame className="w-2.5 h-2.5" /> -{p.discount_percent}% de desconto</InfoPill> });

  if (p.free_shipping && (p.sales_count || 0) > 5)
    list.push({ type: "fast", el: <InfoPill type="fast"><Truck className="w-2.5 h-2.5" /> Entrega rápida</InfoPill> });

  if (p.rating >= 4)
    list.push({ type: "rated", el: <InfoPill type="rated"><Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> {Number(p.rating).toFixed(1)} — Muito bem avaliado</InfoPill> });

  list.push({ type: "secure", el: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });

  return list;
};

// Componente rotativo — cada card tem intervalo aleatório próprio
const RotatingInfo = ({ p, isTrending, seed }: { p: any; isTrending: boolean; seed: number }) => {
  const infoList = useMemo(() => buildInfoList(p, isTrending), [p.id, isTrending]);
  const [idx, setIdx] = useState(seed % infoList.length);
  const [visible, setVisible] = useState(true);
  // Intervalo único por card: entre 5s e 12s
  const interval = useMemo(() => 5000 + (seed % 8) * 1000, [seed]);

  useEffect(() => {
    if (infoList.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % infoList.length);
        setVisible(true);
      }, 500);
    }, interval);
    return () => clearInterval(timer);
  }, [infoList.length, interval]);

  return (
    <div style={{ transition: "opacity 0.5s ease", opacity: visible ? 1 : 0, minHeight: "20px" }}>
      {infoList[idx]?.el}
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
          .order("sales_count", { ascending: false })
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

  // Top vendido por categoria para determinar "tendência"
  const { data: trendingIds = new Set<string>() } = useQuery({
    queryKey: ["trending_ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, category, sales_count")
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(100);
      if (!data) return new Set<string>();
      // Top 1 por categoria
      const seen = new Set<string>();
      const top = new Set<string>();
      for (const p of data) {
        if (p.category && !seen.has(p.category)) {
          seen.add(p.category);
          top.add(p.id);
        }
      }
      return top;
    },
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
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

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (allProducts.length === 0) return null;

  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  const ProductCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const ratio = RATIOS[globalIndex % RATIOS.length];
    const isTrending = trendingIds.has(p.id);
    const showRating = p.rating > 0;

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer flex flex-col mb-2"
      >
        {/* Imagem */}
        <div className="relative overflow-hidden bg-muted w-full" style={{ aspectRatio: ratio }}>
          {img
            ? <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
          }
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
        <div className="p-2 flex flex-col gap-1.5">
          {/* Título */}
          <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
            {p.title}
          </h3>

          {/* Rating + vendidos — sempre visíveis se existirem */}
          <div className="flex items-center justify-between gap-1">
            {showRating && (
              <div className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold text-foreground">{Number(p.rating).toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground">
                  ({(p.total_reviews || 0) > 999 ? "1000+" : p.total_reviews || 0})
                </span>
              </div>
            )}
            {p.sales_count > 0 && (
              <span className="text-[9px] text-muted-foreground ml-auto">{p.sales_count}+ vendidos</span>
            )}
          </div>

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

          {/* Info rotativa com pill colorido — cada card no seu tempo */}
          <RotatingInfo p={p} isTrending={isTrending} seed={globalIndex} />
        </div>
      </div>
    );
  };

  return (
    <section className="container mx-auto px-3 pt-4 pb-4">
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground">Para si</h2>
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
