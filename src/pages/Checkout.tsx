import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle, Loader2, ShieldCheck, ImageOff, Upload, MessageCircle, Smartphone } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useClearCart } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FreightCalculator from "@/components/freight/FreightCalculator";
import { useFreight } from "@/hooks/useFreight";
import { useSiteSetting } from "@/hooks/useSiteSettings";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

type Step = "address" | "payment" | "confirm" | "success";

// ── Extrai número de telefone de uma URL wa.me ──────────────────────────────
const extractWhatsAppNumber = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/wa\.me\/(\d+)/);
  return match ? match[1] : null;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cartItems = [], isLoading: cartLoading } = useCart();
  const clearCart = useClearCart();
  const queryClient = useQueryClient();
  const { provinces, getMunicipalitiesByProvince } = useFreight();

  const [step, setStep] = useState<Step>("address");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    provinceId: "",
    provinceName: "",
    municipalityCode: "" as string | null,
    municipalityName: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [freightSelections, setFreightSelections] = useState<any[]>([]);
  const [freightTotal, setFreightTotal] = useState(0);

  // ── Comprovativo na app ──
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);

  // ── WhatsApp da plataforma ──
  const { data: whatsappUrl } = useSiteSetting("social_whatsapp_url");
  const whatsappNumber = extractWhatsAppNumber(whatsappUrl || "");

  const handleFreightChange = useCallback((selections: any[], total: number) => {
    setFreightSelections(selections);
    setFreightTotal(total);
  }, []);

  const municipalities = address.provinceId
    ? getMunicipalitiesByProvince(Number(address.provinceId))
    : [];

  const productIds = cartItems.map((item: any) => item.product_id);

  const { data: productSellers = [] } = useQuery({
    queryKey: ["checkout_product_sellers", productIds],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data } = await supabase
        .from("products")
        .select(`
          id, title, price, image_url, seller_id, company_id,
          sellers(id, name, municipality_code),
          companies(id, name, municipality_code)
        `)
        .in("id", productIds);
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  const { data: coverMediaMap = {} } = useQuery({
    queryKey: ["checkout_cover_media", productIds],
    queryFn: async () => {
      if (!productIds.length) return {};
      const { data } = await supabase
        .from("product_media")
        .select("product_id, url")
        .in("product_id", productIds)
        .eq("is_cover", true);
      const map: Record<string, string> = {};
      (data || []).forEach((m: any) => { map[m.product_id] = m.url; });
      return map;
    },
    enabled: productIds.length > 0,
  });

  const getItemImageUrl = (item: any): string | null => {
    return coverMediaMap[item.product_id] || item.products?.image_url || null;
  };

  const cartGroups = (() => {
    const map = new Map<string, any>();
    for (const item of cartItems as any[]) {
      const prod = productSellers.find((p: any) => p.id === item.product_id);
      if (!prod) continue;
      let entityId: string | null = null;
      let entityName: string = "Vendedor";
      let originMunicipalityCode: string = "";
      let isCompany = false;
      const sellerRel: any = Array.isArray(prod.sellers) ? prod.sellers[0] : prod.sellers;
      const companyRel: any = Array.isArray(prod.companies) ? prod.companies[0] : prod.companies;
      if (sellerRel) {
        entityId = sellerRel.id; entityName = sellerRel.name;
        originMunicipalityCode = sellerRel.municipality_code ?? ""; isCompany = false;
      } else if (companyRel) {
        entityId = companyRel.id; entityName = companyRel.name;
        originMunicipalityCode = companyRel.municipality_code ?? ""; isCompany = true;
      }
      if (!entityId || !originMunicipalityCode) continue;
      if (!map.has(entityId)) {
        map.set(entityId, { seller: { sellerId: entityId, sellerName: entityName, originMunicipalityCode }, items: [], subtotal: 0, isCompany });
      }
      const group = map.get(entityId)!;
      group.items.push({ id: item.id, name: prod.title, quantity: item.quantity, price: prod.price, imageUrl: coverMediaMap[prod.id] || prod.image_url });
      group.subtotal += prod.price * item.quantity;
    }
    return Array.from(map.values());
  })();

  const subtotal = cartItems.reduce((sum: number, item: any) =>
    sum + (item.products?.price || 0) * item.quantity, 0);
  const total = subtotal + freightTotal;

  const needsProof = paymentMethod === "bank_transfer" || paymentMethod === "multicaixa_express";

  // ── Upload comprovativo na app ──
  const handleProofUpload = async () => {
    if (!proofFile || !orderId) return;
    setProofUploading(true);
    try {
      const ext = proofFile.name.split(".").pop();
      const path = `proofs/${orderId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("order-proofs").upload(path, proofFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("order-proofs").getPublicUrl(path);
      // Guarda referência na ordem
      await supabase.from("orders").update({ proof_url: urlData.publicUrl } as any).eq("id", orderId);
      // Notificação para admin
      await supabase.from("notifications").insert({
        user_id: user!.id,
        title: "Comprovativo enviado",
        message: `Comprovativo do pedido #${orderId.slice(0, 8)} enviado com sucesso.`,
        type: "order",
        link_url: "/pedidos",
        is_read: false,
      } as any);
      setProofSent(true);
      toast.success("Comprovativo enviado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar comprovativo");
    } finally {
      setProofUploading(false);
    }
  };

  // ── Enviar via WhatsApp ──
  const handleWhatsAppProof = () => {
    if (!whatsappNumber) return;
    const msg = encodeURIComponent(
      `Olá! Envio o comprovativo do meu pedido #${orderId?.slice(0, 8)} no valor de ${formatPrice(total)}. Por favor confirme o pagamento.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, "_blank");
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      const primaryGroup = cartGroups[0];
      const primarySellerId = primaryGroup?.isCompany ? null : primaryGroup?.seller?.sellerId ?? null;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          seller_id: primarySellerId,
          total, subtotal,
          shipping_cost: freightTotal,
          discount_amount: 0,
          status: "pending",
          shipping_name: address.name,
          shipping_phone: address.phone,
          shipping_province: address.provinceName,
          shipping_city: address.municipalityName,
          shipping_address: address.street,
          shipping_municipality_code: address.municipalityCode,
          payment_method: paymentMethod,
          total_amount: total,
          subtotal_amount: subtotal,
          freight_amount: freightTotal,
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

      if (freightSelections.length > 0) {
        const freightRows = freightSelections.map((s: any) => ({
          order_id: order.id, seller_id: s.sellerId, delivery_type: s.deliveryType,
          price: s.price, days_min: s.daysMin, days_max: s.daysMax, source: s.source,
        }));
        await supabase.from("order_freight").insert(freightRows);
      }

      const sellerIds = cartGroups.filter((g: any) => !g.isCompany).map((g: any) => g.seller.sellerId);
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase.from("sellers").select("id, user_id").in("id", sellerIds);
        const notifications = (sellers || []).map((s: any) => ({
          user_id: s.user_id,
          title: "Novo pedido recebido!",
          message: `Tem um novo pedido #${order.id.slice(0, 8)} no valor de ${total.toLocaleString("pt-AO")} Kz.`,
          type: "order", link_url: "/painel-vendedor", is_read: false,
        }));
        if (notifications.length > 0) await supabase.from("notifications").insert(notifications);
      }

      await clearCart.mutateAsync();
      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOrderId(order.id);
      setStep("success");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pedido");
    },
  });

  if (!user) { navigate("/auth"); return null; }
  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (cartItems.length === 0 && step !== "success") { navigate("/carrinho"); return null; }

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

      {step !== "success" && (
        <div className="container mx-auto px-3 max-w-2xl py-4">
          <div className="flex items-center gap-2 justify-center">
            {(["address", "payment", "confirm"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s ? "bg-primary text-primary-foreground" :
                  (["address", "payment", "confirm"].indexOf(step) > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")
                }`}>{i + 1}</div>
                {i < 2 && <div className={`w-8 h-0.5 ${["address", "payment", "confirm"].indexOf(step) > i ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
            <span>Endereço</span><span>Pagamento</span><span>Confirmar</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 max-w-2xl">

        {/* STEP 1 */}
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
                    <select value={address.provinceId} onChange={e => {
                      const prov = provinces.find(p => String(p.id) === e.target.value);
                      setAddress(prev => ({ ...prev, provinceId: e.target.value, provinceName: prov?.name ?? "", municipalityCode: null, municipalityName: "" }));
                    }} className="w-full mt-1 h-9 px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="">Seleccionar…</option>
                      {provinces.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Município</label>
                    <select value={address.municipalityCode ?? ""} onChange={e => {
                      const mun = municipalities.find(m => m.code === e.target.value);
                      setAddress(prev => ({ ...prev, municipalityCode: e.target.value || null, municipalityName: mun?.name ?? "" }));
                    }} disabled={!address.provinceId}
                      className="w-full mt-1 h-9 px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
                      <option value="">Seleccionar…</option>
                      {municipalities.map(m => <option key={m.id} value={m.code}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Rua / Bairro / Referência</label>
                  <textarea value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none" placeholder="Rua, número, bairro..." />
                </div>
              </div>
            </div>
            <FreightCalculator cartGroups={cartGroups} destMunicipalityCode={address.municipalityCode} onFreightChange={handleFreightChange} showAddressSelector={false} />
            <button onClick={() => setStep("payment")} disabled={!address.name || !address.phone || !address.street || !address.municipalityCode}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50">
              Continuar
            </button>
          </div>
        )}

        {/* STEP 2 */}
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
                  { id: "bank_transfer", label: "Transferência bancária", desc: "Transfira para a conta indicada e envie o comprovativo" },
                  { id: "multicaixa_express", label: "Multicaixa Express", desc: "Pague via Multicaixa Express e envie o comprovativo" },
                ].map(method => (
                  <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <p className="text-sm font-bold text-foreground">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("address")} className="flex-1 py-3 rounded-full border border-border text-foreground font-bold text-sm">Voltar</button>
              <button onClick={() => setStep("confirm")} className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm">Continuar</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold text-foreground">Entrega</h3></div>
                <button onClick={() => setStep("address")} className="text-xs text-primary font-semibold">Editar</button>
              </div>
              <p className="text-xs text-muted-foreground">{address.name} — {address.phone}</p>
              <p className="text-xs text-muted-foreground">{address.street}, {address.municipalityName}, {address.provinceName}</p>
            </div>
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold text-foreground">Pagamento</h3></div>
                <button onClick={() => setStep("payment")} className="text-xs text-primary font-semibold">Editar</button>
              </div>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === "cash_on_delivery" ? "Pagamento na entrega" : paymentMethod === "bank_transfer" ? "Transferência bancária" : "Multicaixa Express"}
              </p>
            </div>
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3"><Truck className="w-4 h-4 text-primary" /><h3 className="text-sm font-bold text-foreground">Itens ({cartItems.length})</h3></div>
              <div className="space-y-2">
                {cartItems.map((item: any) => {
                  const imageUrl = getItemImageUrl(item);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      {imageUrl ? (
                        <img src={imageUrl} className="w-12 h-12 rounded-lg object-cover bg-muted" alt={item.products?.title || "Produto"}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; const s = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null; if (s) s.style.display = "flex"; }} />
                      ) : null}
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0" style={{ display: imageUrl ? "none" : "flex" }}>
                        <ImageOff className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{item.products?.title}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatPrice((item.products?.price || 0) * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border mt-3 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {freightTotal > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Frete</span><span>{formatPrice(freightTotal)}</span></div>}
                {freightTotal === 0 && freightSelections.length > 0 && <div className="flex justify-between text-xs text-green-500"><span>Frete</span><span>Grátis</span></div>}
                <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border"><span>Total</span><span>{formatPrice(total)}</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("payment")} className="flex-1 py-3 rounded-full border border-border text-foreground font-bold text-sm">Voltar</button>
              <button onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {placeOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Confirmar pedido
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="py-10">
            <div className="text-center mb-6">
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-black text-foreground mb-2">Pedido confirmado!</h2>
              <p className="text-sm text-muted-foreground">
                O seu pedido foi criado com sucesso. Acompanhe o estado na secção de pedidos.
              </p>
            </div>

            {/* ── Envio de comprovativo ── */}
            {needsProof && !proofSent && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-5">
                <h3 className="text-sm font-black text-foreground mb-1">Enviar comprovativo</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Como pagou por {paymentMethod === "bank_transfer" ? "transferência bancária" : "Multicaixa Express"}, por favor envie o comprovativo de pagamento.
                </p>

                <div className="space-y-3">
                  {/* WhatsApp */}
                  {whatsappNumber && (
                    <button
                      onClick={handleWhatsAppProof}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-500 bg-green-500/5 hover:bg-green-500/10 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-green-600">Enviar via WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Abre o WhatsApp com mensagem pré-preenchida</p>
                      </div>
                    </button>
                  )}

                  {/* Na app */}
                  <div className="border-2 border-border rounded-xl p-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Enviar pela app</p>
                        <p className="text-xs text-muted-foreground">Faça upload do comprovativo directamente</p>
                      </div>
                    </div>
                    <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border bg-muted cursor-pointer hover:bg-muted/70 transition">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">
                        {proofFile ? proofFile.name : "Seleccionar ficheiro"}
                      </span>
                      <input type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => e.target.files?.[0] && setProofFile(e.target.files[0])} />
                    </label>
                    {proofFile && (
                      <button onClick={handleProofUpload} disabled={proofUploading}
                        className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                        {proofUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> A enviar...</> : "Enviar comprovativo"}
                      </button>
                    )}
                  </div>

                  <button onClick={() => setProofSent(true)} className="w-full text-xs text-muted-foreground underline py-1">
                    Enviar mais tarde
                  </button>
                </div>
              </div>
            )}

            {proofSent && needsProof && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-5 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-green-600">Comprovativo enviado!</p>
                <p className="text-xs text-muted-foreground mt-1">A equipa irá confirmar o pagamento em breve.</p>
              </div>
            )}

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
