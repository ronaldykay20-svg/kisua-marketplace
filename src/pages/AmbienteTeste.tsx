import { useEffect, useState } from "react";
import { Search, Loader2, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRatingImage, freteGratisImg } from "@/lib/ratingImage";

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

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(n);

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";

const AmbienteTeste = () => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<TestProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TestProduct | null>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, description, price, old_price, image_url, rating, total_reviews, free_shipping")
        .ilike("title", `%${term.trim()}%`)
        .eq("is_active", true)
        .limit(10);

      const list = (data as TestProduct[]) || [];

      // A imagem real do produto fica na tabela product_media (capa),
      // não na coluna products.image_url — por isso vamos buscá-la à parte.
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
        setResults(list.map((p) => ({ ...p, coverImage: coverMap[p.id] || p.image_url || null })));
      }
      setLoading(false);
    }, 350);
    return () => clearTimeout(timeout);
  }, [term]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Ambiente de teste</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Pesquisa um produto para veres como o card fica com as novas imagens de estrelas
          e o selo de frete grátis. Só visível a partir deste link — não está em nenhum menu.
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar produto pelo nome..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {results.length > 0 && !selected && (
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border mb-8">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted transition-colors"
              >
                <img
                  src={p.coverImage || FALLBACK_IMG}
                  alt={p.title}
                  className="w-10 h-10 rounded-md object-cover bg-muted flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{fmt(p.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {term.trim().length >= 2 && !loading && results.length === 0 && !selected && (
          <p className="text-sm text-muted-foreground mb-8">Nenhum produto encontrado.</p>
        )}

        {selected && (
          <div>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-primary mb-4 hover:underline"
            >
              ← Nova pesquisa
            </button>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Pré-visualização do card
            </p>

            {/* Card de produto — mesma estrutura do ProductCard, mas com as imagens novas.
                Sem borda visível, para pré-visualizar como fica no site real. */}
            <div className="w-48 bg-card rounded-card border border-transparent overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <img
                  src={selected.coverImage || FALLBACK_IMG}
                  alt={selected.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-tight mb-1.5">
                  {selected.title}
                </h3>
                {selected.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-3 mb-1.5">
                    {selected.description}
                  </p>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-foreground">{fmt(selected.price)}</span>
                  {selected.old_price && (
                    <span className="text-[10.5px] text-muted-foreground line-through">
                      {fmt(selected.old_price)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <img src={getRatingImage(selected.rating)} alt={`${selected.rating ?? 0} estrelas`} className="h-3" />
                  {!!selected.total_reviews && (
                    <span className="text-[9px] text-muted-foreground">({selected.total_reviews})</span>
                  )}
                </div>
                {selected.free_shipping && (
                  <img src={freteGratisImg} alt="Frete grátis" className="h-4 mt-1" />
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">rating na BD:</span> {selected.rating ?? "—"}</p>
              <p><span className="font-medium text-foreground">imagem usada:</span> rating-{Math.round(Math.max(0, Math.min(5, selected.rating || 0)) * 2) / 2}.webp</p>
              <p><span className="font-medium text-foreground">free_shipping na BD:</span> {String(!!selected.free_shipping)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbienteTeste;
