import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useSupabaseData";

const SHOWN_KEY = "zg_abandoned_cart_last_shown";
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h — evita repetir o lembrete na mesma sessão/dia
const IDLE_MS = 3 * 60 * 1000; // 3 minutos parado

// Rotas onde o lembrete não faz sentido: o utilizador já está a finalizar
// a compra, ou ainda nem tem sessão iniciada.
const EXCLUDED_PATH_PREFIXES = ["/checkout", "/auth"];

const AbandonedCartPopup = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: cartItems = [] } = useCart();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemCount = (cartItems as any[]).length;

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
        const lastShown = Number(localStorage.getItem(SHOWN_KEY) || 0);
        if (Date.now() - lastShown < COOLDOWN_MS) return;
        setVisible(true);
        localStorage.setItem(SHOWN_KEY, String(Date.now()));
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

  // Se o carrinho esvaziar ou a pessoa navegar para uma rota excluída
  // enquanto o popup está visível, esconde-o.
  useEffect(() => {
    if (!eligible) setVisible(false);
  }, [eligible]);

  if (!visible || !eligible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0">
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "#fffaf3" }}>
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" style={{ color: "#1a0f07" }} />
        </button>

        <div className="pt-9 pb-5 px-6 text-center" style={{ background: "linear-gradient(180deg, #f3e3c9 0%, #fffaf3 100%)" }}>
          <ShoppingBag className="w-8 h-8 mx-auto mb-3" style={{ color: "#a8722f" }} />
          <h2 className="text-lg font-extrabold mb-1.5" style={{ color: "#7a3b1e" }}>
            Ainda aí? 👀
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#4a3527" }}>
            Tens {itemCount} {itemCount === 1 ? "item à espera" : "itens à espera"} no teu carrinho.
            Não deixes escapar!
          </p>
        </div>

        <div className="px-6 pt-4 pb-6">
          <button
            onClick={() => {
              setVisible(false);
              navigate("/carrinho");
            }}
            className="w-full py-3 rounded-full font-extrabold text-sm text-white"
            style={{ background: "#1a0f07" }}
          >
            Ver carrinho
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartPopup;
