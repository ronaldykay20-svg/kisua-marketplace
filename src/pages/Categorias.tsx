import { useState, useMemo } from "react";
import { ShoppingBag, ShoppingCart, Search, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ════════════════════════════════════════════════════════════
   TOKENS — identidade "mercado": terracota, areia e cacau
   ════════════════════════════════════════════════════════════ */
const bg          = "#FAF5EE";   // papel quente
const surface     = "#FFFFFF";
const ink         = "#2E1B0E";   // cacau profundo
const inkSoft     = "#7A6249";   // cacau suave (texto secundário)
const sand        = "#E3C49C";
const sandDeep    = "#B9803F";
const clay        = "#A8552E";   // terracota — CTA / preço
const gold        = "#C8932F";   // selo / avaliação
const line         = "rgba(46,27,14,0.10)";
const lineSoft     = "rgba(46,27,14,0.06)";
const shadowSm     = "0 1px 3px rgba(46,27,14,0.08)";
const shadowMd     = "0 4px 16px rgba(46,27,14,0.10)";

const fontDisplay = "'Fraunces', Georgia, serif";
const fontBody    = "'Manrope', system-ui, sans-serif";

/* ── Helpers ── */
const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

/* ── Imagens fallback ── */
const staticImages: Record<string, string> = {
  "Electrónicos":    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop",
  "Veículos":        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop",
  "Imóveis":         "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop",
  "Moda":            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop",
  "Vestuário":       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop",
  "Casa & Jardim":   "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
  "Desporto":        "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=200&h=200&fit=crop",
  "Bebé & Criança":  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop",
  "Saúde & Beleza":  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop",
  "Informática":     "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",
  "Gaming":          "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop",
  "Jóias & Relógios":"https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop",
  "Viagens":         "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop",
  "Alimentação":     "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=200&h=200&fit=crop",
  "Empregos":        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=200&h=200&fit=crop",
  "Educação":        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop",
  "Animais":         "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop",
};

const coverImages: Record<string, string> = {
  "Electrónicos":    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=260&fit=crop",
  "Veículos":        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=260&fit=crop",
  "Imóveis":         "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=260&fit=crop",
  "Moda":            "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=260&fit=crop",
  "Vestuário":       "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=260&fit=crop",
  "Casa & Jardim":   "https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=260&fit=crop",
  "Desporto":        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=260&fit=crop",
  "Bebé & Criança":  "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=260&fit=crop",
  "Saúde & Beleza":  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=260&fit=crop",
  "Informática":     "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=260&fit=crop",
  "Gaming":          "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=260&fit=crop",
  "Jóias & Relógios":"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=260&fit=crop",
  "Viagens":         "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=400&h=260&fit=crop",
  "Alimentação":     "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=260&fit=crop",
  "Empregos":        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=260&fit=crop",
  "Educação":        "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=260&fit=crop",
  "Animais":         "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=260&fit=crop",
};

/* ── Hook: Top 12 por rating + sales_count ── */
const useTopProducts = () =>
  useQuery({
    queryKey: ["top_products_ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false })
        .order("sales_count", { ascending: false })
        .limit(12);
      if (error) throw error;

      const productIds = (data || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: mediaData } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (mediaData || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        priceFormatted: formatPrice(Number(p.price)),
        image: coverMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        rating: p.rating || 0,
        reviews: p.total_reviews || 0,
      }));
    },
  });

/* ── Hook: detectar tablet (≥ 600px) ── */
const useIsTablet = () => {
  const [isTablet, setIsTablet] = useState(() => window.innerWidth >= 600);
  useState(() => {
    const handler = () => setIsTablet(window.innerWidth >= 600);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  });
  return isTablet;
};

