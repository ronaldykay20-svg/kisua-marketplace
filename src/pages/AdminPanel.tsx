import { useState, useRef, useEffect } from "react";
import { Shield, Users, Search, Plus, Trash2, Crown, Building2, Store, CheckCircle, XCircle, ShieldCheck, UserCheck, UsersRound, FolderTree, ImageIcon, ShoppingBag, Settings, Star, Gavel, Upload, Eye, EyeOff, Copy, Megaphone, Play, TrendingUp, Users as UsersIcon, X, Loader2, Truck, Banknote, Ticket, MousePointerClick, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole, TEAM_ROLES } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminAdsTab from "@/components/admin/AdminAdstab";
import AdminLeiloesTab from "@/components/admin/AdminLeiloesTab";
import AdminPartnersTab from "@/components/admin/AdminPartnersTab";
import ConfirmPasswordModal from "@/components/admin/ConfirmPasswordModal";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminFreightTab from "@/components/admin/AdminFreightTab";
import AdminFreightCompaniesTab from "@/components/admin/AdminFreightCompaniesTab";
import AdminFreeShippingTab from "@/components/admin/AdminFreeShippingTab";
import AdminSuppliersTab from "@/components/admin/AdminSuppliersTab";
import AdminPaymentReviewTab from "@/components/admin/AdminPaymentReviewTab";
import CouponManagerTab from "@/components/coupons/CouponManagerTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";
import AdminPageInteractionsTab from "@/components/admin/AdminPageInteractionsTab";
import { toast } from "sonner";
import { convertToWebP, getFileExtension } from "@/lib/imageToWebp";

const roleBadge: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Admin", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Crown },
  moderator: { label: "Moderador", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Shield },
  user: { label: "Utilizador", color: "bg-primary/10 text-primary border-primary/20", icon: Users },
  // ── Cargos da equipa ──────────────────────────────────────────────────
  operacoes:  { label: "Operações",  color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: ShieldCheck },
  financeiro: { label: "Financeiro", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: Banknote },
  logistica:  { label: "Logística",  color: "bg-sky-500/10 text-sky-500 border-sky-500/20", icon: Truck },
  parceiros:  { label: "Parceiros",  color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Store },
  marketing:  { label: "Marketing",  color: "bg-pink-500/10 text-pink-500 border-pink-500/20", icon: Megaphone },
};

