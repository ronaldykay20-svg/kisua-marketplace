// Supabase Edge Function: image-search
// Faz o proxy da análise de imagem para a Gemini API, mantendo a chave em
// segredo no servidor (nunca no bundle do cliente).
//
// Deploy:
//   supabase functions deploy image-search --no-verify-jwt
//   supabase secrets set GEMINI_API_KEY=xxxxxxxxxxxxxxxx
//
// A chave anterior que estava no cliente foi comprometida — rode-a no
// Google Cloud Console antes de guardar a nova aqui.

// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { image_base64 } = await req.json();
    if (!image_base64 || typeof image_base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "image_base64 em falta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: image_base64 } },
              {
                text:
                  `Analisa esta imagem de produto para um marketplace.\n` +
                  `Responde APENAS com uma lista JSON de termos de pesquisa em português, do mais específico ao mais geral.\n` +
                  `Inclui: tipo de produto, material, cor, estilo, uso, categoria.\n` +
                  `Exemplo: ["sapato social masculino preto couro", "sapato social preto", "sapato masculino", "calçado social", "sapato"]\n` +
                  `Devolve só o array JSON, sem mais texto.`,
              },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Erro Gemini: ${res.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const limpo = texto.replace(/```json|```/g, "").trim();
    let terms: string[] = [];
    try {
      terms = JSON.parse(limpo);
    } catch {
      terms = [];
    }
    return new Response(
      JSON.stringify({ terms }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
