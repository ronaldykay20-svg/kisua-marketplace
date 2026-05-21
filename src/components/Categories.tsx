import { useState, useMemo } from "react";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ── Paleta ── */
const bg          = "#F5F0EA";
const white       = "#FFFFFF";
const sand        = "#D4B896";
const sandDark    = "#B8956A";
const brown       = "#4A2E0A";
const brownBorder = "rgba(74,46,10,0.12)";
const brownLight  = "rgba(74,46,10,0.07)";
const brownMid    = "rgba(74,46,10,0.18)";

/* ── Helpers ── */
const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

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

/* ── Card de produto — formato quadrado ── */
const ProductCard = ({ product, rank, isTablet }: { product: any; rank: number; isTablet: boolean }) => {
  const navigate = useNavigate();
  const addToCart = useAddToCart();

  const medalColor =
    rank === 1 ? "#FFD700" :
    rank === 2 ? "#C0C0C0" :
    rank === 3 ? "#CD7F32" : null;

  const cartSize = isTablet ? 32 : 28;
  const iconSize = isTablet ? 15 : 13;

  return (
    <div style={{
      position: "relative",
      flexShrink: 0,
      /* largura ligeiramente maior para dar espaço ao card quadrado */
      width: isTablet ? "calc((100vw - 60px) / 6)" : "calc((100vw - 120px) / 2.6)",
    }}>
      {/* Medalha top 3 */}
      {medalColor && (
        <div style={{
          position: "absolute", top: -7, right: -7, zIndex: 10,
          width: 22, height: 22, borderRadius: "50%",
          background: medalColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 900, color: white,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          border: "2px solid white",
        }}>
          {rank}
        </div>
      )}

      <div style={{
        background: white,
        borderRadius: 12,
        border: `1.5px solid ${brownMid}`,
        boxShadow: "0 2px 10px rgba(74,46,10,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Imagem quadrada clicável */}
        <button
          style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          onClick={() => navigate(`/produto/${product.id}`)}
        >
          <div style={{
            position: "relative",
            width: "100%",
            /* ← QUADRADO: era "3/4", agora "1/1" */
            aspectRatio: "1 / 1",
            overflow: "hidden",
            background: bg,
          }}>
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {product.discount && (
              <span style={{
                position: "absolute", top: 6, left: 6,
                background: "#E53935", color: white,
                fontSize: 9, fontWeight: 800,
                padding: "2px 6px", borderRadius: 20,
              }}>
                {product.discount}
              </span>
            )}
          </div>
        </button>

        {/* Rodapé: preço + carrinho */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 8px",
          background: white,
        }}>
          <span style={{
            fontSize: isTablet ? 11 : 10,
            fontWeight: 800,
            color: brown,
            flex: 1,
            lineHeight: 1.2,
            /* evitar texto muito comprido */
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {product.priceFormatted}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: product.id, quantity: 1 }); }}
            disabled={addToCart.isPending}
            style={{
              width: cartSize, height: cartSize,
              borderRadius: 8, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${sandDark}, ${sand})`,
              boxShadow: "0 2px 6px rgba(74,46,10,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShoppingCart style={{ width: iconSize, height: iconSize, color: white }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════ */
const Categorias = () => {
  const navigate = useNavigate();
  /* useCategories já devolve os dados reais do Supabase (id, name, image_url, cover_url, product_count) */
  const { data: dbCategories, isLoading: loadingCategories } = useCategories();
  const { data: topProducts, isLoading: loadingProducts } = useTopProducts();
  const isTablet = useIsTablet();

  /*
   * Mapear apenas as categorias que vieram da base de dados.
   * Não existe mais fallback para staticImages / coverImages hardcoded.
   * Se a categoria não tiver imagem configurada no admin, mostra o ícone padrão.
   */
  const categories: any[] = useMemo(() => {
    if (!dbCategories || dbCategories.length === 0) return [];
    return dbCategories.map((c: any) => ({
      name:  c.name,
      id:    c.id,
      /* image_url = ícone/thumbnail definido no painel admin */
      image: c.image_url || null,
      /* cover_url = imagem de capa definida no painel admin */
      cover: c.cover_url || c.image_url || null,
      count: c.product_count ?? null,
    }));
  }, [dbCategories]);

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>

      {/* ── Pesquisa ── */}
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: white, border: `1px solid ${brownBorder}`,
          borderRadius: 14, padding: "10px 14px",
          boxShadow: "0 1px 4px rgba(74,46,10,0.06)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={sandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Pesquisar categorias..."
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: brown }}
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
        boxShadow: "0 2px 12px rgba(74,46,10,0.08)",
        border: `1px solid ${brownBorder}`,
      }}>
        {/* Sidebar */}
        <aside style={{
          width: 100, flexShrink: 0,
          background: bg, borderRight: `1px solid ${brownBorder}`,
          overflowY: "auto", maxHeight: "calc(100vh - 160px)",
        }}>
          {/* Botão "Todas" */}
          <button
            onClick={() => navigate("/categorias")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              padding: "13px 8px", cursor: "pointer",
              background: white,
              borderLeft: `3px solid ${sandDark}`,
              borderRight: "none", borderTop: "none",
              borderBottom: `1px solid ${brownBorder}`,
            }}
          >
            <span style={{ fontSize: 11, textAlign: "center", color: sandDark, fontWeight: 800 }}>
              Todas
            </span>
          </button>

          {/* Categorias vindas do Supabase */}
          {loadingCategories ? (
            <div style={{ padding: 12, display: "flex", justifyContent: "center" }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `2px solid ${brownBorder}`, borderTopColor: sandDark,
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          ) : (
            categories.map((cat: any) => (
              <button
                key={cat.id || cat.name}
                onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "13px 8px", cursor: "pointer",
                  background: "transparent",
                  borderLeft: `3px solid transparent`,
                  borderRight: "none", borderTop: "none",
                  borderBottom: `1px solid ${brownBorder}`,
                }}
              >
                <span style={{
                  fontSize: 11, textAlign: "center", lineHeight: 1.3,
                  wordBreak: "break-word", color: brown, fontWeight: 500,
                }}>
                  {cat.name}
                </span>
              </button>
            ))
          )}
        </aside>

        {/* Grelha 3 colunas */}
        <div style={{ flex: 1, padding: "14px 10px", background: white, minWidth: 0 }}>
          <h2 style={{ color: brown, fontSize: 15, fontWeight: 800, margin: "0 0 12px" }}>
            Todas as Categorias
          </h2>

          {loadingCategories ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: `3px solid ${brownBorder}`, borderTopColor: sandDark,
                animation: "spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : categories.length === 0 ? (
            <p style={{ fontSize: 12, color: sandDark, textAlign: "center", padding: "20px 0" }}>
              Nenhuma categoria encontrada.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {categories.map((cat: any) => (
                <button
                  key={cat.id || cat.name}
                  onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                  style={{
                    display: "flex", flexDirection: "column",
                    background: white, border: `1px solid ${brownBorder}`,
                    borderRadius: 16, overflow: "hidden",
                    cursor: "pointer", padding: 0, textAlign: "left",
                    boxShadow: "0 2px 8px rgba(74,46,10,0.07)",
                  }}
                >
                  {/* Imagem de capa (cover_url do admin) */}
                  <div style={{ width: "100%", aspectRatio: "1/0.68", position: "relative", overflow: "hidden" }}>
                    {cat.cover ? (
                      <img
                        src={cat.cover}
                        alt={cat.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%", background: brownLight,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <ShoppingBag style={{ width: 24, height: 24, color: sandDark }} />
                      </div>
                    )}

                    {/* Thumbnail/ícone sobreposto (image_url do admin) */}
                    {cat.image && (
                      <div style={{
                        position: "absolute", bottom: -12, left: 8,
                        width: 28, height: 28, borderRadius: "50%",
                        overflow: "hidden", border: "2.5px solid white",
                        boxShadow: "0 1px 5px rgba(74,46,10,0.2)",
                      }}>
                        <img src={cat.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                  </div>

                  {/* Nome + contagem */}
                  <div style={{ padding: cat.image ? "18px 8px 10px" : "10px 8px" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: brown, lineHeight: 1.25 }}>
                      {cat.name}
                    </p>
                    {cat.count !== null && (
                      <p style={{ margin: "2px 0 0", fontSize: 9, color: sandDark, fontWeight: 500 }}>
                        {cat.count.toLocaleString("pt-AO")} itens
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Ofertas Imperdíveis ── */}
      <div style={{
        margin: "12px 10px 0", padding: "14px 16px",
        background: brown, borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: sandDark,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: white }}>Ofertas Imperdíveis</p>
            <p style={{ margin: 0, fontSize: 10, color: sand }}>Descontos exclusivos por tempo limitado!</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/promocoes")}
          style={{
            background: sandDark, color: white, border: "none",
            borderRadius: 10, padding: "8px 14px",
            fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          Ver ofertas
        </button>
      </div>

      {/* ── Campeões de Vendas: Top 12 ── */}
      <div style={{ margin: "16px 10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #F5A623, #E8860A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(245,166,35,0.35)",
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: brown }}>Campeões de Vendas</h3>
            <p style={{ margin: 0, fontSize: 10, color: sandDark }}>Os produtos mais bem avaliados</p>
          </div>
        </div>

        {loadingProducts ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${brownBorder}`, borderTopColor: sandDark,
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div
            className="products-scroll"
            style={{
              display: "flex", flexDirection: "row", gap: 10,
              overflowX: "auto", overflowY: "visible",
              paddingBottom: 8, paddingTop: 10,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}
          >
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              .products-scroll::-webkit-scrollbar { display: none; }
            `}</style>
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
