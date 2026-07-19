import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle, Loader2, ShieldCheck, ImageOff, Upload, FileCheck, X, Building2, Smartphone, Tag, Lock, PackageCheck, Copy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/useSupabaseData";
import { useClearCart, useRemoveCartItem } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FreightCalculator from "@/components/freight/FreightCalculator";
import { useFreight } from "@/hooks/useFreight";
import { validateCouponCode, redeemCouponCode, fetchWalletCoupons, markWalletCouponUsed, ValidateCouponResult, WalletCoupon } from "@/lib/coupons";
import { trackEvent } from "@/lib/analytics";
import { isFreeShippingEligible } from "@/lib/freeShipping";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

type Step = "address" | "payment" | "confirm" | "success";

// Métodos que exigem envio de comprovativo antes de confirmar o pedido
const METHODS_REQUIRING_PROOF = ["bank_transfer"];

// Métodos processados automaticamente pela AppyPay (Pay4All) — substituem o
// antigo "multicaixa_express" manual. O pagamento é confirmado sozinho pelo
// webhook appypay-webhook assim que o cliente paga, sem precisar de comprovativo.
const APPYPAY_METHODS = ["appypay_gpo", "appypay_ref"];

// Formato do state passado pelo botão "Comprar agora" em ProductDetail.tsx
type SoloProductState = {
  productId: string;
  quantity: number;
  variantId: string | null;
};

