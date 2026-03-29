import ProductCard, { type Product } from "./ProductCard";
import { TrendingDown } from "lucide-react";

const lowPriceProducts: Product[] = [
  { id: 20, title: "Capa iPhone 15 Silicone", price: "2.500 Kz", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop", rating: 4, reviews: 890 },
  { id: 21, title: "Fones Bluetooth TWS", price: "5.000 Kz", image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop", rating: 3, reviews: 1230 },
  { id: 22, title: "Relógio Digital LED", price: "3.500 Kz", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop", rating: 4, reviews: 567 },
  { id: 23, title: "Carregador USB-C Rápido", price: "4.000 Kz", image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop", rating: 4, reviews: 345 },
  { id: 24, title: "Mouse Sem Fio Ergonómico", price: "6.000 Kz", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop", rating: 4, reviews: 678 },
  { id: 25, title: "Hub USB 4 Portas", price: "3.000 Kz", image: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop", rating: 3, reviews: 234 },
  { id: 26, title: "Película Vidro Temperado", price: "1.500 Kz", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop", rating: 4, reviews: 1560 },
  { id: 27, title: "Cabo HDMI 2m 4K", price: "2.000 Kz", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", rating: 5, reviews: 432 },
];

const LowPriceSection = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center bg-walmart-orange">
            <TrendingDown className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Preços Baixos</h2>
        </div>
        <a href="#" className="text-xs font-semibold text-primary">Ver todos →</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {lowPriceProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};

export default LowPriceSection;
