import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { Truck } from "lucide-react";
import { allProducts } from "@/data/products";

const FreeShippingSection = () => {
  const products = allProducts.filter(p => [10,11,12,13,14,15,16,17].includes(p.id));
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
