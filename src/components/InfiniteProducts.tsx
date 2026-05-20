import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Star, Truck, Heart, Loader2, Flame,
  Users, ShieldCheck, Tag, ShoppingCart, MapPin, Package,
  BadgeCheck, Zap, Clock,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";

const PAGE_SIZE = 20;
const RATIOS = ["3/4", "1/1", "4/5", "2/3", "1/1", "3/4"];

// ─── Paleta ───────────────────────────────────────────────────────────────────
// Fundo do card: #fdf8f4 (creme quase branco)
// Texto principal: #1a0f07 (quase preto quente)
// Acento primário: #c0522a (laranja-ferrugem)
// Acento suave: #e8d5c4 (bege claro)
// Badges: fundo bege, texto castanho-escuro

// ─── Info Pill ────────────────────────────────────────────────────────────────
const InfoPill = ({ type, children }: { type: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    shipping:  "bg-[#e8f4ef] text-[#1a5c3a]",
    sales:     "bg-[#fff3e8] text-[#7a3a10]",
    recurrent: "bg-[#f0ecff] text-[#4a3080]",
    promo:     "bg-[#fff0ed] text-[#c0522a]",
    fast:      "bg-[#e8f4ef] text-[#1a5c3a]",
    rated:     "bg-[#fffbeb] text-[#7a5500]",
    secure:    "bg-[#f0f4ff] text-[#2a4080]",
    category:  "bg-[#fdf3ea] text-[#7a3a10]",
    trending:  "bg-[#fff0ed] text-[#c0522a]",
    location:  "bg-[#f5f0ff] text-[#5a3090]",
    verified:  "bg-[#e8f4ef] text-[#1a5c3a]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${
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
    list.push({ type: "fast", el: <InfoPill type="fast"><Zap className="w-2.5 h-2.5" /> Entrega rápida</InfoPill> });
  if (p.rating >= 4)
    list.push({ type: "rated", el: <InfoPill type="rated"><Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {Number(p.rating).toFixed(1)}</InfoPill> });
  if (p.province)
    list.push({ type: "location", el: <InfoPill type="location"><MapPin className="w-2.5 h-2.5" /> {p.city || p.province}</InfoPill> });
  if (p.condition === "new")
    list.push({ type: "verified", el: <InfoPill type="verified"><BadgeCheck className="w-2.5 h-2.5" /> Produto novo</InfoPill> });
  list.push({ type: "secure", el: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });
  return list;
};

// ─── Rotating Info ────────────────────────────────────────────────────────────
const RotatingInfo = ({ p, isTrending, seed }: { p: any; isTrending: boolean; seed: number }) => {
  const infoList = useMemo(() => buildInfoList(p, isTrending), [p.id, isTrending]);
  const [idx, setIdx] = useState(seed % infoList.length);
  const [visible, setVisible] = useState(true);
  const interval = useMemo(() => 4000 + (seed % 7) * 800, [seed]);

  useEffect(() => {
    if (infoList.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % infoList.length);
        setVisible(true);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [infoList.length, interval]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        height: "18px",
      }}
      className="flex items-center"
    >
      {infoList[idx]?.el}
    </div>
  );
};

// ─── Seller Info Strip ────────────────────────────────────────────────────────
// Mostra informações do vendedor de forma dinâmica no rodapé
const SellerStrip = ({ p }: { p: any }) => {
  const [show, setShow] = useState(false);

  // Anima entrada com delay pequeno para não atrasar render
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  const hasLocation = p.province || p.city;
  const hasStock = p.stock > 0;
  const isNew = p.condition === "new";

  if (!hasLocation && !hasStock) return null;

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
        borderTop: "1px solid #e8d5c4",
        marginTop: "4px",
        paddingTop: "4px",
      }}
      className="flex items-center gap-1.5 flex-wrap"
    >
      {hasLocation && (
        <span className="flex items-center gap-0.5 text-[9px] text-[#8b6044]">
          <MapPin className="w-2 h-2" />
          {p.city ? `${p.city}, ` : ""}{p.province}
        </span>
      )}
      {hasStock && (
        <span className="flex items-center gap-0.5 text-[9px] text-[#8b6044]">
          <Package className="w-2 h-2" />
          {p.stock} em stock
        </span>
      )}
      {isNew && (
        <span className="flex items-center gap-0.5 text-[9px] text-[#2a7a4a]">
          <BadgeCheck className="w-2 h-2" />
          Novo
        </span>
      )}
    </div>
  );
};

