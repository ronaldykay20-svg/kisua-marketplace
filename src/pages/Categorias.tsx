import { useState, useMemo } from "react";
import {
  ShoppingBag, Heart, Star, Megaphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";
import { useProductRanking } from "@/hooks/useSalesCount";

/* ════════════════════════════════════════════════════════════
   TOKENS
   ════════════════════════════════════════════════════════════ */
const bg            = "#FAF5EE";
const surface       = "#FFFFFF";
const ink           = "#23150B";
const inkSoft       = "#7A6249";
const brand         = "#A9835C";
const brandDeep     = "#8F6C49";
const brandDarkest  = "#5E4730";
const promo         = "#C23B2B";
const dealGreen     = "#1E7A3C";
const saveBg        = "#E3F2E6";
const gold          = "#C8932F";
const line          = "rgba(35,21,11,0.10)";
const shadowSm      = "0 1px 3px rgba(35,21,11,0.08)";

const fontBody = "'Manrope', system-ui, sans-serif";

/* ── Helpers ── */
const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

/* ── Imagens fallback para categorias ── */
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
  "Educação":        "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=200&h=200&fit=crop",
  "Animais":         "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop",
};

/* ── Hook: produtos patrocinados — vem diretamente da tabela `ads`
     (type = "produto", is_active = true), exatamente o que o
     AdminAdsTab do painel escreve quando o Admin patrocina um produto ── */
