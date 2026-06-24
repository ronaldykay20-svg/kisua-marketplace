import { useEffect, useRef, useCallback, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, Flame, ShoppingCart, Star, Truck, Users } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 20;

// ─── Lazy Image — só carrega quando entra no ecrã ────────────────────────────
const LazyImage = ({ src, alt }: { src: string | null; alt: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShow(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 bg-[#f5ede4]">
      {show && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
      {(!show || !loaded) && (
        <div className="absolute inset-0 bg-[#f0e6da] animate-pulse" />
      )}
    </div>
  );
};

// ─── Card mobile estilo SHEIN ─────────────────────────────────────────────────
const ProductCard = ({
  p,
  isTrending,
  isFav,
  onFav,
  onClick,
}: {
  p: any;
  isTrending: boolean;
  isFav: boolean;
  onFav: (e: React.MouseEvent) => void;
  onClick: () => void;
}) => {
  const [pressed, setPressed] = useState(false);

  // Altura da imagem variável baseada no id para efeito masonry natural
  const imgRatio = (parseInt(p.id?.slice(-4) || "0", 16) % 3 === 0) ? "5/6" : "4/5";

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
        boxShadow: pressed
          ? "0 1px 3px rgba(100,50,15,0.10)"
          : "0 2px 8px rgba(100,50,15,0.09)",
        transform: pressed ? "scale(0.975)" : "scale(1)",
        transition: "transform 0.13s ease, box-shadow 0.13s ease",
      }}
    >
      {/* Imagem */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: imgRatio }}>
        <LazyImage src={p.cover_url || p.image_url || null} alt={p.title} />

        {/* Badge desconto */}
        {p.discount_percent > 0 && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "#c0522a", borderRadius: "3px" }}
          >
            -{p.discount_percent}%
          </span>
        )}

        {/* Badge trending */}
        {isTrending && !p.discount_percent && (
          <span
            className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black text-white z-10"
            style={{ background: "rgba(18,8,2,0.72)", borderRadius: "3px" }}
          >
            <Flame className="w-2.5 h-2.5" /> Hot
          </span>
        )}

        {/* Frete grátis */}
        {p.free_shipping && (
          <span
            className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-white z-10"
            style={{ background: "rgba(26,92,58,0.85)", borderRadius: "3px" }}
          >
            <Truck className="w-2.5 h-2.5" /> Grátis
          </span>
        )}

        {/* Coração */}
        <button
          onClick={onFav}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(253,248,244,0.92)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
          aria-label="Favorito"
        >
          <Heart
            className="w-3.5 h-3.5 transition-all"
            style={{ color: isFav ? "#c0522a" : "#b08060", fill: isFav ? "#c0522a" : "none" }}
          />
        </button>
      </div>

      {/* Info */}
      <div className="px-2 pt-1.5 pb-2">
        <p className="text-[12px] font-medium text-[#6b3a1f] line-clamp-2 leading-snug mb-1">
          {p.title}
        </p>

        {/* Avaliação */}
        {p.rating >= 3.5 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-[#9a7060]">{Number(p.rating).toFixed(1)}</span>
            {p.total_reviews > 0 && (
              <span className="text-[10px] text-[#b09080]">({p.total_reviews})</span>
            )}
          </div>
        )}

        {/* Vendidos */}
        {p.sales_count > 0 && (
          <p className="text-[10px] text-[#9a7060] mb-1 flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos
          </p>
        )}

        {/* Preço */}
        <div className="flex items-baseline gap-1.5 mt-0.5">
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

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ tall }: { tall: boolean }) => (
  <div className="w-full mb-2 overflow-hidden animate-pulse" style={{ borderRadius: "8px", background: "#fdf8f4" }}>
    <div style={{ aspectRatio: tall ? "5/6" : "4/5", background: "#f0e6da" }} />
    <div className="px-2 pt-1.5 pb-2 space-y-1.5">
      <div className="h-3 bg-[#f0e6da] rounded w-4/5" />
      <div className="h-3 bg-[#f0e6da] rounded w-3/5" />
      <div className="h-4 bg-[#f0e6da] rounded w-2/5 mt-1" />
    </div>
  </div>
);

// ─── Página principal ─────────────────────────────────────────────────────────
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
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.length,
      initialPageParam: 0,
    });

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

  // Sentinel para carregar mais
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

  const allProducts = data?.pages.flat() || [];
  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  if (isLoading) {
    return (
      <section className="px-2 pt-3 pb-4">
        <div className="flex gap-2">
          <div className="flex-1">
            {[0, 1, 2].map(i => <SkeletonCard key={i} tall={i % 3 === 0} />)}
          </div>
          <div className="flex-1">
            {[0, 1, 2].map(i => <SkeletonCard key={i} tall={i % 3 !== 0} />)}
          </div>
        </div>
      </section>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <section className="px-2 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-bold text-[#1a0f07]">Para si</h2>
        <span className="text-[10px] text-[#9a7060]">{allProducts.length} produtos</span>
      </div>

      {/* Grelha 2 colunas — mobile only */}
      <div className="flex gap-2">
        {/* Coluna esquerda */}
        <div className="flex-1">
          {col1.map((p: any, i: number) => (
            <ProductCard
              key={p.id}
              p={p}
              isTrending={(trendingIds as Set<string>).has(p.id)}
              isFav={isFavorite(p.id)}
              onFav={(e) => {
                e.stopPropagation();
                if (!user) { navigate("/auth"); return; }
                toggleFavorite(p.id);
              }}
              onClick={() => navigate(`/produto/${p.id}`)}
            />
          ))}
        </div>

        {/* Coluna direita */}
        <div className="flex-1">
          {col2.map((p: any, i: number) => (
            <ProductCard
              key={p.id}
              p={p}
              isTrending={(trendingIds as Set<string>).has(p.id)}
              isFav={isFavorite(p.id)}
              onFav={(e) => {
                e.stopPropagation();
                if (!user) { navigate("/auth"); return; }
                toggleFavorite(p.id);
              }}
              onClick={() => navigate(`/produto/${p.id}`)}
            />
          ))}

          {/* Skeletons enquanto carrega mais — só na coluna direita para não deslocar */}
          {isFetchingNextPage && (
            <>
              <SkeletonCard tall={false} />
              <SkeletonCard tall={true} />
            </>
          )}
        </div>
      </div>

      {/* Sentinel invisível no fim */}
      <div ref={sentinelRef} className="h-4" />

      {/* Fim da lista */}
      {!hasNextPage && allProducts.length > 0 && (
        <div className="flex flex-col items-center gap-1 py-4">
          <div className="w-8 h-0.5 rounded-full bg-[#e8d5c4]" />
          <p className="text-[11px] text-[#9a7060]">Viu todos os produtos 🎉</p>
        </div>
      )}
    </section>
  );
};

export default InfiniteProducts;
