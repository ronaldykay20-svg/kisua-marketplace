// Supabase Edge Function: shopping-assistant
// Chat de IA que ajuda a comprar. Recebe { messages: [{role, content}] } e
// devolve { reply, products }. Usa a mesma GEMINI_API_KEY já configurada.
//
// Deploy:
//   supabase functions deploy shopping-assistant --no-verify-jwt
//
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY em falta no servidor" }, 500);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return json({ error: "Config Supabase em falta" }, 500);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages em falta" }, 400);
    }
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

    // 1) Extrair intenção de compra via Gemini (palavras‑chave + faixa de preço)
    const extractPrompt = `Do texto do utilizador extrai um JSON com:
{"keywords": string[], "maxPrice": number|null, "category": string|null}
Sem explicações, apenas JSON válido. Texto: """${String(lastUser).slice(0, 500)}"""`;

    const extractRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: extractPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    const extractData = await extractRes.json();
    let filters: { keywords: string[]; maxPrice: number | null; category: string | null } = {
      keywords: [], maxPrice: null, category: null,
    };
    try {
      const raw = extractData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      filters = { ...filters, ...JSON.parse(raw) };
    } catch { /* ignore */ }

    // 2) Procurar produtos reais
    let query = supabase
      .from("products")
      .select("id,title,price,category,product_media(url,is_cover)")
      .eq("is_active", true)
      .limit(6);

    const kw = (filters.keywords || []).filter(Boolean).slice(0, 4);
    if (kw.length > 0) {
      const or = kw.map((k) => `title.ilike.%${k}%,description.ilike.%${k}%`).join(",");
      query = query.or(or);
    } else if (lastUser) {
      const term = String(lastUser).slice(0, 40).replace(/[%,()]/g, " ");
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    if (filters.maxPrice && Number.isFinite(filters.maxPrice)) {
      query = query.lte("price", filters.maxPrice);
    }
    if (filters.category) query = query.ilike("category", `%${filters.category}%`);

    const { data: products = [], error } = await query;
    if (error) console.error("products query error", error);

    const items = (products ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      image:
        p.product_media?.find((m: any) => m.is_cover)?.url ||
        p.product_media?.[0]?.url ||
        null,
    }));

    // 3) Resposta conversacional
    const history = messages
      .slice(-6)
      .map((m: any) => `${m.role === "user" ? "Utilizador" : "Assistente"}: ${m.content}`)
      .join("\n");
    const listStr = items.length
      ? items.map((p, i) => `${i + 1}. ${p.title} — ${p.price} Kz`).join("\n")
      : "(sem correspondências)";

    const replyPrompt = `És a assistente de compras da AngoExpress. Responde em português europeu, curto, simpático e sem inventar. Se houver produtos, apresenta‑os sucintamente e convida a tocar num card. Se não houver, sugere reformular a pesquisa.\n\nConversa:\n${history}\n\nProdutos encontrados:\n${listStr}`;

    const replyRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: replyPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
      }),
    });
    const replyData = await replyRes.json();
    const reply =
      replyData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      (items.length ? "Encontrei estas opções para ti:" : "Não encontrei produtos. Podes reformular?");

    return json({ reply, products: items });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message ?? "erro" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
