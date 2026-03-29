import ProductCard, { type Product } from "./ProductCard";

const recentProducts: Product[] = [
  { id: 30, title: "Toyota Hilux 2022 Dupla Cabine", price: "18.500.000 Kz", image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&h=400&fit=crop", rating: 5, reviews: 12, badge: "NOVO" },
  { id: 31, title: "Apartamento T3 Talatona", price: "45.000.000 Kz", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop", rating: 4, reviews: 8, freeShipping: false },
  { id: 32, title: "MacBook Pro M3 14\" 512GB", price: "1.200.000 Kz", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop", rating: 5, reviews: 45, freeShipping: true },
  { id: 33, title: "Terreno 500m² Viana", price: "8.000.000 Kz", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=400&fit=crop", rating: 4, reviews: 3 },
  { id: 34, title: "Sofá Modular 5 Lugares Cinza", price: "320.000 Kz", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop", rating: 4, reviews: 23, freeShipping: true },
  { id: 35, title: "Gerador Eléctrico 5000W", price: "450.000 Kz", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop", rating: 5, reviews: 67, freeShipping: true },
  { id: 36, title: "Bicicleta Mountain Bike 29\"", price: "85.000 Kz", image: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=400&fit=crop", rating: 4, reviews: 34, badge: "NOVO" },
  { id: 37, title: "Mesa de Jantar 6 Lugares", price: "150.000 Kz", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&h=400&fit=crop", rating: 5, reviews: 19, freeShipping: true },
  { id: 38, title: "Conjunto Treino Nike", price: "25.000 Kz", image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop", rating: 4, reviews: 156 },
  { id: 39, title: "Panela Eléctrica Multifunções", price: "18.000 Kz", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop", rating: 5, reviews: 89, freeShipping: true },
  { id: 40, title: "Drone DJI Mini 3", price: "380.000 Kz", image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=400&fit=crop", rating: 5, reviews: 42 },
  { id: 41, title: "Perfume Hugo Boss 100ml", price: "35.000 Kz", image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop", rating: 4, reviews: 210, freeShipping: true },
];

const RecentProducts = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Publicados Recentemente</h2>
        <a href="#" className="text-xs font-semibold text-primary">Ver todos →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {recentProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export default RecentProducts;
