import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Flame, Star, Truck, Users, Eye, AlertTriangle } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 20;

// ─── Estilos globais de animação (injetados uma única vez) ───────────────────
const AnimationStyles = () => (
  <style>{`
    @keyframes zg-fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes zg-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes zg-heartPop {
      0%   { transform: scale(1); }
      35%  { transform: scale(1.45); }
      60%  { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    @keyframes zg-toastIn {
      from { opacity: 0; transform: translate(-50%, 8px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }
    .zg-card-enter {
      animation: zg-fadeInUp 0.45s ease both;
    }
    .zg-shimmer {
      background: linear-gradient(90deg, #f0e6da 0px, #faf5ee 40px, #f0e6da 80px);
      background-size: 800px 100%;
      animation: zg-shimmer 1.4s infinite linear;
    }
    .zg-heart-pop {
      animation: zg-heartPop 0.35s ease;
    }
    .zg-toast {
      animation: zg-toastIn 0.25s ease both;
    }
  `}</style>
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message }: { message: string }) => (
  <div
    className="zg-toast fixed bottom-20 left-1/2 z-50 px-4 py-2 rounded-full text-[12px] font-semibold text-white shadow-lg"
    style={{ background: "#1a0f07", transform: "translateX(-50%)" }}
  >
    {message}
  </div>
);

// ─── Hash simples e determinístico (para variações "vivas" por produto) ──────
const hashId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
};

// ─── Lazy Image ───────────────────────────────────────────────────────────────
const LazyImg = ({ src, alt }: { src: string | null; alt: string }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setLoaded(false); }, [src]);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden aspect-square" style={{ background: "#ffffff" }}>
      {(!visible || !loaded) && (
        <div className="absolute inset-0 zg-shimmer" />
      )}
      {visible && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease" }}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

// ─── Badges ───────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, { label: string; bg: string; icon?: any }> = {
  HOT:     { label: "HOT",      bg: "#f57c00", icon: Flame },
  NOVO:    { label: "NOVO",     bg: "#1e88e5" },
  PROMO:   { label: "PROMO",    bg: "#e53935" },
  LIMITED: { label: "LIMITADO", bg: "#7b1fa2" },
};

const getBadgeStyle = (badge: string | null | undefined) => {
  if (!badge) return null;
  return BADGE_STYLES[badge] || null;
};

// ─── Estrelas de avaliação ────────────────────────────────────────────────────
const StarRating = ({ rating }: { rating: number }) => {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-[2px] flex-nowrap">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3 flex-shrink-0"
          style={{
            color: i <= rounded ? "#f5a623" : "#e0d5c8",
            fill: i <= rounded ? "#f5a623" : "none",
          }}
        />
      ))}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────
