import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield,
  MapPin, ChevronRight, Minus, Plus, ZoomIn, Store, MessageCircle,
  Send, Loader2, ShieldCheck, X, Building2, Link2, Check,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddToCart } from "@/hooks/useCartActions";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

const N = {
  brown:     "#4A2E0A",
  sand:      "#D4B896",
  sandDark:  "#B8956A",
  cream:     "#F7F0E6",
  brownLight:"rgba(74,46,10,0.10)",
  accent:    "#c0522a",
};

const fmt = (n: number) =>
  Number(n).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const conditionLabels: Record<string, string> = {
  new: "Novo", like_new: "Como novo", good: "Bom estado",
  used: "Usado", refurbished: "Recondicionado",
};

// ─── Minimal Related Card ──────────────────────────────────────────────────────
const MinimalProductCard = ({ product, onClick }: { product: any; onClick?: () => void }) => (
  <div onClick={onClick} className="cursor-pointer group flex flex-col flex-shrink-0" style={{ width: 140 }}>
    <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: "1/1", background: "#f5f5f5" }}>
      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    </div>
    <p className="text-xs font-semibold leading-snug line-clamp-2 mt-1" style={{ color: "#111" }}>{product.title}</p>
    <p className="text-xs font-black mt-0.5" style={{ color: N.accent }}>{product.price}</p>
  </div>
);

// ─── Tracking ─────────────────────────────────────────────────────────────────
const useProductTracking = () => {
  const { user } = useAuth();
  const trackEvent = useCallback(async (
    productId: string,
    eventType: "view"|"card_tap"|"add_to_cart"|"buy_now"|"favorite"|"share"|"image_zoom"|"variant_select"|"review_read"|"seller_view",
    metadata: Record<string, any> = {}
  ) => {
    try {
      const sessionId = sessionStorage.getItem("kw_session_id") || (() => {
        const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("kw_session_id", id); return id;
      })();
      await (supabase as any).from("product_tracking_events").insert({
        product_id: productId, event_type: eventType, user_id: user?.id || null, session_id: sessionId,
        metadata: { ...metadata, user_agent: navigator.userAgent, screen_width: window.innerWidth, platform: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop", timestamp: new Date().toISOString(), url: window.location.href },
      });
    } catch (_) {}
  }, [user?.id]);
  return { trackEvent };
};

// ─── Share Sheet ──────────────────────────────────────────────────────────────
const ShareSheet = ({ title, imageUrl, url, description, price, onClose }: { title: string; imageUrl: string; url: string; description?: string; price?: string; onClose: () => void }) => {
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const shortDesc = description ? description.slice(0, 120).trim() + (description.length > 120 ? "…" : "") : "";
  const shareText = [price ? `💰 ${price}` : "", shortDesc].filter(Boolean).join("\n");
  const handleNative = async () => {
    setSharing(true);
    try {
      if (navigator.share) { await navigator.share({ title, text: shareText, url }); onClose(); }
      else { await navigator.clipboard.writeText(`${title}\n${shareText}\n${url}`); toast.success("Link copiado!"); onClose(); }
    } catch (err: any) { if (err?.name !== "AbortError") toast.error("Não foi possível partilhar"); }
    setSharing(false);
  };
  const handleCopyLink = async () => {
    setCopying(true);
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); } catch { toast.error("Erro ao copiar"); }
    setCopying(false); onClose();
  };
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n${price ? `💰 ${price}\n` : ""}${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank"); onClose();
  };
  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl pb-8 pt-2 px-4 shadow-2xl bg-white" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 mt-2 bg-gray-300" />
        <div className="flex items-center gap-3 p-3 rounded-xl mb-4 bg-gray-50 border border-gray-200">
          <img src={imageUrl} alt={title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug line-clamp-2 text-gray-900">{title}</p>
            {price && <p className="text-xs font-black mt-0.5" style={{ color: N.accent }}>{price}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <button onClick={handleNative} disabled={sharing} className="flex flex-col items-center gap-2 py-3.5 rounded-2xl" style={{ background: N.brown }}>
            {sharing ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Share2 className="w-5 h-5 text-white" />}
            <span className="text-[10px] font-bold text-white">Partilhar</span>
          </button>
          <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 py-3.5 rounded-2xl" style={{ background: "#25D366" }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="text-[10px] font-bold text-white">WhatsApp</span>
          </button>
          <button onClick={handleCopyLink} disabled={copying} className="flex flex-col items-center gap-2 py-3.5 rounded-2xl border border-gray-200 bg-gray-50">
            {copying ? <Loader2 className="w-5 h-5 animate-spin text-gray-600" /> : <Link2 className="w-5 h-5 text-gray-700" />}
            <span className="text-[10px] font-bold text-gray-700">Copiar link</span>
          </button>
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100">Cancelar</button>
      </div>
    </div>
  );
};

