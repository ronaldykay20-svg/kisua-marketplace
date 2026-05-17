import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield,
  MapPin, ChevronRight, Minus, Plus, ZoomIn, Store, MessageCircle,
  Send, Loader2, ShieldCheck, X, Building2, Link2,
} from "lucide-react";
import { useState, useRef } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddToCart } from "@/hooks/useCartActions";
import ProductCard from "@/components/ProductCard";
import ProductCarousel from "@/components/ProductCarousel";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  Number(n).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

// ─── ShareSheet ───────────────────────────────────────────────────────────────
const ShareSheet = ({
  title,
  imageUrl,
  url,
  onClose,
}: {
  title: string;
  imageUrl: string;
  url: string;
  onClose: () => void;
}) => {
  const handleNative = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} — Kwanza Market`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch (_) {}
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch (_) {
      toast.error("Não foi possível copiar");
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-2xl pb-8 pt-4 px-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
          Partilhar produto
        </p>
        <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border mb-5">
          <img
            src={imageUrl}
            alt={title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-background"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{title}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleNative}
            className="flex flex-col items-center gap-2 py-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 active:scale-95 transition"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-primary">Partilhar</span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">
              Usar app do dispositivo
            </span>
          </button>
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 py-4 rounded-xl bg-muted border border-border hover:bg-accent active:scale-95 transition"
          >
            <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-xs font-bold text-foreground">Copiar link</span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">
              Colar em qualquer app
            </span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-muted text-sm font-bold text-muted-foreground hover:text-foreground transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── ZoomLightbox ─────────────────────────────────────────────────────────────
const ZoomLightbox = ({
  images,
  index,
  onClose,
  onChange,
  onShare,
}: {
  images: { url: string; type: string }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
  onShare: () => void;
}) => {
  const touchRef = useRef<number | null>(null);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <span className="text-white/60 text-xs font-medium">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={onShare}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <Share2 className="w-4 h-4 text-white" />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center px-2 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchRef.current === null) return;
          const diff = touchRef.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40)
            onChange(diff > 0
              ? Math.min(index + 1, images.length - 1)
              : Math.max(index - 1, 0));
          touchRef.current = null;
        }}
      >
        {images[index]?.type === "video"
          ? <video src={images[index].url} controls className="max-w-full max-h-full rounded-lg" />
          : <img src={images[index]?.url} alt="" className="max-w-full max-h-full object-contain" />
        }
      </div>

      {images.length > 1 && (
        <div
          className="flex justify-center gap-2 py-5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`rounded-full transition-all duration-200 ${
                i === index ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AvatarWithFallback ───────────────────────────────────────────────────────
const AvatarWithFallback = ({
  src,
  name,
  isCompany,
}: {
  src: string | null;
  name: string;
  isCompany: boolean;
}) => {
  const [imgOk, setImgOk] = useState<boolean | null>(src ? null : false);

  if (src && imgOk !== false) {
    return (
      <img
        src={src}
        alt={name}
        className="w-12 h-12 rounded-full object-cover border-2 border-border bg-muted"
        onLoad={() => setImgOk(true)}
        onError={() => setImgOk(false)}
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center">
      {isCompany
        ? <Building2 className="w-5 h-5 text-primary" />
        : <Store className="w-5 h-5 text-primary" />}
    </div>
  );
};

// ─── SellerCard ───────────────────────────────────────────────────────────────
const SellerCard = ({
  seller,
  onNavigate,
  isLoading = false,
}: {
  seller: any;
  onNavigate: () => void;
  isLoading?: boolean;
}) => {
  if (isLoading) return (
    <div className="bg-card mt-0.5 md:mt-0 md:mb-3 px-4 py-3 md:rounded-card md:border md:border-border flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-32" />
        <div className="h-2.5 bg-muted rounded w-20" />
      </div>
    </div>
  );
  if (!seller) return null;

  const avatar: string | null =
    seller.logo_url ||
    seller.avatar_url ||
    seller.cover_url ||
    null;

  const isCompany = seller.__type === "company";
  const salesOrReviews =
    seller.total_sales != null
      ? `${seller.total_sales} vendas`
      : seller.total_reviews != null
      ? `${seller.total_reviews} avaliações`
      : "0 vendas";

  return (
    <button
      onClick={onNavigate}
      className="w-full bg-card mt-0.5 md:mt-0 md:mb-3 px-4 py-3
                 md:rounded-card md:border md:border-border
                 flex items-center gap-3 cursor-pointer
                 hover:bg-muted/60 active:bg-muted transition-colors group text-left"
    >
      <div className="relative flex-shrink-0">
        <AvatarWithFallback
          src={avatar}
          name={seller.name}
          isCompany={isCompany}
        />
        {seller.is_verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-foreground truncate">{seller.name}</p>
          {isCompany && (
            <span className="text-[9px] font-bold text-primary bg-primary/10
                             px-1.5 py-0.5 rounded-full border border-primary/20 flex-shrink-0">
              Empresa
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {seller.province && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="w-3 h-3" />{seller.province}
            </span>
          )}
          {seller.rating && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Star className="w-3 h-3 fill-secondary text-secondary" />{seller.rating}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{salesOrReviews}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold text-primary hidden sm:block">
          Ver perfil
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
};

// ─── ProductDetail ────────────────────────────────────────────────────────────
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSubVariants, setSelectedSubVariants] = useState<Record<string, string>>({});
  const [zoomOpen, setZoomOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const isUuid = id && id.length > 10;

  // ── Produto (já inclui sellers e companies via join, e cover_url via _media) ─
  const { data: dbProduct, isLoading: loadingProduct } = useProduct(id || "");

  // ── Media — usa os dados já carregados no useProduct ──────────────────────
  const dbMedia: any[] = (dbProduct as any)?._media || [];

  // ── Variantes ─────────────────────────────────────────────────────────────
  const { data: dbVariants = [] } = useQuery({
    queryKey: ["product_variants", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants").select("*")
        .eq("product_id", id!).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!isUuid,
  });

  // ── Anúncios banner ───────────────────────────────────────────────────────
  const { data: productAds = [] } = useQuery({
    queryKey: ["product_ads_detail"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads")
        .select("id, title, media_url, media_type, destination_url")
        .eq("type", "banner").eq("is_active", true)
        .order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
  });

  // ── Publicador: empresa tem SEMPRE prioridade sobre vendedor ─────────────
  // Os dados já vêm do join no useProduct — sem queries extras
  const rawCompanyId = (dbProduct as any)?.company_id || null;
  const rawSellerId  = (dbProduct as any)?.seller_id || null;

  const publisher: any = (() => {
    const comp = (dbProduct as any)?.companies;
    if (comp && rawCompanyId) return { ...comp, __type: "company" };
    const sell = (dbProduct as any)?.sellers;
    if (sell && rawSellerId) return { ...sell, __type: "seller" };
    return null;
  })();

  const loadingPublisher = loadingProduct;

  const handlePublisherNavigate = () => {
    if (!publisher) return;
    if (publisher.__type === "company")
      navigate(`/empresa/${publisher.id ?? rawCompanyId}`);
    else
      navigate(`/vendedor/${publisher.id ?? rawSellerId}`);
  };

  // ── Favoritos ─────────────────────────────────────────────────────────────
  const { data: isFavorited = false } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlists").select("id")
        .eq("user_id", user!.id).eq("product_id", id!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!isUuid,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (isFavorited)
        await supabase.from("wishlists").delete()
          .eq("user_id", user!.id).eq("product_id", id!);
      else
        await supabase.from("wishlists").insert({ user_id: user!.id, product_id: id! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id, user?.id] });
      toast.success(isFavorited ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
    },
    onError: () => toast.error("Erro ao atualizar favoritos"),
  });

  const handleFavorite = () => {
    if (!user) { navigate("/auth"); return; }
    toggleFavorite.mutate();
  };

  // ── Carrinho ──────────────────────────────────────────────────────────────
  const getVariantId = () =>
    Object.values(selectedSubVariants).find(Boolean) ||
    Object.values(selectedVariants).find(Boolean) || undefined;

  const handleAddToCart = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() });
  };

  const handleBuyNow = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    addToCart.mutate(
      { productId: id!, quantity: qty, variantId: getVariantId() },
      { onSuccess: () => navigate("/checkout") }
    );
  };

  // ── Pedidos entregues ─────────────────────────────────────────────────────
  const { data: userOrders = [] } = useQuery({
    queryKey: ["user_delivered_orders_for_product", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("id, order_items!inner(product_id)")
        .eq("user_id", user!.id).eq("status", "delivered")
        .eq("order_items.product_id", id!);
      if (error) return [];
      return data || [];
    },
    enabled: !!user && !!isUuid,
  });

  // ── Reviews ───────────────────────────────────────────────────────────────
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product_reviews_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews").select("*")
        .eq("product_id", id!).order("created_at", { ascending: false });
      if (error) return [];
      const uids = [...new Set((data || []).map((r: any) => r.user_id))];
      let pMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, avatar_url").in("id", uids);
        pMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      const rids = (data || []).map((r: any) => r.id);
      let repMap: Record<string, any[]> = {};
      if (rids.length > 0) {
        const { data: reps } = await supabase
          .from("review_replies").select("*").in("review_id", rids).order("created_at");
        if (reps) {
          const ruids = [...new Set(reps.map((r: any) => r.user_id))];
          let rpMap: Record<string, any> = {};
          if (ruids.length > 0) {
            const { data: rp } = await supabase
              .from("profiles").select("id, full_name").in("id", ruids);
            rpMap = Object.fromEntries((rp || []).map((p: any) => [p.id, p]));
          }
          reps.forEach((r: any) => {
            if (!repMap[r.review_id]) repMap[r.review_id] = [];
            repMap[r.review_id].push({ ...r, profile: rpMap[r.user_id] || null });
          });
        }
      }
      return (data || []).map((r: any) => ({
        ...r,
        profile: pMap[r.user_id] || null,
        replies: repMap[r.id] || [],
      }));
    },
    enabled: !!isUuid,
  });

  // ── Relacionados ──────────────────────────────────────────────────────────
  const categoryId = (dbProduct as any)?.category_id;
  const { data: relatedDb = [] } = useQuery({
    queryKey: ["related_products", id, categoryId, rawSellerId, rawCompanyId],
    queryFn: async () => {
      const collected: any[] = [];
      const seen = new Set<string>([id!]);
      const fetchSet = async (filter: (q: any) => any, limit: number) => {
        const { data } = await filter(
          supabase.from("products").select("*").eq("is_active", true).neq("id", id!).limit(limit)
        );
        (data || []).forEach((p: any) => { if (!seen.has(p.id)) { seen.add(p.id); collected.push(p); } });
      };
      if (categoryId) await fetchSet(q => q.eq("category_id", categoryId).order("sales_count", { ascending: false }), 30);
      if (rawSellerId && collected.length < 30) await fetchSet(q => q.eq("seller_id", rawSellerId).order("sales_count", { ascending: false }), 20);
      if (rawCompanyId && collected.length < 30) await fetchSet(q => q.eq("company_id", rawCompanyId).order("sales_count", { ascending: false }), 20);
      if (collected.length < 30) await fetchSet(q => q.order("sales_count", { ascending: false }), 30);
      const ids = collected.map((p: any) => p.id);
      const cMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: m } = await supabase
          .from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; });
      }
      return collected.map((p: any) => ({
        id: p.id, title: p.title,
        price: fmt(p.price),
        oldPrice: p.old_price ? fmt(p.old_price) : undefined,
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
        rating: p.rating || undefined,
        reviews: p.total_reviews || undefined,
        freeShipping: p.free_shipping || false,
        badge: p.badge || undefined,
      }));
    },
    enabled: !!isUuid && !!dbProduct,
  });

  // ── Patrocinados ──────────────────────────────────────────────────────────
  const { data: sponsoredProducts = [] } = useQuery({
    queryKey: ["sponsored_products", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, title, price, old_price, discount_percent, image_url, free_shipping, badge, rating, total_reviews, sellers(id, name, avatar_url, rating, total_sales)")
        .eq("is_active", true).eq("is_sponsored", true).neq("id", id!).limit(6);
      const list = data || [];
      const ids = list.map((p: any) => p.id);
      const cMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: m } = await supabase
          .from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; });
      }
      return list.map((p: any) => ({
        ...p,
        image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
        priceFormatted: fmt(p.price),
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

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!dbProduct && isUuid && loadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  const staticProduct = allProducts.find(p => p.id === Number(id));
  const productBase: any = dbProduct || staticProduct;
  if (!productBase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Produto não encontrado</h2>
          <button onClick={() => navigate("/")} className="text-sm text-primary font-semibold">Voltar à home</button>
        </div>
      </div>
    );
  }

  // ── Montar produto ────────────────────────────────────────────────────────
  // CORRIGIDO: usa _media do useProduct, com fallback para image_url
  const coverUrl =
    dbMedia.find((m: any) => m.is_cover)?.url ||
    dbMedia[0]?.url ||
    (dbProduct as any)?.cover_url ||
    productBase.image_url ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";

  const product = {
    id:          productBase.id,
    title:       productBase.title,
    price:       fmt(productBase.price),
    oldPrice:    productBase.old_price   ? fmt(productBase.old_price)   : undefined,
    discount:    productBase.discount_percent ? `-${productBase.discount_percent}%` : undefined,
    image:       coverUrl,
    rating:      productBase.rating      || undefined,
    reviews:     productBase.total_reviews || undefined,
    freeShipping: productBase.free_shipping || false,
    badge:       productBase.badge       || undefined,
    description: productBase.description || "",
  };

  // ── Variantes ─────────────────────────────────────────────────────────────
  const parentVariants = (dbVariants as any[]).filter((v: any) => !v.parent_id);
  const childVariants  = (dbVariants as any[]).filter((v: any) =>  v.parent_id);
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
  const allSelIds = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants)].filter(Boolean);
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelIds.includes(v.id) && v.price_override);
  const activePrice   = activeVariant?.price_override ? fmt(activeVariant.price_override) : product.price;
  const variantImage  = activeVariant?.image_url || null;

  const images = dbMedia.length > 0
    ? dbMedia.map((m: any) => ({ url: m.url, type: m.type || "image" }))
    : [{ url: product.image, type: "image" }];
  const displayImages = variantImage
    ? [{ url: variantImage, type: "image" }, ...images.filter(i => i.url !== variantImage)]
    : images;

  const currentImageUrl = displayImages[selectedImage]?.url || product.image;

  const relatedProducts = relatedDb.slice(0, 10);
  const moreToExplore   = relatedDb.slice(10, 20);
  const alsoLike        = relatedDb.length > 5 ? relatedDb.slice(5, 15) : relatedDb.slice(0, 10);
  const popularityBadge = product.reviews && product.reviews > 200
    ? `Em ${Math.floor(product.reviews / 5)}+ carrinhos` : null;

  const typeLabels: Record<string, string> = {
    color: "Cor", size: "Tamanho", material: "Material", style: "Estilo",
    weight: "Peso", capacity: "Capacidade", model: "Modelo",
    voltage: "Voltagem", pack: "Pacote", other: "Opção",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">

      {shareOpen && (
        <ShareSheet
          title={product.title}
          imageUrl={currentImageUrl}
          url={window.location.href}
          onClose={() => setShareOpen(false)}
        />
      )}

      {zoomOpen && (
        <ZoomLightbox
          images={displayImages}
          index={selectedImage}
          onClose={() => setZoomOpen(false)}
          onChange={setSelectedImage}
          onShare={() => { setZoomOpen(false); setShareOpen(true); }}
        />
      )}

      {/* ── Top bar ── */}
      <div className="container mx-auto px-3 pt-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-sm font-bold text-foreground truncate flex-1">{product.title}</span>
        <button
          onClick={() => setShareOpen(true)}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition"
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="md:container md:mx-auto md:px-4 md:py-6">
        <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-10">

          {/* ── LEFT ─────────────────────────────────────────────────── */}
          <div>
            {/* Title mobile */}
            <div className="bg-card px-4 pt-3 pb-2 md:hidden">
              {product.rating && (
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "text-secondary fill-secondary" : "text-border"}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">({product.rating}) | {product.reviews}</span>
                </div>
              )}
              <h1 className="text-sm font-bold text-foreground leading-snug">{product.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {popularityBadge && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-primary text-primary bg-primary/5">{popularityBadge}</span>}
                {product.discount && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-green text-walmart-green bg-walmart-green/5">Clearance</span>}
                {product.badge === "HOT" && <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold border border-walmart-red text-walmart-red bg-walmart-red/5">Best seller</span>}
              </div>
            </div>

            {/* Gallery */}
            <div className="bg-card md:rounded-card md:border md:border-border">
              <div
                className="aspect-square relative overflow-hidden md:rounded-t-card md:max-h-[450px] select-none"
                onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={e => {
                  if (touchStartX.current === null) return;
                  const diff = touchStartX.current - e.changedTouches[0].clientX;
                  if (Math.abs(diff) > 40)
                    setSelectedImage(i => diff > 0
                      ? Math.min(i + 1, displayImages.length - 1)
                      : Math.max(i - 1, 0));
                  touchStartX.current = null;
                }}
              >
                {displayImages[selectedImage]?.type === "video"
                  ? <video src={displayImages[selectedImage].url} controls className="w-full h-full object-cover" />
                  : <img src={displayImages[selectedImage]?.url || coverUrl} alt={product.title} className="w-full h-full object-cover" />
                }

                {displayImages.length > 1 && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                    {displayImages.map((_, i) => (
                      <span key={i}
                        className={`rounded-full transition-all duration-200 ${
                          i === selectedImage ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute right-3 top-1/3 flex flex-col gap-2">
                  <button
                    onClick={() => setShareOpen(true)}
                    className="w-9 h-9 rounded-full bg-card/90 shadow-md flex items-center justify-center active:scale-95 transition"
                  >
                    <Share2 className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={handleFavorite}
                    className="w-9 h-9 rounded-full bg-card/90 shadow-md flex items-center justify-center active:scale-95 transition"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${isFavorited ? "text-red-500 fill-red-500" : "text-foreground"}`} />
                  </button>
                  <button
                    onClick={() => setZoomOpen(true)}
                    className="w-9 h-9 rounded-full bg-card/90 shadow-md flex items-center justify-center active:scale-95 transition"
                  >
                    <ZoomIn className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
                {displayImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-card overflow-hidden border-2 transition ${
                      i === selectedImage ? "border-primary" : "border-border hover:border-primary/40"
                    }`}>
                    {img.type === "video"
                      ? <video src={img.url} className="w-full h-full object-cover" />
                      : <img src={img.url} alt="" className="w-full h-full object-cover" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Ads tablet+ */}
            {productAds.length > 0 && (
              <div className="hidden md:block mt-4 space-y-3">
                <p className="text-[10px] text-muted-foreground text-right">Publicidade</p>
                {productAds.map((ad: any) => {
                  const isVid = ad.media_type === "video";
                  const inner = (
                    <div className="rounded-card border border-border overflow-hidden hover:shadow-md hover:border-primary/30 transition-all group">
                      {ad.media_url ? (
                        <div className="relative">
                          {isVid
                            ? <video src={ad.media_url} className="w-full object-cover max-h-36" autoPlay muted loop playsInline />
                            : <img src={ad.media_url} alt={ad.title || ""} className="w-full object-cover max-h-36 group-hover:scale-[1.01] transition-transform" />
                          }
                          {ad.title && (
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                              <p className="text-white text-xs font-bold truncate">{ad.title}</p>
                            </div>
                          )}
                          <span className="absolute top-2 right-2 text-[9px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full">Patrocinado</span>
                        </div>
                      ) : (
                        <div className="bg-muted px-4 py-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
                          <span className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-0.5">Ver mais</span>
                        </div>
                      )}
                    </div>
                  );
                  return ad.destination_url
                    ? <a key={ad.id} href={ad.destination_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
                    : <div key={ad.id}>{inner}</div>;
                })}
              </div>
            )}

            {/* Sponsored sellers tablet+ */}
            {sponsoredSellers.length > 0 && (
              <div className="hidden md:block mt-4">
                <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                <div className="grid grid-cols-2 gap-3">
                  {sponsoredSellers.map((s: any) => (
                    <div key={s.id} onClick={() => navigate(`/vendedor/${s.id}`)}
                      className="bg-card rounded-card border border-border p-3 hover:shadow-md transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        {s.avatar_url
                          ? <img src={s.avatar_url} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                          : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Store className="w-4 h-4 text-primary" /></div>}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                          {s.total_sales != null && <p className="text-[10px] text-muted-foreground">{s.total_sales} vendas</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{s.rating ? `⭐ ${s.rating}` : ""}</span>
                        <span className="px-2 py-1 rounded-card text-primary border border-primary/20 font-bold">Ver loja</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT ────────────────────────────────────────────────── */}
          <div>
            {/* Title tablet+ */}
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

            {/* ── Publicador ── */}
            <SellerCard seller={publisher} onNavigate={handlePublisherNavigate} isLoading={loadingPublisher} />

            {/* Price */}
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

              {/* Variantes */}
              {Object.keys(variantGroups).length > 0 && (
                <div className="mt-4 space-y-3">
                  {Object.entries(variantGroups).map(([type, variants]) => {
                    const selId = selectedVariants[type];
                    return (
                      <div key={type}>
                        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
                          {typeLabels[type] || type}
                          {selId && <span className="text-foreground ml-1">: {variants.find((v: any) => v.id === selId)?.name}</span>}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v: any) => {
                            const isSel = selId === v.id;
                            if (type === "color" && v.value?.startsWith("#")) {
                              return (
                                <button key={v.id}
                                  onClick={() => {
                                    setSelectedVariants(p => ({ ...p, [type]: isSel ? "" : v.id }));
                                    if (isSel) setSelectedSubVariants({});
                                  }}
                                  className={`relative rounded-lg border-2 overflow-hidden transition ${isSel ? "border-primary ring-1 ring-primary" : "border-border"}`}
                                  title={v.name}>
                                  {v.image_url
                                    ? <img src={v.image_url} alt={v.name} className="w-10 h-10 object-cover" />
                                    : <div className="w-10 h-10 flex items-center justify-center"><div className="w-7 h-7 rounded-full border border-border" style={{ backgroundColor: v.value }} /></div>}
                                  {v.price_override && <span className="absolute bottom-0 inset-x-0 text-center bg-background/80 text-[7px] font-bold leading-tight py-0.5">{fmt(v.price_override)}</span>}
                                </button>
                              );
                            }
                            return (
                              <button key={v.id}
                                onClick={() => {
                                  setSelectedVariants(p => ({ ...p, [type]: isSel ? "" : v.id }));
                                  if (isSel) setSelectedSubVariants({});
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSel ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:border-primary/50"}`}>
                                {v.name}
                                {v.price_override && <span className="block text-[9px] font-normal opacity-80">{fmt(v.price_override)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {Object.entries(childGroups).map(([type, variants]) => {
                    const selId = selectedSubVariants[type];
                    return (
                      <div key={`sub-${type}`}>
                        <p className="text-[11px] font-bold text-muted-foreground mb-1.5">
                          {typeLabels[type] || type}
                          {selId && <span className="text-foreground ml-1">: {variants.find((v: any) => v.id === selId)?.name}</span>}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v: any) => {
                            const isSel = selId === v.id;
                            return (
                              <button key={v.id}
                                onClick={() => setSelectedSubVariants(p => ({ ...p, [type]: isSel ? "" : v.id }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSel ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:border-primary/50"}`}>
                                {v.name}
                                {v.price_override && <span className="block text-[9px] font-normal opacity-80">{fmt(v.price_override)}</span>}
                                {v.stock != null && v.stock <= 3 && v.stock > 0 && <span className="block text-[8px] text-amber-500">Restam {v.stock}</span>}
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

              {/* CTAs desktop */}
              <div className="hidden md:block mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-card">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Minus className="w-4 h-4" /></button>
                    <span className="w-9 text-center text-sm font-bold">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Plus className="w-4 h-4" /></button>
                  </div>
                  <button onClick={handleAddToCart} disabled={addToCart.isPending}
                    className="flex-1 py-3 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Adicionar ao carrinho
                  </button>
                </div>
                <button onClick={handleBuyNow} disabled={addToCart.isPending}
                  className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {addToCart.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Comprar agora
                </button>
              </div>
            </div>

            {/* Entrega */}
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

            {/* Descrição */}
            <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
              <h3 className="text-sm font-bold text-foreground mb-2">Descrição</h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || "Produto de alta qualidade disponível no Kwanza Market."}
              </p>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1.5">
                <li>• Produto original com garantia</li>
                <li>• Envio para todo o país</li>
                <li>• Pagamento seguro</li>
                <li>• Suporte ao cliente 24/7</li>
              </ul>
            </div>

            {/* Sponsored sellers mobile */}
            {sponsoredSellers.length > 0 && (
              <div className="md:hidden bg-card mt-2 p-4">
                <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                {sponsoredSellers.map((s: any, i: number) => (
                  <div key={s.id} onClick={() => navigate(`/vendedor/${s.id}`)}
                    className={`flex items-center gap-3 py-3 cursor-pointer ${i !== sponsoredSellers.length - 1 ? "border-b border-border" : ""}`}>
                    {s.avatar_url
                      ? <img src={s.avatar_url} alt={s.name} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Store className="w-4 h-4 text-primary" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.rating ? `⭐ ${s.rating}` : ""}{s.total_sales != null ? ` • ${s.total_sales} vendas` : ""}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 flex-shrink-0">Ver loja</span>
                  </div>
                ))}
              </div>
            )}

            {/* Produto patrocinado */}
            {(() => {
              const sp: any = (sponsoredProducts as any[]).find((p: any) => p.id !== product.id);
              if (!sp) return null;
              return (
                <div className="bg-card mt-2 p-4 md:rounded-card md:border md:border-border">
                  <p className="text-[10px] text-muted-foreground text-right mb-2">Patrocinado</p>
                  <div onClick={() => navigate(`/produto/${sp.id}`)}
                    className="flex items-center gap-3 p-3 border border-border rounded-card cursor-pointer hover:bg-muted/50 transition">
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
      <ProductReviewsSection
        productId={id || ""} product={product}
        dbReviews={dbReviews} userOrders={userOrders}
      />

      {/* Carrosséis */}
      {[
        { title: "Produtos relacionados", list: relatedProducts },
        { title: "Mais para explorar",    list: moreToExplore   },
        { title: "Também pode gostar",    list: alsoLike        },
      ].map(({ title, list }) => list.length > 0 && (
        <div key={title} className="mt-2 bg-card p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-foreground">{title}</h3>
            <span className="text-[10px] text-muted-foreground">Patrocinado</span>
          </div>
          <ProductCarousel>
            {list.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </ProductCarousel>
        </div>
      ))}

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-3 pt-2 pb-4 z-50 md:hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground font-semibold">Qtd:</span>
          <div className="flex items-center border border-border rounded-lg">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Minus className="w-3.5 h-3.5" /></button>
            <span className="w-8 text-center text-sm font-bold">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted transition"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <span className="text-sm font-black text-foreground ml-auto">{activePrice}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddToCart} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full border-2 border-primary text-primary font-bold text-sm hover:bg-primary/5 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
            {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Carrinho
          </button>
          <button onClick={handleBuyNow} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
            Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reviews Section ──────────────────────────────────────────────────────────
const ProductReviewsSection = ({
  productId, product, dbReviews, userOrders,
}: { productId: string; product: any; dbReviews: any[]; userOrders: any[] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo]   = useState<string | null>(null);
  const [replyText, setReplyText]     = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImage, setReviewImage] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showForm, setShowForm]       = useState(false);

  const reviews        = dbReviews.length > 0 ? dbReviews : null;
  const alreadyReviewed = reviews?.some((r: any) => r.user_id === user?.id);
  const canReview      = user && userOrders.length > 0 && !alreadyReviewed;

  const uploadImg = async (file: File) => {
    setUploadingImg(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `reviews/${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("products").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("products").getPublicUrl(path);
      setReviewImage(data.publicUrl);
    } catch (e: any) { console.error(e.message); }
    setUploadingImg(false);
  };

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId, user_id: user!.id, order_id: userOrders[0]?.id,
        rating: reviewRating, comment: reviewComment || null, image_url: reviewImage || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      setReviewComment(""); setReviewRating(5); setReviewImage(""); setShowForm(false);
    },
  });

  const submitReply = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("review_replies").insert({
        review_id: reviewId, review_type: "product",
        user_id: user!.id, content: replyText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      setReplyText(""); setReplyingTo(null);
    },
  });

  return (
    <div className="bg-card mt-2 p-4 md:container md:mx-auto md:rounded-card md:border md:border-border md:my-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-black text-foreground">Avaliações dos clientes</h3>
        {canReview && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
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

      {showForm && canReview && (
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
          <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
            placeholder="Escreva a sua opinião (opcional)..." rows={3}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground resize-none" />
          <div className="mt-3">
            {reviewImage ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                <img src={reviewImage} alt="Anexo" className="w-full h-full object-cover" />
                <button onClick={() => setReviewImage("")}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold cursor-pointer hover:bg-accent">
                {uploadingImg ? "A enviar..." : "📷 Adicionar foto"}
                <input type="file" accept="image/*" disabled={uploadingImg} className="hidden"
                  onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full text-xs font-bold text-muted-foreground">Cancelar</button>
            <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 flex items-center gap-1">
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
                {review.profile?.avatar_url ? (
                  <img src={review.profile.avatar_url} alt={review.profile.full_name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {(review.profile?.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-xs font-bold text-foreground">{review.profile?.full_name || "Utilizador"}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
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
              {user && (
                <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2">
                  <MessageCircle className="w-3 h-3" /> Responder
                </button>
              )}
              {replyingTo === review.id && user && (
                <div className="ml-6 mt-2 flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Escrever resposta..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  <button onClick={() => submitReply.mutate(review.id)}
                    disabled={!replyText.trim() || submitReply.isPending}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
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
          <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a avaliar após a compra.</p>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
