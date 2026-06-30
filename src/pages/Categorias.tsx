import { useState, useMemo } from "react";
import {
  ShoppingBag, ShoppingCart, Search, Heart, Menu, SlidersHorizontal,
  Star, Globe, X, ChevronDown, MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ════════════════════════════════════════════════════════════
   TOKENS — mesma estrutura da referência; onde era azul entra
   um castanho fraco (dessaturado). Vermelho e verde mantêm-se,
   porque não são "azul".
   ════════════════════════════════════════════════════════════ */
const bg            = "#FAF5EE";
const surface       = "#FFFFFF";
const ink           = "#23150B";
const inkSoft       = "#7A6249";
const brand         = "#A9835C";   // substitui o azul principal
const brandDeep     = "#8F6C49";   // substitui o azul escuro (banner/botões)
const brandDarkest  = "#5E4730";   // substitui o azul-marinho do banner de aviso
const promo         = "#C23B2B";   // etiqueta "Promoção" (era "Rollback" vermelho)
const dealGreen     = "#1E7A3C";   // preço em promoção
const saveBg        = "#E3F2E6";
const gold          = "#C8932F";
const line          = "rgba(35,21,11,0.10)";
const lineSoft      = "rgba(35,21,11,0.06)";
const shadowSm      = "0 1px 3px rgba(35,21,11,0.08)";

const fontBody = "'Manrope', system-ui, sans-serif";

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
          savingsFormatted: originalPrice ? formatPrice(originalPrice - price) : null,
          image: coverMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
          discount: hasDiscount ? `-${p.discount_percent}%` : undefined,
          rating: p.rating || 0,
          reviews: p.total_reviews || 0,
        };
      });
    },
  });

/* ── Estilos globais ── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');

    .cgr-scroll::-webkit-scrollbar { display: none; }
    .cgr-chip { transition: border-color .15s ease, background .15s ease; }
    .cgr-chip:hover { border-color: ${brand} !important; }
    .cgr-icon-card { transition: transform .15s ease; }
    .cgr-icon-card:hover { transform: translateY(-2px); }
    .cgr-prod-card { transition: transform .15s ease, box-shadow .15s ease; }
    .cgr-prod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(35,21,11,0.14) !important; }
    .cgr-heart-btn:active { transform: scale(0.88); }
    .cgr-cta:active { transform: scale(0.97); }
    @keyframes cgr-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ── Estrelas de avaliação ── */
const RatingRow = ({ rating, reviews }: { rating: number; reviews: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
    <div style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: 12, height: 12 }}
          fill={i <= Math.round(rating) ? gold : "none"}
          stroke={i <= Math.round(rating) ? gold : "#C8BBA8"} strokeWidth={1.5} />
      ))}
    </div>
    {reviews > 0 && (
      <span style={{ fontFamily: fontBody, fontSize: 11, color: inkSoft, fontWeight: 600 }}>
        {reviews.toLocaleString("pt-AO")}
      </span>
    )}
  </div>
);

