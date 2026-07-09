import { useState } from "react";
import { Shield, Package, Store, Search, Eye, EyeOff, ShieldCheck, CheckCircle, XCircle, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Tab = "produtos" | "vendedores" | "pedidos";

const ModeratorPanel = () => {
  const { user } = useAuth();
  const { isModerator, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("produtos");
  const [search, setSearch] = useState("");

  // Products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["mod_products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*, sellers(name)").order("created_at", { ascending: false }).limit(50);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: tab === "produtos",
  });

  const toggleProductActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mod_products"] }); toast.success("Estado alterado"); },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("products").update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mod_products"] }); toast.success("Destaque atualizado"); },
  });

  // Sellers
  const { data: sellers = [] } = useQuery({
    queryKey: ["mod_sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: tab === "vendedores",
  });

  const toggleVerifySeller = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("sellers").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mod_sellers"] }); toast.success("Vendedor atualizado"); },
  });

  // Applications
  const { data: applications = [] } = useQuery({
    queryKey: ["mod_applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seller_applications").select("*, profiles:user_id(full_name)").eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: tab === "pedidos",
  });

  const reviewApp = useMutation({
    mutationFn: async ({ id, status, userId, name }: { id: string; status: string; userId: string; name: string }) => {
      const { error } = await supabase.from("seller_applications").update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        await supabase.from("sellers").insert({ name, slug, user_id: userId, type: "individual" as any, is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod_applications"] });
      toast.success("Pedido processado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isModerator && !isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <div className="container mx-auto px-3 py-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-2">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">Precisas de cargo de moderador para aceder.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "produtos", label: "Produtos", icon: Package },
    { key: "vendedores", label: "Vendedores", icon: Store },
    { key: "pedidos", label: "Pedidos", icon: UserCheck },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-amber-500" />
          <h1 className="text-lg font-bold text-foreground">Painel do Moderador</h1>
        </div>

        <div className="flex gap-1 mb-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* PRODUTOS */}
        {tab === "produtos" && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Pesquisar produtos..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground" />
            </div>
            <div className="space-y-2">
              {products.map((p: any) => (
                <div key={p.id} className={`bg-card rounded-xl border border-border p-3 ${!p.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-primary font-bold">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                      <p className="text-[10px] text-muted-foreground">{(p as any).sellers?.name || "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleProductActive.mutate({ id: p.id, active: !p.is_active })} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                        {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => toggleFeatured.mutate({ id: p.id, featured: !p.is_featured })}
                        className={`p-1.5 rounded-lg ${p.is_featured ? "text-amber-500" : "text-muted-foreground"} hover:bg-accent`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {!loadingProducts && products.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum produto.</p>}
            </div>
          </>
        )}

        {/* VENDEDORES */}
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
                      <p className="text-[10px] text-muted-foreground">{s.type === "company" ? "Empresa" : s.type === "dropship" ? "Afiliado" : "Vendedor"} • {s.total_sales || 0} vendas</p>
                    </div>
                  </div>
                  <button onClick={() => toggleVerifySeller.mutate({ id: s.id, verified: !s.is_verified })}
                    className={`p-2 rounded-lg ${s.is_verified ? "text-blue-500 hover:bg-blue-500/10" : "text-muted-foreground hover:bg-accent"}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {sellers.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum vendedor.</p>}
          </div>
        )}

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div className="space-y-2">
            {applications.map((a: any) => (
              <div key={a.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.phone} • {a.province}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => reviewApp.mutate({ id: a.id, status: "approved", userId: a.user_id, name: a.name })}
                      className="p-2 rounded-lg text-green-500 hover:bg-green-500/10"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => reviewApp.mutate({ id: a.id, status: "rejected", userId: a.user_id, name: a.name })}
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {applications.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum pedido pendente.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorPanel;
