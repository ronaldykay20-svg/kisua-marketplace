import { useState } from "react";
import { Building2, Package, Plus, Edit, Trash2, Eye, EyeOff, Users, UserPlus, Save, X, Crown, ShieldCheck, Image as ImageIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CompanyDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"produtos" | "membros">("produtos");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", old_price: "", image_url: "", category_id: "", free_shipping: false });
  const [memberEmail, setMemberEmail] = useState("");

  // Get my company membership
  const { data: membership } = useQuery({
    queryKey: ["my_company_membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*, companies(*)")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const company = membership?.companies as any;
  const myRole = membership?.role;
  const canEdit = myRole === "owner" || myRole === "manager" || myRole === "editor";
  const canManageMembers = myRole === "owner" || myRole === "manager";

  // Company products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["company_products", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company,
  });

  // Company members
  const { data: members = [] } = useQuery({
    queryKey: ["company_members", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*, profiles(full_name)")
        .eq("company_id", company!.id)
        .order("role");
      if (error) throw error;
      return data;
    },
    enabled: !!company && canManageMembers,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        old_price: form.old_price ? parseFloat(form.old_price) : null,
        image_url: form.image_url || null,
        category_id: form.category_id || null,
        free_shipping: form.free_shipping,
        company_id: company!.id,
        is_active: true,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_products"] });
      toast.success(editingProduct ? "Produto atualizado!" : "Produto adicionado!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company_products"] }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_products"] });
      toast.success("Produto removido");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_members"] });
      toast.success("Membro removido");
    },
  });

  const resetForm = () => {
    setForm({ title: "", description: "", price: "", old_price: "", image_url: "", category_id: "", free_shipping: false });
    setEditingProduct(null);
    setShowForm(false);
  };

  const startEdit = (p: any) => {
    setForm({
      title: p.title, description: p.description || "", price: String(p.price),
      old_price: p.old_price ? String(p.old_price) : "", image_url: p.image_url || "",
      category_id: p.category_id || "", free_shipping: p.free_shipping || false,
    });
    setEditingProduct(p);
    setShowForm(true);
  };

  const roleLabel: Record<string, string> = { owner: "Dono", manager: "Gestor", editor: "Editor", viewer: "Visualizador" };

  if (!company) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-3 py-8 text-center max-w-md">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">Sem empresa associada</h2>
          <p className="text-sm text-muted-foreground">A sua conta não pertence a nenhuma empresa. Contacte o administrador.</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1">
              {company.name}
              {company.is_verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
            </h1>
            <p className="text-[10px] text-muted-foreground">Cargo: {roleLabel[myRole] || myRole}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("produtos")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "produtos" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
            <Package className="w-4 h-4 inline mr-1" /> Produtos ({products.length})
          </button>
          {canManageMembers && (
            <button onClick={() => setTab("membros")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "membros" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <Users className="w-4 h-4 inline mr-1" /> Membros ({members.length})
            </button>
          )}
        </div>

        {tab === "produtos" && (
          <>
            {canEdit && (
              <button onClick={() => { resetForm(); setShowForm(true); }} className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Novo Produto
              </button>
            )}

            {showForm && canEdit && (
              <div className="bg-card rounded-xl border border-border p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground">{editingProduct ? "Editar" : "Novo"} Produto</h2>
                  <button onClick={resetForm}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3">
                  <input placeholder="Nome" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                  <textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-16 resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Preço (Kz)" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                    <input placeholder="Preço antigo" type="number" value={form.old_price} onChange={e => setForm({ ...form, old_price: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                  </div>
                  <input placeholder="URL imagem" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                    <option value="">Categoria</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => saveProduct.mutate()} disabled={!form.title || !form.price} className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50">
                    <Save className="w-4 h-4 inline mr-1" /> {editingProduct ? "Atualizar" : "Adicionar"}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {products.map((p: any) => (
                <div key={p.id} className={`bg-card rounded-xl border border-border p-3 flex gap-3 ${!p.is_active ? "opacity-60" : ""}`}>
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 m-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{p.title}</h3>
                    <p className="text-xs text-primary font-bold">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => startEdit(p)} className="p-1 rounded hover:bg-accent text-muted-foreground"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })} className="p-1 rounded hover:bg-accent text-muted-foreground">
                        {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteProduct.mutate(p.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
              {!isLoading && products.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Sem produtos ainda.</p>}
            </div>
          </>
        )}

        {tab === "membros" && canManageMembers && (
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{m.profiles?.full_name || m.user_id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabel[m.role] || m.role}</p>
                </div>
                {m.role !== "owner" && m.user_id !== user?.id && (
                  <button onClick={() => removeMember.mutate(m.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CompanyDashboard;
