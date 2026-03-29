import { useState, useEffect } from "react";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";

const slides = [
  {
    image: banner1,
    subtitle: "Marcas exclusivas",
    title: "Electrónicos com\naté 50% de desconto",
    cta: "Compre agora",
    bg: "from-sky-100 to-sky-50",
  },
  {
    image: banner2,
    subtitle: "Tendência da semana",
    title: "Renove a sua casa\ncom estilo",
    cta: "Compre agora",
    bg: "from-amber-100 to-amber-50",
  },
];

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [playing]);

  const slide = slides[current];

  return (
    <section className="container mx-auto px-3 pt-3">
      <div className={`relative rounded-card overflow-hidden bg-gradient-to-r ${slide.bg}`}>
        <div className="flex items-stretch min-h-[200px] sm:min-h-[280px]">
          {/* Text side */}
          <div className="flex-1 p-5 sm:p-8 flex flex-col justify-center">
            <p className="text-xs font-bold text-foreground/60 mb-1">{slide.subtitle}</p>
            <h2 className="text-xl sm:text-3xl font-black text-foreground leading-tight whitespace-pre-line mb-3">
              {slide.title}
            </h2>
            <a href="#" className="text-sm font-semibold text-primary hover:underline">{slide.cta}</a>
          </div>
          {/* Image side */}
          <div className="w-2/5 sm:w-1/2 relative">
            <img src={slide.image} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-foreground" : "bg-foreground/30"}`} />
            ))}
          </div>
          <button
            onClick={() => setPlaying(!playing)}
            className="w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"
          >
            {playing ? <Pause className="w-3.5 h-3.5 text-foreground" /> : <Play className="w-3.5 h-3.5 text-foreground" />}
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
