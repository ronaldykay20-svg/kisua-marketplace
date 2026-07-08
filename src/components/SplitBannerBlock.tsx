/**
 * SplitBannerBlock
 * Bloco de banners em duas colunas independentes para tablet/desktop.
 *
 * Cada coluna tem 1–4 banners que dividem a altura total igualmente.
 * O admin configura via format = "split" e usa o campo `text_position`
 * para indicar o lado: "left" ou "right", e sort_order para agrupar.
 *
 * Estrutura no Supabase (tabela banners):
 *   format       = "split"
 *   text_position = "left" | "right"   ← lado da coluna
 *   sort_order   = número do bloco (ex: 20, 21, 22…)
 *   device       = "tablet" | "desktop" | null (todos)
 *
 * Uso:
 *   <SplitBannerBlock blockOrder={20} device="tablet" totalHeight={400} />
 */
import { useBanners } from "@/hooks/useBanners";
import type { DeviceLayout } from "@/hooks/useDeviceLayout";

interface SplitBannerBlockProps {
  /** sort_order base do bloco — admin define o mesmo valor para todos os banners do bloco */
  blockOrder: number;
  device?: DeviceLayout;
  /** Altura total do bloco em px (default 360) */
  totalHeight?: number;
}

const gradientDir = (pos?: string) => {
  if (pos === "top-left")  return "bg-gradient-to-br from-black/70 via-black/30 to-transparent";
  if (pos === "top-right") return "bg-gradient-to-bl from-black/70 via-black/30 to-transparent";
  return "bg-gradient-to-t from-black/70 via-black/30 to-transparent";
};

const BannerItem = ({
  b, heightPx,
}: { b: any; heightPx: number }) => {
  const textPos: Record<string, string> = {
    "top-left":     "justify-start items-start",
    "top-right":    "justify-start items-end",
    "bottom-right": "justify-end items-end",
  };
  const align = textPos[b.extra_links?.[0]] || "justify-end items-start";
  const hasText = !!(b.title || b.cta_text);

  return (
    <a
      href={b.cta_link || "#"}
      className="rounded-gpu-fix relative block rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow flex-1"
      style={{ minHeight: heightPx }}
    >
      <img
        src={b.image_url}
        alt={b.title || "Banner"}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {hasText && (
        <>
          <div className={`absolute inset-0 ${gradientDir(b.text_position)}`} />
          <div className={`absolute inset-0 flex flex-col p-3 ${align}`}>
            {b.subtitle && (
              <p className="text-[10px] font-bold text-white/80 drop-shadow-md">{b.subtitle}</p>
            )}
            {b.title && (
              <h3 className="text-sm font-black text-white leading-tight drop-shadow-lg">{b.title}</h3>
            )}
            {b.cta_text && (
              <span className="text-[11px] font-semibold text-white/90 drop-shadow-md mt-0.5">
                {b.cta_text}
              </span>
            )}
          </div>
        </>
      )}
    </a>
  );
};

const SplitBannerBlock = ({
  blockOrder,
  device,
  totalHeight = 360,
}: SplitBannerBlockProps) => {
  const { data: allBanners = [] } = useBanners("split", device);

  /* filtra pelo blockOrder e separa por lado */
  const blockBanners = allBanners.filter((b: any) => b.sort_order === blockOrder);
  const left  = blockBanners.filter((b: any) => (b as any).split_side === "left");
  const right = blockBanners.filter((b: any) => (b as any).split_side === "right");

  if (left.length === 0 && right.length === 0) return null;

  /* altura por banner em cada coluna */
  const gap = 8; // px entre banners
  const hLeft  = left.length  > 0 ? Math.floor((totalHeight - gap * (left.length  - 1)) / left.length)  : totalHeight;
  const hRight = right.length > 0 ? Math.floor((totalHeight - gap * (right.length - 1)) / right.length) : totalHeight;

  /* se apenas um lado tem banners, ocupa tudo */
  const gridCols = left.length > 0 && right.length > 0
    ? "grid-cols-2"
    : "grid-cols-1";

  return (
    <section className="container mx-auto px-3 pt-3">
      <div className={`grid ${gridCols} gap-2.5`} style={{ minHeight: totalHeight }}>

        {/* Coluna esquerda */}
        {left.length > 0 && (
          <div className="flex flex-col gap-2">
            {left.map((b: any) => (
              <BannerItem key={b.id} b={b} heightPx={hLeft} />
            ))}
          </div>
        )}

        {/* Coluna direita */}
        {right.length > 0 && (
          <div className="flex flex-col gap-2">
            {right.map((b: any) => (
              <BannerItem key={b.id} b={b} heightPx={hRight} />
            ))}
          </div>
        )}

      </div>
      <p className="text-[9px] text-muted-foreground text-right mt-0.5">Publicidade</p>
    </section>
  );
};

export default SplitBannerBlock;
