import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, CheckCircle, Building2, Store, Star,
  Package, Users, TrendingUp, ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Kisua Design Tokens (mesma identidade da página de produto) ──────────
const K = {
  ink: "#0E4F4F",
  inkLight: "rgba(14,79,79,0.08)",
  flame: "#E8531F",
  flameLight: "rgba(232,83,31,0.10)",
  paper: "#FBF8F3",
};
const display = { fontFamily: "'Space Grotesk', sans-serif" };

interface FeaturedSellersProps {
  layout?: "mobile" | "tablet" | "desktop";
}

type EntityKind = "seller" | "company";

interface FeaturedEntity {
  kind: EntityKind;
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  rating: number;
  total_sales: number;
  followersOrMembers: number;
  followersOrMembersLabel: string;
  route: string;
}

const AUTOPLAY_MS = 6000;
const PROGRESS_TICK_MS = 60;

/**
 * "Vendedores & Empresas em destaque" da home.
 *
 * Combina duas fontes de dados diferentes (sellers + companies) num único
 * carrossel "spotlight" que roda automaticamente sozinho — por vezes mostra
 * um vendedor, por vezes uma empresa, alternando (round-robin) para nunca
 * ficar seguido demais do mesmo tipo. Inspirado no padrão "stories" (barra
 * de progresso por item, avança sozinho, pausa ao tocar/passar o rato).
 */
