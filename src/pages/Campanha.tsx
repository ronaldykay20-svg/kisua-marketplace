import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Zap, Truck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRatingImage, freteGratisImg } from "@/lib/ratingImage";
import { getCampaign } from "@/config/campaigns";

// ─────────────────────────────────────────────────────────────────────────
// Página de campanha — reutilizável para qualquer entrada em
// src/config/campaigns.ts. Estrutura: banner (imagem própria da campanha
// se existir, senão gradiente + ícone) → produto em destaque (se veio de
// um toque num produto específico, via ?produto=<id>) → selos de
// confiança → tira "Mais vendidos" → abas de categoria (só as que têm
// produto nesta campanha) → grade infinita.
// ─────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(n);


const iconFor = (slug: string) => (slug === "ofertas-relampago" ? Zap : Truck);

interface GridProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  image_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  free_shipping: boolean | null;
  category: string | null;
}

interface TopPick {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  sales_count: number | null;
  store_name: string | null;
  cover_url?: string;
  image_url: string | null;
}

interface HighlightProduct extends TopPick {
  description: string | null;
  rating: number | null;
  total_reviews: number | null;
}

const Campanha = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const produtoId = searchParams.get("produto");
  const navigate = useNavigate();
  const campaign = getCampaign(slug);

  const [highlight, setHighlight] = useState<HighlightProduct | null>(null);
  const [topPicks, setTopPicks] = useState<TopPick[]>([]);
  const [categoryTabs, setCategoryTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [products, setProducts] = useState<GridProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Produto em destaque — quando a página abriu a partir de um toque
  // num produto específico (?produto=<id>), ele fica fixado no topo. ──
  useEffect(() => {
    if (!produtoId) { setHighlight(null); return; }
    (async () => {
      const { data: p } = await supabase
        .from("products")
        .select("id, title, description, price, old_price, discount_percent, image_url, rating, total_reviews")
        .eq("id", produtoId)
        .maybeSingle();
      if (!p) { setHighlight(null); return; }
      const { data: media } = await supabase
        .from("product_media").select("url").eq("product_id", produtoId).eq("is_cover", true).maybeSingle();
      setHighlight({ ...(p as any), cover_url: media?.url });
    })();
  }, [produtoId]);

  // ── Mais vendidos + abas de categoria (uma vez, ao entrar na campanha) ──
  useEffect(() => {
    if (!campaign) return;
    (async () => {
      let q = supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent, sales_count, store_name, image_url, category")
        .eq("is_active", true);
      q = campaign.applyFilter(q);

      const { data: picksData } = await q.order(campaign.topPicksOrderBy, { ascending: false }).limit(10);
      const picks = ((picksData as TopPick[]) || []).filter((p) => p.id !== produtoId);
      const ids = picks.map((p) => p.id);
      if (ids.length) {
        const { data: media } = await supabase
          .from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        const coverMap: Record<string, string> = {};
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
        picks.forEach((p) => { (p as any).cover_url = coverMap[p.id]; });
      }
      // Só mostra produtos com foto própria — nada de imagem genérica
      // a fingir ser o produto.
      setTopPicks(picks.filter((p) => p.cover_url || p.image_url));

      let catQ = supabase.from("products").select("category").eq("is_active", true).limit(300);
      catQ = campaign.applyFilter(catQ);
      const { data: catRows } = await catQ;
      const counts: Record<string, number> = {};
      (catRows || []).forEach((r: any) => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);
      setCategoryTabs(top);
    })();
  }, [campaign?.slug, produtoId]);

  // ── Grade infinita, filtrada pela campanha + aba de categoria ativa ──
  const loadNextPage = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("products")
      .select("id, title, description, price, old_price, discount_percent, image_url, rating, total_reviews, free_shipping, category")
      .eq("is_active", true);
    q = campaign.applyFilter(q);
    if (activeTab) q = q.eq("category", activeTab);
    if (produtoId) q = q.neq("id", produtoId);

    const { data, error } = await q.order("created_at", { ascending: false }).range(from, to);
    // Só mostra produtos com foto própria — nada de imagem genérica
    // a fingir ser o produto.
    const list = ((data as GridProduct[]) || []).filter((p) => p.image_url);

    if (!error) {
      setProducts((prev) => (pageRef.current === 0 ? list : [...prev, ...list]));
      if (list.length < PAGE_SIZE) setHasMore(false);
      pageRef.current += 1;
    }
    setLoading(false);
  }, [campaign?.slug, activeTab, produtoId]);

  // Reinicia a grade sempre que a aba de categoria muda
  useEffect(() => {
    pageRef.current = 0;
    setProducts([]);
    setHasMore(true);
    loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, campaign?.slug, produtoId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadNextPage(); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadNextPage]);

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">Esta campanha não existe ou já terminou.</p>
      </div>
    );
  }

  const Icon = iconFor(campaign.slug);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Banner ── */}
      {campaign.heroImageUrl ? (
        // Arte customizada — a imagem já traz o nome da campanha desenhado
        // nela (tipo "Brand Deals"), então aqui só flutua o botão de voltar.
        <div className="relative">
          <img src={campaign.heroImageUrl} alt={campaign.title} className="w-full h-auto block" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 flex items-center justify-center w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        // Sem arte própria ainda — banner dinâmico em gradiente + texto.
        <div
          className="relative px-4 pt-4 pb-6"
          style={{ background: `linear-gradient(135deg, ${campaign.accent}, #2a1608)` }}
        >
          <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 mb-3">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 shrink-0">
              <Icon className="w-4 h-4 text-white" />
            </span>
            <h1 className="text-[20px] font-black text-white leading-tight">{campaign.title}</h1>
          </div>
          <p className="text-[12.5px] text-white/85">{campaign.subtitle}</p>
        </div>
      )}

      {/* ── Produto em destaque — o que trouxe o utilizador até aqui.
          Sobe por cima do banner (margem negativa) para sobrepor
          levemente a base do banner, como nos cards da AliExpress. ── */}
      {highlight && (
        <div className="relative z-10 -mt-6 px-4 pb-1">
          <div
            className="flex gap-3 p-2.5 rounded-xl border shadow-lg"
            style={{ borderColor: campaign.accentSoft, background: "#ffffff" }}
          >
            <div className="relative w-[92px] h-[92px] rounded-lg overflow-hidden bg-muted shrink-0">
              <img src={highlight.cover_url || highlight.image_url || ""} alt={highlight.title} className="w-full h-full object-cover" />
              {!!highlight.discount_percent && (
                <span className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black text-white rounded-br-lg" style={{ background: campaign.accent }}>
                  -{highlight.discount_percent}%
                </span>
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <h2 className="text-[13px] font-bold line-clamp-2 leading-snug mb-1" style={{ color: "#4A2E0A" }}>{highlight.title}</h2>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[15px] font-black" style={{ color: "#1a1a1a" }}>{fmt(highlight.price)}</span>
                {highlight.old_price && <span className="text-[11px] text-muted-foreground line-through">{fmt(highlight.old_price)}</span>}
              </div>
              <button
                onClick={() => navigate(`/produto/${highlight.id}`)}
                className="flex items-center gap-1 text-[11.5px] font-bold w-fit px-2.5 py-1 rounded-full text-white"
                style={{ background: campaign.accent }}
              >
                Ver detalhes completos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Selos de confiança ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 bg-white border-b" style={{ borderColor: "#F0EBDF" }}>
        {campaign.badges.map((b) => (
          <span key={b} className="flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: "#4A2E0A" }}>
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: campaign.accent }} />
            {b}
          </span>
        ))}
      </div>

      {/* ── Mais vendidos — painel com fundo em gradiente, estilo "Top picks" ── */}
      {topPicks.length > 0 && (
        <div
          className="pt-4 pb-4"
          style={{ background: `linear-gradient(180deg, ${campaign.accent}, ${campaign.accent}dd)` }}
        >
          <p className="text-[15px] font-black px-4 mb-3 text-white">Mais vendidos</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 snap-x">
            {topPicks.map((p) => {
              const img = p.cover_url || p.image_url || "";
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/produto/${p.id}`)}
                  className="flex flex-col shrink-0 w-[128px] snap-start text-left rounded-xl overflow-hidden bg-white active:opacity-80 transition-opacity"
                >
                  <div className="relative w-full h-[128px] bg-muted">
                    <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                    {!!p.discount_percent && (
                      <span
                        className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-black text-white rounded-br-lg"
                        style={{ background: campaign.accent }}
                      >
                        -{p.discount_percent}%
                      </span>
                    )}
                    {p.store_name && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/55 backdrop-blur-sm px-2 py-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                        <span className="text-[10px] font-semibold text-white truncate">{p.store_name}</span>
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <span className="text-[13px] font-black block" style={{ color: "#1a1a1a" }}>{fmt(p.price)}</span>
                    {!!p.sales_count && (
                      <span className="text-[10px] text-muted-foreground">🔥 {p.sales_count}+ vendidos</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Abas de categoria ── */}
      {categoryTabs.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2.5 bg-white border-b" style={{ borderColor: "#F0EBDF" }}>
          <button
            onClick={() => setActiveTab(null)}
            className="shrink-0 text-[12.5px] font-bold px-3.5 py-1.5 rounded-full transition-colors"
            style={activeTab === null ? { background: campaign.accentSoft, color: campaign.accent } : { background: "#F3F3F3", color: "#666" }}
          >
            Recomendados
          </button>
          {categoryTabs.map((name) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className="shrink-0 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors"
              style={activeTab === name ? { background: campaign.accentSoft, color: campaign.accent } : { background: "#F3F3F3", color: "#666" }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* ── Grade infinita ── */}
      <div className="max-w-md sm:max-w-xl mx-auto px-4 pt-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0">
          {products.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-card overflow-hidden cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img src={p.image_url || ""} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="px-2 pt-2 pb-1">
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <img src={getRatingImage(p.rating)} alt={`${p.rating ?? 0} estrelas`} className="h-4 flex-shrink-0" />
                    {!!p.total_reviews && <span className="text-[10px] text-muted-foreground truncate">({p.total_reviews})</span>}
                  </div>
                  <span className="relative inline-block flex-shrink-0">
                    <span className="absolute" style={{ left: "-4px", right: "-4px", top: "22%", bottom: "18%", background: "#ffd166", transform: "rotate(-1.5deg)", borderRadius: "2px" }} />
                    <span className="relative whitespace-nowrap" style={{ color: "#1a1a1a", fontWeight: 800, fontSize: "14px" }}>{fmt(p.price)}</span>
                  </span>
                </div>
                <h3 className="text-[14px] font-bold line-clamp-2 leading-snug mb-1 text-center" style={{ color: "#5a2f16" }}>{p.title}</h3>
                {p.old_price && <p className="text-[11px] text-muted-foreground line-through text-center mb-1">{fmt(p.old_price)}</p>}
                {p.free_shipping && (
                  <div className="flex justify-start pt-1 pb-1.5">
                    <img src={freteGratisImg} alt="Frete grátis" className="h-5 w-auto" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mt-8 text-center">Nenhum produto encontrado nesta campanha.</p>
        )}
        {loading && <p className="text-center text-xs text-muted-foreground mt-4">A carregar mais produtos…</p>}
        <div ref={sentinelRef} className="h-2" />
      </div>
    </div>
  );
};

export default Campanha;