/* ── Estilos globais (fontes + interações que precisam de :hover) ── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;0,700;1,500&family=Manrope:wght@500;600;700;800&display=swap');

    .cgr-cat-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
    .cgr-cat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(46,27,14,0.14) !important; border-color: ${sandDeep}55 !important; }

    .cgr-side-btn { transition: background .15s ease, border-color .15s ease; position: relative; }
    .cgr-side-btn:hover { background: ${surface} !important; }

    .cgr-prod-card { transition: transform .18s ease, box-shadow .18s ease; }
    .cgr-prod-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(46,27,14,0.16) !important; }

    .cgr-cart-btn { transition: transform .15s ease, filter .15s ease; }
    .cgr-cart-btn:active { transform: scale(0.92); }
    .cgr-cart-btn:hover { filter: brightness(1.06); }

    .cgr-cta:hover { filter: brightness(1.08); }

    .cgr-products-scroll::-webkit-scrollbar { display: none; }
    @keyframes cgr-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ── Selo de pódio (top 3) — estampa metálica ── */
const PodiumStamp = ({ rank }: { rank: number }) => {
  const metals: Record<number, [string, string]> = {
    1: ["#F4D578", "#C8932F"],
    2: ["#E7E7E7", "#A6A6A6"],
    3: ["#D79A6B", "#9C5E2E"],
  };
  const [light, deepC] = metals[rank];
  return (
    <div style={{
      position: "absolute", top: -8, right: -8, zIndex: 10,
      width: 24, height: 24, borderRadius: "50%",
      background: `conic-gradient(from 200deg, ${light}, ${deepC}, ${light})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 6px rgba(46,27,14,0.35)",
      border: `2px solid ${surface}`,
    }}>
      <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 11, color: ink }}>
        {rank}
      </span>
    </div>
  );
};

/* ── Cartão de produto — acabamento "etiqueta de bilhete" ── */
const ProductCard = ({ product, rank, isTablet }: { product: any; rank: number; isTablet: boolean }) => {
  const navigate = useNavigate();
  const addToCart = useAddToCart();

  const cartSize = isTablet ? 34 : 27;
  const iconSize = isTablet ? 16 : 13;

  return (
    <div
      className="cgr-prod-card"
      style={{
        position: "relative", flexShrink: 0,
        width: isTablet ? "calc((100vw - 60px) / 6)" : "calc((100vw - 140px) / 2.4)",
        boxShadow: shadowSm,
        borderRadius: 14,
      }}
    >
      {rank <= 3 && <PodiumStamp rank={rank} />}

      <div style={{
        background: surface, borderRadius: 14,
        border: `1.5px solid ${line}`,
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <button
          style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          onClick={() => navigate(`/produto/${product.id}`)}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", overflow: "hidden", background: bg }}>
            <img src={product.image} alt={product.title} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {product.discount && (
              <span style={{
                position: "absolute", top: 6, left: 6,
                background: clay, color: surface,
                fontFamily: fontBody,
                fontSize: 9, fontWeight: 800,
                padding: "2px 6px", borderRadius: 20,
                letterSpacing: 0.2,
              }}>
                {product.discount}
              </span>
            )}
          </div>
        </button>

        {/* Perfuração estilo bilhete entre imagem e preço */}
        <div style={{ position: "relative", height: 1 }}>
          <div style={{
            position: "absolute", left: -1, top: -5, width: 10, height: 10,
            borderRadius: "50%", background: bg,
          }} />
          <div style={{
            position: "absolute", right: -1, top: -5, width: 10, height: 10,
            borderRadius: "50%", background: bg,
          }} />
          <div style={{
            position: "absolute", left: 8, right: 8, top: -1,
            borderTop: `1.5px dashed ${line}`,
          }} />
        </div>

        <div style={{
          display: "flex", alignItems: "center",
          padding: "8px 8px 7px",
          background: surface,
        }}>
          <span style={{
            fontFamily: fontBody, fontVariantNumeric: "tabular-nums",
            fontSize: isTablet ? 12 : 11, fontWeight: 800, color: clay, flex: 1, lineHeight: 1.2,
          }}>
            {product.priceFormatted}
          </span>
          <button
            className="cgr-cart-btn"
            onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: product.id, quantity: 1 }); }}
            disabled={addToCart.isPending}
            style={{
              width: cartSize, height: cartSize, borderRadius: 8, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${sandDeep}, ${sand})`,
              boxShadow: "0 2px 6px rgba(46,27,14,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShoppingCart style={{ width: iconSize, height: iconSize, color: surface }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════ */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();
  const { data: topProducts, isLoading: loadingProducts } = useTopProducts();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isTablet = useIsTablet();

  const categories: any[] = useMemo(() => {
    const base = dbCategories && dbCategories.length > 0 ? dbCategories : null;
    if (base) {
      return base.map((c: any) => ({
        name:  c.name,
        id:    c.id,
        image: c.image_url || staticImages[c.name] || "",
        cover: coverImages[c.name] || c.image_url || "",
        count: c.product_count ?? null,
      }));
    }
    return Object.keys(staticImages).map(name => ({
      name, id: null,
      image: staticImages[name],
      cover: coverImages[name] || "",
      count: null,
    }));
  }, [dbCategories]);

  const displayed = selectedCategory
    ? categories.filter((c: any) => c.name === selectedCategory)
    : categories;

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: fontBody }}>
      <GlobalStyle />

      {/* ── Pesquisa ── */}
      <div style={{ padding: "14px 14px 10px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: surface, border: `1px solid ${line}`,
          borderRadius: 14, padding: "11px 14px",
          boxShadow: shadowSm,
        }}>
          <Search style={{ width: 17, height: 17, color: sandDeep, flexShrink: 0 }} strokeWidth={2.2} />
          <input
            type="text"
            placeholder="Pesquisar categorias..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontFamily: fontBody, fontSize: 14, fontWeight: 500, color: ink,
            }}
            onKeyDown={(e) => {
              const val = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && val) navigate(`/pesquisa?q=${encodeURIComponent(val)}`);
            }}
          />
        </div>
      </div>

      {/* ── Sidebar + Grelha ── */}
      <div style={{
        display: "flex", margin: "0 10px",
        borderRadius: 20, overflow: "hidden",
        boxShadow: shadowMd,
        border: `1px solid ${line}`,
      }}>
        <aside style={{
          width: 100, flexShrink: 0,
          background: bg, borderRight: `1px solid ${line}`,
          overflowY: "auto", maxHeight: "calc(100vh - 160px)",
        }}>
          <button
            className="cgr-side-btn"
            onClick={() => setSelectedCategory(null)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "13px 8px", cursor: "pointer",
              background: selectedCategory === null ? surface : "transparent",
              borderLeft: `3px solid ${selectedCategory === null ? gold : "transparent"}`,
              borderRight: "none", borderTop: "none",
              borderBottom: `1px solid ${line}`,
            }}
          >
            <span style={{
              fontFamily: fontBody, fontSize: 11, textAlign: "center",
              color: selectedCategory === null ? sandDeep : inkSoft,
              fontWeight: selectedCategory === null ? 800 : 600,
            }}>
              Todas
            </span>
          </button>

          {categories.map((cat: any) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                className="cgr-side-btn"
                onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "13px 8px", cursor: "pointer",
                  background: isActive ? surface : "transparent",
                  borderLeft: `3px solid ${isActive ? gold : "transparent"}`,
                  borderRight: "none", borderTop: "none",
                  borderBottom: `1px solid ${line}`,
                }}
              >
                <span style={{
                  fontFamily: fontBody, fontSize: 11, textAlign: "center", lineHeight: 1.3,
                  wordBreak: "break-word",
                  color: isActive ? sandDeep : inkSoft,
                  fontWeight: isActive ? 800 : 600,
                }}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Grelha 3 colunas */}
        <div style={{ flex: 1, padding: "16px 10px", background: surface, minWidth: 0 }}>
          <h2 style={{
            fontFamily: fontDisplay, color: ink, fontSize: 17, fontWeight: 600,
            margin: "0 0 12px", letterSpacing: -0.2,
          }}>
            Todas as Categorias
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {displayed.map((cat: any) => (
              <button
                key={cat.name}
                className="cgr-cat-card"
                onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                style={{
                  display: "flex", flexDirection: "column",
                  background: surface, border: `1px solid ${line}`,
                  borderRadius: 16, overflow: "hidden",
                  cursor: "pointer", padding: 0, textAlign: "left",
                  boxShadow: shadowSm,
                }}
              >
                <div style={{ width: "100%", aspectRatio: "1/0.68", position: "relative", overflow: "hidden" }}>
                  {cat.cover ? (
                    <img src={cat.cover} alt={cat.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: lineSoft,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ShoppingBag style={{ width: 24, height: 24, color: sandDeep }} />
                    </div>
                  )}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, rgba(46,27,14,0) 55%, rgba(46,27,14,0.32) 100%)",
                  }} />
                  {cat.image && (
                    <div style={{
                      position: "absolute", bottom: -12, left: 8,
                      width: 28, height: 28, borderRadius: "50%",
                      overflow: "hidden", border: `2.5px solid ${surface}`,
                      boxShadow: "0 1px 5px rgba(46,27,14,0.25)",
                    }}>
                      <img src={cat.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </div>
                <div style={{ padding: "18px 8px 10px" }}>
                  <p style={{ margin: 0, fontFamily: fontBody, fontSize: 11, fontWeight: 700, color: ink, lineHeight: 1.25 }}>
                    {cat.name}
                  </p>
                  {cat.count !== null && (
                    <p style={{ margin: "2px 0 0", fontFamily: fontBody, fontSize: 9, color: sandDeep, fontWeight: 600 }}>
                      {cat.count.toLocaleString("pt-AO")} itens
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ofertas Imperdíveis ── */}
      <button
        className="cgr-cta"
        onClick={() => navigate("/promocoes")}
        style={{
          width: "calc(100% - 20px)", margin: "14px 10px 0", padding: "14px 16px",
          background: `linear-gradient(135deg, ${ink}, #43290F)`,
          border: "none", borderRadius: 16, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: shadowMd,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${gold}, ${sandDeep})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Sparkles style={{ width: 19, height: 19, color: surface }} strokeWidth={2.2} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontFamily: fontDisplay, fontSize: 14, fontWeight: 600, color: surface }}>
              Ofertas Imperdíveis
            </p>
            <p style={{ margin: 0, fontFamily: fontBody, fontSize: 10, color: "#D9C2A6" }}>
              Descontos exclusivos por tempo limitado
            </p>
          </div>
        </div>
        <span style={{
          background: "rgba(255,255,255,0.14)", color: surface, fontFamily: fontBody,
          borderRadius: 10, padding: "8px 14px",
          fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
        }}>
          Ver ofertas →
        </span>
      </button>

      {/* ── Campeões de Vendas: Top 12 ── */}
      <div style={{ margin: "18px 10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${gold}, #A8701F)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(200,147,47,0.4)",
          }}>
            <Trophy style={{ width: 17, height: 17, color: surface }} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: ink, letterSpacing: -0.2 }}>
              Campeões de Vendas
            </h3>
            <p style={{ margin: 0, fontFamily: fontBody, fontSize: 10, color: inkSoft, fontWeight: 600 }}>
              Os produtos mais bem avaliados
            </p>
          </div>
        </div>

        {loadingProducts ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${line}`,
              borderTopColor: sandDeep,
              animation: "cgr-spin 0.8s linear infinite",
            }} />
          </div>
        ) : (
          <div
            className="cgr-products-scroll"
            style={{
              display: "flex", flexDirection: "row", gap: 10,
              overflowX: "auto", overflowY: "visible",
              paddingBottom: 8, paddingTop: 10,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}
          >
            {(topProducts || []).map((product: any, idx: number) => (
              <ProductCard key={product.id} product={product} rank={idx + 1} isTablet={isTablet} />
            ))}
            <div style={{ flexShrink: 0, width: 2 }} />
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
};

export default Categorias;
