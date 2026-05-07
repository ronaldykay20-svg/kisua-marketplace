import { useState } from "react";
import { Shield, Users, Search, Plus, Trash2, Crown, Building2, Store, CheckCircle, XCircle, ShieldCheck, UserCheck, UsersRound, FolderTree, ImageIcon, ShoppingBag, Settings, Star, Gavel, Upload, Eye, Copy, Megaphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

type Tab = "utilizadores" | "cargos" | "vendedores" | "empresas" | "pedidos" | "encomendas" | "categorias" | "banners" | "definicoes" | "leiloes" | "publicidade";

// ── Tab Publicidade ───────────────────────────────────────────────────────────
const AdminAdsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", image_url: "", placement: "home", is_active: true });

  const { data: ads = [] } = useQuery({
    queryKey: ["admin_ads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createAd = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("ads").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_ads"] });
      toast.success("Anúncio criado!");
      setForm({ title: "", url: "", image_url: "", placement: "home", is_active: true });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAd = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("ads").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_ads"] }),
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_ads"] });
      toast.success("Anúncio removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const placements: Record<string, string> = {
    home: "Página Inicial",
    search: "Pesquisa",
    product: "Produto",
    checkout: "Checkout",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: ads.length, color: "bg-primary/10 text-primary border-primary/20" },
          { label: "Ativos", value: ads.filter((a: any) => a.is_active).length, color: "bg-green-500/10 text-green-500 border-green-500/20" },
          { label: "Inativos", value: ads.filter((a: any) => !a.is_active).length, color: "bg-muted text-muted-foreground border-border" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Formulário */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Anúncios
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>

        {showForm && (
          <div className="space-y-2 mb-4 p-3 bg-muted rounded-lg">
            <input
              placeholder="Título do anúncio"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <input
              placeholder="URL de destino (https://...)"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <input
              placeholder="URL da imagem (https://...)"
              value={form.image_url}
              onChange={e => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <select
              value={form.placement}
              onChange={e => setForm({ ...form, placement: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            >
              {Object.entries(placements).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              onClick={() => createAd.mutate()}
              disabled={!form.title || !form.url || createAd.isPending}
              className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {createAd.isPending ? "A guardar..." : "Criar Anúncio"}
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-2">
          {ads.length === 0 && (
            <p className="text-center py-6 text-sm text-muted-foreground">Nenhum anúncio configurado.</p>
          )}
          {ads.map((ad: any) => (
            <div
              key={ad.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${ad.is_active ? "border-border bg-background" : "border-border bg-muted opacity-60"}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {ad.image_url && (
                  <img src={ad.image_url} alt={ad.title} className="w-8 h-8 rounded object-cover bg-muted flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {placements[ad.placement] || ad.placement}
                    {ad.url && <> · <span className="truncate">{ad.url.slice(0, 30)}…</span></>}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleAd.mutate({ id: ad.id, active: !ad.is_active })}
                  className={`p-1.5 rounded-lg ${ad.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteAd.mutate(ad.id)}
                  className="p-1.5 rounded-lg text-destructive bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Tab Leilões ───────────────────────────────────────────────────────────────
const AdminLeiloesTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [proofModal, setProofModal] = useState<any>(null);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodForm, setMethodForm] = useState({ type: "xpress", label: "", value: "", holder: "" });

  const { data: proofs = [] } = useQuery({
    queryKey: ["admin_bid_proofs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("auction_bid_proofs")
        .select("*, profiles:user_id(full_name), auctions:auction_id(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["auction_payment_methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_payment_methods")
        .select("*")
        .order("type");
      return data || [];
    },
  });

  const addMethod = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .insert({ ...methodForm, label: methodForm.label || methodForm.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Método adicionado!");
      setMethodForm({ type: "xpress", label: "", value: "", holder: "" });
      setShowMethodForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMethod = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] }),
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Removido");
    },
  });

  const reviewProof = useMutation({
    mutationFn: async ({ id, status, auctionId, userId, amount }: any) => {
      const { error } = await (supabase as any)
        .from("auction_bid_proofs")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        await (supabase as any).from("auction_bids").insert({ auction_id: auctionId, user_id: userId, amount });
        await (supabase as any).from("auctions").update({ current_bid: amount }).eq("id", auctionId).lt("current_bid", amount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_bid_proofs"] });
      queryClient.invalidateQueries({ queryKey: ["public_auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auction_bids"] });
      setProofModal(null);
      toast.success("Comprovante processado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getProofUrl = async (path: string) => {
    const { data } = await (supabase as any).storage.from("bid-proofs").createSignedUrl(path, 60);
    return data?.signedUrl;
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Métodos de Pagamento
          </h2>
          <button onClick={() => setShowMethodForm(!showMethodForm)} className="text-xs font-bold text-primary flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {showMethodForm && (
          <div className="space-y-2 mb-3 p-3 bg-muted rounded-lg">
            <select value={methodForm.type} onChange={e => setMethodForm({ ...methodForm, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground">
              <option value="xpress">Xpress</option>
              <option value="iban">IBAN / TPA</option>
              <option value="outro">Outro</option>
            </select>
            {methodForm.type === "outro" && (
              <input placeholder="Nome do método" value={methodForm.label} onChange={e => setMethodForm({ ...methodForm, label: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
            )}
            <input
              placeholder={methodForm.type === "xpress" ? "Número Xpress" : methodForm.type === "iban" ? "IBAN" : "Valor/Número"}
              value={methodForm.value}
              onChange={e => setMethodForm({ ...methodForm, value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <input placeholder="Titular da conta" value={methodForm.holder} onChange={e => setMethodForm({ ...methodForm, holder: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
            <button onClick={() => addMethod.mutate()} disabled={!methodForm.value || addMethod.isPending} className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50">
              {addMethod.isPending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {methods.map((m: any) => (
            <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${m.is_active ? "border-border bg-background" : "border-border bg-muted opacity-60"}`}>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {m.type === "xpress" ? "Xpress" : m.type === "iban" ? "IBAN" : m.label}
                </p>
                <p className="text-sm font-bold text-foreground">{m.value}</p>
                {m.holder && <p className="text-[10px] text-muted-foreground">{m.holder}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleMethod.mutate({ id: m.id, active: !m.is_active })} className={`p-1.5 rounded-lg ${m.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button onClick={() => deleteMethod.mutate(m.id)} className="p-1.5 rounded-lg text-destructive bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {methods.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum método configurado.</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Pendentes", status: "pending", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
          { label: "Aprovados", status: "approved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
          { label: "Rejeitados", status: "rejected", color: "bg-red-500/10 text-red-500 border-red-500/20" },
        ].map(s => (
          <div key={s.status} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">{proofs.filter((p: any) => p.status === s.status).length}</p>
            <p className="text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {proofs.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum comprovante submetido.</p>}
        {proofs.map((p: any) => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">{p.profiles?.full_name || "Anónimo"}</p>
                <p className="text-[10px] text-muted-foreground">{p.auctions?.title || "—"}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === "pending" ? "bg-amber-500/10 text-amber-500" : p.status === "approved" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                {p.status === "pending" ? "Pendente" : p.status === "approved" ? "Aprovado" : "Rejeitado"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Lance: <span className="font-bold text-foreground">{Number(p.amount).toLocaleString("pt-AO")} Kz</span></span>
              {p.reference && <span>Ref: {p.reference}</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => { const url = await getProofUrl(p.proof_url); setProofModal({ ...p, signedUrl: url }); }}
                className="flex-1 py-1.5 bg-muted text-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Ver
              </button>
              {p.status === "pending" && (
                <>
                  <button
                    onClick={() => reviewProof.mutate({ id: p.id, status: "approved", auctionId: p.auction_id, userId: p.user_id, amount: p.amount })}
                    className="flex-1 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => reviewProof.mutate({ id: p.id, status: "rejected", auctionId: p.auction_id, userId: p.user_id, amount: p.amount })}
                    className="flex-1 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setProofModal(null)}>
          <div className="bg-card border border-border rounded-xl p-4 w-[92vw] max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-foreground mb-3">Comprovante</h3>
            <div className="text-xs space-y-1 mb-3">
              <p className="text-muted-foreground">Utilizador: <span className="font-bold text-foreground">{proofModal.profiles?.full_name || "—"}</span></p>
              <p className="text-muted-foreground">Leilão: <span className="font-bold text-foreground">{proofModal.auctions?.title || "—"}</span></p>
              <p className="text-muted-foreground">Valor: <span className="font-bold text-green-500">{Number(proofModal.amount).toLocaleString("pt-AO")} Kz</span></p>
              {proofModal.reference && <p className="text-muted-foreground">Ref: <span className="font-bold text-foreground">{proofModal.reference}</span></p>}
            </div>
            {proofModal.signedUrl && (
              <img src={proofModal.signedUrl} alt="Comprovante" className="w-full rounded-lg mb-3 max-h-64 object-contain bg-muted" />
            )}
            <button onClick={() => setProofModal(null)} className="w-full py-2 bg-muted text-foreground text-xs font-bold rounded-lg">Fechar</button>
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("utilizadores");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [membersModal, setMembersModal] = useState<{ id: string; name: string } | null>(null);

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
    { key: "categorias",   label: "Categorias",   icon: FolderTree },
    { key: "cargos",       label: "Cargos",        icon: Crown },
    { key: "vendedores",   label: "Vendedores",    icon: Store },
    { key: "empresas",     label: "Empresas",      icon: Building2 },
    { key: "encomendas",   label: "Encomendas",    icon: ShoppingBag },
    { key: "banners",      label: "Banners",       icon: ImageIcon },
    { key: "publicidade",  label: "Publicidade",   icon: Megaphone },
    { key: "pedidos",      label: "Candidaturas",  icon: UserCheck },
    { key: "leiloes",      label: "Leilões",       icon: Gavel },
    { key: "definicoes",   label: "Definições",    icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Administração</h1>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "utilizadores" && <AdminUsersTab />}
        {tab === "categorias"   && <AdminCategoriesTab />}
        {tab === "publicidade"  && <AdminAdsTab />}
        {tab === "encomendas"   && <AdminOrdersTab />}
        {tab === "banners"      && <AdminBannersTab />}
        {tab === "definicoes"   && <AdminSettingsTab />}
        {tab === "leiloes"      && <AdminLeiloesTab />}

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
