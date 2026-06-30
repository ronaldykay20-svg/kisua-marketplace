import { useState } from "react";
import { Banknote, CheckCircle, XCircle, Eye, Loader2, MapPin, FileText, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const REJECTION_LABELS: Record<string, string> = {
  valor_incompativel: "Valor não compatível",
  transferencia_nao_confirmada: "Transferência não confirmada",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Transferência bancária",
  multicaixa_express: "Multicaixa Express",
  cash_on_delivery: "Pagamento na entrega",
};

// ─── Modal de visualização do comprovativo ─────────────────────────────────────
const ProofModal = ({ order, signedUrl, onClose }: { order: any; signedUrl: string | null; onClose: () => void }) => {
  const isPdf = order.payment_proof_url?.toLowerCase().endsWith(".pdf");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">Comprovativo</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs space-y-1 mb-3">
          <p className="text-muted-foreground">Pedido: <span className="font-bold text-foreground">#{order.order_number || order.id.slice(0, 8)}</span></p>
          <p className="text-muted-foreground">Cliente: <span className="font-bold text-foreground">{order.shipping_name || "—"}</span></p>
          <p className="text-muted-foreground">Método: <span className="font-bold text-foreground">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}</span></p>
          <p className="text-muted-foreground">Total: <span className="font-bold text-green-500">{formatPrice(order.total)}</span></p>
        </div>
        {signedUrl ? (
          isPdf ? (
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-6 rounded-lg bg-muted text-foreground text-sm font-bold mb-3">
              <FileText className="w-5 h-5" /> Abrir PDF
            </a>
          ) : (
            <img src={signedUrl} alt="Comprovativo" className="w-full rounded-lg mb-3 max-h-72 object-contain bg-muted" />
          )
        ) : (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        )}
        <button onClick={onClose} className="w-full py-2 bg-muted text-foreground text-xs font-bold rounded-lg">Fechar</button>
      </div>
    </div>
  );
};