type Tab = "utilizadores" | "cargos" | "vendedores" | "empresas" | "pedidos" | "encomendas" | "categorias" | "banners" | "definicoes" | "leiloes" | "publicidade" | "frete" | "frete_gratis" | "frete_empresas" | "fornecedores" | "pagamentos" | "cupons" | "analytics" | "interacoes";

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin, allowedAdminTabs, hasDualRole, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("utilizadores");

  // Quem não é admin nunca tem "utilizadores" (o valor por omissão) entre as
  // suas abas permitidas — assim que soubermos o cargo real, mandamo-lo
  // para a primeira aba que ele de facto pode ver.
  useEffect(() => {
    if (roleLoading || isAdmin) return;
    if (!allowedAdminTabs.includes(tab) && allowedAdminTabs.length > 0) {
      setTab(allowedAdminTabs[0] as Tab);
    }
  }, [roleLoading, isAdmin, allowedAdminTabs, tab]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingRoleAssignment, setPendingRoleAssignment] = useState<AppRole | null>(null);

  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["admin_all_roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("*, profiles(full_name)")
        .order("role");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_profiles", searchTerm],
    queryFn: async () => {
      let q = (supabase as any).from("profiles").select("id, full_name").limit(20);
      if (searchTerm) q = q.ilike("full_name", `%${searchTerm}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo atribuído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await (supabase as any).from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo removido");
    },
    onError: (e: any) => toast.error(e.message),
  });


  const grouped = allRoles.reduce((acc: any, r: any) => {
    acc[r.role] = acc[r.role] || [];
    acc[r.role].push(r);
    return acc;
  }, {});

  const allTabs: { key: Tab; label: string; icon: any }[] = [
    { key: "utilizadores", label: "Utilizadores", icon: UsersRound },
    { key: "analytics",    label: "Analytics",    icon: TrendingUp },
    { key: "interacoes",   label: "Interações",    icon: MousePointerClick },
    { key: "categorias",   label: "Categorias",   icon: FolderTree },
    { key: "cargos",       label: "Cargos",        icon: Crown },
    { key: "vendedores",   label: "Vendedores",    icon: Store },
    { key: "empresas",     label: "Empresas",      icon: Building2 },
    { key: "encomendas",   label: "Encomendas",    icon: ShoppingBag },
    { key: "pagamentos",   label: "Pagamentos",    icon: Banknote },
    { key: "banners",      label: "Banners",       icon: ImageIcon },
    { key: "publicidade",  label: "Publicidade",   icon: Megaphone },
    { key: "frete",        label: "Frete",         icon: Truck },
    { key: "frete_gratis", label: "Frete Grátis",  icon: Gift },
    { key: "frete_empresas", label: "Transportadoras", icon: Truck },
    { key: "fornecedores", label: "Fornecedores",  icon: Building2 },
    { key: "cupons",       label: "Cupons",        icon: Ticket },
    { key: "pedidos",      label: "Candidaturas",  icon: UserCheck },
    { key: "leiloes",      label: "Leilões",       icon: Gavel },
    { key: "definicoes",   label: "Definições",    icon: Settings },
  ];

  // "utilizadores", "cargos" e "definicoes" são exclusivas do admin — dão
  // poder ou mexem em configuração global, não pertencem a nenhum dos 5
  // cargos de equipa. Todo o resto é filtrado por allowedAdminTabs, que já
  // vem como a UNIÃO das abas permitidas se a pessoa tiver cargo duplo.
  const tabs = isAdmin
    ? allTabs
    : allTabs.filter(t => allowedAdminTabs.includes(t.key));

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Administração</h1>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap border ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "utilizadores" && <AdminUsersTab />}
        {tab === "analytics"    && <AdminAnalyticsTab />}
        {tab === "interacoes"   && <AdminPageInteractionsTab />}
        {tab === "categorias"   && <AdminCategoriesTab />}
        {tab === "publicidade"  && <AdminAdsTab />}
        {tab === "encomendas"   && <AdminOrdersTab />}
        {tab === "pagamentos"   && <AdminPaymentReviewTab />}
        {tab === "banners"      && <AdminBannersTab />}
        {tab === "definicoes"   && <AdminSettingsTab />}
        {tab === "leiloes"      && <AdminLeiloesTab />}
        {tab === "frete"        && <AdminFreightTab />}
        {tab === "frete_gratis" && <AdminFreeShippingTab />}
        {tab === "frete_empresas" && <AdminFreightCompaniesTab />}
        {tab === "fornecedores" && <AdminSuppliersTab />}
        {tab === "cupons"       && <CouponManagerTab scope="platform" ownerId={null} heading="Cupons da Plataforma" />}

        {tab === "cargos" && (
          <>
            {/* Ordem lógica: poder da plataforma primeiro, depois os 5 cargos
                de equipa, "user" por último (é o estado normal, não um cargo
                atribuído por ninguém). */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(["admin", "moderator", "operacoes", "financeiro", "logistica", "parceiros", "marketing", "user"] as const).map(role => {
                const info = roleBadge[role];
                return (
                  <div key={role} className={`rounded-xl border p-3 text-center ${info.color}`}>
                    <info.icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-lg font-bold">{grouped[role]?.length || 0}</p>
                    <p className="text-[10px]">{info.label}s</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 mb-4">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Atribuir Cargo
              </h2>
              <p className="text-[11px] text-muted-foreground mb-3">
                Podes atribuir mais do que um cargo à mesma pessoa (ex: Financeiro + Logística) — basta clicar em mais do que um botão abaixo.
              </p>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Procurar utilizador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-base md:text-sm text-foreground"
                />
              </div>
              {searchTerm && profiles.length > 0 && (
                <div className="bg-muted rounded-lg border border-border mb-3 max-h-32 overflow-y-auto">
                  {profiles.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedUserId(p.id);
                        setSearchTerm(p.full_name || p.id.slice(0, 8));
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition ${
                        selectedUserId === p.id ? "bg-accent" : ""
                      }`}
                    >
                      {p.full_name || p.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && (
                <>
                  <p className="text-[10px] font-bold text-muted-foreground mb-1.5 mt-1">Poder da plataforma</p>
                  <div className="flex gap-2 mb-3">
                    {(["admin", "moderator", "user"] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => setPendingRoleAssignment(role)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border ${roleBadge[role].color}`}
                      >
                        {roleBadge[role].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-1.5">Cargos de equipa (podes escolher mais do que um)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TEAM_ROLES.map(role => (
                      <button
                        key={role}
                        onClick={() => setPendingRoleAssignment(role)}
                        className={`py-2 rounded-lg text-xs font-bold border ${roleBadge[role].color}`}
                      >
                        {roleBadge[role].label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {pendingRoleAssignment && (
              <ConfirmPasswordModal
                actionLabel={`Dar o cargo "${roleBadge[pendingRoleAssignment].label}" a ${searchTerm || "esta pessoa"}`}
                onConfirm={() => addRole.mutate({ userId: selectedUserId, role: pendingRoleAssignment })}
                onClose={() => setPendingRoleAssignment(null)}
              />
            )}
            {(["admin", "moderator", "operacoes", "financeiro", "logistica", "parceiros", "marketing", "user"] as const).map(role => {
              const items = grouped[role] || [];
              if (!items.length) return null;
              const info = roleBadge[role];
              return (
                <div key={role} className="mb-4">
                  <h3
                    className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                      info.color.split(" ")[1]
                    }`}
                  >
                    <info.icon className="w-4 h-4" /> {info.label}s ({items.length})
                  </h3>
                  <div className="bg-card rounded-xl border border-border divide-y divide-border">
                    {items.map((r: any) => {
                      // Outros cargos de equipa que esta mesma pessoa já tem —
                      // é como "cargo duplo" fica visível sem termos de
                      // duplicar dados: basta olhar para o resto de allRoles.
                      const otherRoles = allRoles.filter(
                        (x: any) => x.user_id === r.user_id && x.id !== r.id && TEAM_ROLES.includes(x.role)
                      );
                      return (
                        <div key={r.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {r.profiles?.full_name || r.user_id.slice(0, 8)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.user_id.slice(0, 12)}...
                            </p>
                            {otherRoles.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <span className="text-[9px] text-muted-foreground">também:</span>
                                {otherRoles.map((or: any) => (
                                  <span key={or.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleBadge[or.role].color}`}>
                                    {roleBadge[or.role].label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {r.user_id !== user?.id && (
                            <button
                              onClick={() => removeRole.mutate(r.id)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {(tab === "vendedores" || tab === "empresas" || tab === "pedidos") && (
          <AdminPartnersTab />
        )}

        {isLoading && tab === "cargos" && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
