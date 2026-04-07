import { X } from "lucide-react";

interface BannerPreviewProps {
  format: string;
  images: string[];
  title: string;
  subtitle: string;
  ctaText: string;
  bgColor: string;
}

const formatConfigs: Record<string, { label: string; aspect: string; previewClass: string }> = {
  hero: { label: "Hero", aspect: "aspect-[21/9]", previewClass: "min-h-[180px]" },
  "hero-full": { label: "Hero Full", aspect: "aspect-[16/9]", previewClass: "min-h-[200px]" },
  wide: { label: "Wide", aspect: "aspect-[21/9]", previewClass: "min-h-[100px]" },
  "wide-slim": { label: "Wide Slim", aspect: "aspect-[4/1]", previewClass: "min-h-[80px]" },
  square: { label: "Square", aspect: "aspect-square", previewClass: "max-w-[200px]" },
  "square-rounded": { label: "Square Round", aspect: "aspect-square rounded-full overflow-hidden", previewClass: "max-w-[180px]" },
  promo: { label: "Promo Card", aspect: "aspect-[4/3]", previewClass: "max-w-[220px]" },
  vertical: { label: "Vertical", aspect: "aspect-[9/16]", previewClass: "max-w-[160px]" },
  "story-card": { label: "Story", aspect: "aspect-[9/16]", previewClass: "max-w-[140px]" },
  "duo-square": { label: "Duo Square", aspect: "aspect-square", previewClass: "" },
  "trio-banner": { label: "Trio", aspect: "aspect-[4/3]", previewClass: "" },
  "mosaic": { label: "Mosaico", aspect: "aspect-[4/3]", previewClass: "" },
};

export const formats = Object.entries(formatConfigs).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  aspect: cfg.aspect,
  previewClass: cfg.previewClass,
}));

const BannerPreview = ({ format, images, title, subtitle, ctaText, bgColor }: BannerPreviewProps) => {
  if (images.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-xs">
        Adicione imagens para ver o preview
      </div>
    );
  }

  // Hero preview — mimics HeroBanner layout
  if (format === "hero" || format === "hero-full") {
    return (
      <div className="rounded-card overflow-hidden border border-border" style={{ backgroundColor: bgColor }}>
        <div className={`flex items-stretch ${format === "hero-full" ? "min-h-[200px]" : "min-h-[160px]"}`}>
          <div className="flex-1 p-4 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-foreground/60 mb-0.5">{subtitle || "Subtítulo"}</p>
            <h2 className="text-sm font-black text-foreground leading-tight whitespace-pre-line mb-2">{title || "Título do Banner"}</h2>
            <span className="text-[10px] font-semibold text-primary">{ctaText || "Compre agora"}</span>
          </div>
          <div className="w-2/5 relative">
            <img src={images[0]} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex gap-1 justify-center py-1.5">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-foreground" : "bg-foreground/30"}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Wide preview
  if (format === "wide" || format === "wide-slim") {
    return (
      <div className="space-y-1">
        <div className={`rounded-card overflow-hidden border border-border ${format === "wide-slim" ? "aspect-[4/1]" : "aspect-[21/9]"}`}>
          <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <p className="text-[9px] text-muted-foreground text-right">Publicidade</p>
      </div>
    );
  }

  // Duo square
  if (format === "duo-square") {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map(i => (
            <div key={i} className="rounded-card overflow-hidden border border-border aspect-square">
              <img src={images[i] || images[0]} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-right">Publicidade</p>
      </div>
    );
  }

  // Trio
  if (format === "trio-banner") {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-card overflow-hidden border border-border aspect-[4/3]">
            <img src={images[i] || images[0]} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Mosaic — 1 big + 2 small
  if (format === "mosaic") {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <div className="row-span-2 rounded-card overflow-hidden border border-border aspect-square">
          <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="rounded-card overflow-hidden border border-border aspect-[4/3]">
            <img src={images[i] || images[0]} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // Promo card preview
  if (format === "promo") {
    if (images.length >= 4) {
      return (
        <div className="grid grid-cols-2 gap-2">
          {images.slice(0, 4).map((image, index) => (
            <div key={index} className="rounded-card overflow-hidden border border-border aspect-[4/3]">
              <img src={image} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="max-w-[220px] rounded-card overflow-hidden border border-border" style={{ backgroundColor: bgColor }}>
        <div className="p-3 pb-0">
          <h3 className="text-xs font-bold text-foreground leading-tight">{title || "Título"}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle || "Subtítulo"}</p>
          <span className="text-[10px] font-semibold text-primary">{ctaText || "Compre agora"}</span>
        </div>
        <div className="aspect-[4/3] mt-2 overflow-hidden">
          <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  // Square / square-rounded
  if (format === "square" || format === "square-rounded") {
    return (
      <div className={`max-w-[180px] ${format === "square-rounded" ? "rounded-full" : "rounded-card"} overflow-hidden border border-border`}>
        <img src={images[0]} alt="Preview" className="w-full aspect-square object-cover" />
      </div>
    );
  }

  // Vertical / story
  if (format === "vertical" || format === "story-card") {
    return (
      <div className={`max-w-[140px] rounded-card overflow-hidden border border-border ${format === "story-card" ? "rounded-2xl" : ""}`}>
        <img src={images[0]} alt="Preview" className="w-full aspect-[9/16] object-cover" />
        {title && (
          <div className="p-2 text-center">
            <p className="text-[10px] font-bold text-foreground truncate">{title}</p>
          </div>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="rounded-card overflow-hidden border border-border aspect-[21/9]">
      <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
    </div>
  );
};

export default BannerPreview;
