import { useState, useEffect, useCallback } from "react";
import { Zap, Tag, Heart, ChevronRight, Star, TrendingDown, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const usePromoProducts = () =>
  useQuery({
    queryKey: ["promotions_page_products"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("discount_percent", "is", null)
        .gt("discount_percent", 0)
        .or(`promotion_ends_at.is.null,promotion_ends_at.gt.${now}`)
        .order("discount_percent", { ascending: false })
        .limit(80);
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => {
          coverMap[m.product_id] = m.url;
        });
      }
      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
    },
    refetchInterval: 60000,
  });

const ProductCountdown = ({ endsAt }: { endsAt: string | null }) => {
  const calcLeft = useCallback(() => {
    if (!endsAt) return null;
    return new Date(endsAt).getTime() - Date.now();
  }, [endsAt]);

  const [timeLeft, setTimeLeft] = useState(calcLeft());

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setTimeLeft(calcLeft()), 1000);
    return () => clearInterval(t);
  }, [endsAt, calcLeft]);

  if (!endsAt || timeLeft === null || timeLeft <= 0) return null;

  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  const isUrgent = timeLeft < 3600000;

  return (
    <div className={`flex items-center gap-0.5 mt-1 ${isUrgent ? "text-red-700" : "text-amber-800"}`}>
      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
      <span className="text-[9px] font-bold">
        {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
};

const GlobalCountdown = ({ products }: { products: any[] }) => {
  const soonest = products
    .filter((p) => p.promotion_ends_at)
    .map((p) => new Date(p.promotion_ends_at).getTime())
    .sort((a, b) => a - b)[0];

  const calcLeft = useCallback(() => {
    if (!soonest) return null;
    return soonest - Date.now();
  }, [soonest]);

  const [timeLeft, setTimeLeft] = useState(calcLeft());

  useEffect(() => {
    if (!soonest) return;
    const t = setInterval(() => setTimeLeft(calcLeft()), 1000);
    return () => clearInterval(t);
  }, [soonest, calcLeft]);

  if (!soonest || timeLeft === null || timeLeft <= 0) return null;

  const h = Math.max(0, Math.floor(timeLeft / 3600000));
  const m = Math.max(0, Math.floor((timeLeft % 3600000) / 60000));
  const s = Math.max(0, Math.floor((timeLeft % 60000) / 1000));

  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-white/20 text-white text-xs font-black px-2 py-1 rounded min-w-[28px] text-center">
            {String(v).padStart(2, "0")}
          </span>
          {i < 2 && <span className="text-white/80 font-bold text-xs">:</span>}
        </span>
      ))}
    </div>
  );
};

const Promocoes = () => {
  const navigate = useNavigate();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { data: allProducts = [], isLoading } = usePromoProducts();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const products = allProducts.filter((p: any) => {
    if (!p.promotion_ends_at) return true;
    return new Date(p.promotion_ends_at).getTime() > now;
  });

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-14 md:pb-0" style={{ background: "#F5EAE3" }}>

      <div style={{ background: "#6B3A2A" }} className="px-3 py-5">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#C0392B" }}>
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">PROMOÇÕES</h1>
              <p className="text-[11px] text-white/70">Ofertas reais por tempo limitado</p>
            </div>
          </div>
          {products.some((p: any) => p.promotion_ends_at) && (
            <div className="text-right">
              <p className="text-[9px] text-white/60 mb-1">Próxima a terminar</p>
              <GlobalCountdown products={products} />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-2 py-3">

        <div
          className="mb-3 rounded-xl p-3 flex items-center justify-between"
          style={{ background: "#C0392B" }}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-white" />
            <div>
              <p className="text-xs font-black text-white">OFERTAS DO DIA</p>
              <p className="text-[10px] text-white/70">
                {isLoading ? "A carregar..." : `${products.length} produto${products.length !== 1 ? "s" : ""} em promoção`}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/50" />
        </div>

        {isLoading ? (
          <p className="text-center text-sm py-8" style={{ color: "#6B3A2A" }}>A carregar...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#8B4A35" }}>Sem produtos em promoção no momento.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
            {products.map((p: any, i: number) => {
              const soldPct = Math.min(95, 40 + i * 5);
              const isTopSeller = i < 3;
              const img = p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
              const hasTimer = !!p.promotion_ends_at;
              const timeLeft = hasTimer ? new Date(p.promotion_ends_at).getTime() - Date.now() : null;
              const isUrgent = timeLeft !== null && timeLeft < 3600000;

              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/produto/${p.id}`)}
                  className="w-full rounded-xl overflow-hidden text-left group break-inside-avoid block mb-0"
                  style={{
                    background: "#fff",
                    border: isUrgent ? "1.5px solid #C0392B" : "1.5px solid #e8d5c8",
                  }}
                >
                  <div className="relative overflow-hidden">
                    <span
                      className="absolute top-1.5 left-1.5 text-white text-[10px] font-black px-2 py-0.5 rounded-sm z-10"
                      style={{ background: "#C0392B" }}
                    >
                      -{p.discount_percent}%
                    </span>
                    {isTopSeller && (
                      <span
                        className="absolute top-1.5 right-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10"
                        style={{ background: "#6B3A2A" }}
                      >
                        #{i + 1} Top
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleLike(p.id, e)}
                      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center z-10"
                      style={{ background: "rgba(255,255,255,0.85)" }}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${likedIds.has(p.id) ? "fill-red-600 text-red-600" : "text-gray-400"}`}
                      />
                    </button>
                    <img
                      src={img}
                      alt={p.title}
                      className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-2">
                    {p.badge && (
                      <span
                        className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1"
                        style={{ background: "#F5EAE3", color: "#6B3A2A" }}
                      >
                        🔥 {p.badge}
                      </span>
                    )}

                    {i < 5 && p.rating >= 4 && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-bold mb-1"
                        style={{ color: "#1A3A5C" }}
                      >
                        <TrendingDown className="w-3 h-3" /> #{i + 1} Mais Vendido
                      </span>
                    )}

                    <h3 className="text-xs font-medium line-clamp-2 mb-1.5 leading-tight" style={{ color: "#3a2418" }}>
                      {p.title}
                    </h3>

                    {p.rating > 0 && (
                      <div className="flex items-center gap-0.5 mb-1">
                        {[...Array(5)].map((_, j) => (
                          <Star
                            key={j}
                            className="w-2.5 h-2.5"
                            style={j < (p.rating || 0) ? { fill: "#1A3A5C", color: "#1A3A5C" } : { color: "#d4b8a8" }}
                          />
                        ))}
                        <span className="text-[9px] ml-0.5" style={{ color: "#8B4A35" }}>({p.total_reviews || 0})</span>
                      </div>
                    )}

                    {p.old_price && (
                      <span className="text-[10px] line-through block" style={{ color: "#a08070" }}>
                        {formatPrice(p.old_price)}
                      </span>
                    )}
                    <span className="text-sm font-black" style={{ color: "#C0392B" }}>
                      {formatPrice(p.price)}
                    </span>

                    <ProductCountdown endsAt={p.promotion_ends_at} />

                    {p.free_shipping && (
                      <span className="block text-[9px] font-semibold mt-0.5" style={{ color: "#1A3A5C" }}>
                        Frete grátis
                      </span>
                    )}

                    <div className="relative h-3.5 rounded-full overflow-hidden mt-1.5" style={{ background: "#fde8e8" }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                        style={{ width: `${soldPct}%`, background: "#C0392B" }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                        {soldPct}% vendido
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Promocoes;