// ─── Popup de motivo de rejeição ───────────────────────────────────────────────
const RejectReasonModal = ({ onConfirm, onClose, isPending }: { onConfirm: (reason: string) => void; onClose: () => void; isPending: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
    <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
      <h3 className="text-sm font-black text-foreground mb-1">Motivo da rejeição</h3>
      <p className="text-xs text-muted-foreground mb-4">Escolha o motivo. O cliente será notificado.</p>
      <div className="space-y-2">
        <button
          onClick={() => onConfirm("valor_incompativel")}
          disabled={isPending}
          className="w-full text-left p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition disabled:opacity-50"
        >
          <p className="text-sm font-bold text-amber-600">Valor não compatível</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pedimos ao cliente para reenviar um novo comprovativo.</p>
        </button>
        <button
          onClick={() => onConfirm("transferencia_nao_confirmada")}
          disabled={isPending}
          className="w-full text-left p-3 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition disabled:opacity-50"
        >
          <p className="text-sm font-bold text-red-600">Transferência não confirmada</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">O pedido será cancelado definitivamente.</p>
        </button>
      </div>
      <button onClick={onClose} disabled={isPending} className="w-full mt-3 py-2 bg-muted text-foreground text-xs font-bold rounded-lg disabled:opacity-50">
        Cancelar
      </button>
    </div>
  </div>
);

// ─── Componente principal ──────────────────────────────────────────────────────
const AdminPaymentReviewTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewModal, setViewModal] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<any>(null);
  const [filter, setFilter] = useState<"pending" | "rejected" | "all">("pending");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin_payment_review"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .not("payment_proof_url", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000,
  });

  const pending = orders.filter((o: any) => !o.payment_verified && !o.payment_rejection_reason);
  const rejected = orders.filter((o: any) => !!o.payment_rejection_reason);
  const approved = orders.filter((o: any) => o.payment_verified);

  const visibleOrders = filter === "pending" ? pending : filter === "rejected" ? rejected : orders;

  const openProof = async (order: any) => {
    setViewModal(order);
    setSignedUrl(null);
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(order.payment_proof_url, 120);
    setSignedUrl(data?.signedUrl || null);
  };

  const approveOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_verified: true,
          payment_rejection_reason: null,
          payment_reviewed_by: user!.id,
          payment_reviewed_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;

      // Notifica o vendedor agora que o pagamento foi confirmado
      const { data: order } = await supabase
        .from("orders")
        .select("id, seller_id, total, order_number")
        .eq("id", orderId)
        .maybeSingle();

      if (order?.seller_id) {
        const { data: seller } = await supabase
          .from("sellers")
          .select("user_id")
          .eq("id", order.seller_id)
          .maybeSingle();

        if (seller?.user_id) {
          await supabase.from("notifications").insert({
            user_id: seller.user_id,
            title: "Novo pedido recebido!",
            message: `Tem um novo pedido #${(order.order_number || order.id).toString().slice(0, 8)} no valor de ${Number(order.total).toLocaleString("pt-AO")} Kz.`,
            type: "order",
            link_url: "/painel-vendedor",
            is_read: false,
          });
        }
      }

      // Notifica o cliente que o pagamento foi aprovado
      const { data: clientOrder } = await supabase.from("orders").select("user_id").eq("id", orderId).maybeSingle();
      if (clientOrder?.user_id) {
        await supabase.from("notifications").insert({
          user_id: clientOrder.user_id,
          title: "Pagamento confirmado",
          message: "O seu pagamento foi confirmado! O seu pedido está agora a ser preparado.",
          type: "order",
          link_url: "/pedidos",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_review"] });
      toast.success("Pagamento aprovado — vendedor notificado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectOrder = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const updates: any = {
        payment_rejection_reason: reason,
        payment_reviewed_by: user!.id,
        payment_reviewed_at: new Date().toISOString(),
      };
      // Transferência não confirmada -> cancela definitivamente
      if (reason === "transferencia_nao_confirmada") {
        updates.cancelled_at = new Date().toISOString();
        updates.status = "cancelled";
      }
      const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
      if (error) throw error;

      const { data: clientOrder } = await supabase.from("orders").select("user_id").eq("id", orderId).maybeSingle();
      if (clientOrder?.user_id) {
        const message = reason === "valor_incompativel"
          ? "O valor do seu comprovativo não corresponde ao pedido. Por favor reenvie um novo comprovativo."
          : "Não conseguimos confirmar a sua transferência. O pedido foi cancelado.";
        await supabase.from("notifications").insert({
          user_id: clientOrder.user_id,
          title: reason === "valor_incompativel" ? "Reenvie o comprovativo" : "Pedido cancelado",
          message,
          type: "order",
          link_url: "/pedidos",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_review"] });
      setRejectModalOrder(null);
      toast.success("Pedido rejeitado — cliente notificado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setFilter("pending")} className={`rounded-xl border p-3 text-center transition ${filter === "pending" ? "border-amber-500 bg-amber-500/10" : "border-amber-500/20 bg-amber-500/5"}`}>
          <p className="text-lg font-bold text-amber-600">{pending.length}</p>
          <p className="text-[10px] text-amber-600">Pendentes</p>
        </button>
        <button onClick={() => setFilter("all")} className={`rounded-xl border p-3 text-center transition ${filter === "all" ? "border-green-500 bg-green-500/10" : "border-green-500/20 bg-green-500/5"}`}>
          <p className="text-lg font-bold text-green-600">{approved.length}</p>
          <p className="text-[10px] text-green-600">Aprovados</p>
        </button>
        <button onClick={() => setFilter("rejected")} className={`rounded-xl border p-3 text-center transition ${filter === "rejected" ? "border-red-500 bg-red-500/10" : "border-red-500/20 bg-red-500/5"}`}>
          <p className="text-lg font-bold text-red-600">{rejected.length}</p>
          <p className="text-[10px] text-red-600">Rejeitados</p>
        </button>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

      {!isLoading && visibleOrders.length === 0 && (
        <div className="text-center py-10">
          <Banknote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Nenhum pedido aqui</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "pending" ? "Não há comprovativos à espera de revisão." : "Nada para mostrar neste filtro."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visibleOrders.map((o: any) => (
          <div key={o.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">#{o.order_number || o.id.slice(0, 8)}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {o.shipping_name} — {o.shipping_phone}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  o.payment_verified
                    ? "bg-green-500/10 text-green-600"
                    : o.payment_rejection_reason
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {o.payment_verified ? "Aprovado" : o.payment_rejection_reason ? REJECTION_LABELS[o.payment_rejection_reason] : "Pendente"}
              </span>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>{PAYMENT_METHOD_LABELS[o.payment_method] || o.payment_method}</span>
              <span className="font-bold text-foreground">{formatPrice(o.total)}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openProof(o)}
                className="flex-1 py-1.5 bg-muted text-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Ver comprovativo
              </button>
              {!o.payment_verified && !o.payment_rejection_reason && (
                <>
                  <button
                    onClick={() => approveOrder.mutate(o.id)}
                    disabled={approveOrder.isPending}
                    className="flex-1 py-1.5 bg-green-500/10 text-green-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => setRejectModalOrder(o)}
                    disabled={approveOrder.isPending}
                    className="flex-1 py-1.5 bg-red-500/10 text-red-600 text-xs font-bold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {viewModal && (
        <ProofModal order={viewModal} signedUrl={signedUrl} onClose={() => { setViewModal(null); setSignedUrl(null); }} />
      )}

      {rejectModalOrder && (
        <RejectReasonModal
          isPending={rejectOrder.isPending}
          onClose={() => setRejectModalOrder(null)}
          onConfirm={(reason) => rejectOrder.mutate({ orderId: rejectModalOrder.id, reason })}
        />
      )}
    </div>
  );
};

export default AdminPaymentReviewTab;
