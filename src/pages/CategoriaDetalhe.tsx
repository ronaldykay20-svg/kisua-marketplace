import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, Plus, X,
  ArrowLeft, CheckCircle, Store, Building2, Heart,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ════════════════════════════════════════════════════════════
   TOKENS — mesma identidade da página Categorias
   ════════════════════════════════════════════════════════════ */
const bg        = "#FAF5EE";
const surface   = "#FFFFFF";
const ink       = "#23150B";
const inkSoft   = "#7A6249";
const brand     = "#A9835C";
const brandDeep = "#8F6C49";
const promo     = "#C23B2B";
const dealGreen = "#1E7A3C";
const saveBg    = "#E3F2E6";
const gold      = "#C8932F";
const line      = "rgba(35,21,11,0.10)";
const lineSoft  = "rgba(35,21,11,0.06)";
const shadowSm  = "0 1px 3px rgba(35,21,11,0.08)";
const shadowMd  = "0 4px 16px rgba(35,21,11,0.10)";

const fontBody = "'Manrope', system-ui, sans-serif";

const subcategories: Record<string, string[]> = {
  "Electrónicos": ["Smartphones", "Tablets", "Computadores", "Áudio", "TV & Vídeo", "Câmeras", "Acessórios"],
  "Veículos": ["Carros", "Motas", "Peças", "Camiões", "Barcos"],
  "Imóveis": ["Apartamentos", "Moradias", "Terrenos", "Escritórios", "Armazéns"],
  "Moda": ["Feminino", "Masculino", "Calçado", "Acessórios", "Infantil"],
  "Casa & Jardim": ["Mobília", "Decoração", "Ferramentas", "Jardim", "Iluminação"],
  "Desporto": ["Fitness", "Futebol", "Natação", "Corrida", "Ciclismo"],
  "Bebé & Criança": ["Roupa", "Brinquedos", "Alimentação", "Higiene", "Móveis"],
  "Saúde & Beleza": ["Skincare", "Maquiagem", "Perfumes", "Cabelo", "Suplementos"],
  "Informática": ["Laptops", "Desktop", "Componentes", "Periféricos", "Redes"],
  "Gaming": ["Consolas", "Jogos", "Acessórios", "PC Gaming", "VR"],
  "Jóias & Relógios": ["Anéis", "Colares", "Relógios", "Pulseiras", "Brincos"],
  "Viagens": ["Pacotes", "Voos", "Hotéis", "Aluguer", "Excursões"],
  "Alimentação": ["Frescos", "Bebidas", "Congelados", "Mercearia", "Bio"],
  "Empregos": ["TI", "Saúde", "Educação", "Vendas", "Engenharia"],
  "Educação": ["Cursos", "Livros", "Material", "Explicações", "Online"],
  "Animais": ["Cães", "Gatos", "Aves", "Acessórios", "Alimentação"],
  "Drones": ["Câmara", "Corrida (FPV)", "Recreativo", "Profissional", "Peças e baterias"],
};

const colorOptions = [
  { name: "Preto",    hex: "#000000" },
  { name: "Branco",   hex: "#FFFFFF" },
  { name: "Rosa",     hex: "#EC4899" },
  { name: "Azul",     hex: "#3B82F6" },
  { name: "Cinza",    hex: "#6B7280" },
  { name: "Verde",    hex: "#22C55E" },
  { name: "Vermelho", hex: "#EF4444" },
  { name: "Amarelo",  hex: "#EAB308" },
  { name: "Cáqui",    hex: "#D97706" },
  { name: "Marrom",   hex: "#78350F" },
  { name: "Roxo",     hex: "#A855F7" },
  { name: "Laranja",  hex: "#F97316" },
];

const priceRanges = [
  { label: "Até 10.000 Kz",       min: 0,      max: 10000  },
  { label: "10.000 - 50.000 Kz",  min: 10000,  max: 50000  },
  { label: "50.000 - 200.000 Kz", min: 50000,  max: 200000 },
  { label: "200.000+",            min: 200000, max: Infinity },
];

