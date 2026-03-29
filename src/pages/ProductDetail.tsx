import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield, MapPin, ChevronRight, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { allProducts } from "@/data/products";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const product = allProducts.find(p => p.id === Number(id));

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">Produto não encontrado</h2>
          <button onClick={() => navigate("/")} className="text-sm text-primary font-semibold">Voltar à home</button>
        </div>
      </div>
    );
  }

  const images = [product.image, product.image, product.image];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary">
        <div className="container mx-auto px-3 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-primary-foreground truncate mx-4 flex-1">{product.title}</span>
          <div className="flex items-center gap-2">
            <button className="text-primary-foreground">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="text-primary-foreground relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">0</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div className="bg-card">
        <div className="aspect-square relative overflow-hidden">
          <img src={images[selectedImage]} alt={product.title} className="w-full h-full object-cover" />
          {product.discount && (
            <span className="absolute top-3 left-3 px-2 py-1 rounded-card bg-walmart-red text-primary-foreground text-xs font-bold">{product.discount}</span>
          )}
          {product.badge && (
            <span className="absolute top-3 right-3 px-2 py-1 rounded-card text-primary-foreground text-xs font-bold" style={{ background: "var(--promo-gradient)" }}>{product.badge}</span>
          )}
          <button
            onClick={() => setLiked(!liked)}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center"
          >
            <Heart className={`w-5 h-5 ${liked ? "text-walmart-red fill-walmart-red" : "text-muted-foreground"}`} />
          </button>
        </div>
        {/* Thumbnails */}
        <div className="flex gap-2 p-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`w-14 h-14 rounded-card overflow-hidden border-2 ${i === selectedImage ? "border-primary" : "border-border"}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Product info */}
      <div className="bg-card mt-2 p-4">
        <h1 className="text-base font-bold text-foreground leading-snug">{product.title}</h1>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-black text-foreground">{product.price}</span>
          {product.oldPrice && (
            <span className="text-sm text-muted-foreground line-through">{product.oldPrice}</span>
          )}
          {product.discount && (
            <span className="text-xs font-bold text-walmart-red">{product.discount}</span>
          )}
        </div>

        {product.rating && (
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "text-secondary fill-secondary" : "text-border"}`} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{product.rating} ({product.reviews} avaliações)</span>
          </div>
        )}

        {product.freeShipping && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-walmart-green font-semibold">
            <Truck className="w-4 h-4" />
            <span>Frete grátis para Luanda</span>
          </div>
        )}
      </div>

      {/* Delivery info */}
      <div className="bg-card mt-2 p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Entrega</h3>
        <div className="flex items-start gap-3 text-xs text-foreground">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Enviar para Luanda, Angola</p>
            <p className="text-muted-foreground mt-0.5">Entrega estimada: 2-5 dias úteis</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
        <div className="flex items-start gap-3 text-xs text-foreground mt-3">
          <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Garantia do vendedor</p>
            <p className="text-muted-foreground mt-0.5">Devolução grátis até 30 dias</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card mt-2 p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Descrição</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Produto de alta qualidade disponível no Kwanza Market. Garantia do vendedor incluída. 
          Compre com segurança e receba na sua morada em Angola. Este produto foi verificado 
          pela nossa equipa e cumpre todos os padrões de qualidade exigidos.
        </p>
        <ul className="text-xs text-muted-foreground mt-3 space-y-1.5">
          <li className="flex items-center gap-2">• Produto original com garantia</li>
          <li className="flex items-center gap-2">• Envio para todo o país</li>
          <li className="flex items-center gap-2">• Pagamento seguro</li>
          <li className="flex items-center gap-2">• Suporte ao cliente 24/7</li>
        </ul>
      </div>

      {/* Quantity + Buy bar */}
      <div className="sticky bottom-0 bg-card border-t border-border p-3 flex items-center gap-3 z-50">
        <div className="flex items-center border border-border rounded-card">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition">
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-9 text-center text-sm font-bold text-foreground">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button className="flex-1 py-3 rounded-card bg-secondary text-secondary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Adicionar ao carrinho
        </button>
        <button className="flex-1 py-3 rounded-card bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition">
          Comprar agora
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
