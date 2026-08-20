// ─────────────────────────────────────────────────────────────────────────
// Configuração de campanhas — cada entrada aqui vira uma página em
// /campanha/:slug (banner + selos + mais vendidos + grade). Para lançar
// uma campanha nova, basta adicionar uma entrada aqui; a página já sabe
// renderizar qualquer uma delas automaticamente.
// ─────────────────────────────────────────────────────────────────────────

export interface CampaignConfig {
  slug: string;
  title: string;
  subtitle: string;
  /** Cor de destaque (hex) — usada no gradiente do banner e nos selos. */
  accent: string;
  accentSoft: string;
  badges: string[];
  /** Imagem de banner customizada (opcional). Sem ela, o banner usa
   *  gradiente + ícone — funciona para qualquer campanha nova sem
   *  precisar de arte encomendada. */
  heroImageUrl?: string;
  /** Aplica os filtros Supabase próprios desta campanha à query de produtos. */
  applyFilter: (query: any) => any;
  /** Campo usado para ordenar a tira "Mais vendidos". */
  topPicksOrderBy: string;
}

export const CAMPAIGNS: Record<string, CampaignConfig> = {
  "frete-gratis": {
    slug: "frete-gratis",
    title: "Frete grátis",
    subtitle: "Produtos com envio grátis para si",
    accent: "#8B5A2B",
    accentSoft: "#F7F0E6",
    badges: ["Envio grátis garantido", "Entrega em todo o país"],
    applyFilter: (q) => q.eq("free_shipping", true).neq("free_shipping_scope", "nenhum"),
    topPicksOrderBy: "sales_count",
  },
  "ofertas-relampago": {
    slug: "ofertas-relampago",
    title: "Ofertas relâmpago",
    subtitle: "Descontos por tempo limitado — só hoje",
    accent: "#e53935",
    accentSoft: "#FDEAEA",
    badges: ["Descontos reais", "Termina à meia-noite"],
    applyFilter: (q) => q.gt("discount_percent", 0),
    topPicksOrderBy: "discount_percent",
  },
};

export const getCampaign = (slug: string | undefined): CampaignConfig | null =>
  slug ? CAMPAIGNS[slug] || null : null;