const sortOptions = ["Recomendado", "Menor preço", "Maior preço", "Mais vendidos", "Mais recentes"];

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

const formatPrice = (n: number) => n.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

/* ── Hook: empresas e vendedores patrocinados pelo Admin — lê `ads`
     (type = "empresa" | "vendedor", is_active = true) e depois busca os
     dados reais em `companies` / `sellers`. Peço TODOS os campos de imagem
     plausíveis (logo_url, cover_url, avatar_url, image_url) e uso o
     primeiro que vier preenchido — corrige o caso da imagem não aparecer
     quando a coluna usada na tua base não era a que eu assumia. ── */
const useSponsoredEntities = () =>
  useQuery({
    queryKey: ["sponsored_entities_strip"],
    queryFn: async () => {
      const { data: adsData, error: adsError } = await (supabase as any)
        .from("ads")
        .select("type, ref_id, created_at")
        .in("type", ["empresa", "vendedor"])
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (adsError) throw adsError;

      const companyIds = [...new Set((adsData || []).filter((a: any) => a.type === "empresa").map((a: any) => a.ref_id).filter(Boolean))];
      const sellerIds  = [...new Set((adsData || []).filter((a: any) => a.type === "vendedor").map((a: any) => a.ref_id).filter(Boolean))];

      let companiesData: any[] = [];
      let sellersData: any[] = [];

      if (companyIds.length > 0) {
        const { data } = await (supabase as any)
          .from("companies")
          .select("*")
          .in("id", companyIds)
          .eq("is_active", true);
        companiesData = data || [];
      }
      if (sellerIds.length > 0) {
        const { data } = await (supabase as any)
          .from("sellers")
          .select("*")
          .in("id", sellerIds)
          .eq("is_active", true);
        sellersData = data || [];
      }

      const companyById: Record<string, any> = {};
      companiesData.forEach((c) => { companyById[c.id] = c; });
      const sellerById: Record<string, any> = {};
      sellersData.forEach((s) => { sellerById[s.id] = s; });

      const pickImage = (obj: any, keys: string[]) => {
        for (const k of keys) if (obj?.[k]) return obj[k];
        return null;
      };

      const seen = new Set<string>();
      const list: any[] = [];
      (adsData || []).forEach((a: any) => {
        const key = `${a.type}:${a.ref_id}`;
        if (seen.has(key)) return;
        if (a.type === "empresa" && companyById[a.ref_id]) {
          const c = companyById[a.ref_id];
          seen.add(key);
          list.push({
            kind: "empresa",
            id: c.id,
            name: c.name,
            image: pickImage(c, ["logo_url", "cover_url", "image_url", "avatar_url", "photo_url"]),
            description: c.description || null,
            verified: !!c.is_verified,
            link: `/empresa/${c.id}`,
          });
        } else if (a.type === "vendedor" && sellerById[a.ref_id]) {
          const s = sellerById[a.ref_id];
          seen.add(key);
          list.push({
            kind: "vendedor",
            id: s.id,
            name: s.name,
            image: pickImage(s, ["avatar_url", "logo_url", "image_url", "cover_url", "photo_url"]),
            description: s.description || null,
            verified: !!s.is_verified,
            link: `/vendedor/${s.id}`,
          });
        }
      });

      return list;
    },
  });

