import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Gift } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWelcomeCoupons, fetchCollectedCouponIds, collectCoupon, DisplayCoupon } from "@/lib/coupons";

const SHOWN_KEY_PREFIX = "zg_welcome_popup_last_shown";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h — controla só a frequência de exibição, não a elegibilidade

const formatDiscount = (c: DisplayCoupon) =>
  c.discount_type === "percent"
    ? `${c.discount_value}%`
    : `${Number(c.discount_value).toLocaleString("pt-AO")} Kz`;

const WelcomeCouponPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const { data: coupons = [] } = useQuery({
    queryKey: ["welcome_coupons"],
    queryFn: fetchWelcomeCoupons,
  });

  // IDs de cupons já resgatados pelo utilizador alguma vez (usados ou não).
  // Ligado à conta, não ao dispositivo/navegador.
  const { data: collectedIdsArray = [], isLoading: collectedLoading } = useQuery({
    queryKey: ["collected_coupon_ids", user?.id],
    queryFn: fetchCollectedCouponIds,
    enabled: !!user,
  });

  const collectedIds = new Set(collectedIdsArray);

  // Se não há sessão, ainda não sabemos o que foi resgatado (só saberemos após
  // login), por isso mostramos todos os cupões de boas-vindas disponíveis.
  const pendingCoupons = user ? coupons.filter((c) => !collectedIds.has(c.id)) : coupons;

  useEffect(() => {
    // Enquanto ainda não sabemos o que o utilizador logado já resgatou, não decide nada
    if (user && collectedLoading) return;
    if (pendingCoupons.length === 0) return;

    const shownKey = `${SHOWN_KEY_PREFIX}:${user?.id ?? "guest"}`;
    const lastShown = Number(localStorage.getItem(shownKey) || 0);
    if (Date.now() - lastShown < COOLDOWN_MS) return;

    setVisible(true);
    localStorage.setItem(shownKey, String(Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCoupons.length, user, collectedLoading]);

  if (!visible || pendingCoupons.length === 0) return null;

  const handleCollectAll = async () => {
    if (!user) {
      setVisible(false);
      toast.info("Inicia sessão para resgatar os cupões.");
      navigate("/auth");
      return;
    }
    setCollecting(true);
    try {
      let okCount = 0;
      for (const c of pendingCoupons) {
        const res = await collectCoupon(c.id);
        if (res.success) okCount += 1;
      }
      if (okCount > 0) {
        toast.success(`${okCount} cupão(ões) adicionados à tua carteira!`);
        // Atualiza o estado de "já resgatados" e a carteira visível noutros ecrãs
        queryClient.invalidateQueries({ queryKey: ["collected_coupon_ids", user.id] });
        queryClient.invalidateQueries({ queryKey: ["wallet_coupons"] });
      } else {
        toast.error("Não foi possível resgatar os cupões agora.");
      }
    } finally {
      setCollecting(false);
      setVisible(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "#fffaf3" }}>
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center"
        >
          <X className="w-4 h-4" style={{ color: "#1a0f07" }} />
        </button>

        <div className="pt-8 pb-4 px-5 text-center" style={{ background: "linear-gradient(180deg, #f3e3c9 0%, #fffaf3 100%)" }}>
          <Gift className="w-8 h-8 mx-auto mb-2" style={{ color: "#a8722f" }} />
          <h2 className="text-lg font-extrabold" style={{ color: "#7a3b1e" }}>
            Ofertas Especiais Só Para Ti
          </h2>
        </div>

        <div className="px-5 pb-2 max-h-[45vh] overflow-y-auto space-y-3">
          {pendingCoupons.map((c) => (
            <div
              key={c.id}
              className="flex items-center rounded-2xl border overflow-hidden"
              style={{ borderColor: "#ecdfcf" }}
            >
              <div className="flex-shrink-0 w-24 py-4 text-center" style={{ background: "#fbeee0" }}>
                <span className="block text-2xl font-extrabold" style={{ color: "#c0501f" }}>
                  {formatDiscount(c)}
                </span>
                <span className="block text-[10px] font-bold" style={{ color: "#c0501f" }}>OFF</span>
              </div>
              <div className="flex-1 py-3 px-3">
                <p className="text-sm font-bold" style={{ color: "#4a3527" }}>
                  {c.title || "Cupão para todo o site"}
                </p>
                {c.min_purchase_amount > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Compra mínima de {Number(c.min_purchase_amount).toLocaleString("pt-AO")} Kz
                  </p>
                )}
                {c.expires_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Por tempo limitado</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pt-2 pb-5">
          <button
            onClick={handleCollectAll}
            disabled={collecting}
            className="w-full py-3 rounded-full font-extrabold text-sm text-white disabled:opacity-60"
            style={{ background: "#1a0f07" }}
          >
            {collecting ? "A resgatar..." : "Resgatar Todos"}
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Cupões confirmados após o início de sessão
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCouponPopup;
