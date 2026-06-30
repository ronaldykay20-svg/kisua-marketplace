import { useState, useMemo } from "react";
import { ShoppingBag, ShoppingCart, Search, Trophy, Heart, Menu, SlidersHorizontal, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ════════════════════════════════════════════════════════════
   TOKENS — onde a referência usa azul, entra um castanho fraco
   (suave, dessaturado) em vez de um castanho escuro/forte
   ════════════════════════════════════════════════════════════ */
const bg          = "#FAF5EE";   // papel quente
const surface     = "#FFFFFF";
const ink         = "#2E1B0E";   // texto principal
const inkSoft     = "#7A6249";   // texto secundário
const headerBrown = "#A9835C";   // castanho fraco — substitui o azul Walmart
const headerBrownDeep = "#8F6C49";
const sand        = "#E3C49C";
const sandDeep    = "#B9803F";
const clay        = "#A8552E";   // tag de promoção (substitui o "Rollback" vermelho-marca)
const gold        = "#C8932F";
const dealGreen   = "#1E7A3C";   // preço em promoção — mantém-se verde, não é um elemento "azul"
const line        = "rgba(46,27,14,0.10)";
const lineSoft    = "rgba(46,27,14,0.06)";
const shadowSm    = "0 1px 3px rgba(46,27,14,0.08)";
const shadowMd    = "0 4px 16px rgba(46,27,14,0.10)";

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

      return (data || []).map((p: any) => {
        const price = Number(p.price);
        const hasDiscount = !!p.discount_percent;
        const originalPrice = hasDiscount ? price / (1 - Number(p.discount_percent) / 100) : null;
        return {
          id: p.id,
          title: p.title,
          price,
          priceFormatted: formatPrice(price),
          originalPriceFormatted: originalPrice ? formatPrice(originalPrice) : null,
          image: coverMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
          discount: hasDiscount ? `-${p.discount_percent}%` : undefined,
          rating: p.rating || 0,
          reviews: p.total_reviews || 0,
        };
      });
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

    .cgr-cat-card { transition: transform .18s ease, box-shadow .18s ease; }
    .cgr-cat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(46,27,14,0.14) !important; }

    .cgr-side-btn { transition: background .15s ease; }
    .cgr-side-btn:hover { background: ${surface} !important; }

    .cgr-prod-card { transition: transform .18s ease, box-shadow .18s ease; }
    .cgr-prod-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(46,27,14,0.16) !important; }

    .cgr-cart-btn { transition: transform .15s ease, filter .15s ease; }
    .cgr-cart-btn:active { transform: scale(0.92); }
    .cgr-cart-btn:hover { filter: brightness(1.08); }

    .cgr-heart-btn { transition: transform .15s ease; }
    .cgr-heart-btn:active { transform: scale(0.88); }

    .cgr-chip { transition: background .15s ease, border-color .15s ease; }
    .cgr-chip:hover { border-color: ${headerBrown} !important; }

    .cgr-cta:hover { filter: brightness(1.08); }

    .cgr-products-scroll::-webkit-scrollbar { display: none; }
    .cgr-chips-scroll::-webkit-scrollbar { display: none; }
    @keyframes cgr-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ── Estrelas de avaliação, estilo etiqueta de preço de mercado ── */
const RatingRow = ({ rating, reviews }: { rating: number; reviews: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <div style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: 11, height: 11 }}
          fill={i <= Math.round(rating) ? gold : "none"}
          stroke={i <= Math.round(rating) ? gold : inkSoft}
          strokeWidth={1.5}
        />
      ))}
    </div>
    {reviews > 0 && (
      <span style={{ fontFamily: fontBody, fontSize: 10, color: inkSoft, fontWeight: 600 }}>
        {reviews.toLocaleString("pt-AO")}
      </span>
    )}
  </div>
);

