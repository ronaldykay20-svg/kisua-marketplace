import { useState } from "react";
import { Store, Package, Plus, Edit, Trash2, Eye, EyeOff, ShoppingCart, Settings, Image as ImageIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SellerProductForm from "@/components/seller/SellerProductForm";
import SellerProfileEditor from "@/components/seller/SellerProfileEditor";

type Tab = "produtos" | "perfil";

const SellerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("produtos");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data: seller } = useQuery({
    queryKey: ["my_seller", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["seller_products", seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("seller_id", seller!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!seller,
  });

  // Load media for editing product
  const { data: editingMedia = [] } = useQuery({
    queryKey: ["product_media", editingProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media").select("*").eq("product_id", editingProduct!.id).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!editingProduct?.id,
  });

  // Load cover images for product list
  const { data: productCovers = {} } = useQuery({
    queryKey: ["product_covers", seller?.id],
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

  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.is_active).length;

  const saveProduct = useMutation({
    mutationFn: async ({ payload, media, variants }: { payload: any; media: any[]; variants?: any[] }) => {
      const fullPayload = { ...payload, seller_id: seller!.id, is_active: true };
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

      // Insert media
      if (media.length > 0 && productId) {
        const mediaRows = media.map((m: any, i: number) => ({
          product_id: productId, url: m.url, type: m.type, is_cover: m.is_cover, sort_order: i,
        }));
        const { error } = await supabase.from("product_media").insert(mediaRows);
        if (error) throw error;
      }

      // Insert variants with parent_id support
      if (variants && variants.length > 0 && productId) {
        // First insert parent variants (no parent_id)
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

        // Then insert children with resolved parent_id
        const children = variants.filter((v: any) => v.name && v.parent_id);
        if (children.length > 0) {
          const childRows = children.map((v: any, i: number) => ({
            product_id: productId, variant_type: v.variant_type, name: v.name,
            value: v.value || null, price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock: parseInt(v.stock) || 0, image_url: v.image_url || null,
            sort_order: i, is_active: true,
            parent_id: tempIdToDbId[v.parent_id] || null,
          }));
          const { error } = await supabase.from("product_variants").insert(childRows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_products"] });
      queryClient.invalidateQueries({ queryKey: ["product_covers"] });
      queryClient.invalidateQueries({ queryKey: ["product_media"] });
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seller_products"] }); toast.success("Estado alterado"); },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seller_products"] }); toast.success("Produto removido"); },
  });

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
            {seller.logo_url ? (
              <img src={seller.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
            ) : (
              <Store className="w-6 h-6 text-primary" />
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">{seller.name}</h1>
              <p className="text-[10px] text-muted-foreground">{seller.is_verified && "✅ Verificado • "}Painel do Vendedor</p>
            </div>
          </div>
          {tab === "produtos" && (
            <button onClick={() => { setEditingProduct(null); setShowForm(true); }}
              className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg">
              <Plus className="w-4 h-4" /> Produto
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {([
            { key: "produtos" as Tab, label: "Produtos", icon: Package },
            { key: "perfil" as Tab, label: "Perfil", icon: Settings },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ═══ PRODUTOS ═══ */}
        {tab === "produtos" && (
          <>
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

            {/* Form */}
            {showForm && (
              <SellerProductForm
                editingProduct={editingProduct}
                existingMedia={editingProduct ? editingMedia : []}
                onSave={(data, media, variants) => saveProduct.mutate({ payload: data, media, variants })}
                onCancel={() => { setShowForm(false); setEditingProduct(null); }}
                saving={saveProduct.isPending}
              />
            )}

            {/* Products List */}
            <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" /> Meus Produtos ({totalProducts})
            </h2>
            <div className="space-y-2">
              {products.map((p: any) => {
                const coverUrl = (productCovers as any)[p.id] || p.image_url;
                return (
                  <div key={p.id} className={`bg-card rounded-xl border border-border p-3 flex gap-3 ${!p.is_active ? "opacity-60" : ""}`}>
                    <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                      {coverUrl ? (
                        <img src={coverUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 m-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{p.title}</h3>
                      <p className="text-xs text-primary font-bold">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{p.is_active ? "Ativo" : "Inativo"}</span>
                        {p.stock != null && <span>• Stock: {p.stock}</span>}
                        {p.badge && <span className="text-primary font-bold">• {p.badge}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setEditingProduct(p); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                        {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteProduct.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
              {!isLoading && products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhum produto. Adicione o primeiro!</div>
              )}
            </div>
          </>
        )}

        {/* ═══ PERFIL ═══ */}
        {tab === "perfil" && <SellerProfileEditor seller={seller} />}
      </div>
      <BottomNav />
    </div>
  );
};

export default SellerDashboard;
