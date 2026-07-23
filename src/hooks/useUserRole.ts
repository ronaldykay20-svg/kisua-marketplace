import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole =
  | "admin"
  | "moderator"
  | "user"
  // ── Cargos da equipa (5 funções operacionais) ──────────────────────────
  | "operacoes"   // Operações & Confiança — moderação, disputas, devoluções, encomendas
  | "financeiro"  // Financeiro & Pagamentos — comprovativos, comissões
  | "logistica"   // Logística & Frete — zonas, transportadoras, frete grátis
  | "parceiros"   // Vendedores, Empresas & Fornecedores — onboarding, catálogo
  | "marketing";  // Marketing, Conteúdo & Dados — anúncios, promoções, leilões, analytics

export const TEAM_ROLES: AppRole[] = ["operacoes", "financeiro", "logistica", "parceiros", "marketing"];

// ── Mapa real de permissões: cada cargo só vê as abas do AdminPanel que
// correspondem à sua função. "utilizadores", "cargos" e "definicoes" ficam
// reservadas ao admin — são acções que concedem poder ou mexem em
// configuração global, não fazem parte de nenhum dos 5 cargos.
// Uma pessoa com dois cargos (ex: financeiro + logistica) vê a UNIÃO das
// abas dos dois — já suportado, porque user_roles é uma tabela com uma
// linha por cargo, não um campo único.
export const ADMIN_TAB_PERMISSIONS: Record<string, string[]> = {
  operacoes:  ["encomendas"],
  financeiro: ["pagamentos"],
  logistica:  ["frete", "frete_gratis", "frete_empresas"],
  parceiros:  ["categorias", "vendedores", "empresas", "fornecedores", "importar_produtos", "pedidos"],
  marketing:  ["analytics", "interacoes", "banners", "publicidade", "cupons", "leiloes"],
};

export const getAllowedAdminTabs = (roles: AppRole[]): string[] => {
  const allowed = new Set<string>();
  roles.forEach((r) => (ADMIN_TAB_PERMISSIONS[r] || []).forEach((t) => allowed.add(t)));
  return Array.from(allowed);
};

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((r: any) => r.role as AppRole);
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
  });

  const isStaff = roles.some((r) => r === "admin" || TEAM_ROLES.includes(r));

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isModerator: roles.includes("moderator"),
    isUser: roles.includes("user"),
    hasRole: (role: AppRole) => roles.includes(role),

    // ── Cargos da equipa ──────────────────────────────────────────────
    isOperacoes: roles.includes("operacoes"),
    isFinanceiro: roles.includes("financeiro"),
    isLogistica: roles.includes("logistica"),
    isParceiros: roles.includes("parceiros"),
    isMarketing: roles.includes("marketing"),
    // true se a pessoa tiver mais do que um cargo de equipa (cargo duplo)
    hasDualRole: roles.filter((r) => TEAM_ROLES.includes(r)).length > 1,
    // true se admin OU tiver qualquer um dos 5 cargos — usado para decidir
    // se a pessoa sequer consegue entrar no /admin
    isStaff,
    // abas do AdminPanel que esta pessoa pode ver (união, se tiver
    // cargo duplo). Ignorada quando isAdmin, que vê tudo.
    allowedAdminTabs: getAllowedAdminTabs(roles),

    canManageProducts: roles.includes("admin") || roles.includes("moderator"),
    canManageUsers: roles.includes("admin"),
    loading: isLoading,
  };
};
