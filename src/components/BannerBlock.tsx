import { useBanners } from "@/hooks/useBanners";

interface BannerBlockProps {
  format: "single" | "double" | "triple" | "quad";
  offset?: number;
}

const BannerBlock = ({ format, offset = 0 }: BannerBlockProps) => {
  const count = format === "single" ? 1 : format === "double" ? 2 : format === "triple" ? 3 : 4;
  const formatKey = format === "single" ? "wide" : format === "quad" ? "promo" : format === "triple" ? "triple" : "square";
  const { data: banners = [] } = useBanners(formatKey);

  const start = offset * count;
  const items = banners.slice(start, start + count);
  if (items.length === 0) return null;

  if (format === "single") {
    const b = items[0];
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={b.cta_link || "#"} className="rounded-gpu-fix block rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow">
          <img src={b.image_url} alt={b.title || "Banner"} className="w-full aspect-[21/9] object-cover" loading="lazy" />
        </a>
        <p className="text-[9px] text-muted-foreground text-right mt-0.5">Publicidade</p>
      </section>
    );
  }

  if (format === "double") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((b, i) => (
            <a key={b.id || i} href={b.cta_link || "#"} className="rounded-gpu-fix block rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow">
              <img src={b.image_url} alt={b.title || "Banner"} className="w-full aspect-square object-cover" loading="lazy" />
            </a>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-right mt-0.5">Publicidade</p>
      </section>
    );
  }

  // Triple: mosaic like Walmart — 1 tall left, 2 stacked right
  if (format === "triple") {
    const [left, ...right] = items;
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5" style={{ minHeight: 320 }}>
          {/* Left tall card */}
          <a href={left.cta_link || "#"} className="rounded-gpu-fix block rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow relative row-span-2">
            <div className="relative h-full min-h-[320px]" style={{ backgroundColor: left.bg_color || "#F0F9FF" }}>
              <img src={left.image_url} alt={left.title || ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 p-3">
                {left.title && <h3 className="text-sm font-bold text-white leading-tight">{left.title}</h3>}
                {left.cta_text && <span className="text-[11px] text-white/80 font-semibold">{left.cta_text}</span>}
              </div>
            </div>
          </a>
          {/* Right stacked cards */}
          <div className="flex flex-col gap-2.5">
            {right.map((b, i) => (
              <a key={b.id || i} href={b.cta_link || "#"} className="rounded-gpu-fix block rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow relative flex-1">
                <div className="relative h-full min-h-[155px]" style={{ backgroundColor: b.bg_color || "#FDF2F8" }}>
                  <img src={b.image_url} alt={b.title || ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3">
                    {b.title && <h3 className="text-xs font-bold text-white leading-tight">{b.title}</h3>}
                    {b.cta_text && <span className="text-[10px] text-white/80 font-semibold">{b.cta_text}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Quad
  return (
    <section className="container mx-auto px-3 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((b, i) => (
          <a key={b.id || i} href={b.cta_link || "#"}
            className="rounded-gpu-fix relative rounded-2xl overflow-hidden cursor-pointer group min-h-[200px] sm:min-h-[260px] border border-border">
            <img src={b.image_url} alt={b.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-3 pt-16">
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">{b.title}</h3>
              {b.subtitle && <p className="text-[10px] text-white/70">{b.subtitle}</p>}
              {b.cta_text && <span className="text-[10px] font-semibold text-white hover:underline mt-0.5">{b.cta_text}</span>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default BannerBlock;