const FeaturedSellers = ({ layout = "mobile" }: FeaturedSellersProps) => {
  const navigate = useNavigate();

  // ══════════════════════════════════════════════════════════════════════
  // DADOS — vendedores em destaque
  // ══════════════════════════════════════════════════════════════════════
  const { data: featuredSellers = [] } = useQuery({
    queryKey: ["featured_sellers_home"],
    queryFn: async () => {
      const { data: featured } = await supabase
        .from("sellers")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("featured_order", { ascending: true })
        .limit(20);
      if (featured && featured.length > 0) return featured;

      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("is_active", true)
        .order("total_sales", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // ══════════════════════════════════════════════════════════════════════
  // DADOS — empresas em destaque (mesma lógica, tabela diferente)
  // ══════════════════════════════════════════════════════════════════════
  const { data: featuredCompanies = [] } = useQuery({
    queryKey: ["featured_companies_home"],
    queryFn: async () => {
      const { data: featured } = await (supabase as any)
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("featured_order", { ascending: true })
        .limit(20);
      if (featured && featured.length > 0) return featured;

      const { data, error } = await (supabase as any)
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("total_sales", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const companyIds = featuredCompanies.map((c: any) => c.id);
  const sellerIdsRaw = featuredSellers.map((s: any) => s.id);

  // Nº de colaboradores por empresa (equivalente ao "seguidores" do vendedor)
  const { data: memberCountMap = {} } = useQuery({
    queryKey: ["featured_companies_member_count", companyIds],
    queryFn: async () => {
      if (companyIds.length === 0) return {};
      const { data } = await (supabase as any)
        .from("company_members")
        .select("company_id")
        .in("company_id", companyIds);
      const map: Record<string, number> = {};
      (data || []).forEach((m: any) => { map[m.company_id] = (map[m.company_id] || 0) + 1; });
      return map;
    },
    enabled: companyIds.length > 0,
  });

  // ══════════════════════════════════════════════════════════════════════
  // % de avaliações positivas — vendedores (seller_reviews) e empresas
  // (company_reviews) usam tabelas diferentes, por isso 2 queries + merge.
  // ══════════════════════════════════════════════════════════════════════
  const { data: sellerReviewsMap = {} } = useQuery({
    queryKey: ["featured_sellers_reviews", sellerIdsRaw],
    queryFn: async () => {
      if (sellerIdsRaw.length === 0) return {};
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("seller_id, rating")
        .in("seller_id", sellerIdsRaw);
      if (error || !data) return {};
      const map: Record<string, number | null> = {};
      sellerIdsRaw.forEach((id: string) => {
        const reviews = data.filter((r: any) => r.seller_id === id);
        if (reviews.length === 0) { map[id] = null; return; }
        const positive = reviews.filter((r: any) => r.rating >= 4).length;
        map[id] = Math.round((positive / reviews.length) * 100);
      });
      return map;
    },
    enabled: sellerIdsRaw.length > 0,
  });

  const { data: companyReviewsMap = {} } = useQuery({
    queryKey: ["featured_companies_reviews", companyIds],
    queryFn: async () => {
      if (companyIds.length === 0) return {};
      const { data, error } = await (supabase as any)
        .from("company_reviews")
        .select("company_id, rating")
        .in("company_id", companyIds);
      if (error || !data) return {};
      const map: Record<string, number | null> = {};
      companyIds.forEach((id: string) => {
        const reviews = data.filter((r: any) => r.company_id === id);
        if (reviews.length === 0) { map[id] = null; return; }
        const positive = reviews.filter((r: any) => r.rating >= 4).length;
        map[id] = Math.round((positive / reviews.length) * 100);
      });
      return map;
    },
    enabled: companyIds.length > 0,
  });

  // ══════════════════════════════════════════════════════════════════════
  // Unificação: intercala vendedores/empresas (round-robin) — é isto que
  // faz "às vezes aparece um vendedor, às vezes uma empresa, e trocam"
  // ══════════════════════════════════════════════════════════════════════
  const entities: FeaturedEntity[] = useMemo(() => {
    const sellerEntities: FeaturedEntity[] = featuredSellers.map((s: any) => ({
      kind: "seller" as const,
      id: s.id,
      name: s.name,
      logo_url: s.logo_url,
      cover_url: s.cover_url,
      is_verified: !!s.is_verified,
      rating: s.rating || 0,
      total_sales: s.total_sales || 0,
      followersOrMembers: s.followers_count || 0,
      followersOrMembersLabel: "seguidores",
      route: `/vendedor/${s.id}`,
    }));
    const companyEntities: FeaturedEntity[] = featuredCompanies.map((c: any) => ({
      kind: "company" as const,
      id: c.id,
      name: c.name,
      logo_url: c.logo_url,
      cover_url: c.banner_url,
      is_verified: !!c.is_verified,
      rating: c.rating || 0,
      total_sales: c.total_sales || 0,
      followersOrMembers: memberCountMap[c.id] || 0,
      followersOrMembersLabel: "colaboradores",
      route: `/empresa/${c.id}`,
    }));

    const merged: FeaturedEntity[] = [];
    const max = Math.max(sellerEntities.length, companyEntities.length);
    for (let i = 0; i < max; i++) {
      if (sellerEntities[i]) merged.push(sellerEntities[i]);
      if (companyEntities[i]) merged.push(companyEntities[i]);
    }
    return merged;
  }, [featuredSellers, featuredCompanies, memberCountMap]);

  const positivePctFor = useCallback((e: FeaturedEntity): number | null => {
    if (e.kind === "seller") return sellerReviewsMap[e.id] ?? null;
    return companyReviewsMap[e.id] ?? null;
  }, [sellerReviewsMap, companyReviewsMap]);

  // ══════════════════════════════════════════════════════════════════════
  // Produtos de cada entidade (sellers → seller_id, companies → company_id)
  // ══════════════════════════════════════════════════════════════════════
  const sellerIds = entities.filter(e => e.kind === "seller").map(e => e.id);
  const companyIdsForProducts = entities.filter(e => e.kind === "company").map(e => e.id);

  const { data: allProducts = [] } = useQuery({
    queryKey: ["featured_entities_products", sellerIds, companyIdsForProducts],
    queryFn: async () => {
      const results: any[] = [];
      if (sellerIds.length > 0) {
        const { data } = await supabase.from("products").select("*").in("seller_id", sellerIds).eq("is_active", true).order("sales_count", { ascending: false });
        (data || []).forEach((p: any) => results.push({ ...p, _owner_kind: "seller", _owner_id: p.seller_id }));
      }
      if (companyIdsForProducts.length > 0) {
        const { data } = await (supabase as any).from("products").select("*").in("company_id", companyIdsForProducts).eq("is_active", true).order("sales_count", { ascending: false });
        (data || []).forEach((p: any) => results.push({ ...p, _owner_kind: "company", _owner_id: p.company_id }));
      }
      const ids = results.map(p => p.id);
      let coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return results.map(p => ({ ...p, cover_url: coverMap[p.id] || p.cover_url }));
    },
    enabled: sellerIds.length > 0 || companyIdsForProducts.length > 0,
  });

  const productsFor = useCallback((e: FeaturedEntity, limit: number) =>
    allProducts.filter((p: any) => p._owner_kind === e.kind && p._owner_id === e.id).slice(0, limit),
    [allProducts]);

  // ══════════════════════════════════════════════════════════════════════
  // MOTOR DE AUTOPLAY — avança sozinho, pausa ao interagir, retoma depois
  // ══════════════════════════════════════════════════════════════════════
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100 dentro do item atual
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (activeIdx >= entities.length) setActiveIdx(0); }, [entities.length, activeIdx]);

  useEffect(() => {
    if (paused || entities.length <= 1) return;
    setProgress(0);
    const start = Date.now();
    const tick = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / AUTOPLAY_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        setActiveIdx(i => (i + 1) % entities.length);
      }
    }, PROGRESS_TICK_MS);
    return () => clearInterval(tick);
  }, [activeIdx, paused, entities.length]);

  const pauseThenResume = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 4000);
  }, []);

  useEffect(() => () => { if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current); }, []);

  const goTo = useCallback((idx: number) => {
    setActiveIdx(((idx % entities.length) + entities.length) % entities.length);
    pauseThenResume();
  }, [entities.length, pauseThenResume]);

  const goNext = useCallback(() => goTo(activeIdx + 1), [activeIdx, goTo]);
  const goPrev = useCallback(() => goTo(activeIdx - 1), [activeIdx, goTo]);

  // Swipe (mobile/tablet)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; pauseThenResume(); };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) delta > 0 ? goPrev() : goNext();
    touchStartX.current = null;
  };

  if (entities.length === 0) return null;
  const active = entities[activeIdx];

  // ══════════════════════════════════════════════════════════════════════
  // Selo visual por tipo (Empresa = ink/teal · Vendedor = flame/laranja)
  // ══════════════════════════════════════════════════════════════════════
  const kindBadge = (kind: EntityKind) => kind === "company"
    ? { label: "Empresa", Icon: Building2, bg: K.ink, }
    : { label: "Vendedor", Icon: Store, bg: K.flame };

  // ══════════════════════════════════════════════════════════════════════
  // CARD "SPOTLIGHT" — o card grande, bonito, que roda sozinho
  // ══════════════════════════════════════════════════════════════════════
  const SpotlightCard = ({ e, heightClass }: { e: FeaturedEntity; heightClass: string }) => {
    const badge = kindBadge(e.kind);
    const positivePct = positivePctFor(e);
    const products = productsFor(e, layout === "desktop" ? 5 : 4);

    return (
      <div className="relative rounded-2xl overflow-hidden bg-white border" style={{ borderColor: "#EEE6D8", boxShadow: "0 8px 30px rgba(14,79,79,0.08)" }}>
        {/* Banner */}
        <div className={`relative ${heightClass} bg-muted overflow-hidden`}>
          {e.cover_url ? (
            <img src={e.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${K.inkLight}, ${K.flameLight})` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Selo tipo (Empresa/Vendedor) */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-bold" style={{ background: badge.bg }}>
            <badge.Icon className="w-3 h-3" /> {badge.label}
          </div>

          {/* Selo "vendas" para dar credibilidade */}
          {e.total_sales > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-bold bg-black/40 backdrop-blur-sm">
              <TrendingUp className="w-3 h-3" /> {e.total_sales}+ vendas
            </div>
          )}

          {/* Identidade + CTA */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0 shadow-lg">
                {e.logo_url ? (
                  <img src={e.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base font-bold" style={{ color: K.ink, background: K.inkLight, ...display }}>
                    {e.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold text-white truncate" style={display}>{e.name}</span>
                  {e.is_verified && <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />}
                </div>
                <span className="text-[11px] text-white/80">{e.followersOrMembers} {e.followersOrMembersLabel}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(e.route)}
              className="flex-shrink-0 px-3.5 py-2 rounded-full text-white text-[12px] font-bold hover:opacity-90 transition"
              style={{ background: K.flame, boxShadow: "0 4px 14px rgba(232,83,31,0.4)" }}
            >
              {e.kind === "company" ? "Ver empresa" : "Ver loja"}
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center justify-around px-3 py-2 border-b text-[11px] text-gray-600" style={{ borderColor: "#F0EBDF" }}>
          <div className="flex items-center gap-1">
            {positivePct !== null ? (
              <>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-900">{positivePct}%</span>
                <span className="hidden sm:inline">positivas</span>
              </>
            ) : (
              <>
                <Star className="w-3 h-3 text-gray-300" />
                <span>Sem avaliações</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" /> <span>Envio rápido</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" /> <span>{e.followersOrMembers} {e.followersOrMembersLabel}</span>
          </div>
        </div>

        {/* Produtos */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" style={{ color: K.ink }} /> Produtos</span>
            <button onClick={() => navigate(e.route)} className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: K.flame }}>
              Ver tudo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {products.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-3 text-center">Sem produtos publicados ainda</p>
          ) : (
            <div className={`grid gap-2 ${layout === "desktop" ? "grid-cols-5" : "grid-cols-4"}`}>
              {products.map((p: any) => {
                const img = p.cover_url || p.image_url;
                return (
                  <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="text-left rounded-lg overflow-hidden border hover:opacity-90 transition" style={{ borderColor: "#F0EBDF" }}>
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {img ? <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">Sem foto</div>}
                    </div>
                    <div className="p-1">
                      <span className="block text-[10px] font-black truncate" style={{ color: K.flame }}>{Number(p.price).toLocaleString("pt-AO")} Kz</span>
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

  // ══════════════════════════════════════════════════════════════════════
  // Barra de progresso tipo "stories" — um segmento por entidade
  // ══════════════════════════════════════════════════════════════════════
  const ProgressBar = () => (
    <div className="flex gap-1 mb-3">
      {entities.map((_, i) => (
        <button key={i} onClick={() => goTo(i)} className="flex-1 h-1 rounded-full overflow-hidden bg-gray-200" aria-label={`Ir para destaque ${i + 1}`}>
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: i < activeIdx ? "100%" : i === activeIdx ? `${progress}%` : "0%",
              background: K.flame,
            }}
          />
        </button>
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // Tira de acesso rápido — avatares clicáveis para saltar direto
  // ══════════════════════════════════════════════════════════════════════
  const QuickJumpStrip = () => (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide mt-3 pb-1">
      {entities.map((e, i) => {
        const badge = kindBadge(e.kind);
        const isActive = i === activeIdx;
        return (
          <button key={`${e.kind}:${e.id}`} onClick={() => goTo(i)} className="flex-shrink-0 flex flex-col items-center gap-1 w-14">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all" style={{ borderColor: isActive ? K.flame : "#EEE6D8", opacity: isActive ? 1 : 0.65 }}>
              {e.logo_url ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: K.ink, background: K.inkLight }}>{e.name.charAt(0)}</div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border border-white" style={{ background: badge.bg }}>
                <badge.Icon className="w-2 h-2 text-white" />
              </div>
            </div>
            <span className="text-[9px] font-semibold text-gray-600 truncate w-full text-center">{e.name}</span>
          </button>
        );
      })}
    </div>
  );

  const SectionHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold" style={{ color: "#101B1B", ...display }}>Vendedores &amp; empresas em destaque</h2>
      <div className="flex items-center gap-1.5">
        {entities.length > 1 && (
          <>
            <button onClick={goPrev} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ChevronLeft className="w-4 h-4 text-gray-700" /></button>
            <button onClick={goNext} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><ChevronRight className="w-4 h-4 text-gray-700" /></button>
          </>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // LAYOUT — MOBILE: um spotlight de cada vez, tira de avatares por baixo
  // ══════════════════════════════════════════════════════════════════════
  if (layout === "mobile") {
    return (
      <section className="container mx-auto px-3 pt-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <SectionHeader />
        <ProgressBar />
        <SpotlightCard e={active} heightClass="h-[190px]" />
        <QuickJumpStrip />
      </section>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // LAYOUT — TABLET: spotlight maior + pré-visualização do próximo
  // ══════════════════════════════════════════════════════════════════════
  if (layout === "tablet") {
    const next = entities[(activeIdx + 1) % entities.length];
    return (
      <section className="pt-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <SectionHeader />
        <ProgressBar />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <SpotlightCard e={active} heightClass="h-[220px]" />
          </div>
          {next && next.id !== active.id && (
            <button onClick={goNext} className="text-left rounded-2xl overflow-hidden border relative group" style={{ borderColor: "#EEE6D8" }}>
              <div className="h-full min-h-[220px] bg-muted relative">
                {next.cover_url ? <img src={next.cover_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" /> : <div className="w-full h-full" style={{ background: K.inkLight }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide mb-0.5">A seguir</p>
                  <p className="text-sm font-bold text-white truncate" style={display}>{next.name}</p>
                </div>
              </div>
            </button>
          )}
        </div>
        <QuickJumpStrip />
      </section>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // LAYOUT — DESKTOP: spotlight grande + coluna com os próximos 2
  // ══════════════════════════════════════════════════════════════════════
  const upNext = [1, 2].map(off => entities[(activeIdx + off) % entities.length]).filter((e, i, arr) => e.id !== active.id && arr.findIndex(x => x.id === e.id) === i);

  return (
    <section className="pt-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <SectionHeader />
      <ProgressBar />
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SpotlightCard e={active} heightClass="h-[260px]" />
        </div>
        <div className="flex flex-col gap-3">
          {upNext.map(e => {
            const badge = kindBadge(e.kind);
            return (
              <button key={`${e.kind}:${e.id}`} onClick={() => goTo(entities.findIndex(x => x.id === e.id && x.kind === e.kind))} className="text-left rounded-2xl overflow-hidden border relative flex-1 group" style={{ borderColor: "#EEE6D8" }}>
                <div className="h-full min-h-[122px] bg-muted relative">
                  {e.cover_url ? <img src={e.cover_url} alt="" className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition" /> : <div className="w-full h-full" style={{ background: K.inkLight }} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: badge.bg }}>
                    <badge.Icon className="w-2.5 h-2.5" /> {badge.label}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white flex-shrink-0">
                      {e.logo_url ? <img src={e.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/20" />}
                    </div>
                    <p className="text-xs font-bold text-white truncate" style={display}>{e.name}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <QuickJumpStrip />
    </section>
  );
};

export default FeaturedSellers;
