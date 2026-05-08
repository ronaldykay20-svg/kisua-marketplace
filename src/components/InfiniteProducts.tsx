import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Star, Truck, Heart, Loader2, Flame,
  Users, ShieldCheck, Tag, ShoppingCart,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart"; // ← ajuste para o seu hook real

const PAGE_SIZE = 20;
const RATIOS = ["3/4", "1/1", "4/5", "2/3", "1/1", "3/4"];

// ─── Info Pill ────────────────────────────────────────────────────────────────
const InfoPill = ({ type, children }: { type: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    shipping:  "bg-green-100 text-green-700",
    sales:     "bg-blue-100 text-blue-700",
    recurrent: "bg-purple-100 text-purple-700",
    promo:     "bg-orange-100 text-orange-600",
    fast:      "bg-teal-100 text-teal-700",
    rated:     "bg-yellow-100 text-yellow-700",
    secure:    "bg-gray-100 text-gray-600",
    category:  "bg-indigo-100 text-indigo-600",
    trending:  "bg-rose-100 text-rose-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
        styles[type] || styles.secure
      }`}
    >
      {children}
    </span>
  );
};

const buildInfoList = (p: any, isTrending: boolean) => {
  const list: { type: string; el: JSX.Element }[] = [];
  if (isTrending)
    list.push({ type: "trending", el: <InfoPill type="trending"><Flame className="w-2.5 h-2.5" /> Tendência</InfoPill> });
  if (p.category)
    list.push({ type: "category", el: <InfoPill type="category"><Tag className="w-2.5 h-2.5" /> {p.category}</InfoPill> });
  if (p.free_shipping)
    list.push({ type: "shipping", el: <InfoPill type="shipping"><Truck className="w-2.5 h-2.5" /> Frete grátis</InfoPill> });
  if (p.sales_count > 0)
    list.push({ type: "sales", el: <InfoPill type="sales"><Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos</InfoPill> });
  if ((p.total_reviews || 0) > 10)
    list.push({ type: "recurrent", el: <InfoPill type="recurrent"><Users className="w-2.5 h-2.5" /> Clientes recorrentes</InfoPill> });
  if (p.discount_percent > 0)
    list.push({ type: "promo", el: <InfoPill type="promo"><Flame className="w-2.5 h-2.5" /> -{p.discount_percent}%</InfoPill> });
  if (p.free_shipping && (p.sales_count || 0) > 5)
    list.push({ type: "fast", el: <InfoPill type="fast"><Truck className="w-2.5 h-2.5" /> Entrega rápida</InfoPill> });
  if (p.rating >= 4)
    list.push({ type: "rated", el: <InfoPill type="rated"><Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> {Number(p.rating).toFixed(1)}</InfoPill> });
  list.push({ type: "secure", el: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });
  return list;
};

// ─── Rotating Info ────────────────────────────────────────────────────────────
const RotatingInfo = ({ p, isTrending, seed }: { p: any; isTrending: boolean; seed: number }) => {
  const infoList = useMemo(() => buildInfoList(p, isTrending), [p.id, isTrending]);
  const [idx, setIdx] = useState(seed % infoList.length);
  const [visible, setVisible] = useState(true);
  const interval = useMemo(() => 5000 + (seed % 8) * 1000, [seed]);

  useEffect(() => {
    if (infoList.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % infoList.length);
        setVisible(true);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [infoList.length, interval]);

  return (
    <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease", height: "18px" }}
      className="flex items-center">
      {infoList[idx]?.el}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const InfiniteProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart(); // ← use o seu hook de carrinho
  const observerRef = useRef<HTMLDivElement>(null);

  // ── Infinite query ──
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
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.length,
      initialPageParam: 0,
    });

  // ── Trending ids ──
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

  // ── Intersection observer ──
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

  if (isLoading)
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (allProducts.length === 0) return null;

  // split mobile columns
  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  // ─── CARD MOBILE ───────────────────────────────────────────────────────────
  /**
   * Altura uniforme nas colunas:
   * - A imagem tem `aspect-ratio` fixo via `RATIOS`, mas DENTRO de um wrapper
   *   com `overflow:hidden` que não deixa crescer além do espaço alocado.
   * - O rodapé tem altura FIXA em px para garantir alinhamento entre col1/col2.
   * - A imagem usa `object-fit: cover` sempre.
   */
  const MOBILE_FOOTER_H = 108; // px — ajuste se precisar mais espaço

  const MobileCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const ratio = RATIOS[globalIndex % RATIOS.length];
    const isTrending = trendingIds.has(p.id);
    const showRating = p.rating > 0;
    const fav = isFavorite(p.id);

    const handleHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };

    const handleCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer flex flex-col mb-2"
      >
        {/* ── Imagem: ratio fixo, nunca vaza ── */}
        <div
          className="relative w-full bg-muted overflow-hidden flex-shrink-0"
          style={{ aspectRatio: ratio }}
        >
          {img ? (
            <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
          )}
          {p.discount_percent > 0 && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-500 leading-none">
              -{p.discount_percent}%
            </span>
          )}
          {p.badge && (
            <span className="absolute top-1.5 right-7 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-orange-500 leading-none">
              {p.badge}
            </span>
          )}
          <button
            onClick={handleHeart}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow"
          >
            <Heart className={`w-3 h-3 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-gray-500"}`} />
          </button>
        </div>

        {/* ── Rodapé: altura FIXA para alinhar as duas colunas ── */}
        <div
          className="p-2 flex flex-col justify-between"
          style={{ height: `${MOBILE_FOOTER_H}px` }}
        >
          {/* Título: 2 linhas fixas */}
          <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
            {p.title}
          </h3>

          {/* Rating + vendidos */}
          <div className="flex items-center gap-1">
            {showRating && (
              <div className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold">{Number(p.rating).toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground">
                  ({(p.total_reviews || 0) > 999 ? "1k+" : p.total_reviews || 0})
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

          {/* Rotating pill + botão carrinho na mesma linha */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex-1 overflow-hidden">
              <RotatingInfo p={p} isTrending={isTrending} seed={globalIndex} />
            </div>
            <button
              onClick={handleCart}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center shadow"
              aria-label="Adicionar ao carrinho"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── CARD TABLET ───────────────────────────────────────────────────────────
  /**
   * 5 colunas com `grid-auto-rows: 1fr` → todas as linhas têm a mesma altura.
   * Imagem: `aspect-ratio:1/1` + `object-fit:cover` dentro de wrapper absoluto.
   * Rodapé: `flex-1` cresce para preencher o espaço restante, conteúdo
   *          distribuído com `justify-between` para ficar sempre alinhado.
   */
  const TabletCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const isTrending = trendingIds.has(p.id);
    const fav = isFavorite(p.id);

    const handleHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };

    const handleCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        className="bg-card border border-border rounded-md overflow-hidden cursor-pointer flex flex-col h-full"
      >
        {/* Imagem quadrada, nunca muda o layout */}
        <div className="relative w-full bg-muted overflow-hidden flex-shrink-0" style={{ aspectRatio: "1/1" }}>
          {img ? (
            <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
          )}
          {p.discount_percent > 0 && (
            <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold text-white bg-red-500 leading-none">
              -{p.discount_percent}%
            </span>
          )}
          {(p.badge || isTrending) && (
            <span className="absolute top-1 right-6 px-1 py-0.5 rounded text-[9px] font-bold text-white bg-orange-500 leading-none">
              {p.badge || "🔥"}
            </span>
          )}
          <button
            onClick={handleHeart}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/85 flex items-center justify-center shadow-sm"
          >
            <Heart className={`w-2.5 h-2.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-gray-400"}`} />
          </button>
        </div>

        {/* Rodapé: flex-1 + justify-between garante que TODOS os cards
            usam o mesmo espaço vertical disponível com conteúdo alinhado */}
        <div className="p-1.5 flex flex-col justify-between flex-1">
          <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
            {p.title}
          </p>

          <div className="flex flex-col gap-1 mt-1">
            {/* Rotating pill (tablet também tem) */}
            <RotatingInfo p={p} isTrending={isTrending} seed={globalIndex} />

            {/* Preço */}
            <div className="flex items-baseline gap-1">
              <span className="text-[12px] font-black text-red-500 leading-none">
                {Number(p.price).toLocaleString("pt-AO")} Kz
              </span>
              {p.old_price && (
                <span className="text-[9px] text-muted-foreground line-through leading-none">
                  {Number(p.old_price).toLocaleString("pt-AO")} Kz
                </span>
              )}
            </div>

            {/* Botão carrinho full-width */}
            <button
              onClick={handleCart}
              className="w-full py-1 rounded text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all leading-none flex items-center justify-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" />
              Carrinho
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="container mx-auto px-3 pt-4 pb-4">
      <div className="mb-3">
        <h2 className="text-base font-bold text-foreground">Para si</h2>
      </div>

      {/* TABLET — 5 colunas, linha uniforme via grid-auto-rows */}
      <div
        className="hidden sm:grid"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", gridAutoRows: "1fr" }}
      >
        {allProducts.map((p: any, i: number) => (
          <TabletCard key={p.id} p={p} globalIndex={i} />
        ))}
      </div>

      {/* MOBILE — 2 colunas masonry-like com rodapé de altura fixa */}
      <div className="flex gap-2 sm:hidden">
        <div className="flex-1">
          {col1.map((p: any, colI: number) => (
            <MobileCard key={p.id} p={p} globalIndex={colI * 2} />
          ))}
        </div>
        <div className="flex-1">
          {col2.map((p: any, colI: number) => (
            <MobileCard key={p.id} p={p} globalIndex={colI * 2 + 1} />
          ))}
        </div>
      </div>

      {/* Sentinel de paginação */}
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
