import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { TrendingDown } from "lucide-react";
import { allProducts } from "@/data/products";

const LowPriceSection = () => {
  const products = allProducts.filter(p => [20,21,22,23,24,25,26,27].includes(Number(p.id)));
  return (
    <SectionCard
      title="Preços baixos todos os dias"
      subtitle="Os melhores preços de Angola"
      bg="bg-yellow-50"
      icon={<div className="w-7 h-7 rounded-card flex items-center justify-center bg-walmart-orange"><TrendingDown className="w-4 h-4 text-primary-foreground" /></div>}
    >
      <ProductCarousel>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </ProductCarousel>
    </SectionCard>
  );
};

export default LowPriceSection;
