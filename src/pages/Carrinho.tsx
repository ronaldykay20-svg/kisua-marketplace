import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, MapPin, Tag, ShieldCheck, RotateCcw, Headphones, Star, Heart, ImageOff } from "lucide-react";
import { useCart } from "@/hooks/useSupabaseData";
import { useUpdateCartItem, useRemoveCartItem } from "@/hooks/useCartActions";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";

const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 2500;

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, " ") + " Kz";

/* ── Placeholder neutro quando não há imagem real ── */
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
  const { data: cartItems = [], isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  /* ── IDs dos produtos no carrinho ── */
  const cartProductIds = useMemo(
    () => (cartItems as any[]).map((i: any) => i.products?.id).filter(Boolean),
    [cartItems]
  );

  /* ── IDs de categorias dos produtos no carrinho ── */
  const categoryIds: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          (cartItems as any[])
            .map((item: any) => item.products?.category_id)
            .filter(Boolean)
        )
      ),
    [cartItems]
  );

  /* ── Busca covers reais dos itens do carrinho via product_media ── */
  const { data: cartCovers = {} } = useQuery({
    queryKey: ["cart_item_covers", cartProductIds.join(",")],
    queryFn: async () => {
      if (cartProductIds.length === 0) return {};

      const { data } = await supabase
        .from("product_media")
        .select("product_id, url")
        .in("product_id", cartProductIds)
        .eq("is_cover", true);

      const coverMap: Record<string, string> = {};
      (data || []).forEach((m: any) => {
        coverMap[m.product_id] = m.url;
      });
      return coverMap;
    },
    enabled: cartProductIds.length > 0,
  });

  /* ── Sugestões pelas mesmas categorias ── */
  const { data: suggestions = [] } = useQuery({
    queryKey: ["cart_suggestions", categoryIds.join(",")],
    queryFn: async () => {
      if (categoryIds.length === 0) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, image_url, rating, total_reviews, category_id")
        .eq("is_active", true)
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return [];

      /* Excluir produtos já no carrinho */
      const filtered = (data || []).filter((p: any) => !cartProductIds.includes(p.id));

      const ids = filtered.map((p: any) => p.id);
      if (ids.length === 0) return filtered.map((p: any) => ({ ...p, cover_url: null }));

      /* Buscar cover real de product_media para as sugestões */
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
    enabled: categoryIds.length > 0,
  });

  /* ── Totais ── */
  const subtotal = (cartItems as any[]).reduce((sum: number, item: any) =>
    sum + (item.products?.price || 0) * item.quantity, 0);

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = freeShipping ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingCost;
  const progressPct = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

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
    <div className="min-h-screen pb-32" style={{ background: "#F2EAE0" }}>

      {/* ── Cabeçalho ── */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(242,234,224,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${sand}`,
        }}
      >
        <div>
          <h1 className="text-lg font-black leading-tight" style={{ color: brown }}>Meu carrinho</h1>
          {(cartItems as any[]).length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: brownLight, color: sandDark }}
            >
              {(cartItems as any[]).length} {(cartItems as any[]).length === 1 ? "item" : "itens"}
            </span>
          )}
        </div>
      </div>

      <div className="px-3 py-3 max-w-2xl mx-auto space-y-3">

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: sandDark }} />
          </div>
        ) : (cartItems as any[]).length === 0 ? (
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
            {/* ── Barra frete grátis ── */}
            <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${sand}` }}>
              {freeShipping ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">🚚</span>
                  <p className="text-sm font-bold flex-1" style={{ color: "#2E7D32" }}>
                    Parabéns! Você ganhou frete grátis para todo o pedido.
                  </p>
                  <span className="text-xs font-black px-2 py-1 rounded-full text-white" style={{ background: "#2E7D32" }}>
                    ✓ Frete grátis
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold mb-2" style={{ color: brown }}>
                    Falta <span className="font-black">{formatPrice(remaining)}</span> para frete grátis
                  </p>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: brownLight }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${sandDark}, ${brown})` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* ── Itens ── */}
            <div className="space-y-3">
              {(cartItems as any[]).map((item: any) => {
                const product = item.products;
                if (!product) return null;

                /*
                 * Ordem de prioridade para a imagem:
                 * 1. cover de product_media (tabela separada, igual ao componente Categories)
                 * 2. image_url direto no produto
                 * 3. null → mostra placeholder
                 */
                const coverUrl: string | null =
                  cartCovers[product.id] || product.image_url || null;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl p-3 flex gap-3"
                    style={{ background: "#fff", border: `1px solid ${sand}` }}
                  >
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
                      <p
                        className="text-sm font-bold line-clamp-2 cursor-pointer"
                        style={{ color: brown }}
                        onClick={() => navigate(`/produto/${product.id}`)}
                      >
                        {product.title}
                      </p>

                      {(freeShipping || product.free_shipping) && (
                        <p className="text-[11px] font-bold mt-0.5" style={{ color: "#2E7D32" }}>Frete grátis</p>
                      )}

                      <p className="text-[11px] mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: brownLight, color: sandDark }}>
                        🛡 Vendido e entregue por Ango Express
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base font-black" style={{ color: brown }}>
                          {formatPrice(product.price)}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1.5px solid ${sand}` }}>
                            <button
                              onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}
                              className="w-8 h-8 flex items-center justify-center"
                              style={{ color: sandDark }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-black" style={{ color: brown }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}
                              className="w-8 h-8 flex items-center justify-center"
                              style={{ color: sandDark }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem.mutate(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(229,57,53,0.08)", color: "#E53935" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Entrega + Cupom ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "#fff", border: `1px solid ${sand}` }}>
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sandDark }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: brown }}>Previsão de entrega</p>
                  <p className="text-[11px] mt-0.5" style={{ color: sandDark }}>De 24 a 26 de Maio</p>
                  <p className="text-[11px]" style={{ color: sandDark }}>Para Luanda, Angola</p>
                </div>
              </div>
              <button
                onClick={() => setCouponOpen(v => !v)}
                className="rounded-2xl p-3 flex items-start gap-2 text-left w-full"
                style={{ background: "#fff", border: `1px solid ${sand}` }}
              >
                <Tag className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sandDark }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: brown }}>Tem um cupom?</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: sandDark }}>Adicionar cupom</p>
                </div>
              </button>
            </div>

            {couponOpen && (
              <div className="rounded-2xl p-3 flex gap-2" style={{ background: "#fff", border: `1px solid ${sand}` }}>
                <input
                  type="text"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  placeholder="Digite o código do cupom"
                  className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                  style={{ background: brownLight, color: brown }}
                />
                <button
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* ── Resumo do pedido ── */}
            <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${sand}` }}>
              <h3 className="text-sm font-black mb-3" style={{ color: brown }}>Resumo do pedido</h3>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: sandDark }}>
                    Subtotal ({(cartItems as any[]).length} {(cartItems as any[]).length === 1 ? "item" : "itens"})
                  </span>
                  <span className="font-bold" style={{ color: brown }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: sandDark }}>Frete</span>
                  {freeShipping ? (
                    <span className="font-bold" style={{ color: "#2E7D32" }}>Grátis</span>
                  ) : (
                    <span className="font-bold" style={{ color: brown }}>{formatPrice(shippingCost)}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: sandDark }}>Descontos</span>
                  <span className="font-bold" style={{ color: brown }}>0 Kz</span>
                </div>
              </div>
              <div className="border-t pt-3 flex justify-between" style={{ borderColor: sand }}>
                <span className="text-base font-black" style={{ color: brown }}>Total</span>
                <span className="text-base font-black" style={{ color: brown }}>{formatPrice(total)}</span>
              </div>

              {/* Garantias */}
              <div className="mt-4 space-y-2.5">
                {[
                  { icon: ShieldCheck, label: "Compra 100% segura",   sub: "Seus dados protegidos" },
                  { icon: RotateCcw,   label: "Devolução garantida",   sub: "Até 7 dias após o recebimento" },
                  { icon: Headphones,  label: "Atendimento 24/7",      sub: "Suporte sempre disponível" },
                ].map(g => (
                  <div key={g.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: brownLight }}>
                      <g.icon className="w-4 h-4" style={{ color: sandDark }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: brown }}>{g.label}</p>
                      <p className="text-[11px]" style={{ color: sandDark }}>{g.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Sugestões por categoria ── */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black" style={{ color: brown }}>Você também pode gostar</h3>
                  <button onClick={() => navigate("/")} className="text-xs font-semibold" style={{ color: sandDark }}>
                    Ver todas →
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {suggestions.map((p: any) => {
                    const imgUrl: string | null = p.cover_url || p.image_url || null;
                    const isFav = favorites.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex-shrink-0 w-36 rounded-2xl overflow-hidden cursor-pointer"
                        style={{ background: "#fff", border: `1px solid ${sand}` }}
                        onClick={() => navigate(`/produto/${p.id}`)}
                      >
                        <div className="relative">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={p.title}
                              className="w-full h-32 object-cover"
                              onError={e => {
                                const el = e.currentTarget as HTMLImageElement;
                                el.style.display = "none";
                                const wrap = el.parentElement;
                                if (wrap) {
                                  wrap.style.height = "128px";
                                  wrap.style.background = brownLight;
                                  wrap.style.display = "flex";
                                  wrap.style.alignItems = "center";
                                  wrap.style.justifyContent = "center";
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 flex flex-col items-center justify-center" style={{ background: brownLight }}>
                              <ImageOff className="w-6 h-6 mb-1" style={{ color: sandDark }} />
                              <span className="text-[9px]" style={{ color: sandDark }}>Sem foto</span>
                            </div>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setFavorites(fav =>
                                fav.includes(p.id) ? fav.filter(f => f !== p.id) : [...fav, p.id]
                              );
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.88)" }}
                          >
                            <Heart
                              className="w-3.5 h-3.5"
                              style={{ color: isFav ? "#E53935" : sandDark, fill: isFav ? "#E53935" : "none" }}
                            />
                          </button>
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-semibold line-clamp-2 leading-tight" style={{ color: brown }}>
                            {p.title}
                          </p>
                          <p className="text-xs font-black mt-1" style={{ color: brown }}>
                            {formatPrice(p.price)}
                          </p>
                          {p.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3" style={{ color: "#F9A825", fill: "#F9A825" }} />
                              <span className="text-[10px] font-semibold" style={{ color: sandDark }}>
                                {p.rating} ({p.total_reviews ?? 0})
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

      {/* ── Botão fixo no fundo ── */}
      {(cartItems as any[]).length > 0 && (
        <div
          className="fixed bottom-14 md:bottom-0 left-0 right-0 z-50 px-4 py-3"
          style={{
            background: "rgba(242,234,224,0.97)",
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${sand}`,
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div>
              <p className="text-[11px]" style={{ color: sandDark }}>Total</p>
              <p className="text-lg font-black" style={{ color: brown }}>{formatPrice(total)}</p>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="flex-1 py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}
            >
              ⚡ Finalizar compra
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carrinho;