// Traduz os motivos devolvidos por validate_coupon (RPC) para mensagens amigáveis.
// A RPC é a fonte da verdade; aqui só cobrimos os casos mais comuns e caímos
// num texto genérico para qualquer motivo que não reconheçamos.
const couponErrorMessage = (reason?: string): string => {
  switch (reason) {
    case "not_found":
      return "Cupom não encontrado.";
    case "inactive":
      return "Este cupom já não está activo.";
    case "expired":
      return "Este cupom expirou.";
    case "usage_limit_reached":
      return "Este cupom atingiu o limite de utilizações.";
    case "user_limit_reached":
      return "Já utilizou este cupom o número máximo de vezes.";
    case "min_purchase":
      return "O valor da compra não atinge o mínimo exigido por este cupom.";
    default:
      return "Cupom inválido ou expirado.";
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const clearCart = useClearCart();
  const removeCartItem = useRemoveCartItem();
  const queryClient = useQueryClient();
  const { provinces, municipalities: allMunicipalities, getMunicipalitiesByProvince } = useFreight();

  // ── Modo da compra ────────────────────────────────────────────────────────
  // "solo"      → veio do botão "Comprar agora" (ignora totalmente o carrinho)
  // "selection" → veio do carrinho, mas só com os itens que o utilizador
  //               marcou como seleccionados (o resto do carrinho fica intacto)
  // "cart"      → fallback: usa o carrinho completo (compatibilidade)
  const soloProduct = (location.state as { soloProduct?: SoloProductState } | null)?.soloProduct;
  const isSoloCheckout = !!soloProduct;

  const selectedCartItems = (location.state as { selectedCartItems?: any[] } | null)?.selectedCartItems;
  const isSelectionCheckout = !isSoloCheckout && Array.isArray(selectedCartItems) && selectedCartItems.length > 0;

  // Carrinho real — só é buscado quando NÃO é compra avulsa nem por selecção
  const { data: realCartItems = [], isLoading: realCartLoading } = useCart();

  // Produto avulso — só é buscado quando É compra avulsa
  const { data: soloProductData, isLoading: soloLoading, isError: soloError } = useQuery({
    queryKey: ["checkout_solo_product", soloProduct?.productId, soloProduct?.variantId],
    queryFn: async () => {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", soloProduct!.productId)
        .maybeSingle();
      if (error || !product) throw new Error("Produto não encontrado");

      let unitPrice = product.price;
      if (soloProduct!.variantId) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, price_override")
          .eq("id", soloProduct!.variantId)
          .maybeSingle();
        if (variant?.price_override) unitPrice = variant.price_override;
      }

      const { data: cover } = await supabase
        .from("product_media")
        .select("url")
        .eq("product_id", product.id)
        .eq("is_cover", true)
        .maybeSingle();

      return { ...product, price: unitPrice, image_url: cover?.url || product.image_url };
    },
    enabled: isSoloCheckout,
    retry: false,
  });

  // ── "cartItems" unificado: a partir daqui, TODO o resto da página usa
  // esta variável e nem sabe se veio do carrinho completo, de uma selecção
  // parcial do carrinho, ou de "Comprar agora".
  const cartItems = isSoloCheckout
    ? (soloProductData
        ? [{
            id: `solo-${soloProduct!.productId}`,
            product_id: soloProduct!.productId,
            variant_id: soloProduct!.variantId,
            quantity: soloProduct!.quantity,
            products: soloProductData,
          }]
        : [])
    : isSelectionCheckout
      ? selectedCartItems!
      : realCartItems;

  const cartLoading = isSoloCheckout ? soloLoading : (isSelectionCheckout ? false : realCartLoading);

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

  // ── Pagamento automático AppyPay (Multicaixa Express / Referência) ──
  const [appypayPhone, setAppypayPhone] = useState("");
  const [appypayResult, setAppypayResult] = useState<{
    referenceNumber: string | null;
    entityNumber: string | null;
  } | null>(null);
  const [appypayError, setAppypayError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // ── Comprovativo de pagamento ──
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofError, setProofError] = useState("");

  // ── Cupom de desconto ──
  // O cupom é um desconto que o vendedor/empresa/dropshipper assume — nunca
  // desconta o frete, que é calculado e cobrado à parte pela plataforma.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [autoApplyDismissed, setAutoApplyDismissed] = useState(false);

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
          id, title, price, image_url, seller_id, company_id, weight_kg,
          free_shipping, free_shipping_scope, free_shipping_province_id, free_shipping_municipality_ids,
          sellers(id, name, municipality_code, logo_url, cover_url),
          companies(id, name, municipality_code, logo_url, banner_url)
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
  const isAppyPay = APPYPAY_METHODS.includes(paymentMethod);
  const isAppypayGpo = paymentMethod === "appypay_gpo";
  const appypayPhoneValid = appypayPhone.replace(/\D/g, "").length >= 9;

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
      let entityLogoUrl: string | null = null;
      let entityCoverUrl: string | null = null;

      const sellerRel: any = Array.isArray(prod.sellers) ? prod.sellers[0] : prod.sellers;
      const companyRel: any = Array.isArray(prod.companies) ? prod.companies[0] : prod.companies;
      if (sellerRel) {
        entityId = sellerRel.id;
        entityName = sellerRel.name;
        originMunicipalityCode = sellerRel.municipality_code ?? "";
        isCompany = false;
        entityLogoUrl = sellerRel.logo_url ?? null;
        entityCoverUrl = sellerRel.cover_url ?? null;
      } else if (companyRel) {
        entityId = companyRel.id;
        entityName = companyRel.name;
        originMunicipalityCode = companyRel.municipality_code ?? "";
        isCompany = true;
        entityLogoUrl = companyRel.logo_url ?? null;
        entityCoverUrl = companyRel.banner_url ?? null;
      }


      if (!entityId || !originMunicipalityCode) continue;

      if (!map.has(entityId)) {
        map.set(entityId, {
          seller: {
            sellerId: entityId,
            sellerName: entityName,
            originMunicipalityCode,
            logoUrl: entityLogoUrl,
            coverUrl: entityCoverUrl,
          },
          items: [],
          subtotal: 0,
          totalWeightKg: 0,
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
        freeShipping: {
          free_shipping_scope: prod.free_shipping_scope,
          free_shipping_province_id: prod.free_shipping_province_id,
          free_shipping_municipality_ids: prod.free_shipping_municipality_ids,
        },
      });
      group.subtotal += prod.price * item.quantity;
      // Peso usado no tarifário das empresas transportadoras (frete interprovincial)
      group.totalWeightKg += (prod.weight_kg ?? 0) * item.quantity;
    }
    return Array.from(map.values());
  })();

  // Município de destino seleccionado (id, não código) — usado para saber se
  // algum produto do carrinho tem frete grátis para essa zona.
  const destMunicipalityId = address.municipalityCode
    ? (allMunicipalities.find((m: any) => m.code === address.municipalityCode)?.id ?? null)
    : null;

  // Um grupo (vendedor/empresa) só fica com frete grátis se TODOS os seus
  // itens no carrinho tiverem frete grátis para o município de destino —
  // caso contrário o frete continua a ser calculado normalmente.
  for (const group of cartGroups as any[]) {
    const eligibleItems = group.items.filter((it: any) =>
      isFreeShippingEligible(it.freeShipping ?? {}, destMunicipalityId, allMunicipalities)
    );
    group.freeShippingEligible =
      destMunicipalityId !== null &&
      group.items.length > 0 &&
      eligibleItems.length === group.items.length;
    // "Parcial" = há pelo menos um produto com frete grátis para este
    // município, mas não todos — o frete continua a ser cobrado, e por isso
    // mostramos um aviso a explicar porquê.
    group.freeShippingPartial =
      destMunicipalityId !== null &&
      eligibleItems.length > 0 &&
      eligibleItems.length < group.items.length;
    group.freeShippingEligibleItemNames = eligibleItems.map((it: any) => it.name);
  }

  const subtotal = cartItems.reduce((sum: number, item: any) => {
    return sum + (item.products?.price || 0) * item.quantity;
  }, 0);

  // ── Cálculo do desconto do cupom ──────────────────────────────────────────
  // eligibleSubtotal = só a parte do carrinho que pertence ao dono do cupom
  // (vendedor/empresa/loja de dropship), ou o carrinho todo se for cupom de
  // plataforma. O desconto NUNCA é aplicado sobre o frete.
  const getEligibleSubtotal = (c: ValidateCouponResult | null): number => {
    if (!c || !c.valid) return 0;
    if (c.scope === "platform") return subtotal;
    const group = cartGroups.find((g: any) => g.seller.sellerId === c.owner_id);
    return group ? group.subtotal : 0;
  };

  const eligibleSubtotal = getEligibleSubtotal(appliedCoupon);

  const discountAmount = (() => {
    if (!appliedCoupon || eligibleSubtotal <= 0) return 0;
    if (appliedCoupon.discount_type === "percent") {
      const raw = eligibleSubtotal * ((appliedCoupon.discount_value || 0) / 100);
      const capped = appliedCoupon.max_discount_amount
        ? Math.min(raw, appliedCoupon.max_discount_amount)
        : raw;
      return Math.min(capped, eligibleSubtotal);
    }
    // fixo — nunca pode exceder o subtotal elegível (não desconta frete)
    return Math.min(appliedCoupon.discount_value || 0, eligibleSubtotal);
  })();

  // Frete fica sempre de fora do cálculo do desconto.
  const total = subtotal - discountAmount + freightTotal;

  // ── Carteira de cupons (estilo Shein): aplica sozinho o melhor cupom elegível ──
  const { data: walletCoupons = [] } = useQuery({
    queryKey: ["wallet_coupons", user?.id],
    queryFn: fetchWalletCoupons,
    enabled: !!user,
  });

  useEffect(() => {
    if (appliedCoupon || autoApplyDismissed) return;
    if ((walletCoupons as WalletCoupon[]).length === 0) return;
    if (cartGroups.length === 0 || subtotal <= 0) return;

    let best: { coupon: WalletCoupon; elig: number; discount: number } | null = null;
    for (const wc of walletCoupons as WalletCoupon[]) {
      const elig = wc.scope === "platform"
        ? subtotal
        : (cartGroups.find((g: any) => g.seller.sellerId === wc.owner_id)?.subtotal ?? 0);
      if (elig <= 0) continue;
      if (wc.min_purchase_amount && elig < wc.min_purchase_amount) continue;

      const raw = wc.discount_type === "percent"
        ? elig * ((wc.discount_value || 0) / 100)
        : (wc.discount_value || 0);
      const discount = Math.min(
        wc.max_discount_amount ? Math.min(raw, wc.max_discount_amount) : raw,
        elig
      );
      if (!best || discount > best.discount) best = { coupon: wc, elig, discount };
    }

    if (best) {
      validateCouponCode(best.coupon.code)
        .then((result) => {
          if (result.valid) {
            setAppliedCoupon(result);
            toast.success(`Cupom aplicado automaticamente da tua carteira 🎟️`);
          }
        })
        .catch(() => {/* silencioso — não bloqueia o checkout */});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletCoupons, cartGroups.length, subtotal, appliedCoupon, autoApplyDismissed]);


  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError("");
    setValidatingCoupon(true);
    try {
      const result = await validateCouponCode(code);
      if (!result.valid) {
        setAppliedCoupon(null);
        setCouponError(couponErrorMessage(result.reason));
        return;
      }
      const elig = result.scope === "platform"
        ? subtotal
        : (cartGroups.find((g: any) => g.seller.sellerId === result.owner_id)?.subtotal ?? 0);

      if (elig <= 0) {
        setAppliedCoupon(null);
        setCouponError("Este cupom não se aplica a nenhum produto no seu carrinho.");
        return;
      }
      if (result.min_purchase_amount && elig < result.min_purchase_amount) {
        setAppliedCoupon(null);
        setCouponError(`Este cupom exige uma compra mínima de ${formatPrice(result.min_purchase_amount)} nos produtos elegíveis.`);
        return;
      }

      setAppliedCoupon(result);
      toast.success("Cupom aplicado!");
    } catch (e: any) {
      setAppliedCoupon(null);
      setCouponError("Não foi possível validar o cupom. Tente novamente.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
    setAutoApplyDismissed(true);
  };

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

      // NOTA: total, subtotal, discount_amount, freight_amount e
      // payment_verified NÃO são mandados aqui de propósito. Esses valores
      // são calculados e validados no servidor (triggers no Supabase), a
      // partir do preço real dos produtos e do payment_method — o valor
      // que o browser mandar para esses campos é ignorado. Buscamos os
      // valores reais de volta com .select() para usar no resto do fluxo
      // (notificações, analytics), em vez de confiar no cálculo local.
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user!.id,
          seller_id: primarySellerId,
          status: "pending",
          shipping_name: address.name,
          shipping_phone: address.phone,
          shipping_province: address.provinceName,
          shipping_city: address.municipalityName,
          shipping_address: address.street,
          shipping_municipality_code: address.municipalityCode,
          payment_method: paymentMethod,
          payment_proof_url: paymentProofPath,
        })
        .select("id, total, subtotal, discount_amount, freight_amount, payment_verified")
        .single();

      if (orderError) throw orderError;

      // unit_price também não é mandado: o servidor busca o preço real do
      // produto/variante no momento do insert e ignora o que vier daqui.
      const items = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;

      // ── Cobrança AppyPay (Multicaixa Express automático ou Referência) ──
      // O pedido já existe nesta altura (é exigido pela Edge Function). Uma
      // falha aqui não invalida o pedido já criado — fica registada para
      // mostrarmos na tela de sucesso, em vez de rebentar todo o checkout.
      let appypayChargeResult: { referenceNumber: string | null; entityNumber: string | null } | null = null;
      let appypayChargeError: string | null = null;

      if (isAppyPay) {
        try {
          const { data: chargeData, error: chargeError } = await supabase.functions.invoke(
            "appypay-create-charge",
            {
              body: {
                order_id: order.id,
                method: isAppypayGpo ? "gpo" : "ref",
                phone_number: isAppypayGpo ? appypayPhone.replace(/\D/g, "") : undefined,
              },
            }
          );
          if (chargeError) throw chargeError;
          if (chargeData?.error) throw new Error(chargeData.error);

          appypayChargeResult = {
            referenceNumber: chargeData?.reference_number ?? null,
            entityNumber: chargeData?.entity_number ?? null,
          };
        } catch (chargeCatchErr: any) {
          console.error("Falha ao criar cobrança AppyPay:", chargeCatchErr);
          appypayChargeError =
            chargeCatchErr?.message ||
            "Não foi possível iniciar o pagamento automático. Tente novamente ou escolha outro método.";
        }
      }

      // Regista o evento de compra no analytics. Feito como "fire and forget"
      // (mesma convenção do useCartActions): se falhar, não deve travar o
      // pedido, que já está criado nas duas linhas acima.
      trackEvent("purchase", {
        metadata: {
          order_id: order.id,
          total: order.total,
          items_count: items.length,
          payment_method: paymentMethod,
          discount_amount: order.discount_amount,
        },
      });

      if (freightSelections.length > 0) {
        const freightRows = freightSelections.map((s: any) => {
          const group = cartGroups.find((g: any) => g.seller.sellerId === s.sellerId);
          const originMun = group
            ? allMunicipalities.find(
                (m: any) => m.code === group.seller.originMunicipalityCode
              )
            : null;
          return {
            order_id: order.id,
            seller_id: s.sellerId,
            delivery_type: s.deliveryType,
            price: s.price,
            days_min: s.daysMin,
            days_max: s.daysMax,
            source: s.source,
            freight_company_id: s.freightCompanyId ?? null,
            origin_province_id: originMun?.province_id ?? null,
            dest_province_id: destMunicipalityId
              ? allMunicipalities.find((m: any) => m.id === destMunicipalityId)
                  ?.province_id ?? null
              : null,
          };
        });
        await supabase.from("order_freight").insert(freightRows);
      }

      // Regista o resgate do cupom (contabiliza uso, actualiza times_used).
      // Feito depois do pedido criado — se falhar por qualquer razão, não
      // travamos o pedido, só reportamos no console para investigação.
      if (appliedCoupon?.code && discountAmount > 0) {
        try {
          await redeemCouponCode(appliedCoupon.code, eligibleSubtotal, order.id);
          if (appliedCoupon.coupon_id) {
            // Não engolir o erro em silêncio: list_display_coupons também usa
            // user_coupons.is_used como sinal de "já esgotado por este user".
            // Se isto falhar sem deixar rasto, o cupom pode voltar a aparecer
            // como "Apanhar cupom" para quem já o gastou.
            await markWalletCouponUsed(appliedCoupon.coupon_id, order.id).catch((walletErr) => {
              console.error("Falha ao marcar cupom da carteira como usado:", walletErr);
            });
          }
        } catch (couponErr) {
          console.error("Falha ao registar resgate do cupom:", couponErr);
        }
      }

      const payLabel =
        paymentMethod === "cash_on_delivery" ? "Pagamento na entrega" :
        paymentMethod === "bank_transfer" ? "Transferência bancária" :
        paymentMethod === "appypay_gpo" ? "Multicaixa Express" :
        paymentMethod === "appypay_ref" ? "Referência Multicaixa" :
        paymentMethod;

      if (requiresProof) {
        // Pagamento por comprovativo: o vendedor só é notificado depois da
        // aprovação do Admin/Moderador (feita em /admin/encomendas).
        // Aqui notificamos quem tem de validar o comprovativo, com todos os
        // dados necessários para decidir e cobrar com precisão.
        const { data: reviewers } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "moderator"]);

        if (reviewers && reviewers.length > 0) {
          const productLines = cartGroups
            .map((g: any) => {
              const entityLabel = g.isCompany ? "Loja" : "Vendedor";
              const itemLines = g.items
                .map((it: any) => `   • ${it.quantity}× ${it.name} — ${formatPrice(it.price * it.quantity)}`)
                .join("\n");
              return `${entityLabel}: ${g.seller.sellerName}\n${itemLines}`;
            })
            .join("\n\n");

          const reviewNotifications = reviewers.map((r: any) => ({
            user_id: r.user_id,
            title: `📄 Comprovativo por aprovar — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
            message:
              `Comprador: ${address.name} (${address.phone})\n` +
              `Entrega: ${address.municipalityName}, ${address.provinceName}\n` +
              `Método: ${payLabel}\n` +
              `Total: ${formatPrice(order.total)}\n\n` +
              `${productLines}\n\n` +
              `Abra o pedido para ver o comprovativo e aprovar o pagamento.`,
            type: "payment_proof",
            link_url: `/admin/encomendas?pedido=${order.id}`,
            image_path: paymentProofPath,
            is_read: false,
          }));

          await supabase.from("notifications").insert(reviewNotifications as any);
        }
      } else if (isAppyPay) {
        // Pagamento automático AppyPay: o vendedor só deve saber depois do
        // pagamento estar confirmado. Essa notificação (e a do comprador)
        // é feita pela Edge Function appypay-webhook quando a AppyPay
        // avisa que o pagamento foi concluído — não fazemos nada aqui.
      } else {
        // Pagamento na entrega: segue o fluxo normal, notifica o vendedor já.
        const sellerGroups = cartGroups.filter((g: any) => !g.isCompany);
        const sellerIds = sellerGroups.map((g: any) => g.seller.sellerId);

        if (sellerIds.length > 0) {
          const { data: sellers } = await supabase
            .from("sellers")
            .select("id, user_id")
            .in("id", sellerIds);

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

      // ── Limpeza do carrinho após o pedido ───────────────────────────────
      // - Compra avulsa ("Comprar agora"): o carrinho nunca foi tocado, não
      //   mexemos em nada.
      // - Checkout por selecção: removemos SÓ os itens que foram comprados,
      //   preservando no carrinho tudo o que o utilizador deixou de fora.
      // - Checkout do carrinho completo (fallback): limpa tudo, como antes.
      if (isSelectionCheckout) {
        for (const item of cartItems as any[]) {
          try {
            await removeCartItem.mutateAsync(item.id);
          } catch (removeErr) {
            console.error("Falha ao remover item comprado do carrinho:", removeErr);
          }
        }
      } else if (!isSoloCheckout) {
        await clearCart.mutateAsync();
      }
      return { order, appypayChargeResult, appypayChargeError };
    },
    onSuccess: ({ order, appypayChargeResult, appypayChargeError }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCreatedOrderId(order.id);
      setAppypayResult(appypayChargeResult);
      setAppypayError(appypayChargeError);
      setStep("success");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pedido");
    },
  });

  // Enquanto estiver na tela de sucesso à espera de um pagamento AppyPay,
  // verifica periodicamente se o webhook já confirmou (payment_verified).
  // Pára assim que confirmado — não precisa de continuar a perguntar.
  const { data: paymentStatus } = useQuery({
    queryKey: ["checkout_payment_status", createdOrderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("payment_verified")
        .eq("id", createdOrderId!)
        .maybeSingle();
      return data;
    },
    enabled: step === "success" && isAppyPay && !!createdOrderId && !appypayError,
    refetchInterval: (query) => (query.state.data?.payment_verified ? false : 4000),
  });
  const appypayConfirmed = !!paymentStatus?.payment_verified;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copiada`),
      () => toast.error("Não foi possível copiar")
    );
  };

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

  // Compra avulsa com produto inexistente/inativo — não faz sentido mandar
  // de volta para "/carrinho" (o usuário nem queria comprar do carrinho).
  if (isSoloCheckout && (soloError || cartItems.length === 0) && step !== "success") {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 bg-background">
        <div>
          <h2 className="text-lg font-bold mb-2 text-foreground">Não foi possível carregar este produto</h2>
          <p className="text-sm text-muted-foreground mb-4">Ele pode ter sido removido ou estar indisponível.</p>
          <button onClick={() => navigate(-1)} className="text-sm font-semibold text-primary">Voltar</button>
        </div>
      </div>
    );
  }

  // Carrinho normal vazio — aqui sim faz sentido mandar para "/carrinho"
  if (!isSoloCheckout && cartItems.length === 0 && step !== "success") {
    navigate("/carrinho");
    return null;
  }

  // O frete tem de estar calculado para TODOS os grupos (vendedor/loja) do
  // pedido antes de poder confirmar. Se o FreightCalculator não conseguiu
  // calcular algum grupo (ex: vendedor sem município de origem definido),
  // "freightSelections" fica incompleto e NÃO deixamos passar em silêncio
  // com frete "0 Kz" — isso escondia o bug de deixar confirmar sem frete real.
  const freightReady = cartGroups.length > 0 && freightSelections.length >= cartGroups.length;

  const canConfirmOrder =
    freightReady &&
    (!requiresProof || (!!proofFile && !proofError)) &&
    (!isAppypayGpo || appypayPhoneValid);

  return (
    <div className="min-h-screen bg-background pb-14">
      <button
        onClick={() => step === "success" ? navigate("/") : navigate(-1)}
        className="fixed top-3 left-3 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-background/90 backdrop-blur border border-border/60 text-foreground active:bg-muted transition-colors shadow-sm"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {step === "success" && (
        <div className="container mx-auto px-3 pt-16 max-w-2xl">
          <span className="text-base font-bold text-foreground">Pedido confirmado</span>
        </div>
      )}

      <div className="container mx-auto px-3 max-w-2xl pt-14">

        {/* STEP 1: Endereço */}
        {step === "address" && (
          <div className="space-y-4 pt-4 pb-44">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-tight">Endereço de entrega</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Para onde enviamos o teu pedido
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome completo</label>
                  <input
                    value={address.name}
                    onChange={e => setAddress(p => ({ ...p, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-background border border-border text-base md:text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Como aparece no teu B.I."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone</label>
                  <input
                    value={address.phone}
                    onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-background border border-border text-base md:text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                      className="w-full mt-1 h-10 px-3 py-1 rounded-xl bg-background border border-border text-base md:text-sm text-foreground appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                        // Município mudou: o frete antigo já não é válido para o
                        // novo destino. Limpamos até o FreightCalculator recalcular
                        // e chamar onFreightChange de novo com os valores certos.
                        setFreightSelections([]);
                        setFreightTotal(0);
                      }}
                      disabled={!address.provinceId}
                      className="w-full mt-1 h-10 px-3 py-1 rounded-xl bg-background border border-border text-base md:text-sm text-foreground appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
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
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-background border border-border text-base md:text-sm text-foreground resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Ex: Rua Amílcar Cabral, nº 12, perto do mercado"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Truck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Entrega por loja</h3>
            </div>

            <FreightCalculator
              cartGroups={cartGroups}
              destMunicipalityCode={address.municipalityCode}
              onFreightChange={handleFreightChange}
              showAddressSelector={false}
            />
          </div>
        )}

        {step === "address" && (
          <div className="fixed bottom-0 inset-x-0 z-[60] bg-card border-t border-border shadow-[0_-6px_20px_-6px_rgba(0,0,0,0.12)]">
            <div className="container mx-auto max-w-2xl px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-center gap-4 mb-2">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Lock className="w-3 h-3 text-walmart-green" />
                  Pagamento seguro
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <PackageCheck className="w-3 h-3 text-walmart-green" />
                  Entrega rastreada
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-walmart-green" />
                  Compra protegida
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  {freightTotal > 0 ? "Total (produtos + frete)" : "Total"}
                </span>
                <span className="text-lg font-extrabold text-foreground tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>

              <button
                onClick={() => setStep("payment")}
                disabled={!address.name || !address.phone || !address.street || !address.municipalityCode || !freightReady}
                className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] transition-transform flex items-center justify-center gap-1.5"
              >
                Continuar para pagamento
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>

              {/* Não deixa avançar para o Pagamento sem uma rota de frete definida
                  para todos os vendedores/lojas do pedido — a notificação aparece
                  aqui, logo no Passo 1, em vez de só lá na confirmação final. */}
              {address.municipalityCode && !freightReady && (
                <p className="text-xs text-center text-destructive font-semibold mt-2">
                  Aguarde o cálculo do frete, ou escolha uma rota alternativa acima
                  (ou levantamento na loja) para poder continuar.
                </p>
              )}
            </div>
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
                  { id: "bank_transfer", label: "Transferência bancária", desc: "Transfira para a conta da Zangu" },
                  // AppyPay (Multicaixa Express / Referência) temporariamente escondido:
                  // a conta AppyPay ainda está a devolver 401 (Unauthorized) tanto na
                  // integração direta como no widget oficial deles — a reativar assim
                  // que o suporte da AppyPay confirmar que a conta PRD está ativa.
                  // { id: "appypay_gpo", label: "Multicaixa Express", desc: "Receba um pedido no telemóvel e autorize na hora" },
                  // { id: "appypay_ref", label: "Referência Multicaixa", desc: "Pague depois num ATM ou home banking" },
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

            {/* Dados da conta bancária (transferência) — geridos pelo Adm */}
            {requiresProof && (
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary" />
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
                        {acc.bank_name && <p className="text-xs text-muted-foreground">Banco: <span className="font-semibold text-foreground">{acc.bank_name}</span></p>}
                        <p className="text-xs text-muted-foreground">Titular: <span className="font-semibold text-foreground">{acc.account_holder}</span></p>
                        {acc.iban && <p className="text-xs text-muted-foreground">IBAN: <span className="font-semibold text-foreground">{acc.iban}</span></p>}
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

            {/* Multicaixa Express automático — precisa do número que vai receber o pedido de autorização */}
            {isAppypayGpo && (
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Número Multicaixa Express</h3>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={appypayPhone}
                  onChange={e => setAppypayPhone(e.target.value)}
                  placeholder="9XX XXX XXX"
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-base md:text-sm text-foreground"
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  Vai receber uma notificação neste número para autorizar o pagamento assim que confirmar o pedido.
                </p>
              </div>
            )}

            {/* Referência Multicaixa — a referência só é gerada depois de confirmar o pedido */}
            {paymentMethod === "appypay_ref" && (
              <div className="bg-card rounded-card border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Referência Multicaixa</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ao confirmar o pedido, geramos uma referência de pagamento. Pode pagá-la depois num
                  ATM ou no home banking, dentro do prazo indicado — o pedido é confirmado automaticamente
                  assim que o pagamento for recebido.
                </p>
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
                 paymentMethod === "bank_transfer" ? "Transferência bancária" :
                 paymentMethod === "appypay_gpo" ? `Multicaixa Express${appypayPhone ? ` — ${appypayPhone}` : ""}` :
                 "Referência Multicaixa"}
              </p>
            </div>

            {/* Cupom de desconto — desconta apenas os produtos, nunca o frete.
                Vive só aqui no checkout (o carrinho não tem campo de cupom). */}
            <div className="bg-card rounded-card border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Cupom de desconto</h3>
              </div>

              {!appliedCoupon ? (
                <>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Código do cupom"
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-base md:text-sm text-foreground font-mono"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || validatingCoupon}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 min-w-[84px]"
                    >
                      {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                </>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div>
                    <p className="text-sm font-bold text-foreground font-mono">{appliedCoupon.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {appliedCoupon.discount_type === "percent"
                        ? `-${appliedCoupon.discount_value}%`
                        : `-${formatPrice(appliedCoupon.discount_value || 0)}`}
                      {" "}• poupa {formatPrice(discountAmount)}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive/10 text-destructive flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-2">
                O desconto aplica-se apenas ao valor dos produtos — o custo do frete não é afectado.
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
              {isSelectionCheckout && (
                <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
                  Os restantes itens do seu carrinho continuam guardados para depois.
                </p>
              )}
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
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-500">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
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
            {!freightReady && (
              <p className="text-[11px] text-center text-red-500 -mt-2 font-semibold">
                Não foi possível calcular o frete para todos os itens. Volte à etapa de
                endereço, confirme o município e aguarde o valor do frete aparecer antes
                de continuar.
              </p>
            )}
            {freightReady && requiresProof && !proofFile && (
              <p className="text-[11px] text-center text-muted-foreground -mt-2">
                Anexe o comprovativo acima para poder confirmar o pedido.
              </p>
            )}
            {freightReady && isAppypayGpo && !appypayPhoneValid && (
              <p className="text-[11px] text-center text-muted-foreground -mt-2">
                Indique o número Multicaixa Express na etapa de pagamento para poder confirmar o pedido.
              </p>
            )}
          </div>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="text-center py-16">
            {isAppyPay && appypayError ? (
              <>
                <ShieldCheck className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-foreground mb-2">Pedido criado, pagamento pendente</h2>
                <p className="text-sm text-muted-foreground mb-6 px-2">
                  O seu pedido foi registado, mas não conseguimos iniciar o pagamento automático agora
                  ({appypayError}). Pode tentar novamente a partir dos seus pedidos, ou contactar o suporte.
                </p>
              </>
            ) : isAppyPay && !appypayConfirmed ? (
              <>
                {isAppypayGpo ? (
                  <Smartphone className="w-20 h-20 text-primary mx-auto mb-4" />
                ) : (
                  <Clock className="w-20 h-20 text-primary mx-auto mb-4" />
                )}
                <h2 className="text-xl font-black text-foreground mb-2">
                  {isAppypayGpo ? "A aguardar autorização" : "A aguardar pagamento"}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 px-2">
                  {isAppypayGpo
                    ? `Enviámos um pedido de pagamento para ${appypayPhone}. Abra a app ou o menu Multicaixa Express no seu telemóvel e autorize o pagamento.`
                    : "Pague a referência abaixo num ATM ou no home banking, dentro do prazo. O pedido é confirmado automaticamente assim que recebermos o pagamento."}
                </p>

                {!isAppypayGpo && (appypayResult?.entityNumber || appypayResult?.referenceNumber) && (
                  <div className="max-w-xs mx-auto mb-6 space-y-2">
                    {appypayResult?.entityNumber && (
                      <button
                        onClick={() => copyToClipboard(appypayResult.entityNumber!, "Entidade")}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="text-left">
                          <p className="text-[10px] text-muted-foreground">Entidade</p>
                          <p className="text-sm font-bold text-foreground font-mono">{appypayResult.entityNumber}</p>
                        </div>
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    {appypayResult?.referenceNumber && (
                      <button
                        onClick={() => copyToClipboard(appypayResult.referenceNumber!, "Referência")}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="text-left">
                          <p className="text-[10px] text-muted-foreground">Referência</p>
                          <p className="text-sm font-bold text-foreground font-mono">{appypayResult.referenceNumber}</p>
                        </div>
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  A verificar automaticamente…
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-black text-foreground mb-2">
                  {isAppyPay ? "Pagamento confirmado!" : "Pedido confirmado!"}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {requiresProof
                    ? "Recebemos o seu comprovativo. Vamos confirmar o pagamento e o seu pedido será encaminhado ao vendedor em breve."
                    : isAppyPay
                      ? "O seu pagamento foi confirmado e o pedido já foi encaminhado ao vendedor."
                      : "O seu pedido foi criado com sucesso. Acompanhe o estado na secção de pedidos."}
                </p>
              </>
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
