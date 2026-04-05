import { useState } from "react";
import { Package, Clock, CheckCircle, Truck, ChevronDown, ChevronUp, XCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-amber-500", icon: Clock },
  confirmed: { label: "Confirmado", color: "text-blue-500", icon: CheckCircle },
  shipped: { label: "Enviado", color: "text-purple-500", icon: Truck },
  delivered: { label: "Entregue", color: "text-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-destructive", icon: XCircle },
};

const AdminOrdersTab = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin_all_orders"],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) return [];

      const orderIds = ordersData.map((o: any) => o.id);
      const buyerIds = [...new Set(ordersData.map((o: any) => o.user_id))];

      const [itemsRes, profilesRes] = await Promise.all([
        supabase.from("order_items").select("order_id, product_id, quantity, unit_price, product_title, variant_info").in("order_id", orderIds),
        supabase.from("profiles").select("id, full_name").in("id", buyerIds),
      ]);

      const productIds = [...new Set((itemsRes.data || []).map((i: any) => i.product_id))];
      let sellerMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id, seller_id, company_id").in("id", productIds);
        const sellerIds = [...new Set((products || []).map((p: any) => p.seller_id).filter(Boolean))];
        const companyIds = [...new Set((products || []).map((p: any) => p.company_id).filter(Boolean))];

        const [sellersRes, companiesRes] = await Promise.all([
          sellerIds.length > 0 ? supabase.from("sellers").select("id, name").in("id", sellerIds) : { data: [] },
          companyIds.length > 0 ? supabase.from("companies").select("id, name").in("id", companyIds) : { data: [] },
        ]);

        const sellersById = Object.fromEntries((sellersRes.data || []).map((s: any) => [s.id, s.name]));
        const companiesById = Object.fromEntries((companiesRes.data || []).map((c: any) => [c.id, c.name]));

        (products || []).forEach((p: any) => {
          sellerMap[p.id] = p.seller_id ? sellersById[p.seller_id] : (p.company_id ? companiesById[p.company_id] : null);
        });
      }

      const profileMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.id, p]));
      const itemsByOrder: Record<string, any[]> = {};
      (itemsRes.data || []).forEach((i: any) => {
        if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [];
        itemsByOrder[i.order_id].push({ ...i, seller_name: sellerMap[i.product_id] || "—" });
      });

      return ordersData.map((o: any) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
        buyer: profileMap[o.user_id] || null,
      }));
    },
  });

  const filteredOrders = orders
    .filter((o: any) => filter === "all" || o.status === filter)
    .filter((o: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (o.order_number || o.id).toLowerCase().includes(s) ||
        (o.buyer?.full_name || "").toLowerCase().includes(s) ||
        o.items.some((i: any) => (i.product_title || "").toLowerCase().includes(s) || (i.seller_name || "").toLowerCase().includes(s))
      );
    });

  const tabs = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendentes" },
    { key: "confirmed", label: "Confirmados" },
    { key: "shipped", label: "Enviados" },
    { key: "delivered", label: "Entregues" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Pesquisar pedido, comprador ou vendedor..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${filter === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>
            {t.label} {t.key !== "all" ? `(${orders.filter((o: any) => o.status === t.key).length})` : `(${orders.length})`}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-center text-muted-foreground text-sm py-8">A carregar...</p>}
      {!isLoading && filteredOrders.length === 0 && (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredOrders.map((order: any) => {
          const st = statusLabels[order.status] || statusLabels.pending;
          const StIcon = st.icon;
          const isExp = expanded === order.id;
          const sellers = [...new Set(order.items.map((i: any) => i.seller_name).filter((n: string) => n !== "—"))];

          return (
            <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button onClick={() => setExpanded(isExp ? null : order.id)} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition">
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">#{order.order_number || order.id.slice(0, 8)}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${st.color}`}>
                      <StIcon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {order.buyer?.full_name || "Comprador"} • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                    {sellers.length > 0 && <> • <span className="text-primary font-medium">{sellers.join(", ")}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{Number(order.total_amount || order.total || 0).toLocaleString("pt-AO")} Kz</span>
                  {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExp && (
                <div className="border-t border-border p-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-1.5">ITENS</p>
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs py-1 gap-2">
                        <div className="min-w-0">
                          <span className="text-foreground">{item.product_title || "Produto"} {item.variant_info ? `(${item.variant_info})` : ""} × {item.quantity}</span>
                          <p className="text-[10px] text-primary">{item.seller_name}</p>
                        </div>
                        <span className="text-muted-foreground font-medium flex-shrink-0">{Number(item.unit_price || 0).toLocaleString("pt-AO")} Kz</span>
                      </div>
                    ))}
                  </div>

                  {order.shipping_address && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">ENDEREÇO</p>
                      <p className="text-[11px] text-foreground whitespace-pre-line">{order.shipping_address}</p>
                    </div>
                  )}

                  {order.payment_method && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">PAGAMENTO</p>
                      <p className="text-[11px] text-foreground">
                        {order.payment_method === "cash_on_delivery" ? "Pagamento na entrega" :
                         order.payment_method === "bank_transfer" ? "Transferência bancária" :
                         order.payment_method === "multicaixa_express" ? "Multicaixa Express" : order.payment_method}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminOrdersTab;
