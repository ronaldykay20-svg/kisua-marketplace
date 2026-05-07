import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield, MapPin, ChevronRight, Minus, Plus, ThumbsUp, ThumbsDown, ZoomIn, Store, MessageCircle, Send, Loader2, ShieldCheck, BadgeCheck } from "lucide-react";
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

  const isUuid = id && id.length > 10;
  const { data: dbProduct, isLoading: loadingProduct } = useProduct(id || "");

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

  const { user } = useAuth();
  const addToCart = useAddToCart();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getSelectedVariantId = () =>
    Object.values(selectedSubVariants).find(Boolean) ||
    Object.values(selectedVariants).find(Boolean) ||
    undefined;

  const handleAddToCart = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    addToCart.mutate({ productId: id!, quantity: qty, variantId: getSelectedVariantId() });
  };

  // ── BUY NOW ──────────────────────────────────────────────────────────────
  const handleBuyNow = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    addToCart.mutate(
      { productId: id!, quantity: qty, variantId: getSelectedVariantId() },
      { onSuccess: () => navigate("/checkout") }
    );
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

  const categoryId = (dbProduct as any)?.category_id;
  const sellerId = (dbProduct as any)?.seller_id;

  const { data: relatedDb = [] } = useQuery({
    queryKey: ["related_products", id, categoryId, sellerId],
    queryFn: async () => {
      const collected: any[] = [];
      const seen = new Set<string>([id!]);
      const fetchSet = async (filter: (q: any) => any, limit: number) => {
        let q = supabase.from("products").select("*").eq("is_active", true).neq("id", id!).limit(limit);
        q = filter(q);
        const { data } = await q;
        (data || []).forEach((p: any) => { if (!seen.has(p.id)) { seen.add(p.id); collected.push(p); } });
      };
      if (categoryId) await fetchSet((q) => q.eq("category_id", categoryId).order("sales_count", { ascending: false }), 30);
      if (sellerId && collected.length < 30) await fetchSet((q) => q.eq("seller_id", sellerId).order("sales_count", { ascending: false }), 20);
      if (collected.length < 30) await fetchSet((q) => q.order("sales_count", { ascending: false }), 30);
      const ids = collected.map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return collected.map((p: any) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
        oldPrice: p.old_price ? Number(p.old_price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz" : undefined,
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        image: coverMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
        rating: p.rating || undefined,
        reviews: p.total_reviews || undefined,
        freeShipping: p.free_shipping || false,
        badge: p.badge || undefined,
      }));
    },
    enabled: !!isUuid && !!dbProduct,
  });

  const { data: sponsoredProducts = [] } = useQuery({
    queryKey: ["sponsored_products", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, title, price, old_price, discount_percent, image_url, free_shipping, badge, rating, total_reviews, sellers(id, name, avatar_url, rating, total_sales)")
        .eq("is_active", true)
        .eq("is_sponsored", true)
        .neq("id", id!)
        .limit(6);
      const list = data || [];
      const ids = list.map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return list.map((p: any) => ({
        ...p,
        image: coverMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
        priceFormatted: Number(p.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
      }));
    },
    enabled: !!isUuid,
  });

  const sponsoredSellers = (() => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of sponsoredProducts as any[]) {
      const s = p.sellers;
      if (s && !seen.has(s.id)) { seen.add(s.id); out.push(s); }
      if (out.length >= 2) break;
    }
    return out;
  })();

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

  const parentVariants = (dbVariants as any[]).filter((v: any) => !v.parent_id);
  const childVariants = (dbVariants as any[]).filter((v: any) => v.parent_id);
  const variantGroups: Record<string, any[]> = {};
  parentVariants.forEach((v: any) => {
    if (!variantGroups[v.variant_type]) variantGroups[v.variant_type] = [];
    variantGroups[v.variant_type].push(v);
  });
  const selectedParentIds = Object.values(selectedVariants).filter(Boolean);
  const activeChildren = childVariants.filter((c: any) => selectedParentIds.includes(c.parent_id));
  const childGroups: Record<string, any[]> = {};
  activeChildren.forEach((v: any) => {
    if (!childGroups[v.variant_type]) childGroups[v.variant_type] = [];
    childGroups[v.variant_type].push(v);
  });
  const allSelectedIds = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants || {})].filter(Boolean);
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelectedIds.includes(v.id) && v.price_override);
  const activePrice = activeVariant?.price_override
    ? Number(activeVariant.price_override).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz"
    : product.price;
  const variantImage = activeVariant?.image_url || null;
  const images = dbMedia.length > 0
    ? dbMedia.map((m: any) => ({ url: m.url, type: m.type }))
    : [{ url: product.image, type: "image" }, { url: product.image, type: "image" }, { url: product.image, type: "image" }];
  const displayImages = variantImage
    ? [{ url: variantImage, type: "image" }, ...images.filter(img => img.url !== variantImage)]
    : images;

  const relatedProducts = relatedDb.slice(0, 10);
  const moreToExplore = relatedDb.slice(10, 20);
  const alsoLike = relatedDb.length > 5 ? relatedDb.slice(5, 15) : relatedDb.slice(0, 10);
  const popularityBadge = product.reviews && product.reviews > 200 ? `Em ${Math.floor(product.reviews / 5)}+ carrinhos` : null;

  // Seller info from dbProduct
  const seller = (product as any).seller;

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <div className="container mx-auto px-3 pt-3 flex items-center justify-between gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <span className="text-sm font-bold text-foreground truncate flex-1">{product.title}</span>
        <button className="text-foreground"><Share2 className="w-5 h-5" /></button>
      </div>

      <div className="md:container md:mx-auto md:px-4 md:py-6">
        <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-10">

          {/* LEFT: images */}
          <div>
            {/* Rating + title (mobile only) */}
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

            {/* Sponsored sellers (tablet+) */}
            {sponsoredSellers.length > 0 && (
              <div className="hidden md:block mt-4">
                <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                <div className="grid grid-cols-2 gap-3">
                  {sponsoredSellers.map((s: any) => (
                    <div key={s.id} onClick={() => navigate(`/vendedor/${s.id}`)} className="bg-card rounded-card border border-border p-3 hover:shadow-md transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={s.avatar_url || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop"} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                          {s.total_sales != null && <p className="text-[10px] text-muted-foreground">{s.total_sales} vendas</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{s.rating ? `⭐ ${s.rating}` : ""}</span>
                        <button className="px-2 py-1 rounded-card text-primary border border-primary/20 font-bold hover:bg-primary/5 transition">Ver loja</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: info */}
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

            {/* ── SELLER INFO CARD ─────────────────────────────────────── */}
            {seller && (
              <div
                onClick={() => navigate(`/vendedor/${seller.id}`)}
                className="bg-card mt-0.5 md:mt-0 md:mb-3 px-4 py-3 md:rounded-card md:border md:border-border flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition group"
              >
                {seller.avatar_url ? (
                  <img src={seller.avatar_url} alt={seller.name} className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground truncate">{seller.name}</p>
                    {seller.is_verified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {seller.province && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {seller.province}
                      </span>
                    )}
                    {seller.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Star className="w-3 h-3 fill-secondary text-secondary" />
                        {seller.rating}
                      </span>
                    )}
                    {seller.total_sales != null && (
                      <span className="text-[10px] text-muted-foreground">{seller.total_sales} vendas</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            )}

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

              {/* Variações */}
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

              {/* ── Qty + CTAs (desktop) ── */}
              <div className="hidden md:block mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-card">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Minus className="w-4 h-4" /></button>
                    <span className="w-9 text-center text-sm font-bold text-foreground">{qty}</span>
                    <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Plus className="w-4 h-4" /></button>
                  </div>
                  {/* Adicionar ao carrinho */}
                  <button
                    onClick={handleAddToCart}
                    disabled={addToCart.isPending}
                    className="flex-1 py-3 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Adicionar ao carrinho
                  </button>
                </div>
                {/* Comprar agora */}
                <button
                  onClick={handleBuyNow}
                  disabled={addToCart.isPending}
                  className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Comprar agora
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

            {/* Sponsored sellers (mobile) */}
            {sponsoredSellers.length > 0 && (
              <div className="md:hidden bg-card mt-2 p-4">
                <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                {sponsoredSellers.map((s: any, i: number) => (
                  <div key={s.id} onClick={() => navigate(`/vendedor/${s.id}`)} className={`flex items-center gap-3 py-3 cursor-pointer ${i !== sponsoredSellers.length - 1 ? "border-b border-border" : ""}`}>
                    <img src={s.avatar_url || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop"} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.rating ? `⭐ ${s.rating}` : ""}{s.total_sales != null ? ` • ${s.total_sales} vendas` : ""}</p>
                    </div>
                    <button className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition flex-shrink-0">Ver loja</button>
                  </div>
                ))}
              </div>
            )}

            {/* Sponsored product */}
            {sponsoredProducts.length > 0 && (() => {
              const sp: any = (sponsoredProducts as any[]).find((p: any) => p.id !== product.id);
              if (!sp) return null;
              return (
                <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
                  <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                  <div onClick={() => navigate(`/produto/${sp.id}`)} className="flex items-center gap-3 p-3 border border-border rounded-card cursor-pointer hover:bg-muted/50 transition">
                    <img src={sp.image} alt={sp.title} className="w-20 h-20 rounded-card object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{sp.priceFormatted}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{sp.title}</p>
                      <button className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">Ver produto</button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ProductReviewsSection productId={id || ""} product={product} dbReviews={dbReviews} userOrders={userOrders} />

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

      {/* ── STICKY BOTTOM BAR (mobile only) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-3 pt-2 pb-4 z-50 md:hidden">
        {/* Qty row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground font-semibold">Qtd:</span>
          <div className="flex items-center border border-border rounded-lg">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-foreground">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-sm font-black text-foreground ml-auto">{activePrice}</span>
        </div>
        {/* CTA buttons row */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Carrinho
          </button>
          <button
            onClick={handleBuyNow}
            disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Reviews Section ──────────────────────────────────────────────────────────
const ProductReviewsSection = ({ productId, product, dbReviews, userOrders }: { productId: string; product: any; dbReviews: any[]; userOrders: any[] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImage, setReviewImage] = useState<string>("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const reviews = dbReviews.length > 0 ? dbReviews : null;
  const alreadyReviewed = reviews?.some((r: any) => r.user_id === user?.id);
  const canReview = user && userOrders.length > 0 && !alreadyReviewed;

  const uploadReviewImage = async (file: File) => {
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `reviews/${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("products").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      setReviewImage(data.publicUrl);
    } catch (e: any) {
      console.error("Upload review image error:", e.message);
    }
    setUploadingImg(false);
  };

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user!.id,
        order_id: userOrders[0]?.id,
        rating: reviewRating,
        comment: reviewComment || null,
        image_url: reviewImage || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      setReviewComment("");
      setReviewRating(5);
      setReviewImage("");
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
          <button onClick={() => setShowReviewForm(!showReviewForm)} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
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
          <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Escreva a sua opinião sobre o produto (opcional)..." rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none" />
          <div className="mt-3">
            {reviewImage ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                <img src={reviewImage} alt="Anexo" className="w-full h-full object-cover" />
                <button onClick={() => setReviewImage("")} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold cursor-pointer hover:bg-accent">
                {uploadingImg ? "A enviar..." : "📷 Adicionar foto"}
                <input type="file" accept="image/*" disabled={uploadingImg} className="hidden" onChange={e => e.target.files?.[0] && uploadReviewImage(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowReviewForm(false)} className="px-4 py-2 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center gap-1">
              {submitReview.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Enviar avaliação
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed && <p className="text-xs text-muted-foreground mb-3 italic">✓ Já avaliou este produto</p>}

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
              {review.image_url && (
                <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={review.image_url} alt="Foto da avaliação" className="max-h-40 rounded-lg border border-border object-cover" />
                </a>
              )}
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
              <div className="flex items-center gap-3 mt-2">
                {user && (
                  <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                    <MessageCircle className="w-3 h-3" /> Responder
                  </button>
                )}
              </div>
              {replyingTo === review.id && user && (
                <div className="ml-6 mt-2 flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escrever resposta..." className="flex-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  <button onClick={() => submitReply.mutate(review.id)} disabled={!replyText.trim() || submitReply.isPending} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border-t border-border">
          <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">Ainda sem avaliações</p>
          <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a avaliar este produto após a compra.</p>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
