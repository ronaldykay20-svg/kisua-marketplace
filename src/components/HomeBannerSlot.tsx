import { useEffect, useMemo, useState } from "react";
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

/* ─── Célula de imagem com altura SEMPRE em px explícito ─── */
const ImgCell = ({ img, h, w2 = false }: {
  img: SplitImage;
  h: number;       // altura em px — sempre explícita
  w2?: boolean;    // ocupa 2 colunas no grid
}) => {
  const pos = getPos(img.text_position);
  return (
    <a
      href={img.cta_link}
      className={`relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md${w2 ? " col-span-2" : ""}`}
      style={{ height: h }}
    >
      <img
        src={img.url}
        alt={img.title || "Banner"}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {img.title && (
        <>
          <div className={`absolute inset-0 ${gradientDir(img.text_position)}`} />
          <div className={`absolute inset-0 flex flex-col p-2 ${pos.wrapper}`}>
            <p className={`text-xs font-bold text-white drop-shadow-lg ${pos.align}`}>
              {img.title}
            </p>
          </div>
        </>
      )}
    </a>
  );
};

/* ─────────────────────────────────────────────────────────────
   renderSide
   
   baseH  = altura de 1 linha (px) — definida por device/compact
   layout = combinação escolhida pelo admin
   
   TODAS as alturas são em px explícito.
   Sem flex:1 em elementos block.
───────────────────────────────────────────────────────────── */
const renderSide = (imgs: SplitImage[], layout: string, baseH: number) => {
  if (imgs.length === 0) return null;
  const g = (i: number) => imgs[i] ?? imgs[imgs.length - 1];

  // alturas derivadas
  const h1 = baseH;           // 1 linha
  const h2 = baseH * 2 + 4;  // 2 linhas (+ gap)
  const h3 = baseH * 3 + 8;  // 3 linhas (+ gaps)
  const h4 = baseH * 4 + 12; // 4 linhas (+ gaps)
  const hHalf = (h2 - 4) / 2; // metade de 2 linhas

  switch (layout) {

    /* ══ 1 imagem ══ */
    case "1-full":
      return <ImgCell img={g(0)} h={h1} />;

    /* ══ 2 imagens ══ */
    case "2-col": // A / B
      return (
        <div className="flex flex-col gap-1">
          <ImgCell img={g(0)} h={hHalf} />
          <ImgCell img={g(1)} h={hHalf} />
        </div>
      );
    case "2-row": // A | B
      return (
        <div className="grid grid-cols-2 gap-1">
          <ImgCell img={g(0)} h={h1} />
          <ImgCell img={g(1)} h={h1} />
        </div>
      );

    /* ══ 3 imagens ══ */
    case "3-col": // A / B / C
      return (
        <div className="flex flex-col gap-1">
          <ImgCell img={g(0)} h={h1} />
          <ImgCell img={g(1)} h={h1} />
          <ImgCell img={g(2)} h={h1} />
        </div>
      );
    case "3-row": // A | B | C
      return (
        <div className="grid grid-cols-3 gap-1">
          <ImgCell img={g(0)} h={h1} />
          <ImgCell img={g(1)} h={h1} />
          <ImgCell img={g(2)} h={h1} />
        </div>
      );
    case "3-2cima-1baixo": // [A|B] / [C  ]
      return (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-1">
            <ImgCell img={g(0)} h={hHalf} />
            <ImgCell img={g(1)} h={hHalf} />
          </div>
          <ImgCell img={g(2)} h={hHalf} />
        </div>
      );
    case "3-1cima-2baixo": // [A  ] / [B|C]
      return (
        <div className="flex flex-col gap-1">
          <ImgCell img={g(0)} h={hHalf} />
          <div className="grid grid-cols-2 gap-1">
            <ImgCell img={g(1)} h={hHalf} />
            <ImgCell img={g(2)} h={hHalf} />
          </div>
        </div>
      );
    case "3-2esq-1dir": // [A][C]  A e B empilhados, C altura total
      return (
        <div className="grid grid-cols-2 gap-1">
          <div className="flex flex-col gap-1">
            <ImgCell img={g(0)} h={hHalf} />
            <ImgCell img={g(1)} h={hHalf} />
          </div>
          <ImgCell img={g(2)} h={h2} />
        </div>
      );
    case "3-1esq-2dir": // [A][B]  A altura total, B e C empilhados
                        //    [C]
      return (
        <div className="grid grid-cols-2 gap-1">
          <ImgCell img={g(0)} h={h2} />
          <div className="flex flex-col gap-1">
            <ImgCell img={g(1)} h={hHalf} />
            <ImgCell img={g(2)} h={hHalf} />
          </div>
        </div>
      );

    /* ══ 4 imagens ══ */
    case "4-2x2": // [A|B] / [C|D]
      return (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-1">
            <ImgCell img={g(0)} h={hHalf} />
            <ImgCell img={g(1)} h={hHalf} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <ImgCell img={g(2)} h={hHalf} />
            <ImgCell img={g(3)} h={hHalf} />
          </div>
        </div>
      );
    case "4-col": // A / B / C / D
      return (
        <div className="flex flex-col gap-1">
          <ImgCell img={g(0)} h={h1} />
          <ImgCell img={g(1)} h={h1} />
          <ImgCell img={g(2)} h={h1} />
          <ImgCell img={g(3)} h={h1} />
        </div>
      );
    case "4-row": // A | B | C | D
      return (
        <div className="grid grid-cols-4 gap-1">
          <ImgCell img={g(0)} h={h1} />
          <ImgCell img={g(1)} h={h1} />
          <ImgCell img={g(2)} h={h1} />
          <ImgCell img={g(3)} h={h1} />
        </div>
      );
    case "4-1cima-3baixo": // [   A   ] / [B | C | D]
      return (
        <div className="flex flex-col gap-1">
          <ImgCell img={g(0)} h={hHalf} />
          <div className="grid grid-cols-3 gap-1">
            <ImgCell img={g(1)} h={hHalf} />
            <ImgCell img={g(2)} h={hHalf} />
            <ImgCell img={g(3)} h={hHalf} />
          </div>
        </div>
      );
    case "4-3cima-1baixo": // [A | B | C] / [   D   ]
      return (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-3 gap-1">
            <ImgCell img={g(0)} h={hHalf} />
            <ImgCell img={g(1)} h={hHalf} />
            <ImgCell img={g(2)} h={hHalf} />
          </div>
          <ImgCell img={g(3)} h={hHalf} />
        </div>
      );
    case "4-1esq-3dir": // [A][B] A altura total, B C D empilhados
                        //    [C]
                        //    [D]
      return (
        <div className="grid grid-cols-2 gap-1">
          <ImgCell img={g(0)} h={h3} />
          <div className="flex flex-col gap-1">
            <ImgCell img={g(1)} h={h1} />
            <ImgCell img={g(2)} h={h1} />
            <ImgCell img={g(3)} h={h1} />
          </div>
        </div>
      );
    case "4-3esq-1dir": // [A][D]  A B C empilhados, D altura total
                        // [B]
                        // [C]
      return (
        <div className="grid grid-cols-2 gap-1">
          <div className="flex flex-col gap-1">
            <ImgCell img={g(0)} h={h1} />
            <ImgCell img={g(1)} h={h1} />
            <ImgCell img={g(2)} h={h1} />
          </div>
          <ImgCell img={g(3)} h={h3} />
        </div>
      );

    default:
      return (
        <div className="flex flex-col gap-1">
          {imgs.map((img, i) => <ImgCell key={i} img={img} h={h1} />)}
        </div>
      );
  }
};

