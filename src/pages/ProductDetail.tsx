import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield,
  MapPin, ChevronRight, Minus, Plus, ZoomIn, Store, MessageCircle,
  Send, Loader2, ShieldCheck, X, Building2, Link2, ClipboardList,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddToCart } from "@/hooks/useCartActions";
import { useFavorites } from "@/hooks/useFavorites";
import ProductCarousel from "@/components/ProductCarousel";
import { toast } from "sonner";

const fmt = (n: number) =>
  Number(n).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const conditionLabels: Record<string, string> = {
  new: "Novo",
  like_new: "Como novo",
  good: "Bom estado",
  used: "Usado",
  refurbished: "Recondicionado",
};

// ─── Minimal Related Product Card ─────────────────────────────────────────────
const MinimalProductCard = ({ product, onClick }: { product: any; onClick?: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer group flex flex-col"
      style={{ width: 160, minWidth: 160 }}
    >
      <div className="w-full aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: "#f5ede4" }}>
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="mt-1.5 px-0.5 py-1 rounded-lg" style={{ backgroundColor: "#faf3ee" }}>
        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: "#7a4f2e" }}>
          {product.title}
        </p>
      </div>
    </div>
  );
};

// ─── Smart Tracking Hook ───────────────────────────────────────────────────────
const useProductTracking = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(async (
    productId: string,
    eventType: "view" | "card_tap" | "add_to_cart" | "buy_now" | "favorite" | "share" | "image_zoom" | "variant_select" | "review_read" | "seller_view",
    metadata: Record<string, any> = {}
  ) => {
    try {
      const sessionId = sessionStorage.getItem("kw_session_id") || (() => {
        const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("kw_session_id", id);
        return id;
      })();

      await (supabase as any).from("product_tracking_events").insert({
        product_id: productId,
        event_type: eventType,
        user_id: user?.id || null,
        session_id: sessionId,
        metadata: {
          ...metadata,
          user_agent: navigator.userAgent,
          screen_width: window.innerWidth,
          platform: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
          timestamp: new Date().toISOString(),
          referrer: document.referrer || null,
          url: window.location.href,
        },
      });
    } catch (_) {}
  }, [user?.id]);

  return { trackEvent };
};

