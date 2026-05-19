import { Heart, Star, ChevronRight, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

interface MobileSearchProductCardProps {
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
    description?: string;
    sellerName?: string;
  };
}

const MobileSearchProductCard = ({ product }: MobileSearchProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const productId = String(product.id);
  const liked = isFavorite(productId);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    await toggleFavorite(productId);
    if (!liked) navigate("/favoritos");
  };

  return (
    <div
      onClick={() => navigate(`/produto/${product.id}`)}
      className="bg-card border-b border-border flex items-stretch cursor-pointer active:bg-muted/50 transition-colors"
    >
      <div className="relative flex-shrink-0 w-[130px] h-[130px] overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {product.discount && (
          <span className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[9px] font-black px-1.5 py-0.5 rounded-sm z-10">
            {product.discount}
          </span>
        )}
        <button
          onClick={handleFavorite}
          className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <Heart
            className={`w-3 h-3 transition-colors ${
              liked ? "fill-[#8B6343] text-[#8B6343]" : "text-muted-foreground"
            }`}
          />
        </button>
      </div>

      <div className="flex-1 px-3 py-2 flex flex-col justify-between min-w-0">
        <div className="space-y-1">
          {product.badge && (
            <span className="inline-block text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
              {product.badge}
            </span>
          )}
          <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
            {product.title}
          </h3>
          {product.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
              {product.description}
            </p>
          )}
          {product.sellerName && (
            <div className="flex items-center gap-1">
              <Store className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">{product.sellerName}</span>
            </div>
          )}
          {product.rating && (
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 ${
                      i < Math.floor(product.rating!)
                        ? "fill-secondary text-secondary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              {product.reviews && (
                <span className="text-[9px] text-muted-foreground">({product.reviews})</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 mt-1.5">
          <div>
            <span className="text-sm font-black text-foreground">{product.price}</span>
            {product.oldPrice && (
              <span className="block text-[10px] text-muted-foreground line-through">{product.oldPrice}</span>
            )}
            {product.freeShipping && (
              <span className="block text-[9px] text-green-600 font-semibold">Frete grátis</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/produto/${product.id}`); }}
            className="flex-shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 rounded-card bg-primary text-primary-foreground text-[10px] font-bold hover:brightness-110 transition whitespace-nowrap"
          >
            Ver produto <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileSearchProductCard;
