import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Package,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Upload,
  BarChart3,
  Bell,
  Star,
  AlertCircle,
} from "lucide-react";

type Tab = "overview" | "products" | "orders" | "earnings";

interface Supplier {
  id: string;
  company_name: string;
  status: string;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  rating: number;
}

interface SupplierProduct {
  id: string;
  name: string;
  cost_price: number;
  suggested_price: number;
  min_price: number;
  stock_quantity: number;
  status: string;
  total_sold: number;
  category: string;
}

export default function FornecedorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "",
    cost_price: "",
    suggested_price: "",
    min_price: "",
    stock_quantity: "",
    sku: "",
  });

  const CATEGORIES = [
    "Eletrônicos", "Calçados", "Vestuário", "Acessórios",
    "Casa e Jardim", "Beleza", "Desporto", "Alimentação", "Outros"
  ];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar dados do fornecedor
      const { data: supplierData } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (supplierData) {
        setSupplier(supplierData);

        // Buscar produtos
        const { data: productsData } = await supabase
          .from("supplier_products")
          .select("*")
          .eq("supplier_id", supplierData.id)
          .order("created_at", { ascending: false });

        setProducts(productsData || []);

        // Buscar pedidos recentes
        const { data: ordersData } = await supabase
          .from("order_items")
          .select(`
            *,
            orders(id, created_at, status, customer_id),
            supplier_products(name)
          `)
          .eq("supplier_id", supplierData.id)
          .order("created_at", { ascending: false })
          .limit(20);

        setOrders(ordersData || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!supplier) return;
    if (!productForm.name || !productForm.cost_price || !productForm.stock_quantity) {
      toast.error("Preenche os campos obrigatórios");
      return;
    }

    try {
      const { error } = await supabase.from("supplier_products").insert({
        supplier_id: supplier.id,
        name: productForm.name,
        description: productForm.description,
        category: productForm.category,
        cost_price: parseFloat(productForm.cost_price),
        suggested_price: productForm.suggested_price ? parseFloat(productForm.suggested_price) : null,
        min_price: productForm.min_price ? parseFloat(productForm.min_price) : null,
        stock_quantity: parseInt(productForm.stock_quantity),
        sku: productForm.sku,
        status: "active",
      });

      if (error) throw error;

      toast.success("Produto adicionado com sucesso!");
      setShowAddProduct(false);
      setProductForm({ name: "", description: "", category: "", cost_price: "", suggested_price: "", min_price: "", stock_quantity: "", sku: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tens a certeza que queres remover este produto?")) return;
    await supabase.from("supplier_products").delete().eq("id", id);
    toast.success("Produto removido");
    fetchData();
  };

  const formatKz = (v: number) => `${v.toLocaleString("pt-AO")} Kz`;

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    out_of_stock: "bg-gray-100 text-gray-600",
  };

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    suspended: "Suspenso",
    active: "Activo",
    out_of_stock: "Sem stock",
    confirmed: "Confirmado",
    shipped: "Enviado",
    delivered: "Entregue",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">A carregar...</p>
        </div>
      </div>
    );
  }

  // Se não tem conta de fornecedor ainda
  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Package size={28} className="text-amber-700" />
          </div>
          <h2 className="text-xl font-bold">Ainda não és Fornecedor</h2>
          <p className="text-gray-500 text-sm">Regista a tua empresa para começares a fornecer produtos à rede de dropshippers do Zangu.</p>
          <Button
            onClick={() => navigate("/seja-fornecedor")}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl h-11"
          >
            Registar como Fornecedor
          </Button>
        </div>
      </div>
    );
  }

  // Se está pendente
  if (supplier.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Clock size={28} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold">Pedido em Análise</h2>
          <p className="text-gray-500 text-sm">O teu pedido está a ser verificado pela nossa equipa. Receberás uma notificação em 24 a 48 horas.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left">
            <p className="text-sm text-yellow-800 font-semibold">{supplier.company_name}</p>
            <p className="text-xs text-yellow-600 mt-1">Submetido — aguarda aprovação</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full rounded-xl">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-800 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <p className="text-amber-200 text-xs">Painel do Fornecedor</p>
              <h1 className="font-bold text-lg leading-tight">{supplier.company_name}</h1>
            </div>
            <button className="p-2 hover:bg-white/20 rounded-full relative">
              <Bell size={18} />
            </button>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Produtos", value: supplier.total_products || products.length, icon: Package },
              { label: "Pedidos", value: supplier.total_orders || orders.length, icon: ShoppingBag },
              { label: "Receita", value: formatKz(supplier.total_revenue || 0), icon: TrendingUp },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-sm">{s.value}</p>
                <p className="text-amber-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 flex overflow-x-auto">
          {[
            { key: "overview", label: "Visão Geral", icon: BarChart3 },
            { key: "products", label: "Produtos", icon: Package },
            { key: "orders", label: "Pedidos", icon: ShoppingBag },
            { key: "earnings", label: "Ganhos", icon: DollarSign },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "border-amber-700 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Rating */}
            <div className="bg-white border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Star size={22} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{supplier.rating > 0 ? supplier.rating.toFixed(1) : "—"}</p>
                <p className="text-xs text-gray-500">Avaliação média</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor[supplier.status]}`}>
                {statusLabel[supplier.status]}
              </span>
            </div>

            {/* Resumo financeiro */}
            <div className="bg-white border rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-gray-800">Resumo Financeiro</h3>
              {[
                { label: "Total de Vendas", value: formatKz(supplier.total_revenue || 0), color: "text-green-600" },
                { label: "Pedidos processados", value: orders.filter(o => o.supplier_status === "delivered").length, color: "text-gray-800" },
                { label: "Pedidos pendentes", value: orders.filter(o => o.supplier_status === "pending").length, color: "text-yellow-600" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className={`font-semibold text-sm ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Produtos mais vendidos */}
            <div className="bg-white border rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-gray-800">Produtos Mais Vendidos</h3>
              {products.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.total_sold} vendas</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">{formatKz(p.cost_price)}</p>
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Ainda sem produtos. Adiciona o primeiro!</p>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Os meus Produtos</h2>
              <Button
                onClick={() => setShowAddProduct(true)}
                className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl h-9 px-4 text-sm"
              >
                <Plus size={15} className="mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Formulário adicionar produto */}
            {showAddProduct && (
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-gray-800">Novo Produto</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Nome do Produto *</label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Ex: Smartphone Samsung A54"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Categoria</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Preço de Custo * (Kz)</label>
                    <Input
                      type="number"
                      value={productForm.cost_price}
                      onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                      placeholder="50000"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Preço Mínimo de Venda (Kz)</label>
                    <Input
                      type="number"
                      value={productForm.min_price}
                      onChange={(e) => setProductForm({ ...productForm, min_price: e.target.value })}
                      placeholder="60000"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Preço Sugerido (Kz)</label>
                    <Input
                      type="number"
                      value={productForm.suggested_price}
                      onChange={(e) => setProductForm({ ...productForm, suggested_price: e.target.value })}
                      placeholder="70000"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Stock * (unidades)</label>
                    <Input
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                      placeholder="50"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">SKU / Referência</label>
                    <Input
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      placeholder="SAM-A54-BLK"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
                    <Textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Descreve o produto..."
                      className="rounded-xl text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Nota sobre preços */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                  <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    O <strong>preço de custo</strong> é o que tu recebes por cada venda. Os dropshippers definem o preço de venda ao público acima do preço mínimo que definires.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowAddProduct(false)} className="flex-1 rounded-xl">
                    Cancelar
                  </Button>
                  <Button onClick={handleAddProduct} className="flex-1 bg-amber-700 hover:bg-amber-800 text-white rounded-xl">
                    Guardar Produto
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de produtos */}
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="bg-white border rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-800 truncate">{product.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[product.status]}`}>
                          {statusLabel[product.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-400">Preço custo</p>
                          <p className="text-sm font-bold text-amber-700">{formatKz(product.cost_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Stock</p>
                          <p className={`text-sm font-bold ${product.stock_quantity < 5 ? "text-red-600" : "text-gray-800"}`}>
                            {product.stock_quantity} un.
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Vendas</p>
                          <p className="text-sm font-bold text-green-600">{product.total_sold}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit2 size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {products.length === 0 && !showAddProduct && (
                <div className="text-center py-12 text-gray-400">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ainda não adicionaste produtos</p>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="text-amber-700 text-sm font-medium mt-2"
                  >
                    Adicionar primeiro produto →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Pedidos Recebidos</h2>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Ainda não há pedidos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">
                          {order.supplier_products?.name || "Produto"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qtd: {order.quantity} • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[order.supplier_status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabel[order.supplier_status] || order.supplier_status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-400">Tu recebes</p>
                        <p className="font-bold text-green-600 text-sm">{formatKz(order.supplier_amount || 0)}</p>
                      </div>
                      {order.supplier_status === "pending" && (
                        <Button
                          size="sm"
                          className="bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs h-8"
                          onClick={async () => {
                            await supabase
                              .from("order_items")
                              .update({ supplier_status: "confirmed" })
                              .eq("id", order.id);
                            toast.success("Pedido confirmado!");
                            fetchData();
                          }}
                        >
                          Confirmar Pedido
                        </Button>
                      )}
                      {order.supplier_status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-xs h-8"
                          onClick={async () => {
                            await supabase
                              .from("order_items")
                              .update({ supplier_status: "shipped" })
                              .eq("id", order.id);
                            toast.success("Marcado como enviado!");
                            fetchData();
                          }}
                        >
                          Marcar Enviado
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EARNINGS */}
        {tab === "earnings" && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800">Os meus Ganhos</h2>

            <div className="bg-gradient-to-br from-amber-700 to-amber-900 rounded-2xl p-5 text-white">
              <p className="text-amber-200 text-sm">Total acumulado</p>
              <p className="text-3xl font-bold mt-1">{formatKz(supplier.total_revenue || 0)}</p>
              <p className="text-amber-200 text-xs mt-2">Baseado em {orders.filter(o => o.supplier_status === "delivered").length} entregas confirmadas</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border rounded-2xl p-4">
                <p className="text-xs text-gray-500">Pendente</p>
                <p className="font-bold text-yellow-600 mt-1">
                  {formatKz(orders.filter(o => o.supplier_status === "pending").reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0))}
                </p>
              </div>
              <div className="bg-white border rounded-2xl p-4">
                <p className="text-xs text-gray-500">A caminho</p>
                <p className="font-bold text-blue-600 mt-1">
                  {formatKz(orders.filter(o => o.supplier_status === "shipped").reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0))}
                </p>
              </div>
            </div>

            <Button className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl h-12 font-semibold">
              Pedir Pagamento
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-800">
                💡 Os pagamentos são processados após confirmação de entrega. Processamento em 2 a 5 dias úteis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