// ─── Share Sheet ──────────────────────────────────────────────────────────────
const ShareSheet = ({
  title, imageUrl, url, description, price, onClose,
}: {
  title: string;
  imageUrl: string;
  url: string;
  description?: string;
  price?: string;
  onClose: () => void;
}) => {
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);

  const shortDesc = description
    ? description.slice(0, 120).trim() + (description.length > 120 ? "…" : "")
    : "";
  const shareText = [
    price ? `💰 ${price}` : "",
    shortDesc,
    "📦 ZANGU — zangu.ao",
  ].filter(Boolean).join("\n");

  const fetchImageFile = async (): Promise<File | null> => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      return new File([blob], `produto.${ext}`, { type: blob.type });
    } catch {
      return null;
    }
  };

  const handleNative = async () => {
    setSharing(true);
    try {
      if (navigator.share && navigator.canShare) {
        const imgFile = await fetchImageFile();
        if (imgFile && navigator.canShare({ files: [imgFile] })) {
          await navigator.share({ title, text: shareText, url, files: [imgFile] });
          onClose();
          setSharing(false);
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
        onClose();
        setSharing(false);
        return;
      }
      await navigator.clipboard.writeText(`${title}\n${shareText}\n${url}`);
      toast.success("Link copiado!");
      onClose();
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Não foi possível partilhar");
      }
    }
    setSharing(false);
    onClose();
  };

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
    setCopying(false);
    onClose();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n${price ? `💰 ${price}\n` : ""}${shortDesc ? `${shortDesc}\n` : ""}${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl pb-8 pt-2 px-4 shadow-2xl"
        style={{ background: "#fffaf6", border: "1.5px solid #e8d5c0", borderBottom: "none" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4 mt-2" style={{ background: "#d4b8a0" }} />

        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9a7060" }}>
          Partilhar produto
        </p>

        <div
          className="flex items-center gap-3 p-3 rounded-2xl mb-5"
          style={{ background: "#f5ede4", border: "1px solid #e8d5c0" }}
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#ecdece" }}>
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#2d1505" }}>{title}</p>
            {price && <p className="text-xs font-black mt-0.5" style={{ color: "#c0522a" }}>{price}</p>}
            {shortDesc && (
              <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "#9a7060" }}>{shortDesc}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <button
            onClick={handleNative}
            disabled={sharing}
            className="flex flex-col items-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60"
            style={{ background: "#c0522a", border: "none" }}
          >
            {sharing
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Share2 className="w-5 h-5 text-white" />
            }
            <span className="text-[10px] font-bold text-white leading-tight text-center">
              {sharing ? "A preparar…" : "Partilhar\ncom imagem"}
            </span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-all"
            style={{ background: "#25D366", border: "none" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-[10px] font-bold text-white leading-tight text-center">WhatsApp</span>
          </button>

          <button
            onClick={handleCopyLink}
            disabled={copying}
            className="flex flex-col items-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-60"
            style={{ background: "#f0e8e0", border: "1.5px solid #e8d5c0" }}
          >
            {copying
              ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#7a5840" }} />
              : <Link2 className="w-5 h-5" style={{ color: "#7a5840" }} />
            }
            <span className="text-[10px] font-bold leading-tight text-center" style={{ color: "#7a5840" }}>
              Copiar link
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl text-sm font-bold transition"
          style={{ background: "#f0e8e0", color: "#9a7060" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Zoom Lightbox ─────────────────────────────────────────────────────────────
const ZoomLightbox = ({
  images, index, onClose, onChange, onShare,
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
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
        <span className="text-white/60 text-xs font-medium">{index + 1} / {images.length}</span>
        <button onClick={onShare} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Share2 className="w-4 h-4 text-white" /></button>
      </div>
      <div
        className="flex-1 flex items-center justify-center px-2 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchRef.current === null) return;
          const diff = touchRef.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40)
            onChange(diff > 0 ? Math.min(index + 1, images.length - 1) : Math.max(index - 1, 0));
          touchRef.current = null;
        }}
      >
        {images[index]?.type === "video"
          ? <video src={images[index].url} controls className="max-w-full max-h-full rounded-lg" />
          : <img src={images[index]?.url} alt="" className="max-w-full max-h-full object-contain" />}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 py-5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {images.map((_, i) => (
            <button key={i} onClick={() => onChange(i)}
              className={`rounded-full transition-all duration-200 ${i === index ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"}`} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Avatar With Fallback ──────────────────────────────────────────────────────
const AvatarWithFallback = ({ src, name, isCompany }: { src: string | null; name: string; isCompany: boolean }) => {
  const [imgOk, setImgOk] = useState<boolean | null>(src ? null : false);

  if (src && imgOk !== false) {
    return (
      <img src={src} alt={name}
        className="w-12 h-12 rounded-full object-cover border-2 border-border bg-muted"
        onLoad={() => setImgOk(true)}
        onError={() => setImgOk(false)} />
    );
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center">
      {isCompany ? <Building2 className="w-5 h-5 text-primary" /> : <Store className="w-5 h-5 text-primary" />}
    </div>
  );
};

// ─── Seller Card ───────────────────────────────────────────────────────────────
const SellerCard = ({ seller, onNavigate, isLoading = false }: { seller: any; onNavigate: () => void; isLoading?: boolean }) => {
  if (isLoading) return (
    <div
      className="mt-0.5 md:mt-0 md:mb-3 px-4 py-3 md:rounded-2xl flex items-center gap-3 animate-pulse"
      style={{ background: "#fdf6f0", border: "1px solid #e8d5c0" }}
    >
      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "#ecdece" }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded w-32" style={{ background: "#ecdece" }} />
        <div className="h-2.5 rounded w-20" style={{ background: "#ecdece" }} />
      </div>
    </div>
  );
  if (!seller) return null;

  const avatar: string | null = seller.logo_url || seller.avatar_url || null;
  const isCompany = seller.__type === "company";
  const province = seller.province ? String(seller.province).replace(/0+$/, "").trim() : null;

  return (
    <button onClick={onNavigate}
      className="w-full mt-0.5 md:mt-0 md:mb-3 px-4 py-3 md:rounded-2xl flex items-center gap-3 cursor-pointer active:opacity-80 transition-colors group text-left"
      style={{ background: "#fdf6f0", border: "1px solid #e8d5c0" }}
    >
      <div className="relative flex-shrink-0">
        <AvatarWithFallback src={avatar} name={seller.name} isCompany={isCompany} />
        {seller.is_verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold truncate" style={{ color: "#4a2810" }}>{seller.name}</p>
          {isCompany && (
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 flex-shrink-0">Empresa</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {province && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#9a7060" }}>
              <MapPin className="w-3 h-3" />{province}
            </span>
          )}
          {seller.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#9a7060" }}>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{seller.rating}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold hidden sm:block" style={{ color: "#c0522a" }}>Ver perfil</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "#c0522a" }} />
      </div>
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const { trackEvent } = useProductTracking();

  const { isFavorite, toggleFavorite } = useFavorites();

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSubVariants, setSelectedSubVariants] = useState<Record<string, string>>({});
  const [zoomOpen, setZoomOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const viewTracked = useRef(false);

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

  const { data: productAds = [] } = useQuery({
    queryKey: ["product_ads_detail"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("ads").select("id, title, media_url, media_type, destination_url").eq("type", "banner").eq("is_active", true).order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
  });

  const rawSellerId = (dbProduct as any)?.seller_id || (dbProduct as any)?.sellers?.id || null;
  const rawCompanyId = (dbProduct as any)?.company_id || null;

  const { data: sellerFull, isLoading: loadingSeller } = useQuery({
    queryKey: ["seller_full", rawSellerId],
    queryFn: async () => {
      const { data } = await supabase.from("sellers").select("id, name, logo_url, avatar_url, is_verified, province, rating, total_sales, type, user_id").eq("id", rawSellerId!).maybeSingle();
      return data ? { ...data, __type: "seller" } : null;
    },
    enabled: !!rawSellerId,
  });

  const { data: companyFull, isLoading: loadingCompany } = useQuery({
    queryKey: ["company_full", rawCompanyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("companies").select("id, name, logo_url, is_verified, province, rating, total_reviews, total_sales").eq("id", rawCompanyId!).maybeSingle();
      return data ? { ...data, __type: "company" } : null;
    },
    enabled: !!rawCompanyId,
  });

  const loadingPublisher = (!!rawSellerId && loadingSeller) || (!!rawCompanyId && loadingCompany);
  const publisher: any = sellerFull || companyFull || null;

  useEffect(() => {
    if (!dbProduct || !isUuid || viewTracked.current) return;
    viewTracked.current = true;
    const p = dbProduct as any;
    trackEvent(id!, "view", {
      title: p.title,
      price: p.price,
      old_price: p.old_price,
      discount_percent: p.discount_percent,
      category_id: p.category_id,
      seller_id: p.seller_id,
      company_id: p.company_id,
      rating: p.rating,
      total_reviews: p.total_reviews,
      free_shipping: p.free_shipping,
      badge: p.badge,
      is_sponsored: p.is_sponsored,
      description_length: p.description?.length || 0,
    });
  }, [dbProduct, id, isUuid, trackEvent]);

  const handlePublisherNavigate = () => {
    if (!publisher) return;
    trackEvent(id!, "seller_view", {
      seller_id: publisher.id,
      seller_type: publisher.__type,
      seller_name: publisher.name,
    });
    if (publisher.__type === "company") navigate(`/empresa/${publisher.id ?? rawCompanyId}`);
    else navigate(`/vendedor/${publisher.id ?? rawSellerId}`);
  };

  const handleFavorite = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    trackEvent(id!, "favorite", { action: isFavorite(id!) ? "remove" : "add" });
    toggleFavorite(id!);
  };

  const getVariantId = () =>
    Object.values(selectedSubVariants).find(Boolean) || Object.values(selectedVariants).find(Boolean) || undefined;

  const handleAddToCart = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    trackEvent(id!, "add_to_cart", { quantity: qty, variant_id: getVariantId() });
    addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() });
  };

  const handleBuyNow = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    trackEvent(id!, "buy_now", { quantity: qty, variant_id: getVariantId() });
    addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() }, { onSuccess: () => navigate("/checkout") });
  };

  const handleShare = () => {
    trackEvent(id!, "share", { method: navigator.share ? "native" : "clipboard" });
    setShareOpen(true);
  };

  const handleZoom = () => {
    trackEvent(id!, "image_zoom", { image_index: selectedImage });
    setZoomOpen(true);
  };

  const { data: userOrders = [] } = useQuery({
    queryKey: ["user_delivered_orders_for_product", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, order_items!inner(product_id)").eq("user_id", user!.id).eq("status", "delivered").eq("order_items.product_id", id!);
      if (error) return [];
      return data || [];
    },
    enabled: !!user && !!isUuid,
  });

  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product_reviews_detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_reviews").select("*").eq("product_id", id!).order("created_at", { ascending: false });
      if (error) return [];
      const uids = [...new Set((data || []).map((r: any) => r.user_id))];
      let pMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uids);
        pMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      const rids = (data || []).map((r: any) => r.id);
      let repMap: Record<string, any[]> = {};
      if (rids.length > 0) {
        const { data: reps } = await supabase.from("review_replies").select("*").in("review_id", rids).order("created_at");
        if (reps) {
          const ruids = [...new Set(reps.map((r: any) => r.user_id))];
          let rpMap: Record<string, any> = {};
          if (ruids.length > 0) {
            const { data: rp } = await supabase.from("profiles").select("id, full_name").in("id", ruids);
            rpMap = Object.fromEntries((rp || []).map((p: any) => [p.id, p]));
          }
          reps.forEach((r: any) => {
            if (!repMap[r.review_id]) repMap[r.review_id] = [];
            repMap[r.review_id].push({ ...r, profile: rpMap[r.user_id] || null });
          });
        }
      }
      return (data || []).map((r: any) => ({ ...r, profile: pMap[r.user_id] || null, replies: repMap[r.id] || [] }));
    },
    enabled: !!isUuid,
  });

  const categoryId = (dbProduct as any)?.category_id;
  const { data: relatedDb = [] } = useQuery({
    queryKey: ["related_products", id, categoryId, rawSellerId],
    queryFn: async () => {
      const collected: any[] = [];
      const seen = new Set<string>([id!]);
      const fetchSet = async (filter: (q: any) => any, limit: number) => {
        const { data } = await filter(supabase.from("products").select("*").eq("is_active", true).neq("id", id!).limit(limit));
        (data || []).forEach((p: any) => { if (!seen.has(p.id)) { seen.add(p.id); collected.push(p); } });
      };
      if (categoryId) await fetchSet(q => q.eq("category_id", categoryId).order("sales_count", { ascending: false }), 30);
      if (rawSellerId && collected.length < 30) await fetchSet(q => q.eq("seller_id", rawSellerId).order("sales_count", { ascending: false }), 20);
      if (collected.length < 30) await fetchSet(q => q.order("sales_count", { ascending: false }), 30);
      const ids = collected.map((p: any) => p.id);
      const cMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: m } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; });
      }
      return collected.map((p: any) => ({
        id: p.id, title: p.title, price: fmt(p.price),
        oldPrice: p.old_price ? fmt(p.old_price) : undefined,
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
        rating: p.rating || undefined, reviews: p.total_reviews || undefined,
        freeShipping: p.free_shipping || false, badge: p.badge || undefined,
      }));
    },
    enabled: !!isUuid && !!dbProduct,
  });

  const { data: sponsoredProducts = [] } = useQuery({
    queryKey: ["sponsored_products", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("id, title, price, old_price, discount_percent, image_url, free_shipping, badge, rating, total_reviews, sellers(id, name, avatar_url, rating, total_sales)").eq("is_active", true).eq("is_sponsored", true).neq("id", id!).limit(6);
      const list = data || [];
      const ids = list.map((p: any) => p.id);
      const cMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: m } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; });
      }
      return list.map((p: any) => ({ ...p, image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", priceFormatted: fmt(p.price) }));
    },
    enabled: !!isUuid,
  });

  if (!dbProduct && isUuid && loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fdf6f0" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c0522a" }} />
      </div>
    );
  }

  const staticProduct = allProducts.find(p => p.id === Number(id));
  const productBase: any = dbProduct || staticProduct;
  if (!productBase) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: "#fdf6f0" }}>
        <div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "#4a2810" }}>Produto não encontrado</h2>
          <button onClick={() => navigate("/")} className="text-sm font-semibold" style={{ color: "#c0522a" }}>Voltar à home</button>
        </div>
      </div>
    );
  }

  const coverUrl =
    dbMedia.find((m: any) => m.is_cover)?.url || dbMedia[0]?.url || productBase.image_url ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";

  const product = {
    id: productBase.id, title: productBase.title, price: fmt(productBase.price),
    oldPrice: productBase.old_price ? fmt(productBase.old_price) : undefined,
    discount: productBase.discount_percent ? `-${productBase.discount_percent}%` : undefined,
    image: coverUrl, rating: productBase.rating || undefined,
    reviews: productBase.total_reviews || undefined, freeShipping: productBase.free_shipping || false,
    badge: productBase.badge || undefined, description: productBase.description || "",
    category_id: productBase.category_id,
    seller_id: productBase.seller_id,
    company_id: productBase.company_id,
    sku: productBase.sku || null,
    condition: productBase.condition || null,
    weight_kg: productBase.weight_kg || null,
    length_cm: productBase.length_cm || null,
    width_cm: productBase.width_cm || null,
    height_cm: productBase.height_cm || null,
  };

  const { data: categoryName } = useQuery({
    queryKey: ["category_name_detail", product.category_id],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").eq("id", product.category_id!).maybeSingle();
      return data?.name || null;
    },
    enabled: !!product.category_id,
  });

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
  const allSelIds = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants)].filter(Boolean);
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelIds.includes(v.id) && v.price_override);
  const activePrice = activeVariant?.price_override ? fmt(activeVariant.price_override) : product.price;
  const variantImage = activeVariant?.image_url || null;

  const images = dbMedia.length > 0 ? dbMedia.map((m: any) => ({ url: m.url, type: m.type || "image" })) : [{ url: product.image, type: "image" }];
  const displayImages = variantImage ? [{ url: variantImage, type: "image" }, ...images.filter(i => i.url !== variantImage)] : images;
  const currentImageUrl = displayImages[selectedImage]?.url || product.image;

  const isFavorited = isFavorite(id!);

  const relatedProducts = relatedDb.slice(0, 10);
  const moreToExplore = relatedDb.slice(10, 20);
  const alsoLike = relatedDb.length > 5 ? relatedDb.slice(5, 15) : relatedDb.slice(0, 10);
  const popularityBadge = product.reviews && product.reviews > 200 ? `Em ${Math.floor(product.reviews / 5)}+ carrinhos` : null;

  const typeLabels: Record<string, string> = {
    color: "Cor", size: "Tamanho", material: "Material", style: "Estilo",
    weight: "Peso", capacity: "Capacidade", model: "Modelo",
    voltage: "Voltagem", pack: "Pacote", other: "Opção",
  };

  // ── Especificações (estilo tabela B2B) ──
  const dimensionsStr = (product.length_cm && product.width_cm && product.height_cm)
    ? `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm`
    : null;

  const specRows: { label: string; value: string }[] = [
    categoryName ? { label: "Categoria", value: categoryName } : null,
    product.condition ? { label: "Condição", value: conditionLabels[product.condition] || product.condition } : null,
    product.sku ? { label: "SKU", value: product.sku } : null,
    product.weight_kg ? { label: "Peso", value: `${product.weight_kg} kg` } : null,
    dimensionsStr ? { label: "Dimensões", value: dimensionsStr } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen pb-28 md:pb-0" style={{ background: "#faf5f0" }}>
      {shareOpen && (
        <ShareSheet
          title={product.title}
          imageUrl={currentImageUrl}
          url={window.location.href}
          description={product.description}
          price={activePrice}
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

      {/* ── HEADER (mobile) ── */}
      <div className="relative md:hidden">

        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe-or-3 pt-3 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ background: "rgba(253,246,240,0.82)", border: "1px solid rgba(255,255,255,0.4)" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#4a2810" }} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md"
              style={{ background: "rgba(253,246,240,0.82)", border: "1px solid rgba(255,255,255,0.4)" }}
            >
              <Share2 className="w-4 h-4" style={{ color: "#4a2810" }} />
            </button>
            <button
              onClick={handleFavorite}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 active:scale-90"
              style={{ background: isFavorited ? "#c0522a" : "rgba(253,246,240,0.82)", border: "1px solid rgba(255,255,255,0.4)" }}
              aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart
                className="w-4 h-4 transition-all duration-200"
                style={{
                  color: isFavorited ? "#fff" : "#c0522a",
                  fill: isFavorited ? "#fff" : "none",
                  transform: isFavorited ? "scale(1.15)" : "scale(1)",
                }}
              />
            </button>
          </div>
        </div>

        <div
          className="relative overflow-hidden"
          style={{ background: "#f0e4d8" }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) setSelectedImage(i => diff > 0 ? Math.min(i + 1, displayImages.length - 1) : Math.max(i - 1, 0));
            touchStartX.current = null;
          }}
        >
          <div className="w-full" style={{ aspectRatio: "1/1", maxHeight: 420 }}>
            {displayImages[selectedImage]?.type === "video"
              ? <video src={displayImages[selectedImage].url} controls className="w-full h-full object-cover" />
              : <img src={displayImages[selectedImage]?.url} alt={product.title} className="w-full h-full object-cover" style={{ maxHeight: 420 }} />
            }
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)" }} />

          {product.discount && (
            <div className="absolute top-14 left-4 px-2 py-1 rounded-lg text-xs font-black text-white"
              style={{ background: "#c0522a" }}>
              {product.discount}
            </div>
          )}
          {product.badge === "HOT" && (
            <div className="absolute top-14 left-4 px-2 py-1 rounded-lg text-xs font-black text-white"
              style={{ background: "#c0522a" }}>
              🔥 Hot
            </div>
          )}

          <button
            onClick={handleZoom}
            className="absolute bottom-16 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>

          {displayImages.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto scrollbar-hide">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className="flex-shrink-0 transition-all duration-200"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: i === selectedImage ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.35)",
                    opacity: i === selectedImage ? 1 : 0.65,
                    boxShadow: i === selectedImage ? "0 2px 8px rgba(0,0,0,0.35)" : "none",
                    transform: i === selectedImage ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {img.type === "video"
                    ? <video src={img.url} className="w-full h-full object-cover" />
                    : <img src={img.url} alt="" className="w-full h-full object-cover" />
                  }
                </button>
              ))}
            </div>
          )}

          {displayImages.length > 1 && displayImages.length <= 3 && (
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {displayImages.map((_, i) => (
                <span key={i} className={`rounded-full transition-all duration-200 ${i === selectedImage ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`} />
              ))}
            </div>
          )}
        </div>

        <div
          className="px-4 pt-4 pb-3"
          style={{ background: "#fffaf6", borderBottom: "1px solid #ecdece" }}
        >
          {product.rating && (
            <div className="flex items-center gap-1 mb-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "fill-amber-400 text-amber-400" : "text-[#ddd]"}`} />
              ))}
              <span className="text-xs ml-1" style={{ color: "#9a7060" }}>
                {product.rating} · {product.reviews} avaliações
              </span>
            </div>
          )}
          <h1 className="text-base font-bold leading-snug" style={{ color: "#2d1505" }}>{product.title}</h1>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {popularityBadge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100">
                🛒 {popularityBadge}
              </span>
            )}
            {product.freeShipping && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ color: "#1a5c3a", background: "#e8f4ef" }}>
                <Truck className="w-3 h-3" /> Frete grátis
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="md:container md:mx-auto md:px-4 md:py-6">
        <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-10">

          {/* LEFT (desktop apenas) — estilo galeria B2B: miniaturas em coluna à esquerda */}
          <div className="hidden md:block">

            <div className="rounded-2xl overflow-hidden border p-3" style={{ background: "#f5ede4", borderColor: "#e8d5c0" }}>
              <div className="flex gap-3">
                {/* Coluna de miniaturas verticais */}
                {displayImages.length > 1 && (
                  <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 450 }}>
                    {displayImages.map((img, i) => (
                      <button key={i} onClick={() => setSelectedImage(i)}
                        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200"
                        style={{
                          border: i === selectedImage ? "2.5px solid #c0522a" : "2px solid #e8d5c0",
                          opacity: i === selectedImage ? 1 : 0.65,
                          transform: i === selectedImage ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        {img.type === "video" ? <video src={img.url} className="w-full h-full object-cover" /> : <img src={img.url} alt="" className="w-full h-full object-cover" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Imagem principal */}
                <div
                  className="relative flex-1 rounded-xl overflow-hidden"
                  style={{ aspectRatio: "1/1", maxHeight: 450, background: "#fffaf6" }}
                  onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={e => {
                    if (touchStartX.current === null) return;
                    const diff = touchStartX.current - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 40) setSelectedImage(i => diff > 0 ? Math.min(i + 1, displayImages.length - 1) : Math.max(i - 1, 0));
                    touchStartX.current = null;
                  }}
                >
                  {displayImages[selectedImage]?.type === "video"
                    ? <video src={displayImages[selectedImage].url} controls className="w-full h-full object-cover" />
                    : <img src={displayImages[selectedImage]?.url} alt={product.title} className="w-full h-full object-cover" />
                  }
                  <div className="absolute right-3 top-3 flex flex-col gap-2">
                    <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md" style={{ background: "rgba(253,246,240,0.92)" }}>
                      <Share2 className="w-4 h-4" style={{ color: "#4a2810" }} />
                    </button>
                    <button
                      onClick={handleFavorite}
                      className="w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90"
                      style={{ background: isFavorited ? "#c0522a" : "rgba(253,246,240,0.92)" }}
                      aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Heart
                        className="w-4 h-4 transition-all duration-200"
                        style={{
                          color: isFavorited ? "#fff" : "#c0522a",
                          fill: isFavorited ? "#fff" : "none",
                          transform: isFavorited ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    </button>
                    <button onClick={handleZoom} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md" style={{ background: "rgba(253,246,240,0.92)" }}>
                      <ZoomIn className="w-4 h-4" style={{ color: "#4a2810" }} />
                    </button>
                  </div>
                  {product.discount && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-black text-white"
                      style={{ background: "#c0522a" }}>
                      {product.discount}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Especificações — estilo tabela B2B */}
            {specRows.length > 0 && (
              <div className="mt-4 rounded-2xl overflow-hidden border" style={{ borderColor: "#e8d5c0" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#f5ede4" }}>
                  <ClipboardList className="w-4 h-4" style={{ color: "#7a4f2e" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#4a2810" }}>Especificações</h3>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {specRows.map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 0 ? "#fffaf6" : "#fdf6f0" }}>
                        <td className="px-4 py-2.5 font-semibold w-1/3" style={{ color: "#9a7060", borderTop: i > 0 ? "1px solid #ecdece" : "none" }}>
                          {row.label}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "#2d1505", borderTop: i > 0 ? "1px solid #ecdece" : "none" }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {productAds.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-[10px] text-right" style={{ color: "#b09080" }}>Publicidade</p>
                {productAds.map((ad: any) => {
                  const isVid = ad.media_type === "video";
                  const inner = (
                    <div className="rounded-2xl overflow-hidden hover:shadow-md transition-all group" style={{ border: "1px solid #e8d5c0" }}>
                      {ad.media_url ? (
                        <div className="relative">
                          {isVid ? <video src={ad.media_url} className="w-full object-cover max-h-36" autoPlay muted loop playsInline /> : <img src={ad.media_url} alt={ad.title || ""} className="w-full object-cover max-h-36 group-hover:scale-[1.01] transition-transform" />}
                          {ad.title && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2"><p className="text-white text-xs font-bold truncate">{ad.title}</p></div>}
                          <span className="absolute top-2 right-2 text-[9px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full">Patrocinado</span>
                        </div>
                      ) : (
                        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#fdf6f0" }}>
                          <p className="text-sm font-bold truncate" style={{ color: "#4a2810" }}>{ad.title}</p>
                          <span className="text-[10px] font-bold border rounded-full px-2 py-0.5" style={{ color: "#c0522a", borderColor: "#e8c0a0" }}>Ver mais</span>
                        </div>
                      )}
                    </div>
                  );
                  return ad.destination_url ? <a key={ad.id} href={ad.destination_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : <div key={ad.id}>{inner}</div>;
                })}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            <div className="hidden md:block mb-4">
              {product.rating && (
                <div className="flex items-center gap-1.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating!) ? "fill-amber-400 text-amber-400" : "text-[#ddd]"}`} />
                  ))}
                  <span className="text-sm ml-1" style={{ color: "#9a7060" }}>({product.rating})</span>
                  <span className="text-sm font-semibold ml-1" style={{ color: "#c0522a" }}>| {product.reviews} avaliações</span>
                </div>
              )}
              <h1 className="text-xl font-bold leading-snug" style={{ color: "#2d1505" }}>{product.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {popularityBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100">
                    🛒 {popularityBadge}
                  </span>
                )}
                {product.freeShipping && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ color: "#1a5c3a", background: "#e8f4ef" }}>
                    <Truck className="w-3 h-3" /> Frete grátis
                  </span>
                )}
              </div>
            </div>

            <SellerCard seller={publisher} onNavigate={handlePublisherNavigate} isLoading={loadingPublisher} />

            {/* Preço + Variantes */}
            <div className="mt-0.5 md:mt-0 p-4 md:rounded-2xl" style={{ background: "#fffaf6", border: "1px solid #ecdece" }}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black" style={{ color: "#2d1505" }}>{activePrice}</span>
                {product.discount && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: "#c0522a", background: "#fff0ed" }}>
                    Poupa {product.discount}
                  </span>
                )}
              </div>
              {product.oldPrice && (
                <span className="text-sm line-through mt-0.5 block" style={{ color: "#b09080" }}>{product.oldPrice}</span>
              )}
              {product.freeShipping && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold" style={{ color: "#1a5c3a" }}>
                  <Truck className="w-4 h-4" /><span>Frete grátis para Luanda</span>
                </div>
              )}

              {Object.keys(variantGroups).length > 0 && (
                <div className="mt-4 space-y-3">
                  {Object.entries(variantGroups).map(([type, variants]) => {
                    const selId = selectedVariants[type];
                    return (
                      <div key={type}>
                        <p className="text-[11px] font-bold mb-1.5" style={{ color: "#9a7060" }}>
                          {typeLabels[type] || type}
                          {selId && <span className="ml-1" style={{ color: "#4a2810" }}>: {variants.find((v: any) => v.id === selId)?.name}</span>}
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
                                    trackEvent(id!, "variant_select", { variant_type: type, variant_name: v.name, variant_id: v.id });
                                  }}
                                  className="relative rounded-xl overflow-hidden transition-all"
                                  style={{ border: isSel ? "2.5px solid #c0522a" : "2px solid #e8d5c0" }}
                                  title={v.name}
                                >
                                  {v.image_url ? <img src={v.image_url} alt={v.name} className="w-10 h-10 object-cover" /> : <div className="w-10 h-10 flex items-center justify-center"><div className="w-7 h-7 rounded-full border border-border" style={{ backgroundColor: v.value }} /></div>}
                                  {v.price_override && <span className="absolute bottom-0 inset-x-0 text-center bg-black/60 text-[7px] font-bold leading-tight py-0.5 text-white">{fmt(v.price_override)}</span>}
                                </button>
                              );
                            }
                            return (
                              <button key={v.id}
                                onClick={() => {
                                  setSelectedVariants(p => ({ ...p, [type]: isSel ? "" : v.id }));
                                  if (isSel) setSelectedSubVariants({});
                                  trackEvent(id!, "variant_select", { variant_type: type, variant_name: v.name, variant_id: v.id });
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                style={{
                                  background: isSel ? "#c0522a" : "#fdf6f0",
                                  color: isSel ? "#fff" : "#4a2810",
                                  border: isSel ? "1.5px solid #c0522a" : "1.5px solid #e8d5c0",
                                }}
                              >
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
                        <p className="text-[11px] font-bold mb-1.5" style={{ color: "#9a7060" }}>
                          {typeLabels[type] || type}
                          {selId && <span className="ml-1" style={{ color: "#4a2810" }}>: {variants.find((v: any) => v.id === selId)?.name}</span>}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {variants.map((v: any) => {
                            const isSel = selId === v.id;
                            return (
                              <button key={v.id}
                                onClick={() => {
                                  setSelectedSubVariants(p => ({ ...p, [type]: isSel ? "" : v.id }));
                                  trackEvent(id!, "variant_select", { variant_type: type, variant_name: v.name, variant_id: v.id });
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                                style={{
                                  background: isSel ? "#c0522a" : "#fdf6f0",
                                  color: isSel ? "#fff" : "#4a2810",
                                  border: isSel ? "1.5px solid #c0522a" : "1.5px solid #e8d5c0",
                                }}
                              >
                                {v.name}
                                {v.price_override && <span className="block text-[9px] font-normal opacity-80">{fmt(v.price_override)}</span>}
                                {v.stock != null && v.stock <= 3 && v.stock > 0 && <span className="block text-[8px] text-amber-500">Restam {v.stock}</span>}
                                {v.stock === 0 && <span className="block text-[8px] text-red-500">Esgotado</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Desktop buttons */}
              <div className="hidden md:block mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1.5px solid #e8d5c0" }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center transition hover:opacity-70" style={{ color: "#9a7060" }}><Minus className="w-4 h-4" /></button>
                    <span className="w-9 text-center text-sm font-bold" style={{ color: "#4a2810" }}>{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center transition hover:opacity-70" style={{ color: "#9a7060" }}><Plus className="w-4 h-4" /></button>
                  </div>
                  <button onClick={handleAddToCart} disabled={addToCart.isPending}
                    className="flex-1 py-3 rounded-full font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ border: "2px solid #c0522a", color: "#c0522a", background: "transparent" }}>
                    {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Adicionar ao carrinho
                  </button>
                </div>
                <button onClick={handleBuyNow} disabled={addToCart.isPending}
                  className="w-full py-3 rounded-full font-bold text-sm text-white transition flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #c0522a 0%, #a03d1a 100%)" }}>
                  {addToCart.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Comprar agora
                </button>
              </div>
            </div>

            {/* Entrega */}
            <div className="mt-2 p-4 md:rounded-2xl" style={{ background: "#fffaf6", border: "1px solid #ecdece" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "#2d1505" }}>Entrega</h3>
              <div className="flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "#e8f0ff" }}>
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: "#4a2810" }}>Enviar para Luanda, Angola</p>
                  <p className="mt-0.5" style={{ color: "#9a7060" }}>Entrega estimada: 2-5 dias úteis</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#c0a080" }} />
              </div>
              <div className="flex items-start gap-3 text-xs mt-3" style={{ borderTop: "1px solid #ecdece", paddingTop: 12 }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "#e8f4ef" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "#1a5c3a" }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: "#4a2810" }}>Garantia do vendedor</p>
                  <p className="mt-0.5" style={{ color: "#9a7060" }}>Devolução grátis até 30 dias</p>
                </div>
              </div>
            </div>

            {/* Especificações — versão mobile (a versão desktop já está na coluna esquerda) */}
            {specRows.length > 0 && (
              <div className="mt-2 md:hidden rounded-none overflow-hidden border-t border-b" style={{ borderColor: "#ecdece" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#f5ede4" }}>
                  <ClipboardList className="w-4 h-4" style={{ color: "#7a4f2e" }} />
                  <h3 className="text-sm font-bold" style={{ color: "#4a2810" }}>Especificações</h3>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {specRows.map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 0 ? "#fffaf6" : "#fdf6f0" }}>
                        <td className="px-4 py-2.5 font-semibold w-1/3" style={{ color: "#9a7060", borderTop: i > 0 ? "1px solid #ecdece" : "none" }}>
                          {row.label}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: "#2d1505", borderTop: i > 0 ? "1px solid #ecdece" : "none" }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Descrição */}
            <div className="mt-2 p-4 md:rounded-2xl" style={{ background: "#fffaf6", border: "1px solid #ecdece" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#2d1505" }}>Descrição</h3>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "#7a5840" }}>
                {product.description || "Produto de alta qualidade disponível no ZANGU."}
              </p>
              <ul className="text-xs mt-3 space-y-1.5" style={{ color: "#9a7060" }}>
                <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Produto original com garantia</li>
                <li className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1a5c3a" }} /> Envio para todo o país</li>
                <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /> Pagamento seguro</li>
                <li className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" /> Suporte ao cliente 24/7</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ProductReviewsSection
        productId={id || ""}
        product={product}
        dbReviews={dbReviews}
        userOrders={userOrders}
        trackEvent={trackEvent}
      />

      {[
        { title: "Produtos relacionados", list: relatedProducts, section: "related" },
        { title: "Mais para explorar",    list: moreToExplore,   section: "more_explore" },
        { title: "Também pode gostar",    list: alsoLike,         section: "also_like" },
      ].map(({ title, list, section }) => list.length > 0 && (
        <div key={title} className="mt-2 p-4 md:container md:mx-auto md:rounded-2xl md:my-4"
          style={{ background: "#fffaf6", border: "1px solid #ecdece" }}>
          <h3 className="text-base font-black mb-4" style={{ color: "#7a4f2e" }}>{title}</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {list.map((p: any) => (
              <MinimalProductCard
                key={p.id}
                product={p}
                onClick={() => {
                  trackEvent(id!, "card_tap", {
                    tapped_product_id: p.id,
                    tapped_product_title: p.title,
                    section,
                    source_product_id: id,
                  });
                  navigate(`/produto/${p.id}`);
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Mobile sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pt-2 md:hidden"
        style={{
          background: "#fffaf6",
          borderTop: "1px solid #e8d5c0",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          boxShadow: "0 -4px 20px rgba(100,50,15,0.10)",
        }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold" style={{ color: "#9a7060" }}>Qtd:</span>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1.5px solid #e8d5c0" }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center" style={{ color: "#9a7060" }}><Minus className="w-3.5 h-3.5" /></button>
            <span className="w-8 text-center text-sm font-bold" style={{ color: "#4a2810" }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center" style={{ color: "#9a7060" }}><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <span className="text-sm font-black ml-auto" style={{ color: "#2d1505" }}>{activePrice}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAddToCart} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full font-bold text-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ border: "2px solid #c0522a", color: "#c0522a", background: "transparent" }}>
            {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Carrinho
          </button>
          <button onClick={handleBuyNow} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-full font-bold text-sm text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50 hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #c0522a 0%, #a03d1a 100%)" }}>
            Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reviews Section ───────────────────────────────────────────────────────────
const ProductReviewsSection = ({
  productId, product, dbReviews, userOrders, trackEvent,
}: {
  productId: string;
  product: any;
  dbReviews: any[];
  userOrders: any[];
  trackEvent: (productId: string, event: any, meta?: any) => Promise<void>;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImage, setReviewImage] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const reviews = dbReviews.length > 0 ? dbReviews : null;
  const alreadyReviewed = reviews?.some((r: any) => r.user_id === user?.id);
  const canReview = user && userOrders.length > 0 && !alreadyReviewed;

  useEffect(() => {
    if (reviews && reviews.length > 0 && productId) {
      trackEvent(productId, "review_read", { review_count: reviews.length, avg_rating: product.rating });
    }
  }, [reviews?.length]);

  const uploadImg = async (file: File) => {
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop();
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
        review_id: reviewId, review_type: "product", user_id: user!.id, content: replyText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] });
      setReplyText(""); setReplyingTo(null);
    },
  });

  return (
    <div className="mt-2 p-4 md:container md:mx-auto md:rounded-2xl md:my-4"
      style={{ background: "#fffaf6", border: "1px solid #ecdece" }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-black" style={{ color: "#2d1505" }}>Avaliações dos clientes</h3>
        {canReview && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: "#c0522a" }}>
            Avaliar produto
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "fill-amber-400 text-amber-400" : "text-[#ddd]"}`} />
          ))}
        </div>
        <span className="text-sm font-semibold" style={{ color: "#4a2810" }}>{product.rating || 0} de 5</span>
        <span className="text-xs" style={{ color: "#9a7060" }}>({product.reviews || 0} avaliações)</span>
      </div>

      {showForm && canReview && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#fff5f0", border: "1.5px solid #e8c0a0" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "#2d1505" }}>A sua avaliação</p>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setReviewRating(i + 1)}>
                <Star className={`w-6 h-6 transition ${i < reviewRating ? "fill-amber-400 text-amber-400" : "text-[#ddd]"}`} />
              </button>
            ))}
            <span className="text-sm ml-2" style={{ color: "#9a7060" }}>{reviewRating}/5</span>
          </div>
          <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
            placeholder="Escreva a sua opinião (opcional)..." rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm text-foreground resize-none focus:outline-none"
            style={{ background: "#fff", border: "1.5px solid #e8d5c0" }} />
          <div className="mt-3">
            {reviewImage ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden" style={{ border: "1.5px solid #e8d5c0" }}>
                <img src={reviewImage} alt="Anexo" className="w-full h-full object-cover" />
                <button onClick={() => setReviewImage("")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition"
                style={{ background: "#fdf6f0", border: "1.5px solid #e8d5c0", color: "#7a5840" }}>
                {uploadingImg ? "A enviar..." : "📷 Adicionar foto"}
                <input type="file" accept="image/*" disabled={uploadingImg} className="hidden" onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full text-xs font-bold" style={{ color: "#9a7060" }}>Cancelar</button>
            <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending}
              className="px-4 py-2 rounded-full text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1"
              style={{ background: "#c0522a" }}>
              {submitReview.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Enviar avaliação
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed && <p className="text-xs italic mb-3" style={{ color: "#9a7060" }}>✓ Já avaliou este produto</p>}

      {reviews ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="pt-3" style={{ borderTop: "1px solid #ecdece" }}>
              <div className="flex items-center gap-2 mb-1">
                {review.profile?.avatar_url ? (
                  <img src={review.profile.avatar_url} alt={review.profile.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: "#f0e4d8", color: "#c0522a" }}>
                    {(review.profile?.full_name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-xs font-bold" style={{ color: "#4a2810" }}>{review.profile?.full_name || "Utilizador"}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-2.5 h-2.5 ${j < review.rating ? "fill-amber-400 text-amber-400" : "text-[#ddd]"}`} />
                    ))}
                    <span className="text-[10px] ml-1" style={{ color: "#9a7060" }}>{new Date(review.created_at).toLocaleDateString("pt-AO")}</span>
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-xs leading-relaxed mt-1" style={{ color: "#4a2810" }}>{review.comment}</p>}
              {review.image_url && (
                <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <img src={review.image_url} alt="Foto da avaliação" className="max-h-40 rounded-xl object-cover" style={{ border: "1px solid #ecdece" }} />
                </a>
              )}
              {review.replies?.length > 0 && (
                <div className="ml-6 mt-2 space-y-2">
                  {review.replies.map((reply: any) => (
                    <div key={reply.id} className="rounded-xl p-2" style={{ background: "#f5ede4" }}>
                      <p className="text-[10px] font-bold" style={{ color: "#4a2810" }}>{reply.profile?.full_name || "Utilizador"}</p>
                      <p className="text-[11px]" style={{ color: "#7a5840" }}>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {user && (
                <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                  className="flex items-center gap-1 text-[10px] mt-2 transition"
                  style={{ color: "#9a7060" }}>
                  <MessageCircle className="w-3 h-3" /> Responder
                </button>
              )}
              {replyingTo === review.id && user && (
                <div className="ml-6 mt-2 flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escrever resposta..."
                    className="flex-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none"
                    style={{ background: "#fdf6f0", border: "1.5px solid #e8d5c0", color: "#4a2810" }} />
                  <button onClick={() => submitReply.mutate(review.id)} disabled={!replyText.trim() || submitReply.isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: "#c0522a" }}>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8" style={{ borderTop: "1px solid #ecdece" }}>
          <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#d4b8a0" }} />
          <p className="text-sm font-semibold" style={{ color: "#4a2810" }}>Ainda sem avaliações</p>
          <p className="text-xs mt-1" style={{ color: "#9a7060" }}>Seja o primeiro a avaliar após a compra.</p>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
