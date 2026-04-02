import { Heart, Star, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useSupabaseData";
import { allProducts } from "@/data/products";
import MobileProductCard from "@/components/MobileProductCard";
import { useIsMobile } from "@/hooks/use-mobile";

const Favoritos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dbFavorites, isLoading } = useFavorites();
  const isMobile = useIsMobile();

  // Use DB favorites if logged in, otherwise show static placeholder
  const favProducts = user && dbFavorites?.length
    ? dbFavorites.map((f: any) => f.product).filter(Boolean)
    : allProducts.slice(0, 6);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <Navbar />
        <div className="container mx-auto px-3 py-8 text-center">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-base font-bold text-foreground mb-1">Faça login para ver favoritos</h2>
          <p className="text-xs text-muted-foreground mb-4">Guarde os seus produtos preferidos.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-card">Entrar</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-foreground">Favoritos</h1>
          <span className="text-xs text-muted-foreground">{favProducts.length} itens</span>
        </div>

        {favProducts.length === 0 ? (
          <div className="bg-card rounded-card border border-border p-8 text-center">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">Nenhum favorito ainda</h3>
            <p className="text-xs text-muted-foreground mb-4">Toque no coração dos produtos para adicioná-los aqui.</p>
            <button onClick={() => navigate("/")} className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-card">Explorar produtos</button>
          </div>
        ) : isMobile ? (
          <div className="columns-2 gap-1.5 space-y-1.5">
            {favProducts.map((p: any, i: number) => (
              <MobileProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {favProducts.map((p: any) => (
              <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-card border border-border overflow-hidden text-left group hover:shadow-md transition relative">
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
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Favoritos;
