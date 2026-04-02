import { useState } from "react";
import { Store, Package, Plus, Edit, Trash2, Eye, EyeOff, TrendingUp, ShoppingCart, Star, BarChart3, Image as ImageIcon, Save, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SellerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "", old_price: "", image_url: "", category_id: "", free_shipping: false });

  // Get seller profile
  const { data: seller } = useQuery({
    queryKey: ["my_seller", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get seller products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["seller_products", seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!seller,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Stats
  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.is_active).length;

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
        seller_id: seller!.id,
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
      queryClient.invalidateQueries({ queryKey: ["seller_products"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_products"] });
      toast.success("Estado alterado");
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_products"] });
      toast.success("Produto removido");
    },
  });

  const resetForm = () => {
    setForm({ title: "", description: "", price: "", old_price: "", image_url: "", category_id: "", free_shipping: false });
    setEditingProduct(null);
    setShowForm(false);
  };

  const startEdit = (p: any) => {
    setForm({
      title: p.title,
      description: p.description || "",
      price: String(p.price),
      old_price: p.old_price ? String(p.old_price) : "",
      image_url: p.image_url || "",
      category_id: p.category_id || "",
      free_shipping: p.free_shipping || false,
    });
    setEditingProduct(p);
    setShowForm(true);
  };

  if (!seller) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-3 py-8 text-center max-w-md">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">Sem loja de vendedor</h2>
          <p className="text-sm text-muted-foreground">A sua conta ainda não está associada a um perfil de vendedor. Contacte o administrador.</p>
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{seller.name}</h1>
              <p className="text-[10px] text-muted-foreground">
                {seller.is_verified && "✅ Verificado • "}Painel do Vendedor
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
          >
            <Plus className="w-4 h-4" /> Produto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{totalProducts}</p>
            <p className="text-[10px] text-muted-foreground">Produtos</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Eye className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-foreground">{activeProducts}</p>
            <p className="text-[10px] text-muted-foreground">Ativos</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold text-foreground">{seller.total_sales || 0}</p>
            <p className="text-[10px] text-muted-foreground">Vendas</p>
          </div>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
              <button onClick={resetForm} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Nome do produto"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
              <textarea
                placeholder="Descrição"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-20 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Preço (Kz)"
                  type="number"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
                <input
                  placeholder="Preço antigo (opcional)"
                  type="number"
                  value={form.old_price}
                  onChange={e => setForm({ ...form, old_price: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
              </div>
              <input
                placeholder="URL da imagem"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
              >
                <option value="">Selecionar categoria</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.free_shipping}
                  onChange={e => setForm({ ...form, free_shipping: e.target.checked })}
                  className="rounded"
                />
                Frete grátis
              </label>
              <button
                onClick={() => saveProduct.mutate()}
                disabled={!form.title || !form.price}
                className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-1" />
                {editingProduct ? "Atualizar" : "Adicionar"}
              </button>
            </div>
          </div>
        )}

        {/* Products List */}
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Package className="w-4 h-4" /> Meus Produtos ({totalProducts})
        </h2>
        <div className="space-y-2">
          {products.map((p: any) => (
            <div key={p.id} className={`bg-card rounded-xl border border-border p-3 flex gap-3 ${!p.is_active ? "opacity-60" : ""}`}>
              <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 m-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{p.title}</h3>
                <p className="text-xs text-primary font-bold">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                <p className="text-[10px] text-muted-foreground">{p.is_active ? "Ativo" : "Inativo"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                  {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteProduct.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {!isLoading && products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhum produto. Adicione o primeiro!</div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SellerDashboard;
