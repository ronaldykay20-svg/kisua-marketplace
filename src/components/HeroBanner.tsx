import heroImg from "@/assets/hero-luanda.jpg";

const banners = [
  { title: "Mega Promoções", subtitle: "Até 70% de desconto em electrónicos", cta: "Ver ofertas", bg: "var(--blue-gradient)" },
];

const HeroBanner = () => {
  return (
    <section className="container mx-auto px-4 pt-4">
      <div className="relative rounded-card overflow-hidden" style={{ background: banners[0].bg }}>
        <div className="flex flex-col sm:flex-row items-center">
          <div className="flex-1 p-6 sm:p-10">
            <p className="text-primary-foreground/70 text-sm font-semibold mb-1">Kwanza Market</p>
            <h1 className="text-2xl sm:text-4xl font-black text-primary-foreground leading-tight mb-2">
              {banners[0].title}
            </h1>
            <p className="text-primary-foreground/80 text-sm sm:text-base mb-5">{banners[0].subtitle}</p>
            <button className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-card font-bold text-sm hover:brightness-110 transition">
              {banners[0].cta}
            </button>
          </div>
          <div className="w-full sm:w-2/5 h-40 sm:h-56">
            <img src={heroImg} alt="Banner" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
