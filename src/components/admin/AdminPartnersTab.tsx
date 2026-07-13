import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store, ShieldCheck, Star, CheckCircle, XCircle, Plus, Building2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import AdminCompanyCard from "./AdminCompanyCard";
import AdminCompanyMembersModal from "./AdminCompanyMembersModal";

type SubTab = "vendedores" | "empresas" | "pedidos";

// Componente autónomo — não depende do estado do AdminPanel.tsx. Usado tanto
// na aba "Parceiros" do /admin como no painel dedicado /equipa/parceiros.
// Extraído em 2026-07-13 já com o destaque/eliminação de empresa que o
// AdminCompanyCard exige (onFeature) — ver toggleFeatureCompany abaixo.
const AdminPartnersTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<SubTab>("vendedores");
  const [membersModal, setMembersModal] = useState<{ id: string; name: string } | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: "", slug: "", description: "" });
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const { data: sellers = [] } = useQuery({
    queryKey: ["admin_sellers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("sellers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: subTab === "vendedores",
  });

  const toggleVerifySeller = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase as any).from("sellers").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_sellers"] }); toast.success("Vendedor atualizado"); },
  });

  const toggleActiveSeller = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("sellers").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_sellers"] }); toast.success("Estado alterado"); },
  });

  const toggleFeaturedSeller = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await (supabase as any).from("sellers").update({ is_featured: featured } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      queryClient.invalidateQueries({ queryKey: ["featured_sellers_home"] });
      toast.success("Destaque atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin_companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: subTab === "empresas",
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("companies").insert({ ...companyForm, created_by: user!.id });
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
      const { error } = await (supabase as any).from("companies").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_companies"] }); toast.success("Empresa atualizada"); },
  });

  const toggleFeatureCompany = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await (supabase as any).from("companies").update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      queryClient.invalidateQueries({ queryKey: ["featured_companies_home"] });
      toast.success(vars.featured ? "Empresa destacada na home" : "Empresa removida do destaque");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["admin_seller_applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("seller_applications").select("*, profiles:user_id(full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: subTab === "pedidos",
  });

  const reviewApplication = useMutation({
    mutationFn: async ({ id, status, userId, name }: { id: string; status: string; userId: string; name: string }) => {
      const { error } = await (supabase as any).from("seller_applications").update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        await (supabase as any).from("sellers").insert({ name, slug, user_id: userId, type: "individual", is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_seller_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Pedido processado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const subTabs: { key: SubTab; label: string; icon: any }[] = [
    { key: "vendedores", label: "Vendedores", icon: Store },
    { key: "empresas", label: "Empresas", icon: Building2 },
    { key: "pedidos", label: "Candidaturas", icon: UserCheck },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              subTab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === "vendedores" && (
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
                    <p className="text-[10px] text-muted-foreground">
                      {s.type === "company" ? "Empresa" : s.type === "dropship" ? "Afiliado" : "Vendedor"} • {s.total_sales || 0} vendas
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleFeaturedSeller.mutate({ id: s.id, featured: !s.is_featured })} className={`p-2 rounded-lg text-xs ${s.is_featured ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:bg-accent"}`}>
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

      {subTab === "empresas" && (
        <>
          <button onClick={() => setShowCompanyForm(!showCompanyForm)} className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
          {showCompanyForm && (
            <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
              <input
                placeholder="Nome da empresa"
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-base md:text-sm text-foreground"
              />
              <input placeholder="Slug" value={companyForm.slug} onChange={e => setCompanyForm({ ...companyForm, slug: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-base md:text-sm text-foreground" />
              <textarea placeholder="Descrição" value={companyForm.description} onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-base md:text-sm text-foreground h-16 resize-none" />
              <button onClick={() => createCompany.mutate()} disabled={!companyForm.name || !companyForm.slug} className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50">Criar Empresa</button>
            </div>
          )}
          <div className="space-y-2">
            {companies.map((c: any) => (
              <AdminCompanyCard
                key={c.id}
                company={c}
                onMembers={() => setMembersModal({ id: c.id, name: c.name })}
                onVerify={() => toggleVerifyCompany.mutate({ id: c.id, verified: !c.is_verified })}
                onFeature={() => toggleFeatureCompany.mutate({ id: c.id, featured: !c.is_featured })}
                queryClient={queryClient}
              />
            ))}
            {companies.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma empresa.</p>}
          </div>
        </>
      )}

      {subTab === "pedidos" && (
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

      {membersModal && (
        <AdminCompanyMembersModal companyId={membersModal.id} companyName={membersModal.name} onClose={() => setMembersModal(null)} />
      )}
    </div>
  );
};

export default AdminPartnersTab;
