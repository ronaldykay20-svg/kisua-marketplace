import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package, TrendingUp, ShoppingBag, DollarSign,
  Plus, Edit2, Trash2, BarChart3, Bell, Star,
  AlertCircle, Clock, ArrowLeft, CheckCircle,
} from "lucide-react";

type Tab = "visao" | "produtos" | "pedidos" | "ganhos";

export default function FornecedorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("visao");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "", description: "", category: "",
    cost_price: "", suggested_price: "", min_price: "",
    stock_quantity: "", sku: "",
  });

  const CATEGORIES = [
    "Eletrônicos", "Calçados", "Vestuário", "Acessórios",
    "Casa e Jardim", "Beleza", "Desporto", "Alimentação", "Outros",
  ];

  // Buscar dados do fornecedor
  const { data: supplier, isLoading } = useQuery({
    queryKey: ["my_supplier", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar produtos
  const { data: products = [] } = useQuery({
    queryKey: ["supplier_products", supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", supplier!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!supplier?.id,
  });

  // Buscar pedidos
  const { data: orders = [] } = useQuery({
    queryKey: ["supplier_orders_items", supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_order_items")
        .select("*, supplier_orders(id, created_at, status), supplier_products(name)")
        .eq("supplier_id", supplier!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!supplier?.id,
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      if (!supplier) return;
      const { error } = await supabase.from("supplier_products").insert({
        supplier_id: supplier.id,
        name: productForm.name,
        description: productForm.description || null,
        category: productForm.category || null,
        cost_price: parseFloat(productForm.cost_price),
        suggested_price: productForm.suggested_price ? parseFloat(productForm.suggested_price) : null,
        min_price: productForm.min_price ? parseFloat(productForm.min_price) : null,
        stock_quantity: parseInt(productForm.stock_quantity),
        sku: productForm.sku || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_products"] });
      toast.success("Produto adicionado!");
      setShowAddProduct(false);
      setProductForm({ name: "", description: "", category: "", cost_price: "", suggested_price: "", min_price: "", stock_quantity: "", sku: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier_products"] }); toast.success("Produto removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("supplier_order_items").update({ supplier_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier_orders_items"] }); toast.success("Estado actualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const formatKz = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const statusColor: Record<string, string> = {
    pending:    "bg-amber-500/10 text-amber-500",
    approved:   "bg-green-500/10 text-green-500",
    active:     "bg-green-500/10 text-green-500",
    confirmed:  "bg-blue-500/10 text-blue-500",
    shipped:    "bg-purple-500/10 text-purple-500",
    delivered:  "bg-green-500/10 text-green-500",
    suspended:  "bg-destructive/10 text-destructive",
    out_of_stock: "bg-muted text-muted-foreground",
  };

  const statusLabel: Record<string, string> = {
    pending:      "Pendente",
    approved:     "Aprovado",
    active:       "Activo",
    confirmed:    "Confirmado",
    shipped:      "Enviado",
    delivered:    "Entregue",
    suspended:    "Suspenso",
    out_of_stock: "Sem stock",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem conta de fornecedor
  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Ainda não és Fornecedor</h2>
          <p className="text-sm text-muted-foreground">Regista a tua empresa para começares a fornecer produtos à rede de dropshippers do Zangu.</p>
          <button
            onClick={() => navigate("/seja-fornecedor")}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Registar como Fornecedor
          </button>
        </div>
      </div>
    );
  }

  // Pedido pendente
  if (supplier.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Pedido em Análise</h2>
          <p className="text-sm text-muted-foreground">
            O teu pedido está a ser verificado pela equipa. Receberás uma notificação em 24 a 48 horas.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 text-left">
            <p className="text-sm font-bold text-foreground">{supplier.company_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Submetido — aguarda aprovação</p>
          </div>
          <button onClick={() => navigate("/")} className="w-full py-3 border border-border rounded-xl text-sm font-bold text-foreground">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "visao",    label: "Visão Geral", icon: BarChart3 },
    { key: "produtos", label: "Produtos",    icon: Package },
    { key: "pedidos",  label: "Pedidos",     icon: ShoppingBag },
    { key: "ganhos",   label: "Ganhos",      icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">Painel do Fornecedor</p>
            <h1 className="text-lg font-bold text-foreground leading-tight">{supplier.company_name}</h1>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColor[supplier.status]}`}>
            {statusLabel[supplier.status]}
          </span>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Produtos", value: products.length,  icon: Package,    color: "text-primary" },
            { label: "Pedidos",  value: orders.length,    icon: ShoppingBag, color: "text-amber-500" },
            { label: "Receita",  value: formatKz(supplier.total_revenue || 0), icon: TrendingUp, color: "text-green-500" },
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
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{supplier.rating > 0 ? supplier.rating.toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">Avaliação média</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Resumo Financeiro</h3>
              {[
                { label: "Total de Receita",    value: formatKz(supplier.total_revenue || 0), color: "text-green-500" },
                { label: "Pedidos entregues",   value: orders.filter((o: any) => o.supplier_status === "delivered").length, color: "text-foreground" },
                { label: "Pedidos pendentes",   value: orders.filter((o: any) => o.supplier_status === "pending").length,   color: "text-amber-500" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Produtos Mais Vendidos</h3>
              {products.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.total_sold} vendas</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatKz(p.cost_price)}</p>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Adiciona o primeiro produto!</p>
              )}
            </div>
          </div>
        )}

        {/* ── PRODUTOS ── */}
        {tab === "produtos" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Os meus Produtos</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            {/* Formulário */}
            {showAddProduct && (
              <div className="bg-card border-2 border-primary/30 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-foreground text-sm">Novo Produto</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Nome *</label>
                    <input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Ex: Smartphone Samsung A54"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Categoria</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecciona...</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Preço Custo * (Kz)</label>
                    <input
                      type="number"
                      value={productForm.cost_price}
                      onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                      placeholder="50000"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Preço Mínimo (Kz)</label>
                    <input
                      type="number"
                      value={productForm.min_price}
                      onChange={(e) => setProductForm({ ...productForm, min_price: e.target.value })}
                      placeholder="60000"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Preço Sugerido (Kz)</label>
                    <input
                      type="number"
                      value={productForm.suggested_price}
                      onChange={(e) => setProductForm({ ...productForm, suggested_price: e.target.value })}
                      placeholder="70000"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Stock * (un.)</label>
                    <input
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                      placeholder="50"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">SKU / Referência</label>
                    <input
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      placeholder="SAM-A54-BLK"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">Descrição</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Descreve o produto..."
                      rows={2}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    O <strong className="text-foreground">preço de custo</strong> é o valor que recebes por cada venda. Os dropshippers definem o preço de venda acima do preço mínimo.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowAddProduct(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-foreground">
                    Cancelar
                  </button>
                  <button
                    onClick={() => addProduct.mutate()}
                    disabled={!productForm.name || !productForm.cost_price || !productForm.stock_quantity || addProduct.isPending}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    {addProduct.isPending ? "A guardar..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="space-y-2">
              {products.map((p: any) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-sm text-foreground truncate">{p.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${statusColor[p.status]}`}>
                          {statusLabel[p.status]}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{p.category}</p>
                      <div className="flex gap-4 mt-1.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Custo</p>
                          <p className="text-sm font-bold text-primary">{formatKz(p.cost_price)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Stock</p>
                          <p className={`text-sm font-bold ${p.stock_quantity < 5 ? "text-destructive" : "text-foreground"}`}>
                            {p.stock_quantity} un.
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Vendas</p>
                          <p className="text-sm font-bold text-green-500">{p.total_sold}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteProduct.mutate(p.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg text-destructive flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {products.length === 0 && !showAddProduct && (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Ainda não adicionaste produtos</p>
                  <button onClick={() => setShowAddProduct(true)} className="text-primary text-sm font-bold mt-1">
                    Adicionar primeiro produto →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Pedidos Recebidos</h2>
            {orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Ainda não há pedidos</p>
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {order.supplier_products?.name || "Produto"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Qtd: {order.quantity} • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColor[order.supplier_status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabel[order.supplier_status] || order.supplier_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tu recebes</p>
                      <p className="font-bold text-green-500 text-sm">{formatKz(order.supplier_amount || 0)}</p>
                    </div>
                    <div className="flex gap-2">
                      {order.supplier_status === "pending" && (
                        <button
                          onClick={() => updateOrderStatus.mutate({ id: order.id, status: "confirmed" })}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
                        >
                          Confirmar
                        </button>
                      )}
                      {order.supplier_status === "confirmed" && (
                        <button
                          onClick={() => updateOrderStatus.mutate({ id: order.id, status: "shipped" })}
                          className="px-3 py-1.5 border border-border text-xs font-bold rounded-lg text-foreground"
                        >
                          Marcar Enviado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── GANHOS ── */}
        {tab === "ganhos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Os meus Ganhos</h2>

            <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Total acumulado</p>
              <p className="text-3xl font-bold mt-1">{formatKz(supplier.total_revenue || 0)}</p>
              <p className="text-xs opacity-60 mt-1">
                {orders.filter((o: any) => o.supplier_status === "delivered").length} entregas confirmadas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">Pendente</p>
                <p className="font-bold text-amber-500 mt-1">
                  {formatKz(
                    orders
                      .filter((o: any) => o.supplier_status === "pending")
                      .reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0)
                  )}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">A caminho</p>
                <p className="font-bold text-blue-500 mt-1">
                  {formatKz(
                    orders
                      .filter((o: any) => o.supplier_status === "shipped")
                      .reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0)
                  )}
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

      </div>
    </div>
  );
}
