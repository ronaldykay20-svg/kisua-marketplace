import { User, Package, Heart, HelpCircle, ChevronRight, Settings, MapPin, CreditCard, Bell, Shield, LogOut, Crown, Store, Building2, Truck, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites, useOrders } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const MinhaConta = () => {
  const navigate = useNavigate();
  const { user, userDisplayName, signOut } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const { data: favorites } = useFavorites();
  const { data: orders } = useOrders();

  // Check if user is a seller
  const { data: isSeller } = useQuery({
    queryKey: ["is_seller", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sellers").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user is a company member
  const { data: isCompanyMember } = useQuery({
    queryKey: ["is_company_member", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_members").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user is a supplier (fornecedor)
  const { data: isSupplier } = useQuery({
    queryKey: ["is_supplier", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if user is a dropshipper (affiliate)
  const { data: isAffiliate } = useQuery({
    queryKey: ["is_affiliate", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const menuItems = [
    { icon: Package, label: "Meus Pedidos", desc: "Acompanhe as suas encomendas", path: "/pedidos" },
    { icon: Heart, label: "Favoritos", desc: "Produtos que guardou", path: "/favoritos" },
    { icon: MapPin, label: "Endereços", desc: "Gerir endereços de entrega", path: "/enderecos" },
    { icon: CreditCard, label: "Pagamentos", desc: "Métodos de pagamento", path: "/pagamentos" },
    { icon: Bell, label: "Notificações", desc: "Preferências de alertas", path: "/notificacoes" },
    { icon: Shield, label: "Segurança", desc: "Palavra-passe e privacidade", path: "/seguranca" },
    { icon: HelpCircle, label: "Ajuda", desc: "Centro de ajuda e suporte", path: "/ajuda" },
    { icon: Settings, label: "Definições", desc: "Configurações da conta", path: "/definicoes" },
    ...(isSeller ? [{ icon: Store, label: "Painel do Vendedor", desc: "Gerir a sua loja e produtos", path: "/painel-vendedor" }] : []),
    ...(isCompanyMember ? [{ icon: Building2, label: "Painel da Empresa", desc: "Gerir empresa e equipa", path: "/painel-empresa" }] : []),
    ...(isSupplier ? [{ icon: Truck, label: "Painel do Fornecedor", desc: "Gerir produtos e pedidos de fornecedor", path: "/painel-fornecedor" }] : []),
    ...(!isAffiliate ? [{ icon: ShoppingBag, label: "Tornar-me Afiliado", desc: "Vende produtos de fornecedores sem stock", path: "/criar-loja" }] : []),
    ...(isAffiliate ? [{ icon: ShoppingBag, label: "Painel do Afiliado", desc: "Gerir a sua loja de afiliado", path: "/painel-dropship" }] : []),
    ...(isModerator && !isAdmin ? [{ icon: Shield, label: "Painel do Moderador", desc: "Moderar produtos e vendedores", path: "/painel-moderador" }] : []),
    ...(isAdmin ? [
      { icon: Crown, label: "Administração", desc: "Gerir utilizadores e cargos", path: "/admin" },
      { icon: Shield, label: "Painel do Moderador", desc: "Moderar produtos e vendedores", path: "/painel-moderador" },
    ] : []),
  ];

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
        {/* Profile header */}
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            {user ? (
              <span className="text-xl font-bold text-primary">{userDisplayName.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-7 h-7 text-primary" />
            )}
          </div>
          <div className="flex-1">
            {user ? (
              <>
                <h2 className="text-sm font-bold text-foreground">Olá, {userDisplayName}</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {isAdmin && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-500 rounded">Admin</span>}
                  {isModerator && !isAdmin && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 rounded">Mod</span>}
                  {isSupplier && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-500 rounded">Fornecedor</span>}
                  {isAffiliate && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500/10 text-green-500 rounded">Dropshipper</span>}
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
            <button onClick={() => navigate("/auth")} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg">Entrar</button>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stats.map(s => (
            <div key={s.l} className="bg-card rounded-lg border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.n}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Menu list */}
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {menuItems.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition">
              <item.icon className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        )}
      </div>
    </div>
  );
};

export default MinhaConta;
