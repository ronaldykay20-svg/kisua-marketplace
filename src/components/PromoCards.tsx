import promoCard1 from "@/assets/promo-card-1.jpg";
import promoCard2 from "@/assets/promo-card-2.jpg";
import promoCard3 from "@/assets/promo-card-3.jpg";
import promoCard4 from "@/assets/promo-card-4.jpg";

const cards = [
  { title: "Moda Angolana", subtitle: "Novos estilos", cta: "Compre agora", image: promoCard1, bg: "bg-pink-50" },
  { title: "Cozinha & Casa", subtitle: "Até 40% de desconto", cta: "Compre agora", image: promoCard2, bg: "bg-yellow-50" },
  { title: "Até 65% de desconto", subtitle: "Desporto & Fitness", cta: "Compre agora", image: promoCard3, bg: "bg-green-50" },
  { title: "Peças & Acessórios", subtitle: "Auto e motas", cta: "Compre agora", image: promoCard4, bg: "bg-gray-50" },
];

const PromoCards = () => {
  return (
    <section className="container mx-auto px-3 pt-3">
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <div key={card.title} className={`${card.bg} rounded-card overflow-hidden cursor-pointer group`}>
            <div className="p-3 pb-0">
              <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">{card.title}</h3>
              <p className="text-[10px] text-muted-foreground">{card.subtitle}</p>
              <a href="#" className="text-[10px] font-semibold text-primary hover:underline">{card.cta}</a>
            </div>
            <div className="aspect-[4/3] mt-2 overflow-hidden">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PromoCards;
