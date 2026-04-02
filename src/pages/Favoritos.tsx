import { Heart, Star, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { allProducts } from "@/data/products";

const favProducts = allProducts.slice(0, 6);

const Favoritos = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-foreground">Favoritos</h1>
          <span className="text-xs text-muted-foreground">{favProducts.length} itens</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {favProducts.map(p => (
            <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-lg border border-border overflow-hidden text-left group hover:shadow-md transition relative">
              <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-card/80 flex items-center justify-center">
                <Heart className="w-4 h-4 text-destructive fill-destructive" />
              </div>
              <div className="aspect-square overflow-hidden">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
              </div>
              <div className="p-2">
                <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{p.price}</span>
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Favoritos;
