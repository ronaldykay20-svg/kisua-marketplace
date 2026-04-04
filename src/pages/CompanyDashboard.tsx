import { useState, useRef } from "react";
import { Building2, Package, Plus, Edit, Trash2, Eye, EyeOff, Users, UserPlus, Save, X, Crown, ShieldCheck, Image as ImageIcon, Camera, Search, ShoppingCart } from "lucide-react";
import SellerProductForm from "@/components/seller/SellerProductForm";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CompanyDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"produtos" | "membros" | "perfil">("produtos");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Get my company membership
  const { data: membership } = useQuery({
    queryKey: ["my_company_membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Fetch company separately
      const { data: comp, error: compErr } = await supabase.from("companies").select("*").eq("id", data.company_id).single();
      if (compErr) throw compErr;
      return { ...data, companies: comp };
    },
    enabled: !!user,
  });

  const company = membership?.companies as any;
  const myRole = membership?.role;
  const isOwner = myRole === "owner";
  const canEdit = myRole === "owner" || myRole === "manager" || myRole === "editor";
  const canManageMembers = myRole === "owner" || myRole === "manager";

  // Profile edit state
  const [profileForm, setProfileForm] = useState<any>(null);

  // Company products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["company_products", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("company_id", company!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company,
  });

  // Company members
  const { data: members = [] } = useQuery({
    queryKey: ["company_members", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_members").select("*").eq("company_id", company!.id).order("role");
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      const pMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      return data.map((m: any) => ({ ...m, profiles: pMap[m.user_id] || null }));
    },
    enabled: !!company,
  });

  // Search users to add as member
  const { data: searchResults = [] } = useQuery({
    queryKey: ["search_users_for_company", memberSearch],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url").ilike("full_name", `%${memberSearch}%`).limit(10);
      if (error) throw error;
      const memberIds = members.map((m: any) => m.user_id);
      return (data || []).filter((p: any) => !memberIds.includes(p.id));
    },
    enabled: memberSearch.length >= 2,
  });

  // Load media for editing product
  const { data: editingMedia = [] } = useQuery({
    queryKey: ["company_product_media", editingProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media").select("*").eq("product_id", editingProduct!.id).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!editingProduct?.id,
  });

  // Load variants for editing product
  const { data: editingVariants = [] } = useQuery({
    queryKey: ["company_product_variants_edit", editingProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", editingProduct!.id).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!editingProduct?.id,
  });

  // Load cover images for product list
  const { data: productCovers = {} } = useQuery({
    queryKey: ["company_product_covers", company?.id],
    queryFn: async () => {
      const productIds = products.map((p: any) => p.id);
      if (productIds.length === 0) return {};
      const { data, error } = await supabase.from("product_media").select("product_id, url").in("product_id", productIds).eq("is_cover", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((m: any) => { map[m.product_id] = m.url; });
      return map;
    },
    enabled: products.length > 0,
  });

  const saveProduct = useMutation({
    mutationFn: async ({ payload, media, variants }: { payload: any; media: any[]; variants?: any[] }) => {
      const fullPayload = { ...payload, company_id: company!.id, is_active: true };
      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from("products").update(fullPayload).eq("id", editingProduct.id);
        if (error) throw error;
        await supabase.from("product_media").delete().eq("product_id", editingProduct.id);
        await supabase.from("product_variants").delete().eq("product_id", editingProduct.id);
      } else {
        const { data, error } = await supabase.from("products").insert(fullPayload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      if (media.length > 0 && productId) {
        const mediaRows = media.map((m: any, i: number) => ({
          product_id: productId, url: m.url, type: m.type, is_cover: m.is_cover, sort_order: i,
        }));
        await supabase.from("product_media").insert(mediaRows);
      }

      if (variants && variants.length > 0 && productId) {
        const parents = variants.filter((v: any) => v.name && !v.parent_id);
        const tempIdToDbId: Record<string, string> = {};
        for (let i = 0; i < parents.length; i++) {
          const v = parents[i];
          const row = {
            product_id: productId, variant_type: v.variant_type, name: v.name,
            value: v.value || null, price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock: parseInt(v.stock) || 0, image_url: v.image_url || null,
            sort_order: i, is_active: true, parent_id: null,
          };
          const { data, error } = await supabase.from("product_variants").insert(row).select("id").single();
          if (error) throw error;
          tempIdToDbId[v._tempId] = data.id;
        }
        const children = variants.filter((v: any) => v.name && v.parent_id);
        if (children.length > 0) {
          const childRows = children.map((v: any, i: number) => ({
            product_id: productId, variant_type: v.variant_type, name: v.name,
            value: v.value || null, price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock: parseInt(v.stock) || 0, image_url: v.image_url || null,
            sort_order: i, is_active: true, parent_id: tempIdToDbId[v.parent_id] || null,
          }));
          await supabase.from("product_variants").insert(childRows);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_products"] });
      queryClient.invalidateQueries({ queryKey: ["company_product_covers"] });
      queryClient.invalidateQueries({ queryKey: ["company_product_media"] });
      toast.success(editingProduct ? "Produto atualizado!" : "Produto adicionado!");
      setShowForm(false);
      setEditingProduct(null);
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company_products"] }); toast.success("Produto removido"); },
  });

  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (members.length >= 11) throw new Error("Limite de 11 membros atingido (10 + dono)");
      const { error } = await supabase.from("company_members").insert({ company_id: company!.id, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_members"] });
      setMemberSearch("");
      toast.success("Membro adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company_members"] }); toast.success("Membro removido"); },
  });

  const uploadCompanyPhoto = async (file: File, field: "logo_url" | "banner_url") => {
    const ext = file.name.split(".").pop();
    const path = `companies/${company.id}/${field === "logo_url" ? "logo" : "banner"}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("sellers").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("sellers").getPublicUrl(path);
    const { error } = await supabase.from("companies").update({ [field]: publicUrl }).eq("id", company.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["my_company_membership"] });
    toast.success(field === "logo_url" ? "Foto de perfil atualizada" : "Foto de capa atualizada");
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update({
        description: profileForm.description, phone: profileForm.phone, email: profileForm.email,
        website: profileForm.website, address: profileForm.address,
      }).eq("id", company.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_company_membership"] });
      toast.success("Perfil atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
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
        {/* Header with editable banner/logo */}
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
          <div className="relative h-24 bg-muted overflow-hidden group" onClick={isOwner ? () => bannerRef.current?.click() : undefined}>
            {company.banner_url ? (
              <img src={company.banner_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>
            )}
            {isOwner && (
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 flex items-center justify-center cursor-pointer transition">
                <Camera className="w-6 h-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition" />
              </div>
            )}
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCompanyPhoto(f, "banner_url"); }} />
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-end gap-3 -mt-8 relative z-10">
              <div className="w-16 h-16 rounded-full bg-card border-4 border-card overflow-hidden flex items-center justify-center group relative" onClick={isOwner ? () => logoRef.current?.click() : undefined}>
                {company.logo_url ? (
                  <img src={company.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-primary" />
                )}
                {isOwner && (
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 flex items-center justify-center rounded-full cursor-pointer transition">
                    <Camera className="w-4 h-4 text-primary-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCompanyPhoto(f, "logo_url"); }} />
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-lg font-bold text-foreground flex items-center gap-1">
                  {company.name}
                  {company.is_verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                </h1>
                <p className="text-[10px] text-muted-foreground">Cargo: {roleLabel[myRole] || myRole}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("produtos")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "produtos" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
            <Package className="w-4 h-4 inline mr-1" /> Produtos ({products.length})
          </button>
          <button onClick={() => setTab("membros")} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "membros" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
            <Users className="w-4 h-4 inline mr-1" /> Membros ({members.length})
          </button>
          {isOwner && (
            <button onClick={() => { setTab("perfil"); if (!profileForm) setProfileForm({ description: company.description || "", phone: company.phone || "", email: company.email || "", website: company.website || "", address: company.address || "" }); }} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${tab === "perfil" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <Edit className="w-4 h-4 inline mr-1" /> Perfil
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

        {tab === "membros" && (
          <div>
            {/* Existing members */}
            <div className="space-y-2 mb-4">
              {members.map((m: any) => (
                <div key={m.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {m.profiles?.avatar_url ? (
                        <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{m.profiles?.full_name || m.user_id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {m.role === "owner" && <Crown className="w-3 h-3 text-amber-500" />}
                        {roleLabel[m.role] || m.role}
                      </p>
                    </div>
                  </div>
                  {canManageMembers && m.role !== "owner" && m.user_id !== user?.id && (
                    <button onClick={() => removeMember.mutate(m.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add member */}
            {canManageMembers && members.length < 11 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1"><UserPlus className="w-4 h-4" /> Adicionar Membro</h3>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" placeholder="Pesquisar utilizador..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
                </div>
                {memberSearch.length >= 2 && searchResults.length > 0 && (
                  <div className="bg-muted rounded-lg border border-border max-h-40 overflow-y-auto">
                    {searchResults.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent transition">
                        <span className="text-sm text-foreground">{p.full_name || p.id.slice(0, 8)}</span>
                        <div className="flex gap-1">
                          {["editor", "viewer"].map(role => (
                            <button key={role} onClick={() => addMember.mutate({ userId: p.id, role })}
                              className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition">
                              {roleLabel[role]}
                            </button>
                          ))}
                          {isOwner && (
                            <button onClick={() => addMember.mutate({ userId: p.id, role: "manager" })}
                              className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition">
                              Gestor
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {memberSearch.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum utilizador encontrado.</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{members.length}/11 membros</p>
              </div>
            )}
          </div>
        )}

        {tab === "perfil" && isOwner && profileForm && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Editar Perfil da Empresa</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sobre Nós</label>
              <textarea value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-24 resize-none" placeholder="Descrição da empresa..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="+244..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="email@empresa.co.ao" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Website</label>
              <input value={profileForm.website} onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
              <input value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" placeholder="Luanda, Angola" />
            </div>
            <button onClick={() => saveProfile.mutate()} className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg">
              <Save className="w-4 h-4 inline mr-1" /> Guardar Alterações
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CompanyDashboard;
