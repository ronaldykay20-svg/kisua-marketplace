import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield, MapPin, ChevronRight, Minus, Plus, ThumbsUp, ThumbsDown, ZoomIn, Store, MessageCircle, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddToCart } from "@/hooks/useCartActions";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSubVariants, setSelectedSubVariants] = useState<Record<string, string>>({});

  // Try DB first
  const isUuid = id && id.length > 10;
  const { data: dbProduct, isLoading: loadingProduct } = useProduct(id || "");

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

  // Load product reviews from DB — MUST be before any early return to respect React hooks rules
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product_reviews_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", id!)
        .order("created_at", { ascending: false });
      if (error) return [];
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }
      const reviewIds = (data || []).map((r: any) => r.id);
      let repliesMap: Record<string, any[]> = {};
      if (reviewIds.length > 0) {
        const { data: replies } = await supabase.from("review_replies").select("*").in("review_id", reviewIds).order("created_at");
        if (replies) {
          const replyUserIds = [...new Set(replies.map((r: any) => r.user_id))];
          let replyProfileMap: Record<string, any> = {};
          if (replyUserIds.length > 0) {
            const { data: rProfiles } = await supabase.from("profiles").select("id, full_name").in("id", replyUserIds);
            replyProfileMap = Object.fromEntries((rProfiles || []).map((p: any) => [p.id, p]));
          }
          replies.forEach((r: any) => {
            if (!repliesMap[r.review_id]) repliesMap[r.review_id] = [];
            repliesMap[r.review_id].push({ ...r, profile: replyProfileMap[r.user_id] || null });
          });
        }
      }
      return (data || []).map((r: any) => ({
        ...r,
        profile: profileMap[r.user_id] || null,
        replies: repliesMap[r.id] || [],
      }));
    },
    enabled: !!isUuid,
  });

  // Check if user has purchased this product (delivered orders)
  const { user } = useAuth();
  const addToCart = useAddToCart();
  const handleAddToCart = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    const selectedVariantId = Object.values(selectedSubVariants).find(Boolean) || Object.values(selectedVariants).find(Boolean) || undefined;
    addToCart.mutate({ productId: id!, quantity: qty, variantId: selectedVariantId });
  };
  const { data: userOrders = [] } = useQuery({
    queryKey: ["user_delivered_orders_for_product", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_items!inner(product_id)")
        .eq("user_id", user!.id)
        .eq("status", "delivered")
        .eq("order_items.product_id", id!);
      if (error) return [];
      return data || [];
    },
    enabled: !!user && !!isUuid,
  });

  if (!product) {
    if (isUuid && loadingProduct) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">Produto não encontrado</h2>
          <button onClick={() => navigate("/")} className="text-sm text-primary font-semibold">Voltar à home</button>
        </div>
      </div>
    );
  }

  // Separate parent and child variants
  const parentVariants = (dbVariants as any[]).filter((v: any) => !v.parent_id);
  const childVariants = (dbVariants as any[]).filter((v: any) => v.parent_id);

  // Group parent variants by type
  const variantGroups: Record<string, any[]> = {};
  parentVariants.forEach((v: any) => {
    if (!variantGroups[v.variant_type]) variantGroups[v.variant_type] = [];
    variantGroups[v.variant_type].push(v);
  });

  // Get children of selected parent variant
  const selectedParentIds = Object.values(selectedVariants).filter(Boolean);
  const activeChildren = childVariants.filter((c: any) => selectedParentIds.includes(c.parent_id));
  const childGroups: Record<string, any[]> = {};
  activeChildren.forEach((v: any) => {
    if (!childGroups[v.variant_type]) childGroups[v.variant_type] = [];
    childGroups[v.variant_type].push(v);
  });

  // Get active variant for price override (prefer child, fallback to parent)
  const allSelectedIds = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants || {})].filter(Boolean);
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelectedIds.includes(v.id) && v.price_override);
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


  const staticReviews = [
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
                <span className="text-2xl font-black text-foreground">{activePrice}</span>
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

              {/* ═══ VARIAÇÕES ═══ */}
              {Object.keys(variantGroups).length > 0 && (
                <div className="mt-4 space-y-3">
                  {Object.entries(variantGroups).map(([type, variants]) => {
                    const typeLabels: Record<string, string> = { color: "Cor", size: "Tamanho", material: "Material", style: "Estilo", weight: "Peso", capacity: "Capacidade", model: "Modelo", voltage: "Voltagem", pack: "Pacote", other: "Opção" };
                    const selectedId = selectedVariants[type];
                    return (
                      <div key={type}>
                        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
                          {typeLabels[type] || type}
                          {selectedId && ": "}
                          {selectedId && <span className="text-foreground">{variants.find((v: any) => v.id === selectedId)?.name}</span>}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v: any) => {
                            const isSelected = selectedId === v.id;
                            if (type === "color" && v.value?.startsWith("#")) {
                              return (
                                <button key={v.id}
                                  onClick={() => {
                                    setSelectedVariants(prev => ({ ...prev, [type]: isSelected ? "" : v.id }));
                                    if (isSelected) setSelectedSubVariants({});
                                    if (!isSelected && v.image_url) setSelectedImage(0);
                                  }}
                                  className={`relative rounded-lg border-2 overflow-hidden transition ${isSelected ? "border-primary ring-1 ring-primary" : "border-border"}`}
                                  title={v.name}>
                                  {v.image_url ? (
                                    <img src={v.image_url} alt={v.name} className="w-10 h-10 object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 flex items-center justify-center">
                                      <div className="w-7 h-7 rounded-full border border-border" style={{ backgroundColor: v.value }} />
                                    </div>
                                  )}
                                  {v.price_override && (
                                    <span className="absolute bottom-0 inset-x-0 text-center bg-background/80 text-[7px] font-bold text-foreground leading-tight py-0.5">
                                      {Number(v.price_override).toLocaleString("pt-AO").replace(/,/g, ".")} Kz
                                    </span>
                                  )}
                                </button>
                              );
                            }
                            return (
                              <button key={v.id}
                                onClick={() => {
                                  setSelectedVariants(prev => ({ ...prev, [type]: isSelected ? "" : v.id }));
                                  if (isSelected) setSelectedSubVariants({});
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:border-primary/50"}`}>
                                {v.name}
                                {v.price_override && (
                                  <span className="block text-[9px] font-normal opacity-80">
                                    {Number(v.price_override).toLocaleString("pt-AO").replace(/,/g, ".")} Kz
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Sub-variações */}
                  {Object.keys(childGroups).length > 0 && Object.entries(childGroups).map(([type, variants]) => {
                    const typeLabels: Record<string, string> = { color: "Cor", size: "Tamanho", material: "Material", style: "Estilo", weight: "Peso", capacity: "Capacidade", model: "Modelo", voltage: "Voltagem", pack: "Pacote", other: "Opção" };
                    const selectedId = selectedSubVariants[type];
                    return (
                      <div key={`sub-${type}`}>
                        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
                          {typeLabels[type] || type}
                          {selectedId && ": "}
                          {selectedId && <span className="text-foreground">{variants.find((v: any) => v.id === selectedId)?.name}</span>}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v: any) => {
                            const isSelected = selectedId === v.id;
                            return (
                              <button key={v.id}
                                onClick={() => setSelectedSubVariants(prev => ({ ...prev, [type]: isSelected ? "" : v.id }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:border-primary/50"}`}>
                                {v.name}
                                {v.price_override && (
                                  <span className="block text-[9px] font-normal opacity-80">
                                    {Number(v.price_override).toLocaleString("pt-AO").replace(/,/g, ".")} Kz
                                  </span>
                                )}
                                {v.stock != null && v.stock <= 3 && v.stock > 0 && (
                                  <span className="block text-[8px] text-amber-500">Restam {v.stock}</span>
                                )}
                                {v.stock === 0 && <span className="block text-[8px] text-destructive">Esgotado</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
      <ProductReviewsSection productId={id || ""} product={product} dbReviews={dbReviews} staticReviews={staticReviews} userOrders={userOrders} />

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

// ── Product Reviews Section with Replies + Review Form ──
const ProductReviewsSection = ({ productId, product, dbReviews, staticReviews, userOrders }: { productId: string; product: any; dbReviews: any[]; staticReviews: any[]; userOrders: any[] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const reviews = dbReviews.length > 0 ? dbReviews : null;

  // Check if user already reviewed this product
  const alreadyReviewed = reviews?.some((r: any) => r.user_id === user?.id);
  const canReview = user && userOrders.length > 0 && !alreadyReviewed;

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user!.id,
        order_id: userOrders[0]?.id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);
    },
  });

  const submitReply = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("review_replies").insert({
        review_id: reviewId,
        review_type: "product",
        user_id: user!.id,
        content: replyText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      setReplyText("");
      setReplyingTo(null);
    },
  });

  return (
    <div className="bg-card mt-2 p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-black text-foreground">Avaliações dos clientes</h3>
        {canReview && (
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold"
          >
            Avaliar produto
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "text-secondary fill-secondary" : "text-border"}`} />
          ))}
        </div>
        <span className="text-sm font-semibold text-foreground">{product.rating || 0} de 5</span>
        <span className="text-xs text-muted-foreground">({product.reviews || 0} avaliações)</span>
      </div>

      {/* Review form */}
      {showReviewForm && canReview && (
        <div className="border border-primary/20 rounded-card p-4 mb-4 bg-primary/5">
          <p className="text-sm font-bold text-foreground mb-3">A sua avaliação</p>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setReviewRating(i + 1)}>
                <Star className={`w-6 h-6 transition ${i < reviewRating ? "text-secondary fill-secondary" : "text-border"}`} />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">{reviewRating}/5</span>
          </div>
          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="Escreva a sua opinião sobre o produto (opcional)..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowReviewForm(false)} className="px-4 py-2 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
            <button
              onClick={() => submitReview.mutate()}
              disabled={submitReview.isPending}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center gap-1"
            >
              {submitReview.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Enviar avaliação
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed && (
        <p className="text-xs text-muted-foreground mb-3 italic">✓ Já avaliou este produto</p>
      )}

      {reviews ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="border-t border-border pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(review.profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-foreground">{review.profile?.full_name || "Utilizador"}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-2.5 h-2.5 ${j < review.rating ? "text-secondary fill-secondary" : "text-border"}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString("pt-AO")}</span>
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-xs text-foreground leading-relaxed mt-1">{review.comment}</p>}

              {/* Replies */}
              {review.replies?.length > 0 && (
                <div className="ml-6 mt-2 space-y-2">
                  {review.replies.map((reply: any) => (
                    <div key={reply.id} className="bg-muted rounded-lg p-2">
                      <p className="text-[10px] font-bold text-foreground">{reply.profile?.full_name || "Utilizador"}</p>
                      <p className="text-[11px] text-muted-foreground">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply button */}
              <div className="flex items-center gap-3 mt-2">
                {user && (
                  <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                    <MessageCircle className="w-3 h-3" /> Responder
                  </button>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === review.id && user && (
                <div className="ml-6 mt-2 flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escrever resposta..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  <button onClick={() => submitReply.mutate(review.id)} disabled={!replyText.trim() || submitReply.isPending}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="md:grid md:grid-cols-3 md:gap-4 space-y-4 md:space-y-0">
          {staticReviews.map((review: any, i: number) => (
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
      )}
    </div>
  );
};

export default ProductDetail;
