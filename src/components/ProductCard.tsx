import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Product {
  id: number;
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

  return (
    <div
      onClick={() => navigate(`/produto/${product.id}`)}
      className="bg-card rounded-card border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.badge && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-primary-foreground"
            style={{ background: product.badge === "HOT" ? "var(--promo-gradient)" : "hsl(var(--walmart-green))" }}>
            {product.badge}
          </span>
        )}
        {product.discount && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-sm bg-walmart-red text-primary-foreground text-[9px] font-bold">
            {product.discount}
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1.5">{product.title}</h3>
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black text-foreground">{product.price}</span>
            {product.oldPrice && (
              <span className="text-[10px] text-muted-foreground line-through">{product.oldPrice}</span>
            )}
          </div>
          {product.rating && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-2.5 h-2.5 ${i < Math.floor(product.rating!) ? "text-secondary fill-secondary" : "text-border"}`} />
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">({product.reviews})</span>
            </div>
          )}
          {product.freeShipping && (
            <span className="inline-block mt-1 text-[9px] font-bold text-walmart-green">FRETE GRÁTIS</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
export type { Product as ProductType };
