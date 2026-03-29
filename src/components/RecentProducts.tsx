import ProductCard from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";
import { allProducts } from "@/data/products";

const RecentProducts = () => {
  const products = allProducts.filter(p => [30,31,32,33,34,35,36,37,38,39].includes(p.id));
  return (
    <SectionCard
      title="Publicados recentemente"
      subtitle="Os mais novos no mercado"
      bg="bg-sky-50"
    >
      <ProductCarousel>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </ProductCarousel>
    </SectionCard>
  );
};

export default RecentProducts;
