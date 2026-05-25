import { useEffect, useMemo, useRef, useState } from "react";
import { useBanners } from "@/hooks/useBanners";
import BannerCategoryProducts from "./BannerCategoryProducts";
import type { DeviceLayout } from "@/hooks/useDeviceLayout";

interface HomeBannerSlotProps {
  slot: number;
  device?: DeviceLayout;
  compact?: boolean;
  sidebar?: boolean;
}

const positionClasses: Record<string, { wrapper: string; align: string }> = {
  "top-left":     { wrapper: "justify-start items-start", align: "text-left" },
  "top-right":    { wrapper: "justify-start items-end",   align: "text-right" },
  "bottom-left":  { wrapper: "justify-end items-start",   align: "text-left" },
  "bottom-right": { wrapper: "justify-end items-end",     align: "text-right" },
};
const getPos = (p?: string) =>
  positionClasses[p || "bottom-left"] || positionClasses["bottom-left"];

const gradientDir = (p?: string) => {
  if (p === "top-left")     return "bg-gradient-to-br from-black/80 via-black/30 to-transparent";
  if (p === "top-right")    return "bg-gradient-to-bl from-black/80 via-black/30 to-transparent";
  if (p === "bottom-right") return "bg-gradient-to-tl from-black/80 via-black/30 to-transparent";
  return "bg-gradient-to-t from-black/80 via-black/30 to-transparent";
};

interface SplitImage {
  url: string;
  cta_link: string;
  title: string | null;
  text_position: string | undefined;
}

/* ─── Dots indicadores de slide ─── */
const SlideDots = ({
  total, current, onClick,
}: {
  total: number;
  current: number;
  onClick: (i: number) => void;
}) => (
  <div className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-10">
    {Array.from({ length: total }).map((_, i) => (
      <button
        key={i}
        onClick={e => { e.preventDefault(); onClick(i); }}
        className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
      />
    ))}
  </div>
);

/* ─── Célula de imagem com altura explícita em px (sem texto) ─── */
const ImgCell = ({ img, height }: { img: SplitImage; height: number }) => (
  <a
    href={img.cta_link}
    className="relative block w-full overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md"
    style={{ height }}
  >
    <img
      src={img.url}
      alt="Banner"
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />
  </a>
);

