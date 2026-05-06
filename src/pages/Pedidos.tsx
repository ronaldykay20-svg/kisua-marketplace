import { useState } from "react";
import { Package, ChevronRight, Truck, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useSupabaseData";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-walmart-orange", icon: Clock },
  confirmed: { label: "Confirmado", color: "text-primary", icon: CheckCircle },
  shipped: { label: "Enviado", color: "text-accent", icon: Truck },
  delivered: { label: "Entregue", color: "text-walmart-green", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-destructive", icon: Package },
};

const tabs = ["Todos", "Pendentes", "Enviados", "Entregues", "Cancelados"];
const tabStatusMap: Record<string, string | undefined> = {
  "Todos": undefined,
  "Pendentes": "pending",
  "Enviados": "shipped",
  "Entregues": "delivered",
  "Cancelados": "cancelled",
};

const Pedidos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState("Todos");

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <div className="container mx-auto px-3 py-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground mb-1">Faça login para ver pedidos</h2>
          <p className="text-xs text-muted-foreground mb-4">Acompanhe o estado das suas encomendas.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-card">Entrar</button>
        </div>
      </div>
    );
  }

  const hasOrders = orders && orders.length > 0;

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-3">Meus Pedidos</h1>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${activeTab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {!hasOrders ? (
          <div className="bg-card rounded-card border border-border p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">Nenhum pedido ainda</h3>
            <p className="text-xs text-muted-foreground mb-4">Quando fizer uma compra, os seus pedidos aparecerão aqui.</p>
            <button onClick={() => navigate("/")} className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-card">Começar a comprar</button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              .filter((o: any) => {
                const statusFilter = tabStatusMap[activeTab];
                return !statusFilter || o.status === statusFilter;
              })
              .map((order: any) => {
              const status = statusLabels[order.status] || statusLabels.pending;
              const StatusIcon = status.icon;
              return (
                <button key={order.id} onClick={() => navigate(`/pedido/${order.id}`)} className="w-full bg-card rounded-card border border-border p-4 text-left hover:bg-muted/50 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">#{order.order_number || order.id.slice(0, 8)}</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total: <span className="font-bold text-foreground">{Number(order.total_amount || order.total || 0).toLocaleString("pt-AO")} Kz</span></p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-AO")}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pedidos;
