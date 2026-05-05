import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin, CreditCard, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";



const statusSteps = [
  { key: "pending", label: "Pendente", icon: Clock },
  { key: "confirmed", label: "Confirmado", icon: CheckCircle },
  { key: "shipped", label: "Enviado", icon: Truck },
  { key: "delivered", label: "Entregue", icon: Package },
];

const statusColors: Record<string, string> = {
  pending: "text-amber-500",
  confirmed: "text-blue-500",
  shipped: "text-purple-500",
  delivered: "text-green-500",
  cancelled: "text-destructive",
};

const PedidoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["order_items_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*, products(title, price, image_url)")
        .eq("order_id", id!);
      if (error) throw error;

      // Get cover images
      const productIds = (data || []).map((i: any) => i.product_id).filter(Boolean);
      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      return (data || []).map((i: any) => ({ ...i, cover_url: coverMap[i.product_id] }));
    },
    enabled: !!id,
  });

  const { data: tracking = [] } = useQuery({
    queryKey: ["order_tracking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_tracking")
        .select("*")
        .eq("order_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        
        <div className="container mx-auto px-3 py-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
        
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        
        <div className="container mx-auto px-3 py-8 text-center">
          <p className="text-muted-foreground">Pedido não encontrado</p>
        </div>
        
      </div>
    );
  }

  const currentStepIdx = statusSteps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate("/pedidos")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">Pedido #{order.order_number || order.id.slice(0, 8)}</h1>
            <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>

        {/* Status Progress */}
        {!isCancelled ? (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Estado do Pedido</h2>
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-border" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-primary transition-all"
                style={{ width: `calc(${Math.max(0, currentStepIdx) / (statusSteps.length - 1) * 100}% - 48px)` }}
              />
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStepIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? "bg-primary border-primary" : "bg-card border-border"}`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-[9px] mt-1 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-destructive/10 rounded-xl border border-destructive/30 p-4 mb-4 text-center">
            <p className="text-sm font-bold text-destructive">Pedido Cancelado</p>
          </div>
        )}

        {/* Timeline / Tracking */}
        {tracking.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1">
              <MessageSquare className="w-4 h-4" /> Histórico de Rastreio
            </h2>
            <div className="space-y-3">
              {tracking.map((t: any, i: number) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${i === tracking.length - 1 ? "bg-primary" : "bg-border"}`} />
                    {i < tracking.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-3">
                    <p className={`text-xs font-bold ${statusColors[t.status] || "text-foreground"}`}>
                      {statusSteps.find(s => s.key === t.status)?.label || t.status}
                    </p>
                    {t.note && <p className="text-[11px] text-muted-foreground mt-0.5">{t.note}</p>}
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(t.created_at).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-3">Itens ({orderItems.length})</h2>
          <div className="space-y-3">
            {orderItems.map((item: any) => {
              const img = item.cover_url || item.products?.image_url;
              return (
                <div key={item.id} className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.products?.title || item.product_title || "Produto"}</p>
                    {item.variant_info && <p className="text-[10px] text-muted-foreground">{item.variant_info}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</span>
                      <span className="text-xs font-bold text-primary">{Number(item.unit_price || item.products?.price || 0).toLocaleString("pt-AO")} Kz</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Address & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {order.shipping_address && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5" /> Endereço
              </h3>
              <p className="text-[11px] text-muted-foreground whitespace-pre-line">{order.shipping_address}</p>
            </div>
          )}
          {order.payment_method && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1 mb-2">
                <CreditCard className="w-3.5 h-3.5" /> Pagamento
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {order.payment_method === "cash_on_delivery" ? "Pagamento na entrega" : order.payment_method === "bank_transfer" ? "Transferência bancária" : order.payment_method}
              </p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{Number(order.total_amount || order.total || 0).toLocaleString("pt-AO")} Kz</span>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default PedidoDetalhe;