const SplitSide = ({ imgs, layout, totalH }: {
  imgs: SplitImage[];
  layout: string;
  totalH: number;
}) => {
  if (imgs.length === 0) return null;
  const g = (i: number) => imgs[i] ?? imgs[imgs.length - 1];
  const GAP = 4;
  const full  = totalH;
  const half  = (totalH - GAP) / 2;
  const third = (totalH - GAP * 2) / 3;
  const qrt   = (totalH - GAP * 3) / 4;

  switch (layout) {
    case "1-full":      return <div style={{ height: totalH }}><ImgCell img={g(0)} height={full} /></div>;
    case "2-col":       return <div className="flex flex-col gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={half} /><ImgCell img={g(1)} height={half} /></div>;
    case "2-row":       return <div className="grid grid-cols-2 gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={full} /><ImgCell img={g(1)} height={full} /></div>;
    case "3-col":       return <div className="flex flex-col gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={third} /><ImgCell img={g(1)} height={third} /><ImgCell img={g(2)} height={third} /></div>;
    case "3-row":       return <div className="grid grid-cols-3 gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={full} /><ImgCell img={g(1)} height={full} /><ImgCell img={g(2)} height={full} /></div>;
    case "3-2cima-1baixo": return <div className="flex flex-col gap-1" style={{ height: totalH }}><div className="grid grid-cols-2 gap-1" style={{ height: half }}><ImgCell img={g(0)} height={half} /><ImgCell img={g(1)} height={half} /></div><ImgCell img={g(2)} height={half} /></div>;
    case "3-1cima-2baixo": return <div className="flex flex-col gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={half} /><div className="grid grid-cols-2 gap-1" style={{ height: half }}><ImgCell img={g(1)} height={half} /><ImgCell img={g(2)} height={half} /></div></div>;
    case "3-2esq-1dir": return <div className="grid grid-cols-2 gap-1" style={{ height: totalH }}><div className="flex flex-col gap-1"><ImgCell img={g(0)} height={half} /><ImgCell img={g(1)} height={half} /></div><ImgCell img={g(2)} height={full} /></div>;
    case "3-1esq-2dir": return <div className="grid grid-cols-2 gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={full} /><div className="flex flex-col gap-1"><ImgCell img={g(1)} height={half} /><ImgCell img={g(2)} height={half} /></div></div>;
    case "4-2x2":       return <div className="flex flex-col gap-1" style={{ height: totalH }}><div className="grid grid-cols-2 gap-1" style={{ height: half }}><ImgCell img={g(0)} height={half} /><ImgCell img={g(1)} height={half} /></div><div className="grid grid-cols-2 gap-1" style={{ height: half }}><ImgCell img={g(2)} height={half} /><ImgCell img={g(3)} height={half} /></div></div>;
    case "4-col":       return <div className="flex flex-col gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={qrt} /><ImgCell img={g(1)} height={qrt} /><ImgCell img={g(2)} height={qrt} /><ImgCell img={g(3)} height={qrt} /></div>;
    case "4-row":       return <div className="grid grid-cols-4 gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={full} /><ImgCell img={g(1)} height={full} /><ImgCell img={g(2)} height={full} /><ImgCell img={g(3)} height={full} /></div>;
    case "4-1cima-3baixo": return <div className="flex flex-col gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={half} /><div className="grid grid-cols-3 gap-1" style={{ height: half }}><ImgCell img={g(1)} height={half} /><ImgCell img={g(2)} height={half} /><ImgCell img={g(3)} height={half} /></div></div>;
    case "4-3cima-1baixo": return <div className="flex flex-col gap-1" style={{ height: totalH }}><div className="grid grid-cols-3 gap-1" style={{ height: half }}><ImgCell img={g(0)} height={half} /><ImgCell img={g(1)} height={half} /><ImgCell img={g(2)} height={half} /></div><ImgCell img={g(3)} height={half} /></div>;
    case "4-1esq-3dir": return <div className="grid grid-cols-2 gap-1" style={{ height: totalH }}><ImgCell img={g(0)} height={full} /><div className="flex flex-col gap-1"><ImgCell img={g(1)} height={third} /><ImgCell img={g(2)} height={third} /><ImgCell img={g(3)} height={third} /></div></div>;
    case "4-3esq-1dir": return <div className="grid grid-cols-2 gap-1" style={{ height: totalH }}><div className="flex flex-col gap-1"><ImgCell img={g(0)} height={third} /><ImgCell img={g(1)} height={third} /><ImgCell img={g(2)} height={third} /></div><ImgCell img={g(3)} height={full} /></div>;
    default:            return <div className="flex flex-col gap-1" style={{ height: totalH }}>{imgs.map((img, i) => <ImgCell key={i} img={img} height={(totalH - GAP * (imgs.length - 1)) / imgs.length} />)}</div>;
  }
};

const layoutRows = (layout: string): number => {
  if (["2-col","3-2cima-1baixo","3-1cima-2baixo","4-2x2","4-1cima-3baixo","4-3cima-1baixo","3-2esq-1dir","3-1esq-2dir"].includes(layout)) return 2;
  if (["3-col","4-1esq-3dir","4-3esq-1dir"].includes(layout)) return 3;
  if (["4-col"].includes(layout)) return 4;
  return 1;
};

const GAP = 4;
const calcTotalH = (rows: number, baseH: number) => rows * baseH + (rows - 1) * GAP;

