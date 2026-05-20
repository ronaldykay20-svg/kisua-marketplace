import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Star, Truck, Heart, Loader2, Flame, Users, ShieldCheck,
  ShoppingCart, MapPin, Package, Clock,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";

const PAGE_SIZE = 20;

// ─── Info Pill ────────────────────────────────────────────────────────────────
const InfoPill = ({ type, children }: { type: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    shipping:  "bg-[#e8f4ef] text-[#1a5c3a]",
    sales:     "bg-[#fff3e8] text-[#7a3a10]",
    recurrent: "bg-[#f0ecff] text-[#4a3080]",
    promo:     "bg-[#fff0ed] text-[#c0522a]",
    rated:     "bg-[#fffbeb] text-[#7a5500]",
    secure:    "bg-[#f0f4ff] text-[#2a4080]",
    trending:  "bg-[#fff0ed] text-[#c0522a]",
    location:  "bg-[#f5f0ff] text-[#5a3090]",
    stock:     "bg-[#f0f8ff] text-[#2a5080]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${styles[type] || styles.secure}`}>
      {children}
    </span>
  );
};

// ─── Build rotating slides: each slide = { price JSX, pill JSX } ─────────────
const buildSlides = (p: any, isTrending: boolean) => {
  const base = (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[14px] font-black text-[#1a0f07] tracking-tight leading-none">
        {Number(p.price).toLocaleString("pt-AO")} Kz
      </span>
      {p.old_price && (
        <span className="text-[9px] text-[#b09080] line-through">
          {Number(p.old_price).toLocaleString("pt-AO")} Kz
        </span>
      )}
    </div>
  );
  const promo = p.discount_percent > 0 ? (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[14px] font-black text-[#c0522a] tracking-tight leading-none">
        {Number(p.price).toLocaleString("pt-AO")} Kz
      </span>
      <span className="text-[9px] font-bold text-[#c0522a] bg-[#fff0ed] px-1 rounded">-{p.discount_percent}%</span>
    </div>
  ) : null;

  const slides: { price: JSX.Element; pill: JSX.Element }[] = [];

  slides.push({ price: base, pill: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });

  if (promo) {
    slides.push({ price: promo, pill: <InfoPill type="promo"><Flame className="w-2.5 h-2.5" /> Promoção</InfoPill> });
  } else if (p.rating >= 4) {
    slides.push({ price: base, pill: <InfoPill type="rated"><Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {Number(p.rating).toFixed(1)} ({p.total_reviews || 0})</InfoPill> });
  }

  if (p.free_shipping) {
    slides.push({ price: base, pill: <InfoPill type="shipping"><Truck className="w-2.5 h-2.5" /> Frete grátis</InfoPill> });
  } else if (p.stock > 0) {
    slides.push({ price: base, pill: <InfoPill type="stock"><Package className="w-2.5 h-2.5" /> {p.stock} em stock</InfoPill> });
  }

  if (isTrending) {
    slides.push({ price: base, pill: <InfoPill type="trending"><Flame className="w-2.5 h-2.5" /> Tendência</InfoPill> });
  } else if (p.sales_count > 0) {
    slides.push({ price: base, pill: <InfoPill type="sales"><Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos</InfoPill> });
  }

  if (p.province || p.city) {
    slides.push({ price: base, pill: <InfoPill type="location"><MapPin className="w-2.5 h-2.5" /> {p.city || p.province}</InfoPill> });
  }

  return slides;
};

// ─── Rotating Block ───────────────────────────────────────────────────────────
const RotatingBlock = ({ p, isTrending, seed }: { p: any; isTrending: boolean; seed: number }) => {
  const slides = useMemo(() => buildSlides(p, isTrending), [p.id, isTrending]);
  const [idx, setIdx] = useState(seed % slides.length);
  const [vis, setVis] = useState(true);
  const interval = useMemo(() => 4000 + (seed % 6) * 800, [seed]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx(i => (i + 1) % slides.length); setVis(true); }, 260);
    }, interval);
    return () => clearInterval(t);
  }, [slides.length, interval]);

  const s = slides[idx];
  return (
    <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(5px)", transition: "opacity 0.26s ease, transform 0.26s ease" }} className="flex flex-col gap-0.5">
      {s?.price}
      {s?.pill}
    </div>
  );
};

