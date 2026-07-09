import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Bell, ImageOff, Package, Store, Building2, Boxes,
  CheckCircle, Truck, TrendingUp, DollarSign, Loader2, X, ArrowRight, ShoppingBag,
} from "lucide-react";

const formatKz = (v: number) => `${Number(v || 0).toLocaleString("pt-AO")} Kz`;

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", paid: "Pago", processing: "Em preparação",
  shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};
const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", shipped: "Enviado", delivered: "Entregue",
};

const statusColor = (s: string) => {
  if (s === "delivered") return "bg-green-500/10 text-green-600 border-green-500/20";
  if (s === "cancelled") return "bg-red-500/10 text-red-600 border-red-500/20";
  if (s === "shipped") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  if (["confirmed", "paid", "processing"].includes(s)) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
};

// ─── Card grande de imagem, com fallback neutro ────────────────────────────────
const BigImage = ({ url, alt }: { url: string | null; alt: string }) => (
  url ? (
    <img src={url} alt={alt} className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-muted" />
  ) : (
    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
      <ImageOff className="w-7 h-7 text-muted-foreground" />
    </div>
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// Avisos da Administração
// ═══════════════════════════════════════════════════════════════════════════════
const AdminNoticesSection = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();

  const { data: notices = [] } = useQuery({
    queryKey: ["my_admin_notices", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "order")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 20000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my_admin_notices"] }),
  });

  const unread = notices.filter((n: any) => !n.is_read);
  if (notices.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black text-foreground">Avisos da Administração</h2>
        {unread.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{unread.length}</span>
        )}
      </div>
      <div className="space-y-2">
        {notices.slice(0, 5).map((n: any) => (
          <div
            key={n.id}
            className={`rounded-xl p-3 border flex items-start gap-2.5 ${
              n.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/25"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground">{n.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-AO")}</p>
            </div>
            {!n.is_read && (
              <button
                onClick={() => markRead.mutate(n.id)}
                className="text-[9px] font-bold text-primary flex-shrink-0 px-2 py-1 rounded-lg bg-primary/10"
              >
                Marcar lida
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Secção: Meus Pedidos (Vendedor individual OU Loja/Empresa)
// ═══════════════════════════════════════════════════════════════════════════════
const SellerOrCompanySection = ({ sellerId, companyId, search }: { sellerId: string | null; companyId: string | null; search: string }) => {
  const queryClient = useQueryClient();
  const label = sellerId ? "Vendedor" : "Loja";

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["central_orders_seller_company", sellerId, companyId],
    queryFn: async () => {
      let orderIds: string[] = [];

      if (sellerId) {
        const { data } = await supabase.from("orders").select("id").eq("seller_id", sellerId).eq("payment_verified", true);
        orderIds = (data || []).map((o: any) => o.id);
      } else if (companyId) {
        // Pedidos de loja: encontrados via order_items -> products.company_id
        const { data: companyProducts } = await supabase.from("products").select("id").eq("company_id", companyId);
        const productIds = (companyProducts || []).map((p: any) => p.id);
        if (productIds.length) {
          const { data: items } = await supabase.from("order_items").select("order_id").in("product_id", productIds);
          orderIds = [...new Set((items || []).map((i: any) => i.order_id))];
        }
        if (orderIds.length) {
          const { data: verified } = await supabase.from("orders").select("id").in("id", orderIds).eq("payment_verified", true);
          orderIds = (verified || []).map((o: any) => o.id);
        }
      }

      if (orderIds.length === 0) return [];

      const { data: ordersData } = await supabase.from("orders").select("*").in("id", orderIds).order("created_at", { ascending: false });
      const { data: items } = await supabase.from("order_items").select("*").in("order_id", orderIds);

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      let productMap: Record<string, any> = {};
      if (productIds.length) {
        const { data: products } = await supabase.from("products").select("id, title, image_url").in("id", productIds);
        const { data: covers } = await supabase.from("product_media").select("product_id, url").in("product_id", productIds).eq("is_cover", true);
        const coverMap: Record<string, string> = {};
        (covers || []).forEach((c: any) => { coverMap[c.product_id] = c.url; });
        (products || []).forEach((p: any) => { productMap[p.id] = { ...p, cover_url: coverMap[p.id] || p.image_url }; });
      }

      const itemsByOrder: Record<string, any[]> = {};
      (items || []).forEach((i: any) => {
        if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [];
        itemsByOrder[i.order_id].push({ ...i, product: productMap[i.product_id] || null });
      });

      return (ordersData || []).map((o: any) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    },
    enabled: !!(sellerId || companyId),
    refetchInterval: 20000,
  });

  const advanceStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await supabase.from("orders").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["central_orders_seller_company"] });
      toast.success("Pedido atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o: any) =>
      (o.order_number || o.id).toLowerCase().includes(q) ||
      o.items.some((i: any) => i.product?.title?.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const totalEarnings = orders
    .filter((o: any) => o.status === "delivered")
    .reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (orders.length === 0) return null;

  const nextAction: Record<string, { next: string; label: string; icon: any }> = {
    pending:    { next: "processing", label: "Aceitar pedido", icon: CheckCircle },
    processing: { next: "shipped",    label: "Marcar enviado", icon: Truck },
    shipped:    { next: "delivered",  label: "Marcar entregue", icon: CheckCircle },
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
          {label === "Loja" ? <Building2 className="w-4 h-4 text-primary" /> : <Store className="w-4 h-4 text-primary" />}
          Meus Pedidos ({label})
        </h2>
        <span className="text-[11px] font-bold text-green-600">{formatKz(totalEarnings)} entregues</span>
      </div>

      <div className="space-y-3">
        {filtered.map((o: any) => {
          const action = nextAction[o.status];
          return (
            <div key={o.id} className="bg-card rounded-2xl border border-border p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-sm font-bold text-foreground">#{o.order_number || o.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-AO")}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(o.status)}`}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
              </div>

              {o.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 py-1.5">
                  <BigImage url={item.product?.cover_url || null} alt={item.product?.title || "Produto"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{item.product?.title || "Produto"}</p>
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity} • {formatKz(item.unit_price)}</p>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                <span className="text-sm font-black text-foreground">{formatKz(o.total)}</span>
                {action && (
                  <button
                    onClick={() => advanceStatus.mutate({ id: o.id, next: action.next })}
                    disabled={advanceStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    <action.icon className="w-3.5 h-3.5" /> {action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum pedido encontrado para "{search}".</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Secção: Pedidos como Fornecedor
// ═══════════════════════════════════════════════════════════════════════════════
const SupplierSection = ({ supplierId, search }: { supplierId: string; search: string }) => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["central_supplier_items", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_order_items")
        .select("*, supplier_orders(created_at), supplier_products(name, images)")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 20000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("supplier_order_items").update({ supplier_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["central_supplier_items"] });
      toast.success("Estado atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i: any) => i.supplier_products?.name?.toLowerCase().includes(q));
  }, [items, search]);

  const totalEarnings = items
    .filter((i: any) => i.supplier_status === "delivered")
    .reduce((s: number, i: any) => s + Number(i.supplier_amount || 0), 0);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (items.length === 0) return null;

  const nextAction: Record<string, { next: string; label: string; icon: any }> = {
    pending:   { next: "confirmed", label: "Aceitar pedido", icon: CheckCircle },
    confirmed: { next: "shipped",   label: "Marcar enviado", icon: Truck },
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
          <Boxes className="w-4 h-4 text-primary" /> Pedidos como Fornecedor
        </h2>
        <span className="text-[11px] font-bold text-green-600">{formatKz(totalEarnings)} entregues</span>
      </div>

      <div className="space-y-3">
        {filtered.map((item: any) => {
          const cover = Array.isArray(item.supplier_products?.images) && item.supplier_products.images.length > 0
            ? item.supplier_products.images[0] : null;
          const action = nextAction[item.supplier_status];
          return (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-3.5">
              <div className="flex items-center gap-3">
                <BigImage url={cover} alt={item.supplier_products?.name || "Produto"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{item.supplier_products?.name || "Produto"}</p>
                  <p className="text-xs text-muted-foreground">Qtd: {item.quantity} • {formatKz(item.unit_price)}</p>
                  <p className="text-xs font-bold text-green-600 mt-0.5">Você recebe: {formatKz(item.supplier_amount)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${statusColor(item.supplier_status)}`}>
                  {SUPPLIER_STATUS_LABELS[item.supplier_status] || item.supplier_status}
                </span>
              </div>
              {action && (
                <button
                  onClick={() => updateStatus.mutate({ id: item.id, status: action.next })}
                  disabled={updateStatus.isPending}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  <action.icon className="w-3.5 h-3.5" /> {action.label}
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum pedido encontrado para "{search}".</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Secção: Pedidos como Dropshipper (Loja)
// ═══════════════════════════════════════════════════════════════════════════════
const DropshipperSection = ({ storeId, search }: { storeId: string; search: string }) => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["central_dropship_orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_orders")
        .select("*, supplier_order_items(*, supplier_products(name, images))")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 20000,
  });

  // O afiliado é quem recebe fisicamente do fornecedor e entrega ao
  // cliente final — por isso é ele (não o fornecedor) quem fecha o ciclo
  // marcando "entregue". Atualiza o pedido e todos os seus itens de uma vez.
  const markDelivered = useMutation({
    mutationFn: async (order: any) => {
      const { error: orderError } = await supabase
        .from("supplier_orders")
        .update({ status: "delivered" })
        .eq("id", order.id);
      if (orderError) throw orderError;

      const itemIds = (order.supplier_order_items || []).map((i: any) => i.id);
      if (itemIds.length > 0) {
        const { error: itemsError } = await supabase
          .from("supplier_order_items")
          .update({ supplier_status: "delivered" })
          .in("id", itemIds);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["central_dropship_orders"] });
      toast.success("Pedido marcado como entregue — ganhos atualizados");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o: any) =>
      o.id.toLowerCase().includes(q) ||
      (o.supplier_order_items || []).some((i: any) => i.supplier_products?.name?.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const totalEarnings = orders
    .filter((o: any) => o.status === "delivered")
    .reduce((s: number, o: any) => s + (o.supplier_order_items || []).reduce((ss: number, i: any) => ss + Number(i.dropshipper_amount || 0), 0), 0);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (orders.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-black text-foreground flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-primary" /> Pedidos da Minha Loja
        </h2>
        <span className="text-[11px] font-bold text-green-600">{formatKz(totalEarnings)} entregues</span>
      </div>

      <div className="space-y-3">
        {filtered.map((o: any) => {
          const items = o.supplier_order_items || [];
          const myEarning = items.reduce((s: number, i: any) => s + Number(i.dropshipper_amount || 0), 0);
          const allShipped = items.length > 0 && items.every((i: any) => i.supplier_status === "shipped" || i.supplier_status === "delivered");
          const canMarkDelivered = o.status !== "delivered" && allShipped;
          return (
            <div key={o.id} className="bg-card rounded-2xl border border-border p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <p className="text-sm font-bold text-foreground">#{o.id.slice(0, 8)}</p>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColor(o.status)}`}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              {items.map((item: any) => {
                const cover = Array.isArray(item.supplier_products?.images) && item.supplier_products.images.length > 0
                  ? item.supplier_products.images[0] : null;
                return (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    <BigImage url={cover} alt={item.supplier_products?.name || "Produto"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{item.supplier_products?.name || "Produto"}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                <span className="text-sm font-black text-foreground">{formatKz(o.total_amount)}</span>
                <span className="text-xs font-bold text-green-600">O seu lucro: {formatKz(myEarning)}</span>
              </div>
              {canMarkDelivered && (
                <button
                  onClick={() => markDelivered.mutate(o)}
                  disabled={markDelivered.isPending}
                  className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Confirmar entrega ao cliente
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum pedido encontrado para "{search}".</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════════════
const CentralDePedidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: seller } = useQuery({
    queryKey: ["central_my_seller", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sellers").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: companyMembership } = useQuery({
    queryKey: ["central_my_company", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("company_members").select("company_id").eq("user_id", user!.id).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: supplier } = useQuery({
    queryKey: ["central_my_supplier", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id").eq("user_id", user!.id).eq("status", "approved").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: dropshipStore } = useQuery({
    queryKey: ["central_my_dropship_store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dropship_stores").select("id").eq("user_id", user!.id).eq("status", "active").maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const hasAnyRole = !!(seller?.id || companyMembership?.company_id || supplier?.id || dropshipStore?.id);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Inicie sessão para aceder à Central de Pedidos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] text-muted-foreground">Acompanhamento de vendas</p>
            <h1 className="text-lg font-black text-foreground">Central de Pedidos</h1>
          </div>
        </div>

        {/* Pesquisa */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por produto ou nº de pedido..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <AdminNoticesSection userId={user.id} />

        {!hasAnyRole && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">Sem pedidos para acompanhar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta secção mostra os pedidos assim que tiver uma loja, perfil de vendedor, fornecedor ou loja de dropship ativa.
            </p>
          </div>
        )}

        {(seller?.id || companyMembership?.company_id) && (
          <SellerOrCompanySection
            sellerId={seller?.id || null}
            companyId={!seller?.id ? companyMembership?.company_id || null : null}
            search={search}
          />
        )}

        {supplier?.id && <SupplierSection supplierId={supplier.id} search={search} />}

        {dropshipStore?.id && <DropshipperSection storeId={dropshipStore.id} search={search} />}

      </div>
    </div>
  );
};

export default CentralDePedidos;
