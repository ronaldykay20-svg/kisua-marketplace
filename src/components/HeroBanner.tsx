import { useState, useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";
import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";

const fallbackSlides = [
  { image: banner1, subtitle: "Marcas exclusivas", title: "Electrónicos com\naté 50% de desconto", cta: "Compre agora", bg: "#E0F2FE" },
  { image: banner2, subtitle: "Tendência da semana", title: "Renove a sua casa\ncom estilo", cta: "Compre agora", bg: "#FEF3C7" },
];

const HeroBanner = () => {
  const { data: dbBanners = [] } = useBanners("hero");
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  const slides = dbBanners.length > 0
    ? dbBanners.map(b => ({ image: b.image_url, subtitle: b.subtitle, title: b.title, cta: b.cta_text, bg: b.bg_color }))
    : fallbackSlides;

  useEffect(() => {
    if (!playing || slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [playing, slides.length]);

  useEffect(() => { if (current >= slides.length) setCurrent(0); }, [slides.length]);

  const slide = slides[current] || slides[0];

  return (
    <section className="container mx-auto px-3 pt-3">
      <div className="relative rounded-card overflow-hidden" style={{ backgroundColor: slide.bg }}>
        {/* Full-cover background image */}
        <img src={slide.image} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="relative flex items-stretch min-h-[220px] sm:min-h-[300px]">
          <div className="flex-1 p-5 sm:p-8 flex flex-col justify-center max-w-[60%]">
            <p className="text-xs font-bold text-white/70 mb-1">{slide.subtitle}</p>
            <h2 className="text-xl sm:text-3xl font-black text-white leading-tight whitespace-pre-line mb-3">{slide.title}</h2>
            <a href="#" className="text-sm font-semibold text-white hover:underline">{slide.cta}</a>
          </div>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-foreground" : "bg-foreground/30"}`} />
            ))}
          </div>
          <button onClick={() => setPlaying(!playing)} className="w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
            {playing ? <Pause className="w-3.5 h-3.5 text-foreground" /> : <Play className="w-3.5 h-3.5 text-foreground" />}
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