/* ── Cartão de categoria — formato "ícone de atalho" da referência ── */
const CategoryIconCard = ({ name, image, onClick, size = 84 }: { name: string; image: string; onClick: () => void; size?: number }) => (
  <button
    className="cgr-icon-card"
    onClick={onClick}
    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: size, flexShrink: 0 }}
  >
    <div style={{
      width: size, height: size, borderRadius: 16,
      background: "#EFE2CE", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {image
        ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <ShoppingBag style={{ width: 26, height: 26, color: brandDeep }} />}
    </div>
    <p style={{
      margin: "8px 0 0", fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: ink,
      lineHeight: 1.25, textAlign: "center",
      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
    }}>
      {name}
    </p>
  </button>
);

/* ── Cartão de produto — réplica 1:1 do formato da grelha (etiqueta, coração,
     botão, preço, título, avaliação) ── */
const ProductCard = ({ product, navigate, addToCart }: { product: any; navigate: any; addToCart: any }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="cgr-prod-card" style={{ width: 160, flexShrink: 0 }}>
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
            fontFamily: fontBody, fontSize: 11, fontWeight: 800,
            padding: "4px 10px", borderRadius: "0 6px 6px 0",
          }}>
            Promoção
          </span>
        )}

        <button
          className="cgr-heart-btn"
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
        className="cgr-cta"
        onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
        disabled={addToCart.isPending}
        style={{
          width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 22, border: "none", cursor: "pointer",
          background: brandDeep,
        }}
      >
        <span style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 800, color: surface }}>
          Adicionar
        </span>
      </button>

      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 700, color: ink }}>Agora</span>
          <span style={{ fontFamily: fontBody, fontSize: 18, fontWeight: 800, color: dealGreen, fontVariantNumeric: "tabular-nums" }}>
            {product.priceFormatted}
          </span>
        </div>
        {product.originalPriceFormatted && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
            <span style={{ fontFamily: fontBody, fontSize: 12, color: inkSoft, textDecoration: "line-through", fontWeight: 600 }}>
              {product.originalPriceFormatted}
            </span>
            {product.savingsFormatted && (
              <span style={{
                fontFamily: fontBody, fontSize: 10, fontWeight: 800, color: dealGreen,
                background: saveBg, borderRadius: 4, padding: "1px 6px",
              }}>
                Poupa {product.savingsFormatted}
              </span>
            )}
          </div>
        )}

        <p style={{
          margin: "6px 0 0", fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: ink,
          lineHeight: 1.32, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {product.title}
        </p>

        <RatingRow rating={product.rating} reviews={product.reviews} />
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════ */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();
  const { data: topProducts, isLoading: loadingProducts } = useTopProducts();
  const addToCart = useAddToCart();
  const [bannerOpen, setBannerOpen] = useState(true);

  const categories: any[] = useMemo(() => {
    const base = dbCategories && dbCategories.length > 0 ? dbCategories : null;
    if (base) {
      return base.map((c: any) => ({
        name: c.name,
        id: c.id,
        image: c.image_url || staticImages[c.name] || "",
      }));
    }
    return Object.keys(staticImages).map((name) => ({ name, id: null, image: staticImages[name] }));
  }, [dbCategories]);

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: fontBody }}>
      <GlobalStyle />

      {/* ── Cabeçalho ── */}
      <div style={{ background: brand, padding: "12px 14px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <Menu style={{ width: 22, height: 22, color: surface }} strokeWidth={2.2} />
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: surface,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ShoppingBag style={{ width: 16, height: 16, color: brandDeep }} strokeWidth={2.4} />
          </div>

          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "#F1E9DC", borderRadius: 24, padding: "10px 16px",
          }}>
            <span style={{ flex: 1, fontFamily: fontBody, fontSize: 14, color: "#8A7A63", fontWeight: 600 }}>
              Pesquisar no zangu
            </span>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: brandDeep,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Search style={{ width: 14, height: 14, color: surface }} strokeWidth={2.4} />
            </div>
          </div>

          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <ShoppingCart style={{ width: 23, height: 23, color: surface }} strokeWidth={2.2} />
            <span style={{
              position: "absolute", top: -6, right: -6,
              background: gold, color: ink, fontSize: 10, fontWeight: 800,
              width: 16, height: 16, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              0
            </span>
          </button>
        </div>

        {bannerOpen && (
          <div style={{
            background: brandDarkest, borderRadius: "10px 10px 0 0",
            margin: "0 -14px", padding: "12px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe style={{ width: 18, height: 18, color: surface, flexShrink: 0 }} strokeWidth={2} />
              <span style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: surface, lineHeight: 1.3 }}>
                Pagamento na entrega já disponível!
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: fontBody, fontSize: 12, fontWeight: 700, color: surface }}>
                <MapPin style={{ width: 14, height: 14 }} /> Luanda <ChevronDown style={{ width: 13, height: 13 }} />
              </span>
              <button onClick={() => setBannerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <X style={{ width: 16, height: 16, color: surface }} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}
        <div style={{ height: 12 }} />
      </div>

      {/* ── Categorias: faixa de atalhos ── */}
      <div style={{ background: surface, padding: "16px 14px" }}>
        <div className="cgr-scroll" style={{ display: "flex", gap: 18, overflowX: "auto", scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <CategoryIconCard
              key={cat.name}
              name={cat.name}
              image={cat.image}
              onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
            />
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: line }} />

      {/* ── Filtros rápidos ── */}
      <div className="cgr-scroll" style={{ display: "flex", gap: 8, padding: "12px 14px", background: surface, overflowX: "auto", scrollbarWidth: "none" }}>
        <button className="cgr-chip" style={{
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, background: surface, border: `1.5px solid ${line}`, borderRadius: "50%", cursor: "pointer",
        }}>
          <SlidersHorizontal style={{ width: 15, height: 15, color: brandDeep }} />
        </button>
        {["Lojas físicas", "Preço", "Marca", "Avaliação"].map((label) => (
          <button key={label} className="cgr-chip" style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
            background: surface, border: `1.5px solid ${line}`, borderRadius: 20,
            padding: "9px 14px", cursor: "pointer",
            fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: brandDeep,
          }}>
            {label} <ChevronDown style={{ width: 13, height: 13 }} />
          </button>
        ))}
      </div>

      <div style={{ height: 8, background: bg }} />

      {/* ── Campeões de Vendas ── */}
      <div style={{ background: surface, padding: "16px 14px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
            Campeões de Vendas
          </h2>
          <button
            onClick={() => navigate("/promocoes")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: ink, textDecoration: "underline" }}
          >
            Ver tudo
          </button>
        </div>

        {loadingProducts ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${line}`, borderTopColor: brand,
              animation: "cgr-spin 0.8s linear infinite",
            }} />
          </div>
        ) : (
          <div className="cgr-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {(topProducts || []).map((product: any) => (
              <ProductCard key={product.id} product={product} navigate={navigate} addToCart={addToCart} />
            ))}
            <div style={{ flexShrink: 0, width: 2 }} />
          </div>
        )}
      </div>

      <div style={{ height: 8, background: bg }} />

      {/* ── Todas as Categorias ── */}
      <div style={{ background: surface, padding: "16px 14px 24px" }}>
        <h2 style={{ margin: "0 0 14px", fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
          Todas as Categorias
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
          {categories.map((cat) => (
            <CategoryIconCard
              key={cat.name}
              name={cat.name}
              image={cat.image}
              size={72}
              onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
            />
          ))}
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
};

export default Categorias;