const HomeBannerSlot = ({
  slot,
  device = "mobile",
  compact = false,
  sidebar = false,
}: HomeBannerSlotProps) => {
  const { data: banners = [] } = useBanners(undefined, device);

  const matchesDevice = (b: any) => {
    if (b.device === device) return true;
    if (!b.device && device === "mobile") return true;
    return false;
  };

  const slotBanners = useMemo(
    () => banners.filter((b) => b.sort_order === slot && matchesDevice(b)),
    [banners, slot, device],
  );

  const splitLeftBanners  = useMemo(() => slotBanners.filter((b: any) => b.format === "split" && b.split_side === "left"),  [slotBanners]);
  const splitRightBanners = useMemo(() => slotBanners.filter((b: any) => b.format === "split" && b.split_side === "right"), [slotBanners]);

  const splitLeftLayout  = (splitLeftBanners[0]  as any)?.split_layout || "1-full";
  const splitRightLayout = (splitRightBanners[0] as any)?.split_layout || "1-full";

  const splitLeftImages = useMemo<SplitImage[]>(
    () => splitLeftBanners.flatMap((b: any) =>
      [b.image_url, ...(b.extra_images || [])].filter(Boolean).map((url: string) => ({
        url, cta_link: b.cta_link || "#", title: null, text_position: undefined,
      }))
    ), [splitLeftBanners],
  );
  const splitRightImages = useMemo<SplitImage[]>(
    () => splitRightBanners.flatMap((b: any) =>
      [b.image_url, ...(b.extra_images || [])].filter(Boolean).map((url: string) => ({
        url, cta_link: b.cta_link || "#", title: null, text_position: undefined,
      }))
    ), [splitRightBanners],
  );

  const banner = useMemo(() => slotBanners.find((b: any) => !b.split_side), [slotBanners]);
  const images = useMemo(
    () => banner ? [banner.image_url, ...(banner.extra_images || [])].filter(Boolean) : [],
    [banner],
  );

  const [currentImage, setCurrentImage] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCurrentImage(0); setPaused(false); }, [banner?.id]);

  // Pausa ao toque — retoma automaticamente após 6 segundos de inatividade
  const handleSlideTouch = () => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 6000);
  };

  useEffect(() => {
    if (!banner) return;
    if (!["hero","hero-full","wide","wide-slim"].includes(banner.format) || images.length <= 1) return;
    if (paused) return;
    const t = window.setInterval(() => setCurrentImage((v) => (v + 1) % images.length), 5000);
    return () => window.clearInterval(t);
  }, [banner, images.length, paused]);

  const sectionCls =
    sidebar || compact ? "w-full"
    : device === "mobile" ? "container mx-auto px-3 pt-3"
    : "w-full pt-3";

  /* ── SPLIT ── */
  const isSplitSlot = splitLeftBanners.length > 0 || splitRightBanners.length > 0;
  if (isSplitSlot) {
    if (splitLeftImages.length === 0 && splitRightImages.length === 0) return null;
    const baseH   = sidebar ? 220 : compact ? 150 : 280;
    const maxRows = Math.max(layoutRows(splitLeftLayout), layoutRows(splitRightLayout));
    const totalH  = calcTotalH(maxRows, baseH);
    const hasBoth = splitLeftImages.length > 0 && splitRightImages.length > 0;
    return (
      <section className={sectionCls}>
        {hasBoth ? (
          <div className="flex gap-1 w-full" style={{ height: totalH }}>
            <div className="flex-1 min-w-0"><SplitSide imgs={splitLeftImages}  layout={splitLeftLayout}  totalH={totalH} /></div>
            <div className="flex-1 min-w-0"><SplitSide imgs={splitRightImages} layout={splitRightLayout} totalH={totalH} /></div>
          </div>
        ) : (
          <div className="w-full">
            <SplitSide imgs={splitLeftImages}  layout={splitLeftLayout}  totalH={totalH} />
            <SplitSide imgs={splitRightImages} layout={splitRightLayout} totalH={totalH} />
          </div>
        )}
      </section>
    );
  }

  if (!banner) return null;

  const image   = images[currentImage] || images[0];
  const href    = banner.cta_link || "#";
  const linkFor = (i: number) => banner.extra_links?.[i] || banner.cta_link || "#";

  const heroH     = sidebar ? "min-h-[320px]" : compact ? "min-h-[140px] sm:min-h-[180px]" : "min-h-[200px] sm:min-h-[280px] md:min-h-[340px]";
  const heroFullH = sidebar ? "min-h-[400px]" : compact ? "min-h-[160px] sm:min-h-[200px]" : "min-h-[260px] sm:min-h-[320px] md:min-h-[380px]";

  const withCategoryProducts = (children: React.ReactNode) => (
    <>{children}{banner.category_id && <BannerCategoryProducts categoryId={banner.category_id} />}</>
  );

  /* ── HERO / HERO-FULL ── */
  if (banner.format === "hero" || banner.format === "hero-full") {
    const h = banner.format === "hero-full" ? heroFullH : heroH;
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="block rounded-card overflow-hidden border border-border">
          <div
            className={`relative ${h}`}
            onTouchStart={images.length > 1 ? handleSlideTouch : undefined}
          >
            <a href={href}>
              <img src={image} alt="Banner" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500" />
            </a>
            {images.length > 1 && (
              <SlideDots
                total={images.length}
                current={currentImage}
                onClick={(i) => { setCurrentImage(i); handleSlideTouch(); }}
              />
            )}
          </div>
        </div>
      </section>,
    );
  }

  /* ── WIDE / WIDE-SLIM ── */
  if (banner.format === "wide" || banner.format === "wide-slim") {
    const aspectCls = banner.format === "wide-slim"
      ? "aspect-[4/1]"
      : compact ? "aspect-[3/1]" : "aspect-[21/9] sm:aspect-[16/6] md:aspect-[16/5]";
    return withCategoryProducts(
      <section className={sectionCls}>
        <div
          className="relative overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md"
          onTouchStart={images.length > 1 ? handleSlideTouch : undefined}
        >
          <a href={href} className="block">
            <div className={aspectCls}>
              <img src={image} alt="Banner" className="h-full w-full object-cover transition-opacity duration-500" loading="lazy" />
            </div>
          </a>
          {images.length > 1 && (
            <SlideDots
              total={images.length}
              current={currentImage}
              onClick={(i) => { setCurrentImage(i); handleSlideTouch(); }}
            />
          )}
        </div>
      </section>,
    );
  }

  /* ── DUO-SQUARE ── */
  if (banner.format === "duo-square") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((i) => (
            <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[i] || images[0]} alt="Banner" className="aspect-square sm:aspect-[5/4] w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      </section>,
    );
  }

  /* ── TRIO-BANNER ── */
  if (banner.format === "trio-banner") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[i] || images[0]} alt="Banner" className="aspect-[4/3] sm:aspect-[5/4] w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      </section>,
    );
  }

  /* ── MOSAIC ── */
  if (banner.format === "mosaic") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-2 gap-2.5" style={{ minHeight: 280 }}>
          <a href={linkFor(0)} className="relative row-span-2 block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
            <div className="relative h-full min-h-[280px] md:min-h-[340px]">
              <img src={images[0]} alt="Banner" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            </div>
          </a>
          <div className="flex flex-col gap-2.5">
            {[1, 2].map((i) => (
              <a key={i} href={linkFor(i)} className="relative block flex-1 overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
                <div className="relative h-full min-h-[130px] md:min-h-[165px]">
                  <img src={images[i] || images[0]} alt="Banner" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>,
    );
  }

  /* ── PROMO ── */
  if (banner.format === "promo") {
    return withCategoryProducts(
      <section className={sectionCls}>
        {images.length >= 4 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {images.slice(0, 4).map((item, i) => (
              <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border" style={{ minHeight: compact ? 120 : 180 }}>
                <img src={item} alt="Banner" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        ) : (
          <a href={href} className="relative block overflow-hidden rounded-card border border-border" style={{ minHeight: compact ? 140 : 220 }}>
            <img src={image} alt="Banner" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          </a>
        )}
      </section>,
    );
  }

  /* ── SQUARE / SQUARE-ROUNDED ── */
  if (banner.format === "square" || banner.format === "square-rounded") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className={`block overflow-hidden border border-border transition-shadow hover:shadow-md ${banner.format === "square-rounded" ? "mx-auto max-w-[220px] rounded-full" : "rounded-card"}`}>
          <img src={image} alt="Banner" className="aspect-square w-full object-cover" loading="lazy" />
        </a>
      </section>,
    );
  }

  /* ── VERTICAL / STORY-CARD ── */
  if (banner.format === "vertical" || banner.format === "story-card") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className={`block overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-md ${sidebar ? "w-full" : "mx-auto max-w-[220px]"}`}>
          <img src={image} alt="Banner" className="aspect-[9/16] w-full object-cover" loading="lazy" />
        </a>
      </section>,
    );
  }

  /* ── TALL / NATURAL ── */
  if (banner.format === "tall" || banner.format === "natural") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <img src={image} alt="Banner" className="w-full h-auto object-contain" loading="lazy" />
        </a>
      </section>,
    );
  }

  /* ── FALLBACK ── */
  return withCategoryProducts(
    <section className={sectionCls}>
      <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
        <img src={image} alt="Banner"
          className={compact ? "aspect-[3/1] w-full object-cover" : "aspect-[21/9] sm:aspect-[16/6] md:aspect-[16/5] w-full object-cover"}
          loading="lazy" />
      </a>
    </section>,
  );
};

export default HomeBannerSlot;
