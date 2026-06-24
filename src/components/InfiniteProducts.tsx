import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Flame, Star, Truck, Users } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 20;

// ─── Lazy Image ───────────────────────────────────────────────────────────────
const LazyImg = ({ src, alt, ratio }: { src: string | null; alt: string; ratio: string }) => {
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
    <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ aspectRatio: ratio, background: "#f0e6da" }}>
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

// ─── Card (estilo da página: bege quente, sem arestas duras) ──────────────────
const ProductCard = ({
  p, coverOverride, isTrending, isFav, onFav, onClick, tall,
}: {
  p: any; coverOverride?: string | null; isTrending: boolean;
  isFav: boolean; onFav: (e: React.MouseEvent) => void;
  onClick: () => void; tall: boolean;
}) => {
  const [pressed, setPressed] = useState(false);
  const cover = coverOverride ?? p.cover_url ?? p.image_url ?? null;

  return (
    <div
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="w-full mb-2 cursor-pointer select-none overflow-hidden"
      style={{
        borderRadius: "10px",
        background: "#fdf8f4",
        boxShadow: pressed
          ? "0 1px 4px rgba(107,58,31,0.12)"
          : "0 2px 10px rgba(107,58,31,0.10)",
        transform: pressed ? "scale(0.974)" : "scale(1)",
        transition: "transform 0.13s ease, box-shadow 0.13s ease",
      }}
    >
      {/* Imagem */}
      <div className="relative">
        <LazyImg src={cover} alt={p.title} ratio={tall ? "3/4" : "4/5"} />

        {/* Desconto */}
        {p.discount_percent > 0 && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#b84c1e", borderRadius: "4px" }}
          >
            -{p.discount_percent}%
          </span>
        )}

        {/* Hot */}
        {isTrending && !p.discount_percent && (
          <span
            className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "rgba(26,15,7,0.78)", borderRadius: "4px" }}
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

      {/* Info */}
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="text-[12px] font-semibold line-clamp-2 leading-snug mb-1" style={{ color: "#6b3a1f" }}>
          {p.title}
        </p>

        {p.rating >= 3.5 && (
          <div className="flex items-center gap-0.5 mb-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px]" style={{ color: "#9a7060" }}>{Number(p.rating).toFixed(1)}</span>
            {p.total_reviews > 0 && (
              <span className="text-[10px]" style={{ color: "#b09080" }}>({p.total_reviews})</span>
            )}
          </div>
        )}

        {p.sales_count > 0 && (
          <p className="text-[10px] mb-0.5 flex items-center gap-0.5" style={{ color: "#9a7060" }}>
            <Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
          <span className="font-black leading-none" style={{ fontSize: "15px", color: "#1a0f07" }}>
            {Number(p.price).toLocaleString("pt-AO")} Kz
          </span>
          {p.old_price && (
            <span className="text-[10px] line-through" style={{ color: "#b09080" }}>
              {Number(p.old_price).toLocaleString("pt-AO")} Kz
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ tall }: { tall: boolean }) => (
  <div className="w-full mb-2 overflow-hidden animate-pulse" style={{ borderRadius: "10px", background: "#fdf8f4" }}>
    <div style={{ aspectRatio: tall ? "3/4" : "4/5", background: "#f0e6da" }} />
    <div className="px-2.5 pt-2 pb-2.5 space-y-1.5">
      <div className="h-3 rounded w-4/5" style={{ background: "#f0e6da" }} />
      <div className="h-3 rounded w-3/5" style={{ background: "#f0e6da" }} />
      <div className="h-4 rounded w-2/5 mt-1" style={{ background: "#f0e6da" }} />
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

  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  const makeFav = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(id);
  };

  if (isLoading) return (
    <section className="px-2 pt-3 pb-4">
      <div className="flex gap-2">
        <div className="flex-1">{[0,1,2].map(i => <Skeleton key={i} tall={i===0} />)}</div>
        <div className="flex-1 mt-4">{[0,1,2].map(i => <Skeleton key={i} tall={i===1} />)}</div>
      </div>
    </section>
  );

  if (allProducts.length === 0) return null;

  return (
    <section className="px-2 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 className="text-sm font-bold" style={{ color: "#1a0f07" }}>Para si</h2>
        <span className="text-[10px]" style={{ color: "#9a7060" }}>{allProducts.length} produtos</span>
      </div>

      {/* Grelha 2 colunas masonry */}
      <div className="flex gap-2">
        {/* Coluna esquerda */}
        <div className="flex-1">
          {col1.map((p: any, i: number) => (
            <ProductCard
              key={`${p.id}-${loopCycle}`}
              p={p}
              coverOverride={loopCycle > 0 ? getLoopCover(i * 2) : null}
              tall={i % 3 === 0}
              isTrending={(trendingIds as Set<string>).has(p.id)}
              isFav={isFavorite(p.id)}
              onFav={makeFav(p.id)}
              onClick={() => navigate(`/produto/${p.id}`)}
            />
          ))}
          {isFetchingNextPage && <Skeleton tall={false} />}
        </div>

        {/* Coluna direita — offset para efeito masonry */}
        <div className="flex-1 mt-5">
          {col2.map((p: any, i: number) => (
            <ProductCard
              key={`${p.id}-${loopCycle}`}
              p={p}
              coverOverride={loopCycle > 0 ? getLoopCover(i * 2 + 1) : null}
              tall={i % 3 === 1}
              isTrending={(trendingIds as Set<string>).has(p.id)}
              isFav={isFavorite(p.id)}
              onFav={makeFav(p.id)}
              onClick={() => navigate(`/produto/${p.id}`)}
            />
          ))}
          {isFetchingNextPage && <Skeleton tall={true} />}
        </div>
      </div>

      {/* Sentinel invisível */}
      <div ref={sentinelRef} className="h-2" />
    </section>
  );
};

export default InfiniteProducts;
