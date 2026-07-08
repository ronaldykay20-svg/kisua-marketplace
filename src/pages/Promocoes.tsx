import { useState, useEffect, useCallback } from "react";
import { Tag, Heart, Star, TrendingDown, Clock, Flame, Percent, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Paleta de cores ──────────────────────────────────────
const C = {
  primary: "#8B2500",
  accent: "#C0392B",
  bg: "#F7EDE6",
  blue: "#1A3A5C",
  card: "#ffffff",
  badgeBg: "#F5DFD5",
  muted: "#A0522D",
  border: "#E8C9B8",
};

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

// ─── Hook de produtos em promoção ─────────────────────────
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
    refetchInterval: 60_000,
  });

// ─── Countdown por produto ────────────────────────────────
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

  const h = Math.floor(timeLeft / 3_600_000);
  const m = Math.floor((timeLeft % 3_600_000) / 60_000);
  const s = Math.floor((timeLeft % 60_000) / 1_000);
  const isUrgent = timeLeft < 3_600_000;

  return (
    <div
      className="flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md"
      style={{
        background: isUrgent ? "#C0392B15" : "#8B250010",
        border: `1px solid ${isUrgent ? "#C0392B40" : "#8B250025"}`,
      }}
    >
      <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: isUrgent ? C.accent : C.primary }} />
      <span className="text-[9px] font-black tracking-wide" style={{ color: isUrgent ? C.accent : C.primary }}>
        {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      {isUrgent && (
        <span className="text-[8px] font-bold ml-0.5" style={{ color: C.accent }}>
          A terminar!
        </span>
      )}
    </div>
  );
};

// ─── Countdown global no header ───────────────────────────
const GlobalCountdown = ({ products }: { products: any[] }) => {
  const soonest = products
    .filter((p) => p.promotion_ends_at)
    .map((p) => new Date(p.promotion_ends_at).getTime())
    .sort((a, b) => a - b)[0];

  const calcLeft = useCallback(() => (!soonest ? null : soonest - Date.now()), [soonest]);
  const [timeLeft, setTimeLeft] = useState(calcLeft());

  useEffect(() => {
    if (!soonest) return;
    const t = setInterval(() => setTimeLeft(calcLeft()), 1000);
    return () => clearInterval(t);
  }, [soonest, calcLeft]);

  if (!soonest || timeLeft === null || timeLeft <= 0) return null;

  const h = Math.max(0, Math.floor(timeLeft / 3_600_000));
  const m = Math.max(0, Math.floor((timeLeft % 3_600_000) / 60_000));
  const s = Math.max(0, Math.floor((timeLeft % 60_000) / 1_000));

  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="text-xs font-black px-2 py-1 rounded-md min-w-[28px] text-center"
            style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
          >
            {String(v).padStart(2, "0")}
          </span>
          {i < 2 && <span className="font-black text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>:</span>}
        </span>
      ))}
    </div>
  );
};

