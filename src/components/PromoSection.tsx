import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { Zap } from "lucide-react";
import { allProducts } from "@/data/products";

const PromoSection = () => {
  const products = allProducts.filter(p => [1,2,3,4,5,6,7,8].includes(Number(p.id)));
  return (
    <SectionCard
      title="Promoções imperdíveis"
      subtitle="Economize em milhares de produtos"
      bg="bg-red-50"
      icon={<div className="w-7 h-7 rounded-card flex items-center justify-center" style={{ background: "var(--promo-gradient)" }}><Zap className="w-4 h-4 text-primary-foreground" /></div>}
    >
      <ProductCarousel>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </ProductCarousel>
    </SectionCard>
  );
};

export default PromoSection;
