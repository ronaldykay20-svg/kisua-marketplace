import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ImageOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useSupabaseData";

const SHOWN_KEY_PREFIX = "zg_abandoned_cart_last_shown";
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h — evita repetir o lembrete na mesma sessão/dia
const IDLE_MS = 3 * 60 * 1000; // 3 minutos parado

// Rotas onde o lembrete não faz sentido: o utilizador já está a finalizar
// a compra, ou ainda nem tem sessão iniciada.
const EXCLUDED_PATH_PREFIXES = ["/checkout", "/auth"];

const brown = "#4A2E0A";
const sand = "#D4B896";
const sandDark = "#B8956A";
const brownLight = "rgba(74,46,10,0.08)";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, " ") + " Kz";

const AbandonedCartPopup = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: cartItems = [] } = useCart();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = cartItems as any[];
  const itemCount = items.length;
  const subtotal = items.reduce(
    (sum, item) => sum + (item.products?.price || 0) * item.quantity,
    0
  );
  const previewItems = items.slice(0, 3);
  const extraCount = Math.max(0, itemCount - previewItems.length);

  const eligible =
    !!user &&
    itemCount > 0 &&
    !EXCLUDED_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

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
    }
  }, [eligible]);

  const handleClose = () => {
    setClosing(true);
    // Espera a animação de saída terminar antes de desmontar
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 220);
  };

  if (!visible || !eligible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center px-3 pb-3"
      style={{
        background: closing ? "rgba(0,0,0,0)" : "rgba(26,15,7,0.35)",
        transition: "background 220ms ease",
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes zg-sheet-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zg-sheet-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(24px); opacity: 0; } }
        .zg-abandoned-sheet { animation: zg-sheet-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .zg-abandoned-sheet.closing { animation: zg-sheet-down 200ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .zg-abandoned-sheet, .zg-abandoned-sheet.closing { animation: none; }
        }
      `}</style>

      <div
        className={`zg-abandoned-sheet${closing ? " closing" : ""} w-full max-w-md rounded-3xl overflow-hidden`}
        style={{ background: "#fff", boxShadow: "0 -8px 32px rgba(26,15,7,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alça visual no topo, como as bottom sheets nativas */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: sand }} />
        </div>

        <div className="flex items-start justify-between px-5 pt-1">
          <div>
            <p className="text-[15px] font-black leading-tight" style={{ color: brown }}>
              Esqueceste-te de algo? 👜
            </p>
            <p className="text-xs mt-0.5" style={{ color: sandDark }}>
              {itemCount} {itemCount === 1 ? "item à espera de ti" : "itens à espera de ti"}
            </p>
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

        {/* Miniaturas reais dos produtos no carrinho */}
        <div className="flex items-center gap-2.5 px-5 pt-4">
          {previewItems.map((item) => {
            const img = item.products?.cover_url || item.products?.image_url || null;
            return (
              <div
                key={item.id}
                className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ border: `1px solid ${sand}` }}
              >
                {img ? (
                  <img src={img} alt={item.products?.title || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: brownLight }}>
                    <ImageOff className="w-5 h-5" style={{ color: sandDark }} />
                  </div>
                )}
              </div>
            );
          })}
          {extraCount > 0 && (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: brownLight }}
            >
              <span className="text-sm font-black" style={{ color: brown }}>+{extraCount}</span>
            </div>
          )}
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-2xl" style={{ background: "#FBF3E7" }}>
            <span className="text-xs font-semibold" style={{ color: sandDark }}>Subtotal</span>
            <span className="text-base font-black" style={{ color: brown }}>{formatPrice(subtotal)}</span>
          </div>
        </div>

        <div className="px-5 pt-4 pb-6">
          <button
            onClick={() => {
              handleClose();
              navigate("/carrinho");
            }}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white"
            style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)`, boxShadow: `0 10px 24px -8px ${brown}66` }}
          >
            Continuar compra
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartPopup;
