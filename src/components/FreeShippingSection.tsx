import ProductCard, { type Product } from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { Truck } from "lucide-react";

const products: Product[] = [
  { id: 10, title: "Máquina de Lavar Roupa 8kg Samsung", price: "180.000 Kz", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=400&fit=crop", rating: 4, reviews: 87, freeShipping: true },
  { id: 11, title: "Ar Condicionado Split 12000BTU", price: "250.000 Kz", image: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=400&h=400&fit=crop", rating: 5, reviews: 143, freeShipping: true },
  { id: 12, title: "Frigorífico Americano LG 500L", price: "420.000 Kz", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop", rating: 4, reviews: 56, freeShipping: true },
  { id: 13, title: "Fogão de 5 Bocas Inox", price: "95.000 Kz", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop", rating: 5, reviews: 201, freeShipping: true },
  { id: 14, title: "Micro-ondas Digital 30L", price: "45.000 Kz", image: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400&h=400&fit=crop", rating: 4, reviews: 78, freeShipping: true },
  { id: 15, title: "Aspirador Robot Automático", price: "120.000 Kz", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", rating: 5, reviews: 165, freeShipping: true },
  { id: 16, title: "Máquina de Café Expresso", price: "65.000 Kz", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=400&fit=crop", rating: 4, reviews: 92, freeShipping: true },
  { id: 17, title: "Purificador de Água 4 Etapas", price: "35.000 Kz", image: "https://images.unsplash.com/photo-1564419320461-6eb9c0ffa44c?w=400&h=400&fit=crop", rating: 5, reviews: 134, freeShipping: true },
];

const FreeShippingSection = () => {
  return (
    <SectionCard
      title="Frete grátis"
      subtitle="Entrega sem custos em todo o país"
      bg="bg-green-50"
      icon={<div className="w-7 h-7 rounded-card flex items-center justify-center bg-walmart-green"><Truck className="w-4 h-4 text-primary-foreground" /></div>}
    >
      <ProductCarousel>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </ProductCarousel>
    </SectionCard>
  );
};

export default FreeShippingSection;