const ProductCard = ({
  p, displayUrl, isTrending, isFav, onFav, onClick, index, tick,
}: {
  p: any; displayUrl: string | null; isTrending: boolean;
  isFav: boolean; onFav: (e: React.MouseEvent) => void;
  onClick: () => void; index: number; tick: number;
}) => {
  const [pressed, setPressed] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const customBadge = !p.discount_percent ? getBadgeStyle(p.badge) : null;
  const showHotFallback = isTrending && !p.discount_percent && !customBadge;

  const hasRating = p.rating != null && Number(p.rating) > 0;
  const hasSales = p.sales_count != null && Number(p.sales_count) > 0;

  // ── Sinal de urgência: visualizações "em tempo real" (determinístico + leve variação) ──
  const hash = hashId(String(p.id));
  const viewerBase = 3 + (hash % 25); // 3..27
  const viewerCount = Math.max(1, viewerBase + (((tick + hash) % 5) - 2));
  const showViewers = isTrending || hasSales;

  // ── Estoque baixo (só exibe se o campo existir e for baixo) ──
  const stockQty = p.stock_quantity ?? p.stock ?? null;
  const lowStock = stockQty != null && Number(stockQty) > 0 && Number(stockQty) <= 5;

  const handleFav = (e: React.MouseEvent) => {
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 350);
    onFav(e);
  };

  return (
    <div
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="zg-card-enter w-full cursor-pointer select-none overflow-hidden"
      style={{
        borderRadius: "3px",
        background: "#ffffff",
        transform: pressed ? "scale(0.974)" : "scale(1)",
        transition: "transform 0.13s ease",
        animationDelay: `${(index % 10) * 40}ms`,
      }}
    >
      <div className="relative">
        <LazyImg src={displayUrl} alt={p.title} />

        {p.discount_percent > 0 && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#e53935", borderRadius: "4px" }}>
            -{p.discount_percent}%
          </span>
        )}

        {customBadge && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: customBadge.bg, borderRadius: "4px" }}>
            {customBadge.icon && <customBadge.icon className="w-2.5 h-2.5" />}
            {customBadge.label}
          </span>
        )}

        {showHotFallback && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#f57c00", borderRadius: "4px" }}>
            <Flame className="w-2.5 h-2.5" /> Hot
          </span>
        )}

        {p.free_shipping && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(26,92,58,0.88)", borderRadius: "4px" }}>
            <Truck className="w-2.5 h-2.5" /> Grátis
          </span>
        )}

        <button
          onClick={handleFav}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(253,248,244,0.93)", boxShadow: "0 1px 5px rgba(107,58,31,0.18)" }}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-all ${heartPop ? "zg-heart-pop" : ""}`}
            style={{ color: isFav ? "#b84c1e" : "#c8a882", fill: isFav ? "#b84c1e" : "none" }}
          />
        </button>
      </div>

      <div className="px-2 pt-1.5 pb-2">
        <p className="font-bold line-clamp-2 leading-tight" style={{ color: "#6b3a1f", margin: 0, fontSize: "19px" }}>
          {p.title}
        </p>

        {p.description && (
          <p
            className="font-medium leading-snug line-clamp-3"
            style={{ color: "#000000", margin: "3px 0 6px 0", fontSize: "13.5px", letterSpacing: "0.4px" }}
          >
            {p.description}
          </p>
        )}

        {(hasRating || hasSales) && (
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {hasRating && (
              <span className="flex items-center gap-1">
                <StarRating rating={Number(p.rating)} />
                <span className="text-[9px]" style={{ color: "#b09080" }}>
                  {Number(p.rating).toFixed(1)}
                  {p.total_reviews > 0 ? ` (${p.total_reviews})` : ""}
                </span>
              </span>
            )}
            {hasRating && hasSales && (
              <span className="text-[9px]" style={{ color: "#d4c4b4" }}>•</span>
            )}
            {hasSales && (
              <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "#b09080" }}>
                <Users className="w-2 h-2" /> {p.sales_count}+ vendidos
              </span>
            )}
          </div>
        )}

        {showViewers && (
          <div className="flex items-center gap-0.5 mb-1">
            <Eye className="w-2.5 h-2.5" style={{ color: "#7fa87f" }} />
            <span className="text-[9px] font-medium" style={{ color: "#5a8a5a" }}>
              {viewerCount} pessoas a ver agora
            </span>
          </div>
        )}

        {lowStock && (
          <div className="flex items-center gap-0.5 mb-1">
            <AlertTriangle className="w-2.5 h-2.5" style={{ color: "#e53935" }} />
            <span className="text-[9px] font-bold" style={{ color: "#e53935" }}>
              Só restam {stockQty}!
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-black leading-none" style={{ fontSize: "14px", color: "#1a0f07" }}>
            {Number(p.price).toLocaleString("pt-AO")} Kz
          </span>
          {p.old_price && (
            <span className="text-[9px] line-through" style={{ color: "#b09080" }}>
              {Number(p.old_price).toLocaleString("pt-AO")} Kz
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="w-full overflow-hidden" style={{ borderRadius: "3px", background: "#ffffff" }}>
    <div className="zg-shimmer" style={{ aspectRatio: "1/1" }} />
    <div className="px-2 pt-1.5 pb-2 space-y-1.5">
      <div className="h-3 rounded w-4/5 zg-shimmer" />
      <div className="h-3 rounded w-3/5 zg-shimmer" />
      <div className="h-3.5 rounded w-2/5 mt-1 zg-shimmer" />
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const InfiniteProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tick global leve — dá vida aos contadores de "visualizações" ──────────
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Query principal (paginada) ────────────────────────────────────────────
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["infinite_products"],
      queryFn: async ({ pageParam = 0 }) => {
        const from = pageParam * PAGE_SIZE;
        const { data: products, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("sales_count", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;

        const ids = (products || []).map((p: any) => p.id);
        let coverMap: Record<string, string> = {};

        if (ids.length > 0) {
          const { data: media } = await supabase
            .from("product_media")
            .select("product_id, url")
            .in("product_id", ids)
            .eq("is_cover", true);
          (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
        }

        return (products || []).map((p: any) => ({
          ...p,
          cover_url: coverMap[p.id] || null,
        }));
      },
      getNextPageParam: (last, all) => last.length < PAGE_SIZE ? undefined : all.length,
      initialPageParam: 0,
    });

  const allProducts = data?.pages.flat() || [];

  // ── Sentinel — carregar mais páginas ─────────────────────────────────────
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (!entries[0].isIntersecting) return;
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 1800);
  };

  const makeFav = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    const willBeFav = !isFavorite(id);
    toggleFavorite(id);
    showToast(willBeFav ? "Adicionado aos favoritos ❤️" : "Removido dos favoritos");
  };

  // ── Trending ──────────────────────────────────────────────────────────────
  const { data: trendingIds = new Set<string>() } = useQuery({
    queryKey: ["trending_ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products").select("id, category, sales_count")
        .eq("is_active", true)
        .order("sales_count", { ascending: false }).limit(100);
      if (!data) return new Set<string>();
      const seen = new Set<string>(); const top = new Set<string>();
      for (const p of data) {
        if (p.category && !seen.has(p.category)) { seen.add(p.category); top.add(p.id); }
      }
      return top;
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <section className="px-2 md:px-4 pt-3 pb-4" style={{ background: "#ffffff" }}>
      <AnimationStyles />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} />)}
      </div>
    </section>
  );

  if (allProducts.length === 0) return null;

  return (
    <section className="px-2 md:px-4 pt-3 pb-4" style={{ background: "#ffffff" }}>
      <AnimationStyles />

      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm font-bold" style={{ color: "#1a0f07" }}>Para si</h2>
        <span className="text-[10px]" style={{ color: "#9a7060" }}>{allProducts.length} produtos</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3" style={{ background: "#ffffff" }}>
        {allProducts.map((p: any, i: number) => (
          <ProductCard
            key={p.id}
            p={p}
            displayUrl={p.cover_url}
            isTrending={(trendingIds as Set<string>).has(p.id)}
            isFav={isFavorite(p.id)}
            onFav={makeFav(p.id)}
            onClick={() => navigate(`/produto/${p.id}`)}
            index={i}
            tick={tick}
          />
        ))}
        {isFetchingNextPage && [0, 1, 2, 3, 4].map(i => <Skeleton key={`skeleton-${i}`} />)}
      </div>

      {/* Sentinel invisível */}
      <div ref={sentinelRef} className="h-2" />

      {toast && <Toast message={toast} />}
    </section>
  );
};

export default InfiniteProducts;
