import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Star, Heart, ImageOff, Check, Pencil, X, Store, ShieldCheck, RotateCcw, Truck, Lock, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useUpdateCartItem, useRemoveCartItem, useAddToCart } from "@/hooks/useCartActions";
import { useFreeShippingThreshold } from "@/hooks/useFreight";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";

const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#FFFFFF";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const danger     = "#E53935";
const green      = "#1E9E4E";
const greenBg    = "#E8F7EE";
const bannerDark = "#2A1B0E";

// Paleta de acentos — dá vida ao carrinho sem perder a identidade sand/brown
const gold       = "#F0A93A";
const goldBg     = "#FFF3DE";
const blue       = "#2E6BE0";
const blueBg     = "#E8F0FE";
const pink       = "#E0508A";
const pinkBg     = "#FDEAF2";
const cardShadow = "0 2px 10px rgba(74,46,10,0.08)";
const cardShadowSelected = "0 4px 16px rgba(74,46,10,0.16)";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, " ") + " Kz";

const ImagePlaceholder = ({ className = "w-24 h-24" }: { className?: string }) => (
  <div
    className={`${className} rounded-xl flex flex-col items-center justify-center flex-shrink-0`}
    style={{ background: brownLight, border: `1.5px dashed ${sand}` }}
  >
    <ImageOff className="w-5 h-5 mb-1" style={{ color: sandDark }} />
    <span className="text-[9px] font-medium" style={{ color: sandDark }}>Sem foto</span>
  </div>
);

