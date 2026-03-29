import ProductCard, { type Product } from "./ProductCard";
import { Sparkles } from "lucide-react";

const forYouProducts: Product[] = [
  { id: 50, title: "Tênis Nike Air Max 90", price: "45.000 Kz", oldPrice: "65.000 Kz", discount: "-31%", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", rating: 5, reviews: 890, freeShipping: true },
  { id: 51, title: "Smartwatch Samsung Galaxy Watch", price: "95.000 Kz", image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop", rating: 4, reviews: 342, freeShipping: true },
  { id: 52, title: "Mochila Laptop 15.6\" Impermeável", price: "12.000 Kz", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", rating: 4, reviews: 567 },
  { id: 53, title: "Óculos de Sol Ray-Ban Aviator", price: "28.000 Kz", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop", rating: 5, reviews: 234, freeShipping: true },
  { id: 54, title: "Colunas Bluetooth JBL Charge 5", price: "65.000 Kz", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop", rating: 5, reviews: 678, freeShipping: true, badge: "HOT" },
  { id: 55, title: "Cadeira Gaming Ergonómica", price: "85.000 Kz", image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=400&fit=crop", rating: 4, reviews: 123, freeShipping: true },
  { id: 56, title: "Kit Churrasco Inox 12 Peças", price: "15.000 Kz", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop", rating: 4, reviews: 89 },
  { id: 57, title: "Impressora HP Multifuncional WiFi", price: "45.000 Kz", image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=400&fit=crop", rating: 4, reviews: 201, freeShipping: true },
];

const ForYouSection = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center" style={{ background: "var(--blue-gradient)" }}>
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Para Si</h2>
        </div>
        <a href="#" className="text-xs font-semibold text-primary">Ver mais →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {forYouProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export default ForYouSection;
