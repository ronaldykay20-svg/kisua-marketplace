import { useBanners } from "@/hooks/useBanners";
import promoCard1 from "@/assets/promo-card-1.jpg";
import promoCard2 from "@/assets/promo-card-2.jpg";
import promoCard3 from "@/assets/promo-card-3.jpg";
import promoCard4 from "@/assets/promo-card-4.jpg";

const fallbackCards = [
  { title: "Moda Angolana", subtitle: "Novos estilos", cta: "Compre agora", image: promoCard1, bg: "#FDF2F8" },
  { title: "Cozinha & Casa", subtitle: "Até 40% de desconto", cta: "Compre agora", image: promoCard2, bg: "#FEFCE8" },
  { title: "Até 65% de desconto", subtitle: "Desporto & Fitness", cta: "Compre agora", image: promoCard3, bg: "#F0FDF4" },
  { title: "Peças & Acessórios", subtitle: "Auto e motas", cta: "Compre agora", image: promoCard4, bg: "#F9FAFB" },
];

const PromoCards = () => {
  const { data: dbPromos = [] } = useBanners("promo");

  const cards = dbPromos.length > 0
    ? dbPromos.map(b => ({ title: b.title, subtitle: b.subtitle, cta: b.cta_text, image: b.image_url, bg: b.bg_color }))
    : fallbackCards;
  const hasSinglePromo = cards.length === 1;

  return (
    <section className="container mx-auto px-3 pt-3">
      <div className={`grid gap-2.5 ${hasSinglePromo ? "grid-cols-1" : "grid-cols-2"}`}>
        {cards.map((card) => (
          <div
            key={card.title}
            className={`relative rounded-card overflow-hidden cursor-pointer group ${hasSinglePromo ? "min-h-[240px] sm:min-h-[320px]" : "min-h-[200px] sm:min-h-[260px]"}`}
          >
            <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-3 pt-16">
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">{card.title}</h3>
              <p className="text-[10px] text-white/70">{card.subtitle}</p>
              <a href="#" className="text-[10px] font-semibold text-white hover:underline mt-0.5">{card.cta}</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoCards;
