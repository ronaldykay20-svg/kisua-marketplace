import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Flame, Star, Truck, Users, ShieldCheck } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 20;

// ─── Lazy Image — só renderiza quando entra no viewport ──────────────────────
const LazyImg = ({ src, alt, ratio }: { src: string | null; alt: string; ratio: string }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // rootMargin grande: começa a carregar antes de chegar ao ecrã
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden bg-[#f0e6da]" style={{ aspectRatio: ratio }}>
      {/* Skeleton enquanto não está visível ou a carregar */}
      {(!visible || !loaded) && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0e6da] to-[#e8d5c4] animate-pulse" />
      )}
      {visible && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.25s ease" }}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
};

// ─── Card Mobile (2 colunas, estilo SHEIN) ────────────────────────────────────
const MobileCard = ({
  p, isTrending, isFav, onFav, onClick, tall,
}: {
  p: any; isTrending: boolean; isFav: boolean;
  onFav: (e: React.MouseEvent) => void; onClick: () => void; tall: boolean;
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="w-full mb-2 cursor-pointer select-none overflow-hidden"
      style={{
        borderRadius: "8px",
        background: "#fdf8f4",
        boxShadow: pressed ? "0 1px 3px rgba(100,50,15,0.10)" : "0 2px 8px rgba(100,50,15,0.09)",
        transform: pressed ? "scale(0.975)" : "scale(1)",
        transition: "transform 0.13s ease, box-shadow 0.13s ease",
      }}
    >
      {/* Imagem — altura variável para efeito masonry */}
      <div className="relative">
        <LazyImg src={p.cover_url || p.image_url || null} alt={p.title} ratio={tall ? "3/4" : "4/5"} />

        {/* Badges */}
        {p.discount_percent > 0 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#c0522a", borderRadius: "3px" }}>
            -{p.discount_percent}%
          </span>
        )}
        {isTrending && !p.discount_percent && (
          <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "rgba(18,8,2,0.75)", borderRadius: "3px" }}>
            <Flame className="w-2.5 h-2.5" /> Hot
          </span>
        )}
        {p.free_shipping && (
          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(26,92,58,0.85)", borderRadius: "3px" }}>
            <Truck className="w-2.5 h-2.5" /> Grátis
          </span>
        )}
        {/* Coração */}
        <button
          onClick={onFav}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(253,248,244,0.92)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
        >
          <Heart className="w-3.5 h-3.5 transition-all"
            style={{ color: isFav ? "#c0522a" : "#b08060", fill: isFav ? "#c0522a" : "none" }} />
        </button>
      </div>

      {/* Info */}
      <div className="px-2 pt-1.5 pb-2">
        <p className="text-[12px] font-medium text-[#6b3a1f] line-clamp-2 leading-snug mb-1">{p.title}</p>
        {p.rating >= 3.5 && (
          <div className="flex items-center gap-0.5 mb-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-[#9a7060]">{Number(p.rating).toFixed(1)}</span>
            {p.total_reviews > 0 && <span className="text-[10px] text-[#b09080]">({p.total_reviews})</span>}
          </div>
        )}
        {p.sales_count > 0 && (
          <p className="text-[10px] text-[#9a7060] mb-0.5 flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos
          </p>
        )}
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[15px] font-black text-[#1a0f07] leading-none">
            {Number(p.price).toLocaleString("pt-AO")} Kz
          </span>
          {p.old_price && (
            <span className="text-[10px] text-[#b09080] line-through">
              {Number(p.old_price).toLocaleString("pt-AO")} Kz
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Card Desktop/Tablet (grelha uniforme) ────────────────────────────────────
const DesktopCard = ({
  p, isTrending, isFav, onFav, onClick,
}: {
  p: any; isTrending: boolean; isFav: boolean;
  onFav: (e: React.MouseEvent) => void; onClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer overflow-hidden bg-card rounded-card border border-border"
      style={{
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.18s ease",
      }}
    >
      <div className="relative">
        <LazyImg src={p.cover_url || p.image_url || null} alt={p.title} ratio="1/1" />
        {p.discount_percent > 0 && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-black text-white rounded z-10"
            style={{ background: "#c0522a" }}>
            -{p.discount_percent}%
          </span>
        )}
        {isTrending && !p.discount_percent && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white rounded z-10"
            style={{ background: "rgba(18,8,2,0.75)" }}>
            <Flame className="w-2.5 h-2.5" /> Hot
          </span>
        )}
        <button onClick={onFav}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow z-10">
          <Heart className="w-3.5 h-3.5 transition-all"
            style={{ color: isFav ? "#c0522a" : "#999", fill: isFav ? "#c0522a" : "none" }} />
        </button>
        {p.free_shipping && (
          <span className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white rounded z-10"
            style={{ background: "rgba(26,92,58,0.85)" }}>
            <Truck className="w-2.5 h-2.5" /> Frete grátis
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug mb-1.5">{p.title}</p>
        {p.rating >= 3.5 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] text-muted-foreground">{Number(p.rating).toFixed(1)}</span>
            {p.total_reviews > 0 && <span className="text-[11px] text-muted-foreground">({p.total_reviews})</span>}
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-foreground">
            {Number(p.price).toLocaleString("pt-AO")} Kz
          </span>
          {p.old_price && (
            <span className="text-[10px] text-muted-foreground line-through">
              {Number(p.old_price).toLocaleString("pt-AO")} Kz
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────
const MobileSkeleton = ({ tall }: { tall: boolean }) => (
  <div className="w-full mb-2 overflow-hidden animate-pulse" style={{ borderRadius: "8px", background: "#fdf8f4" }}>
    <div style={{ aspectRatio: tall ? "3/4" : "4/5" }} className="bg-[#f0e6da]" />
    <div className="px-2 pt-1.5 pb-2 space-y-1.5">
      <div className="h-3 bg-[#f0e6da] rounded w-4/5" />
      <div className="h-3 bg-[#f0e6da] rounded w-3/5" />
      <div className="h-4 bg-[#f0e6da] rounded w-2/5 mt-1" />
    </div>
  </div>
);

const DesktopSkeleton = () => (
  <div className="bg-card rounded-card border border-border overflow-hidden animate-pulse">
    <div className="aspect-square bg-muted" />
    <div className="p-2.5 space-y-2">
      <div className="h-3 bg-muted rounded w-4/5" />
      <div className="h-3 bg-muted rounded w-3/5" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const InfiniteProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["infinite_products"],
      queryFn: async ({ pageParam = 0 }) => {
        const from = pageParam * PAGE_SIZE;
        const { data, error } = await supabase
          .from("products").select("*")
          .eq("is_active", true)
          .order("sales_count", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const ids = (data || []).map((p: any) => p.id);
        let coverMap: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: media } = await supabase
            .from("product_media").select("product_id, url")
            .in("product_id", ids).eq("is_cover", true);
          (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
        }
        return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] || null }));
      },
      getNextPageParam: (last, all) => last.length < PAGE_SIZE ? undefined : all.length,
      initialPageParam: 0,
    });

  const { data: trendingIds = new Set<string>() } = useQuery({
    queryKey: ["trending_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("products")
        .select("id, category, sales_count").eq("is_active", true)
        .order("sales_count", { ascending: false }).limit(100);
      if (!data) return new Set<string>();
      const seen = new Set<string>(); const top = new Set<string>();
      for (const p of data) {
        if (p.category && !seen.has(p.category)) { seen.add(p.category); top.add(p.id); }
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
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  const allProducts = data?.pages.flat() || [];
  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  const makeFavHandler = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(id);
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) return (
    <>
      {/* Mobile skeleton */}
      <section className="px-2 pt-3 pb-4 sm:hidden">
        <div className="flex gap-2">
          <div className="flex-1">{[0,1,2].map(i => <MobileSkeleton key={i} tall={i===0} />)}</div>
          <div className="flex-1">{[0,1,2].map(i => <MobileSkeleton key={i} tall={i===1} />)}</div>
        </div>
      </section>
      {/* Desktop skeleton */}
      <section className="hidden sm:block px-4 pt-4 pb-6">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => <DesktopSkeleton key={i} />)}
        </div>
      </section>
    </>
  );

  if (allProducts.length === 0) return null;

  return (
    <>
      {/* ── MOBILE: 2 colunas masonry estilo SHEIN ── */}
      <section className="px-2 pt-3 pb-2 sm:hidden">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h2 className="text-sm font-bold text-[#1a0f07]">Para si</h2>
          <span className="text-[10px] text-[#9a7060]">{allProducts.length} produtos</span>
        </div>
        <div className="flex gap-2">
          {/* Coluna esquerda */}
          <div className="flex-1">
            {col1.map((p: any, i: number) => (
              <MobileCard
                key={p.id} p={p}
                tall={i % 3 === 0}
                isTrending={(trendingIds as Set<string>).has(p.id)}
                isFav={isFavorite(p.id)}
                onFav={makeFavHandler(p.id)}
                onClick={() => navigate(`/produto/${p.id}`)}
              />
            ))}
            {isFetchingNextPage && <MobileSkeleton tall={false} />}
          </div>
          {/* Coluna direita — ligeiramente desfasada para efeito masonry */}
          <div className="flex-1 mt-4">
            {col2.map((p: any, i: number) => (
              <MobileCard
                key={p.id} p={p}
                tall={i % 3 === 1}
                isTrending={(trendingIds as Set<string>).has(p.id)}
                isFav={isFavorite(p.id)}
                onFav={makeFavHandler(p.id)}
                onClick={() => navigate(`/produto/${p.id}`)}
              />
            ))}
            {isFetchingNextPage && <MobileSkeleton tall={true} />}
          </div>
        </div>
      </section>

      {/* ── TABLET/DESKTOP: grelha uniforme ── */}
      <section className="hidden sm:block px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Para si</h2>
          <span className="text-xs text-muted-foreground">{allProducts.length} produtos</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allProducts.map((p: any) => (
            <DesktopCard
              key={p.id} p={p}
              isTrending={(trendingIds as Set<string>).has(p.id)}
              isFav={isFavorite(p.id)}
              onFav={makeFavHandler(p.id)}
              onClick={() => navigate(`/produto/${p.id}`)}
            />
          ))}
          {isFetchingNextPage && [...Array(5)].map((_, i) => <DesktopSkeleton key={i} />)}
        </div>
      </section>

      {/* Sentinel invisível — dispara carregamento da próxima página */}
      <div ref={sentinelRef} className="h-2" />

      {/* Fim da lista */}
      {!hasNextPage && allProducts.length > 0 && (
        <div className="flex flex-col items-center gap-1 py-5">
          <div className="w-8 h-0.5 rounded-full bg-[#e8d5c4]" />
          <p className="text-[11px] text-[#9a7060]">Chegou ao fim 🎉</p>
        </div>
      )}
    </>
  );
};

export default InfiniteProducts;
