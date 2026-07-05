import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, Star, Heart, ImageOff, Check, Pencil, X } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useUpdateCartItem, useRemoveCartItem, useAddToCart } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";

const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const danger     = "#E53935";

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

  const getSellerName = (item: any): string => {
    const prod = cartProductSellers.find((p: any) => p.id === item.products?.id);
    if (!prod) return "Zangu";
    const sellerRel: any = Array.isArray(prod.sellers) ? prod.sellers[0] : prod.sellers;
    const companyRel: any = Array.isArray(prod.companies) ? prod.companies[0] : prod.companies;
    return sellerRel?.name || companyRel?.name || "Zangu";
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
    <div className="min-h-screen pb-36" style={{ background: "#F2EAE0" }}>

      {/* ── Cabeçalho ── */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "rgba(242,234,224,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${sand}`,
        }}
      >
        <div>
          <h1 className="text-lg font-black leading-tight" style={{ color: brown }}>Meu carrinho</h1>
          {totalItemsCount > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: brownLight, color: sandDark }}
            >
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "itens"}
            </span>
          )}
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
              style={{ background: "#fff", border: `1px solid ${sand}` }}
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

            {/* ── Itens ── */}
            <div className="space-y-3">
              {(cartItems as any[]).map((item: any) => {
                const product = item.products;
                if (!product) return null;
                const coverUrl: string | null = product.cover_url || product.image_url || null;
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl p-3 flex gap-3"
                    style={{
                      background: "#fff",
                      border: `1px solid ${isSelected ? brown : sand}`,
                      opacity: isSelected ? 1 : 0.6,
                    }}
                  >
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="flex items-start pt-1 flex-shrink-0"
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
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm font-bold line-clamp-2 cursor-pointer"
                          style={{ color: brown }}
                          onClick={() => navigate(`/produto/${product.id}`)}
                        >
                          {product.title}
                        </p>
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

                      <p className="text-[11px] mt-1 leading-tight" style={{ color: sandDark }}>
                        Vendido por <span className="font-semibold" style={{ color: brown }}>{getSellerName(item)}</span>
                      </p>
                      <p className="text-[10px] flex items-center gap-1" style={{ color: sandDark }}>
                        🛡 Entregue por parceiros confiáveis da Zangu
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base font-black" style={{ color: brown }}>
                          {formatPrice(product.price)}
                        </p>
                        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1.5px solid ${sand}` }}>
                          <button
                            onClick={() => handleQuantity(item, -1)}
                            className="w-8 h-8 flex items-center justify-center"
                            style={{ color: sandDark }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-black" style={{ color: brown }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantity(item, +1)}
                            className="w-8 h-8 flex items-center justify-center"
                            style={{ color: sandDark }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Resumo do pedido ── */}
            {!editMode && (
              <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${sand}` }}>
                <h3 className="text-sm font-black mb-3" style={{ color: brown }}>Resumo do pedido</h3>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: sandDark }}>
                      Subtotal ({selectedItems.length} {selectedItems.length === 1 ? "item seleccionado" : "itens seleccionados"})
                    </span>
                    <span className="font-bold" style={{ color: brown }}>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: sandDark }}>Frete e cupões</span>
                    <span className="font-semibold text-xs" style={{ color: sandDark }}>No checkout</span>
                  </div>
                </div>
                <div className="border-t pt-3 flex justify-between" style={{ borderColor: sand }}>
                  <span className="text-base font-black" style={{ color: brown }}>Subtotal</span>
                  <span className="text-base font-black" style={{ color: brown }}>{formatPrice(subtotal)}</span>
                </div>
              </div>
            )}

            {/* ── Sugestões ── */}
            {suggestions.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${sand}` }}>
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${sand}` }}
                >
                  <div>
                    <p className="text-sm font-black" style={{ color: brown }}>
                      Você também pode gostar
                    </p>
                    <p className="text-[11px]" style={{ color: sandDark }}>
                      Da mesma categoria dos seus produtos
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/")}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl"
                    style={{ background: brownLight, color: sandDark }}
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
                        style={{ border: `1px solid ${sand}` }}
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
                            className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-sm disabled:opacity-70"
                            style={{ background: brown }}
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
            background: "rgba(242,234,224,0.97)",
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
