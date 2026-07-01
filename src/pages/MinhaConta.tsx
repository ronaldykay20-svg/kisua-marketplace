import {
  User, Package, Heart, HelpCircle, ChevronRight, Settings, MapPin, CreditCard, Bell, Shield,
  LogOut, Crown, Store, Building2, Truck, ShoppingBag, Boxes,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites, useOrders } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Itens padrão da conta (sempre visíveis) ───────────────────────────────────
const accountMenuItems = [
  { icon: Package, label: "Meus Pedidos", desc: "Acompanhe as suas encomendas", path: "/pedidos" },
  { icon: Heart, label: "Favoritos", desc: "Produtos que guardou", path: "/favoritos" },
  { icon: MapPin, label: "Endereços", desc: "Gerir endereços de entrega", path: "/enderecos" },
  { icon: CreditCard, label: "Pagamentos", desc: "Métodos de pagamento", path: "/pagamentos" },
  { icon: Bell, label: "Notificações", desc: "Preferências de alertas", path: "/notificacoes" },
  { icon: Shield, label: "Segurança", desc: "Palavra-passe e privacidade", path: "/seguranca" },
  { icon: HelpCircle, label: "Ajuda", desc: "Centro de ajuda e suporte", path: "/ajuda" },
  { icon: Settings, label: "Definições", desc: "Configurações da conta", path: "/definicoes" },
];

// ─── Skeleton para os cards de painel enquanto a role é determinada ────────────
const PanelSkeleton = () => (
  <div className="grid grid-cols-2 gap-2.5 mb-5">
    {[0, 1].map(i => (
      <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
    ))}
  </div>
);

