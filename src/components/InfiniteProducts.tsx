import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Flame, Star, Truck, Users } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 20;

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

  // Reset quando src muda (loop infinito com nova imagem)
  useEffect(() => { setLoaded(false); }, [src]);

  return (
    // Imagem mais compacta/quadrada (estilo grelha B2B), em vez do formato alto/retrato anterior
    <div ref={wrapRef} className="relative w-full overflow-hidden aspect-square" style={{ background: "#f0e6da" }}>
      {(!visible || !loaded) && (
        <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(135deg, #f0e6da 0%, #e8d5c4 100%)" }} />
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

// ─── Mapa de cores dos badges do produto (valores reais do formulário do vendedor) ──
const BADGE_STYLES: Record<string, { label: string; bg: string; icon?: any }> = {
  HOT: { label: "HOT", bg: "#f57c00", icon: Flame },
  NOVO: { label: "NOVO", bg: "#1e88e5" },
  PROMO: { label: "PROMO", bg: "#e53935" },
  LIMITED: { label: "LIMITADO", bg: "#7b1fa2" },
};

const getBadgeStyle = (badge: string | null | undefined) => {
  if (!badge) return null;
  return BADGE_STYLES[badge] || null;
};

// ─── Card (estilo da página: bege quente, sem arestas duras) ──────────────────
const ProductCard = ({
  p, coverOverride, isTrending, isFav, onFav, onClick,
}: {
  p: any; coverOverride?: string | null; isTrending: boolean;
  isFav: boolean; onFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) => {
  const [pressed, setPressed] = useState(false);
  const cover = coverOverride ?? p.cover_url ?? p.image_url ?? null;

  // Prioridade do badge superior-esquerdo: desconto > badge custom (Promoção/Limitado/etc.) > Hot por trending
  const customBadge = !p.discount_percent ? getBadgeStyle(p.badge) : null;
  const showHotFallback = isTrending && !p.discount_percent && !customBadge;

  return (
    <div
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="w-full cursor-pointer select-none overflow-hidden"
      style={{
        borderRadius: "3px",
        background: "#ffffff",
        boxShadow: pressed
          ? "0 1px 4px rgba(107,58,31,0.12)"
          : "0 2px 10px rgba(107,58,31,0.10)",
        transform: pressed ? "scale(0.974)" : "scale(1)",
        transition: "transform 0.13s ease, box-shadow 0.13s ease",
      }}
    >
      {/* Imagem */}
      <div className="relative">
        <LazyImg src={cover} alt={p.title} />

        {/* Desconto (vermelho vivo) */}
        {p.discount_percent > 0 && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#e53935", borderRadius: "4px" }}
          >
            -{p.discount_percent}%
          </span>
        )}

        {/* Badge customizado do produto (HOT, NOVO, PROMO, LIMITED) */}
        {customBadge && (
          <span
            className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: customBadge.bg, borderRadius: "4px" }}
          >
            {customBadge.icon && <customBadge.icon className="w-2.5 h-2.5" />}
            {customBadge.label}
          </span>
        )}

        {/* Hot por trending (fallback apenas quando não há desconto nem badge custom escolhido pelo vendedor) */}
        {showHotFallback && (
          <span
            className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#f57c00", borderRadius: "4px" }}
          >
            <Flame className="w-2.5 h-2.5" /> Hot
          </span>
        )}

        {/* Frete grátis */}
        {p.free_shipping && (
          <span
            className="absolute bottom-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(26,92,58,0.88)", borderRadius: "4px" }}
          >
            <Truck className="w-2.5 h-2.5" /> Grátis
          </span>
        )}

        {/* Coração */}
        <button
          onClick={onFav}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{
            background: "rgba(253,248,244,0.93)",
            boxShadow: "0 1px 5px rgba(107,58,31,0.18)",
          }}
        >
          <Heart
            className="w-3.5 h-3.5 transition-all"
            style={{ color: isFav ? "#b84c1e" : "#c8a882", fill: isFav ? "#b84c1e" : "none" }}
          />
        </button>
      </div>

      {/* Info — compacta: título resumido, avaliação/vendidos discretos, preço em destaque */}
      <div className="px-2 pt-1.5 pb-2">
        <p className="text-[11.5px] font-semibold line-clamp-2 leading-tight mb-1" style={{ color: "#6b3a1f", minHeight: "28px" }}>
          {p.title}
        </p>

        {/* Linha discreta: estrelas + vendidos juntos, tamanho reduzido */}
        {(p.rating >= 3.5 || p.sales_count > 0) && (
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {p.rating >= 3.5 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
                <span className="text-[9px]" style={{ color: "#b09080" }}>
                  {Number(p.rating).toFixed(1)}
                  {p.total_reviews > 0 ? ` (${p.total_reviews})` : ""}
                </span>
              </span>
            )}
            {p.rating >= 3.5 && p.sales_count > 0 && (
              <span className="text-[9px]" style={{ color: "#d4c4b4" }}>•</span>
            )}
            {p.sales_count > 0 && (
              <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "#b09080" }}>
                <Users className="w-2 h-2" /> {p.sales_count}+ vendidos
              </span>
            )}
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
  <div className="w-full overflow-hidden animate-pulse" style={{ borderRadius: "3px", background: "#ffffff" }}>
    <div style={{ aspectRatio: "1/1", background: "#f0e6da" }} />
    <div className="px-2 pt-1.5 pb-2 space-y-1.5">
      <div className="h-3 rounded w-4/5" style={{ background: "#f0e6da" }} />
      <div className="h-3 rounded w-3/5" style={{ background: "#f0e6da" }} />
      <div className="h-3.5 rounded w-2/5 mt-1" style={{ background: "#f0e6da" }} />
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const InfiniteProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Controla o ciclo de loop — incrementa para reiniciar com novas imagens
  const [loopCycle, setLoopCycle] = useState(0);
  // Pool de covers extra para o loop
  const extraCoversRef = useRef<string[]>([]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["infinite_products", loopCycle],
      queryFn: async ({ pageParam = 0 }) => {
        const from = pageParam * PAGE_SIZE;
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("sales_count", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
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
        return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] || null }));
      },
      getNextPageParam: (last, all) => last.length < PAGE_SIZE ? undefined : all.length,
      initialPageParam: 0,
    });

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

  const allProducts = data?.pages.flat() || [];

  // Quando chega ao fim, guarda covers e reinicia com novo ciclo
  useEffect(() => {
    if (!hasNextPage && allProducts.length > 0 && !isFetchingNextPage) {
      // Recolhe todas as covers disponíveis embaralhadas
      const covers = allProducts
        .map((p: any) => p.cover_url).filter(Boolean) as string[];
      // Embaralha
      for (let i = covers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [covers[i], covers[j]] = [covers[j], covers[i]];
      }
      extraCoversRef.current = covers;
      // Espera 400ms para não ser abrupto, depois reinicia
      const t = setTimeout(() => setLoopCycle(c => c + 1), 400);
      return () => clearTimeout(t);
    }
  }, [hasNextPage, isFetchingNextPage]);

  // Assign covers do loop: no ciclo > 0, roda as covers guardadas
  const getLoopCover = (index: number): string | null => {
    if (loopCycle === 0) return null;
    const pool = extraCoversRef.current;
    if (!pool.length) return null;
    return pool[index % pool.length];
  };

  // Sentinel — carregar mais
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
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

  const makeFav = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(id);
  };

  if (isLoading) return (
    <section className="px-2 md:px-4 pt-3 pb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} />)}
      </div>
    </section>
  );

  if (allProducts.length === 0) return null;

  return (
    <section className="px-2 md:px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm font-bold" style={{ color: "#1a0f07" }}>Para si</h2>
        <span className="text-[10px]" style={{ color: "#9a7060" }}>{allProducts.length} produtos</span>
      </div>

      {/* Grelha responsiva alinhada: 2 mobile, 3 tablet, 5 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        {allProducts.map((p: any, i: number) => (
          <ProductCard
            key={`${p.id}-${loopCycle}`}
            p={p}
            coverOverride={loopCycle > 0 ? getLoopCover(i) : null}
            isTrending={(trendingIds as Set<string>).has(p.id)}
            isFav={isFavorite(p.id)}
            onFav={makeFav(p.id)}
            onClick={() => navigate(`/produto/${p.id}`)}
          />
        ))}
        {isFetchingNextPage && [0, 1, 2, 3, 4].map(i => <Skeleton key={`skeleton-${i}`} />)}
      </div>

      {/* Sentinel invisível */}
      <div ref={sentinelRef} className="h-2" />
    </section>
  );
};

export default InfiniteProducts;
