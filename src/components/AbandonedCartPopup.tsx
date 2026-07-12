import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ImageOff, ShoppingBag, Truck, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useSupabaseData";
import { useFreeShippingThreshold } from "@/hooks/useFreight";

// ── Constantes de comportamento ─────────────────────────────────────────────
const SHOWN_KEY_PREFIX = "zg_abandoned_cart_last_shown";
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h — evita repetir o lembrete na mesma sessão/dia
const IDLE_MS = 3 * 60 * 1000; // 3 minutos parado
const IDLE_MIN = IDLE_MS / 60000;

// Rotas onde o lembrete não faz sentido: o utilizador já está a finalizar
// a compra, ou ainda nem tem sessão iniciada.
const EXCLUDED_PATH_PREFIXES = ["/checkout", "/auth"];

// ── Paleta — mesma linguagem visual usada no Carrinho.tsx, para o lembrete
// não parecer um componente à parte, desligado do resto da app ──────────────
const brown       = "#4A2E0A";
const sand        = "#D4B896";
const sandDark    = "#B8956A";
const brownLight  = "rgba(74,46,10,0.08)";
const danger      = "#E53935";
const green       = "#1E9E4E";
const greenBg     = "#E8F7EE";
const gold        = "#F0A93A";
const goldBg      = "#FFF3DE";
const blue        = "#2E6BE0";
const blueBg      = "#E8F0FE";
const pink        = "#E0508A";
const cardShadow  = "0 -8px 32px rgba(26,15,7,0.18)";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, " ") + " Kz";

