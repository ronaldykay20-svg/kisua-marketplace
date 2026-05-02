import { useEffect, useMemo, useState } from "react";
import { useBanners } from "@/hooks/useBanners";

interface HomeBannerSlotProps {
  slot: number;
}

/** Map text_position to Tailwind classes */
const positionClasses: Record<string, { wrapper: string; align: string }> = {
  "top-left": { wrapper: "justify-start items-start", align: "text-left" },
  "top-right": { wrapper: "justify-start items-end", align: "text-right" },
  "bottom-left": { wrapper: "justify-end items-start", align: "text-left" },
  "bottom-right": { wrapper: "justify-end items-end", align: "text-right" },
};

const getPos = (p?: string) => positionClasses[p || "bottom-left"] || positionClasses["bottom-left"];

/** Gradient direction based on text position */
const gradientDir = (p?: string) => {
  if (p === "top-left") return "bg-gradient-to-br from-black/80 via-black/30 to-transparent";
  if (p === "top-right") return "bg-gradient-to-bl from-black/80 via-black/30 to-transparent";
  if (p === "bottom-right") return "bg-gradient-to-tl from-black/80 via-black/30 to-transparent";
  return "bg-gradient-to-t from-black/80 via-black/30 to-transparent";
};

const HomeBannerSlot = ({ slot }: HomeBannerSlotProps) => {
  const { data: banners = [] } = useBanners();
  const banner = banners.find((item) => item.sort_order === slot);

  const images = useMemo(
    () => (banner ? [banner.image_url, ...(banner.extra_images || [])].filter(Boolean) : []),
    [banner],
  );

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => { setCurrentImage(0); }, [banner?.id]);

  useEffect(() => {
    if (!banner || !["hero", "hero-full"].includes(banner.format) || images.length <= 1) return;
    const timer = window.setInterval(() => setCurrentImage((v) => (v + 1) % images.length), 5000);
    return () => window.clearInterval(timer);
  }, [banner, images.length]);

  if (!banner) return null;

  const image = images[currentImage] || images[0];
  const href = banner.cta_link || "#";
  const pos = getPos(banner.text_position);
  const hasText = !!(banner.title || banner.subtitle || banner.cta_text);

  // ── Hero ──
  if (banner.format === "hero" || banner.format === "hero-full") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="block rounded-card overflow-hidden border border-border">
          <div className={`relative ${banner.format === "hero-full" ? "min-h-[260px] sm:min-h-[360px] md:min-h-[400px]" : "min-h-[220px] sm:min-h-[300px] md:min-h-[360px]"}`}>
            <img src={image} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" />
            <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
            <div className={`relative flex h-full flex-col p-5 sm:p-8 ${pos.wrapper} ${banner.format === "hero-full" ? "min-h-[260px] sm:min-h-[360px] md:min-h-[400px]" : "min-h-[220px] sm:min-h-[300px] md:min-h-[360px]"}`}>
              <div className={`max-w-[72%] space-y-1.5 ${pos.align}`}>
                {banner.subtitle && <p className="text-xs font-bold text-white/80 drop-shadow-md">{banner.subtitle}</p>}
                <h2 className="text-xl font-black leading-tight text-white sm:text-3xl whitespace-pre-line drop-shadow-lg">{banner.title || "Banner principal"}</h2>
                {banner.cta_text && <span className="inline-block pt-1 text-sm font-semibold text-white drop-shadow-md">{banner.cta_text}</span>}
              </div>
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {images.map((_, index) => (
                  <span key={`${banner.id}-${index}`} className={`h-1.5 w-1.5 rounded-full ${index === currentImage ? "bg-white" : "bg-white/35"}`} />
                ))}
              </div>
            )}
          </div>
        </a>
      </section>
    );
  }

  // ── Wide / Publicidade ──
  if (banner.format === "wide" || banner.format === "wide-slim") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <div className={banner.format === "wide-slim" ? "aspect-[4/1]" : "aspect-[21/9] sm:aspect-[24/8] md:aspect-[21/7]"}>
            <img src={image} alt={banner.title || "Banner"} className="h-full w-full object-cover" loading="lazy" />
          </div>
        </a>
        <p className="mt-0.5 text-right text-[9px] text-muted-foreground">Publicidade</p>
      </section>
    );
  }

  // ── Duo ──
  if (banner.format === "duo-square") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((index) => (
            <a key={`${banner.id}-${index}`} href={href} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="aspect-square sm:aspect-[4/3] w-full object-cover" loading="lazy" />
              {index === 0 && banner.title && (
                <>
                  <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                  <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                    <h3 className={`text-xs sm:text-sm font-bold text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>
                    {banner.cta_text && <span className={`text-[10px] font-semibold text-white/90 drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                  </div>
                </>
              )}
            </a>
          ))}
        </div>
      </section>
    );
  }

  // ── Trio ──
  if (banner.format === "trio-banner") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((index) => (
            <a key={`${banner.id}-${index}`} href={href} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="aspect-[4/3] sm:aspect-[3/2] w-full object-cover" loading="lazy" />
              {index === 0 && banner.title && (
                <>
                  <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                  <div className={`absolute inset-0 flex flex-col p-2 ${pos.wrapper}`}>
                    <h3 className={`text-[10px] sm:text-xs font-bold text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>
                  </div>
                </>
              )}
            </a>
          ))}
        </div>
      </section>
    );
  }

  // ── Mosaic ──
  if (banner.format === "mosaic") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5" style={{ minHeight: 320 }}>
          <a href={href} className="relative row-span-2 block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
            <div className="relative h-full min-h-[320px] md:min-h-[400px]">
              <img src={images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
              <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                {banner.title && <h3 className={`text-sm font-bold leading-tight text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>}
                {banner.cta_text && <span className={`text-[11px] font-semibold text-white/90 drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
              </div>
            </div>
          </a>
          <div className="flex flex-col gap-2.5">
            {[1, 2].map((index) => (
              <a key={`${banner.id}-${index}`} href={href} className="relative block flex-1 overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
                <div className="relative h-full min-h-[155px] md:min-h-[190px]">
                  <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                  <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                    {banner.title && <h3 className={`text-xs font-bold leading-tight text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>}
                    {banner.cta_text && <span className={`text-[10px] font-semibold text-white/90 drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Promo ──
  if (banner.format === "promo") {
    return (
      <section className="container mx-auto px-3 pt-3">
        {images.length >= 4 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {images.slice(0, 4).map((item, index) => (
              <a key={`${banner.id}-${index}`} href={href} className="relative block min-h-[200px] sm:min-h-[240px] md:min-h-[280px] overflow-hidden rounded-card border border-border transition-transform duration-300 hover:scale-[1.01]">
                <img src={item} alt={banner.title || `Banner ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                {index === 0 && (
                  <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                    {banner.title && <h3 className={`text-xs font-bold leading-tight text-white drop-shadow-lg sm:text-sm ${pos.align}`}>{banner.title}</h3>}
                    {banner.subtitle && <p className={`text-[10px] text-white/80 drop-shadow-md ${pos.align}`}>{banner.subtitle}</p>}
                    {banner.cta_text && <span className={`mt-0.5 text-[10px] font-semibold text-white drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <a href={href} className="relative block min-h-[240px] sm:min-h-[280px] md:min-h-[320px] overflow-hidden rounded-card border border-border transition-transform duration-300 hover:scale-[1.01]">
            <img src={image} alt={banner.title || "Banner promocional"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
            <div className={`absolute inset-0 flex flex-col p-4 ${pos.wrapper}`}>
              {banner.title && <h3 className={`text-sm font-bold leading-tight text-white drop-shadow-lg sm:text-lg ${pos.align}`}>{banner.title}</h3>}
              {banner.subtitle && <p className={`text-[10px] text-white/80 drop-shadow-md ${pos.align}`}>{banner.subtitle}</p>}
              {banner.cta_text && <span className={`mt-0.5 text-[10px] font-semibold text-white drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
            </div>
          </a>
        )}
      </section>
    );
  }

  // ── Square ──
  if (banner.format === "square" || banner.format === "square-rounded") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className={`block overflow-hidden border border-border transition-shadow hover:shadow-md ${banner.format === "square-rounded" ? "mx-auto max-w-[220px] rounded-full" : "rounded-card"}`}>
          <img src={image} alt={banner.title || "Banner"} className="aspect-square w-full object-cover" loading="lazy" />
        </a>
      </section>
    );
  }

  // ── Vertical / Story ──
  if (banner.format === "vertical" || banner.format === "story-card") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="mx-auto block max-w-[220px] overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-md">
          <img src={image} alt={banner.title || "Banner"} className="aspect-[9/16] w-full object-cover" loading="lazy" />
          {banner.title && (
            <div className="p-2 text-center">
              <p className="truncate text-[10px] font-bold text-foreground">{banner.title}</p>
            </div>
          )}
        </a>
      </section>
    );
  }

  // ── Tall / Natural (respects image's natural aspect ratio — no crop) ──
  if (banner.format === "tall" || banner.format === "natural") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <img src={image} alt={banner.title || "Banner"} className="w-full h-auto object-contain" loading="lazy" />
          {banner.title && (
            <>
              <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
              <div className={`absolute inset-0 flex flex-col p-4 ${pos.wrapper}`}>
                <div className={`max-w-[80%] space-y-1 ${pos.align}`}>
                  {banner.subtitle && <p className="text-xs font-bold text-white/90 drop-shadow-md">{banner.subtitle}</p>}
                  <h3 className="text-sm sm:text-lg font-black text-white drop-shadow-lg">{banner.title}</h3>
                  {banner.cta_text && <span className="text-[11px] font-semibold text-white drop-shadow-md">{banner.cta_text}</span>}
                </div>
              </div>
            </>
          )}
        </a>
      </section>
    );
  }

  // ── Fallback ──
  return (
    <section className="container mx-auto px-3 pt-3">
      <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
        <img src={image} alt={banner.title || "Banner"} className="aspect-[21/9] md:aspect-[21/7] w-full object-cover" loading="lazy" />
      </a>
    </section>
  );
};

export default HomeBannerSlot;
