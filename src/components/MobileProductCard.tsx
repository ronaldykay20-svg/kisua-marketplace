import { Heart, Star, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

interface MobileProductCardProps {
  product: {
    id: string | number;
    title: string;
    price: string;
    oldPrice?: string;
    discount?: string;
    image: string;
    rating?: number;
    reviews?: number;
    freeShipping?: boolean;
    badge?: string;
  };
  index?: number;
}

const MobileProductCard = ({ product, index = 0 }: MobileProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const productId = String(product.id);
  const liked = isFavorite(productId);

  const aspectClass =
    index % 5 === 0 ? "aspect-[3/4]" :
    index % 5 === 1 ? "aspect-square" :
    index % 5 === 2 ? "aspect-[4/5]" :
    index % 5 === 3 ? "aspect-[3/4]" : "aspect-[4/5]";

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    await toggleFavorite(productId);
    if (!liked) navigate("/favoritos");
  };

  return (
    <button
      onClick={() => navigate(`/produto/${product.id}`)}
      className="w-full bg-card rounded-card border border-border overflow-hidden text-left group break-inside-avoid block"
    >
      <div className="relative overflow-hidden">
        {product.discount && (
          <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-sm z-10">
            {product.discount}
          </span>
        )}
        {product.badge && (
          <span className="absolute top-1.5 right-1.5 bg-walmart-orange text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10">
            🔥 {product.badge}
          </span>
        )}
        <button
          onClick={handleFavorite}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              liked
                ? "fill-[#8B6343] text-[#8B6343]"
                : "text-muted-foreground"
            }`}
          />
        </button>
        <img
          src={product.image}
          alt={product.title}
          className={`w-full ${aspectClass} object-cover group-hover:scale-105 transition-transform duration-300`}
          loading="lazy"
        />
      </div>
      <div className="p-2">
        {index < 5 && product.rating && product.rating >= 4 && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-walmart-orange mb-1">
            <TrendingUp className="w-3 h-3" /> #{index + 1} Mais Vendido
          </span>
        )}
        <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1 leading-tight">
          {product.title}
        </h3>
        <div className="flex items-center gap-1 mb-1">
          {[...Array(5)].map((_, j) => (
            <Star
              key={j}
              className={`w-2.5 h-2.5 ${
                j < (product.rating || 0)
                  ? "fill-walmart-orange text-walmart-orange"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
          {product.reviews && (
            <span className="text-[9px] text-muted-foreground">({product.reviews})</span>
          )}
        </div>
        {product.oldPrice && (
          <span className="text-[10px] text-muted-foreground line-through">{product.oldPrice}</span>
        )}
        <div>
          <span className="text-sm font-black text-foreground">{product.price}</span>
        </div>
        {product.freeShipping && (
          <span className="block text-[9px] text-accent font-semibold mt-0.5">Frete grátis</span>
        )}
      </div>
    </button>
  );
};

export default MobileProductCard;
