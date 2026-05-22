import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useClearCart } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FreightCalculator from "@/components/freight/FreightCalculator";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

type Step = "address" | "payment" | "confirm" | "success";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cartItems = [] } = useCart();
  const clearCart = useClearCart();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("address");
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    province: "Luanda",
    city: "Luanda",
    street: "",
    municipalityCode: "" as string | null,
  });
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");

  // ── Frete ──────────────────────────────────────────────────────────────────
  const [freightSelections, setFreightSelections] = useState<any[]>([]);
  const [freightTotal, setFreightTotal] = useState(0);

  const handleFreightChange = useCallback((selections: any[], total: number) => {
    setFreightSelections(selections);
    setFreightTotal(total);
  }, []);

  // Buscar sellers dos produtos no carrinho para montar os cartGroups
  const productIds = cartItems.map((item: any) => item.product_id);
  const { data: productSellers = [] } = useQuery({
    queryKey: ["checkout_product_sellers", productIds],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data } = await supabase
        .from("products")
        .select("id, title, price, image_url, seller_id, sellers(id, name, municipality_code)")
        .in("id", productIds);
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  // Agrupar itens por vendedor para o FreightCalculator
  const cartGroups = (() => {
    const map = new Map<string, any>();
    for (const item of cartItems as any[]) {
      const prod = productSellers.find((p: any) => p.id === item.product_id);
      if (!prod?.sellers) continue;
      const seller = prod.sellers;
      if (!map.has(seller.id)) {
        map.set(seller.id, {
          seller: {
            sellerId: seller.id,
            sellerName: seller.name,
            originMunicipalityCode: seller.municipality_code ?? "",
          },
          items: [],
          subtotal: 0,
        });
      }
      const group = map.get(seller.id)!;
      group.items.push({
        id: item.id,
        name: prod.title,
        quantity: item.quantity,
        price: prod.price,
        imageUrl: prod.image_url,
      });
      group.subtotal += prod.price * item.quantity;
    }
    return Array.from(map.values());
  })();

  const subtotal = cartItems.reduce((sum: number, item: any) => {
    return sum + (item.products?.price || 0) * item.quantity;
  }, 0);

  const total = subtotal + freightTotal;

  const placeOrder = useMutation({
    mutationFn: async () => {
      const fullAddress = `${address.name} - ${address.phone}\n${address.street}, ${address.city}, ${address.province}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          total_amount: total,
          subtotal_amount: subtotal,
          freight_amount: freightTotal,
          status: "pending",
          shipping_address: fullAddress,
          shipping_municipality_code: address.municipalityCode,
          payment_method: paymentMethod,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const items = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: item.products?.price || 0,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      // Guardar selecções de frete por vendedor
      if (freightSelections.length > 0) {
        const freightRows = freightSelections.map((s: any) => ({
          order_id: order.id,
          seller_id: s.sellerId,
          delivery_type: s.deliveryType,
          price: s.price,
          days_min: s.daysMin,
          days_max: s.daysMax,
          source: s.source,
        }));
        await supabase.from("order_freight").insert(freightRows);
      }

      // Notificar vendedores
      const sellerIds = [...new Set(freightSelections.map((s: any) => s.sellerId))];
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from("sellers")
          .select("id, user_id")
          .in("id", sellerIds);

        const notifications = (sellers || []).map((s: any) => ({
          user_id: s.user_id,
          title: "Novo pedido recebido!",
          message: `Tem um novo pedido #${order.id.slice(0, 8)} no valor de ${total.toLocaleString("pt-AO")} Kz. Aceite ou rejeite no painel.`,
          type: "order",
          link_url: "/painel-vendedor",
          is_read: false,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      await clearCart.mutateAsync();
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setStep("success");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pedido");
    },
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (cartItems.length === 0 && step !== "success") {
    navigate("/carrinho");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-14">
      <div className="container mx-auto px-3 pt-3 flex items-center gap-3">
        <button onClick={() => step === "success" ? navigate("/") : navigate(-1)} className="text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-bold text-foreground">
          {step === "success" ? "Pedido confirmado" : "Finalizar compra"}
        </span>
      </div>

      {/* Steps indicator */}
      {step !== "success" && (
        <div className="container mx-auto px-3 max-w-2xl py-4">
          <div className="flex items-center gap-2 justify-center">
            {(["address", "payment", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s ? "bg-primary text-primary-foreground" :
                  (["address", "payment", "confirm"].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${["address", "payment", "confirm"].indexOf(step) > i ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
            <span>Endereço</span>
            <span>Pagamento</span>
            <span>Confirmar</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 max-w-2xl">

        {/* STEP 1: Address */}
        {step === "address" && (
          <div className="space-y-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Endereço de entrega</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome completo</label>
                  <input value={address.name} onChange={e => setAddress(p => ({ ...p, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" placeholder="Seu nome" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                  <input value={address.phone} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" placeholder="+244 9XX XXX XXX" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Província</label>
                    <input value={address.province} onChange={e => setAddress(p => ({ ...p, province: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Cidade</label>
                    <input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Rua / Bairro / Referência</label>
                  <textarea value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))}
                    rows={2} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none" placeholder="Rua, número, bairro..." />
                </div>
              </div>
            </div>

            {/* Frete — selector de município + opções por vendedor */}
            <FreightCalculator
              cartGroups={cartGroups}
              destMunicipalityCode={address.municipalityCode}
              onFreightChange={handleFreightChange}
              showAddressSelector={true}
            />

            <button
              onClick={() => setStep("payment")}
              disabled={!address.name || !address.phone || !address.street}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* STEP 2: Payment */}
        {step === "payment" && (
          <div className="space-y-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Método de pagamento</h3>
              </div>
              <div className="space-y-2">
                {[
                  { id: "cash_on_delivery", label: "Pagamento na entrega", desc: "Pague em dinheiro ao receber" },
                  { id: "bank_transfer", label: "Transferência bancária", desc: "Transfira para a conta do vendedor" },
                  { id: "multicaixa_express", label: "Multicaixa Express", desc: "Pague via Multicaixa Express" },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("address")} className="flex-1 py-3 rounded-full border border-border text-foreground font-bold text-sm">
                Voltar
              </button>
              <button onClick={() => setStep("confirm")} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            {/* Address summary */}
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Entrega</h3>
                </div>
                <button onClick={() => setStep("address")} className="text-xs text-primary font-semibold">Editar</button>
              </div>
              <p className="text-xs text-muted-foreground">{address.name} — {address.phone}</p>
              <p className="text-xs text-muted-foreground">{address.street}, {address.city}, {address.province}</p>
            </div>

            {/* Payment summary */}
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Pagamento</h3>
                </div>
                <button onClick={() => setStep("payment")} className="text-xs text-primary font-semibold">Editar</button>
              </div>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "cash_on_delivery" ? "Pagamento na entrega" :
                 paymentMethod === "bank_transfer" ? "Transferência bancária" : "Multicaixa Express"}
              </p>
            </div>

            {/* Items */}
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Itens ({cartItems.length})</h3>
              </div>
              <div className="space-y-2">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.products?.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop"}
                      className="w-12 h-12 rounded-lg object-cover" alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{item.products?.title}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatPrice((item.products?.price || 0) * item.quantity)}</p>
                  </div>
                ))}
              </div>

              {/* Resumo de valores */}
              <div className="border-t border-border mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {freightTotal > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Frete</span>
                    <span>{formatPrice(freightTotal)}</span>
                  </div>
                )}
                {freightTotal === 0 && freightSelections.length > 0 && (
                  <div className="flex justify-between text-xs text-green-500">
                    <span>Frete</span>
                    <span>Grátis</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("payment")} className="flex-1 py-3 rounded-full border border-border text-foreground font-bold text-sm">
                Voltar
              </button>
              <button
                onClick={() => placeOrder.mutate()}
                disabled={placeOrder.isPending}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placeOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Confirmar pedido
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center py-16">
            <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-black text-foreground mb-2">Pedido confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              O seu pedido foi criado com sucesso. Acompanhe o estado na secção de pedidos.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button onClick={() => navigate("/pedidos")} className="py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                Ver meus pedidos
              </button>
              <button onClick={() => navigate("/")} className="py-3 rounded-full border border-border text-foreground font-bold text-sm">
                Continuar comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