// ─── Pulse dot ───────────────────────────────────────────────────────────────
const PulseDot = () => (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c0522a] opacity-60" style={{ animationDuration: "1.4s" }} />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c0522a]" />
  </span>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
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
        const { data, error } = await supabase.from("products").select("*")
          .eq("is_active", true).order("sales_count", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const ids = (data || []).map((p: any) => p.id);
        let coverMap: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: media } = await supabase.from("product_media")
            .select("product_id, url").in("product_id", ids).eq("is_cover", true);
          (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
        }
        return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
      },
      getNextPageParam: (lastPage, allPages) => lastPage.length < PAGE_SIZE ? undefined : allPages.length,
      initialPageParam: 0,
    });

  const { data: trendingIds = new Set<string>() } = useQuery({
    queryKey: ["trending_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, category, sales_count")
        .eq("is_active", true).order("sales_count", { ascending: false }).limit(100);
      if (!data) return new Set<string>();
      const seen = new Set<string>(); const top = new Set<string>();
      for (const p of data) { if (p.category && !seen.has(p.category)) { seen.add(p.category); top.add(p.id); } }
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
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
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

  // ── MOBILE CARD ──────────────────────────────────────────────────────────
  const MobileCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const isTrending = trendingIds.has(p.id);
    const fav = isFavorite(p.id);
    const [pressed, setPressed] = useState(false);
    const [cartPop, setCartPop] = useState(false);

    const onHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };
    const onCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
      setCartPop(true);
      setTimeout(() => setCartPop(false), 700);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="overflow-hidden cursor-pointer flex flex-col mb-2.5 select-none"
        style={{
          background: "#fdf8f4",
          borderRadius: "5px",
          border: "1px solid #ede0d4",
          boxShadow: pressed ? "0 1px 3px rgba(100,50,15,0.10)" : "0 2px 8px rgba(100,50,15,0.09)",
          transform: pressed ? "scale(0.975)" : "scale(1)",
          transition: "transform 0.13s ease, box-shadow 0.13s ease",
        }}
      >
        {/* Imagem quase quadrada */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "5/4", backgroundColor: "#f5ede4" }}>
          {img ? (
            <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#c8a882]">
              <ShoppingCart className="w-6 h-6 opacity-20" />
            </div>
          )}
          {p.discount_percent > 0 && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: "#c0522a", borderRadius: "3px" }}>
              -{p.discount_percent}%
            </span>
          )}
          {p.badge && (
            <span className="absolute top-1.5 right-8 px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: "rgba(18,8,2,0.72)", borderRadius: "3px" }}>
              {p.badge}
            </span>
          )}
          {isTrending && !p.discount_percent && (
            <div className="absolute top-2 left-2"><PulseDot /></div>
          )}
          <button
            onClick={onHeart}
            className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(253,248,244,0.92)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
            aria-label="Favorito"
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${fav ? "fill-[#c0522a] text-[#c0522a]" : "text-[#b08060]"}`} />
          </button>
        </div>

        {/* Rodapé */}
        <div className="flex flex-col px-2 pt-1.5 pb-0" style={{ background: "#fdf8f4" }}>
          {/* Título — castanho, fixo */}
          <h3 className="text-[11px] font-semibold text-[#6b3a1f] line-clamp-2 leading-snug mb-1.5">
            {p.title}
          </h3>

          {/* Bloco rotativo: preço + pill */}
          <RotatingBlock p={p} isTrending={isTrending} seed={globalIndex} />

          {/* Risco + botão carrinho */}
          <div className="flex items-center justify-end pt-1.5 pb-2 mt-1.5" style={{ borderTop: "1px solid #e8d5c4" }}>
            <button
              onClick={onCart}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: cartPop ? "#1a7a44" : "#c0522a",
                boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
                transition: "background 0.22s ease, transform 0.13s ease",
                transform: cartPop ? "scale(1.13)" : "scale(1)",
              }}
              aria-label="Adicionar ao carrinho"
            >
              {cartPop
                ? <ShieldCheck className="w-3.5 h-3.5 text-white" />
                : <ShoppingCart className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── TABLET CARD ───────────────────────────────────────────────────────────
  const TabletCard = ({ p, globalIndex }: { p: any; globalIndex: number }) => {
    const img = p.cover_url || p.image_url;
    const isTrending = trendingIds.has(p.id);
    const fav = isFavorite(p.id);
    const [pressed, setPressed] = useState(false);
    const [cartPop, setCartPop] = useState(false);

    const onHeart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      toggleFavorite(p.id);
    };
    const onCart = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) { navigate("/auth"); return; }
      addToCart(p.id);
      setCartPop(true);
      setTimeout(() => setCartPop(false), 700);
    };

    return (
      <div
        onClick={() => navigate(`/produto/${p.id}`)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="overflow-hidden cursor-pointer flex flex-col h-full select-none"
        style={{
          background: "#fdf8f4",
          borderRadius: "5px",
          border: "1px solid #ede0d4",
          boxShadow: pressed ? "0 1px 3px rgba(100,50,15,0.08)" : "0 2px 6px rgba(100,50,15,0.08)",
          transform: pressed ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.13s ease, box-shadow 0.13s ease",
        }}
      >
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1", backgroundColor: "#f5ede4" }}>
          {img ? (
            <img src={img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#c8a882]">
              <ShoppingCart className="w-5 h-5 opacity-20" />
            </div>
          )}
          {p.discount_percent > 0 && (
            <span className="absolute top-1 left-1 px-1 py-0.5 text-[9px] font-black text-white" style={{ background: "#c0522a", borderRadius: "3px" }}>
              -{p.discount_percent}%
            </span>
          )}
          {(p.badge || isTrending) && (
            <span className="absolute top-1 right-6 px-1 py-0.5 text-[9px] font-black text-white" style={{ background: "rgba(18,8,2,0.72)", borderRadius: "3px" }}>
              {p.badge || "🔥"}
            </span>
          )}
          <button
            onClick={onHeart}
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(253,248,244,0.90)", boxShadow: "0 1px 3px rgba(0,0,0,0.10)" }}
            aria-label="Favorito"
          >
            <Heart className={`w-2.5 h-2.5 transition-all ${fav ? "fill-[#c0522a] text-[#c0522a]" : "text-[#b08060]"}`} />
          </button>
        </div>

        <div className="flex flex-col px-1.5 pt-1.5 pb-0 flex-1" style={{ background: "#fdf8f4" }}>
          <p className="text-[10px] font-semibold text-[#6b3a1f] line-clamp-2 leading-tight mb-1.5">
            {p.title}
          </p>

          <RotatingBlock p={p} isTrending={isTrending} seed={globalIndex} />

          <div className="mt-1.5 pt-1.5 pb-2" style={{ borderTop: "1px solid #e8d5c4" }}>
            <button
              onClick={onCart}
              className="w-full py-1 text-[10px] font-bold text-white flex items-center justify-center gap-1"
              style={{
                background: cartPop ? "#1a7a44" : "#c0522a",
                borderRadius: "4px",
                transition: "background 0.22s ease",
              }}
              aria-label="Carrinho"
            >
              {cartPop
                ? <><ShieldCheck className="w-3 h-3" /> Adicionado!</>
                : <><ShoppingCart className="w-3 h-3" /> Carrinho</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="container mx-auto px-3 pt-4 pb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-bold text-[#1a0f07]">Para si</h2>
        <span className="flex items-center gap-1 text-[10px] text-[#9a7060] bg-[#f5ede4] px-2 py-0.5 rounded-full">
          <Clock className="w-2.5 h-2.5" /> Actualizado agora
        </span>
      </div>

      {/* TABLET — 5 colunas */}
      <div className="hidden sm:grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", gridAutoRows: "1fr" }}>
        {allProducts.map((p: any, i: number) => <TabletCard key={p.id} p={p} globalIndex={i} />)}
      </div>

      {/* MOBILE — 2 colunas */}
      <div className="flex gap-2.5 sm:hidden">
        <div className="flex-1">
          {col1.map((p: any, colI: number) => <MobileCard key={p.id} p={p} globalIndex={colI * 2} />)}
        </div>
        <div className="flex-1">
          {col2.map((p: any, colI: number) => <MobileCard key={p.id} p={p} globalIndex={colI * 2 + 1} />)}
        </div>
      </div>

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
