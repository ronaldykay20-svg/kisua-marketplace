import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle, Loader2, ShieldCheck, ImageOff, Upload, FileCheck, X, Building2, Smartphone } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useClearCart } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FreightCalculator from "@/components/freight/FreightCalculator";
import { useFreight } from "@/hooks/useFreight";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

type Step = "address" | "payment" | "confirm" | "success";

// Métodos que exigem envio de comprovativo antes de confirmar o pedido
const METHODS_REQUIRING_PROOF = ["bank_transfer", "multicaixa_express"];

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cartItems = [], isLoading: cartLoading } = useCart();
  const clearCart = useClearCart();
  const queryClient = useQueryClient();
  const { provinces, getMunicipalitiesByProvince } = useFreight();

  const [step, setStep] = useState<Step>("address");
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

  // ── Comprovativo de pagamento ──
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState("");

  const handleFreightChange = useCallback((selections: any[], total: number) => {
    setFreightSelections(selections);
    setFreightTotal(total);
  }, []);

  const municipalities = address.provinceId
    ? getMunicipalitiesByProvince(Number(address.provinceId))
    : [];

  const productIds = cartItems.map((item: any) => item.product_id);

  // Busca produtos com seller OU company — municipality_code vem SEMPRE do seller/company
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

  // A foto REAL do produto vive em product_media (is_cover = true), não na coluna
  // image_url de products (que ficou obsoleta após a migração R2 → Supabase Storage).
  // Mesmo padrão usado em SearchResults.tsx para listagens de produtos.
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

  // Resolve a imagem correta de um item do carrinho: capa real -> image_url (legado) -> nada
  const getItemImageUrl = (item: any): string | null => {
    return coverMediaMap[item.product_id] || item.products?.image_url || null;
  };

  // Contas de pagamento ativas (geridas pelo Adm) — busca conforme o método escolhido
  const { data: paymentAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["payment_accounts", paymentMethod],
    queryFn: async () => {
      if (!METHODS_REQUIRING_PROOF.includes(paymentMethod)) return [];
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .eq("type", paymentMethod)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: METHODS_REQUIRING_PROOF.includes(paymentMethod),
  });

  const requiresProof = METHODS_REQUIRING_PROOF.includes(paymentMethod);

  // Agrupa por vendedor OU empresa
  // municipality_code vem SEMPRE do seller ou company em tempo real
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
        entityId = sellerRel.id;
        entityName = sellerRel.name;
        originMunicipalityCode = sellerRel.municipality_code ?? "";
        isCompany = false;
      } else if (companyRel) {
        entityId = companyRel.id;
        entityName = companyRel.name;
        originMunicipalityCode = companyRel.municipality_code ?? "";
        isCompany = true;
      }


      if (!entityId || !originMunicipalityCode) continue;

      if (!map.has(entityId)) {
        map.set(entityId, {
          seller: {
            sellerId: entityId,
            sellerName: entityName,
            originMunicipalityCode,
          },
          items: [],
          subtotal: 0,
          isCompany,
        });
      }
      const group = map.get(entityId)!;
      group.items.push({
        id: item.id,
        name: prod.title,
        quantity: item.quantity,
        price: prod.price,
        imageUrl: coverMediaMap[prod.id] || prod.image_url,
      });
      group.subtotal += prod.price * item.quantity;
    }
    return Array.from(map.values());
  })();

  const subtotal = cartItems.reduce((sum: number, item: any) => {
    return sum + (item.products?.price || 0) * item.quantity;
  }, 0);

  const total = subtotal + freightTotal;

  // ── Seleção e validação do ficheiro de comprovativo ──
  const handleProofSelect = (file: File | undefined | null) => {
    setProofError("");
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setProofError("Envie uma imagem (JPG/PNG) ou um PDF.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setProofError("O ficheiro deve ter no máximo 8MB.");
      return;
    }

    setProofFile(file);
    if (isImage) {
      setProofPreviewUrl(URL.createObjectURL(file));
    } else {
      setProofPreviewUrl(null); // PDF não tem preview de imagem
    }
  };

  const removeProof = () => {
    setProofFile(null);
    setProofPreviewUrl(null);
    setProofError("");
  };

  // Faz upload do comprovativo para o bucket privado payment-proofs e devolve o path
  const uploadProof = async (): Promise<string> => {
    if (!proofFile || !user) throw new Error("Comprovativo não selecionado");
    const ext = proofFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, proofFile, {
      contentType: proofFile.type,
    });
    if (error) throw error;
    return path;
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      let paymentProofPath: string | null = null;

      if (requiresProof) {
        if (!proofFile) throw new Error("Por favor anexe o comprovativo de pagamento.");
        setUploadingProof(true);
        try {
          paymentProofPath = await uploadProof();
        } finally {
          setUploadingProof(false);
        }
      }

      const primaryGroup = cartGroups[0];
      const primarySellerId = primaryGroup?.isCompany ? null : primaryGroup?.seller?.sellerId ?? null;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          seller_id: primarySellerId,
          total: total,
          subtotal: subtotal,
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
          // Comprovativo: se o método não exige (pagamento na entrega), fica null
          // e payment_verified é marcado true de imediato (não há nada a confirmar).
          payment_proof_url: paymentProofPath,
          payment_verified: !requiresProof,
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

      // Se o pagamento precisa de confirmação manual, o vendedor NÃO é notificado
      // agora — só depois do Adm/Moderador aprovar o comprovativo. Se for
      // pagamento na entrega, segue o fluxo normal de notificação imediata.
      if (!requiresProof) {
        const sellerGroups = cartGroups.filter((g: any) => !g.isCompany);
        const sellerIds = sellerGroups.map((g: any) => g.seller.sellerId);

        if (sellerIds.length > 0) {
          const { data: sellers } = await supabase
            .from("sellers")
            .select("id, user_id")
            .in("id", sellerIds);

          const payLabel =
            paymentMethod === "cash_on_delivery" ? "Pagamento na entrega" :
            paymentMethod === "bank_transfer" ? "Transferência bancária" :
            paymentMethod === "multicaixa_express" ? "Multicaixa Express" :
            paymentMethod;

          const notifications = (sellers || [])
            .map((s: any) => {
              const group = sellerGroups.find((g: any) => g.seller.sellerId === s.id);
              if (!group) return null;
              const totalItems = group.items.reduce((n: number, it: any) => n + it.quantity, 0);
              const preview = group.items
                .slice(0, 3)
                .map((it: any) => `• ${it.quantity}× ${it.name}`)
                .join("\n");
              const extra = group.items.length > 3
                ? `\n…e mais ${group.items.length - 3} artigo(s)`
                : "";
              return {
                user_id: s.user_id,
                title: `🛒 Novo pedido #${order.id.slice(0, 8).toUpperCase()} — AÇÃO NECESSÁRIA`,
                message:
                  `Comprador: ${address.name} (${address.phone})\n` +
                  `Entrega: ${address.municipalityName}, ${address.provinceName}\n` +
                  `Pagamento: ${payLabel}\n` +
                  `Total do seu grupo: ${group.subtotal.toLocaleString("pt-AO")} Kz  •  ${totalItems} item(s)\n\n` +
                  `${preview}${extra}\n\n` +
                  `Abra o pedido para aceitar e preparar o envio.`,
                type: "order",
                link_url: `/pedido/${order.id}`,
                is_read: false,
              };
            })
            .filter(Boolean);

          if (notifications.length > 0) {
            await supabase.from("notifications").insert(notifications as any);
          }
        }
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

  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0 && step !== "success") {
    navigate("/carrinho");
    return null;
  }

  const canConfirmOrder = !requiresProof || (!!proofFile && !proofError);

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

        {/* STEP 1: Endereço */}
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
                  <input
                    value={address.name}
                    onChange={e => setAddress(p => ({ ...p, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                  <input
                    value={address.phone}
                    onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
                    placeholder="+244 9XX XXX XXX"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Província</label>
                    <select
                      value={address.provinceId}
                      onChange={e => {
                        const prov = provinces.find(p => String(p.id) === e.target.value);
                        setAddress(prev => ({
                          ...prev,
                          provinceId: e.target.value,
                          provinceName: prov?.name ?? "",
                          municipalityCode: null,
                          municipalityName: "",
                        }));
                      }}
                      className="w-full mt-1 h-9 px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Seleccionar…</option>
                      {provinces.map(p => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Município</label>
                    <select
                      value={address.municipalityCode ?? ""}
                      onChange={e => {
                        const mun = municipalities.find(m => m.code === e.target.value);
                        setAddress(prev => ({
                          ...prev,
                          municipalityCode: e.target.value || null,
                          municipalityName: mun?.name ?? "",
                        }));
                      }}
                      disabled={!address.provinceId}
                      className="w-full mt-1 h-9 px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Seleccionar…</option>
                      {municipalities.map(m => (
                        <option key={m.id} value={m.code}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Rua / Bairro / Referência</label>
                  <textarea
                    value={address.street}
                    onChange={e => setAddress(p => ({ ...p, street: e.target.value }))}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none"
                    placeholder="Rua, número, bairro..."
                  />
                </div>
              </div>
            </div>

            <FreightCalculator
              cartGroups={cartGroups}
              destMunicipalityCode={address.municipalityCode}
              onFreightChange={handleFreightChange}
              showAddressSelector={false}
            />

            <button
              onClick={() => setStep("payment")}
              disabled={!address.name || !address.phone || !address.street || !address.municipalityCode}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* STEP 2: Pagamento */}
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
                  { id: "bank_transfer", label: "Transferência bancária", desc: "Transfira para a conta do Ango Express" },
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

            {/* Contas de pagamento (banco ou Multicaixa) — geridas pelo Adm */}
            {requiresProof && (
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  {paymentMethod === "bank_transfer" ? (
                    <Building2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-primary" />
                  )}
                  <h3 className="text-sm font-bold text-foreground">Dados para pagamento</h3>
                </div>

                {loadingAccounts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : paymentAccounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma conta de pagamento disponível neste momento. Por favor contacte o suporte.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {paymentAccounts.map((acc: any) => (
                      <div key={acc.id} className="rounded-lg border border-border bg-background p-3 space-y-1">
                        {paymentMethod === "bank_transfer" ? (
                          <>
                            {acc.bank_name && <p className="text-xs text-muted-foreground">Banco: <span className="font-semibold text-foreground">{acc.bank_name}</span></p>}
                            <p className="text-xs text-muted-foreground">Titular: <span className="font-semibold text-foreground">{acc.account_holder}</span></p>
                            {acc.iban && <p className="text-xs text-muted-foreground">IBAN: <span className="font-semibold text-foreground">{acc.iban}</span></p>}
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">Titular: <span className="font-semibold text-foreground">{acc.account_holder}</span></p>
                            {acc.phone_number && <p className="text-xs text-muted-foreground">Número: <span className="font-semibold text-foreground">{acc.phone_number}</span></p>}
                          </>
                        )}
                        {acc.notes && <p className="text-[11px] text-muted-foreground italic mt-1">{acc.notes}</p>}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Após transferir, anexe o comprovativo na próxima etapa para confirmarmos o seu pedido.
                    </p>
                  </div>
                )}
              </div>
            )}

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

        {/* STEP 3: Confirmar */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Entrega</h3>
                </div>
                <button onClick={() => setStep("address")} className="text-xs text-primary font-semibold">Editar</button>
              </div>
              <p className="text-xs text-muted-foreground">{address.name} — {address.phone}</p>
              <p className="text-xs text-muted-foreground">
                {address.street}, {address.municipalityName}, {address.provinceName}
              </p>
            </div>

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

            {/* Upload do comprovativo — obrigatório para transferência/Multicaixa */}
            {requiresProof && (
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Comprovativo de pagamento</h3>
                  <span className="text-[10px] font-bold text-red-500 ml-auto">Obrigatório</span>
                </div>

                {!proofFile ? (
                  <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Toque para anexar imagem ou PDF</span>
                    <span className="text-[10px] text-muted-foreground">JPG, PNG ou PDF — máx. 8MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={e => handleProofSelect(e.target.files?.[0])}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                    {proofPreviewUrl ? (
                      <img src={proofPreviewUrl} alt="Comprovativo" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{proofFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(proofFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button onClick={removeProof} className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {proofError && <p className="text-xs text-red-500 mt-2">{proofError}</p>}

                <p className="text-[11px] text-muted-foreground mt-2">
                  O seu pedido só será encaminhado ao vendedor depois da nossa equipa confirmar o pagamento.
                </p>
              </div>
            )}

            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Itens ({cartItems.length})</h3>
              </div>
              <div className="space-y-2">
                {cartItems.map((item: any) => {
                  const imageUrl = getItemImageUrl(item);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          className="w-12 h-12 rounded-lg object-cover bg-muted"
                          alt={item.products?.title || "Produto"}
                          onError={(e) => {
                            // Se a URL real falhar ao carregar, mostra estado neutro em vez de uma foto de outro produto
                            (e.target as HTMLImageElement).style.display = "none";
                            const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                            if (sibling) sibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"
                        style={{ display: imageUrl ? "none" : "flex" }}
                      >
                        <ImageOff className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{item.products?.title}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatPrice((item.products?.price || 0) * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

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
                disabled={placeOrder.isPending || uploadingProof || !canConfirmOrder}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(placeOrder.isPending || uploadingProof) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Confirmar pedido
              </button>
            </div>
            {requiresProof && !proofFile && (
              <p className="text-[11px] text-center text-muted-foreground -mt-2">
                Anexe o comprovativo acima para poder confirmar o pedido.
              </p>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center py-16">
            <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-black text-foreground mb-2">Pedido confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {requiresProof
                ? "Recebemos o seu comprovativo. Vamos confirmar o pagamento e o seu pedido será encaminhado ao vendedor em breve."
                : "O seu pedido foi criado com sucesso. Acompanhe o estado na secção de pedidos."}
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