const AbandonedCartPopup = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: cartItems = [] } = useCart();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dados reais do carrinho ────────────────────────────────────────────────
  const items = cartItems as any[];
  const itemCount = items.length;

  const subtotal = items.reduce(
    (sum, item) => sum + (item.products?.price || 0) * item.quantity,
    0
  );

  // Poupança real — soma de (preço antigo − preço actual) × quantidade,
  // só para itens que realmente têm desconto activo (old_price > price).
  const totalSavings = items.reduce((sum, item) => {
    const p = item.products;
    if (!p || !p.old_price || p.old_price <= p.price) return sum;
    return sum + (p.old_price - p.price) * item.quantity;
  }, 0);

  // Aviso de stock baixo — usa o campo real `products.stock`, o mesmo que o
  // ProductDetail.tsx usa para mostrar "Restam X". Nunca inventa números.
  const lowStockItems = items.filter(
    (item) => item.products?.stock != null && item.products.stock > 0 && item.products.stock <= 3
  );

  // Frete grátis — mesmo hook real usado no Carrinho.tsx
  // (freight_settings.free_shipping_threshold, configurado pelo Admin).
  const { threshold: freeShippingThreshold, loading: thresholdLoading } = useFreeShippingThreshold();
  const shippingRemaining = freeShippingThreshold ? Math.max(0, freeShippingThreshold - subtotal) : 0;
  const shippingAchieved = !!freeShippingThreshold && shippingRemaining <= 0;
  const shippingProgress = freeShippingThreshold
    ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
    : 0;

  const VISIBLE_LIMIT = 3;
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, itemCount - VISIBLE_LIMIT);

  const eligible =
    !!user &&
    itemCount > 0 &&
    !EXCLUDED_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

  // ── Detecção de inactividade — inalterada, já funcionava bem ───────────────
  useEffect(() => {
    if (!eligible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const shownKey = `${SHOWN_KEY_PREFIX}:${user?.id ?? "guest"}`;
        const lastShown = Number(localStorage.getItem(shownKey) || 0);
        if (Date.now() - lastShown < COOLDOWN_MS) return;
        setVisible(true);
        localStorage.setItem(shownKey, String(Date.now()));
      }, IDLE_MS);
    };

    const events: (keyof WindowEventMap)[] = ["touchstart", "mousemove", "keydown", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, location.pathname]);

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      setClosing(false);
      setExpanded(false);
    }
  }, [eligible]);

  const handleClose = () => {
    setClosing(true);
    // Espera a animação de saída terminar antes de desmontar
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      setExpanded(false);
    }, 220);
  };

  const handleContinue = () => {
    handleClose();
    navigate("/carrinho");
  };

  if (!visible || !eligible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center px-3 pb-3"
      style={{
        background: closing ? "rgba(0,0,0,0)" : "rgba(26,15,7,0.4)",
        transition: "background 220ms ease",
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes zg-sheet-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zg-sheet-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(24px); opacity: 0; } }
        @keyframes zg-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .zg-abandoned-sheet { animation: zg-sheet-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .zg-abandoned-sheet.closing { animation: zg-sheet-down 200ms ease both; }
        .zg-bag-pulse { animation: zg-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .zg-abandoned-sheet, .zg-abandoned-sheet.closing, .zg-bag-pulse { animation: none; }
        }
      `}</style>

      <div
        className={`zg-abandoned-sheet${closing ? " closing" : ""} w-full max-w-md rounded-3xl overflow-hidden`}
        style={{ background: "#fff", boxShadow: cardShadow }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alça visual no topo, como as bottom sheets nativas */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: sand }} />
        </div>

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between px-5 pt-2 gap-3">
          <div className="flex items-start gap-2.5">
            <div
              className="zg-bag-pulse w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `linear-gradient(135deg, ${gold}, ${pink})` }}
            >
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-black leading-tight" style={{ color: brown }}>
                Esqueceste-te de algo?
              </p>
              <p className="text-xs mt-0.5" style={{ color: sandDark }}>
                Paraste há uns {IDLE_MIN} minutos — {itemCount} {itemCount === 1 ? "item à espera" : "itens à espera"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: brownLight }}
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" style={{ color: brown }} />
          </button>
        </div>

        {/* ── Faixa de poupança real — só aparece se houver desconto real ── */}
        {totalSavings > 0 && (
          <div className="mx-5 mt-3.5 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5" style={{ background: greenBg }}>
            <span className="text-base leading-none">💰</span>
            <p className="text-[12px] font-bold" style={{ color: green }}>
              Estás a poupar {formatPrice(totalSavings)} se levares agora
            </p>
          </div>
        )}

        {/* ── Aviso de stock baixo — dado real (products.stock ≤ 3) ── */}
        {lowStockItems.length > 0 && (
          <div className="mx-5 mt-2.5 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5" style={{ background: goldBg }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: gold }} />
            <p className="text-[12px] font-bold" style={{ color: gold }}>
              {lowStockItems.length === 1
                ? "1 dos teus itens está quase a esgotar"
                : `${lowStockItems.length} dos teus itens estão quase a esgotar`}
            </p>
          </div>
        )}

        {/* ── Lista real de produtos — com preço, desconto e stock ── */}
        <div className="px-5 pt-4 space-y-2.5 max-h-[38vh] overflow-y-auto">
          {visibleItems.map((item) => {
            const p = item.products;
            if (!p) return null;
            const img = p.cover_url || p.image_url || null;
            const hasDiscount = p.old_price && p.old_price > p.price;
            const discountPct = hasDiscount ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0;
            const isLow = p.stock != null && p.stock > 0 && p.stock <= 3;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl p-2"
                style={{ background: "#FBF3E7" }}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: brownLight }}>
                  {img ? (
                    <img src={img} alt={p.title || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-5 h-5" style={{ color: sandDark }} />
                    </div>
                  )}
                  {hasDiscount && (
                    <span
                      className="absolute bottom-0 left-0 right-0 text-[8px] font-black text-center py-[1px]"
                      style={{ background: danger, color: "#fff" }}
                    >
                      -{discountPct}%
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-semibold line-clamp-1" style={{ color: brown }}>
                    {p.title}
                  </p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-[13px] font-black" style={{ color: brown }}>
                      {formatPrice(p.price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] line-through" style={{ color: sandDark }}>
                        {formatPrice(p.old_price)}
                      </span>
                    )}
                    {item.quantity > 1 && (
                      <span className="text-[10px] font-semibold" style={{ color: sandDark }}>
                        × {item.quantity}
                      </span>
                    )}
                  </div>
                  {isLow && (
                    <p className="text-[9.5px] font-bold mt-0.5" style={{ color: gold }}>
                      Restam {p.stock}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {!expanded && hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-center text-[11px] font-bold py-2 rounded-xl"
              style={{ background: brownLight, color: brown }}
            >
              Ver mais {hiddenCount} {hiddenCount === 1 ? "item" : "itens"}
            </button>
          )}
        </div>

        {/* ── Garantia de frete grátis — mesmo dado real usado no Carrinho ── */}
        {!thresholdLoading && freeShippingThreshold && freeShippingThreshold > 0 && (
          <div className="px-5 pt-4">
            <div className="rounded-2xl px-3.5 py-3" style={{ background: blueBg }}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: shippingAchieved ? green : blue }}>
                  <Truck className="w-3 h-3" />
                  {shippingAchieved
                    ? "Já garantiste frete grátis"
                    : `Falta ${formatPrice(shippingRemaining)} p/ frete grátis`}
                </p>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(46,107,224,0.15)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${shippingProgress}%`,
                    background: shippingAchieved ? green : `linear-gradient(90deg, ${blue}, ${pink})`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Subtotal ── */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl" style={{ background: "#FBF3E7" }}>
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: sandDark }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: green }} />
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "itens"})
            </span>
            <span className="text-base font-black" style={{ color: brown }}>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {/* ── Acções ── */}
        <div className="px-5 pt-4 pb-6 space-y-2">
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white"
            style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)`, boxShadow: `0 10px 24px -8px ${brown}66` }}
          >
            Continuar compra
          </button>
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-2xl font-bold text-xs"
            style={{ color: sandDark }}
          >
            Talvez mais tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartPopup;