// ─── Barra de stock vendido ────────────────────────────────
const SoldBar = ({ pct, isUrgent }: { pct: number; isUrgent: boolean }) => (
  <div className="relative h-3.5 rounded-full overflow-hidden mt-2" style={{ background: "#F5DFD5" }}>
    <div
      className="absolute inset-y-0 left-0 rounded-full"
      style={{
        width: `${pct}%`,
        background: isUrgent
          ? `linear-gradient(90deg, ${C.accent}, #E74C3C)`
          : `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
        transition: "width 1.2s ease",
      }}
    />
    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow-sm">
      {pct}% vendido
    </span>
  </div>
);

// ─── Card de produto ──────────────────────────────────────
const ProductCard = ({
  p, index, liked, onToggleLike, onClick,
}: {
  p: any; index: number; liked: boolean;
  onToggleLike: (e: React.MouseEvent) => void; onClick: () => void;
}) => {
  const img = p.cover_url || p.image_url ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
  const hasTimer = !!p.promotion_ends_at;
  const timeLeft = hasTimer ? new Date(p.promotion_ends_at).getTime() - Date.now() : null;
  const isUrgent = timeLeft !== null && timeLeft < 3_600_000;
  const isTopSeller = index < 3;
  const soldPct = Math.min(95, 40 + index * 5);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl overflow-hidden text-left group block"
      style={{
        background: C.card,
        border: `1.5px solid ${isUrgent ? C.accent : C.border}`,
        boxShadow: isUrgent ? `0 4px 16px ${C.accent}28` : "0 2px 8px rgba(139,37,0,0.07)",
      }}
    >
      {/* Imagem */}
      <div className="relative overflow-hidden">
        {/* Badge desconto */}
        <span
          className="absolute top-2 left-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md z-10 flex items-center gap-0.5"
          style={{ background: C.accent }}
        >
          <Percent className="w-2.5 h-2.5" />
          {p.discount_percent}
        </span>

        {/* Badge top seller */}
        {isTopSeller && (
          <span
            className="absolute top-2 right-2 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md z-10"
            style={{ background: C.primary }}
          >
            #{index + 1} Top
          </span>
        )}

        {/* Botão like */}
        <button
          onClick={onToggleLike}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 1px 4px rgba(0,0,0,0.14)" }}
        >
          <Heart
            className="w-3.5 h-3.5"
            style={liked ? { fill: C.accent, color: C.accent } : { color: "#aaa" }}
          />
        </button>

        {/* Urgência overlay */}
        {isUrgent && (
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 py-1 z-10"
            style={{ background: `${C.accent}CC` }}
          >
            <Flame className="w-3 h-3 text-white fill-white" />
            <span className="text-[9px] font-black text-white">QUASE A ACABAR</span>
          </div>
        )}

        <img
          src={img}
          alt={p.title}
          className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Conteúdo */}
      <div className="p-2.5">
        {p.badge && (
          <span
            className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md mb-1"
            style={{ background: C.badgeBg, color: C.primary }}
          >
            🔥 {p.badge}
          </span>
        )}

        {index < 5 && (p.rating >= 4 || index < 3) && (
          <div className="flex items-center gap-0.5 mb-1">
            <TrendingDown className="w-3 h-3" style={{ color: C.blue }} />
            <span className="text-[9px] font-bold" style={{ color: C.blue }}>
              #{index + 1} Mais Vendido
            </span>
          </div>
        )}

        <h3
          className="text-xs font-semibold line-clamp-2 mb-1.5 leading-tight"
          style={{ color: "#2C1A12" }}
        >
          {p.title}
        </h3>

        {p.rating > 0 && (
          <div className="flex items-center gap-0.5 mb-1.5">
            {[...Array(5)].map((_, j) => (
              <Star
                key={j}
                className="w-2.5 h-2.5"
                style={j < (p.rating || 0) ? { fill: C.blue, color: C.blue } : { color: C.border }}
              />
            ))}
            <span className="text-[9px] ml-0.5" style={{ color: C.muted }}>
              ({p.total_reviews || 0})
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 flex-wrap">
          {p.old_price && (
            <span className="text-[10px] line-through" style={{ color: "#B08070" }}>
              {formatPrice(p.old_price)}
            </span>
          )}
          <span className="text-sm font-black" style={{ color: C.accent }}>
            {formatPrice(p.price)}
          </span>
        </div>

        {p.old_price && p.price && (
          <span className="text-[9px] font-bold mt-0.5 block" style={{ color: C.primary }}>
            Poupa {formatPrice(Math.round(Number(p.old_price) - Number(p.price)))}
          </span>
        )}

        <ProductCountdown endsAt={p.promotion_ends_at} />

        {p.free_shipping && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold mt-1" style={{ color: C.blue }}>
            <ShoppingBag className="w-2.5 h-2.5" /> Frete grátis
          </span>
        )}

        <SoldBar pct={soldPct} isUrgent={isUrgent} />
      </div>
    </button>
  );
};

// ─── Página Promoções ─────────────────────────────────────
const Promocoes = () => {
  const navigate = useNavigate();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { data: allProducts = [], isLoading } = usePromoProducts();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  // Remove automaticamente produtos com promoção expirada
  const products = allProducts.filter((p: any) => {
    if (!p.promotion_ends_at) return true;
    return new Date(p.promotion_ends_at).getTime() > now;
  });

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: C.bg }}>

      {/* ── Header ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #6B1A00 60%, #4A1200 100%)`,
        }}
      >
        <div
          className="h-1"
          style={{ background: `linear-gradient(90deg, ${C.accent}, #FF6B4A, ${C.accent})` }}
        />

        <div className="px-4 py-5 container mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${C.accent}, #E74C3C)`,
                  boxShadow: `0 4px 16px ${C.accent}55`,
                }}
              >
                <Flame className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-none"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  PROMOÇÕES
                </h1>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Ofertas reais por tempo limitado
                </p>
              </div>
            </div>

            {products.some((p: any) => p.promotion_ends_at) && (
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] font-bold mb-1.5 uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  Próxima a terminar
                </p>
                <GlobalCountdown products={products} />
              </div>
            )}
          </div>

          {!isLoading && products.length > 0 && (
            <div
              className="mt-4 rounded-xl px-4 py-2.5 flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" style={{ color: C.accent }} />
                <span className="text-white text-xs font-bold">
                  {products.length} produto{products.length !== 1 ? "s" : ""} em promoção
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ADE80" }} />
                <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Ao vivo
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="container mx-auto px-2 py-4">
        {isLoading ? (
          <div className="columns-2 gap-2 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden break-inside-avoid mb-2 animate-pulse"
                style={{ background: `${C.border}30`, border: `1px solid ${C.border}` }}
              >
                <div className="aspect-[3/4]" style={{ background: `${C.border}50` }} />
                <div className="p-2.5 space-y-2">
                  <div className="h-3 rounded-full w-3/4" style={{ background: `${C.border}70` }} />
                  <div className="h-3 rounded-full w-1/2" style={{ background: `${C.border}70` }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: C.badgeBg }}
            >
              <Flame className="w-10 h-10" style={{ color: C.border }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: C.primary }}>
                Sem promoções activas
              </p>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                Volte em breve para encontrar novas ofertas!
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 space-y-2">
            {products.map((p: any, i: number) => (
              <div key={p.id} className="break-inside-avoid mb-2">
                <ProductCard
                  p={p}
                  index={i}
                  liked={likedIds.has(p.id)}
                  onToggleLike={(e) => toggleLike(p.id, e)}
                  onClick={() => navigate(`/produto/${p.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Promocoes;
