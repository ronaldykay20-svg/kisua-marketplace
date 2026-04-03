import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield, MapPin, ChevronRight, Minus, Plus, ThumbsUp, ThumbsDown, ZoomIn, Store } from "lucide-react";
import { useState } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Try DB first
  const isUuid = id && id.length > 10;
  const { data: dbProduct } = useProduct(id || "");

  // Load media from DB
  const { data: dbMedia = [] } = useQuery({
    queryKey: ["product_media_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media").select("*").eq("product_id", id!).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!isUuid,
  });

  const { data: dbVariants = [] } = useQuery({
    queryKey: ["product_variants", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", id!).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!isUuid,
  });

  // Fallback to static
  const staticProduct = allProducts.find(p => p.id === Number(id));

  const product = dbProduct ? {
    id: dbProduct.id,
    title: dbProduct.title,
    price: Number(dbProduct.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
    oldPrice: dbProduct.old_price ? Number(dbProduct.old_price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz" : undefined,
    discount: dbProduct.discount_percent ? `-${dbProduct.discount_percent}%` : undefined,
    image: dbMedia.find((m: any) => m.is_cover)?.url || dbMedia[0]?.url || dbProduct.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
    rating: dbProduct.rating || undefined,
    reviews: dbProduct.total_reviews || undefined,
    freeShipping: dbProduct.free_shipping || false,
    badge: dbProduct.badge || undefined,
    description: dbProduct.description,
    seller: (dbProduct as any).sellers,
  } : staticProduct;

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

  // Group variants by type
  const variantGroups: Record<string, any[]> = {};
  (dbVariants as any[]).forEach((v: any) => {
    if (!variantGroups[v.variant_type]) variantGroups[v.variant_type] = [];
    variantGroups[v.variant_type].push(v);
  });

  // Get active variant for price override
  const selectedVariantsList = Object.values(selectedVariants);
  const activeVariant = (dbVariants as any[]).find((v: any) => selectedVariantsList.includes(v.id));
  const activePrice = activeVariant?.price_override
    ? Number(activeVariant.price_override).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz"
    : product.price;

  // When a variant with image is selected, show that image
  const variantImage = activeVariant?.image_url || null;

  const images = dbMedia.length > 0
    ? dbMedia.map((m: any) => ({ url: m.url, type: m.type }))
    : [{ url: product.image, type: "image" }, { url: product.image, type: "image" }, { url: product.image, type: "image" }];

  // Prepend variant image if selected
  const displayImages = variantImage
    ? [{ url: variantImage, type: "image" }, ...images.filter(img => img.url !== variantImage)]
    : images;

  const relatedProducts = allProducts.filter(p => p.id !== Number(id)).slice(0, 10);
  const moreToExplore = allProducts.filter(p => p.id !== Number(id)).slice(10, 20);
  const alsoLike = allProducts.filter(p => p.id !== Number(id)).slice(5, 15);

  const reviews = [
    { name: "Maria S.", rating: 5, date: "15 Mar 2026", text: "Produto excelente! Chegou rápido e bem embalado. Recomendo a todos.", helpful: 12, notHelpful: 1 },
    { name: "João P.", rating: 4, date: "10 Mar 2026", text: "Muito bom, qualidade acima do esperado. Só demorou um pouco na entrega.", helpful: 8, notHelpful: 2 },
    { name: "Ana L.", rating: 5, date: "5 Mar 2026", text: "Adorei! Exactamente como na descrição. Vendedor de confiança.", helpful: 5, notHelpful: 0 },
  ];

  const popularityBadge = product.reviews && product.reviews > 200 ? `Em ${Math.floor(product.reviews / 5)}+ carrinhos` : null;

  // Sponsored sellers
  const sponsoredSellers = [
    { name: "TechZone Angola", category: "Electrónica", rating: 4.9, sales: "2.340 vendas", image: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop" },
    { name: "ModaAO Store", category: "Moda & Vestuário", rating: 4.8, sales: "1.890 vendas", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary">
        <div className="container mx-auto px-3 h-12 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-primary-foreground truncate mx-4 flex-1">{product.title}</span>
          <div className="flex items-center gap-2">
            <button className="text-primary-foreground"><Share2 className="w-5 h-5" /></button>
            <button className="text-primary-foreground relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">0</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLET+ layout: side by side | MOBILE: stacked */}
      <div className="md:container md:mx-auto md:px-4 md:py-6">
        <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-10">
          
          {/* LEFT column: images */}
          <div>
            {/* Rating + title (mobile only, above image) */}
            <div className="bg-card px-4 pt-3 pb-2 md:hidden">
              {product.rating && (
                <div className="flex items-center gap-1.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating!) ? "text-secondary fill-secondary" : "text-border"}`} />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">({product.rating})</span>
                  <span className="text-sm text-primary font-semibold ml-1">| {product.reviews}</span>
                </div>
              )}
              <h1 className="text-sm text-foreground leading-snug">{product.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {popularityBadge && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-primary text-primary bg-primary/5">{popularityBadge}</span>}
                {product.discount && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-green text-walmart-green bg-walmart-green/5">Clearance</span>}
                {product.badge === "HOT" && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-red text-walmart-red bg-walmart-red/5">Best seller</span>}
              </div>
            </div>

            {/* Image gallery */}
            <div className="bg-card md:rounded-card md:border md:border-border">
              <div className="aspect-square relative overflow-hidden md:rounded-t-card md:max-h-[450px]">
                {displayImages[selectedImage]?.type === "video" ? (
                  <video src={displayImages[selectedImage].url} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={displayImages[selectedImage]?.url} alt={product.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute right-3 top-1/3 flex flex-col gap-2">
                  <button className="w-9 h-9 rounded-full bg-card/80 shadow flex items-center justify-center"><Share2 className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => setLiked(!liked)} className="w-9 h-9 rounded-full bg-card/80 shadow flex items-center justify-center">
                    <Heart className={`w-4 h-4 ${liked ? "text-walmart-red fill-walmart-red" : "text-muted-foreground"}`} />
                  </button>
                  <button className="w-9 h-9 rounded-full bg-card/80 shadow flex items-center justify-center"><ZoomIn className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
                {displayImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-card overflow-hidden border-2 ${i === selectedImage ? "border-primary" : "border-border"}`}>
                    {img.type === "video" ? (
                      <video src={img.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sponsored sellers (tablet+ only) */}
            <div className="hidden md:block mt-4">
              <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
              <div className="grid grid-cols-2 gap-3">
                {sponsoredSellers.map((seller, i) => (
                  <div key={i} className="bg-card rounded-card border border-border p-3 hover:shadow-md transition cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={seller.image} alt={seller.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{seller.name}</p>
                        <p className="text-[10px] text-muted-foreground">{seller.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">⭐ {seller.rating} • {seller.sales}</span>
                      <button className="px-2 py-1 rounded-card text-primary border border-primary/20 font-bold hover:bg-primary/5 transition">Ver loja</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column: info */}
          <div>
            {/* Title + badges (tablet+) */}
            <div className="hidden md:block mb-4">
              {product.rating && (
                <div className="flex items-center gap-1.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating!) ? "text-secondary fill-secondary" : "text-border"}`} />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">({product.rating})</span>
                  <span className="text-sm text-primary font-semibold ml-1">| {product.reviews} avaliações</span>
                </div>
              )}
              <h1 className="text-xl font-bold text-foreground leading-snug">{product.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {popularityBadge && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-primary text-primary bg-primary/5">{popularityBadge}</span>}
                {product.discount && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-green text-walmart-green bg-walmart-green/5">Clearance</span>}
                {product.badge === "HOT" && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-red text-walmart-red bg-walmart-red/5">Best seller</span>}
              </div>
            </div>

            {/* Price section */}
            <div className="bg-card mt-0.5 md:mt-0 p-4 md:rounded-card md:border md:border-border">
              <div className="flex items-baseline gap-1">
                {product.discount && <span className="text-sm font-bold text-walmart-green mr-1">Now</span>}
                <span className="text-2xl font-black text-foreground">{product.price}</span>
              </div>
              {product.oldPrice && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground line-through">{product.oldPrice}</span>
                  {product.discount && <span className="text-xs font-bold text-walmart-green">Poupa {product.discount}</span>}
                </div>
              )}
              {product.freeShipping && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-walmart-green font-semibold">
                  <Truck className="w-4 h-4" /><span>Frete grátis para Luanda</span>
                </div>
              )}

              {/* Qty + CTA (tablet+ inline) */}
              <div className="hidden md:flex items-center gap-3 mt-5">
                <div className="flex items-center border border-border rounded-card">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Minus className="w-4 h-4" /></button>
                  <span className="w-9 text-center text-sm font-bold text-foreground">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Plus className="w-4 h-4" /></button>
                </div>
                <button className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar ao carrinho
                </button>
              </div>
            </div>

            {/* Delivery info */}
            <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
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
            <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
              <h3 className="text-sm font-bold text-foreground mb-2">Descrição</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {(product as any).description || "Produto de alta qualidade disponível no Kwanza Market. Garantia do vendedor incluída. Compre com segurança e receba na sua morada em Angola."}
              </p>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1.5">
                <li>• Produto original com garantia</li>
                <li>• Envio para todo o país</li>
                <li>• Pagamento seguro</li>
                <li>• Suporte ao cliente 24/7</li>
              </ul>
            </div>

            {/* Sponsored sellers (mobile only) */}
            <div className="md:hidden bg-card mt-2 p-4">
              <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
              {sponsoredSellers.map((seller, i) => (
                <div key={i} className={`flex items-center gap-3 py-3 ${i !== sponsoredSellers.length - 1 ? "border-b border-border" : ""}`}>
                  <img src={seller.image} alt={seller.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{seller.name}</p>
                    <p className="text-[10px] text-muted-foreground">{seller.category} • ⭐ {seller.rating}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition flex-shrink-0">Ver loja</button>
                </div>
              ))}
            </div>

            {/* Sponsored product */}
            <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
              <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
              {(() => {
                const sponsored = allProducts.find(p => p.id !== product.id && p.freeShipping);
                if (!sponsored) return null;
                return (
                  <div onClick={() => navigate(`/produto/${sponsored.id}`)} className="flex items-center gap-3 p-3 border border-border rounded-card cursor-pointer hover:bg-muted/50 transition">
                    <img src={sponsored.image} alt={sponsored.title} className="w-20 h-20 rounded-card object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{sponsored.price}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sponsored.title}</p>
                      <button className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">Adicionar ao carrinho</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews section */}
      <div className="bg-card mt-2 p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
        <h3 className="text-base font-black text-foreground mb-1">Avaliações dos clientes</h3>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-secondary fill-secondary" : "text-border"}`} />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground">{product.rating} de 5</span>
          <span className="text-xs text-muted-foreground">({product.reviews} avaliações)</span>
        </div>
        <div className="md:grid md:grid-cols-3 md:gap-4 space-y-4 md:space-y-0">
          {reviews.map((review, i) => (
            <div key={i} className="border-t md:border-t-0 md:border md:border-border md:rounded-card md:p-3 border-border pt-3">
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-3 h-3 ${j < review.rating ? "text-secondary fill-secondary" : "text-border"}`} />
                ))}
              </div>
              <p className="text-xs text-foreground leading-relaxed mt-1">{review.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{review.name} — {review.date}</span>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><ThumbsUp className="w-3 h-3" /> ({review.helpful})</button>
                  <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><ThumbsDown className="w-3 h-3" /> ({review.notHelpful})</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full py-2.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition">
          Ver todas as avaliações ({product.reviews})
        </button>
      </div>

      {/* Carousels */}
      <div className="mt-2 bg-card p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-foreground">Produtos relacionados</h3>
          <span className="text-[10px] text-muted-foreground">Patrocinado</span>
        </div>
        <ProductCarousel>{relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}</ProductCarousel>
      </div>

      <div className="mt-2 bg-card p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-foreground">Mais para explorar</h3>
          <span className="text-[10px] text-muted-foreground">Patrocinado</span>
        </div>
        <ProductCarousel>{moreToExplore.map(p => <ProductCard key={p.id} product={p} />)}</ProductCarousel>
      </div>

      <div className="mt-2 bg-card p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-foreground">Também pode gostar</h3>
          <span className="text-[10px] text-muted-foreground">Patrocinado</span>
        </div>
        <ProductCarousel>{alsoLike.map(p => <ProductCard key={p.id} product={p} />)}</ProductCarousel>
      </div>

      {/* Sticky bottom bar (mobile only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 flex items-center gap-3 z-50 md:hidden">
        <div className="flex items-center border border-border rounded-card">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Minus className="w-4 h-4" /></button>
          <span className="w-9 text-center text-sm font-bold text-foreground">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Plus className="w-4 h-4" /></button>
        </div>
        <button className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar ao carrinho
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
