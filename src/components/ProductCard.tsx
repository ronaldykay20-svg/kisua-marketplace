import { Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

export interface Product {
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
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
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
      className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer group flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.badge && (
          <span
            className="absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[10px] font-bold text-primary-foreground shadow-sm"
            style={{
              background:
                product.badge === "HOT"
                  ? "var(--promo-gradient)"
                  : "hsl(var(--walmart-green))",
            }}
          >
            {product.badge}
          </span>
        )}
        {product.discount && (
          <span className="absolute top-2 right-2 px-1.5 py-[3px] rounded-full text-white text-[10px] font-bold shadow-sm bg-gradient-to-r from-red-500 to-rose-600">
            {product.discount}
          </span>
        )}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center z-10"
          style={product.discount ? { top: "38px" } : undefined}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              liked
                ? "fill-[#8B6343] text-[#8B6343]"
                : "text-muted-foreground"
            }`}
          />
        </button>
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <h3 className="text-[12.5px] font-semibold text-foreground line-clamp-2 leading-snug mb-1.5 min-h-[2.4em]">
          {product.title}
        </h3>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-black" style={{ color: "#8B6343" }}>{product.price}</span>
            {product.oldPrice && (
              <span className="text-[10.5px] text-muted-foreground line-through">
                {product.oldPrice}
              </span>
            )}
          </div>
          {product.rating && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-2.5 h-2.5 ${
                    i < Math.floor(product.rating!)
                      ? "text-secondary fill-secondary"
                      : "text-border"
                  }`}
                />
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">
                ({product.reviews})
              </span>
            </div>
          )}
          {product.freeShipping && (
            <span className="inline-block mt-1 text-[9px] font-bold text-walmart-green">
              FRETE GRÁTIS
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
export type { Product as ProductType };