const useSponsoredProducts = () =>
  useQuery({
    queryKey: ["sponsored_products"],
    queryFn: async () => {
      const { data: adsData, error: adsError } = await (supabase as any)
        .from("ads")
        .select("ref_id, created_at")
        .eq("type", "produto")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (adsError) throw adsError;

      const refIds = [...new Set((adsData || []).map((a: any) => a.ref_id).filter(Boolean))];
      if (refIds.length === 0) return [];

      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("*")
        .in("id", refIds)
        .eq("is_active", true);
      if (prodError) throw prodError;

      const productIds = (productsData || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: mediaData } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (mediaData || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      // mantém a ordem de patrocínio (mais recente primeiro)
      const order = (adsData || []).map((a: any) => a.ref_id);
      const byId: Record<string, any> = {};
      (productsData || []).forEach((p: any) => { byId[p.id] = p; });

      return order
        .map((id: string) => byId[id])
        .filter(Boolean)
        .map((p: any) => {
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
    .cgr-cat-carousel {
      display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
    }
    .cgr-cat-carousel::-webkit-scrollbar { display: none; }
    .cgr-cat-slide { scroll-snap-align: start; }
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

/* ── Cartão de categoria — formato "ícone de atalho" ── */
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

/* ── Cartão de produto — usado tanto para Campeões de Vendas (dados reais
     do ranking, sem inventar desconto/avaliação que o ranking não tem)
     como para Produtos Patrocinados (dados completos da tabela products) ── */
const ProductCard = ({
  id, title, image, priceFormatted, originalPriceFormatted, savingsFormatted,
  discount, rating, reviews, salesLabel, navigate, addToCart,
}: {
  id: string; title: string; image: string; priceFormatted: string;
  originalPriceFormatted?: string | null; savingsFormatted?: string | null;
  discount?: string; rating?: number; reviews?: number; salesLabel?: number;
  navigate: any; addToCart: any;
}) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="cgr-prod-card" style={{ width: 160, flexShrink: 0 }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => navigate(`/produto/${id}`)}
          style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div style={{
            width: "100%", aspectRatio: "1/1", borderRadius: 12, overflow: "hidden",
            background: surface, border: `1px solid ${line}`,
          }}>
            <img src={image} alt={title} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </button>

        {discount && (
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
        onClick={() => addToCart.mutate({ productId: id, quantity: 1 })}
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
            {priceFormatted}
          </span>
        </div>
        {originalPriceFormatted && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
            <span style={{ fontFamily: fontBody, fontSize: 12, color: inkSoft, textDecoration: "line-through", fontWeight: 600 }}>
              {originalPriceFormatted}
            </span>
            {savingsFormatted && (
              <span style={{
                fontFamily: fontBody, fontSize: 10, fontWeight: 800, color: dealGreen,
                background: saveBg, borderRadius: 4, padding: "1px 6px",
              }}>
                Poupa {savingsFormatted}
              </span>
            )}
          </div>
        )}

        <p style={{
          margin: "6px 0 0", fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: ink,
          lineHeight: 1.32, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {title}
        </p>

        {/* Campeões de Vendas mostra vendas reais do ranking; produtos com
            dados completos (patrocinados) mostram avaliação real */}
        {typeof salesLabel === "number"
          ? (
            <p style={{ margin: "4px 0 0", fontFamily: fontBody, fontSize: 11, fontWeight: 700, color: inkSoft }}>
              {salesLabel.toLocaleString("pt-AO")} vendas
            </p>
          )
          : (rating !== undefined && reviews !== undefined && <RatingRow rating={rating} reviews={reviews} />)
        }
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════ */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();
  const { data: rankingProducts, isLoading: loadingRanking } = useProductRanking();
  const { data: sponsoredProducts, isLoading: loadingSponsored } = useSponsoredProducts();
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

  // agrupa as categorias em blocos de 4 para o carrossel arrastável
  const categoryPages = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < categories.length; i += 4) pages.push(categories.slice(i, i + 4));
    return pages;
  }, [categories]);

  const top12Ranking = (rankingProducts || []).slice(0, 12);

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: fontBody }}>
      <GlobalStyle />

      {/* Cabeçalho removido — o site já usa o Navbar global no topo */}


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

      {/* Filtros fictícios removidos — filtros reais estão na página de detalhe da categoria */}



      {/* ── Campeões de Vendas — dados reais do ranking, mesmo hook do /ranking ── */}
      <div style={{ background: surface, padding: "16px 14px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
            Campeões de Vendas
          </h2>
          <button
            onClick={() => navigate("/ranking")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: ink, textDecoration: "underline" }}
          >
            Ver tudo
          </button>
        </div>

        {loadingRanking ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${line}`, borderTopColor: brand,
              animation: "cgr-spin 0.8s linear infinite",
            }} />
          </div>
        ) : top12Ranking.length === 0 ? (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: inkSoft, textAlign: "center", padding: "20px 0" }}>
            Ainda sem dados de ranking.
          </p>
        ) : (
          <div className="cgr-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {top12Ranking.map((item: any) => (
              <ProductCard
                key={item.id}
                id={item.id}
                title={item.name || item.title || ""}
                image={item.image_url || item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop"}
                priceFormatted={item.price ? formatPrice(Number(item.price)) : "—"}
                salesLabel={item.sales ?? 0}
                navigate={navigate}
                addToCart={addToCart}
              />
            ))}
            <div style={{ flexShrink: 0, width: 2 }} />
          </div>
        )}
      </div>

      <div style={{ height: 8, background: bg }} />

      {/* ── Produtos Patrocinados — vem da tabela `ads` que o Admin alimenta
           no painel (Publicidade → Produto patrocinado) ── */}
      {(loadingSponsored || (sponsoredProducts && sponsoredProducts.length > 0)) && (
        <>
          <div style={{ background: surface, padding: "16px 14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Megaphone style={{ width: 18, height: 18, color: brandDeep }} strokeWidth={2.2} />
              <h2 style={{ margin: 0, fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
                Produtos Patrocinados
              </h2>
            </div>

            {loadingSponsored ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  border: `3px solid ${line}`, borderTopColor: brand,
                  animation: "cgr-spin 0.8s linear infinite",
                }} />
              </div>
            ) : (
              <div className="cgr-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
                {(sponsoredProducts || []).map((p: any) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    image={p.image}
                    priceFormatted={p.priceFormatted}
                    originalPriceFormatted={p.originalPriceFormatted}
                    savingsFormatted={p.savingsFormatted}
                    discount={p.discount}
                    rating={p.rating}
                    reviews={p.reviews}
                    navigate={navigate}
                    addToCart={addToCart}
                  />
                ))}
                <div style={{ flexShrink: 0, width: 2 }} />
              </div>
            )}
          </div>
          <div style={{ height: 8, background: bg }} />
        </>
      )}

      {/* ── Todas as Categorias — carrossel arrastável, 4 por página ── */}
      <div style={{ background: surface, padding: "16px 14px 24px" }}>
        <h2 style={{ margin: "0 0 14px", fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
          Todas as Categorias
        </h2>
        <div className="cgr-cat-carousel">
          {categoryPages.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="cgr-cat-slide"
              style={{
                flex: "0 0 100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14, paddingRight: 4,
              }}
            >
              {page.map((cat: any) => (
                <CategoryIconCard
                  key={cat.name}
                  name={cat.name}
                  image={cat.image}
                  size={72}
                  onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                />
              ))}
            </div>
          ))}
        </div>
        {categoryPages.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 12 }}>
            {categoryPages.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? brandDeep : line }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
};

export default Categorias;