const Carrinho = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cartItems = [], isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const addToCart = useAddToCart();
  const [favorites, setFavorites] = useState<string[]>([]);

  // ── Selecção de itens (estilo Shein) ─────────────────────────────────────
  // Por padrão todos os itens vêm seleccionados — o utilizador desmarca o
  // que não quer levar já. Só os itens seleccionados entram no checkout.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [removingBulk, setRemovingBulk] = useState(false);

  // Mantém a selecção sincronizada quando o carrinho muda (novo item entra
  // já seleccionado; item removido sai da lista de seleccionados sozinho).
  useEffect(() => {
    const ids = (cartItems as any[]).map((i: any) => i.id);
    setSelectedIds(prev => {
      const kept = prev.filter(id => ids.includes(id));
      const newOnes = ids.filter(id => !prev.includes(id));
      return [...kept, ...newOnes];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(cartItems as any[]).map((i: any) => i.id).join(",")]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allSelected = (cartItems as any[]).length > 0 && selectedIds.length === (cartItems as any[]).length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds((cartItems as any[]).map((i: any) => i.id));
    }
  };

  const selectedItems = useMemo(
    () => (cartItems as any[]).filter((i: any) => selectedIds.includes(i.id)),
    [cartItems, selectedIds]
  );

  const handleBulkRemove = async () => {
    if (selectedIds.length === 0) return;
    setRemovingBulk(true);
    try {
      for (const id of selectedIds) {
        await removeItem.mutateAsync(id);
      }
      setSelectedIds([]);
      setEditMode(false);
    } finally {
      setRemovingBulk(false);
    }
  };

  // ── Optimistic quantity update ──────────────────────────────────────────────
  const handleQuantity = (item: any, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    // Actualiza o cache imediatamente (sem esperar pelo servidor)
    queryClient.setQueryData(["cart"], (old: any[]) =>
      (old ?? []).map((i: any) =>
        i.id === item.id ? { ...i, quantity: newQty } : i
      )
    );

    // Sincroniza com o servidor em background
    updateItem.mutate(
      { id: item.id, quantity: newQty },
      {
        onError: () => {
          // Se falhar, reverte
          queryClient.setQueryData(["cart"], (old: any[]) =>
            (old ?? []).map((i: any) =>
              i.id === item.id ? { ...i, quantity: item.quantity } : i
            )
          );
        },
      }
    );
  };

  /* ── IDs dos produtos no carrinho ── */
  const cartProductIds = useMemo(
    () => (cartItems as any[]).map((i: any) => i.products?.id).filter(Boolean),
    [cartItems]
  );

  // Nome real de quem vende cada produto (vendedor, empresa ou dropshipper).
  // A entrega em si é sempre feita por parceiros logísticos da Zangu, nunca
  // pelo vendedor directamente — por isso separamos as duas informações.
  const { data: cartProductSellers = [] } = useQuery({
    queryKey: ["cart_product_sellers", cartProductIds.join(",")],
    queryFn: async () => {
      if (!cartProductIds.length) return [];
      const { data } = await supabase
        .from("products")
        .select("id, seller_id, company_id, sellers(id, name), companies(id, name)")
        .in("id", cartProductIds);
      return data || [];
    },
    enabled: cartProductIds.length > 0,
  });

  // Prazo de entrega real dentro de Luanda — vem da zona "intra_municipal"
  // Luanda→Luanda em freight_zones, exactamente o que o Admin configura no
  // painel de Frete (AdminFreightTab). Nunca hardcoded: se o Admin não tiver
  // essa zona activa, simplesmente não mostramos um prazo.
  const { data: luandaDelivery } = useQuery({
    queryKey: ["luanda_delivery_estimate"],
    queryFn: async () => {
      const { data: province } = await supabase
        .from("provinces")
        .select("id")
        .ilike("name", "Luanda")
        .limit(1)
        .maybeSingle();
      if (!province) return null;

      const { data: zone } = await supabase
        .from("freight_zones")
        .select("standard_days_min, standard_days_max")
        .eq("origin_province_id", province.id)
        .eq("dest_province_id", province.id)
        .eq("zone_type", "intra_municipal")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      return zone
        ? { min: zone.standard_days_min, max: zone.standard_days_max }
        : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getSellerName = (item: any): string => {
    const prod = cartProductSellers.find((p: any) => p.id === item.products?.id);
    if (!prod) return "Zangu";
    const sellerRel: any = Array.isArray(prod.sellers) ? prod.sellers[0] : prod.sellers;
    const companyRel: any = Array.isArray(prod.companies) ? prod.companies[0] : prod.companies;
    return sellerRel?.name || companyRel?.name || "Zangu";
  };

  // ── Agrupamento por loja/vendedor (estilo Shein) ────────────────────────────
  // Usa a mesma chave (seller_id ou company_id) que o Checkout.tsx usa para
  // calcular o frete — assim a loja que o utilizador vê aqui é sempre a mesma
  // que vai gerar uma linha de frete separada no checkout.
  const getSellerKey = (item: any): string => {
    const prod = cartProductSellers.find((p: any) => p.id === item.products?.id);
    if (!prod) return "zangu";
    const sellerRel: any = Array.isArray(prod.sellers) ? prod.sellers[0] : prod.sellers;
    const companyRel: any = Array.isArray(prod.companies) ? prod.companies[0] : prod.companies;
    return sellerRel?.id || companyRel?.id || "zangu";
  };

  const storeGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: any[] }>();
    for (const item of cartItems as any[]) {
      if (!item.products) continue;
      const key = getSellerKey(item);
      if (!map.has(key)) {
        map.set(key, { key, name: getSellerName(item), items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, cartProductSellers]);

  const isGroupFullySelected = (items: any[]) =>
    items.length > 0 && items.every((i: any) => selectedIds.includes(i.id));

  const toggleGroupSelect = (items: any[]) => {
    const ids = items.map((i: any) => i.id);
    const allIn = ids.every((id: string) => selectedIds.includes(id));
    setSelectedIds(prev =>
      allIn ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
    );
  };

  const categoryIds = useMemo(
    () =>
      Array.from(
        new Set(
          (cartItems as any[])
            .map((item: any) => item.products?.category_id)
            .filter(Boolean)
        )
      ) as string[],
    [cartItems]
  );

  const { data: suggestions = [] } = useQuery({
    queryKey: ["cart_suggestions", categoryIds.join(","), cartProductIds.join(",")],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, title, price, image_url, rating, total_reviews, category_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }

      const { data, error } = await query;
      if (error) return [];

      const filtered = (data || []).filter(
        (p: any) => !cartProductIds.includes(p.id)
      );
      if (filtered.length === 0) return [];

      const ids = filtered.map((p: any) => p.id);
      const { data: mediaData } = await supabase
        .from("product_media")
        .select("product_id, url")
        .in("product_id", ids)
        .eq("is_cover", true);

      const coverMap: Record<string, string> = {};
      (mediaData || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });

      return filtered.map((p: any) => ({
        ...p,
        cover_url: coverMap[p.id] || null,
      }));
    },
    enabled: !isLoading && cartProductIds.length > 0,
  });

  /* ── Totais (sem frete — calculado no checkout) ── */
  // Apenas os itens SELECCIONADOS entram no subtotal e no checkout —
  // tal como na Shein, o carrinho pode ter mais itens do que os que o
  // utilizador quer comprar agora.
  const subtotal = selectedItems.reduce((sum: number, item: any) =>
    sum + (item.products?.price || 0) * item.quantity, 0);

  const subtotalOriginal = selectedItems.reduce((sum: number, item: any) =>
    sum + (item.products?.old_price || item.products?.price || 0) * item.quantity, 0);
  const savings = Math.max(0, subtotalOriginal - subtotal);
  const savingsPercent = subtotalOriginal > 0 ? (savings / subtotalOriginal) * 100 : 0;
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Garantia de frete grátis — dado real (freight_settings.free_shipping_threshold,
  // configurado pelo Admin). Sem valor configurado, a secção simplesmente não aparece.
  const { threshold: freeShippingThreshold, loading: thresholdLoading } = useFreeShippingThreshold();
  const shippingRemaining = freeShippingThreshold ? Math.max(0, freeShippingThreshold - subtotal) : 0;
  const shippingAchieved = !!freeShippingThreshold && shippingRemaining <= 0;
  const shippingProgress = freeShippingThreshold
    ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
    : 0;

  const totalItemsCount = (cartItems as any[]).length;

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    navigate("/checkout", { state: { selectedCartItems: selectedItems } });
  };

  /* ── Não autenticado ── */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20" style={{ background: cream }}>
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: brownLight }}>
            <ShoppingCart className="w-9 h-9" style={{ color: sandDark }} />
          </div>
          <h2 className="text-lg font-black mb-2" style={{ color: brown }}>Inicie sessão para ver o carrinho</h2>
          <p className="text-sm mb-5" style={{ color: sandDark }}>Faça login para continuar as suas compras</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-8 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36" style={{ background: "#FFFFFF" }}>

      {/* ── Cabeçalho ── */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${sand}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: brownLight, color: brown }}
            aria-label="Fechar carrinho"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-lg font-black leading-tight" style={{ color: brown }}>Meu carrinho</h1>
            {totalItemsCount > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: goldBg, color: gold }}
              >
                {totalItemsCount} {totalItemsCount === 1 ? "item" : "itens"}
              </span>
            )}
          </div>
        </div>

        {totalItemsCount > 0 && (
          <button
            onClick={() => {
              setEditMode(v => !v);
            }}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
            style={editMode
              ? { background: danger, color: "#fff" }
              : { background: brownLight, color: sandDark }}
          >
            {editMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editMode ? "Concluir" : "Editar"}
          </button>
        )}
      </div>

      <div className="px-3 py-3 max-w-2xl mx-auto space-y-3">

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: sandDark }} />
          </div>
        ) : totalItemsCount === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: brownLight }}>
              <ShoppingCart className="w-10 h-10" style={{ color: sandDark }} />
            </div>
            <h2 className="text-lg font-black mb-2" style={{ color: brown }}>Carrinho vazio</h2>
            <p className="text-sm mb-5" style={{ color: sandDark }}>Adicione produtos para começar</p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 rounded-2xl font-bold text-sm text-white"
              style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
            >
              Explorar produtos
            </button>
          </div>
        ) : (
          <>
            {/* ── Seleccionar tudo ── */}
            <button
              onClick={toggleSelectAll}
              className="w-full rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ background: "#fff", boxShadow: cardShadow }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={allSelected
                  ? { background: brown, border: `1.5px solid ${brown}` }
                  : { background: "#fff", border: `1.5px solid ${sand}` }}
              >
                {allSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-xs font-bold" style={{ color: brown }}>
                Seleccionar tudo ({selectedIds.length}/{totalItemsCount})
              </span>
            </button>

            {/* ── Poupança + garantia de frete grátis ──────────────────────────
                Um único cartão dinâmico, com dois dados 100% reais:
                1) "savings" — diferença entre preço actual e preço antigo dos
                   itens seleccionados (já calculado acima).
                2) o progresso para o frete grátis — vem de
                   freight_settings.free_shipping_threshold, configurado pelo
                   Admin — mais o prazo real de entrega em Luanda, vindo da
                   zona "intra_municipal" em freight_zones (luandaDelivery). */}
            {(savings > 0 || (!thresholdLoading && freeShippingThreshold)) && (
              <div className="rounded-2xl overflow-hidden" style={{ boxShadow: cardShadow }}>

                {/* Bloco de poupança — anel de progresso mostra a % real
                    poupada sobre o preço original (savings / subtotalOriginal) */}
                {savings > 0 && (
                  <div
                    className="flex items-center gap-3.5 px-4 py-3.5"
                    style={{ background: `linear-gradient(120deg, ${green} 0%, #17b06a 100%)` }}
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg viewBox="0 0 44 44" className="w-12 h-12 -rotate-90">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" />
                        <circle
                          cx="22" cy="22" r="18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 18}
                          strokeDashoffset={2 * Math.PI * 18 * (1 - Math.min(100, savingsPercent) / 100)}
                          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
                        {Math.round(savingsPercent)}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white leading-tight">
                        Está a poupar {formatPrice(savings)}
                      </p>
                      <p className="text-[11px] text-white/85">
                        {Math.round(savingsPercent)}% abaixo do preço original, em {selectedItems.length}{" "}
                        {selectedItems.length === 1 ? "item seleccionado" : "itens seleccionados"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bloco de frete grátis — barra dinâmica com o valor real que
                    falta, mais o prazo real de entrega em Luanda (quando o
                    Admin tiver essa zona configurada) */}
                {!thresholdLoading && freeShippingThreshold && freeShippingThreshold > 0 && (
                  <div
                    className="px-4 py-3.5"
                    style={{
                      background: "#fff",
                      boxShadow: savings > 0 ? `inset 0 1px 0 ${brownLight}` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: shippingAchieved ? green : brown }}>
                        {shippingAchieved ? (
                          <>🎉 Garantiste frete grátis neste pedido</>
                        ) : (
                          <>🚚 Falta {formatPrice(shippingRemaining)} para frete grátis</>
                        )}
                      </p>
                      {luandaDelivery && (
                        <span
                          className="flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: goldBg, color: gold }}
                        >
                          <Truck className="w-2.5 h-2.5" />
                          Luanda: {luandaDelivery.min}–{luandaDelivery.max}d
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: brownLight }}>
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${shippingProgress}%`,
                          background: shippingAchieved ? green : `linear-gradient(90deg, ${gold}, ${pink})`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Itens agrupados por loja (estilo Shein) ── */}
            <div className="space-y-3">
              {storeGroups.map((store) => {
                const groupSelected = isGroupFullySelected(store.items);
                return (
                  <div
                    key={store.key}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "#fff", boxShadow: cardShadow }}
                  >
                    {/* Estimativa de entrega — intervalo honesto (o prazo exacto
                        só é calculado no checkout, quando há morada real) */}
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                      <span className="text-xs font-bold" style={{ color: green }}>
                        🚚 {luandaDelivery
                          ? `Chega em ${luandaDelivery.min}–${luandaDelivery.max} dias úteis`
                          : "Prazo calculado no checkout"}
                      </span>
                      <span className="text-[11px]" style={{ color: sandDark }}>
                        {store.items.length} {store.items.length === 1 ? "item" : "itens"}
                      </span>
                    </div>

                    {/* Cabeçalho da loja */}
                    <div
                      className="flex items-center gap-2.5 px-3 py-2.5"
                      style={{ background: `linear-gradient(90deg, ${goldBg} 0%, ${pinkBg} 100%)` }}
                    >
                      <button
                        onClick={() => toggleGroupSelect(store.items)}
                        className="flex items-center flex-shrink-0"
                        aria-label="Seleccionar loja"
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={groupSelected
                            ? { background: brown, border: `1.5px solid ${brown}` }
                            : { background: "#fff", border: `1.5px solid ${sand}` }}
                        >
                          {groupSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </button>
                      <Store className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sandDark }} />
                      <span className="text-xs font-black flex-1 truncate" style={{ color: brown }}>
                        {store.name}
                      </span>
                    </div>

                    {/* Itens da loja */}
                    <div className="p-3 space-y-4">
                      {store.items.map((item: any) => {
                        const product = item.products;
                        if (!product) return null;
                        const coverUrl: string | null = product.cover_url || product.image_url || null;
                        const isSelected = selectedIds.includes(item.id);
                        const hasDiscount = product.old_price && product.old_price > product.price;
                        const savedHere = hasDiscount ? (product.old_price - product.price) * item.quantity : 0;
                        const isBestSeller = (product.sales_count ?? 0) >= 20 || product.badge === "best_seller";

                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl p-3 transition-shadow"
                            style={{
                              background: "#fff",
                              boxShadow: isSelected ? cardShadowSelected : cardShadow,
                              opacity: isSelected ? 1 : 0.55,
                            }}
                          >
                            {/* Vendido por X | Loja verificada — mesma posição do
                                "Sold by X | Pro Seller" nas imagens de referência */}
                            <div className="flex items-start gap-2.5 mb-2">
                              <button
                                onClick={() => toggleSelect(item.id)}
                                className="flex items-center pt-0.5 flex-shrink-0"
                                aria-label="Seleccionar item"
                              >
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={isSelected
                                    ? { background: brown, border: `1.5px solid ${brown}` }
                                    : { background: "#fff", border: `1.5px solid ${sand}` }}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs" style={{ color: sandDark }}>Vendido por</span>
                                  <span className="text-xs font-bold underline" style={{ color: brown }}>{store.name}</span>
                                  <span
                                    className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: blueBg, color: blue }}
                                  >
                                    <ShieldCheck className="w-2.5 h-2.5" /> Loja verificada
                                  </span>
                                </div>
                                <p className="text-[11px] mt-0.5" style={{ color: sandDark }}>
                                  Entregue por parceiros da Zangu
                                </p>
                                {product.free_shipping && (
                                  <p className="text-[11px] font-bold underline mt-0.5" style={{ color: brown }}>
                                    Envio grátis
                                  </p>
                                )}
                              </div>
                              {editMode && (
                                <button
                                  onClick={() => removeItem.mutate(item.id)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: "rgba(229,57,53,0.08)", color: danger }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Selo "Mais vendido" — acima da imagem, como o "Best seller" */}
                            {isBestSeller && (
                              <span
                                className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md mb-2"
                                style={{ background: goldBg, color: gold }}
                              >
                                🔥 Mais vendido
                              </span>
                            )}

                            <div className="flex gap-3">
                              {coverUrl ? (
                                <img
                                  src={coverUrl}
                                  alt={product.title}
                                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0 cursor-pointer"
                                  onClick={() => navigate(`/produto/${product.id}`)}
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div className="cursor-pointer" onClick={() => navigate(`/produto/${product.id}`)}>
                                  <ImagePlaceholder className="w-24 h-24" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                {/* Preço + riscado + poupança — mesma ordem das imagens */}
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-lg font-black" style={{ color: brown }}>
                                    {formatPrice(product.price)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-xs line-through" style={{ color: sandDark }}>
                                      {formatPrice(product.old_price)}
                                    </span>
                                  )}
                                </div>
                                {hasDiscount && (
                                  <span
                                    className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mt-1"
                                    style={{ background: greenBg, color: green }}
                                  >
                                    Poupa {formatPrice(savedHere)}
                                  </span>
                                )}

                                <p
                                  className="text-xs font-medium line-clamp-2 leading-tight mt-1.5 cursor-pointer"
                                  style={{ color: brown }}
                                  onClick={() => navigate(`/produto/${product.id}`)}
                                >
                                  {product.title}
                                </p>

                                <p className="flex items-center gap-1 text-[10px] mt-1" style={{ color: sandDark }}>
                                  <RotateCcw className="w-2.5 h-2.5" /> Devolução grátis em 3 dias
                                </p>
                              </div>
                            </div>

                            {/* Remover / Guardar + quantidade — linha própria, como nas imagens */}
                            <div className="flex items-center justify-between mt-3 pt-2.5" style={{ boxShadow: `inset 0 1px 0 ${brownLight}` }}>
                              <button
                                onClick={() => removeItem.mutate(item.id)}
                                className="text-xs font-bold underline"
                                style={{ color: danger }}
                              >
                                Remover
                              </button>
                              <div className="flex items-center rounded-xl overflow-hidden" style={{ background: goldBg }}>
                                <button
                                  onClick={() => handleQuantity(item, -1)}
                                  className="w-8 h-8 flex items-center justify-center"
                                  style={{ color: gold }}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-black" style={{ color: brown }}>
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantity(item, +1)}
                                  className="w-8 h-8 flex items-center justify-center"
                                  style={{ color: gold }}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Subtotal da loja — dá ao utilizador uma noção do valor por loja
                          sem ainda falar de frete (isso só aparece no checkout). */}
                      <div className="flex justify-between pt-1">
                        <span className="text-[11px]" style={{ color: sandDark }}>
                          Subtotal desta loja
                        </span>
                        <span className="text-xs font-bold" style={{ color: brown }}>
                          {formatPrice(
                            store.items.reduce(
                              (sum: number, i: any) => sum + (i.products?.price || 0) * i.quantity,
                              0
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Tira de confiança/garantias da Zangu ── */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: ShieldCheck, label: "Loja verificada", color: blue, bg: blueBg },
                { icon: RotateCcw, label: "Devolução 3 dias", color: green, bg: greenBg },
                { icon: Truck, label: "Entrega rastreada", color: gold, bg: goldBg },
                { icon: Lock, label: "Pagamento seguro", color: pink, bg: pinkBg },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="rounded-xl px-2 py-2.5 flex flex-col items-center gap-1 text-center" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-[9.5px] font-bold leading-tight" style={{ color }}>{label}</span>
                </div>
              ))}
            </div>


            {!editMode && (
              <div className="rounded-2xl p-4" style={{ background: "#fff", boxShadow: cardShadow }}>
                <h3 className="text-sm font-black mb-3" style={{ color: brown }}>Resumo do pedido</h3>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: sandDark }}>
                      Subtotal ({selectedItems.length} {selectedItems.length === 1 ? "item seleccionado" : "itens seleccionados"})
                    </span>
                    <span className="font-bold" style={{ color: brown }}>{formatPrice(subtotalOriginal)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1" style={{ color: sandDark }}>Poupança</span>
                      <span className="font-bold" style={{ color: green }}>-{formatPrice(savings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span style={{ color: sandDark }}>Frete e cupões</span>
                    <span className="font-semibold text-xs" style={{ color: sandDark }}>No checkout</span>
                  </div>
                </div>
                <div className="border-t pt-3 flex justify-between" style={{ borderColor: sand }}>
                  <span className="text-base font-black" style={{ color: brown }}>Subtotal</span>
                  <span className="text-base font-black" style={{ color: savings > 0 ? green : brown }}>{formatPrice(subtotal)}</span>
                </div>

                {/* Formas de pagamento aceites — exactamente as 3 opções reais
                    do checkout (Checkout.tsx linha ~960): cash_on_delivery,
                    multicaixa_express e bank_transfer. Nada de Unitel/Visa
                    aqui — essas só existem na página de Pagamentos do perfil,
                    não são opções de checkout. */}
                <div className="mt-3 pt-3" style={{ boxShadow: `inset 0 1px 0 ${brownLight}` }}>
                  <p className="text-[10px] font-bold mb-1.5" style={{ color: sandDark }}>Pague como preferir</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { icon: Banknote, label: "Pagamento na entrega" },
                      { icon: Smartphone, label: "Multicaixa Express" },
                      { icon: CreditCard, label: "Transferência bancária" },
                    ].map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: brownLight, color: brown }}
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Sugestões ── */}
            {suggestions.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: cardShadow }}>
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: `linear-gradient(90deg, ${pinkBg} 0%, ${blueBg} 100%)` }}
                >
                  <div>
                    <p className="text-sm font-black" style={{ color: brown }}>
                      ✨ Você também pode gostar
                    </p>
                    <p className="text-[11px]" style={{ color: sandDark }}>
                      Da mesma categoria dos seus produtos
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: pink, color: "#fff" }}
                  >
                    Ver todas →
                  </button>
                </div>

                {/* Grelha 2 colunas — mesmo modelo de exibição usado pela Shein
                    na secção "You may also like" do carrinho: cartão vertical,
                    imagem em retrato, coração para wishlist, botão de "+" para
                    adicionar rápido, preço em destaque e avaliação por baixo. */}
                <div className="grid grid-cols-2 gap-2.5 px-3 py-3">
                  {suggestions.slice(0, 20).map((p: any) => {
                    const imgUrl: string | null = p.cover_url || p.image_url || null;
                    const isFav = favorites.includes(p.id);
                    // Só mostra a contagem de avaliações se ela realmente existir e for > 0.
                    // Nunca exibir "(0)" — isso sugeriria falsamente que há avaliações.
                    const hasReviews = typeof p.total_reviews === "number" && p.total_reviews > 0;
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl overflow-hidden cursor-pointer bg-white"
                        style={{ boxShadow: cardShadow }}
                        onClick={() => navigate(`/produto/${p.id}`)}
                      >
                        <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={p.title}
                              className="w-full h-full object-cover"
                              onError={e => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                                const wrap = el.parentElement;
                                if (wrap) {
                                  wrap.style.background = brownLight;
                                  wrap.style.display = "flex";
                                  wrap.style.alignItems = "center";
                                  wrap.style.justifyContent = "center";
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: brownLight }}>
                              <ImageOff className="w-6 h-6 mb-1" style={{ color: sandDark }} />
                              <span className="text-[9px]" style={{ color: sandDark }}>Sem foto</span>
                            </div>
                          )}

                          {/* Coração de wishlist — canto superior direito */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setFavorites(fav =>
                                fav.includes(p.id)
                                  ? fav.filter(f => f !== p.id)
                                  : [...fav, p.id]
                              );
                            }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.9)" }}
                          >
                            <Heart
                              className="w-3.5 h-3.5"
                              style={{
                                color: isFav ? danger : sandDark,
                                fill: isFav ? danger : "none",
                              }}
                            />
                          </button>

                          {/* Botão de adição rápida — canto inferior direito, tal como na Shein */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              addToCart.mutate({ productId: p.id, quantity: 1 });
                            }}
                            disabled={addToCart.isPending && addToCart.variables?.productId === p.id}
                            className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md disabled:opacity-70"
                            style={{ background: `linear-gradient(135deg, ${pink}, ${brown})` }}
                            aria-label="Adicionar ao carrinho"
                          >
                            {addToCart.isPending && addToCart.variables?.productId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                            )}
                          </button>
                        </div>

                        <div className="p-2">
                          <p className="text-[11px] font-medium line-clamp-2 leading-tight" style={{ color: brown }}>
                            {p.title}
                          </p>
                          <p className="text-sm font-black mt-1" style={{ color: brown }}>
                            {formatPrice(p.price)}
                          </p>
                          {hasReviews && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3" style={{ color: "#F9A825", fill: "#F9A825" }} />
                              <span className="text-[10px] font-semibold" style={{ color: sandDark }}>
                                {p.rating} ({p.total_reviews})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Botão fixo ── */}
      {totalItemsCount > 0 && (
        <div
          className="fixed bottom-14 md:bottom-0 left-0 right-0 z-50 px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${sand}`,
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            {editMode ? (
              <button
                onClick={handleBulkRemove}
                disabled={selectedIds.length === 0 || removingBulk}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: danger }}
              >
                {removingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remover ({selectedIds.length})
              </button>
            ) : (
              <>
                <div>
                  <p className="text-[11px]" style={{ color: sandDark }}>Subtotal</p>
                  <p className="text-lg font-black" style={{ color: brown }}>{formatPrice(subtotal)}</p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}
                >
                  ⚡ Finalizar compra {selectedItems.length > 0 ? `(${selectedItems.length})` : ""}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Carrinho;
