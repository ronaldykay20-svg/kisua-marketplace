import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Flame, Star, Truck, Users, Eye, Clock, Ticket, ShoppingBag } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useAddToCart } from "@/hooks/useCartActions";

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
    @keyframes zg-dotPulse {
      0%   { box-shadow: 0 0 0 0 rgba(90,138,90,0.55); }
      70%  { box-shadow: 0 0 0 5px rgba(90,138,90,0); }
      100% { box-shadow: 0 0 0 0 rgba(90,138,90,0); }
    }
    @keyframes zg-numberBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
    @keyframes zg-cartFly {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.2); }
    }
    .zg-card-enter {
      animation: zg-fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .zg-shimmer {
      background: linear-gradient(90deg, #ecdfcf 0px, #fffdfa 60px, #ecdfcf 120px);
      background-size: 800px 100%;
      animation: zg-shimmer 1.1s infinite linear;
    }
    .zg-heart-pop {
      animation: zg-heartPop 0.4s ease;
    }
    .zg-toast {
      animation: zg-toastIn 0.25s ease both;
    }
    .zg-live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #5a8a5a;
      animation: zg-dotPulse 1.6s infinite;
    }
    .zg-live-number {
      animation: zg-numberBlink 2.4s ease-in-out infinite;
    }
    .zg-no-scrollbar {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .zg-no-scrollbar::-webkit-scrollbar { display: none; }
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

// ─── Contagem decrescente até à meia-noite (flash sale diária) ───────────────
const getRemainingToMidnight = () => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// ─── Swipe de imagens no card ─────────────────────────────────────────────────
const ImageSwiper = ({ images, alt }: { images: string[]; alt: string }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);

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

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const list = images.length > 0 ? images : [null];

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden aspect-square" style={{ background: "#ffffff" }}>
      {(!visible || !loaded) && <div className="absolute inset-0 zg-shimmer" />}

      {visible && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="zg-no-scrollbar flex w-full h-full overflow-x-auto snap-x snap-mandatory"
          style={{ scrollBehavior: "smooth" }}
        >
          {list.map((src, i) => (
            src ? (
              <img
                key={i}
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover flex-shrink-0 snap-center"
                style={{ minWidth: "100%", opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease" }}
                onLoad={() => setLoaded(true)}
              />
            ) : (
              <div key={i} className="w-full h-full flex-shrink-0" style={{ minWidth: "100%", background: "#f7f5f2" }} />
            )
          ))}
        </div>
      )}

      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-10 flex items-center gap-1" style={{ transform: "translateX(-50%)" }}>
          {list.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === active ? "6px" : "4px",
                height: "4px",
                background: i === active ? "#ffffff" : "rgba(255,255,255,0.55)",
                boxShadow: "0 0 2px rgba(0,0,0,0.35)",
              }}
            />
          ))}
        </div>
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
  p, images, isTrending, isFav, onFav, onClick, onAddToCart, index, tick, flashRemaining,
}: {
  p: any; images: string[]; isTrending: boolean;
  isFav: boolean; onFav: (e: React.MouseEvent) => void;
  onClick: () => void; onAddToCart: (e: React.MouseEvent) => void;
  index: number; tick: number; flashRemaining: string;
}) => {
  const [pressed, setPressed] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const customBadge = !p.discount_percent ? getBadgeStyle(p.badge) : null;
  const showHotFallback = isTrending && !p.discount_percent && !customBadge;

  const hasRating = p.rating != null && Number(p.rating) > 0;
  const hasSales = p.sales_count != null && Number(p.sales_count) > 0;

  const hash = hashId(String(p.id));
  const viewerBase = 3 + (hash % 25);
  const viewerCount = Math.max(1, viewerBase + (((tick + hash) % 5) - 2));

  const stockQty = p.stock_quantity ?? p.stock ?? null;
  const lowStock = stockQty != null && Number(stockQty) > 0 && Number(stockQty) <= 5;

  const isFlash = Number(p.discount_percent) > 0;
  // Cupom extra ilustrativo: aparece em parte dos produtos com desconto (baseado em id, não é aleatório).
  // Para virar real, ligar a uma tabela/coluna de cupons e substituir esta condição.
  const hasCoupon = isFlash && hash % 3 === 0;
  const couponPercent = 5 + (hash % 3) * 2; // 5, 7 ou 9%

  const handleFav = (e: React.MouseEvent) => {
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 350);
    onFav(e);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clone = document.createElement("div");
    clone.style.position = "fixed";
    clone.style.left = `${rect.left + rect.width / 2 - 8}px`;
    clone.style.top = `${rect.top + rect.height / 2 - 8}px`;
    clone.style.width = "16px";
    clone.style.height = "16px";
    clone.style.borderRadius = "50%";
    clone.style.background = "#b84c1e";
    clone.style.zIndex = "9999";
    clone.style.pointerEvents = "none";
    clone.style.transition = "left 0.55s cubic-bezier(0.4,0,0.2,1), top 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s ease, opacity 0.55s ease";
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.left = `${window.innerWidth - 40}px`;
      clone.style.top = `${window.innerHeight - 24}px`;
      clone.style.transform = "scale(0.3)";
      clone.style.opacity = "0.3";
    });
    setTimeout(() => clone.remove(), 600);
    onAddToCart(e);
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
        <ImageSwiper images={images} alt={p.title} />

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

        {isFlash && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(20,20,20,0.75)", borderRadius: "4px" }}>
            <Clock className="w-2.5 h-2.5" /> {flashRemaining}
          </span>
        )}

        {p.free_shipping && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(26,92,58,0.88)", borderRadius: "4px" }}>
            <Truck className="w-2.5 h-2.5" /> Grátis
          </span>
        )}

        <div className="absolute bottom-2 right-2 flex flex-col items-center gap-1.5 z-10">
          <button
            onClick={handleFav}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(253,248,244,0.93)", boxShadow: "0 1px 5px rgba(107,58,31,0.18)" }}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all ${heartPop ? "zg-heart-pop" : ""}`}
              style={{ color: isFav ? "#b84c1e" : "#c8a882", fill: isFav ? "#b84c1e" : "none" }}
            />
          </button>
          <button
            onClick={handleAddToCart}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(253,248,244,0.93)", boxShadow: "0 1px 5px rgba(107,58,31,0.18)" }}
          >
            <ShoppingBag className="w-3.5 h-3.5" style={{ color: "#6b3a1f" }} />
          </button>
        </div>
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

        <div className="flex items-center gap-1 mb-1">
          <span className="zg-live-dot" />
          <Eye className="w-2.5 h-2.5" style={{ color: "#7fa87f" }} />
          <span className="zg-live-number text-[9.5px] font-semibold" style={{ color: "#5a8a5a" }}>
            {viewerCount} pessoas a ver agora
          </span>
        </div>

        {lowStock && (
          <div className="flex items-center gap-0.5 mb-1">
            <span className="text-[9px] font-bold" style={{ color: "#e53935" }}>
              ⚠ Só restam {stockQty}!
            </span>
          </div>
        )}

        {hasCoupon && (
          <div className="flex items-center gap-1 mb-1 px-1.5 py-0.5 w-fit" style={{ background: "#fdf0e5", borderRadius: "4px", border: "1px dashed #d99a5c" }}>
            <Ticket className="w-2.5 h-2.5" style={{ color: "#b8681e" }} />
            <span className="text-[9px] font-bold" style={{ color: "#b8681e" }}>
              Cupom: -{couponPercent}% extra
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
  const { mutate: addToCart } = useAddToCart();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [flashRemaining, setFlashRemaining] = useState(getRemainingToMidnight());
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tick leve (5s) — dá vida aos contadores de "visualizações" ────────────
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Tick por segundo — contagem decrescente da flash sale ────────────────
  useEffect(() => {
    const interval = setInterval(() => setFlashRemaining(getRemainingToMidnight()), 1000);
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
        const imagesMap: Record<string, string[]> = {};

        if (ids.length > 0) {
          const { data: media } = await supabase
            .from("product_media")
            .select("product_id, url, is_cover")
            .in("product_id", ids);

          const grouped: Record<string, any[]> = {};
          (media || []).forEach((m: any) => {
            if (!grouped[m.product_id]) grouped[m.product_id] = [];
            grouped[m.product_id].push(m);
          });

          Object.keys(grouped).forEach((pid) => {
            const sorted = grouped[pid].sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0));
            imagesMap[pid] = sorted.slice(0, 4).map((m) => m.url);
          });
        }

        return (products || []).map((p: any) => ({
          ...p,
          images: imagesMap[p.id] || [],
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

  const makeAddToCart = (p: any) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    addToCart(
      { productId: p.id, quantity: 1 },
      {
        onSuccess: () => showToast("Adicionado ao carrinho 🛒"),
        onError: () => showToast("Erro ao adicionar ao carrinho"),
      }
    );
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
            images={p.images}
            isTrending={(trendingIds as Set<string>).has(p.id)}
            isFav={isFavorite(p.id)}
            onFav={makeFav(p.id)}
            onAddToCart={makeAddToCart(p)}
            onClick={() => navigate(`/produto/${p.id}`)}
            index={i}
            tick={tick}
            flashRemaining={flashRemaining}
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
