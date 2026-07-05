import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_products",
  title: "Pesquisar produtos",
  description:
    "Pesquisa produtos activos no marketplace AngoExpress por palavras-chave, categoria e preço máximo (em Kz).",
  inputSchema: {
    query: z.string().optional().describe("Palavras-chave a procurar no título/descrição."),
    category: z.string().optional().describe("Nome da categoria a filtrar."),
    maxPrice: z.number().positive().optional().describe("Preço máximo em Kwanzas."),
    limit: z.number().int().min(1).max(20).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, maxPrice, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    let q = supabase
      .from("products")
      .select("id,title,price,category,description")
      .eq("is_active", true)
      .limit(limit);
    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    if (category) q = q.ilike("category", `%${category}%`);
    if (maxPrice) q = q.lte("price", maxPrice);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
