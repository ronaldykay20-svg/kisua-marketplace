import ProductCard, { type Product } from "./ProductCard";
import { Zap } from "lucide-react";

const promoProducts: Product[] = [
  { id: 1, title: "iPhone 15 Pro Max 256GB", price: "520.000 Kz", oldPrice: "650.000 Kz", discount: "-20%", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop", rating: 5, reviews: 234, freeShipping: true, badge: "HOT" },
  { id: 2, title: "Samsung Galaxy S24 Ultra", price: "380.000 Kz", oldPrice: "480.000 Kz", discount: "-21%", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop", rating: 4, reviews: 189, freeShipping: true },
  { id: 3, title: "AirPods Pro 2ª Geração", price: "120.000 Kz", oldPrice: "180.000 Kz", discount: "-33%", image: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop", rating: 5, reviews: 456, freeShipping: false },
  { id: 4, title: "PlayStation 5 Slim", price: "450.000 Kz", oldPrice: "550.000 Kz", discount: "-18%", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop", rating: 5, reviews: 312, freeShipping: true, badge: "HOT" },
  { id: 5, title: "Smart TV Samsung 55\" 4K", price: "280.000 Kz", oldPrice: "380.000 Kz", discount: "-26%", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop", rating: 4, reviews: 98, freeShipping: true },
  { id: 6, title: "Câmera Canon EOS R50", price: "350.000 Kz", oldPrice: "420.000 Kz", discount: "-17%", image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop", rating: 5, reviews: 67, freeShipping: false },
];

const PromoSection = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center" style={{ background: "var(--promo-gradient)" }}>
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Promoções</h2>
        </div>
        <a href="#" className="text-xs font-semibold text-primary">Ver todas →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {promoProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export default PromoSection;
