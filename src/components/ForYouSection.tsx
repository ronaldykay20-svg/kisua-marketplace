import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { Sparkles } from "lucide-react";
import { allProducts } from "@/data/products";

const ForYouSection = () => {
  const products = allProducts.filter(p => [50,51,52,53,54,55,56,57,58,59].includes(p.id));
  return (
    <SectionCard
      title="Para si"
      subtitle="Escolhidos especialmente para si"
      bg="bg-violet-50"
      icon={<div className="w-7 h-7 rounded-card flex items-center justify-center" style={{ background: "var(--blue-gradient)" }}><Sparkles className="w-4 h-4 text-primary-foreground" /></div>}
    >
      <ProductCarousel>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </ProductCarousel>
    </SectionCard>
  );
};

export default ForYouSection;
