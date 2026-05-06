import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Store, Building2, ShoppingBag, Gavel, TrendingDown, ExternalLink, ShieldCheck, MapPin, Star } from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type AdType = "video" | "image" | "seller" | "company" | "product" | "auction" | "auction_ended";

// ── Render de cada tipo de anúncio ────────────────────────────────────────────
const AdSlide = ({ ad, navigate }: { ad: any; navigate: any }) => {
  const type: AdType = ad.type;

  // ── Imagem / Vídeo ──
  if (type === "image" || type === "video") {
    return (
      <div className="relative w-full h-full">
        {type === "video" && ad.media_url
          ? <video src={ad.media_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          : <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {ad.title && <p className="text-white font-black text-base leading-tight">{ad.title}</p>}
          {ad.description && <p className="text-white/80 text-xs mt-1 line-clamp-2">{ad.description}</p>}
        </div>
      </div>
    );
  }

  // ── Vendedor ──
  if (type === "seller" && ad.seller_id) {
    return (
      <div
        onClick={() => navigate(`/vendedor/${ad.seller_id}`)}
        className="w-full h-full flex flex-col cursor-pointer"
      >
        {/* Cover / avatar bg */}
        <div className="relative h-28 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0">
          {ad.seller_avatar
            ? <img src={ad.seller_avatar} alt={ad.seller_name} className="w-full h-full object-cover opacity-60" />
            : <div className="w-full h-full flex items-center justify-center"><Store className="w-12 h-12 text-primary/20" /></div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          {/* Avatar circle */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-full border-4 border-card overflow-hidden bg-primary/10">
            {ad.seller_avatar
              ? <img src={ad.seller_avatar} alt={ad.seller_name} className="w-full h-full object-cover" />
              : <Store className="w-6 h-6 m-4 text-primary" />
            }
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 flex flex-col items-center justify-start pt-10 px-3 pb-3 text-center">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-sm font-black text-foreground">{ad.seller_name || "Vendedor"}</p>
            {ad.seller_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
          </div>
          {ad.seller_province && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{ad.seller_province}
            </p>
          )}
          {ad.seller_rating && (
            <p className="text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
              <Star className="w-3 h-3 fill-amber-500" /> {ad.seller_rating}
            </p>
          )}
          {ad.title && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ad.title}</p>}
          <div className="mt-auto pt-2 w-full">
            <div className="py-1.5 px-3 rounded-full border border-primary text-primary text-xs font-bold text-center hover:bg-primary/5 transition">
              Ver loja →
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Empresa ──
  if (type === "company" && ad.company_id) {
    return (
      <div
        onClick={() => navigate(`/empresa/${ad.company_id}`)}
        className="w-full h-full flex flex-col cursor-pointer"
      >
        <div className="relative h-28 bg-gradient-to-br from-amber-500/20 to-amber-500/5 overflow-hidden flex-shrink-0">
          {ad.company_cover
            ? <img src={ad.company_cover} alt={ad.company_name} className="w-full h-full object-cover opacity-70" />
            : <Building2 className="w-12 h-12 text-amber-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          {ad.company_logo && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-14 h-14 rounded-xl border-4 border-card overflow-hidden bg-white">
              <img src={ad.company_logo} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-start pt-10 px-3 pb-3 text-center">
          <p className="text-sm font-black text-foreground">{ad.company_name || "Empresa"}</p>
          {ad.title && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.title}</p>}
          <div className="mt-auto pt-2 w-full">
            <div className="py-1.5 px-3 rounded-full border border-amber-500 text-amber-600 text-xs font-bold text-center hover:bg-amber-500/5 transition">
              Ver empresa →
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Produto ──
  if (type === "product" && ad.product_id) {
    const thumb = ad.product_image || ad.media_url;
    return (
      <div
        onClick={() => navigate(`/produto/${ad.product_id}`)}
        className="w-full h-full flex flex-col cursor-pointer"
      >
        <div className="relative flex-1 bg-muted overflow-hidden">
          {thumb
            ? <img src={thumb} alt={ad.product_title} className="w-full h-full object-cover" />
            : <ShoppingBag className="w-12 h-12 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white font-black text-sm line-clamp-2">{ad.product_title || ad.title}</p>
            {ad.product_price && (
              <p className="text-white/90 text-xs font-bold mt-0.5">
                {Number(ad.product_price).toLocaleString("pt-AO")} Kz
              </p>
            )}
            <div className="mt-2 py-1.5 px-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold text-center inline-block">
              Ver produto →
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Leilão ativo ──
  if (type === "auction" && ad.auction_id) {
    return (
      <div
        onClick={() => navigate(`/leilao`)}
        className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-red-500/10 to-red-900/20 p-4 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3 animate-pulse">
          <Gavel className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">🔴 Ao Vivo</p>
        <p className="text-sm font-black text-foreground leading-tight">{ad.title}</p>
        {ad.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>}
        {ad.auction_current_bid && (
          <p className="text-xs text-muted-foreground mt-2">
            Lance actual: <span className="font-black text-foreground">{Number(ad.auction_current_bid).toLocaleString("pt-AO")} Kz</span>
          </p>
        )}
        <div className="mt-3 py-1.5 px-4 rounded-full bg-red-500 text-white text-xs font-bold">
          Participar →
        </div>
      </div>
    );
  }

  // ── Leilão finalizado ──
  if (type === "auction_ended") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-500/10 to-slate-900/20">
        <TrendingDown className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Leilão Encerrado</p>
        <p className="text-sm font-black text-foreground">{ad.title}</p>
        {ad.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>}
        <p className="text-[10px] text-slate-400 mt-2 italic">Não perdas o próximo!</p>
        <div onClick={() => navigate("/leilao")}
          className="mt-3 py-1.5 px-4 rounded-full border border-slate-400 text-slate-400 text-xs font-bold cursor-pointer hover:bg-slate-400/10 transition">
          Ver leilões →
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-xs text-muted-foreground">{ad.title}</p>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Componente principal — usado na ProductDetail.tsx, coluna esquerda tablet
// ════════════════════════════════════════════════════════════════════════════
const ProductPageAdBlock = ({ currentProductId }: { currentProductId?: string }) => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const { data: ads = [] } = useQuery({
    queryKey: ["active_advertisements", currentProductId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select(`
          *,
          sellers:seller_id(id, name, avatar_url, is_verified, province, rating),
          companies:company_id(id, name, logo_url, cover_url),
          products:product_id(id, title, price, image_url)
        `)
        .eq("is_active", true)
        .eq("show_on_product_page", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("display_order", { ascending: true });
      if (error) return [];

      // Normalizar dados das relações
      return (data || []).map((ad: any) => ({
        ...ad,
        seller_name:     ad.sellers?.name,
        seller_avatar:   ad.sellers?.avatar_url,
        seller_verified: ad.sellers?.is_verified,
        seller_province: ad.sellers?.province,
        seller_rating:   ad.sellers?.rating,
        company_name:    ad.companies?.name,
        company_logo:    ad.companies?.logo_url,
        company_cover:   ad.companies?.cover_url,
        product_title:   ad.products?.title,
        product_price:   ad.products?.price,
        product_image:   ad.products?.image_url,
      }));
    },
    refetchInterval: 30000,
  });

  // Auto-advance
  useEffect(() => {
    if (!autoPlay || ads.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [autoPlay, ads.length]);

  if (ads.length === 0) return null;

  const ad = ads[idx];

  return (
    <div className="mt-4 rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Publicidade</span>
        {ads.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => { setIdx(i => (i - 1 + ads.length) % ads.length); setAutoPlay(false); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-muted-foreground">{idx + 1}/{ads.length}</span>
            <button onClick={() => { setIdx(i => (i + 1) % ads.length); setAutoPlay(false); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Slide */}
      <div className="h-64 bg-card relative overflow-hidden">
        <AdSlide ad={ad} navigate={navigate} />
      </div>

      {/* Dots */}
      {ads.length > 1 && (
        <div className="flex justify-center gap-1 py-2 bg-card border-t border-border">
          {ads.map((_: any, i: number) => (
            <button key={i} onClick={() => { setIdx(i); setAutoPlay(false); }}
              className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground"}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductPageAdBlock;
