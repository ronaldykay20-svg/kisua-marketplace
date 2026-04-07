import { useEffect, useMemo, useState } from "react";
import { useBanners } from "@/hooks/useBanners";

interface HomeBannerSlotProps {
  slot: number;
}

const HomeBannerSlot = ({ slot }: HomeBannerSlotProps) => {
  const { data: banners = [] } = useBanners();
  const banner = banners.find((item) => item.sort_order === slot);

  const images = useMemo(
    () => (banner ? [banner.image_url, ...(banner.extra_images || [])].filter(Boolean) : []),
    [banner],
  );

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    setCurrentImage(0);
  }, [banner?.id]);

  useEffect(() => {
    if (!banner || !["hero", "hero-full"].includes(banner.format) || images.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentImage((value) => (value + 1) % images.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [banner, images.length]);

  if (!banner) return null;

  const image = images[currentImage] || images[0];
  const href = banner.cta_link || "#";
  const backgroundStyle = { backgroundColor: banner.bg_color || undefined };

  if (banner.format === "hero" || banner.format === "hero-full") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="block rounded-card overflow-hidden border border-border" style={backgroundStyle}>
          <div className={`relative ${banner.format === "hero-full" ? "min-h-[260px] sm:min-h-[360px]" : "min-h-[220px] sm:min-h-[300px]"}`}>
            <img src={image} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/45 to-transparent" />
            <div className={`relative flex h-full flex-col justify-end p-5 sm:p-8 ${banner.format === "hero-full" ? "min-h-[260px] sm:min-h-[360px]" : "min-h-[220px] sm:min-h-[300px]"}`}>
              <div className="max-w-[72%] space-y-1.5">
                {banner.subtitle && <p className="text-xs font-bold text-primary-foreground/70">{banner.subtitle}</p>}
                <h2 className="text-xl font-black leading-tight text-primary-foreground sm:text-3xl whitespace-pre-line">{banner.title || "Banner principal"}</h2>
                {banner.cta_text && <span className="inline-block pt-1 text-sm font-semibold text-primary-foreground">{banner.cta_text}</span>}
              </div>
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {images.map((_, index) => (
                  <span
                    key={`${banner.id}-${index}`}
                    className={`h-1.5 w-1.5 rounded-full ${index === currentImage ? "bg-primary-foreground" : "bg-primary-foreground/35"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </a>
      </section>
    );
  }

  if (banner.format === "wide" || banner.format === "wide-slim") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <div className={banner.format === "wide-slim" ? "aspect-[4/1]" : "aspect-[21/9] sm:aspect-[24/8]"}>
            <img src={image} alt={banner.title || "Banner"} className="h-full w-full object-cover" loading="lazy" />
          </div>
        </a>
        <p className="mt-0.5 text-right text-[9px] text-muted-foreground">Publicidade</p>
      </section>
    );
  }

  if (banner.format === "duo-square") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((index) => (
            <a
              key={`${banner.id}-${index}`}
              href={href}
              className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md"
            >
              <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="aspect-square w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (banner.format === "trio-banner") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((index) => (
            <a
              key={`${banner.id}-${index}`}
              href={href}
              className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md"
            >
              <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (banner.format === "mosaic") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5" style={{ minHeight: 320 }}>
          <a href={href} className="relative row-span-2 block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
            <div className="relative h-full min-h-[320px]" style={backgroundStyle}>
              <img src={images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
              <div className="absolute bottom-0 left-0 p-3">
                {banner.title && <h3 className="text-sm font-bold leading-tight text-primary-foreground">{banner.title}</h3>}
                {banner.cta_text && <span className="text-[11px] font-semibold text-primary-foreground/80">{banner.cta_text}</span>}
              </div>
            </div>
          </a>

          <div className="flex flex-col gap-2.5">
            {[1, 2].map((index) => (
              <a
                key={`${banner.id}-${index}`}
                href={href}
                className="relative block flex-1 overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md"
              >
                <div className="relative h-full min-h-[155px]" style={backgroundStyle}>
                  <img src={images[index] || images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3">
                    {banner.title && <h3 className="text-xs font-bold leading-tight text-primary-foreground">{banner.title}</h3>}
                    {banner.cta_text && <span className="text-[10px] font-semibold text-primary-foreground/80">{banner.cta_text}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (banner.format === "promo") {
    return (
      <section className="container mx-auto px-3 pt-3">
        {images.length >= 4 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {images.slice(0, 4).map((item, index) => (
              <a
                key={`${banner.id}-${index}`}
                href={href}
                className="relative block min-h-[200px] overflow-hidden rounded-card border border-border transition-transform duration-300 hover:scale-[1.01]"
              >
                <img src={item} alt={banner.title || `Banner ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                {index === 0 && (
                  <div className="relative flex h-full flex-col justify-end p-3 pt-20">
                    {banner.title && <h3 className="text-xs font-bold leading-tight text-primary-foreground sm:text-sm">{banner.title}</h3>}
                    {banner.subtitle && <p className="text-[10px] text-primary-foreground/70">{banner.subtitle}</p>}
                    {banner.cta_text && <span className="mt-0.5 text-[10px] font-semibold text-primary-foreground">{banner.cta_text}</span>}
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <a href={href} className="relative block min-h-[240px] overflow-hidden rounded-card border border-border transition-transform duration-300 hover:scale-[1.01]">
            <img src={image} alt={banner.title || "Banner promocional"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
            <div className="relative flex h-full min-h-[240px] flex-col justify-end p-3 pt-20">
              {banner.title && <h3 className="text-sm font-bold leading-tight text-primary-foreground">{banner.title}</h3>}
              {banner.subtitle && <p className="text-[10px] text-primary-foreground/70">{banner.subtitle}</p>}
              {banner.cta_text && <span className="mt-0.5 text-[10px] font-semibold text-primary-foreground">{banner.cta_text}</span>}
            </div>
          </a>
        )}
      </section>
    );
  }

  if (banner.format === "square" || banner.format === "square-rounded") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={href} className={`block overflow-hidden border border-border transition-shadow hover:shadow-md ${banner.format === "square-rounded" ? "mx-auto max-w-[220px] rounded-full" : "rounded-card"}`}>
          <img src={image} alt={banner.title || "Banner"} className="aspect-square w-full object-cover" loading="lazy" />
        </a>
      </section>
    );
  }

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

  return (
    <section className="container mx-auto px-3 pt-3">
      <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
        <img src={image} alt={banner.title || "Banner"} className="aspect-[21/9] w-full object-cover" loading="lazy" />
      </a>
    </section>
  );
};

export default HomeBannerSlot;