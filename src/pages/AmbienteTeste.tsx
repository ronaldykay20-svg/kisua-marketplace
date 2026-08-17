import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRatingImage, freteGratisImg } from "@/lib/ratingImage";

// ─────────────────────────────────────────────────────────────────────────
// Ambiente de teste — pré-visualização automática do card de produto.
// Só acessível por link direto (não está em nenhum menu do site).
// ─────────────────────────────────────────────────────────────────────────

interface TestProduct {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  free_shipping: boolean | null;
  coverImage?: string | null;
}

const PAGE_SIZE = 12;
const BROWN = "#5a2f16";
const BROWN_DARK = "#3d1c08";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(n);

// ─────────────────────────────────────────────────────────────────────────
// Card — imagem, depois [estrelas | preço em círculo], depois título/descrição.
// ─────────────────────────────────────────────────────────────────────────
const ProductCard = ({ p, index }: { p: TestProduct; index: number }) => (
  <div
    className="at-card-enter bg-card overflow-hidden"
    style={{ animationDelay: `${(index % PAGE_SIZE) * 35}ms` }}
  >
    <div className="aspect-square bg-muted">
      <img
        src={p.coverImage || FALLBACK_IMG}
        alt={p.title}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>

    <div className="px-2 pt-2 pb-1">
      {/* Estrelas à esquerda, preço num círculo à direita */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <img src={getRatingImage(p.rating)} alt={`${p.rating ?? 0} estrelas`} className="h-4 flex-shrink-0" />
          {!!p.total_reviews && (
            <span className="text-[10px] text-muted-foreground truncate">({p.total_reviews})</span>
          )}
        </div>

        <span
          className="inline-flex items-center justify-center whitespace-nowrap flex-shrink-0"
          style={{
            padding: "5px 15px",
            borderRadius: "999px",
            background: `linear-gradient(180deg, #6b3510 0%, ${BROWN_DARK} 55%, #2a1305 100%)`,
            boxShadow: "0 0 0 2.5px #d98f2e, inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 2px rgba(0,0,0,0.4)",
            color: "#f6c667",
            fontWeight: 900,
            fontSize: "13.5px",
          }}
        >
          {fmt(p.price)}
        </span>
      </div>

      <h3 className="text-[14px] font-bold line-clamp-2 leading-snug mb-1 text-center" style={{ color: BROWN }}>
        {p.title}
      </h3>

      {p.description && (
        <p
          className="font-normal text-muted-foreground line-clamp-3 text-center"
          style={{ fontSize: "13px", lineHeight: 1.25, letterSpacing: "-0.1px", marginBottom: "4px" }}
        >
          {p.description}
        </p>
      )}

      {p.old_price && (
        <p className="text-[11px] text-muted-foreground line-through text-center mb-1">
          {fmt(p.old_price)}
        </p>
      )}
    </div>

    {p.free_shipping && (
      <img src={freteGratisImg} alt="Frete grátis" className="w-full h-auto block" />
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Página — carrega produtos automaticamente, mais entram ao chegar perto
// do fim da lista (scroll infinito, estilo Amazon), com fade-in em cascata.
// ─────────────────────────────────────────────────────────────────────────
const AmbienteTeste = () => {
  const [products, setProducts] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNextPage = useCallback(async () => {
    setLoading(true);
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("products")
      .select("id, title, description, price, old_price, image_url, rating, total_reviews, free_shipping")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    const list = (data as TestProduct[]) || [];

    // A imagem real do produto vive em product_media (capa), não em products.image_url.
    const ids = list.map((p) => p.id);
    const coverMap: Record<string, string> = {};
    if (ids.length) {
      const { data: media } = await supabase
        .from("product_media")
        .select("product_id, url")
        .in("product_id", ids)
        .eq("is_cover", true);
      (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
    }

    if (!error) {
      setProducts((prev) => [
        ...prev,
        ...list.map((p) => ({ ...p, coverImage: coverMap[p.id] || p.image_url || null })),
      ]);
      if (list.length < PAGE_SIZE) setHasMore(false);
      pageRef.current += 1;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadNextPage();
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadNextPage]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <style>{`
        @keyframes at-fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .at-card-enter { animation: at-fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      <div className="max-w-md sm:max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Ambiente de teste</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Pré-visualização automática do novo estilo de card — os produtos carregam sozinhos
          e mais aparecem ao rolar a página. Só visível a partir deste link — não está em nenhum menu.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0">
          {products.map((p, i) => (
            <ProductCard key={p.id} p={p} index={i} />
          ))}
        </div>

        {products.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground mt-8 text-center">Nenhum produto encontrado.</p>
        )}
        {loading && (
          <p className="text-center text-xs text-muted-foreground mt-4">A carregar mais produtos…</p>
        )}

        <div ref={sentinelRef} className="h-2" />
      </div>
    </div>
  );
};

export default AmbienteTeste;
