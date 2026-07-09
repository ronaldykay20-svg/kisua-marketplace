import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, Package, ShoppingBag, ImageOff, MapPin, Phone, Store, Building2,
  ArrowRight, Truck, Send, X, Loader2, User, Boxes, CheckCircle, XCircle, FileCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatPrice = (price: number) =>
  Number(price || 0).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", paid: "Pago", processing: "A processar",
  shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};

const SUPPLIER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", shipped: "Enviado", delivered: "Entregue",
};

const PAY_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: "Pagamento na entrega",
  bank_transfer: "Transferência bancária",
  multicaixa_express: "Multicaixa Express",
};

const statusColor = (s: string) => {
  if (["delivered"].includes(s)) return "bg-green-500/10 text-green-600";
  if (["cancelled"].includes(s)) return "bg-red-500/10 text-red-600";
  if (["shipped"].includes(s)) return "bg-purple-500/10 text-purple-600";
  if (["confirmed", "paid", "processing"].includes(s)) return "bg-blue-500/10 text-blue-600";
  return "bg-amber-500/10 text-amber-600";
};

// ─── Modal: enviar aviso/notificação ────────────────────────────────────────────
const NotifyModal = ({
  title, defaultMessage, onSend, onClose, isPending,
}: {
  title: string; defaultMessage: string;
  onSend: (message: string) => void; onClose: () => void; isPending: boolean;
}) => {
  const [message, setMessage] = useState(defaultMessage);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground resize-none mb-3"
          placeholder="Escreva o aviso..."
        />
        <div className="flex gap-2">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-2 bg-muted text-foreground text-xs font-bold rounded-lg disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => onSend(message)}
            disabled={isPending || !message.trim()}
            className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar aviso
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Imagem do item com fallback neutro ─────────────────────────────────────────
const ItemImage = ({ url, alt }: { url: string | null; alt: string }) => (
  url ? (
    <img src={url} alt={alt} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-muted" />
  ) : (
    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
      <ImageOff className="w-5 h-5 text-muted-foreground" />
    </div>
  )
);