// ─── Pulse Badge (para produtos trending) ────────────────────────────────────
const PulseDot = () => (
  <span className="relative flex h-2 w-2">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c0522a] opacity-60"
      style={{ animationDuration: "1.4s" }}
    />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c0522a]" />
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const InfiniteProducts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
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
    return (
      <div className="flex flex-col justify-center items-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#c0522a]" />
        <span className="text-xs text-[#8b6044] animate-pulse">A carregar produtos...</span>
      </div>
    );
  if (allProducts.length === 0) return null;

  const col1 = allProducts.filter((_: any, i: number) => i % 2 === 0);
  const col2 = allProducts.filter((_: any, i: number) => i % 2 === 1);

  // ─── CARD MOBILE ───────────────────────────────────────────────────────────
  const MobileCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const ratio = RATIOS[globalIndex % RATIOS.length];
    const isTrending = trendingIds.has(p.id);
    const showRating = p.rating > 0;
    const fav = isFavorite(p.id);
    const [pressed, setPressed] = useState(false);
    const [cartPop, setCartPop] = useState(false);

    const handleHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };

    const handleCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
      // Micro-feedback
      setCartPop(true);
      setTimeout(() => setCartPop(false), 600);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="rounded-2xl overflow-hidden cursor-pointer flex flex-col mb-2.5 select-none"
        style={{
          background: "#fdf8f4",
          boxShadow: pressed
            ? "0 1px 4px rgba(120,60,20,0.10)"
            : "0 2px 10px rgba(120,60,20,0.09)",
          transform: pressed ? "scale(0.975)" : "scale(1)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          border: "1px solid #f0e0d0",
        }}
      >
        {/* Imagem */}
        <div
          className="relative w-full overflow-hidden flex-shrink-0"
          style={{ aspectRatio: ratio, backgroundColor: "#f5ede4" }}
        >
          {img ? (
            <img
              src={img}
              alt={p.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scale(1.01)", transformOrigin: "center" }}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#c8a882]">
              <ShoppingCart className="w-6 h-6 opacity-30" />
              <span className="text-[9px]">Sem foto</span>
            </div>
          )}

          {/* Gradient overlay bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-12"
            style={{ background: "linear-gradient(to top, rgba(30,15,5,0.18), transparent)" }}
          />

          {/* Desconto badge */}
          {p.discount_percent > 0 && (
            <span
              className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-white leading-none"
              style={{ background: "#c0522a" }}
            >
              -{p.discount_percent}%
            </span>
          )}

          {/* Badge produto */}
          {p.badge && (
            <span
              className="absolute top-2 right-8 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-white leading-none"
              style={{ background: "rgba(20,10,3,0.75)", backdropFilter: "blur(4px)" }}
            >
              {p.badge}
            </span>
          )}

          {/* Trending dot */}
          {isTrending && (
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <PulseDot />
            </div>
          )}

          {/* Coração */}
          <button
            onClick={handleHeart}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90"
            style={{ background: "rgba(253,248,244,0.92)", backdropFilter: "blur(6px)" }}
            aria-label="Favorito"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all ${
                fav ? "fill-[#c0522a] text-[#c0522a] scale-110" : "text-[#b08060]"
              }`}
            />
          </button>
        </div>

        {/* Rodapé claro */}
        <div className="flex flex-col gap-1 px-2.5 pt-2 pb-2.5" style={{ background: "#fdf8f4" }}>
          {/* Título */}
          <h3 className="text-[11.5px] font-semibold text-[#1a0f07] line-clamp-2 leading-snug">
            {p.title}
          </h3>

          {/* Rating + vendidos */}
          {(showRating || p.sales_count > 0) && (
            <div className="flex items-center gap-1.5">
              {showRating && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-[#1a0f07]">{Number(p.rating).toFixed(1)}</span>
                  <span className="text-[9px] text-[#9a7060]">
                    ({(p.total_reviews || 0) > 999 ? "1k+" : p.total_reviews || 0})
                  </span>
                </div>
              )}
              {p.sales_count > 0 && (
                <span className="text-[9px] text-[#9a7060] ml-auto">{p.sales_count}+ vendidos</span>
              )}
            </div>
          )}

          {/* Preço */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[14px] font-black text-[#1a0f07] tracking-tight">
              {Number(p.price).toLocaleString("pt-AO")} Kz
            </span>
            {p.old_price && (
              <span className="text-[9px] text-[#b09080] line-through">
                {Number(p.old_price).toLocaleString("pt-AO")} Kz
              </span>
            )}
          </div>

          {/* Seller info strip */}
          <SellerStrip p={p} />

          {/* Pill rotativa + carrinho */}
          <div className="flex items-center justify-between gap-1 mt-1">
            <div className="flex-1 overflow-hidden">
              <RotatingInfo p={p} isTrending={isTrending} seed={globalIndex} />
            </div>
            <button
              onClick={handleCart}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all active:scale-90"
              style={{
                background: cartPop ? "#1a7a44" : "#c0522a",
                transform: cartPop ? "scale(1.15)" : "scale(1)",
                transition: "background 0.25s ease, transform 0.2s ease",
              }}
              aria-label="Adicionar ao carrinho"
            >
              {cartPop ? (
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              ) : (
                <ShoppingCart className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── CARD TABLET ───────────────────────────────────────────────────────────
  const TabletCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const isTrending = trendingIds.has(p.id);
    const fav = isFavorite(p.id);
    const [pressed, setPressed] = useState(false);
    const [cartPop, setCartPop] = useState(false);

    const handleHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };

    const handleCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
      setCartPop(true);
      setTimeout(() => setCartPop(false), 600);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full select-none"
        style={{
          background: "#fdf8f4",
          border: "1px solid #f0e0d0",
          boxShadow: pressed
            ? "0 1px 4px rgba(120,60,20,0.08)"
            : "0 2px 8px rgba(120,60,20,0.08)",
          transform: pressed ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        {/* Imagem */}
        <div
          className="relative w-full overflow-hidden flex-shrink-0"
          style={{ aspectRatio: "1/1", backgroundColor: "#f5ede4" }}
        >
          {img ? (
            <img
              src={img}
              alt={p.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#c8a882]">
              <ShoppingCart className="w-5 h-5 opacity-30" />
            </div>
          )}

          {/* Gradient bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-10"
            style={{ background: "linear-gradient(to top, rgba(30,15,5,0.15), transparent)" }}
          />

          {p.discount_percent > 0 && (
            <span
              className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded-md text-[9px] font-black text-white"
              style={{ background: "#c0522a" }}
            >
              -{p.discount_percent}%
            </span>
          )}
          {(p.badge || isTrending) && (
            <span
              className="absolute top-1.5 right-6 px-1 py-0.5 rounded-md text-[9px] font-black text-white"
              style={{ background: "rgba(20,10,3,0.72)", backdropFilter: "blur(4px)" }}
            >
              {p.badge || "🔥"}
            </span>
          )}
          {isTrending && !p.badge && (
            <div className="absolute top-1.5 left-1.5">
              <PulseDot />
            </div>
          )}
          <button
            onClick={handleHeart}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow transition-transform active:scale-90"
            style={{ background: "rgba(253,248,244,0.90)", backdropFilter: "blur(6px)" }}
            aria-label="Favorito"
          >
            <Heart
              className={`w-3 h-3 transition-all ${
                fav ? "fill-[#c0522a] text-[#c0522a]" : "text-[#b08060]"
              }`}
            />
          </button>
        </div>

        {/* Rodapé claro */}
        <div className="flex flex-col gap-1 px-2 pt-2 pb-2.5 flex-1" style={{ background: "#fdf8f4" }}>
          <p className="text-[10.5px] font-semibold text-[#1a0f07] line-clamp-2 leading-tight">
            {p.title}
          </p>

          <RotatingInfo p={p} isTrending={isTrending} seed={globalIndex} />

          {/* Preço */}
          <div className="flex items-baseline gap-1 mt-auto pt-1">
            <span className="text-[12px] font-black text-[#1a0f07] tracking-tight leading-none">
              {Number(p.price).toLocaleString("pt-AO")} Kz
            </span>
            {p.old_price && (
              <span className="text-[9px] text-[#b09080] line-through leading-none">
                {Number(p.old_price).toLocaleString("pt-AO")}
              </span>
            )}
          </div>

          {/* Seller strip compacto */}
          {(p.province || p.city) && (
            <span className="flex items-center gap-0.5 text-[9px] text-[#9a7060]">
              <MapPin className="w-2 h-2 flex-shrink-0" />
              {p.city || p.province}
            </span>
          )}

          {/* Botão carrinho full width */}
          <button
            onClick={handleCart}
            className="w-full py-1.5 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-1 mt-1 transition-all active:scale-95"
            style={{
              background: cartPop ? "#1a7a44" : "#c0522a",
              transition: "background 0.25s ease",
            }}
            aria-label="Carrinho"
          >
            {cartPop ? (
              <><ShieldCheck className="w-3 h-3" /> Adicionado!</>
            ) : (
              <><ShoppingCart className="w-3 h-3" /> Carrinho</>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="container mx-auto px-3 pt-4 pb-6">
      {/* Header com animação */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-bold text-[#1a0f07]">Para si</h2>
        <span className="flex items-center gap-1 text-[10px] text-[#9a7060] bg-[#f5ede4] px-2 py-0.5 rounded-full">
          <Clock className="w-2.5 h-2.5" /> Actualizado agora
        </span>
      </div>

      {/* TABLET — 5 colunas */}
      <div
        className="hidden sm:grid"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", gridAutoRows: "1fr" }}
      >
        {allProducts.map((p: any, i: number) => (
          <TabletCard key={p.id} p={p} globalIndex={i} />
        ))}
      </div>

      {/* MOBILE — 2 colunas */}
      <div className="flex gap-2.5 sm:hidden">
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

      {/* Sentinel paginação */}
      <div ref={observerRef} className="py-6 flex flex-col items-center gap-2">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#c0522a]" />
            <span className="text-[11px] text-[#9a7060]">A carregar mais...</span>
          </div>
        )}
        {!hasNextPage && allProducts.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-0.5 rounded-full bg-[#e8d5c4]" />
            <p className="text-[11px] text-[#9a7060]">Viu todos os produtos 🎉</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default InfiniteProducts;
