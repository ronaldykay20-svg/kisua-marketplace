/**
 * ProductAdBlock.tsx
 *
 * Bloco dinâmico de publicidade para a página de produto.
 * Visível apenas em tablet/desktop (md:block).
 * Roda automaticamente entre os anúncios ativos configurados pelo admin.
 *
 * Tipos suportados:
 *  - banner        → imagem ou vídeo com overlay
 *  - empresa       → foto de capa + nome + badge verificado
 *  - vendedor      → card com avatar + stats + botão
 *  - produto       → card com imagem + preço + botão
 *  - leilao        → card de leilão com timer
 *  - mais_vendidos → carrossel automático de top produtos
 *  - vendedores_top→ carrossel de vendedores em destaque
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, ShieldCheck, Star,
  Play, TrendingUp, Users, Gavel, Clock
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const useCountdown = (endDate: string | null) => {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!endDate) return;
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Encerrado"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endDate]);
  return remaining;
};

// ── Renderers por tipo ───────────────────────────────────────────────────────

const BannerAd = ({ ad }: { ad: any }) => {
  const isVideo = ad.media_type === "video";
  const inner = isVideo ? (
    <video src={ad.media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
  ) : (
    <img src={ad.media_url} alt={ad.title || "Anúncio"} className="w-full h-full object-cover" />
  );

  return (
    <a
      href={ad.destination_url || "#"}
      target={ad.destination_url ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className="rounded-gpu-fix block rounded-xl overflow-hidden border border-border relative group"
    >
      <div className="h-36 w-full">{inner}</div>
      {ad.title && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 py-2">
          <p className="text-white text-xs font-bold">{ad.title}</p>
        </div>
      )}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
        Pub
      </div>
    </a>
  );
};

const EmpresaAd = ({ refId, title, destinationUrl }: { refId: string; title?: string; destinationUrl?: string }) => {
  const navigate = useNavigate();
  const { data: empresa } = useQuery({
    queryKey: ["ad_empresa", refId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name, cover_url, logo_url, is_verified, description, city")
        .eq("id", refId)
        .single();
      return data;
    },
    enabled: !!refId,
  });

  if (!empresa) return <div className="h-32 rounded-xl bg-muted animate-pulse" />;

  return (
    <div
      onClick={() => navigate(`/empresa/${empresa.id}`)}
      className="rounded-gpu-fix rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition group relative"
    >
      <div className="h-24 bg-muted relative">
        {empresa.cover_url ? (
          <img src={empresa.cover_url} alt={empresa.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Pub</div>
      </div>
      <div className="p-3 flex items-center gap-2">
        {empresa.logo_url ? (
          <img src={empresa.logo_url} alt={empresa.name} className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0 -mt-6 ring-2 ring-card" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 -mt-6 ring-2 ring-card">
            <span className="text-primary font-black text-sm">{empresa.name.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-black text-foreground truncate">{empresa.name}</p>
            {empresa.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          </div>
          {empresa.city && <p className="text-[10px] text-muted-foreground">{empresa.city}</p>}
        </div>
        <button className="ml-auto px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0">
          Ver
        </button>
      </div>
    </div>
  );
};

const VendedorAd = ({ refId }: { refId: string }) => {
  const navigate = useNavigate();
  const { data: vendedor } = useQuery({
    queryKey: ["ad_vendedor", refId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sellers")
        .select("id, name, avatar_url, cover_url, is_verified, rating, total_sales, province")
        .eq("id", refId)
        .single();
      return data;
    },
    enabled: !!refId,
  });

  if (!vendedor) return <div className="h-32 rounded-xl bg-muted animate-pulse" />;

  return (
    <div
      onClick={() => navigate(`/vendedor/${vendedor.id}`)}
      className="rounded-gpu-fix rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition group relative"
    >
      <div className="h-20 bg-muted">
        {vendedor.cover_url ? (
          <img src={vendedor.cover_url} alt={vendedor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-500/5" />
        )}
      </div>
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-center gap-2">
          {vendedor.avatar_url ? (
            <img src={vendedor.avatar_url} alt={vendedor.name} className="w-10 h-10 rounded-full object-cover border-2 border-card -mt-5 ring-2 ring-card flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-card -mt-5 ring-2 ring-card flex-shrink-0">
              <span className="text-primary font-black">{vendedor.name.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0 mt-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-black text-foreground truncate">{vendedor.name}</p>
              {vendedor.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {vendedor.rating && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-secondary text-secondary" />{vendedor.rating}</span>}
              {vendedor.total_sales != null && <span>{vendedor.total_sales} vendas</span>}
            </div>
          </div>
          <button className="ml-auto px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex-shrink-0">
            Visitar
          </button>
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Pub</div>
    </div>
  );
};

const ProdutoAd = ({ refId }: { refId: string }) => {
  const navigate = useNavigate();
  const { data: produto } = useQuery({
    queryKey: ["ad_produto", refId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, title, price, old_price, discount_percent, image_url")
        .eq("id", refId)
        .single();
      if (!data) return null;
      const { data: cover } = await (supabase as any)
        .from("product_media")
        .select("url")
        .eq("product_id", refId)
        .eq("is_cover", true)
        .single();
      return { ...data, image: cover?.url || data.image_url };
    },
    enabled: !!refId,
  });

  if (!produto) return <div className="h-28 rounded-xl bg-muted animate-pulse" />;

  return (
    <div
      onClick={() => navigate(`/produto/${produto.id}`)}
      className="rounded-gpu-fix rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition flex relative"
    >
      <img src={produto.image} alt={produto.title} className="w-24 h-28 object-cover flex-shrink-0" />
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{produto.title}</p>
        </div>
        <div>
          <p className="text-base font-black text-foreground">{fmt(produto.price)}</p>
          {produto.old_price && (
            <p className="text-[10px] text-muted-foreground line-through">{fmt(produto.old_price)}</p>
          )}
          {produto.discount_percent && (
            <span className="text-[10px] font-bold text-green-500">-{produto.discount_percent}%</span>
          )}
          <button className="mt-2 w-full py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            Ver produto
          </button>
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Pub</div>
    </div>
  );
};

const LeilaoAd = ({ refId }: { refId: string }) => {
  const navigate = useNavigate();
  const { data: leilao } = useQuery({
    queryKey: ["ad_leilao", refId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auctions")
        .select("id, title, current_bid, start_price, image_url, ends_at")
        .eq("id", refId)
        .single();
      return data;
    },
    enabled: !!refId,
  });

  const countdown = useCountdown(leilao?.ends_at || null);

  if (!leilao) return <div className="h-28 rounded-xl bg-muted animate-pulse" />;

  return (
    <div
      onClick={() => navigate(`/leiloes/${leilao.id}`)}
      className="rounded-xl border border-red-500/20 bg-red-500/5 overflow-hidden cursor-pointer hover:shadow-md transition relative"
    >
      <div className="flex">
        {leilao.image_url && (
          <img src={leilao.image_url} alt={leilao.title} className="w-24 h-28 object-cover flex-shrink-0" />
        )}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Gavel className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-bold text-red-500">LEILÃO ATIVO</span>
            </div>
            <p className="text-xs text-foreground font-bold line-clamp-2 leading-snug">{leilao.title}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Lance atual</p>
            <p className="text-base font-black text-foreground">{fmt(leilao.current_bid || leilao.start_price)}</p>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-red-500 font-bold">
              <Clock className="w-3 h-3" />{countdown}
            </div>
            <button className="mt-1.5 w-full py-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              Fazer lance
            </button>
          </div>
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Pub</div>
    </div>
  );
};

const MaisVendidosAd = () => {
  const navigate = useNavigate();
  const { data: produtos = [] } = useQuery({
    queryKey: ["ad_mais_vendidos"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, title, price, image_url, sales_count")
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(6);
      const list = data || [];
      const ids = list.map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await (supabase as any).from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return list.map((p: any) => ({ ...p, image: coverMap[p.id] || p.image_url }));
    },
  });

  if (!produtos.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <TrendingUp className="w-4 h-4 text-orange-500" />
        <p className="text-xs font-black text-foreground">Mais vendidos</p>
        <span className="ml-auto text-[9px] text-muted-foreground">Pub</span>
      </div>
      <div className="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-hide">
        {produtos.map((p: any) => (
          <button
            key={p.id}
            onClick={() => navigate(`/produto/${p.id}`)}
            className="flex-shrink-0 w-20 text-left"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted mb-1">
              <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
            </div>
            <p className="text-[9px] font-bold text-foreground line-clamp-2 leading-tight">{p.title}</p>
            <p className="text-[9px] text-primary font-black mt-0.5">{fmt(p.price)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

const VendedoresTopAd = () => {
  const navigate = useNavigate();
  const { data: vendedores = [] } = useQuery({
    queryKey: ["ad_vendedores_top"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sellers")
        .select("id, name, avatar_url, rating, total_sales, is_verified")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("total_sales", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  if (!vendedores.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Users className="w-4 h-4 text-pink-500" />
        <p className="text-xs font-black text-foreground">Vendedores em destaque</p>
        <span className="ml-auto text-[9px] text-muted-foreground">Pub</span>
      </div>
      <div className="flex gap-3 px-3 pb-3 overflow-x-auto scrollbar-hide">
        {vendedores.map((v: any) => (
          <button
            key={v.id}
            onClick={() => navigate(`/vendedor/${v.id}`)}
            className="flex-shrink-0 flex flex-col items-center w-16 text-center"
          >
            {v.avatar_url ? (
              <img src={v.avatar_url} alt={v.name} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <span className="text-primary font-black text-sm">{v.name.charAt(0)}</span>
              </div>
            )}
            <p className="text-[9px] font-bold text-foreground mt-1 line-clamp-2 leading-tight">{v.name}</p>
            {v.rating && <p className="text-[9px] text-secondary">⭐ {v.rating}</p>}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Componente principal exportado ───────────────────────────────────────────
const ProductAdBlock = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const { data: ads = [] } = useQuery({
    queryKey: ["product_ads_block"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 60000,
  });

  const total = ads.length;

  const next = useCallback(() => setCurrentIndex(i => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrentIndex(i => (i - 1 + total) % total), [total]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || total <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [autoplay, next, total]);

  if (!total) return null;

  const ad = ads[currentIndex];

  const renderAd = () => {
    switch (ad.type) {
      case "banner":        return <BannerAd ad={ad} />;
      case "empresa":       return ad.ref_id ? <EmpresaAd refId={ad.ref_id} title={ad.title} destinationUrl={ad.destination_url} /> : null;
      case "vendedor":      return ad.ref_id ? <VendedorAd refId={ad.ref_id} /> : null;
      case "produto":       return ad.ref_id ? <ProdutoAd refId={ad.ref_id} /> : null;
      case "leilao":        return ad.ref_id ? <LeilaoAd refId={ad.ref_id} /> : null;
      case "mais_vendidos": return <MaisVendidosAd />;
      case "vendedores_top":return <VendedoresTopAd />;
      default:              return null;
    }
  };

  return (
    <div
      className="hidden md:block mt-4"
      onMouseEnter={() => setAutoplay(false)}
      onMouseLeave={() => setAutoplay(true)}
    >
      {/* Conteúdo */}
      <div className="relative">
        {renderAd()}

        {/* Navegação (só se houver mais de 1) */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Indicadores */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {ads.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${i === currentIndex ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductAdBlock;