// ─── Zoom Lightbox ─────────────────────────────────────────────────────────────
const ZoomLightbox = ({ images, index, onClose, onChange, onShare }: { images: { url: string; type: string }[]; index: number; onClose: () => void; onChange: (i: number) => void; onShare: () => void }) => {
  const touchRef = useRef<number | null>(null);
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
        <span className="text-white/60 text-xs font-medium">{index + 1} / {images.length}</span>
        <button onClick={onShare} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><Share2 className="w-4 h-4 text-white" /></button>
      </div>
      <div className="flex-1 flex items-center justify-center px-2 overflow-hidden" onClick={e => e.stopPropagation()}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touchRef.current === null) return; const diff = touchRef.current - e.changedTouches[0].clientX; if (Math.abs(diff) > 40) onChange(diff > 0 ? Math.min(index + 1, images.length - 1) : Math.max(index - 1, 0)); touchRef.current = null; }}>
        {images[index]?.type === "video" ? <video src={images[index].url} controls className="max-w-full max-h-full rounded-lg" /> : <img src={images[index]?.url} alt="" className="max-w-full max-h-full object-contain" />}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 py-5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {images.map((_, i) => <button key={i} onClick={() => onChange(i)} className={`rounded-full transition-all duration-200 ${i === index ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/30"}`} />)}
        </div>
      )}
    </div>
  );
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
const AvatarWithFallback = ({ src, name, isCompany }: { src: string | null; name: string; isCompany: boolean }) => {
  const [ok, setOk] = useState<boolean | null>(src ? null : false);
  if (src && ok !== false) return <img src={src} alt={name} className="w-9 h-9 rounded-full object-cover border border-gray-200" onLoad={() => setOk(true)} onError={() => setOk(false)} />;
  return <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 border border-gray-200">{isCompany ? <Building2 className="w-4 h-4 text-gray-500" /> : <Store className="w-4 h-4 text-gray-500" />}</div>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
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
  const [descExpanded, setDescExpanded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const viewTracked = useRef(false);
  const isUuid = id && id.length > 10;

  const { data: dbProduct, isLoading: loadingProduct } = useProduct(id || "");
  const { data: dbMedia = [] } = useQuery({ queryKey: ["product_media_detail", id], queryFn: async () => { const { data } = await supabase.from("product_media").select("*").eq("product_id", id!).order("sort_order"); return data || []; }, enabled: !!isUuid });
  const { data: dbVariants = [] } = useQuery({ queryKey: ["product_variants", id], queryFn: async () => { const { data } = await supabase.from("product_variants").select("*").eq("product_id", id!).eq("is_active", true).order("sort_order"); return data || []; }, enabled: !!isUuid });
  const { data: productAds = [] } = useQuery({ queryKey: ["product_ads_detail"], queryFn: async () => { const { data } = await (supabase as any).from("ads").select("id, title, media_url, media_type, destination_url").eq("type", "banner").eq("is_active", true).order("created_at", { ascending: false }).limit(3); return data || []; } });

  const rawSellerId  = (dbProduct as any)?.seller_id  || (dbProduct as any)?.sellers?.id || null;
  const rawCompanyId = (dbProduct as any)?.company_id || null;
  const categoryId   = (dbProduct as any)?.category_id;

  const { data: sellerFull,  isLoading: loadingSeller  } = useQuery({ queryKey: ["seller_full",  rawSellerId],  queryFn: async () => { const { data } = await supabase.from("sellers").select("id,name,logo_url,avatar_url,is_verified,province,rating,total_sales,type,user_id").eq("id", rawSellerId!).maybeSingle(); return data ? { ...data, __type: "seller" } : null; }, enabled: !!rawSellerId });
  const { data: companyFull, isLoading: loadingCompany } = useQuery({ queryKey: ["company_full", rawCompanyId], queryFn: async () => { const { data } = await (supabase as any).from("companies").select("id,name,logo_url,is_verified,province,rating,total_reviews,total_sales").eq("id", rawCompanyId!).maybeSingle(); return data ? { ...data, __type: "company" } : null; }, enabled: !!rawCompanyId });
  const loadingPublisher = (!!rawSellerId && loadingSeller) || (!!rawCompanyId && loadingCompany);
  const publisher: any = sellerFull || companyFull || null;

  const { data: categoryName } = useQuery({ queryKey: ["category_name_detail", categoryId], queryFn: async () => { const { data } = await supabase.from("categories").select("name").eq("id", categoryId!).maybeSingle(); return data?.name || null; }, enabled: !!categoryId });
  const { data: userOrders = [] } = useQuery({ queryKey: ["user_delivered_orders_for_product", id, user?.id], queryFn: async () => { const { data } = await supabase.from("orders").select("id, order_items!inner(product_id)").eq("user_id", user!.id).eq("status", "delivered").eq("order_items.product_id", id!); return data || []; }, enabled: !!user && !!isUuid });
  const { data: dbReviews = [] } = useQuery({
    queryKey: ["product_reviews_detail", id],
    queryFn: async () => {
      const { data } = await supabase.from("product_reviews").select("*").eq("product_id", id!).order("created_at", { ascending: false });
      const uids = [...new Set((data || []).map((r: any) => r.user_id))];
      let pMap: Record<string, any> = {};
      if (uids.length) { const { data: profs } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", uids); pMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p])); }
      const rids = (data || []).map((r: any) => r.id);
      let repMap: Record<string, any[]> = {};
      if (rids.length) {
        const { data: reps } = await supabase.from("review_replies").select("*").in("review_id", rids).order("created_at");
        if (reps) {
          const ruids = [...new Set(reps.map((r: any) => r.user_id))]; let rpMap: Record<string, any> = {};
          if (ruids.length) { const { data: rp } = await supabase.from("profiles").select("id,full_name").in("id", ruids); rpMap = Object.fromEntries((rp || []).map((p: any) => [p.id, p])); }
          reps.forEach((r: any) => { if (!repMap[r.review_id]) repMap[r.review_id] = []; repMap[r.review_id].push({ ...r, profile: rpMap[r.user_id] || null }); });
        }
      }
      return (data || []).map((r: any) => ({ ...r, profile: pMap[r.user_id] || null, replies: repMap[r.id] || [] }));
    },
    enabled: !!isUuid,
  });

  const { data: relatedDb = [] } = useQuery({
    queryKey: ["related_products", id, categoryId, rawSellerId],
    queryFn: async () => {
      const collected: any[] = []; const seen = new Set<string>([id!]);
      const fetchSet = async (filter: (q: any) => any, limit: number) => { const { data } = await filter(supabase.from("products").select("*").eq("is_active", true).neq("id", id!).limit(limit)); (data || []).forEach((p: any) => { if (!seen.has(p.id)) { seen.add(p.id); collected.push(p); } }); };
      if (categoryId) await fetchSet(q => q.eq("category_id", categoryId).order("sales_count", { ascending: false }), 30);
      if (rawSellerId && collected.length < 30) await fetchSet(q => q.eq("seller_id", rawSellerId).order("sales_count", { ascending: false }), 20);
      if (collected.length < 30) await fetchSet(q => q.order("sales_count", { ascending: false }), 30);
      const ids = collected.map((p: any) => p.id); const cMap: Record<string, string> = {};
      if (ids.length) { const { data: m } = await supabase.from("product_media").select("product_id,url").in("product_id", ids).eq("is_cover", true); (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; }); }
      return collected.map((p: any) => ({ id: p.id, title: p.title, price: fmt(p.price), image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" }));
    },
    enabled: !!isUuid && !!dbProduct,
  });

  useEffect(() => {
    if (!dbProduct || !isUuid || viewTracked.current) return;
    viewTracked.current = true;
    const p = dbProduct as any;
    trackEvent(id!, "view", { title: p.title, price: p.price, category_id: p.category_id });
  }, [dbProduct, id, isUuid, trackEvent]);

  const handlePublisherNavigate = () => {
    if (!publisher) return;
    trackEvent(id!, "seller_view", { seller_id: publisher.id });
    if (publisher.__type === "company") navigate(`/empresa/${publisher.id ?? rawCompanyId}`);
    else navigate(`/vendedor/${publisher.id ?? rawSellerId}`);
  };

  const handleFavorite = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    trackEvent(id!, "favorite", { action: isFavorite(id!) ? "remove" : "add" });
    toggleFavorite(id!);
  };

  const getVariantId = () => Object.values(selectedSubVariants).find(Boolean) || Object.values(selectedVariants).find(Boolean) || undefined;
  const handleAddToCart = () => { if (!user) { navigate("/auth"); return; } if (!isUuid) { toast.info("Produto de demonstração"); return; } trackEvent(id!, "add_to_cart", { quantity: qty }); addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() }); };
  const handleBuyNow   = () => { if (!user) { navigate("/auth"); return; } if (!isUuid) { toast.info("Produto de demonstração"); return; } trackEvent(id!, "buy_now", { quantity: qty }); addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() }, { onSuccess: () => navigate("/checkout") }); };
  const handleShare    = () => { trackEvent(id!, "share", {}); setShareOpen(true); };
  const handleZoom     = () => { trackEvent(id!, "image_zoom", { image_index: selectedImage }); setZoomOpen(true); };

  if (!dbProduct && isUuid && loadingProduct)
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 animate-spin" style={{ color: N.brown }} /></div>;

  const staticProduct = allProducts.find(p => p.id === Number(id));
  const productBase: any = dbProduct || staticProduct;
  if (!productBase) return (
    <div className="min-h-screen flex items-center justify-center text-center px-6 bg-white">
      <div>
        <h2 className="text-lg font-bold mb-2 text-gray-900">Produto não encontrado</h2>
        <button onClick={() => navigate("/")} className="text-sm font-semibold" style={{ color: N.accent }}>Voltar à home</button>
      </div>
    </div>
  );

  const coverUrl = dbMedia.find((m: any) => m.is_cover)?.url || dbMedia[0]?.url || productBase.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
  const product = {
    id: productBase.id, title: productBase.title, price: fmt(productBase.price),
    oldPrice: productBase.old_price ? fmt(productBase.old_price) : undefined,
    discount: productBase.discount_percent ? `-${productBase.discount_percent}%` : undefined,
    image: coverUrl, rating: productBase.rating || undefined, reviews: productBase.total_reviews || undefined,
    freeShipping: productBase.free_shipping || false, badge: productBase.badge || undefined,
    description: productBase.description || "", category_id: productBase.category_id,
    sku: productBase.sku || null, condition: productBase.condition || null,
    weight_kg: productBase.weight_kg || null, length_cm: productBase.length_cm || null,
    width_cm: productBase.width_cm || null, height_cm: productBase.height_cm || null,
  };

  const parentVariants = (dbVariants as any[]).filter((v: any) => !v.parent_id);
  const childVariants  = (dbVariants as any[]).filter((v: any) =>  v.parent_id);
  const variantGroups: Record<string, any[]> = {};
  parentVariants.forEach((v: any) => { if (!variantGroups[v.variant_type]) variantGroups[v.variant_type] = []; variantGroups[v.variant_type].push(v); });
  const selectedParentIds = Object.values(selectedVariants).filter(Boolean);
  const activeChildren    = childVariants.filter((c: any) => selectedParentIds.includes(c.parent_id));
  const childGroups: Record<string, any[]> = {};
  activeChildren.forEach((v: any) => { if (!childGroups[v.variant_type]) childGroups[v.variant_type] = []; childGroups[v.variant_type].push(v); });
  const allSelIds     = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants)].filter(Boolean);
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelIds.includes(v.id) && v.price_override);
  const activePrice   = activeVariant?.price_override ? fmt(activeVariant.price_override) : product.price;
  const variantImage  = activeVariant?.image_url || null;
  const images        = dbMedia.length > 0 ? dbMedia.map((m: any) => ({ url: m.url, type: m.type || "image" })) : [{ url: product.image, type: "image" }];
  const displayImages = variantImage ? [{ url: variantImage, type: "image" }, ...images.filter(i => i.url !== variantImage)] : images;
  const currentImageUrl = displayImages[selectedImage]?.url || product.image;
  const isFavorited = isFavorite(id!);

  const typeLabels: Record<string, string> = { color: "Cor", size: "Tamanho", material: "Material", style: "Estilo", weight: "Peso", capacity: "Capacidade", model: "Modelo", voltage: "Voltagem", pack: "Pacote", other: "Opção" };
  const dimensionsStr = (product.length_cm && product.width_cm && product.height_cm) ? `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm` : null;

  // Especificações completas — sempre preenchidas dos dois lados
  const specRows: { label: string; value: string }[] = [
    categoryName       ? { label: "Categoria",  value: categoryName }                                              : null,
    product.condition  ? { label: "Condição",   value: conditionLabels[product.condition] || product.condition }  : null,
    product.sku        ? { label: "SKU",         value: product.sku }                                              : null,
    product.weight_kg  ? { label: "Peso",        value: `${product.weight_kg} kg` }                               : null,
    dimensionsStr      ? { label: "Dimensões",   value: dimensionsStr }                                            : null,
    product.freeShipping ? { label: "Frete",     value: "Grátis para Luanda" }                                    : null,
    { label: "Devolução",  value: "Grátis até 30 dias" },
    { label: "Pagamento",  value: "Seguro e encriptado" },
    { label: "Entrega",    value: "2–5 dias úteis" },
    publisher?.name    ? { label: "Vendedor",    value: publisher.name }                                           : null,
    publisher?.province? { label: "Localização", value: String(publisher.province).replace(/0+$/, "").trim() }    : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const relatedProducts = relatedDb.slice(0, 20);
  const popularityBadge = product.reviews && product.reviews > 200 ? `Em ${Math.floor(product.reviews / 5)}+ carrinhos` : null;

  const VariantPill = ({ v, selected, onSelect, type }: { v: any; selected: boolean; onSelect: () => void; type: string }) => {
    if (type === "color" && v.value?.startsWith("#")) {
      return (
        <button onClick={onSelect} className="relative rounded-lg overflow-hidden transition-all" style={{ border: selected ? `3px solid ${N.brown}` : "2px solid #ddd", width: 52, height: 52 }} title={v.name}>
          {v.image_url ? <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full" style={{ background: v.value }} /></div>}
          {selected && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Check className="w-4 h-4 text-white" /></div>}
          {v.price_override && <span className="absolute bottom-0 inset-x-0 text-center bg-black/60 text-[7px] font-bold py-0.5 text-white">{fmt(v.price_override)}</span>}
        </button>
      );
    }
    return (
      <button onClick={onSelect} className="px-3 py-2 rounded-lg text-xs font-bold transition-all border"
        style={{ background: selected ? N.brown : "#fff", color: selected ? "#fff" : "#333", borderColor: selected ? N.brown : "#ddd" }}>
        {v.name}
        {v.price_override && <span className="block text-[9px] font-normal opacity-80">{fmt(v.price_override)}</span>}
        {v.stock != null && v.stock <= 3 && v.stock > 0 && <span className="block text-[8px] text-amber-600">Restam {v.stock}</span>}
        {v.stock === 0 && <span className="block text-[8px] text-red-500">Esgotado</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {shareOpen && <ShareSheet title={product.title} imageUrl={currentImageUrl} url={window.location.href} description={product.description} price={activePrice} onClose={() => setShareOpen(false)} />}
      {zoomOpen  && <ZoomLightbox images={displayImages} index={selectedImage} onClose={() => setZoomOpen(false)} onChange={setSelectedImage} onShare={() => { setZoomOpen(false); setShareOpen(true); }} />}

      {/* ── MINI HEADER ── */}
      <div className="sticky top-0 z-50 flex items-center gap-2 px-3 h-12 bg-white border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: N.brown }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        {categoryName && (
          <button onClick={() => navigate(`/categoria/${encodeURIComponent(categoryName)}`)}
            className="flex-1 text-xs font-semibold truncate text-left" style={{ color: N.brown }}>
            📂 {categoryName}
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={handleFavorite} className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ background: isFavorited ? N.brown : "#fff", borderColor: isFavorited ? N.brown : "#ddd" }}>
            <Heart className="w-4 h-4" style={{ color: isFavorited ? "#fff" : "#333", fill: isFavorited ? "#fff" : "none" }} />
          </button>
          <button onClick={() => navigate("/carrinho")} className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white">
            <ShoppingCart className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white">
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* ── TÍTULO + RATING ACIMA DA IMAGEM (estilo Amazon) ── */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100">
        {/* Vendedor */}
        {publisher && !loadingPublisher && (
          <button onClick={handlePublisherNavigate} className="flex items-center gap-2 mb-1.5">
            <AvatarWithFallback src={publisher.logo_url || publisher.avatar_url || null} name={publisher.name} isCompany={publisher.__type === "company"} />
            <div className="text-left">
              <span className="text-xs font-bold" style={{ color: N.brown }}>{publisher.name}</span>
              {publisher.is_verified && <ShieldCheck className="w-3 h-3 text-blue-500 inline ml-1" />}
              {publisher.__type === "company" && <span className="ml-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Empresa</span>}
              {publisher?.province && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{String(publisher.province).replace(/0+$/, "").trim()}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </button>
        )}

        <h1 className="text-base font-bold leading-snug text-gray-900">{product.title}</h1>

        {/* Rating inline */}
        {product.rating ? (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}
            </div>
            <span className="text-xs font-bold" style={{ color: N.accent }}>{product.rating}</span>
            <span className="text-xs text-gray-500">({product.reviews?.toLocaleString()} avaliações)</span>
            {popularityBadge && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100">🛒 {popularityBadge}</span>}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Sem avaliações ainda</p>
        )}

        {/* Preço */}
        <div className="mt-2">
          {product.discount && <p className="text-[10px] font-bold uppercase text-red-600">Oferta por tempo limitado</p>}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-black" style={{ color: N.brown }}>{activePrice}</span>
            {product.discount && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-600 bg-red-50">{product.discount}</span>}
          </div>
          {product.oldPrice && <p className="text-sm line-through text-gray-400">De: {product.oldPrice}</p>}
          {product.freeShipping && (
            <p className="text-xs font-bold text-green-700 flex items-center gap-1 mt-0.5"><Truck className="w-3.5 h-3.5" /> Frete grátis</p>
          )}
        </div>
      </div>

      {/* ── IMAGEM PRINCIPAL ── */}
      <div className="relative bg-gray-50"
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => { if (touchStartX.current === null) return; const diff = touchStartX.current - e.changedTouches[0].clientX; if (Math.abs(diff) > 40) setSelectedImage(i => diff > 0 ? Math.min(i + 1, displayImages.length - 1) : Math.max(i - 1, 0)); touchStartX.current = null; }}>
        <div className="w-full" style={{ aspectRatio: "1/1", maxHeight: 380 }}>
          {displayImages[selectedImage]?.type === "video"
            ? <video src={displayImages[selectedImage].url} controls className="w-full h-full object-contain" />
            : <img src={displayImages[selectedImage]?.url} alt={product.title} className="w-full h-full object-contain" />}
        </div>
        {product.discount && <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-black text-white bg-red-500">{product.discount}</div>}
        {product.badge === "HOT" && !product.discount && <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-black text-white" style={{ background: N.brown }}>🔥 Hot</div>}
        <button onClick={handleZoom} className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow">
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Thumbnails strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100">
          {displayImages.map((img, i) => (
            <button key={i} onClick={() => setSelectedImage(i)} className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all"
              style={{ borderColor: i === selectedImage ? N.brown : "#ddd", opacity: i === selectedImage ? 1 : 0.6 }}>
              {img.type === "video" ? <video src={img.url} className="w-full h-full object-cover" /> : <img src={img.url} alt="" className="w-full h-full object-cover" />}
            </button>
          ))}
          {/* Dots */}
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            {displayImages.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === selectedImage ? 14 : 5, height: 5, background: i === selectedImage ? N.brown : "#ccc" }} />)}
          </div>
        </div>
      )}

      {/* ── VARIANTES ── */}
      {Object.keys(variantGroups).length > 0 && (
        <div className="bg-white border-b border-gray-100 px-3 py-3 space-y-3">
          {Object.entries(variantGroups).map(([type, variants]) => {
            const selId = selectedVariants[type];
            return (
              <div key={type}>
                <p className="text-sm font-bold text-gray-800 mb-2">
                  {typeLabels[type] || type}
                  {selId && <span className="font-normal text-gray-500 ml-1">: {variants.find((v: any) => v.id === selId)?.name}</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v: any) => <VariantPill key={v.id} v={v} type={type} selected={selId === v.id} onSelect={() => { setSelectedVariants(p => ({ ...p, [type]: selId === v.id ? "" : v.id })); if (selId === v.id) setSelectedSubVariants({}); }} />)}
                </div>
              </div>
            );
          })}
          {Object.entries(childGroups).map(([type, variants]) => {
            const selId = selectedSubVariants[type];
            return (
              <div key={`sub-${type}`}>
                <p className="text-sm font-bold text-gray-800 mb-2">
                  {typeLabels[type] || type}
                  {selId && <span className="font-normal text-gray-500 ml-1">: {variants.find((v: any) => v.id === selId)?.name}</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v: any) => <VariantPill key={v.id} v={v} type={type} selected={selId === v.id} onSelect={() => setSelectedSubVariants(p => ({ ...p, [type]: selId === v.id ? "" : v.id }))} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ESPECIFICAÇÕES COMPLETAS — 2 colunas ── */}
      {specRows.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-3 py-3">
          <p className="text-sm font-bold text-gray-900 mb-2">Especificações</p>
          <div className="grid grid-cols-2 gap-0">
            {specRows.map((row, i) => (
              <div key={row.label} className="py-2 px-2" style={{ background: i % 2 === 0 ? "#fafafa" : "#fff", borderBottom: "1px solid #f0f0f0" }}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                <p className="text-xs font-semibold text-gray-900 mt-0.5">{row.value}</p>
              </div>
            ))}
            {/* Se ímpar, adiciona célula vazia para preencher */}
            {specRows.length % 2 !== 0 && (
              <div className="py-2 px-2" style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }} />
            )}
          </div>
        </div>
      )}

      {/* ── SOBRE O PRODUTO ── */}
      <div className="bg-white border-b border-gray-100 px-3 py-3">
        <p className="text-sm font-bold text-gray-900 mb-1.5">Sobre este produto</p>
        <p className={`text-sm leading-relaxed text-gray-700 whitespace-pre-line ${!descExpanded ? "line-clamp-4" : ""}`}>
          {product.description || "Produto de alta qualidade disponível no ZANGU."}
        </p>
        {product.description && product.description.length > 200 && (
          <button onClick={() => setDescExpanded(v => !v)} className="text-xs font-bold mt-1" style={{ color: N.accent }}>
            {descExpanded ? "Ver menos ▲" : "Ver mais ▼"}
          </button>
        )}
        {/* Benefícios em 2 colunas */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { icon: "✅", text: "Produto original com garantia" },
            { icon: "🚚", text: "Envio para todo o país" },
            { icon: "🔒", text: "Pagamento seguro" },
            { icon: "⭐", text: "Suporte ao cliente 24/7" },
            { icon: "↩️", text: "Devolução grátis 30 dias" },
            { icon: "📦", text: "Embalagem protegida" },
          ].map((b, i) => (
            <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
              <span className="text-sm flex-shrink-0">{b.icon}</span>
              <span className="text-[11px] text-gray-700 leading-tight">{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ENTREGA ── */}
      <div className="bg-white border-b border-gray-100 px-3 py-3">
        <p className="text-sm font-bold text-gray-900 mb-2">Entrega e devoluções</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <MapPin className="w-4 h-4 text-blue-500" />, bg: "#eff6ff", title: "Luanda, Angola", sub: "2–5 dias úteis" },
            { icon: <Shield className="w-4 h-4 text-green-600" />, bg: "#f0fdf4", title: "Devolução grátis", sub: "Até 30 dias" },
            { icon: <ShieldCheck className="w-4 h-4 text-purple-500" />, bg: "#faf5ff", title: "Pag. seguro", sub: "Encriptado" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center p-2 rounded-lg" style={{ background: item.bg }}>
              {item.icon}
              <p className="text-[10px] font-bold text-gray-800 mt-1 leading-tight">{item.title}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── AVALIAÇÕES ── */}
      <ProductReviewsSection productId={id || ""} product={product} dbReviews={dbReviews} userOrders={userOrders} trackEvent={trackEvent} />

      {/* ── PRODUTOS RELACIONADOS ── */}
      {relatedProducts.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-3 py-3">
          <p className="text-sm font-bold text-gray-900 mb-3">Produtos relacionados</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {relatedProducts.map((p: any) => (
              <MinimalProductCard key={p.id} product={p} onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "related" }); navigate(`/produto/${p.id}`); }} />
            ))}
          </div>
        </div>
      )}

      {/* ── ADS ── */}
      {productAds.length > 0 && (
        <div className="bg-white px-3 py-3 space-y-3">
          <p className="text-[10px] text-right text-gray-400">Publicidade</p>
          {productAds.map((ad: any) => {
            const inner = (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                {ad.media_url ? (
                  <div className="relative">
                    {ad.media_type === "video" ? <video src={ad.media_url} className="w-full object-cover max-h-36" autoPlay muted loop playsInline /> : <img src={ad.media_url} alt={ad.title || ""} className="w-full object-cover max-h-36" />}
                    {ad.title && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2"><p className="text-white text-xs font-bold truncate">{ad.title}</p></div>}
                    <span className="absolute top-2 right-2 text-[9px] font-bold text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full">Patrocinado</span>
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gray-50">
                    <p className="text-sm font-bold truncate text-gray-800">{ad.title}</p>
                    <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 text-gray-600 border-gray-300">Ver mais</span>
                  </div>
                )}
              </div>
            );
            return ad.destination_url ? <a key={ad.id} href={ad.destination_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : <div key={ad.id}>{inner}</div>;
          })}
        </div>
      )}

      <div className="h-28 md:hidden" aria-hidden />

      {/* ── BARRA INFERIOR MOBILE ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <div className="flex items-center rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-gray-600"><Minus className="w-4 h-4" /></button>
            <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-gray-600"><Plus className="w-4 h-4" /></button>
          </div>
          <span className="text-sm font-black ml-auto" style={{ color: N.brown }}>{activePrice}</span>
        </div>
        <div className="flex gap-2 px-3 pt-1">
          <button onClick={handleAddToCart} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 border"
            style={{ borderColor: N.brown, color: N.brown, background: "#fff" }}>
            {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Carrinho
          </button>
          <button onClick={handleBuyNow} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: N.brown }}>
            {addToCart.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reviews Section ───────────────────────────────────────────────────────────
const ProductReviewsSection = ({ productId, product, dbReviews, userOrders, trackEvent }: { productId: string; product: any; dbReviews: any[]; userOrders: any[]; trackEvent: (productId: string, event: any, meta?: any) => Promise<void> }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo]     = useState<string | null>(null);
  const [replyText, setReplyText]       = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImage, setReviewImage]   = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showForm, setShowForm]         = useState(false);

  const reviews         = dbReviews.length > 0 ? dbReviews : null;
  const alreadyReviewed = reviews?.some((r: any) => r.user_id === user?.id);
  const canReview       = user && userOrders.length > 0 && !alreadyReviewed;
  const totalReviews    = dbReviews.length;
  const ratingCounts    = [5, 4, 3, 2, 1].map(star => ({ star, count: (dbReviews || []).filter((r: any) => r.rating === star).length }));

  useEffect(() => {
    if (reviews && reviews.length > 0 && productId) trackEvent(productId, "review_read", { review_count: reviews.length, avg_rating: product.rating });
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
      const { error } = await supabase.from("product_reviews").insert({ product_id: productId, user_id: user!.id, order_id: userOrders[0]?.id, rating: reviewRating, comment: reviewComment || null, image_url: reviewImage || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] }); queryClient.invalidateQueries({ queryKey: ["product", productId] }); setReviewComment(""); setReviewRating(5); setReviewImage(""); setShowForm(false); },
  });

  const submitReply = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("review_replies").insert({ review_id: reviewId, review_type: "product", user_id: user!.id, content: replyText });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product_reviews_detail", productId] }); setReplyText(""); setReplyingTo(null); },
  });

  return (
    <div className="bg-white border-b border-gray-100 px-3 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">Avaliações dos clientes</p>
        {canReview && (
          <button onClick={() => setShowForm(!showForm)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: N.brown }}>
            Avaliar
          </button>
        )}
      </div>

      {/* Resumo rating — 2 colunas */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50">
          <span className="text-4xl font-black text-gray-900">{product.rating || 0}</span>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}
          </div>
          <span className="text-[10px] text-gray-500 mt-1">{totalReviews} avaliações</span>
        </div>
        <div className="space-y-1.5">
          {ratingCounts.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-1.5">
              <span className="text-[10px] w-2 text-gray-500">{star}</span>
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 w-3">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm && canReview && (
        <div className="rounded-xl p-3 mb-3 bg-gray-50 border border-gray-200">
          <p className="text-sm font-bold mb-2 text-gray-900">A sua avaliação</p>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => <button key={i} onClick={() => setReviewRating(i + 1)}><Star className={`w-7 h-7 transition ${i < reviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} /></button>)}
            <span className="text-sm ml-2 text-gray-500">{reviewRating}/5</span>
          </div>
          <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Escreva a sua opinião..." rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none border border-gray-200 bg-white text-gray-900" />
          <div className="mt-2">
            {reviewImage ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                <img src={reviewImage} alt="Anexo" className="w-full h-full object-cover" />
                <button onClick={() => setReviewImage("")} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border border-gray-200 bg-white text-gray-700">
                {uploadingImg ? "A enviar..." : "📷 Adicionar foto"}
                <input type="file" accept="image/*" disabled={uploadingImg} className="hidden" onChange={e => e.target.files?.[0] && uploadImg(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500">Cancelar</button>
            <button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1" style={{ background: N.brown }}>
              {submitReview.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Enviar
            </button>
          </div>
        </div>
      )}

      {alreadyReviewed && <p className="text-xs italic mb-2 text-gray-400">✓ Já avaliou este produto</p>}

      {reviews ? (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                {review.profile?.avatar_url
                  ? <img src={review.profile.avatar_url} alt={review.profile.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-gray-100 text-gray-600">{(review.profile?.full_name || "U").charAt(0).toUpperCase()}</div>
                }
                <div>
                  <p className="text-xs font-bold text-gray-900">{review.profile?.full_name || "Utilizador"}</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`w-3 h-3 ${j < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}
                    <span className="text-[10px] ml-1 text-gray-400">{new Date(review.created_at).toLocaleDateString("pt-AO")}</span>
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>}
              {review.image_url && <a href={review.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2"><img src={review.image_url} alt="Foto" className="max-h-36 rounded-lg object-cover border border-gray-200" /></a>}
              {review.replies?.length > 0 && (
                <div className="ml-7 mt-2 space-y-1.5">
                  {review.replies.map((reply: any) => (
                    <div key={reply.id} className="rounded-lg p-2 bg-gray-50 border border-gray-100">
                      <p className="text-[11px] font-bold text-gray-800">{reply.profile?.full_name || "Utilizador"}</p>
                      <p className="text-xs mt-0.5 text-gray-600">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {user && (
                <button onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)} className="flex items-center gap-1 text-[11px] mt-1.5 text-gray-400">
                  <MessageCircle className="w-3 h-3" /> Responder
                </button>
              )}
              {replyingTo === review.id && user && (
                <div className="ml-7 mt-1.5 flex gap-2">
                  <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escrever resposta..."
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none border border-gray-200 text-gray-900" />
                  <button onClick={() => submitReply.mutate(review.id)} disabled={!replyText.trim() || submitReply.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: N.brown }}>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border-t border-gray-100">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Ainda sem avaliações</p>
          <p className="text-xs mt-1 text-gray-400">Seja o primeiro a avaliar após a compra.</p>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