// ─── Miniatura do comprovativo — gera um link temporário seguro (bucket privado) ─
const ProofThumbnail = ({ path }: { path: string }) => {
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["payment_proof_signed_url", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 55 * 60 * 1000,
  });

  if (isLoading || !signedUrl) {
    return (
      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPdf = path.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    return (
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-16 h-16 rounded-lg bg-muted flex flex-col items-center justify-center gap-0.5 flex-shrink-0"
      >
        <FileCheck className="w-5 h-5 text-primary" />
        <span className="text-[8px] font-bold text-muted-foreground">Ver PDF</span>
      </a>
    );
  }

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
      <img src={signedUrl} alt="Comprovativo de pagamento" className="w-16 h-16 rounded-lg object-cover" />
    </a>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SECÇÃO 1 — Pedidos normais (orders / order_items: vendedor individual ou loja)
// ════════════════════════════════════════════════════════════════════════════
const NormalOrdersSection = () => {
  const queryClient = useQueryClient();
  const [notifyTarget, setNotifyTarget] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("pedido");
  const highlightRef = useRef<HTMLDivElement>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin_full_orders_normal"],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!ordersData?.length) return [];

      const orderIds = ordersData.map((o: any) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      let productMap: Record<string, any> = {};
      if (productIds.length) {
        const { data: products } = await supabase
          .from("products")
          .select("id, title, image_url, seller_id, company_id")
          .in("id", productIds);
        const { data: covers } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        const coverMap: Record<string, string> = {};
        (covers || []).forEach((c: any) => { coverMap[c.product_id] = c.url; });

        const sellerIds = [...new Set((products || []).map((p: any) => p.seller_id).filter(Boolean))];
        const companyIds = [...new Set((products || []).map((p: any) => p.company_id).filter(Boolean))];
        const { data: sellers } = sellerIds.length
          ? await supabase.from("sellers").select("id, name, user_id").in("id", sellerIds)
          : { data: [] as any[] };
        const { data: companies } = companyIds.length
          ? await supabase.from("companies").select("id, name, created_by").in("id", companyIds)
          : { data: [] as any[] };
        const sellerMap = Object.fromEntries((sellers || []).map((s: any) => [s.id, s]));
        const companyMap = Object.fromEntries((companies || []).map((c: any) => [c.id, c]));

        (products || []).forEach((p: any) => {
          productMap[p.id] = {
            ...p,
            cover_url: coverMap[p.id] || p.image_url || null,
            seller: p.seller_id ? sellerMap[p.seller_id] : null,
            company: p.company_id ? companyMap[p.company_id] : null,
          };
        });
      }

      const itemsByOrder: Record<string, any[]> = {};
      (items || []).forEach((i: any) => {
        if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = [];
        itemsByOrder[i.order_id].push({ ...i, product: productMap[i.product_id] || null });
      });

      return ordersData.map((o: any) => ({ ...o, items: itemsByOrder[o.id] || [] }));
    },
    refetchInterval: 20000,
  });

  // Rola até ao pedido indicado na notificação (?pedido=ID) assim que a lista carrega
  useEffect(() => {
    if (highlightId && orders.length > 0 && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, orders.length]);

  const sendNotification = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: "Aviso da administração",
        message,
        type: "order",
        link_url: "/central-pedidos",
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso enviado");
      setNotifyTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aprova o comprovativo: marca o pedido como verificado e só agora notifica
  // os vendedores/lojas envolvidos (isto não acontecia antes da aprovação).
  const approvePayment = useMutation({
    mutationFn: async (order: any) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_verified: true })
        .eq("id", order.id);
      if (error) throw error;

      const groups = new Map<string, { userId: string; label: string; items: any[] }>();
      order.items.forEach((item: any) => {
        const p = item.product;
        const entity = p?.seller
          ? { userId: p.seller.user_id, label: p.seller.name }
          : p?.company
          ? { userId: p.company.created_by, label: p.company.name }
          : null;
        if (!entity?.userId) return;
        if (!groups.has(entity.userId)) groups.set(entity.userId, { ...entity, items: [] });
        groups.get(entity.userId)!.items.push(item);
      });

      const payLabel = PAY_METHOD_LABELS[order.payment_method] || order.payment_method;

      const sellerNotifications = Array.from(groups.values()).map((g) => {
        const totalItems = g.items.reduce((n: number, it: any) => n + it.quantity, 0);
        const preview = g.items
          .slice(0, 3)
          .map((it: any) => `• ${it.quantity}× ${it.product?.title || "Produto"}`)
          .join("\n");
        const extra = g.items.length > 3 ? `\n…e mais ${g.items.length - 3} artigo(s)` : "";
        return {
          user_id: g.userId,
          title: `🛒 Pagamento confirmado — Pedido #${(order.order_number || order.id.slice(0, 8)).toString().toUpperCase()}`,
          message:
            `Comprador: ${order.shipping_name} (${order.shipping_phone})\n` +
            `Entrega: ${order.shipping_city}, ${order.shipping_province}\n` +
            `Pagamento: ${payLabel} — confirmado pela administração\n` +
            `${totalItems} item(s)\n\n${preview}${extra}\n\n` +
            `Abra o pedido para aceitar e preparar o envio.`,
          type: "order",
          link_url: `/pedido/${order.id}`,
          is_read: false,
        };
      });

      if (sellerNotifications.length > 0) {
        await supabase.from("notifications").insert(sellerNotifications as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_full_orders_normal"] });
      toast.success("Pagamento aprovado — vendedores notificados");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectPayment = useMutation({
    mutationFn: async (order: any) => {
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: `Pagamento não confirmado — Pedido #${(order.order_number || order.id.slice(0, 8)).toString().toUpperCase()}`,
        message: "Não conseguimos confirmar o seu comprovativo de pagamento. Por favor contacte o suporte ou envie um novo comprovativo.",
        type: "order",
        link_url: `/pedido/${order.id}`,
        is_read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_full_orders_normal"] });
      toast.success("Pedido rejeitado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (orders.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o: any) => {
        const pendingProof = !!o.payment_proof_url && !o.payment_verified;
        const isHighlighted = o.id === highlightId;
        return (
          <div
            key={o.id}
            ref={isHighlighted ? highlightRef : undefined}
            className={`bg-card rounded-xl border p-3 transition ${
              isHighlighted ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">#{o.order_number || o.id.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-AO")}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(o.status)}`}>
                {ORDER_STATUS_LABELS[o.status] || o.status}
              </span>
            </div>

            {/* Comprador */}
            <div className="rounded-lg bg-muted/50 p-2.5 mb-2 space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> {o.shipping_name || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> {o.shipping_phone || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3 flex-shrink-0" /> {o.shipping_address}, {o.shipping_city}, {o.shipping_province}
              </p>
            </div>

            {/* Comprovativo por aprovar */}
            {pendingProof && (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/5 p-2.5 mb-2 flex items-center gap-3">
                <ProofThumbnail path={o.payment_proof_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-600">Comprovativo por aprovar</p>
                  <p className="text-[10px] text-muted-foreground">
                    {PAY_METHOD_LABELS[o.payment_method] || o.payment_method} — confirme antes de liberar ao vendedor.
                  </p>
                </div>
              </div>
            )}

            {/* Itens + vendedor de cada um */}
            <div className="space-y-2 mb-2">
              {o.items.map((item: any) => {
                const p = item.product;
                const entity = p?.seller ? { type: "Vendedor", name: p.seller.name, userId: p.seller.user_id }
                  : p?.company ? { type: "Loja", name: p.company.name, userId: p.company.created_by }
                  : null;
                return (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <ItemImage url={p?.cover_url || null} alt={p?.title || "Produto"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{p?.title || "Produto removido"}</p>
                      <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity} • {formatPrice(item.price)}</p>
                      {entity && (
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1 mt-0.5">
                          {entity.type === "Loja" ? <Building2 className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                          {entity.type}: {entity.name}
                          {entity.userId && (
                            <button
                              onClick={() => setNotifyTarget({ userId: entity.userId, label: entity.name })}
                              className="ml-1 text-[9px] underline text-muted-foreground hover:text-foreground"
                            >
                              avisar
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aprovar / Rejeitar pagamento */}
            {pendingProof && (
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => approvePayment.mutate(o)}
                  disabled={approvePayment.isPending}
                  className="flex-1 py-2 rounded-lg bg-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {approvePayment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Aprovar pagamento
                </button>
                <button
                  onClick={() => {
                    if (confirm("Rejeitar este pagamento? O pedido será cancelado.")) rejectPayment.mutate(o);
                  }}
                  disabled={rejectPayment.isPending}
                  className="flex-1 py-2 rounded-lg bg-red-500/10 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {rejectPayment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Rejeitar
                </button>
              </div>
            )}

            <div className="flex justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">{PAY_METHOD_LABELS[o.payment_method] || o.payment_method}</span>
              <span className="font-bold text-foreground">{formatPrice(o.total)}</span>
            </div>
          </div>
        );
      })}

      {notifyTarget && (
        <NotifyModal
          title={`Avisar ${notifyTarget.label}`}
          defaultMessage="A administração está a acompanhar o seu pedido. Por favor confirme o estado da entrega o quanto antes."
          isPending={sendNotification.isPending}
          onClose={() => setNotifyTarget(null)}
          onSend={(message) => sendNotification.mutate({ userId: notifyTarget.userId, message })}
        />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SECÇÃO 2 — Pedidos de dropship (supplier_orders / supplier_order_items)
// ════════════════════════════════════════════════════════════════════════════
const DropshipOrdersSection = () => {
  const [notifyTarget, setNotifyTarget] = useState<any>(null);

  // 🔗 Lê diretamente dos order_items reais (ligação products.supplier_product_id
  // criada na migração 001), em vez de "supplier_orders"/"supplier_order_items",
  // que nunca recebiam dados de uma venda de verdade.
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin_full_orders_dropship"],
    queryFn: async () => {
      const { data: items, error } = await (supabase as any)
        .from("order_items")
        .select("*, products!inner(seller_id, supplier_product_id), orders!inner(id, created_at, status, shipping_address, payment_verified)")
        .not("products.supplier_product_id", "is", null)
        .eq("orders.payment_verified", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!items?.length) return [];

      const supplierProductIds = [...new Set(items.map((i: any) => i.products.supplier_product_id).filter(Boolean))];
      const sellerIds = [...new Set(items.map((i: any) => i.products.seller_id).filter(Boolean))];

      const { data: sProducts } = supplierProductIds.length
        ? await supabase.from("supplier_products").select("id, name, images, cost_price, supplier_id").in("id", supplierProductIds)
        : { data: [] as any[] };
      const supplierIds = [...new Set((sProducts || []).map((p: any) => p.supplier_id).filter(Boolean))];
      const { data: suppliers } = supplierIds.length
        ? await supabase.from("suppliers").select("id, name, user_id").in("id", supplierIds)
        : { data: [] as any[] };

      const { data: sellers } = sellerIds.length
        ? await (supabase as any).from("sellers").select("id, user_id").in("id", sellerIds)
        : { data: [] as any[] };
      const sellerUserIds = [...new Set((sellers || []).map((s: any) => s.user_id).filter(Boolean))];
      const { data: stores } = sellerUserIds.length
        ? await supabase.from("dropship_stores").select("id, store_name, user_id").in("user_id", sellerUserIds)
        : { data: [] as any[] };

      const sProductMap = Object.fromEntries((sProducts || []).map((p: any) => [p.id, p]));
      const supplierMap = Object.fromEntries((suppliers || []).map((s: any) => [s.id, s]));
      const sellerMap = Object.fromEntries((sellers || []).map((s: any) => [s.id, s]));
      const storeByUserId = Object.fromEntries((stores || []).map((s: any) => [s.user_id, s]));

      const ordersById: Record<string, any> = {};
      for (const item of items) {
        const sp = sProductMap[item.products.supplier_product_id];
        const supplier = sp ? supplierMap[sp.supplier_id] : null;
        const seller = sellerMap[item.products.seller_id];
        const store = seller ? storeByUserId[seller.user_id] : null;

        const saleAmount = item.price * item.quantity;
        const supplierAmount = (sp?.cost_price || 0) * item.quantity;
        const dropshipperAmount = Math.max(0, saleAmount - supplierAmount - saleAmount * 0.10);

        const enrichedItem = {
          ...item,
          supplierProduct: sp,
          supplier,
          store,
          supplier_amount: supplierAmount,
          dropshipper_amount: dropshipperAmount,
        };

        const o = item.orders;
        if (!ordersById[o.id]) {
          ordersById[o.id] = { ...o, store, items: [] };
        }
        ordersById[o.id].items.push(enrichedItem);
      }

      return Object.values(ordersById);
    },
    refetchInterval: 20000,
  });

  const sendNotification = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: "Aviso da administração",
        message,
        type: "order",
        link_url: "/central-pedidos",
        is_read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Aviso enviado"); setNotifyTarget(null); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  if (orders.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground">Nenhum pedido de dropship encontrado.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((o: any) => {
        const addr = o.shipping_address || {};
        return (
          <div key={o.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">#{o.id.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-AO")}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(o.status)}`}>
                {ORDER_STATUS_LABELS[o.status] || o.status}
              </span>
            </div>

            {/* Comprador */}
            <div className="rounded-lg bg-muted/50 p-2.5 mb-2 space-y-0.5">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {addr.name || addr.address || "Morada não disponível"} {addr.phone ? `• ${addr.phone}` : ""}
              </p>
            </div>

            {/* Rota: Fornecedor -> Loja Dropship -> Cliente, por item */}
            <div className="space-y-3 mb-2">
              {o.items.map((item: any) => {
                const cover = Array.isArray(item.supplierProduct?.images) && item.supplierProduct.images.length > 0
                  ? item.supplierProduct.images[0] : null;
                return (
                  <div key={item.id} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <ItemImage url={cover} alt={item.supplierProduct?.name || "Produto"} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{item.supplierProduct?.name || "Produto"}</p>
                        <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity} • {formatPrice(item.price)}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColor(item.supplier_status)}`}>
                        {SUPPLIER_STATUS_LABELS[item.supplier_status] || item.supplier_status}
                      </span>
                    </div>

                    {/* Rota ilustrativa */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600">
                        <Boxes className="w-3 h-3" /> {item.supplier?.name || "Fornecedor"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600">
                        <Store className="w-3 h-3" /> {o.store?.store_name || "Loja"}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                        <User className="w-3 h-3" /> Cliente
                      </span>
                    </div>

                    {/* Divisão de comissão */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px]">
                      <span className="text-muted-foreground">Fornecedor: <span className="font-bold text-foreground">{formatPrice(item.supplier_amount)}</span></span>
                      <span className="text-muted-foreground">Loja/Dropshipper: <span className="font-bold text-foreground">{formatPrice(item.dropshipper_amount)}</span></span>
                    </div>

                    <div className="flex gap-2 mt-2">
                      {item.supplier?.user_id && (
                        <button
                          onClick={() => setNotifyTarget({ userId: item.supplier.user_id, label: item.supplier.name || "Fornecedor" })}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted text-foreground"
                        >
                          Avisar fornecedor
                        </button>
                      )}
                      {o.store?.user_id && (
                        <button
                          onClick={() => setNotifyTarget({ userId: o.store.user_id, label: o.store.store_name || "Loja" })}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted text-foreground"
                        >
                          Avisar loja/dropshipper
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">{o.payment_status === "paid" ? "Pago" : "Pagamento pendente"}</span>
              <span className="font-bold text-foreground">{formatPrice(o.total_amount)}</span>
            </div>
          </div>
        );
      })}

      {notifyTarget && (
        <NotifyModal
          title={`Avisar ${notifyTarget.label}`}
          defaultMessage="A administração está a acompanhar este pedido. Por favor confirme o estado da entrega o quanto antes."
          isPending={sendNotification.isPending}
          onClose={() => setNotifyTarget(null)}
          onSend={(message) => sendNotification.mutate({ userId: notifyTarget.userId, message })}
        />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Página principal
// ════════════════════════════════════════════════════════════════════════════
const AdminFullOrders = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState<"normal" | "dropship">("normal");

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <h1 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" /> Pedidos Completos
        </h1>
        <p className="text-xs text-muted-foreground mb-4">
          Acompanhe todos os pedidos da plataforma, valide comprovativos de pagamento e veja a rota completa de cada produto. Apenas Admin e Moderadores têm acesso.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setSection("normal")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
              section === "normal" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Pedidos da Loja
          </button>
          <button
            onClick={() => setSection("dropship")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
              section === "dropship" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <Package className="w-4 h-4" /> Pedidos de Dropship
          </button>
        </div>

        {section === "normal" ? <NormalOrdersSection /> : <DropshipOrdersSection />}
      </div>
    </div>
  );
};

export default AdminFullOrders;