const MinhaConta = () => {
  const navigate = useNavigate();
  const { user, userDisplayName, signOut } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const { data: favorites } = useFavorites();
  const { data: orders } = useOrders();

  // Uma única consulta combinada — todas as roles resolvem ao mesmo tempo,
  // evitando o efeito de "painéis a aparecer aos poucos" com múltiplas queries.
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["my_account_roles", user?.id],
    queryFn: async () => {
      const [sellerRes, companyRes, supplierRes, dropshipRes] = await Promise.all([
        supabase.from("sellers").select("id").eq("user_id", user!.id).maybeSingle(),
        supabase.from("company_members").select("id").eq("user_id", user!.id).maybeSingle(),
        supabase.from("suppliers").select("id").eq("user_id", user!.id).maybeSingle(),
        supabase.from("dropship_stores").select("id").eq("user_id", user!.id).maybeSingle(),
      ]);
      return {
        isSeller: !!sellerRes.data,
        isCompanyMember: !!companyRes.data,
        isSupplier: !!supplierRes.data,
        isAffiliate: !!dropshipRes.data,
      };
    },
    enabled: !!user,
  });

  const isSeller = roles?.isSeller || false;
  const isCompanyMember = roles?.isCompanyMember || false;
  const isSupplier = roles?.isSupplier || false;
  const isAffiliate = roles?.isAffiliate || false;
  const hasAnyPanel = isSeller || isCompanyMember || isSupplier || isAffiliate || isAdmin || isModerator;

  // Cada painel com identidade visual própria — cor + ícone distintos
  const panels = [
    isSeller && {
      key: "seller", icon: Store, label: "Painel do Vendedor", desc: "Loja e produtos", path: "/painel-vendedor",
      grad: "from-blue-500/15 to-blue-600/5", border: "border-blue-500/25", iconBg: "bg-blue-500", textColor: "text-blue-700",
    },
    isCompanyMember && {
      key: "company", icon: Building2, label: "Painel da Empresa", desc: "Empresa e equipa", path: "/painel-empresa",
      grad: "from-purple-500/15 to-purple-600/5", border: "border-purple-500/25", iconBg: "bg-purple-500", textColor: "text-purple-700",
    },
    isSupplier && {
      key: "supplier", icon: Boxes, label: "Painel do Fornecedor", desc: "Catálogo e pedidos", path: "/painel-fornecedor",
      grad: "from-orange-500/15 to-orange-600/5", border: "border-orange-500/25", iconBg: "bg-orange-500", textColor: "text-orange-700",
    },
    isAffiliate && {
      key: "dropship", icon: ShoppingBag, label: "Painel do Afiliado", desc: "Loja de dropshipping", path: "/painel-dropship",
      grad: "from-green-500/15 to-green-600/5", border: "border-green-500/25", iconBg: "bg-green-500", textColor: "text-green-700",
    },
    !isAffiliate && {
      key: "become-affiliate", icon: ShoppingBag, label: "Tornar-me Afiliado", desc: "Venda sem stock próprio", path: "/criar-loja",
      grad: "from-slate-400/10 to-slate-500/5", border: "border-slate-400/25", iconBg: "bg-slate-400", textColor: "text-slate-600",
    },
    isModerator && !isAdmin && {
      key: "moderator", icon: Shield, label: "Painel do Moderador", desc: "Moderar produtos e vendedores", path: "/painel-moderador",
      grad: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/25", iconBg: "bg-amber-500", textColor: "text-amber-700",
    },
    isAdmin && {
      key: "admin", icon: Crown, label: "Administração", desc: "Utilizadores e cargos", path: "/admin",
      grad: "from-red-500/15 to-red-600/5", border: "border-red-500/25", iconBg: "bg-red-500", textColor: "text-red-700",
    },
    isAdmin && {
      key: "admin-mod", icon: Shield, label: "Painel do Moderador", desc: "Moderar produtos e vendedores", path: "/painel-moderador",
      grad: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/25", iconBg: "bg-amber-500", textColor: "text-amber-700",
    },
  ].filter(Boolean) as any[];

  const stats = [
    { n: String(orders?.length || 0), l: "Pedidos" },
    { n: String(favorites?.length || 0), l: "Favoritos" },
    { n: "0", l: "Cupões" },
  ];

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão terminada com sucesso");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">

        {/* ── Perfil ── */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            {user ? (
              <span className="text-xl font-bold text-primary">{userDisplayName.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-7 h-7 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {user ? (
              <>
                <h2 className="text-sm font-bold text-foreground">Olá, {userDisplayName}</h2>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {isAdmin && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-600 rounded">Admin</span>}
                  {isModerator && !isAdmin && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-600 rounded">Mod</span>}
                  {isSupplier && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500/10 text-orange-600 rounded">Fornecedor</span>}
                  {isAffiliate && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-600 rounded">Dropshipper</span>}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold text-foreground">Olá, visitante</h2>
                <p className="text-xs text-muted-foreground">Faça login para ver a sua conta</p>
              </>
            )}
          </div>
          {!user && (
            <button onClick={() => navigate("/auth")} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex-shrink-0">Entrar</button>
          )}
        </div>

        {/* ── Estatísticas rápidas ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {stats.map(s => (
            <div key={s.l} className="bg-card rounded-xl border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.n}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        {/* ── Central de Pedidos (acesso rápido, sempre visível se autenticado) ── */}
        {user && (
          <button
            onClick={() => navigate("/central-de-pedidos")}
            className="w-full flex items-center gap-3 rounded-2xl p-4 mb-5 border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5"
          >
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-foreground">Central de Pedidos</p>
              <p className="text-[11px] text-muted-foreground">Acompanhe vendas, aceite pedidos e veja avisos da administração</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}

        {/* ── Painéis de Gestão (aparecem todos juntos, nunca aos poucos) ── */}
        {user && rolesLoading && <PanelSkeleton />}

        {user && !rolesLoading && hasAnyPanel && (
          <div className="mb-5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Painéis de Gestão</p>
            <div className="grid grid-cols-2 gap-2.5">
              {panels.map(p => (
                <button
                  key={p.key}
                  onClick={() => navigate(p.path)}
                  className={`bg-gradient-to-br ${p.grad} border ${p.border} rounded-2xl p-3.5 text-left flex flex-col gap-2 hover:brightness-95 transition`}
                >
                  <div className={`w-9 h-9 rounded-xl ${p.iconBg} flex items-center justify-center`}>
                    <p.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${p.textColor}`}>{p.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Seja Fornecedor (só se ainda não for) ── */}
        {user && !rolesLoading && !isSupplier && (
          <button
            onClick={() => navigate("/seja-fornecedor")}
            className="w-full flex items-center gap-3 rounded-2xl p-3.5 mb-5 border border-border bg-card text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <Boxes className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Seja Fornecedor</p>
              <p className="text-[10px] text-muted-foreground">Forneça produtos à rede de dropshippers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}

        {/* ── A Minha Conta ── */}
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">A Minha Conta</p>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {accountMenuItems.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition">
              <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        )}
      </div>
    </div>
  );
};

export default MinhaConta;