/* ─── Altura total do bloco split por layout ─── */
const totalHeightForLayout = (layout: string, baseH: number): number => {
  const h1 = baseH;
  const h2 = baseH * 2 + 4;
  const h3 = baseH * 3 + 8;
  const h4 = baseH * 4 + 12;

  if (["1-full", "2-row", "3-row", "4-row"].includes(layout)) return h1;
  if (["2-col", "3-2cima-1baixo", "3-1cima-2baixo", "3-2esq-1dir", "3-1esq-2dir",
       "4-2x2", "4-1cima-3baixo", "4-3cima-1baixo"].includes(layout)) return h2;
  if (["3-col", "4-1esq-3dir", "4-3esq-1dir"].includes(layout)) return h3;
  if (["4-col"].includes(layout)) return h4;
  return h1;
};

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

  const splitLeftBanners = useMemo(
    () => slotBanners.filter((b: any) => b.format === "split" && b.split_side === "left"),
    [slotBanners],
  );
  const splitRightBanners = useMemo(
    () => slotBanners.filter((b: any) => b.format === "split" && b.split_side === "right"),
    [slotBanners],
  );

  const splitLeftLayout  = (splitLeftBanners[0] as any)?.split_layout  || "1-full";
  const splitRightLayout = (splitRightBanners[0] as any)?.split_layout || "1-full";

  const splitLeftImages = useMemo<SplitImage[]>(
    () => splitLeftBanners.flatMap((b: any) =>
      [b.image_url, ...(b.extra_images || [])].filter(Boolean).map((url: string) => ({
        url, cta_link: b.cta_link || "#", title: b.title || null, text_position: b.text_position,
      }))
    ), [splitLeftBanners],
  );
  const splitRightImages = useMemo<SplitImage[]>(
    () => splitRightBanners.flatMap((b: any) =>
      [b.image_url, ...(b.extra_images || [])].filter(Boolean).map((url: string) => ({
        url, cta_link: b.cta_link || "#", title: b.title || null, text_position: b.text_position,
      }))
    ), [splitRightBanners],
  );

  const banner = useMemo(
    () => slotBanners.find((b: any) => !b.split_side),
    [slotBanners],
  );

  const images = useMemo(
    () => banner ? [banner.image_url, ...(banner.extra_images || [])].filter(Boolean) : [],
    [banner],
  );

  const [currentImage, setCurrentImage] = useState(0);
  useEffect(() => { setCurrentImage(0); }, [banner?.id]);
  useEffect(() => {
    if (!banner || !["hero", "hero-full"].includes(banner.format) || images.length <= 1) return;
    const t = window.setInterval(() => setCurrentImage((v) => (v + 1) % images.length), 5000);
    return () => window.clearInterval(t);
  }, [banner, images.length]);

  const sectionCls =
    sidebar || compact ? "w-full"
    : device === "mobile" ? "container mx-auto px-3 pt-3"
    : "w-full pt-3";

  /* ── SPLIT ── */
  const isSplitSlot = splitLeftBanners.length > 0 || splitRightBanners.length > 0;

  if (isSplitSlot) {
    if (splitLeftImages.length === 0 && splitRightImages.length === 0) return null;

    // baseH: altura de 1 linha
    const baseH = sidebar ? 160 : compact ? 120 : 200;

    const leftH  = totalHeightForLayout(splitLeftLayout,  baseH);
    const rightH = totalHeightForLayout(splitRightLayout, baseH);
    // o container usa a altura do lado mais alto
    const containerH = Math.max(leftH, rightH);

    const hasBoth = splitLeftImages.length > 0 && splitRightImages.length > 0;

    return (
      <section className={sectionCls}>
        {hasBoth ? (
          <div className="flex gap-1 w-full" style={{ height: containerH }}>
            <div className="flex-1 min-w-0">
              {renderSide(splitLeftImages,  splitLeftLayout,  baseH)}
            </div>
            <div className="flex-1 min-w-0">
              {renderSide(splitRightImages, splitRightLayout, baseH)}
            </div>
          </div>
        ) : (
          <div className="w-full">
            {renderSide(splitLeftImages,  splitLeftLayout,  baseH)}
            {renderSide(splitRightImages, splitRightLayout, baseH)}
          </div>
        )}
      </section>
    );
  }

  if (!banner) return null;

  const image   = images[currentImage] || images[0];
  const href    = banner.cta_link || "#";
  const linkFor = (i: number) => banner.extra_links?.[i] || banner.cta_link || "#";
  const pos     = getPos(banner.text_position);
  const hasText = !!(banner.title || banner.subtitle || banner.cta_text);

  const heroH = sidebar ? "min-h-[320px]" : compact ? "min-h-[140px] sm:min-h-[180px]" : "min-h-[200px] sm:min-h-[280px] md:min-h-[340px]";
  const heroFullH = sidebar ? "min-h-[400px]" : compact ? "min-h-[160px] sm:min-h-[200px]" : "min-h-[260px] sm:min-h-[320px] md:min-h-[380px]";

  const withCategoryProducts = (children: React.ReactNode) => (
    <>{children}{banner.category_id && <BannerCategoryProducts categoryId={banner.category_id} />}</>
  );

  if (banner.format === "hero" || banner.format === "hero-full") {
    const h = banner.format === "hero-full" ? heroFullH : heroH;
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className="block rounded-card overflow-hidden border border-border">
          <div className={`relative ${h}`}>
            <img src={image} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" />
            {hasText && <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />}
            {hasText && (
              <div className={`relative flex h-full flex-col p-5 sm:p-8 ${pos.wrapper} ${h}`}>
                <div className={`max-w-[72%] space-y-1.5 ${pos.align}`}>
                  {banner.subtitle && <p className="text-xs font-bold text-white/80 drop-shadow-md">{banner.subtitle}</p>}
                  {banner.title && <h2 className={`font-black leading-tight text-white whitespace-pre-line drop-shadow-lg ${compact ? "text-sm sm:text-base" : "text-xl sm:text-3xl"}`}>{banner.title}</h2>}
                  {banner.cta_text && <span className="inline-block pt-1 text-sm font-semibold text-white drop-shadow-md">{banner.cta_text}</span>}
                </div>
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                {images.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentImage ? "bg-white" : "bg-white/35"}`} />)}
              </div>
            )}
          </div>
        </a>
      </section>,
    );
  }

  if (banner.format === "wide" || banner.format === "wide-slim") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <div className={banner.format === "wide-slim" ? "aspect-[4/1]" : compact ? "aspect-[3/1]" : "aspect-[21/9] sm:aspect-[16/6] md:aspect-[16/5]"}>
            <img src={image} alt={banner.title || "Banner"} className="h-full w-full object-cover" loading="lazy" />
          </div>
        </a>
        {!compact && <p className="mt-0.5 text-right text-[9px] text-muted-foreground">Publicidade</p>}
      </section>,
    );
  }

  if (banner.format === "duo-square") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((i) => (
            <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[i] || images[0]} alt={banner.title || "Banner"} className="aspect-square sm:aspect-[5/4] w-full object-cover" loading="lazy" />
              {i === 0 && banner.title && (<>
                <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                  <h3 className={`text-xs sm:text-sm font-bold text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>
                  {banner.cta_text && <span className={`text-[10px] font-semibold text-white/90 drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                </div>
              </>)}
            </a>
          ))}
        </div>
      </section>,
    );
  }

  if (banner.format === "trio-banner") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
              <img src={images[i] || images[0]} alt={banner.title || "Banner"} className="aspect-[4/3] sm:aspect-[5/4] w-full object-cover" loading="lazy" />
              {i === 0 && banner.title && (<>
                <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                <div className={`absolute inset-0 flex flex-col p-2 ${pos.wrapper}`}>
                  <h3 className={`text-[10px] sm:text-xs font-bold text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>
                </div>
              </>)}
            </a>
          ))}
        </div>
      </section>,
    );
  }

  if (banner.format === "mosaic") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <div className="grid grid-cols-2 gap-2.5" style={{ minHeight: 280 }}>
          <a href={linkFor(0)} className="relative row-span-2 block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
            <div className="relative h-full min-h-[280px] md:min-h-[340px]">
              <img src={images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              {(banner.title || banner.cta_text) && (<>
                <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                  {banner.title && <h3 className={`text-sm font-bold leading-tight text-white drop-shadow-lg ${pos.align}`}>{banner.title}</h3>}
                  {banner.cta_text && <span className={`text-[11px] font-semibold text-white/90 drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                </div>
              </>)}
            </div>
          </a>
          <div className="flex flex-col gap-2.5">
            {[1, 2].map((i) => (
              <a key={i} href={linkFor(i)} className="relative block flex-1 overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
                <div className="relative h-full min-h-[130px] md:min-h-[165px]">
                  <img src={images[i] || images[0]} alt={banner.title || "Banner"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>,
    );
  }

  if (banner.format === "promo") {
    return withCategoryProducts(
      <section className={sectionCls}>
        {images.length >= 4 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {images.slice(0, 4).map((item, i) => (
              <a key={i} href={linkFor(i)} className="relative block overflow-hidden rounded-card border border-border" style={{ minHeight: compact ? 120 : 180 }}>
                <img src={item} alt={banner.title || `Banner ${i+1}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                {i === 0 && hasText && (<>
                  <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
                  <div className={`absolute inset-0 flex flex-col p-3 ${pos.wrapper}`}>
                    {banner.title && <h3 className={`text-xs font-bold leading-tight text-white drop-shadow-lg sm:text-sm ${pos.align}`}>{banner.title}</h3>}
                    {banner.subtitle && <p className={`text-[10px] text-white/80 drop-shadow-md ${pos.align}`}>{banner.subtitle}</p>}
                    {banner.cta_text && <span className={`mt-0.5 text-[10px] font-semibold text-white drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
                  </div>
                </>)}
              </a>
            ))}
          </div>
        ) : (
          <a href={href} className="relative block overflow-hidden rounded-card border border-border" style={{ minHeight: compact ? 140 : 220 }}>
            <img src={image} alt={banner.title || "Banner promocional"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            {hasText && (<>
              <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
              <div className={`absolute inset-0 flex flex-col p-4 ${pos.wrapper}`}>
                {banner.title && <h3 className={`text-sm font-bold leading-tight text-white drop-shadow-lg sm:text-lg ${pos.align}`}>{banner.title}</h3>}
                {banner.subtitle && <p className={`text-[10px] text-white/80 drop-shadow-md ${pos.align}`}>{banner.subtitle}</p>}
                {banner.cta_text && <span className={`mt-0.5 text-[10px] font-semibold text-white drop-shadow-md ${pos.align}`}>{banner.cta_text}</span>}
              </div>
            </>)}
          </a>
        )}
      </section>,
    );
  }

  if (banner.format === "square" || banner.format === "square-rounded") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className={`block overflow-hidden border border-border transition-shadow hover:shadow-md ${banner.format === "square-rounded" ? "mx-auto max-w-[220px] rounded-full" : "rounded-card"}`}>
          <img src={image} alt={banner.title || "Banner"} className="aspect-square w-full object-cover" loading="lazy" />
        </a>
      </section>,
    );
  }

  if (banner.format === "vertical" || banner.format === "story-card") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className={`block overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-md ${sidebar ? "w-full" : "mx-auto max-w-[220px]"}`}>
          <img src={image} alt={banner.title || "Banner"} className="aspect-[9/16] w-full object-cover" loading="lazy" />
          {banner.title && <div className="p-2 text-center"><p className="truncate text-[10px] font-bold text-foreground">{banner.title}</p></div>}
        </a>
      </section>,
    );
  }

  if (banner.format === "tall" || banner.format === "natural") {
    return withCategoryProducts(
      <section className={sectionCls}>
        <a href={href} className="relative block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
          <img src={image} alt={banner.title || "Banner"} className="w-full h-auto object-contain" loading="lazy" />
          {banner.title && (<>
            <div className={`absolute inset-0 ${gradientDir(banner.text_position)}`} />
            <div className={`absolute inset-0 flex flex-col p-4 ${pos.wrapper}`}>
              <div className={`max-w-[80%] space-y-1 ${pos.align}`}>
                {banner.subtitle && <p className="text-xs font-bold text-white/90 drop-shadow-md">{banner.subtitle}</p>}
                <h3 className="text-sm sm:text-lg font-black text-white drop-shadow-lg">{banner.title}</h3>
                {banner.cta_text && <span className="text-[11px] font-semibold text-white drop-shadow-md">{banner.cta_text}</span>}
              </div>
            </div>
          </>)}
        </a>
      </section>,
    );
  }

  return withCategoryProducts(
    <section className={sectionCls}>
      <a href={href} className="block overflow-hidden rounded-card border border-border transition-shadow hover:shadow-md">
        <img src={image} alt={banner.title || "Banner"}
          className={compact ? "aspect-[3/1] w-full object-cover" : "aspect-[21/9] sm:aspect-[16/6] md:aspect-[16/5] w-full object-cover"}
          loading="lazy" />
      </a>
    </section>,
  );
};

export default HomeBannerSlot;g
