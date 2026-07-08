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
import {
  ProductBrowser, ProductBrowserGlobalStyle, BrowserProduct,
  bg, surface, ink, inkSoft, brand, brandDeep, promo, dealGreen, saveBg, gold, line, shadowSm,
  fontBody, formatPrice,
} from "@/components/category/ProductBrowser";

/* ════════════════════════════════════════════════════════════
   Tokens partilhados com CategoriaDetalhe.tsx vêm agora de
   ProductBrowser.tsx — mudar lá muda as duas páginas juntas.
   ════════════════════════════════════════════════════════════ */

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

/* ── Hook: todos os produtos activos do site, para a mesma estrutura de
     grelha + filtros + ordenação da CategoriaDetalhe.tsx. Limitado a 200
     por chamada — buscar o catálogo inteiro sem limite fica lento à medida
     que o site cresce; os filtros/ordenação continuam a funcionar dentro
     deste lote. ── */
const useAllProducts = () =>
  useQuery({
    queryKey: ["all_products_browser"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_media(url, is_cover), product_variants(variant_type, value, name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

/* ── Estilos globais ── */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');

    .cgr-scroll::-webkit-scrollbar { display: none; }
    .cgr-chip { transition: border-color .15s ease, background .15s ease; }
    .cgr-chip:hover { border-color: ${brand} !important; }
    .cgr-prod-card { transition: transform .15s ease, box-shadow .15s ease; }
    .cgr-prod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(35,21,11,0.14) !important; }
    .cgr-heart-btn:active { transform: scale(0.88); }
    .cgr-cta:active { transform: scale(0.97); }
    @keyframes cgr-spin { to { transform: rotate(360deg); } }

    /* ── Grelha de categorias (estilo "departamentos") ── */
    .cgr-cat-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px 10px;
    }
    @media (min-width: 480px)  { .cgr-cat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (min-width: 700px)  { .cgr-cat-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    @media (min-width: 1000px) { .cgr-cat-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 24px 14px; } }
    @media (min-width: 1300px) { .cgr-cat-grid { grid-template-columns: repeat(10, minmax(0, 1fr)); } }

    .cgr-cat-tile { transition: transform .18s ease; }
    .cgr-cat-tile:hover { transform: translateY(-3px); }
    .cgr-cat-tile:hover .cgr-cat-ring { border-color: ${brand} !important; box-shadow: 0 6px 16px rgba(169,131,92,0.30); }
    .cgr-cat-tile:hover .cgr-cat-img { transform: scale(1.08); }
    .cgr-cat-tile:hover .cgr-cat-label { color: ${brandDeep} !important; }
    .cgr-cat-img { transition: transform .25s ease; }
    .cgr-cat-ring { transition: border-color .18s ease, box-shadow .18s ease; }
    .cgr-cat-tile:focus-visible .cgr-cat-ring { outline: 2px solid ${brand}; outline-offset: 3px; }
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

/* ── Paleta de fundos suaves para os azulejos de categoria — variações
     tonais dentro da própria identidade da marca (nunca cores soltas),
     para dar variedade visual sem fugir do tom creme/castanho do site ── */
const catTints = ["#F3E7D3", "#F1E6EA", "#E8EFE4", "#E4ECF1", "#F6E9DC", "#EEE6F2", "#EAEFE9", "#F2E5E0"];

/* ── Cartão de categoria — azulejo em grelha, ícone circular colorido
     + nome por baixo. Substitui a antiga tira horizontal a rolar. ── */
const CategoryTile = ({ name, image, onClick, index }: { name: string; image: string; onClick: () => void; index: number }) => (
  <button
    className="cgr-cat-tile"
    onClick={onClick}
    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%" }}
  >
    <div
      className="cgr-cat-ring"
      style={{
        width: "100%", aspectRatio: "1/1", maxWidth: 96, margin: "0 auto",
        borderRadius: "50%", border: "2px solid transparent",
        background: catTints[index % catTints.length],
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: shadowSm,
      }}
    >
      {image
        ? <img className="cgr-cat-img" src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <ShoppingBag style={{ width: 28, height: 28, color: brandDeep }} />}
    </div>
    <p
      className="cgr-cat-label"
      style={{
        margin: "10px 0 0", fontFamily: fontBody, fontSize: 12.5, fontWeight: 700, color: ink,
        lineHeight: 1.25, textAlign: "center", letterSpacing: -0.1,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}
    >
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
  const { data: dbAllProducts, isLoading: loadingAllProducts } = useAllProducts();
  const addToCart = useAddToCart();

  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (dbCategories || []).forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [dbCategories]);

  const allProductsForBrowser: BrowserProduct[] = useMemo(() =>
    (dbAllProducts || []).map((p: any) => {
      const cover = p.product_media?.find((m: any) => m.is_cover)?.url
        || p.image_url
        || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";

      const colors = (p.product_variants || [])
        .filter((v: any) => v.variant_type === "color" && v.value)
        .map((v: any) => ({ name: (v.name && String(v.name).trim()) || v.value, hex: v.value as string }));

      const price = Number(p.price);
      const oldPriceNum = p.old_price ? Number(p.old_price) : null;

      return {
        id: p.id,
        title: p.title,
        price,
        priceFormatted: formatPrice(price),
        oldPriceFormatted: oldPriceNum ? formatPrice(oldPriceNum) : undefined,
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        image: cover,
        rating: p.rating || 0,
        reviews: p.total_reviews || 0,
        freeShipping: p.free_shipping,
        salesCount: p.sales_count || 0,
        colors,
        groupLabel: (p.category_id && categoryNameById[p.category_id]) || null,
      };
    }),
  [dbAllProducts, categoryNameById]);

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

  const top12Ranking = (rankingProducts || []).slice(0, 12);

  return (
    <div style={{ background: bg, minHeight: "100vh", fontFamily: fontBody }}>
      <GlobalStyle />

      {/* Cabeçalho removido — o site já usa o Navbar global no topo */}


      {/* ── Categorias: grelha de departamentos ── */}
      <div style={{ background: surface, padding: "20px 14px 22px" }}>
        <h2 style={{ margin: "0 0 16px", fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
          Categorias
        </h2>
        <div className="cgr-cat-grid">
          {categories.map((cat, i) => (
            <CategoryTile
              key={cat.name}
              name={cat.name}
              image={cat.image}
              index={i}
              onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
            />
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: line }} />

      {/* Filtros reais agora vivem dentro do ProductBrowser, mais abaixo
          ("Todos os Produtos") — partilhados com a página de categoria. */}



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

      {/* ── Catálogo completo — mesma estrutura partilhada com
           CategoriaDetalhe.tsx: chips + ordenação + filtros + grelha.
           Ver src/components/category/ProductBrowser.tsx ── */}
      <ProductBrowserGlobalStyle />
      <div style={{ background: surface, padding: "16px 0 0" }}>
        <h2 style={{ margin: "0 14px 0", fontFamily: fontBody, fontSize: 21, fontWeight: 800, color: ink, letterSpacing: -0.3 }}>
          Todos os Produtos
        </h2>
        <ProductBrowser
          products={allProductsForBrowser}
          isLoading={loadingAllProducts}
          groupFilterLabel="Categoria"
          resultsContext="em todo o catálogo"
          navigate={navigate}
          addToCart={addToCart}
        />
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
};

export default Categorias;
