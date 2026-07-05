import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_categories",
  title: "Listar categorias",
  description: "Lista todas as categorias distintas dos produtos activos no AngoExpress.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .eq("is_active", true)
      .limit(500);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const categories = Array.from(new Set((data ?? []).map((r: any) => r.category).filter(Boolean))).sort();
    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    };
  },
});
