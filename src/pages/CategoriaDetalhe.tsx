import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Store, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";
import {
  ProductBrowser, ProductBrowserGlobalStyle, BrowserProduct,
  bg, surface, ink, inkSoft, brandDeep, line, fontBody, formatPrice,
} from "@/components/category/ProductBrowser";

/* ════════════════════════════════════════════════════════════
   Tokens partilhados com Categorias.tsx vêm agora de
   ProductBrowser.tsx — mudar lá muda as duas páginas juntas.
   ════════════════════════════════════════════════════════════ */

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
const useCategoryProducts = (categoryId: string | undefined) =>
  useQuery({
    queryKey: ["category_products", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_media(url, is_cover), product_variants(variant_type, value, name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryId,
  });

const GlobalStyle = () => (
  <style>{`
    .cd-scroll::-webkit-scrollbar { display: none; }
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

const CategoriaDetalhe = () => {
  const { nome } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(nome || "");
  const addToCart = useAddToCart();

  const { data: dbCategories } = useCategories();
  const category = (dbCategories || []).find((c: any) => c.name === categoryName);
  const categoryId = category?.id;

  const { data: dbProducts, isLoading } = useCategoryProducts(categoryId);

  const products: BrowserProduct[] = useMemo(() =>
    (dbProducts || []).map((p: any) => {
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
        groupLabel: p.subcategory || null,
      };
    }),
  [dbProducts]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: bg, fontFamily: fontBody, paddingBottom: 56 }}>
      <ProductBrowserGlobalStyle />
      <GlobalStyle />

      {/* ── Empresas / vendedores patrocinados ── */}
      <TrustedEntitiesStrip navigate={navigate} />

      {/* ── Estrutura partilhada com Categorias.tsx: chips + ordenação +
           filtros + grelha — ver src/components/category/ProductBrowser.tsx ── */}
      <ProductBrowser
        products={products}
        isLoading={isLoading}
        groupFilterLabel="Subcategoria"
        resultsContext={`em "${categoryName}"`}
        navigate={navigate}
        addToCart={addToCart}
      />
    </div>
  );
};

export default CategoriaDetalhe;
