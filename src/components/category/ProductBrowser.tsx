import { useMemo, useState } from "react";
import {
  SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, Plus, X,
  Heart,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/* ════════════════════════════════════════════════════════════
   TOKENS — fonte única usada por Categorias.tsx e
   CategoriaDetalhe.tsx. Mudar aqui muda as duas páginas juntas,
   exactamente para nunca mais divergirem.
   ════════════════════════════════════════════════════════════ */
export const bg        = "#FAF5EE";
export const surface   = "#FFFFFF";
export const ink       = "#23150B";
export const inkSoft   = "#7A6249";
export const brand     = "#A9835C";
export const brandDeep = "#8F6C49";
export const promo     = "#C23B2B";
export const dealGreen = "#1E7A3C";
export const saveBg    = "#E3F2E6";
export const gold      = "#C8932F";
export const line      = "rgba(35,21,11,0.10)";
export const lineSoft  = "rgba(35,21,11,0.06)";
export const shadowSm  = "0 1px 3px rgba(35,21,11,0.08)";
export const shadowMd  = "0 4px 16px rgba(35,21,11,0.10)";

export const fontBody = "'Manrope', system-ui, sans-serif";

export const formatPrice = (n: number) => n.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

/* Mapa de nome→hex para exibir amostras de cor no filtro. */
const colorNameToHex: Record<string, string> = {
  "Preto": "#000000", "Branco": "#FFFFFF", "Rosa": "#EC4899",
  "Azul": "#3B82F6", "Cinza": "#6B7280", "Verde": "#22C55E",
  "Vermelho": "#EF4444", "Amarelo": "#EAB308", "Cáqui": "#D97706",
  "Marrom": "#78350F", "Castanho": "#78350F", "Roxo": "#A855F7",
  "Laranja": "#F97316", "Bege": "#D6B893", "Dourado": "#C8932F",
  "Prateado": "#C0C0C0",
};

export const sortOptions = ["Recomendado", "Menor preço", "Maior preço", "Mais vendidos", "Mais recentes"];

const hexClose = (a: string, b: string, tolerance = 60) => {
  const parse = (h: string) => {
    const s = h.replace("#", "");
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  try {
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) <= tolerance;
  } catch { return false; }
};

export const ProductBrowserGlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');
    .pb-scroll::-webkit-scrollbar { display: none; }
    .pb-prod-card { transition: transform .15s ease, box-shadow .15s ease; }
    .pb-prod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(35,21,11,0.14) !important; }
    .pb-cart-btn:active { transform: scale(0.97); }
    .pb-heart-btn:active { transform: scale(0.88); }
    .pb-sub-btn { transition: background .15s ease; }
    .pb-chip { transition: border-color .15s ease, background .15s ease; }
    .pb-product-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 12px;
    }
    @media (min-width: 640px)  { .pb-product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (min-width: 900px)  { .pb-product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (min-width: 1200px) { .pb-product-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
    @media (min-width: 1500px) { .pb-product-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    @keyframes pb-spin { to { transform: rotate(360deg); } }
  `}</style>
);

export interface BrowserProduct {
  id: string;
  title: string;
  price: number;
  priceFormatted: string;
  oldPriceFormatted?: string;
  discount?: string;
  image: string;
  rating: number;
  reviews: number;
  freeShipping?: boolean;
  salesCount?: number;
  /** Cores do produto tal como o vendedor as registou (nome + hex). */
  colors: { name: string; hex: string }[];
  /** Rótulo de agrupamento usado no filtro superior (subcategoria numa
      página de categoria; a própria categoria na página geral). */
  groupLabel: string | null;
}

const RatingRow = ({ rating, reviews }: { rating: number; reviews: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
    <div style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: 11, height: 11 }}
          fill={i <= Math.round(rating) ? gold : "none"}
          stroke={i <= Math.round(rating) ? gold : "#C8BBA8"} strokeWidth={1.5} />
      ))}
    </div>
    {reviews > 0 && (
      <span style={{ fontFamily: fontBody, fontSize: 10, color: inkSoft, fontWeight: 600 }}>
        {reviews.toLocaleString("pt-AO")}
      </span>
    )}
  </div>
);

const ProductCard = ({ product, navigate, addToCart }: { product: BrowserProduct; navigate: any; addToCart: any }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="pb-prod-card" style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => navigate(`/produto/${product.id}`)}
          style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div style={{
            width: "100%", aspectRatio: "1/1", borderRadius: 12, overflow: "hidden",
            background: surface, border: `1px solid ${line}`,
          }}>
            <img src={product.image} alt={product.title} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </button>

        {product.discount && (
          <span style={{
            position: "absolute", top: 8, left: 0,
            background: promo, color: surface,
            fontFamily: fontBody, fontSize: 10.5, fontWeight: 800,
            padding: "3px 9px", borderRadius: "0 6px 6px 0",
          }}>
            {product.discount}
          </span>
        )}
        {product.freeShipping && (
          <span style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(35,21,11,0.75)", color: surface,
            fontFamily: fontBody, fontSize: 9, fontWeight: 700,
            padding: "3px 8px", borderRadius: 20,
          }}>
            Frete grátis
          </span>
        )}

        <button
          className="pb-heart-btn"
          onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
            background: surface, boxShadow: shadowSm,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Heart style={{ width: 13, height: 13 }} fill={liked ? promo : "none"} stroke={liked ? promo : ink} strokeWidth={1.8} />
        </button>
      </div>

      <button
        className="pb-cart-btn"
        onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
        disabled={addToCart.isPending}
        style={{
          width: "100%", marginTop: 9, padding: "8px 0", borderRadius: 20, border: "none", cursor: "pointer",
          background: brandDeep, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        {addToCart.isPending
          ? <Loader2 style={{ width: 13, height: 13, color: surface }} className="animate-spin" />
          : <ShoppingCart style={{ width: 12, height: 12, color: surface }} />}
        <span style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 800, color: surface }}>Adicionar</span>
      </button>

      <div style={{ marginTop: 7 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: fontBody, fontSize: 16, fontWeight: 800, color: dealGreen, fontVariantNumeric: "tabular-nums" }}>
            {product.priceFormatted}
          </span>
        </div>
        {product.oldPriceFormatted && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1, flexWrap: "wrap" }}>
            <span style={{ fontFamily: fontBody, fontSize: 11, color: inkSoft, textDecoration: "line-through", fontWeight: 600 }}>
              {product.oldPriceFormatted}
            </span>
            {product.discount && (
              <span style={{
                fontFamily: fontBody, fontSize: 9.5, fontWeight: 800, color: dealGreen,
                background: saveBg, borderRadius: 4, padding: "1px 5px",
              }}>
                {product.discount}
              </span>
            )}
          </div>
        )}

        <p style={{
          margin: "5px 0 0", fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: ink,
          lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {product.title}
        </p>

        {product.rating > 0 && <RatingRow rating={product.rating} reviews={product.reviews} />}
      </div>
    </div>
  );
};

export interface ProductBrowserProps {
  products: BrowserProduct[];
  isLoading: boolean;
  /** Texto do grupo de filtro (ex.: "Subcategoria" ou "Categoria"). */
  groupFilterLabel: string;
  /** Texto da contagem de resultados, ex.: `em "Sapatos"` ou `em todo o catálogo`. */
  resultsContext: string;
  navigate: any;
  addToCart: any;
}

/**
 * Estrutura completa de navegação de produtos — chips de agrupamento,
 * barra de ordenação fixa, painel de filtros (lateral no desktop / gaveta
 * no mobile) e grelha responsiva. Usado tal e qual pela Categorias.tsx
 * (agrupando por categoria) e pela CategoriaDetalhe.tsx (agrupando por
 * subcategoria), para as duas terem sempre a mesma estrutura.
 */
export const ProductBrowser = ({
  products, isLoading, groupFilterLabel, resultsContext, navigate, addToCart,
}: ProductBrowserProps) => {
  const [sortBy, setSortBy] = useState("Recomendado");
  const [showSort, setShowSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.groupLabel) set.add(p.groupLabel); });
    return Array.from(set).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    products.forEach((p) => {
      p.colors.forEach(({ name, hex }) => {
        if (!map.has(name)) map.set(name, { name, hex: colorNameToHex[name] || hex });
      });
    });
    return Array.from(map.values());
  }, [products]);

  const priceRanges = useMemo(() => {
    if (products.length === 0) return [] as { label: string; min: number; max: number }[];
    const base = [
      { label: "Até 10.000 Kz",       min: 0,      max: 10000  },
      { label: "10.000 - 50.000 Kz",  min: 10000,  max: 50000  },
      { label: "50.000 - 200.000 Kz", min: 50000,  max: 200000 },
      { label: "200.000+",            min: 200000, max: Infinity },
    ];
    return base.filter((r) => products.some((p) => p.price >= r.min && p.price < r.max));
  }, [products]);

  const sortedFiltered = useMemo(() => {
    let list = [...products];
    if (selectedGroup) list = list.filter((p) => p.groupLabel === selectedGroup);
    if (selectedColors.length > 0) {
      list = list.filter((p) => {
        if (p.colors.length === 0) return false;
        return selectedColors.some((colorName) => {
          const filterHex = availableColors.find((c) => c.name === colorName)?.hex;
          if (!filterHex) return false;
          return p.colors.some((c) => hexClose(c.hex, filterHex));
        });
      });
    }
    if (selectedPrice) {
      const range = priceRanges.find((r) => r.label === selectedPrice);
      if (range) list = list.filter((p) => p.price >= range.min && p.price < range.max);
    }
    if (sortBy === "Menor preço") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "Maior preço") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "Mais vendidos") list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    return list;
  }, [products, selectedGroup, selectedColors, selectedPrice, sortBy, availableColors, priceRanges]);

  const toggleColor = (c: string) =>
    setSelectedColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const activeFiltersCount = (selectedGroup ? 1 : 0) + selectedColors.length + (selectedPrice ? 1 : 0);
  const clearFilters = () => { setSelectedGroup(null); setSelectedColors([]); setSelectedPrice(null); };

  const FiltersPanel = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {activeFiltersCount > 0 && (
        <button
          onClick={clearFilters}
          style={{
            display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
            fontFamily: fontBody, fontSize: 10.5, fontWeight: 800,
            padding: "5px 10px", borderRadius: 20, cursor: "pointer",
            background: lineSoft, color: brandDeep, border: `1px solid ${line}`,
          }}
        >
          <X style={{ width: 11, height: 11 }} /> Limpar filtros ({activeFiltersCount})
        </button>
      )}

      {availableGroups.length > 0 && (
        <div>
          <h3 style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: inkSoft, margin: "0 0 8px" }}>
            {groupFilterLabel}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {availableGroups.map((g) => {
              const active = selectedGroup === g;
              return (
                <button
                  key={g}
                  className="pb-sub-btn"
                  onClick={() => setSelectedGroup(active ? null : g)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 9, border: "none",
                    cursor: "pointer", background: active ? lineSoft : "transparent",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 15, height: 15, borderRadius: "50%", border: `2px solid ${active ? brandDeep : "#CBBFA9"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: brandDeep }} />}
                    </span>
                    <span style={{ fontFamily: fontBody, fontSize: 12.5, color: active ? ink : inkSoft, fontWeight: active ? 700 : 500 }}>
                      {g}
                    </span>
                  </span>
                  <Plus style={{ width: 12, height: 12, color: brandDeep }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {availableColors.length > 0 && (
        <div>
          <h3 style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: inkSoft, margin: "0 0 8px" }}>
            Cor
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {availableColors.map((c) => {
              const active = selectedColors.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleColor(c.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "5px 6px", borderRadius: 9,
                    cursor: "pointer", fontFamily: fontBody, fontSize: 11.5,
                    background: active ? lineSoft : "transparent",
                    color: active ? ink : inkSoft, fontWeight: active ? 700 : 500,
                    border: active ? `1px solid ${line}` : "1px solid transparent",
                  }}
                >
                  <span style={{
                    width: 15, height: 15, borderRadius: "50%", flexShrink: 0,
                    background: c.hex, border: c.hex === "#FFFFFF" ? `1px solid ${line}` : "none",
                  }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {priceRanges.length > 0 && (
        <div>
          <h3 style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: inkSoft, margin: "0 0 8px" }}>
            Preço
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {priceRanges.map((r) => {
              const active = selectedPrice === r.label;
              return (
                <button
                  key={r.label}
                  onClick={() => setSelectedPrice(active ? null : r.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                    padding: "7px 8px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: active ? lineSoft : "transparent",
                    fontFamily: fontBody, fontSize: 12.5, color: active ? ink : inkSoft, fontWeight: active ? 700 : 500,
                  }}
                >
                  <span style={{
                    width: 15, height: 15, borderRadius: 4, border: `2px solid ${active ? brandDeep : "#CBBFA9"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {active && <span style={{ width: 7, height: 7, borderRadius: 2, background: brandDeep }} />}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ── Chips de agrupamento — horizontais ── */}
      {availableGroups.length > 0 && (
        <div className="pb-scroll" style={{ display: "flex", gap: 8, padding: "12px 14px", background: surface, overflowX: "auto", scrollbarWidth: "none", borderBottom: `1px solid ${line}` }}>
          {availableGroups.map((g) => {
            const active = selectedGroup === g;
            return (
              <button
                key={g}
                className="pb-chip"
                onClick={() => setSelectedGroup(active ? null : g)}
                style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                  background: active ? brandDeep : surface,
                  border: `1.5px solid ${active ? brandDeep : line}`,
                  fontFamily: fontBody, fontSize: 12.5, fontWeight: 700,
                  color: active ? surface : brandDeep,
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Barra de ordenação ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: surface, borderBottom: `1px solid ${line}` }}>
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <button onClick={() => setShowSort(!showSort)} style={{
              display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: ink,
            }}>
              Ordenar por <span style={{ fontWeight: 800, color: brandDeep }}>{sortBy}</span>
              <ChevronDown style={{ width: 13, height: 13, color: brandDeep }} />
            </button>
            {showSort && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 180, zIndex: 40,
                background: surface, border: `1px solid ${line}`, borderRadius: 12, boxShadow: shadowMd, overflow: "hidden",
              }}>
                {sortOptions.map((opt) => (
                  <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); }} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", cursor: "pointer",
                    background: opt === sortBy ? lineSoft : "transparent",
                    fontFamily: fontBody, fontSize: 12.5, color: opt === sortBy ? brandDeep : ink, fontWeight: opt === sortBy ? 800 : 500,
                  }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isMobile && (
            <button onClick={() => setShowMobileFilters(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, cursor: "pointer",
              background: activeFiltersCount > 0 ? brandDeep : lineSoft,
              border: `1.5px solid ${activeFiltersCount > 0 ? brandDeep : line}`,
              fontFamily: fontBody, fontSize: 11.5, fontWeight: 800,
              color: activeFiltersCount > 0 ? surface : ink,
            }}>
              <SlidersHorizontal style={{ width: 13, height: 13 }} />
              Filtro{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </button>
          )}
        </div>
      </div>

      {/* ── Gaveta de filtros (mobile) ── */}
      {isMobile && showMobileFilters && (
        <div onClick={() => setShowMobileFilters(false)} style={{
          position: "fixed", inset: 0, zIndex: 50, background: "rgba(35,21,11,0.45)", backdropFilter: "blur(2px)",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 280, overflowY: "auto",
            background: bg, padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontFamily: fontBody, fontSize: 14, fontWeight: 800, color: ink }}>Filtros</h2>
              <button onClick={() => setShowMobileFilters(false)} style={{
                width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
                background: lineSoft, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X style={{ width: 15, height: 15, color: ink }} />
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div style={{ display: "flex", gap: 16, padding: "0 14px" }}>
        {!isMobile && (
          <aside style={{
            width: 220, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 60,
            marginTop: 16, padding: "16px 14px", borderRadius: 16,
            background: surface, border: `1px solid ${line}`, boxShadow: shadowSm,
          }}>
            <FiltersPanel />
          </aside>
        )}

        <div style={{ flex: 1, padding: "12px 0" }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", border: `3px solid ${line}`, borderTopColor: brand,
                animation: "pb-spin 0.8s linear infinite",
              }} />
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: inkSoft }}>
                {sortedFiltered.length} resultado{sortedFiltered.length !== 1 ? "s" : ""} {resultsContext}
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} style={{
                    marginLeft: 8, background: "none", border: "none", cursor: "pointer",
                    fontFamily: fontBody, fontSize: 12, color: brandDeep, textDecoration: "underline", fontWeight: 700,
                  }}>
                    limpar filtros
                  </button>
                )}
              </p>

              {sortedFiltered.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 10 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", background: lineSoft,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <SlidersHorizontal style={{ width: 22, height: 22, color: brandDeep }} />
                  </div>
                  <p style={{ margin: 0, fontFamily: fontBody, fontSize: 13.5, fontWeight: 700, color: ink }}>Sem resultados</p>
                  <p style={{ margin: 0, fontFamily: fontBody, fontSize: 12, color: inkSoft, textAlign: "center", maxWidth: 200 }}>
                    Tente ajustar os filtros para encontrar o que procura.
                  </p>
                  {activeFiltersCount > 0 && (
                    <button onClick={clearFilters} style={{
                      marginTop: 4, padding: "9px 18px", borderRadius: 20, border: "none", cursor: "pointer",
                      background: brandDeep, color: surface, fontFamily: fontBody, fontSize: 12, fontWeight: 800,
                    }}>
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="pb-product-grid">
                  {sortedFiltered.map((p) => <ProductCard key={p.id} product={p} navigate={navigate} addToCart={addToCart} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
