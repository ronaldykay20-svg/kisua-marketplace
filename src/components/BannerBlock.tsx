import { useBanners } from "@/hooks/useBanners";

interface BannerBlockProps {
  format: "single" | "double" | "triple" | "quad";
  /** Which batch of banners to use from the same format pool */
  offset?: number;
}

const BannerBlock = ({ format, offset = 0 }: BannerBlockProps) => {
  const count = format === "single" ? 1 : format === "double" ? 2 : format === "triple" ? 3 : 4;
  const { data: banners = [] } = useBanners(format === "single" ? "wide" : format === "quad" ? "promo" : format === "triple" ? "triple" : "square");

  const items = banners.slice(offset * count, offset * count + count);

  if (items.length === 0) return null;

  if (format === "single") {
    const b = items[0];
    return (
      <section className="container mx-auto px-3 pt-3">
        <a href={b.cta_link || "#"} className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
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
            <a key={b.id || i} href={b.cta_link || "#"} className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
              <img src={b.image_url} alt={b.title || "Banner"} className="w-full aspect-square object-cover" loading="lazy" />
            </a>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-right mt-0.5">Publicidade</p>
      </section>
    );
  }

  if (format === "triple") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-3 gap-2">
          {items.map((b, i) => (
            <a key={b.id || i} href={b.cta_link || "#"} className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
              <img src={b.image_url} alt={b.title || "Banner"} className="w-full aspect-[3/4] object-cover" loading="lazy" />
            </a>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-right mt-0.5">Publicidade</p>
      </section>
    );
  }

  // quad
  return (
    <section className="container mx-auto px-3 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((b, i) => (
          <div key={b.id || i}
            className="relative rounded-card overflow-hidden cursor-pointer group min-h-[200px] sm:min-h-[260px]">
            <img src={b.image_url} alt={b.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-3 pt-16">
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">{b.title}</h3>
              {b.subtitle && <p className="text-[10px] text-white/70">{b.subtitle}</p>}
              {b.cta_text && <a href={b.cta_link || "#"} className="text-[10px] font-semibold text-white hover:underline mt-0.5">{b.cta_text}</a>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BannerBlock;