/* ── Cartão de produto, densidade de catálogo grande ── */
const ProductCard = ({ product, rank, isTablet }: { product: any; rank: number; isTablet: boolean }) => {
  const navigate = useNavigate();
  const addToCart = useAddToCart();
  const [liked, setLiked] = useState(false);

  return (
    <div
      className="cgr-prod-card"
      style={{
        position: "relative", flexShrink: 0,
        width: isTablet ? 200 : 158,
        background: surface, borderRadius: 14,
        border: `1px solid ${line}`,
        boxShadow: shadowSm,
        overflow: "hidden",
      }}
    >
      <button
        style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        onClick={() => navigate(`/produto/${product.id}`)}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: bg }}>
          <img src={product.image} alt={product.title} loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

          {product.discount && (
            <span style={{
              position: "absolute", top: 8, left: 8,
              background: clay, color: surface,
              fontFamily: fontBody, fontSize: 10, fontWeight: 800,
              padding: "3px 8px", borderRadius: 6,
              letterSpacing: 0.2,
            }}>
              Promoção
            </span>
          )}
          {rank <= 3 && (
            <span style={{
              position: "absolute", bottom: 8, left: 8,
              background: ink, color: surface,
              fontFamily: fontBody, fontSize: 9, fontWeight: 800,
              padding: "3px 7px", borderRadius: 6,
            }}>
              #{rank} mais vendido
            </span>
          )}
        </div>
      </button>

      <button
        className="cgr-heart-btn"
        onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
        style={{
          position: "absolute", top: 8, right: 8,
          width: 28, height: 28, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "rgba(255,255,255,0.92)", boxShadow: shadowSm,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Heart style={{ width: 14, height: 14 }} fill={liked ? clay : "none"} stroke={liked ? clay : inkSoft} strokeWidth={2} />
      </button>

      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: fontBody, fontSize: isTablet ? 16 : 14, fontWeight: 800, color: dealGreen, fontVariantNumeric: "tabular-nums" }}>
            {product.priceFormatted}
          </span>
          {product.originalPriceFormatted && (
            <span style={{ fontFamily: fontBody, fontSize: 11, color: inkSoft, textDecoration: "line-through", fontWeight: 600 }}>
              {product.originalPriceFormatted}
            </span>
          )}
        </div>

        <p style={{
          margin: "4px 0 6px", fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: ink,
          lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {product.title}
        </p>

        <RatingRow rating={product.rating} reviews={product.reviews} />

        <button
          className="cgr-cta"
          onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: product.id, quantity: 1 }); }}
          disabled={addToCart.isPending}
          style={{
            width: "100%", marginTop: 9, padding: "8px 0", borderRadius: 20, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${headerBrownDeep}, ${headerBrown})`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <ShoppingCart style={{ width: 13, height: 13, color: surface }} />
          <span style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 800, color: surface }}>Adicionar</span>
        </button>
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

      {/* ── Cabeçalho — onde a referência usa azul, aqui é castanho fraco ── */}
      <div style={{ background: `linear-gradient(180deg, ${headerBrown}, ${headerBrownDeep})`, padding: "12px 14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Menu style={{ width: 22, height: 22, color: surface }} strokeWidth={2.2} />
          </button>
          <span style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 700, color: surface, letterSpacing: -0.3 }}>
            zangu
          </span>
          <div style={{ flex: 1 }} />
          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <ShoppingCart style={{ width: 21, height: 21, color: surface }} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: surface, borderRadius: 14, padding: "11px 14px",
          boxShadow: shadowSm,
        }}>
          <Search style={{ width: 17, height: 17, color: headerBrown, flexShrink: 0 }} strokeWidth={2.2} />
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

      {/* ── Filtros rápidos ── */}
      <div
        className="cgr-chips-scroll"
        style={{ display: "flex", gap: 8, padding: "12px 14px 4px", overflowX: "auto", scrollbarWidth: "none" }}
      >
        <button className="cgr-chip" style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
          background: surface, border: `1.5px solid ${line}`, borderRadius: 20,
          padding: "8px 12px", cursor: "pointer",
        }}>
          <SlidersHorizontal style={{ width: 13, height: 13, color: headerBrownDeep }} />
        </button>
        {["Lojas físicas", "Preço", "Marca", "Avaliação"].map((label) => (
          <button key={label} className="cgr-chip" style={{
            flexShrink: 0, background: surface, border: `1.5px solid ${line}`, borderRadius: 20,
            padding: "8px 14px", cursor: "pointer",
            fontFamily: fontBody, fontSize: 12, fontWeight: 700, color: headerBrownDeep,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Sidebar + Grelha ── */}
      <div style={{
        display: "flex", margin: "10px 10px 0",
        borderRadius: 20, overflow: "hidden",
        boxShadow: shadowMd,
        border: `1px solid ${line}`,
      }}>
        <aside style={{
          width: 96, flexShrink: 0,
          background: bg, borderRight: `1px solid ${line}`,
          overflowY: "auto", maxHeight: "calc(100vh - 160px)",
          padding: "10px 6px",
        }}>
          <button
            className="cgr-side-btn"
            onClick={() => setSelectedCategory(null)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "11px 6px", marginBottom: 4, cursor: "pointer",
              borderRadius: 11, border: "none",
              background: selectedCategory === null ? surface : "transparent",
              boxShadow: selectedCategory === null ? shadowSm : "none",
            }}
          >
            <span style={{
              fontFamily: fontBody, fontSize: 11, textAlign: "center",
              color: selectedCategory === null ? clay : inkSoft,
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
                  padding: "11px 6px", marginBottom: 4, cursor: "pointer",
                  borderRadius: 11, border: "none",
                  background: isActive ? surface : "transparent",
                  boxShadow: isActive ? shadowSm : "none",
                }}
              >
                <span style={{
                  fontFamily: fontBody, fontSize: 11, textAlign: "center", lineHeight: 1.3,
                  wordBreak: "break-word",
                  color: isActive ? clay : inkSoft,
                  fontWeight: isActive ? 800 : 600,
                }}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Grelha 3 colunas — cartões a sangue total */}
        <div style={{ flex: 1, padding: "16px 10px", background: surface, minWidth: 0 }}>
          <h2 style={{
            fontFamily: fontDisplay, color: ink, fontSize: 17, fontWeight: 600,
            margin: "0 0 12px", letterSpacing: -0.2,
          }}>
            Todas as Categorias
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
            {displayed.map((cat: any) => (
              <button
                key={cat.name}
                className="cgr-cat-card"
                onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                style={{
                  position: "relative", aspectRatio: "1/1.12",
                  borderRadius: 14, overflow: "hidden",
                  cursor: "pointer", padding: 0, border: "none",
                  boxShadow: shadowSm,
                }}
              >
                {cat.cover ? (
                  <img src={cat.cover} alt={cat.name}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, background: lineSoft,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShoppingBag style={{ width: 24, height: 24, color: sandDeep }} />
                  </div>
                )}

                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(46,27,14,0) 38%, rgba(46,27,14,0.78) 100%)",
                }} />

                {cat.image && (
                  <div style={{
                    position: "absolute", top: 7, left: 7,
                    width: 24, height: 24, borderRadius: "50%",
                    overflow: "hidden", border: `1.5px solid rgba(255,255,255,0.85)`,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  }}>
                    <img src={cat.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}

                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 9px 9px" }}>
                  <p style={{
                    margin: 0, fontFamily: fontBody, fontSize: 11.5, fontWeight: 800,
                    color: surface, lineHeight: 1.25, textAlign: "left",
                    textShadow: "0 1px 3px rgba(0,0,0,0.35)",
                  }}>
                    {cat.name}
                  </p>
                  {cat.count !== null && (
                    <p style={{ margin: "1px 0 0", fontFamily: fontBody, fontSize: 9, color: "#F0DCC2", fontWeight: 600, textAlign: "left" }}>
                      {cat.count.toLocaleString("pt-AO")} itens
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campeões de Vendas: Top 12, densidade de catálogo ── */}
      <div style={{ margin: "20px 10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          <button
            onClick={() => navigate("/promocoes")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: fontBody, fontSize: 12, fontWeight: 700, color: headerBrownDeep, textDecoration: "underline" }}
          >
            Ver tudo
          </button>
        </div>

        {loadingProducts ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${line}`,
              borderTopColor: headerBrown,
              animation: "cgr-spin 0.8s linear infinite",
            }} />
          </div>
        ) : (
          <div
            className="cgr-products-scroll"
            style={{
              display: "flex", flexDirection: "row", gap: 10,
              overflowX: "auto", overflowY: "visible",
              paddingBottom: 8, paddingTop: 2,
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

      <div style={{ height: 24 }} />
    </div>
  );
};

export default Categorias;
