import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Store, Package, ShoppingBag, DollarSign,
  BarChart3, ArrowLeft, Plus, Trash2, Eye,
  EyeOff, TrendingUp, Star, AlertCircle,
  ExternalLink, Settings,
} from "lucide-react";

type Tab = "visao" | "produtos" | "pedidos" | "ganhos" | "perfil";

export default function DropshipDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("visao");

  // Buscar loja
  const { data: store, isLoading } = useQuery({
    queryKey: ["my_dropship_store", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dropship_stores")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar produtos da loja
  const { data: products = [] } = useQuery({
    queryKey: ["dropship_store_products", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dropship_store_products")
        .select("*, supplier_products(name, cost_price, stock_quantity, category, images)")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Buscar pedidos
  const { data: orders = [] } = useQuery({
    queryKey: ["dropship_orders", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_orders")
        .select("*, supplier_order_items(*, supplier_products(name))")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("dropship_store_products")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropship_store_products"] });
      toast.success("Estado actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("dropship_store_products")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropship_store_products"] });
      toast.success("Produto removido da loja");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatKz = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const statusColor: Record<string, string> = {
    pending:   "bg-amber-500/10 text-amber-500",
    confirmed: "bg-blue-500/10 text-blue-500",
    shipped:   "bg-purple-500/10 text-purple-500",
    delivered: "bg-green-500/10 text-green-500",
    cancelled: "bg-destructive/10 text-destructive",
  };

  const statusLabel: Record<string, string> = {
    pending:   "Pendente",
    confirmed: "Confirmado",
    shipped:   "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem loja
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Ainda não tens loja</h2>
          <p className="text-sm text-muted-foreground">
            Cria a tua loja dropshipping para começares a vender produtos de fornecedores.
          </p>
          <button
            onClick={() => navigate("/criar-loja")}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Criar Loja
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "visao",    label: "Visão Geral", icon: BarChart3   },
    { key: "produtos", label: "Produtos",    icon: Package     },
    { key: "pedidos",  label: "Pedidos",     icon: ShoppingBag },
    { key: "ganhos",   label: "Ganhos",      icon: DollarSign  },
    { key: "perfil",   label: "Perfil",      icon: Settings    },
  ];

  const totalRevenue = orders
    .filter((o: any) => o.status === "delivered")
    .reduce((sum: number, o: any) => {
      const items = o.supplier_order_items || [];
      return sum + items.reduce((s: number, i: any) => s + (i.dropshipper_amount || 0), 0);
    }, 0);

  const pendingRevenue = orders
    .filter((o: any) => o.status !== "delivered" && o.status !== "cancelled")
    .reduce((sum: number, o: any) => {
      const items = o.supplier_order_items || [];
      return sum + items.reduce((s: number, i: any) => s + (i.dropshipper_amount || 0), 0);
    }, 0);

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">Painel Dropshipping</p>
            <h1 className="text-lg font-bold text-foreground leading-tight truncate">{store.store_name}</h1>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${
            store.status === "active" ? "bg-green-500/10 text-green-500" : store.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"
          }`}>
            {store.status === "active" ? "Activa" : store.status === "pending" ? "Pendente" : "Suspensa"}
          </span>
        </div>

        {store.status !== "active" && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">O Admin precisa aprovar esta candidatura antes da loja importar produtos e aparecer como vendedor normal.</p>
          </div>
        )}

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Produtos",  value: products.length,       icon: Package,     color: "text-primary"    },
            { label: "Pedidos",   value: orders.length,         icon: ShoppingBag, color: "text-amber-500"  },
            { label: "Receita",   value: formatKz(totalRevenue), icon: TrendingUp,  color: "text-green-500"  },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap flex-shrink-0 ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── VISÃO GERAL ── */}
        {tab === "visao" && (
          <div className="space-y-3">

            {/* Acesso rápido ao catálogo */}
            <button
              onClick={() => store.status === "active" ? navigate("/catalogo-fornecedores") : toast.error("A tua candidatura ainda está pendente de aprovação do Admin.")}
              className="w-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Adicionar Produtos</p>
                  <p className="text-[10px] text-muted-foreground">Ver catálogo de fornecedores</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-primary" />
            </button>

            {/* Resumo financeiro */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Resumo Financeiro</h3>
              {[
                { label: "Receita total",    value: formatKz(totalRevenue),    color: "text-green-500"  },
                { label: "A receber",        value: formatKz(pendingRevenue),  color: "text-amber-500"  },
                { label: "Pedidos activos",  value: orders.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled").length, color: "text-foreground" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Produtos mais vendidos */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Produtos na Loja</h3>
              {products.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {p.supplier_products?.images?.[0] ? (
                      <img src={p.supplier_products.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.supplier_products?.name || "Produto"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{p.total_sold} vendas</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatKz(p.selling_price)}</p>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">Ainda sem produtos na loja</p>
                  <button
                    onClick={() => navigate("/catalogo-fornecedores")}
                    className="text-primary text-xs font-bold mt-1"
                  >
                    Ver catálogo →
                  </button>
                </div>
              )}
            </div>

            {/* Avaliação */}
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {store.rating > 0 ? store.rating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Avaliação média da loja</p>
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUTOS ── */}
        {tab === "produtos" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                Produtos da Loja ({products.length})
              </h2>
              <button
                onClick={() => navigate("/catalogo-fornecedores")}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Ainda não adicionaste produtos</p>
                <button
                  onClick={() => navigate("/catalogo-fornecedores")}
                  className="text-primary text-sm font-bold mt-1"
                >
                  Ver catálogo de fornecedores →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p: any) => {
                  const sp = p.supplier_products;
                  const margin = sp?.cost_price
                    ? ((p.selling_price - sp.cost_price) / p.selling_price * 100).toFixed(0)
                    : null;

                  return (
                    <div
                      key={p.id}
                      className={`bg-card border border-border rounded-xl p-3 ${!p.is_active ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {sp?.images?.[0] ? (
                            <img src={sp.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">
                            {sp?.name || "Produto"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{sp?.category}</p>
                          <div className="flex gap-3 mt-1.5">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Venda</p>
                              <p className="text-sm font-bold text-primary">{formatKz(p.selling_price)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Custo</p>
                              <p className="text-sm font-bold text-foreground">{formatKz(sp?.cost_price || 0)}</p>
                            </div>
                            {margin && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">Margem</p>
                                <p className="text-sm font-bold text-green-500">{margin}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => toggleProduct.mutate({ id: p.id, active: !p.is_active })}
                            className="p-2 hover:bg-accent rounded-lg text-muted-foreground"
                          >
                            {p.is_active
                              ? <Eye className="w-4 h-4" />
                              : <EyeOff className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => removeProduct.mutate(p.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Pedidos da Loja</h2>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Ainda não há pedidos</p>
              </div>
            ) : (
              orders.map((order: any) => {
                const items = order.supplier_order_items || [];
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm text-foreground">
                          Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-AO")} •{" "}
                          {items.length} {items.length === 1 ? "item" : "itens"}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColor[order.status] || "bg-muted text-muted-foreground"}`}>
                        {statusLabel[order.status] || order.status}
                      </span>
                    </div>

                    {items.slice(0, 2).map((item: any) => (
                      <div key={item.id} className="text-xs text-muted-foreground py-1 border-b border-border last:border-0">
                        {item.supplier_products?.name || "Produto"} × {item.quantity}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <p className="text-[10px] text-muted-foreground mt-1">+{items.length - 2} mais</p>
                    )}

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                        <p className="font-bold text-sm text-foreground">{formatKz(order.total_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">O teu lucro</p>
                        <p className="font-bold text-sm text-green-500">
                          {formatKz(
                            items.reduce((s: number, i: any) => s + (i.dropshipper_amount || 0), 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── GANHOS ── */}
        {tab === "ganhos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Os meus Ganhos</h2>

            <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Total acumulado</p>
              <p className="text-3xl font-bold mt-1">{formatKz(totalRevenue)}</p>
              <p className="text-xs opacity-60 mt-1">
                {orders.filter((o: any) => o.status === "delivered").length} pedidos entregues
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">A receber</p>
                <p className="font-bold text-amber-500 mt-1">{formatKz(pendingRevenue)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">Produtos activos</p>
                <p className="font-bold text-primary mt-1">
                  {products.filter((p: any) => p.is_active).length}
                </p>
              </div>
            </div>

            <button className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm">
              Pedir Pagamento
            </button>

            <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Os pagamentos são processados após confirmação de entrega, em 2 a 5 dias úteis.
              </p>
            </div>
          </div>
        )}

        {/* ── PERFIL ── */}
        {tab === "perfil" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Perfil da Loja</h2>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {[
                { label: "Nome da Loja",  value: store.store_name  },
                { label: "Slug / URL",    value: store.store_slug  },
                { label: "Província",     value: store.province    },
                { label: "Telefone",      value: store.phone || "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>

            {store.description && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm text-foreground">{store.description}</p>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {store.rating > 0 ? store.rating.toFixed(1) : "Sem avaliações"}
                </p>
                <p className="text-[10px] text-muted-foreground">Avaliação da loja</p>
              </div>
            </div>

            <div className="bg-muted border border-border rounded-xl p-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Para editar os dados da loja, contacta o suporte Zangu.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
