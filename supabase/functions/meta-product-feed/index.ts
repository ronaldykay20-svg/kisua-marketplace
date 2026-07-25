// Supabase Edge Function: meta-product-feed
// Gera um feed de produtos em CSV, no formato exigido pelo Meta Commerce
// Manager (Catalog Ads / Advantage+ Catalog Ads), lendo diretamente da
// tabela `products` (com imagem de capa de `product_media` e nome de
// categoria/vendedor). O Meta vai buscar este URL periodicamente — não é
// preciso atualizar nada à mão, o feed reflete sempre o estado atual da loja.
//
// URL pública depois de publicado (dar esta URL ao Commerce Manager):
//   https://<PROJECT_REF>.supabase.co/functions/v1/meta-product-feed
//
// Deploy:
//   supabase functions deploy meta-product-feed --no-verify-jwt
//
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Domínio público da loja — usado para montar o link de cada produto.
const SITE_URL = "https://zangushopping.com";

// Campos exigidos/recomendados pelo Meta:
// id, title, description, availability, condition, price, link, image_link
const CSV_HEADER = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "product_type",
].join(",");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return json({ error: "Config Supabase em falta" }, 500);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

    // Só produtos ativos entram no feed. Paginamos em blocos de 1000 para
    // aguentar catálogos grandes sem estourar o limite de uma única query.
    const rows: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,title,description,price,stock,condition,is_active," +
            "categories(name)," +
            "sellers(name)," +
            "companies(name)," +
            "product_media(url,is_cover,sort_order)"
        )
        .eq("is_active", true)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("erro ao buscar produtos", error);
        return json({ error: "Falha ao ler produtos" }, 500);
      }
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
    }

    const lines = [CSV_HEADER];

    for (const p of rows) {
      const media: any[] = Array.isArray(p.product_media) ? p.product_media : [];
      const cover =
        media.find((m) => m.is_cover)?.url ||
        [...media].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url ||
        "";

      // Sem imagem, o Meta rejeita o item — não vale a pena listá-lo.
      if (!cover) continue;

      const brand = p.companies?.name || p.sellers?.name || "Kisua Marketplace";
      const condition = ["new", "refurbished", "used"].includes(p.condition)
        ? p.condition
        : "new";
      const availability = Number(p.stock) > 0 ? "in stock" : "out of stock";
      const price = `${Number(p.price).toFixed(2)} AOA`;
      const link = `${SITE_URL}/produto/${p.id}`;
      const productType = p.categories?.name || "";

      lines.push(
        [
          csv(p.id),
          csv(truncate(p.title, 150)),
          csv(truncate(p.description || p.title, 5000)),
          csv(availability),
          csv(condition),
          csv(price),
          csv(link),
          csv(cover),
          csv(brand),
          csv(productType),
        ].join(",")
      );
    }

    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=1800", // 30 min — o Meta não precisa de tempo real
      },
    });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? "erro" }, 500);
  }
});

function truncate(s: string, max: number) {
  const clean = String(s).replace(/[\r\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

// Escapa um valor para uma célula CSV (aspas duplas + separador + quebras de linha).
function csv(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
