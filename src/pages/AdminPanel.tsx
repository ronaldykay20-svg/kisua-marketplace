import { useState, useRef } from "react";
import { Shield, Users, Search, Plus, Trash2, Crown, Building2, Store, CheckCircle, XCircle, ShieldCheck, UserCheck, UsersRound, FolderTree, ImageIcon, Camera, ShoppingBag, Settings, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminCompanyMembersModal from "@/components/admin/AdminCompanyMembersModal";
import AdminCompanyCard from "@/components/admin/AdminCompanyCard";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import { toast } from "sonner";

const roleBadge: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Admin", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Crown },
  moderator: { label: "Moderador", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Shield },
  user: { label: "Utilizador", color: "bg-primary/10 text-primary border-primary/20", icon: Users },
};

type Tab = "utilizadores" | "cargos" | "vendedores" | "empresas" | "pedidos" | "encomendas" | "categorias" | "banners" | "definicoes";

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("utilizadores");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [membersModal, setMembersModal] = useState<{ id: string; name: string } | null>(null);

  // ── Roles ──
  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["admin_all_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*, profiles(full_name)").order("role");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_profiles", searchTerm],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name").limit(20);
      if (searchTerm) q = q.ilike("full_name", `%${searchTerm}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] }); toast.success("Cargo atribuído"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] }); toast.success("Cargo removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Sellers ──
  const { data: sellers = [] } = useQuery({
    queryKey: ["admin_sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "vendedores",
  });

  const toggleVerifySeller = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("sellers").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_sellers"] }); toast.success("Vendedor atualizado"); },
  });

  const toggleActiveSeller = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("sellers").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_sellers"] }); toast.success("Estado alterado"); },
  });

  const toggleFeaturedSeller = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("sellers").update({ is_featured: featured } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_sellers"] }); queryClient.invalidateQueries({ queryKey: ["featured_sellers_home"] }); toast.success("Destaque atualizado"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Companies ──
  const { data: companies = [] } = useQuery({
    queryKey: ["admin_companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "empresas",
  });

  const [companyForm, setCompanyForm] = useState({ name: "", slug: "", description: "" });
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").insert({ ...companyForm, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success("Empresa criada");
      setCompanyForm({ name: "", slug: "", description: "" });
      setShowCompanyForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVerifyCompany = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("companies").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_companies"] }); toast.success("Empresa atualizada"); },
  });

  // ── Seller Applications ──
  const { data: applications = [] } = useQuery({
    queryKey: ["admin_seller_applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_applications").select("*, profiles:user_id(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "pedidos",
  });

  const reviewApplication = useMutation({
    mutationFn: async ({ id, status, userId, name }: { id: string; status: string; userId: string; name: string }) => {
      const { error } = await supabase.from("seller_applications").update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        await supabase.from("sellers").insert({ name, slug, user_id: userId, type: "individual" as any, is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_seller_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Pedido processado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = allRoles.reduce((acc: any, r: any) => { acc[r.role] = acc[r.role] || []; acc[r.role].push(r); return acc; }, {});

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "utilizadores", label: "Utilizadores", icon: UsersRound },
    { key: "categorias", label: "Categorias", icon: FolderTree },
    { key: "cargos", label: "Cargos", icon: Crown },
    { key: "vendedores", label: "Vendedores", icon: Store },
    { key: "empresas", label: "Empresas", icon: Building2 },
    { key: "encomendas", label: "Encomendas", icon: ShoppingBag },
    { key: "banners", label: "Banners", icon: ImageIcon },
    { key: "pedidos", label: "Candidaturas", icon: UserCheck },
    { key: "definicoes", label: "Definições", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Administração</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══ UTILIZADORES TAB ═══ */}
        {tab === "utilizadores" && <AdminUsersTab />}

        {/* ═══ CATEGORIAS TAB ═══ */}
        {tab === "categorias" && <AdminCategoriesTab />}

        {/* ═══ CARGOS TAB ═══ */}
        {tab === "cargos" && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["admin", "moderator", "user"] as const).map(role => {
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
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Atribuir Cargo</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Procurar utilizador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
              </div>
              {searchTerm && profiles.length > 0 && (
                <div className="bg-muted rounded-lg border border-border mb-3 max-h-32 overflow-y-auto">
                  {profiles.map((p: any) => (
                    <button key={p.id} onClick={() => { setSelectedUserId(p.id); setSearchTerm(p.full_name || p.id.slice(0, 8)); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition ${selectedUserId === p.id ? "bg-accent" : ""}`}>
                      {p.full_name || p.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && (
                <div className="flex gap-2">
                  {(["admin", "moderator", "user"] as const).map(role => (
                    <button key={role} onClick={() => addRole.mutate({ userId: selectedUserId, role })} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${roleBadge[role].color}`}>
                      {roleBadge[role].label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(["admin", "moderator", "user"] as const).map(role => {
              const items = grouped[role] || [];
              if (!items.length) return null;
              const info = roleBadge[role];
              return (
                <div key={role} className="mb-4">
                  <h3 className={`text-sm font-bold mb-2 flex items-center gap-2 ${info.color.split(" ")[1]}`}>
                    <info.icon className="w-4 h-4" /> {info.label}s ({items.length})
                  </h3>
                  <div className="bg-card rounded-xl border border-border divide-y divide-border">
                    {items.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.profiles?.full_name || r.user_id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">{r.user_id.slice(0, 12)}...</p>
                        </div>
                        {r.user_id !== user?.id && (
                          <button onClick={() => removeRole.mutate(r.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ═══ VENDEDORES TAB ═══ */}
        {tab === "vendedores" && (
          <div className="space-y-2">
            {sellers.map((s: any) => (
              <div key={s.id} className={`bg-card rounded-xl border border-border p-3 ${!s.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-1">
                        {s.name} {s.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{s.type} • {s.total_sales || 0} vendas</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleFeaturedSeller.mutate({ id: s.id, featured: !s.is_featured })} title="Destacar em home" className={`p-2 rounded-lg text-xs ${s.is_featured ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:bg-accent"}`}>
                      <Star className={`w-4 h-4 ${s.is_featured ? "fill-secondary" : ""}`} />
                    </button>
                    <button onClick={() => toggleVerifySeller.mutate({ id: s.id, verified: !s.is_verified })} className={`p-2 rounded-lg text-xs ${s.is_verified ? "text-blue-500 hover:bg-blue-500/10" : "text-muted-foreground hover:bg-accent"}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActiveSeller.mutate({ id: s.id, active: !s.is_active })} className={`p-2 rounded-lg text-xs ${s.is_active ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-accent"}`}>
                      {s.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sellers.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum vendedor registado.</p>}
          </div>
        )}

        {/* ═══ EMPRESAS TAB ═══ */}
        {tab === "empresas" && (
          <>
            <button onClick={() => setShowCompanyForm(!showCompanyForm)} className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Nova Empresa
            </button>

            {showCompanyForm && (
              <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
                <input placeholder="Nome da empresa" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                <input placeholder="Slug" value={companyForm.slug} onChange={e => setCompanyForm({ ...companyForm, slug: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                <textarea placeholder="Descrição" value={companyForm.description} onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-16 resize-none" />
                <button onClick={() => createCompany.mutate()} disabled={!companyForm.name || !companyForm.slug} className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50">Criar Empresa</button>
              </div>
            )}

            <div className="space-y-2">
              {companies.map((c: any) => (
                <AdminCompanyCard key={c.id} company={c} onMembers={() => setMembersModal({ id: c.id, name: c.name })} onVerify={() => toggleVerifyCompany.mutate({ id: c.id, verified: !c.is_verified })} queryClient={queryClient} />
              ))}
              {companies.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma empresa.</p>}
            </div>
          </>
        )}

        {/* ═══ ENCOMENDAS TAB ═══ */}
        {tab === "encomendas" && <AdminOrdersTab />}

        {/* ═══ BANNERS TAB ═══ */}
        {tab === "banners" && <AdminBannersTab />}

        {/* ═══ DEFINIÇÕES TAB ═══ */}
        {tab === "definicoes" && <AdminSettingsTab />}

        {/* ═══ CANDIDATURAS VENDEDOR TAB ═══ */}
        {tab === "pedidos" && (
          <div className="space-y-2">
            {applications.map((a: any) => (
              <div key={a.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(a.profiles as any)?.full_name} • {a.province || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === "pending" ? "bg-amber-500/10 text-amber-500" : a.status === "approved" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {a.status === "pending" ? "Pendente" : a.status === "approved" ? "Aprovado" : "Rejeitado"}
                  </span>
                </div>
                {a.bio && <p className="text-xs text-muted-foreground mb-2">{a.bio}</p>}
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => reviewApplication.mutate({ id: a.id, status: "approved", userId: a.user_id, name: a.name })} className="flex-1 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button onClick={() => reviewApplication.mutate({ id: a.id, status: "rejected", userId: a.user_id, name: a.name })} className="flex-1 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            ))}
            {applications.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma candidatura de vendedor.</p>}
          </div>
        )}

        {isLoading && tab === "cargos" && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <BottomNav />

      {/* Company Members Modal */}
      {membersModal && (
        <AdminCompanyMembersModal
          companyId={membersModal.id}
          companyName={membersModal.name}
          onClose={() => setMembersModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
