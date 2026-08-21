import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Zap, Truck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  sales_count: number | null;
  store_name: string | null;
  image_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  free_shipping: boolean | null;
  category: string | null;
  cover_url?: string;
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

  // ── Barra de status do telemóvel (hora/sinal/bateria) — o site inteiro
  // usa a cor creme da marca (theme-color no index.html); aqui trocamos
  // pra branco enquanto o utilizador está nesta página, e devolvemos ao
  // sair, pra não afetar as outras páginas do site.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const original = meta?.getAttribute("content");
    meta?.setAttribute("content", "#ffffff");
    return () => { if (original) meta?.setAttribute("content", original); };
  }, []);

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

      // Busca uma amostra maior (40) e só depois filtra por quem tem foto —
      // se buscasse só os 10 primeiros por desconto, e nenhum deles tivesse
      // foto cadastrada, a tira toda ficava vazia mesmo havendo produtos
      // com foto mais abaixo na lista.
      const { data: picksData } = await q.order(campaign.topPicksOrderBy, { ascending: false }).limit(40);
      const candidates = ((picksData as TopPick[]) || []).filter((p) => p.id !== produtoId);
      const ids = candidates.map((p) => p.id);
      if (ids.length) {
        const { data: media } = await supabase
          .from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        const coverMap: Record<string, string> = {};
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
        candidates.forEach((p) => { (p as any).cover_url = coverMap[p.id]; });
      }
      // Só mostra produtos com foto própria — nada de imagem genérica
      // a fingir ser o produto.
      setTopPicks(candidates.filter((p) => p.cover_url || p.image_url).slice(0, 10));

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
      .select("id, title, description, price, old_price, discount_percent, sales_count, store_name, image_url, rating, total_reviews, free_shipping, category")
      .eq("is_active", true);
    q = campaign.applyFilter(q);
    if (activeTab) q = q.eq("category", activeTab);
    if (produtoId) q = q.neq("id", produtoId);

    const { data, error } = await q.order("created_at", { ascending: false }).range(from, to);
    let raw = (data as GridProduct[]) || [];

    // Muitos produtos guardam a foto em product_media (capa), não na
    // coluna image_url — busca a capa antes de decidir o que mostrar.
    const ids = raw.map((p) => p.id);
    if (ids.length) {
      const { data: media } = await supabase
        .from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
      const coverMap: Record<string, string> = {};
      (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      raw = raw.map((p) => ({ ...p, cover_url: coverMap[p.id] }));
    }

    // Só mostra produtos com foto própria — nada de imagem genérica
    // a fingir ser o produto.
    const list = raw.filter((p) => p.cover_url || p.image_url);

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
      {/* ── Barra branca de topo — seta + nome da página em texto simples,
          igual à referência (antes da arte colorida, não por cima dela) ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center w-7 h-7 shrink-0">
          <ArrowLeft className="w-5 h-5" style={{ color: "#1a1a1a" }} />
        </button>
        <h1 className="text-[17px] font-bold" style={{ color: "#1a1a1a" }}>{campaign.title}</h1>
      </div>

      {/* ── Banner ── */}
      {campaign.heroImageUrl ? (
        // Arte customizada — a imagem já traz o nome da campanha desenhado
        // nela (tipo "Brand Deals").
        <img src={campaign.heroImageUrl} alt={campaign.title} className="w-full h-auto block" />
      ) : (
        // Sem arte própria ainda — banner dinâmico em gradiente + texto.
        <div
          className="relative px-4 pt-5 pb-6"
          style={{ background: `linear-gradient(135deg, ${campaign.accent}, #2a1608)` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/15 shrink-0">
              <Icon className="w-4 h-4 text-white" />
            </span>
            <h2 className="text-[18px] font-black text-white leading-tight">{campaign.title}</h2>
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

      {/* ── Grade infinita — mesmo formato de card da tira "Mais vendidos",
          igual à referência AliExpress: foto + selo de vendedor sobreposto
          + preço + vendidos. Sem estrelas, sem título centralizado. ── */}
      <div className="max-w-md sm:max-w-xl mx-auto px-3 pt-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {products.map((p) => {
            const img = p.cover_url || p.image_url || "";
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/produto/${p.id}`)}
                className="flex flex-col text-left rounded-xl overflow-hidden bg-white border active:opacity-80 transition-opacity"
                style={{ borderColor: "#F0EBDF" }}
              >
                <div className="relative w-full aspect-square bg-muted">
                  <img src={img} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
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
                  <span className="text-[14px] font-black block" style={{ color: "#1a1a1a" }}>{fmt(p.price)}</span>
                  {p.old_price && (
                    <span className="text-[10.5px] text-muted-foreground line-through">{fmt(p.old_price)}</span>
                  )}
                  {!!p.sales_count && (
                    <span className="text-[10.5px] text-muted-foreground block">🔥 {p.sales_count}+ vendidos</span>
                  )}
                </div>
              </button>
            );
          })}
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
