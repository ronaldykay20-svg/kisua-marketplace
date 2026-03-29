import adBanner1 from "@/assets/ad-banner-1.jpg";
import adBanner2 from "@/assets/ad-banner-2.jpg";
import adSquare1 from "@/assets/ad-square-1.jpg";
import adSquare2 from "@/assets/ad-square-2.jpg";

interface AdBannerProps {
  variant: "wide-1" | "wide-2" | "double";
}

const AdBanner = ({ variant }: AdBannerProps) => {
  if (variant === "double") {
    return (
      <section className="container mx-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <a href="#" className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
            <img src={adSquare1} alt="Publicidade" className="w-full aspect-square object-cover" loading="lazy" />
          </a>
          <a href="#" className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
            <img src={adSquare2} alt="Publicidade" className="w-full aspect-square object-cover" loading="lazy" />
          </a>
        </div>
        <p className="text-[9px] text-muted-foreground text-right mt-1">Publicidade</p>
      </section>
    );
  }

  const img = variant === "wide-1" ? adBanner1 : adBanner2;

  return (
    <section className="container mx-auto px-3 pt-3">
      <a href="#" className="block rounded-card overflow-hidden border border-border hover:shadow-md transition-shadow">
        <img src={img} alt="Publicidade" className="w-full aspect-[21/9] object-cover" loading="lazy" />
      </a>
      <p className="text-[9px] text-muted-foreground text-right mt-1">Publicidade</p>
    </section>
  );
};

export default AdBanner;