/* ── Hook: produtos da categoria ── */
const useCategoryProducts = (categoryId: string | undefined, sortBy: string) =>
  useQuery({
    queryKey: ["category_products", categoryId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_media(url, is_cover), product_variants(variant_type, value, name)")
        .eq("is_active", true);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (sortBy === "Menor preço") query = query.order("price", { ascending: true });
      else if (sortBy === "Maior preço") query = query.order("price", { ascending: false });
      else if (sortBy === "Mais vendidos") query = query.order("sales_count", { ascending: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryId,
  });

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800;900&display=swap');
    .cd-scroll::-webkit-scrollbar { display: none; }
    .cd-prod-card { transition: transform .15s ease, box-shadow .15s ease; }
    .cd-prod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(35,21,11,0.14) !important; }
    .cd-cart-btn:active { transform: scale(0.97); }
    .cd-heart-btn:active { transform: scale(0.88); }
    .cd-sub-btn { transition: background .15s ease; }
    .cd-chip { transition: border-color .15s ease, background .15s ease; }
    .cd-product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(148px, 190px));
      gap: 14px 12px;
      justify-content: start;
    }
    @keyframes cd-spin { to { transform: rotate(360deg); } }
  `}</style>
);

/* ── Faixa "Acompanhe Empresas Confiáveis" ── */
const TrustedEntitiesStrip = ({ navigate }: { navigate: any }) => {
  const { data: entities, isLoading } = useSponsoredEntities();
  if (isLoading || !entities || entities.length === 0) return null;

  return (
    <div style={{ background: surface, borderBottom: `1px solid ${line}`, padding: "14px 0" }}>
      <div style={{ padding: "0 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
        <CheckCircle style={{ width: 14, height: 14, color: brandDeep }} strokeWidth={2.4} />
        <span style={{ fontFamily: fontBody, fontSize: 12.5, fontWeight: 800, color: inkSoft, letterSpacing: 0.2 }}>
          Acompanhe Empresas Confiáveis
        </span>
      </div>
      <div className="cd-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 14px", scrollbarWidth: "none" }}>
        {entities.map((e: any) => (
          <button
            key={`${e.kind}-${e.id}`}
            onClick={() => navigate(e.link)}
            style={{
              flexShrink: 0, width: 176, display: "flex", alignItems: "center", gap: 10,
              background: bg, border: `1px solid ${line}`, borderRadius: 14,
              padding: "9px 10px", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: e.kind === "empresa" ? 10 : "50%",
              overflow: "hidden", flexShrink: 0, background: "#EFE2CE",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${line}`,
            }}>
              {e.image
                ? <img src={e.image} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (e.kind === "empresa"
                  ? <Building2 style={{ width: 18, height: 18, color: brandDeep }} />
                  : <Store style={{ width: 18, height: 18, color: brandDeep }} />)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                  fontFamily: fontBody, fontSize: 12, fontWeight: 800, color: ink,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 105,
                }}>
                  {e.name}
                </span>
                {e.verified && <CheckCircle style={{ width: 11, height: 11, color: brandDeep, flexShrink: 0 }} />}
              </div>
              <p style={{
                margin: "1px 0 0", fontFamily: fontBody, fontSize: 9.5, color: inkSoft, fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {e.description || (e.kind === "empresa" ? "Empresa parceira" : "Vendedor parceiro")}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Estrelas ── */
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

/* ── Cartão de produto — densidade Walmart, igual ao usado em Categorias ── */
const ProductCard = ({ product, navigate, addToCart }: { product: any; navigate: any; addToCart: any }) => {
  const [liked, setLiked] = useState(false);

  return (
    <div className="cd-prod-card" style={{ width: "100%" }}>
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
          className="cd-heart-btn"
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
        className="cd-cart-btn"
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

const CategoriaDetalhe = () => {
  const { nome } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(nome || "");
  const [sortBy, setSortBy] = useState("Recomendado");
  const [showSort, setShowSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const addToCart = useAddToCart();

  const { data: dbCategories } = useCategories();
  const category = (dbCategories || []).find((c: any) => c.name === categoryName);
  const categoryId = category?.id;

  const { data: dbProducts, isLoading } = useCategoryProducts(categoryId, sortBy);

  const allProducts = useMemo(() =>
    (dbProducts || []).map((p: any) => {
      const cover = p.product_media?.find((m: any) => m.is_cover)?.url
        || p.image_url
        || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";

      const productColorHexes: string[] = (p.product_variants || [])
        .filter((v: any) => v.variant_type === "color" && v.value)
        .map((v: any) => v.value as string);

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
        colorHexes: productColorHexes,
        subcategory: p.subcategory || null,
      };
    }),
  [dbProducts]);

  const products = useMemo(() => {
    let list = allProducts;
    if (selectedSub) list = list.filter((p) => p.subcategory === selectedSub);
    if (selectedColors.length > 0) {
      list = list.filter((p) => {
        if (p.colorHexes.length === 0) return false;
        return selectedColors.some((colorName) => {
          const filterHex = colorOptions.find((c) => c.name === colorName)?.hex;
          if (!filterHex) return false;
          return p.colorHexes.some((h: string) => hexClose(h, filterHex));
        });
      });
    }
    if (selectedPrice) {
      const range = priceRanges.find((r) => r.label === selectedPrice);
      if (range) list = list.filter((p) => p.price >= range.min && p.price < range.max);
    }
    return list;
  }, [allProducts, selectedColors, selectedPrice, selectedSub]);

  const subs = subcategories[categoryName] || [];
  const toggleColor = (c: string) =>
    setSelectedColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const activeFiltersCount = (selectedSub ? 1 : 0) + selectedColors.length + (selectedPrice ? 1 : 0);
  const clearFilters = () => { setSelectedSub(null); setSelectedColors([]); setSelectedPrice(null); };

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

      {subs.length > 0 && (
        <div>
          <h3 style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: inkSoft, margin: "0 0 8px" }}>
            Subcategoria
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {subs.map((sub) => {
              const active = selectedSub === sub;
              return (
                <button
                  key={sub}
                  className="cd-sub-btn"
                  onClick={() => setSelectedSub(active ? null : sub)}
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
                      {sub}
                    </span>
                  </span>
                  <Plus style={{ width: 12, height: 12, color: brandDeep }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, color: inkSoft, margin: "0 0 8px" }}>
          Cor
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
          {colorOptions.map((c) => {
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
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: bg, fontFamily: fontBody, paddingBottom: 56 }}>
      <GlobalStyle />

      {/* ── Faixa de contexto removida por pedido do utilizador ── */}

      {/* ── Empresas / vendedores patrocinados ── */}
      <TrustedEntitiesStrip navigate={navigate} />

      {/* ── Subcategorias — chips horizontais ── */}
      {subs.length > 0 && (
        <div className="cd-scroll" style={{ display: "flex", gap: 8, padding: "12px 14px", background: surface, overflowX: "auto", scrollbarWidth: "none", borderBottom: `1px solid ${line}` }}>
          {subs.map((sub) => {
            const active = selectedSub === sub;
            return (
              <button
                key={sub}
                className="cd-chip"
                onClick={() => setSelectedSub(active ? null : sub)}
                style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                  background: active ? brandDeep : surface,
                  border: `1.5px solid ${active ? brandDeep : line}`,
                  fontFamily: fontBody, fontSize: 12.5, fontWeight: 700,
                  color: active ? surface : brandDeep,
                }}
              >
                {sub}
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

      {/* ── Drawer de filtros (mobile) ── */}
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
                animation: "cd-spin 0.8s linear infinite",
              }} />
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: inkSoft }}>
                {products.length} resultado{products.length !== 1 ? "s" : ""} em "{categoryName}"
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} style={{
                    marginLeft: 8, background: "none", border: "none", cursor: "pointer",
                    fontFamily: fontBody, fontSize: 12, color: brandDeep, textDecoration: "underline", fontWeight: 700,
                  }}>
                    limpar filtros
                  </button>
                )}
              </p>

              {products.length === 0 ? (
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
                <div className="cd-product-grid">
                  {products.map((p: any) => <ProductCard key={p.id} product={p} navigate={navigate} addToCart={addToCart} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriaDetalhe;
