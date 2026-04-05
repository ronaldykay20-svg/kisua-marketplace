import { useState } from "react";
import { Package, Clock, CheckCircle, Truck, ChevronDown, ChevronUp, Send, XCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-amber-500", icon: Clock },
  confirmed: { label: "Confirmado", color: "text-blue-500", icon: CheckCircle },
  shipped: { label: "Enviado", color: "text-purple-500", icon: Truck },
  delivered: { label: "Entregue", color: "text-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-destructive", icon: XCircle },
};

const nextStatus: Record<string, string> = {
  confirmed: "shipped",
  shipped: "delivered",
};

const nextStatusLabel: Record<string, string> = {
  confirmed: "Marcar como Enviado",
  shipped: "Marcar como Entregue",
};

interface Props {
  sellerId: string;
}

const SellerOrdersTab = ({ sellerId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingNote, setTrackingNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller_orders", sellerId],
    queryFn: async () => {
      // Use RPC or direct join — fetch products owned by this seller
      const { data: prods, error: prodsErr } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", sellerId);
      if (prodsErr) console.error("Error fetching seller products:", prodsErr);
      const productIds = (prods || []).map((p: any) => p.id);
      if (productIds.length === 0) return [];

      // Fetch order_items for these products — use service-level query
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity, unit_price, product_title, variant_info")
        .in("product_id", productIds);
      if (itemsErr) console.error("Error fetching order items:", itemsErr);
      if (!items || items.length === 0) return [];

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      
      // Fetch orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .order("created_at", { ascending: false });
      if (ordersErr) console.error("Error fetching orders:", ordersErr);
      if (!ordersData || ordersData.length === 0) return [];

      // Fetch buyer profiles
      const buyerIds = [...new Set(ordersData.map((o: any) => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", buyerIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

      const itemsByOrder: Record<string, any[]> = {};
      items.forEach((i: any) => {
        if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [];
        itemsByOrder[i.order_id].push(i);
      });

      return ordersData.map((o: any) => ({
        ...o,
        items: itemsByOrder[o.id] || [],
        buyer: profileMap[o.user_id] || null,
      }));
    },
    enabled: !!sellerId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, newStatus, note, buyerId }: { orderId: string; newStatus: string; note: string; buyerId?: string }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();

      const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
      if (error) throw error;

      const { error: trackErr } = await supabase.from("order_tracking").insert({
        order_id: orderId,
        status: newStatus,
        note: note || null,
        created_by: user!.id,
      });
      if (trackErr) throw trackErr;

      // Notify buyer
      if (buyerId) {
        const statusMessages: Record<string, string> = {
          confirmed: "O vendedor aceitou o seu pedido!",
          shipped: "O seu pedido foi enviado!",
          delivered: "O seu pedido foi entregue!",
          cancelled: `O seu pedido foi rejeitado. Motivo: ${note || "Não especificado"}`,
        };
        await supabase.from("notifications").insert({
          user_id: buyerId,
          title: newStatus === "cancelled" ? "Pedido rejeitado" : "Atualização do pedido",
          message: statusMessages[newStatus] || `Estado atualizado para ${newStatus}`,
          type: "order",
          link_url: `/pedido/${orderId}`,
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_orders"] });
      setTrackingNote("");
      setRejectReason("");
      toast.success("Estado do pedido atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredOrders = filter === "all" ? orders : orders.filter((o: any) => o.status === filter);
  const pendingCount = orders.filter((o: any) => o.status === "pending").length;

  const tabs = [
    { key: "all", label: "Todos" },
    { key: "pending", label: `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "confirmed", label: "Confirmados" },
    { key: "shipped", label: "Enviados" },
    { key: "delivered", label: "Entregues" },
    { key: "cancelled", label: "Cancelados" },
  ];

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4 pb-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
              filter === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"
            } ${t.key === "pending" && pendingCount > 0 && filter !== "pending" ? "border-amber-500 text-amber-600" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-center text-muted-foreground text-sm py-8">A carregar...</p>}

      {!isLoading && filteredOrders.length === 0 && (
        <div className="text-center py-8">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pedido {filter !== "all" ? "neste estado" : "ainda"}</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredOrders.map((order: any) => {
          const status = statusLabels[order.status] || statusLabels.pending;
          const StatusIcon = status.icon;
          const isExpanded = expandedOrder === order.id;
          const isPending = order.status === "pending";
          const canAdvance = nextStatus[order.status];

          return (
            <div key={order.id} className={`bg-card rounded-xl border overflow-hidden ${isPending ? "border-amber-400 shadow-sm shadow-amber-100" : "border-border"}`}>
              {/* Pending badge */}
              {isPending && (
                <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Aguardando a sua aprovação</span>
                </div>
              )}

              {/* Order header */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">#{order.order_number || order.id.slice(0, 8)}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${status.color}`}>
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {order.buyer?.full_name || "Comprador"} • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{Number(order.total_amount || order.total || 0).toLocaleString("pt-AO")} Kz</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border p-3 space-y-3">
                  {/* Items */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground mb-1.5">ITENS</p>
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span className="text-foreground">{item.product_title || "Produto"} {item.variant_info ? `(${item.variant_info})` : ""} × {item.quantity}</span>
                        <span className="text-muted-foreground font-medium">{Number(item.unit_price || 0).toLocaleString("pt-AO")} Kz</span>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  {order.shipping_address && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground mb-1">ENDEREÇO</p>
                      <p className="text-[11px] text-foreground whitespace-pre-line">{order.shipping_address}</p>
                    </div>
                  )}

                  {/* Payment */}
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

                  {/* Pending: Accept/Reject */}
                  {isPending && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <p className="text-[10px] font-bold text-amber-600">AÇÃO NECESSÁRIA</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus.mutate({ orderId: order.id, newStatus: "confirmed", note: "Pedido aceite pelo vendedor", buyerId: order.user_id })}
                          disabled={updateStatus.isPending}
                          className="flex-1 py-2.5 bg-green-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-green-700 transition"
                        >
                          <Check className="w-4 h-4" /> Aceitar pedido
                        </button>
                        <button
                          onClick={() => {
                            if (!rejectReason.trim()) {
                              toast.error("Indique o motivo da rejeição");
                              return;
                            }
                            updateStatus.mutate({ orderId: order.id, newStatus: "cancelled", note: rejectReason, buyerId: order.user_id });
                          }}
                          disabled={updateStatus.isPending}
                          className="flex-1 py-2.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition"
                        >
                          <XCircle className="w-4 h-4" /> Rejeitar
                        </button>
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Motivo da rejeição (obrigatório para rejeitar)..."
                        className="w-full p-2 text-xs bg-muted rounded-lg border border-border resize-none h-14 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  )}

                  {/* Update status for confirmed/shipped */}
                  {canAdvance && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1.5">ATUALIZAR ESTADO</p>
                      <textarea
                        value={trackingNote}
                        onChange={e => setTrackingNote(e.target.value)}
                        placeholder="Nota de rastreio (opcional)... ex: Enviado via transportadora X"
                        className="w-full p-2 text-xs bg-muted rounded-lg border border-border resize-none h-16 mb-2 text-foreground placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={() => updateStatus.mutate({ orderId: order.id, newStatus: canAdvance, note: trackingNote, buyerId: order.user_id })}
                        disabled={updateStatus.isPending}
                        className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {nextStatusLabel[order.status]}
                      </button>
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

export default SellerOrdersTab;