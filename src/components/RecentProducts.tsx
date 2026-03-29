import ProductCard, { type Product } from "./ProductCard";
import ProductCarousel from "./ProductCarousel";
import SectionCard from "./SectionCard";

const products: Product[] = [
  { id: 30, title: "Toyota Hilux 2022 Dupla Cabine", price: "18.500.000 Kz", image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=400&fit=crop", rating: 5, reviews: 12, badge: "NOVO" },
  { id: 31, title: "Apartamento T3 Talatona", price: "45.000.000 Kz", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop", rating: 4, reviews: 8 },
  { id: 32, title: "MacBook Pro M3 14\" 512GB", price: "1.200.000 Kz", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop", rating: 5, reviews: 45, freeShipping: true },
  { id: 33, title: "Terreno 500m² Viana", price: "8.000.000 Kz", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=400&fit=crop", rating: 4, reviews: 3 },
  { id: 34, title: "Sofá Modular 5 Lugares Cinza", price: "320.000 Kz", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop", rating: 4, reviews: 23, freeShipping: true },
  { id: 35, title: "Gerador Eléctrico 5000W", price: "450.000 Kz", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop", rating: 5, reviews: 67, freeShipping: true },
  { id: 36, title: "Bicicleta Mountain Bike 29\"", price: "85.000 Kz", image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=400&fit=crop", rating: 4, reviews: 34, badge: "NOVO" },
  { id: 37, title: "Mesa de Jantar 6 Lugares", price: "150.000 Kz", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=400&fit=crop", rating: 5, reviews: 19, freeShipping: true },
  { id: 38, title: "Conjunto Treino Nike", price: "25.000 Kz", image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop", rating: 4, reviews: 156 },
  { id: 39, title: "Drone DJI Mini 3", price: "380.000 Kz", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=400&fit=crop", rating: 5, reviews: 42 },
];

const RecentProducts = () => {
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
