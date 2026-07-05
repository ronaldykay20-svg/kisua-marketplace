import { useFreeShippingThreshold } from "@/hooks/useFreight";

const brown = "#4A2E0A";
const sand = "#D4B896";
const sandDark = "#B8956A";
const cream = "#F2EAE0";
const green = "#2E7D32";

const formatPrice = (price: number) =>
  price.toLocaleString("pt-AO").replace(/,/g, " ") + " Kz";

interface FreeShippingBarProps {
  subtotal: number;
}

// Barra de progresso "faltam X Kz para frete grátis" — mostra-se no carrinho
// e no checkout, sempre que houver um limite de frete grátis configurado
// pelo admin (freight_settings.free_shipping_threshold). Se não houver
// nenhum valor configurado (ou for 0), não mostra nada.
const FreeShippingBar = ({ subtotal }: FreeShippingBarProps) => {
  const { threshold, loading } = useFreeShippingThreshold();

  if (loading || !threshold || threshold <= 0) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const achieved = remaining <= 0;
  const progress = Math.min(100, (subtotal / threshold) * 100);

  return (
    <div className="rounded-2xl p-3.5" style={{ background: "#fff", border: `1px solid ${sand}` }}>
      <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: achieved ? green : brown }}>
        {achieved ? (
          <>🎉 Parabéns! Garantiste frete grátis neste pedido.</>
        ) : (
          <>🚚 Falta <span style={{ color: brown }}>{formatPrice(remaining)}</span> para teres frete grátis</>
        )}
      </p>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: cream }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: achieved ? green : `linear-gradient(90deg, ${sandDark}, ${brown})`,
          }}
        />
      </div>
    </div>
  );
};

export default FreeShippingBar;
