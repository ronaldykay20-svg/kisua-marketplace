import ProductCard, { type Product } from "./ProductCard";
import { Truck } from "lucide-react";

const freeShippingProducts: Product[] = [
  { id: 10, title: "Máquina de Lavar Roupa 8kg Samsung", price: "180.000 Kz", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop", rating: 4, reviews: 87, freeShipping: true },
  { id: 11, title: "Ar Condicionado Split 12000BTU", price: "250.000 Kz", image: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&h=400&fit=crop", rating: 5, reviews: 143, freeShipping: true },
  { id: 12, title: "Frigorífico Americano LG 500L", price: "420.000 Kz", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop", rating: 4, reviews: 56, freeShipping: true },
  { id: 13, title: "Fogão de 5 Bocas Inox", price: "95.000 Kz", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop", rating: 5, reviews: 201, freeShipping: true },
  { id: 14, title: "Micro-ondas Digital 30L", price: "45.000 Kz", image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&h=400&fit=crop", rating: 4, reviews: 78, freeShipping: true },
  { id: 15, title: "Aspirador Robot Automático", price: "120.000 Kz", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", rating: 5, reviews: 165, freeShipping: true },
];

const FreeShippingSection = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center bg-walmart-green">
            <Truck className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Frete Grátis</h2>
        </div>
        <a href="#" className="text-xs font-semibold text-primary">Ver todos →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {freeShippingProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export default FreeShippingSection;
