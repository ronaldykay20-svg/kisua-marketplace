import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Share2, ShoppingCart, Star, Truck, Shield,
  MapPin, ChevronRight, Minus, Plus, ZoomIn, Store, MessageCircle,
  Send, Loader2, ShieldCheck, X, Building2, Check, Eye,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { allProducts } from "@/data/products";
import { useProduct } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasAnalyticsConsent } from "@/lib/analytics";
import { useAddToCart } from "@/hooks/useCartActions";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductViewers } from "@/hooks/useProductViewers";
import { toast } from "sonner";
import { trackViewedProduct } from "@/lib/recentBrowsing";
import { useCategoryTracking } from "@/hooks/useCategoryTracking";

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

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";

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
    // Respeita a escolha de cookies da pessoa — se ela rejeitou analytics,
    // não gravamos nada, tal como o resto do site já faz.
    if (!hasAnalyticsConsent()) return;
    try {
      const sessionId = sessionStorage.getItem("kw_session_id") || (() => {
        const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem("kw_session_id", id); return id;
      })();
      const { error } = await (supabase as any).from("product_tracking_events").insert({
        product_id: productId, event_type: eventType, user_id: user?.id || null, session_id: sessionId,
        metadata: { ...metadata, user_agent: navigator.userAgent, screen_width: window.innerWidth, platform: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop", timestamp: new Date().toISOString(), url: window.location.href },
      });
      if (error) console.error("Falha ao gravar evento de tracking:", error);
    } catch (err) {
      console.error("Falha ao gravar evento de tracking:", err);
    }
  }, [user?.id]);
  return { trackEvent };
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
  const { trackCategoryView } = useCategoryTracking();

  // Contagem de itens no carrinho (para o badge do ícone no header)
  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart_count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSubVariants, setSelectedSubVariants] = useState<Record<string, string>>({});
  const [activeVariantTab, setActiveVariantTab] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  // ── FIX 2: Estado separado para "Comprar agora" ───────────────────────────
  const [buyingNow, setBuyingNow] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const viewTracked = useRef(false);
  const isUuid = id && id.length > 10;

  // Guarda em localStorage para alimentar "Recomendado para si"
  useEffect(() => {
    if (isUuid && id) trackViewedProduct(id);
  }, [isUuid, id]);

  const { data: dbProduct, isLoading: loadingProduct } = useProduct(id || "");
  // Presença real: esta pessoa passa a contar como "a ver agora" enquanto
  // estiver nesta página (track: true). Nada de números inventados.
  const liveViewerCount = useProductViewers(isUuid ? id : null, { track: true, enabled: !!isUuid });
  const { data: dbMedia = [] } = useQuery({ queryKey: ["product_media_detail", id], queryFn: async () => { const { data } = await supabase.from("product_media").select("*").eq("product_id", id!).order("sort_order"); return data || []; }, enabled: !!isUuid });
  const { data: dbVariants = [] } = useQuery({ queryKey: ["product_variants", id], queryFn: async () => { const { data } = await supabase.from("product_variants").select("*").eq("product_id", id!).eq("is_active", true).order("sort_order"); return data || []; }, enabled: !!isUuid });

  // ── Anúncio banner para o espaço lateral ──────────────────────────────────
  const { data: sideBannerAd } = useQuery({
    queryKey: ["product_detail_side_ad"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ads")
        .select("id, title, media_url, media_type, destination_url")
        .eq("type", "banner")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  const { data: productAds = [] } = useQuery({ queryKey: ["product_ads_detail"], queryFn: async () => { const { data } = await (supabase as any).from("ads").select("id, title, media_url, media_type, destination_url").eq("type", "banner").eq("is_active", true).order("created_at", { ascending: false }).limit(3); return data || []; } });

  const rawSellerId  = (dbProduct as any)?.seller_id  || (dbProduct as any)?.sellers?.id || null;
  const rawCompanyId = (dbProduct as any)?.company_id || null;
  const categoryId   = (dbProduct as any)?.category_id;

  const { data: sellerFull,  isLoading: loadingSeller  } = useQuery({ queryKey: ["seller_full",  rawSellerId],  queryFn: async () => { const { data } = await supabase.from("sellers").select("id,name,logo_url,avatar_url,banner_url,is_verified,province,rating,total_sales,type,user_id").eq("id", rawSellerId!).maybeSingle(); return data ? { ...data, __type: "seller" } : null; }, enabled: !!rawSellerId });
  const { data: companyFull, isLoading: loadingCompany } = useQuery({ queryKey: ["company_full", rawCompanyId], queryFn: async () => { const { data } = await (supabase as any).from("companies").select("id,name,logo_url,banner_url,is_verified,province,rating,total_reviews,total_sales").eq("id", rawCompanyId!).maybeSingle(); return data ? { ...data, __type: "company" } : null; }, enabled: !!rawCompanyId });
  const loadingPublisher = (!!rawSellerId && loadingSeller) || (!!rawCompanyId && loadingCompany);
  const publisher: any = sellerFull || companyFull || null;

  // ── Loja/empresa: seguir, contagens reais e outros produtos ──────────────
  // Mesmo padrão de VendedorPerfil.tsx/EmpresaPerfil.tsx, só que aqui o
  // "alvo" (tabela/coluna) muda consoante o produto pertence a um vendedor
  // ou a uma empresa — sem isto duplicaríamos toda a lógica duas vezes.
  const followTable  = publisher?.__type === "company" ? "company_follows" : "seller_follows";
  const followColumn = publisher?.__type === "company" ? "company_id"     : "seller_id";
  const publisherField = publisher?.__type === "company" ? "company_id"   : "seller_id";

  const { data: storeProductCount = 0 } = useQuery({
    queryKey: ["store_product_count", publisher?.__type, publisher?.id],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq(publisherField, publisher!.id).eq("is_active", true);
      return count || 0;
    },
    enabled: !!publisher?.id,
  });

  const { data: storeOtherProducts = [] } = useQuery({
    queryKey: ["store_other_products", publisher?.__type, publisher?.id, id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq(publisherField, publisher!.id).eq("is_active", true).neq("id", id!).order("sales_count", { ascending: false }).limit(12);
      const ids = (data || []).map((p: any) => p.id); const cMap: Record<string, string> = {};
      if (ids.length) { const { data: m } = await supabase.from("product_media").select("product_id,url").in("product_id", ids).eq("is_cover", true); (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; }); }
      return (data || []).map((p: any) => ({ id: p.id, title: p.title, price: fmt(p.price), image: cMap[p.id] || p.image_url || FALLBACK_IMG }));
    },
    enabled: !!publisher?.id && !!isUuid,
  });

  const { data: isFollowingPublisher, refetch: refetchFollowPublisher } = useQuery({
    queryKey: ["publisher_follow", followTable, publisher?.id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from(followTable).select("id").eq(followColumn, publisher!.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!publisher?.id && !!user,
  });

  const { data: publisherFollowersCount = 0, refetch: refetchPublisherFollowers } = useQuery({
    queryKey: ["publisher_followers_count", followTable, publisher?.id],
    queryFn: async () => {
      const { count } = await (supabase as any).from(followTable).select("id", { count: "exact", head: true }).eq(followColumn, publisher!.id);
      return count || 0;
    },
    enabled: !!publisher?.id,
  });

  const togglePublisherFollow = useMutation({
    mutationFn: async () => {
      if (!user) { navigate("/auth"); return; }
      if (isFollowingPublisher) {
        const { error } = await (supabase as any).from(followTable).delete().eq(followColumn, publisher!.id).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(followTable).insert({ [followColumn]: publisher!.id, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["publisher_followers_count", followTable, publisher?.id] });
      await queryClient.cancelQueries({ queryKey: ["publisher_follow", followTable, publisher?.id, user?.id] });
      const prevCount = queryClient.getQueryData<number>(["publisher_followers_count", followTable, publisher?.id]);
      const prevFollowing = queryClient.getQueryData<boolean>(["publisher_follow", followTable, publisher?.id, user?.id]);
      queryClient.setQueryData(["publisher_follow", followTable, publisher?.id, user?.id], !isFollowingPublisher);
      queryClient.setQueryData(["publisher_followers_count", followTable, publisher?.id], (old: number = 0) => isFollowingPublisher ? Math.max(0, old - 1) : old + 1);
      return { prevCount, prevFollowing };
    },
    onError: (err: any, _vars, context) => {
      if (context) {
        queryClient.setQueryData(["publisher_followers_count", followTable, publisher?.id], context.prevCount);
        queryClient.setQueryData(["publisher_follow", followTable, publisher?.id, user?.id], context.prevFollowing);
      }
      toast.error(err?.message || "Não foi possível atualizar. Tenta novamente.");
    },
    onSuccess: () => { toast.success(isFollowingPublisher ? "Deixou de seguir" : "A seguir!"); },
    onSettled: () => { refetchFollowPublisher(); refetchPublisherFollowers(); },
  });

  // ── Comprados juntos com frequência — dados reais de order_items via RPC ──
  const { data: boughtTogether = [] } = useQuery({
    queryKey: ["frequently_bought_with", id],
    queryFn: async () => {
      const { data: pairs } = await supabase.rpc("get_frequently_bought_with", { p_product_id: id!, p_limit: 8 } as any);
      const ids = ((pairs as any[]) || []).map((x: any) => x.product_id);
      if (!ids.length) return [];
      const { data: prods } = await supabase.from("products").select("id,title,price,image_url").in("id", ids).eq("is_active", true);
      const cMap: Record<string, string> = {};
      const { data: media } = await supabase.from("product_media").select("product_id,url").in("product_id", ids).eq("is_cover", true);
      (media || []).forEach((m: any) => { cMap[m.product_id] = m.url; });
      return ids
        .map((pid: string) => (prods || []).find((p: any) => p.id === pid))
        .filter(Boolean)
        .map((p: any) => ({ id: p.id, title: p.title, price: fmt(p.price), image: cMap[p.id] || p.image_url || FALLBACK_IMG }));
    },
    enabled: !!isUuid,
  });

  // ── Produtos em promoção — dados reais e activos de promotions/promotion_products ──
  const { data: activePromotions = [] } = useQuery({
    queryKey: ["product_page_active_promotions", id],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: promos } = await (supabase as any).from("promotions").select("id,title,discount_percent,ends_at").eq("is_active", true).lte("starts_at", nowIso).gte("ends_at", nowIso).order("ends_at", { ascending: true }).limit(4);
      if (!promos || promos.length === 0) return [];
      const promoIds = promos.map((p: any) => p.id);
      const { data: pp } = await (supabase as any).from("promotion_products").select("id,product_id,promo_price,stock_limit,stock_sold,promotion_id").in("promotion_id", promoIds).limit(24);
      const prodIds = [...new Set((pp || []).map((x: any) => x.product_id))];
      if (!prodIds.length) return [];
      const { data: prods } = await supabase.from("products").select("id,title,price,image_url").in("id", prodIds).eq("is_active", true);
      const prodMap: Record<string, any> = {}; (prods || []).forEach((p: any) => { prodMap[p.id] = p; });
      const cMap: Record<string, string> = {};
      const { data: media } = await supabase.from("product_media").select("product_id,url").in("product_id", prodIds).eq("is_cover", true);
      (media || []).forEach((m: any) => { cMap[m.product_id] = m.url; });
      return (pp || [])
        .filter((x: any) => prodMap[x.product_id] && x.product_id !== id)
        .map((x: any) => {
          const p = prodMap[x.product_id];
          const promo = promos.find((pr: any) => pr.id === x.promotion_id);
          const pct = p.price > 0 ? Math.round((1 - x.promo_price / p.price) * 100) : (promo?.discount_percent ?? 0);
          return {
            id: p.id,
            title: p.title,
            image: cMap[p.id] || p.image_url || FALLBACK_IMG,
            price: fmt(x.promo_price),
            oldPrice: fmt(p.price),
            discountPercent: pct,
            stockLeft: x.stock_limit != null ? Math.max(0, x.stock_limit - (x.stock_sold || 0)) : null,
          };
        });
    },
  });

  const { data: categoryName } = useQuery({ queryKey: ["category_name_detail", categoryId], queryFn: async () => { const { data } = await supabase.from("categories").select("name").eq("id", categoryId!).maybeSingle(); return data?.name || null; }, enabled: !!categoryId });

  // Regista a categoria deste produto como "a última vista" — alimenta o
  // "Recomendado para si" na home (ver useCategoryTracking.ts).
  useEffect(() => {
    if (categoryId) trackCategoryView(categoryId, "product");
  }, [categoryId]);

  // Resolve a "família" de categorias: se o produto está numa subcategoria (ex: Roupa > Vestidos),
  // a família inclui o pai (Roupa) e todas as subcategorias irmãs (Vestidos, Calças, Camisas...).
  // Sem isto, produtos em subcategorias diferentes da mesma família nunca se "encontram".
  const { data: familyCategoryIds = [] } = useQuery({
    queryKey: ["category_family", categoryId],
    queryFn: async () => {
      const { data: cat } = await supabase.from("categories").select("id, parent_id").eq("id", categoryId!).maybeSingle();
      if (!cat) return [categoryId as string];
      const rootId = cat.parent_id || cat.id; // se for subcategoria, a raiz da família é o pai
      const { data: family } = await supabase.from("categories").select("id").or(`id.eq.${rootId},parent_id.eq.${rootId}`);
      const ids = (family || []).map((c: any) => c.id);
      return ids.length ? ids : [categoryId as string];
    },
    enabled: !!categoryId,
  });
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
    queryKey: ["related_products", id, categoryId, rawSellerId, (dbProduct as any)?.title, familyCategoryIds.join(",")],
    queryFn: async () => {
      const collected: any[] = []; const seen = new Set<string>([id!]);
      const fetchSet = async (filter: (q: any) => any, limit: number) => { const { data } = await filter(supabase.from("products").select("*").eq("is_active", true).neq("id", id!).limit(limit)); (data || []).forEach((p: any) => { if (!seen.has(p.id)) { seen.add(p.id); collected.push(p); } }); };

      // 1) Mesma família (categoria-pai + subcategorias irmãs) — prioridade máxima
      if (familyCategoryIds.length) {
        await fetchSet(q => q.in("category_id", familyCategoryIds).order("sales_count", { ascending: false }), 30);
      } else if (import.meta.env.DEV) {
        // Aviso de diagnóstico: se isto aparecer sempre, o produto não tem category_id na BD
        console.warn(`[related_products] Produto ${id} sem category_id — a cair no fallback genérico.`);
      }

      // 2) Mesmo vendedor
      if (rawSellerId && collected.length < 30) {
        await fetchSet(q => q.eq("seller_id", rawSellerId).order("sales_count", { ascending: false }), 20);
      }

      // 3) Título parecido — evita cair sempre nos mesmos "mais vendidos" quando falta categoria
      const title = (dbProduct as any)?.title as string | undefined;
      if (collected.length < 30 && title) {
        const keyword = title.split(" ").filter((w) => w.length > 3)[0];
        if (keyword) await fetchSet(q => q.ilike("title", `%${keyword}%`).order("sales_count", { ascending: false }), 20);
      }

      // 4) Fallback final: mais vendidos (só entra se as fontes acima não completarem)
      if (collected.length < 30) await fetchSet(q => q.order("sales_count", { ascending: false }), 30);

      const ids = collected.map((p: any) => p.id); const cMap: Record<string, string> = {};
      if (ids.length) { const { data: m } = await supabase.from("product_media").select("product_id,url").in("product_id", ids).eq("is_cover", true); (m || []).forEach((x: any) => { cMap[x.product_id] = x.url; }); }
      return collected.map((p: any) => ({ id: p.id, title: p.title, price: fmt(p.price), rawPrice: p.price, rating: p.rating || 0, image: cMap[p.id] || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop" }));
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

  const handleShare = async () => {
    trackEvent(id!, "share", {});

    const title = (dbProduct as any)?.title || "Produto";
    const price = activePrice;
    const desc = `${(dbProduct as any)?.description?.slice(0, 100) || ""}${price ? `\n💰 ${price}` : ""}`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        // Tenta partilhar com imagem como ficheiro
        if (currentImageUrl) {
          try {
            const res = await fetch(currentImageUrl);
            const blob = await res.blob();
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `produto.${ext}`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ title, text: `${desc}\n\n${url}`, files: [file] });
              return;
            }
          } catch (_) {
            // Se falhar o download da imagem, continua sem imagem
          }
        }

        // Partilha sem imagem mas com título, descrição e link
        await navigator.share({ title, text: `${desc}\n\n${url}` });
        return;
      }

      // Fallback: copia tudo para a área de transferência
      await navigator.clipboard.writeText(`${title}\n${desc}\n\n${url}`);
      toast.success("Link copiado!");
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Não foi possível partilhar");
    }
  };

  const getVariantId = () => Object.values(selectedSubVariants).find(Boolean) || Object.values(selectedVariants).find(Boolean) || undefined;

  // ── FIX 2: Carrinho — não bloqueia "Comprar agora" ───────────────────────
  const handleAddToCart = () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    trackEvent(id!, "add_to_cart", { quantity: qty });
    addToCart.mutate({ productId: id!, quantity: qty, variantId: getVariantId() });
  };

  // ── FIX 2: Comprar agora — estado próprio, ignora carrinho ───────────────
  const handleBuyNow = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!isUuid) { toast.info("Produto de demonstração"); return; }
    setBuyingNow(true);
    trackEvent(id!, "buy_now", { quantity: qty });
    navigate("/checkout", {
      state: {
        soloProduct: {
          productId: id!,
          quantity: qty,
          variantId: getVariantId() || null,
        },
      },
    });
    setBuyingNow(false);
  };

  const handleZoom = () => { trackEvent(id!, "image_zoom", { image_index: selectedImage }); setZoomOpen(true); };

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

  // ── FIX: normaliza o tipo de variante (trim + lowercase) para evitar que
  // "Estilo", "estilo" ou "Estilo " virem grupos diferentes. O texto original
  // (primeira ocorrência) é guardado em *Labels para continuar a exibir bonito.
  const normType = (t: string) => (t || "").trim().toLowerCase();

  const parentVariants = (dbVariants as any[]).filter((v: any) => !v.parent_id);
  const childVariants  = (dbVariants as any[]).filter((v: any) =>  v.parent_id);
  const variantGroups: Record<string, any[]> = {};
  const variantGroupLabels: Record<string, string> = {};
  parentVariants.forEach((v: any) => {
    const key = normType(v.variant_type);
    if (!variantGroups[key]) { variantGroups[key] = []; variantGroupLabels[key] = v.variant_type; }
    variantGroups[key].push(v);
  });

  const selectedParentIds = Object.values(selectedVariants).filter(Boolean);
  const activeChildren = childVariants.filter((c: any) =>
    selectedParentIds.length > 0 ? selectedParentIds.includes(c.parent_id) : true
  );
  const childGroups: Record<string, any[]> = {};
  const childGroupLabels: Record<string, string> = {};
  activeChildren.forEach((v: any) => {
    const key = normType(v.variant_type);
    if (!childGroups[key]) { childGroups[key] = []; childGroupLabels[key] = v.variant_type; }
    if (!childGroups[key].some((x: any) => x.name === v.name)) {
      childGroups[key].push(v);
    }
  });

  const allSelIds     = [...Object.values(selectedVariants), ...Object.values(selectedSubVariants)].filter(Boolean);
  // FIX: antes só trocava a imagem se a variante tivesse price_override.
  // Agora troca sempre que a variante selecionada tiver imagem própria.
  const activeVariant = (dbVariants as any[]).find((v: any) => allSelIds.includes(v.id) && (v.image_url || v.price_override));
  const activePrice   = activeVariant?.price_override ? fmt(activeVariant.price_override) : product.price;
  const variantImage  = activeVariant?.image_url || null;
  const images        = dbMedia.length > 0 ? dbMedia.map((m: any) => ({ url: m.url, type: m.type || "image" })) : [{ url: product.image, type: "image" }];
  const displayImages = variantImage ? [{ url: variantImage, type: "image" }, ...images.filter(i => i.url !== variantImage)] : images;
  const currentImageUrl = displayImages[selectedImage]?.url || product.image;
  const isFavorited = isFavorite(id!);

  const typeLabels: Record<string, string> = { color: "Cor", size: "Tamanho", material: "Material", style: "Estilo", weight: "Peso", capacity: "Capacidade", model: "Modelo", voltage: "Voltagem", pack: "Pacote", other: "Opção" };
  const dimensionsStr = (product.length_cm && product.width_cm && product.height_cm) ? `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm` : null;

  const specRows: { label: string; value: string }[] = [
    categoryName       ? { label: "Categoria",  value: categoryName }                                              : null,
    product.condition  ? { label: "Condição",   value: conditionLabels[product.condition] || product.condition }  : null,
    product.sku        ? { label: "SKU",         value: product.sku }                                              : null,
    product.weight_kg  ? { label: "Peso",        value: `${product.weight_kg} kg` }                               : null,
    dimensionsStr      ? { label: "Dimensões",   value: dimensionsStr }                                            : null,
    product.freeShipping ? { label: "Frete",     value: "Grátis para Luanda" }                                    : null,
    { label: "Devolução",  value: "Grátis até 3 dias" },
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

  const totalVariantGroupCount = Object.keys(variantGroups).length + Object.keys(childGroups).length;

  // ── FIX: em vez de empilhar cada grupo (Cor, Modelo, Estilo, Material...)
  // um por baixo do outro, unimos tudo numa lista e mostramos como abas.
  // Só as opções do grupo activo aparecem, num carrossel horizontal.
  const allVariantGroupEntries = [
    ...Object.entries(variantGroups).map(([type, variants]) => ({
      key: `parent:${type}`, type, variants, isChild: false,
      label: typeLabels[type] || variantGroupLabels[type] || type,
    })),
    ...Object.entries(childGroups).map(([type, variants]) => ({
      key: `child:${type}`, type, variants, isChild: true,
      label: typeLabels[type] || childGroupLabels[type] || type,
    })),
  ];
  const currentTabKey = activeVariantTab && allVariantGroupEntries.some(g => g.key === activeVariantTab)
    ? activeVariantTab
    : allVariantGroupEntries[0]?.key || null;
  const activeGroupEntry = allVariantGroupEntries.find(g => g.key === currentTabKey) || null;

  const handleVariantSelect = (entry: { type: string; isChild: boolean }, v: any) => {
    if (entry.isChild) {
      setSelectedSubVariants(p => ({ ...p, [entry.type]: selectedSubVariants[entry.type] === v.id ? "" : v.id }));
      trackEvent(id!, "variant_select", { variant_id: v.id, variant_type: entry.type, is_sub: true });
    } else {
      setSelectedVariants(p => ({ ...p, [entry.type]: selectedVariants[entry.type] === v.id ? "" : v.id }));
      if (selectedVariants[entry.type] === v.id) setSelectedSubVariants({});
      trackEvent(id!, "variant_select", { variant_id: v.id, variant_type: entry.type });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {zoomOpen && <ZoomLightbox images={displayImages} index={selectedImage} onClose={() => setZoomOpen(false)} onChange={setSelectedImage} onShare={handleShare} />}

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
          <button onClick={() => navigate("/carrinho")} className="relative w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white">
            <ShoppingCart className="w-4 h-4 text-gray-700" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none"
                style={{ background: N.brown }}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>
          <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white">
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* ── BLOCO TOPO ── */}
      {/*
        FIX 3 — Desktop layout:
        - No desktop (md+), mostra info do produto em coluna esquerda e a imagem principal
          em coluna direita (sem o banner lateral que era muito grande).
        - O banner lateral só aparece em mobile (abaixo do título) para não ficar gigante.
        - Usamos max-w-5xl mx-auto para centrar o conteúdo em ecrãs largos.
      */}
      <div className="max-w-5xl mx-auto">

        {/* ── LAYOUT DESKTOP: grid de 2 colunas ── */}
        <div className="md:grid md:grid-cols-2 md:gap-8 md:px-6 md:pt-6 md:pb-4">

          {/* COLUNA ESQUERDA (desktop) — imagem principal + thumbnails */}
          <div className="md:block">
            {/* Imagem principal */}
            <div className="relative bg-gray-50"
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e => { if (touchStartX.current === null) return; const diff = touchStartX.current - e.changedTouches[0].clientX; if (Math.abs(diff) > 40) setSelectedImage(i => diff > 0 ? Math.min(i + 1, displayImages.length - 1) : Math.max(i - 1, 0)); touchStartX.current = null; }}>
              {/* Mobile: full width; Desktop: rounded + max height controlled by grid */}
              <div className="w-full md:rounded-2xl md:overflow-hidden" style={{ aspectRatio: "1/1" }}>
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
              <div className="flex gap-2 px-3 md:px-0 py-2 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100 md:border-none">
                {displayImages.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all"
                    style={{ borderColor: i === selectedImage ? N.brown : "#ddd", opacity: i === selectedImage ? 1 : 0.6 }}>
                    {img.type === "video" ? <video src={img.url} className="w-full h-full object-cover" /> : <img src={img.url} alt="" className="w-full h-full object-cover" />}
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-auto flex-shrink-0 md:hidden">
                  {displayImages.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === selectedImage ? 14 : 5, height: 5, background: i === selectedImage ? N.brown : "#ccc" }} />)}
                </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA (desktop) — info do produto; em mobile fica abaixo da imagem */}
          <div className={`px-3 pt-3 pb-2 md:px-0 md:pt-0 md:pb-0 ${sideBannerAd?.media_url ? "" : "border-b border-gray-100 md:border-none"}`}>

            {/* Vendedor */}
            {publisher && !loadingPublisher && (
              <button onClick={handlePublisherNavigate} className="flex items-center gap-2 mb-1.5 w-full text-left">
                <AvatarWithFallback src={publisher.logo_url || publisher.avatar_url || null} name={publisher.name} isCompany={publisher.__type === "company"} />
                <div className="text-left min-w-0 flex-1">
                  <span className="text-xs font-bold truncate block" style={{ color: N.brown }}>{publisher.name}</span>
                  {publisher.is_verified && <ShieldCheck className="w-3 h-3 text-blue-500 inline ml-1" />}
                  {publisher.__type === "company" && <span className="ml-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Empresa</span>}
                  {publisher?.province && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{String(publisher.province).replace(/0+$/, "").trim()}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            )}

            <h1 className="text-base md:text-xl font-bold leading-snug text-gray-900 line-clamp-2 md:line-clamp-none">{product.title}</h1>

            {/* Rating */}
            {product.rating ? (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}
                </div>
                <span className="text-xs font-bold" style={{ color: N.accent }}>{product.rating}</span>
                <span className="text-xs text-gray-500">({product.reviews?.toLocaleString()})</span>
                {popularityBadge && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100">🛒 {popularityBadge}</span>}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Sem avaliações ainda</p>
            )}

            {/* Pessoas a ver agora — contagem real via presença, não inventada.
                Só aparece quando há de facto mais alguém além do próprio visitante. */}
            {liveViewerCount > 1 && (
              <div className="flex items-center gap-1 mt-1">
                <span
                  className="rounded-full"
                  style={{
                    width: 6, height: 6, background: "#5a8a5a",
                    animation: "kw-live-pulse 1.6s infinite",
                  }}
                />
                <Eye className="w-3 h-3" style={{ color: "#7fa87f" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#5a8a5a" }}>
                  {liveViewerCount} pessoas a ver agora
                </span>
                <style>{`
                  @keyframes kw-live-pulse {
                    0%   { box-shadow: 0 0 0 0 rgba(90,138,90,0.55); }
                    70%  { box-shadow: 0 0 0 5px rgba(90,138,90,0); }
                    100% { box-shadow: 0 0 0 0 rgba(90,138,90,0); }
                  }
                `}</style>
              </div>
            )}

            {/* Preço */}
            <div className="mt-2">
              {product.discount && <p className="text-[10px] font-bold uppercase text-red-600">Oferta por tempo limitado</p>}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl md:text-3xl font-black" style={{ color: N.brown }}>{activePrice}</span>
                {product.discount && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-red-600 bg-red-50">{product.discount}</span>}
              </div>
              {product.oldPrice && <p className="text-sm line-through text-gray-400">De: {product.oldPrice}</p>}
              {product.freeShipping && (
                <p className="text-xs font-bold text-green-700 flex items-center gap-1 mt-0.5"><Truck className="w-3.5 h-3.5" /> Frete grátis</p>
              )}
            </div>

            {/* Vendido por — linha compacta estilo Walmart, com dados reais de sellerFull/companyFull */}
            {publisher && !loadingPublisher && (
              <button onClick={handlePublisherNavigate} className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
                <span className="text-gray-500">Vendido por</span>
                <span className="font-bold underline" style={{ color: N.brown }}>{publisher.name}</span>
                {publisher.is_verified && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600">
                    <ShieldCheck className="w-3 h-3" /> Verificado
                  </span>
                )}
                {publisher.rating ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {Number(publisher.rating).toFixed(1)}
                    {publisher.__type === "company" && publisher.total_reviews ? ` (${publisher.total_reviews})` : ""}
                  </span>
                ) : null}
              </button>
            )}

            {/* FIX 3: banner lateral — só aparece em mobile (md:hidden) para não ficar gigante no desktop */}
            {sideBannerAd?.media_url && (
              <div className="md:hidden mt-3">
                <p className="text-[8px] text-gray-400 text-right mb-0.5 uppercase tracking-wide">Pub</p>
                {sideBannerAd.destination_url ? (
                  <a href={sideBannerAd.destination_url} target="_blank" rel="noopener noreferrer" className="block">
                    <SideBannerContent ad={sideBannerAd} />
                  </a>
                ) : (
                  <SideBannerContent ad={sideBannerAd} />
                )}
              </div>
            )}

            {/* ── Botões de ação DESKTOP (visíveis só em md+) ── */}
            <div className="hidden md:block mt-5">
              {/* Quantidade */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-gray-700">Quantidade:</span>
                <div className="flex items-center rounded-lg overflow-hidden border border-gray-300">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center text-sm font-bold text-gray-900">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              {/* Botões */}
              <div className="flex gap-3">
                <button onClick={handleAddToCart} disabled={addToCart.isPending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 border hover:bg-gray-50"
                  style={{ borderColor: N.brown, color: N.brown, background: "#fff" }}>
                  {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Adicionar ao carrinho
                </button>
                <button onClick={handleBuyNow} disabled={buyingNow}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                  style={{ background: N.brown }}>
                  {buyingNow && <Loader2 className="w-4 h-4 animate-spin" />} Comprar agora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE: imagem principal fica ANTES da info (invertido no mobile via order) ── */}
        {/* NOTE: A imagem mobile já está dentro do grid acima. Em mobile o CSS natural empilha
            coluna 1 (imagem) depois coluna 2 (info). Perfeito. */}

        {/* ── VARIANTES ── */}
        {totalVariantGroupCount > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Opções disponíveis</p>

            {/* Abas dos grupos — carrossel horizontal, nunca empilha */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
              {allVariantGroupEntries.map(entry => {
                const selId = entry.isChild ? selectedSubVariants[entry.type] : selectedVariants[entry.type];
                const selName = entry.variants.find((v: any) => v.id === selId)?.name;
                const isActiveTab = currentTabKey === entry.key;
                return (
                  <button key={entry.key} onClick={() => setActiveVariantTab(entry.key)}
                    className="flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                    style={{ background: isActiveTab ? N.brown : "#fff", color: isActiveTab ? "#fff" : "#555", borderColor: isActiveTab ? N.brown : "#ddd" }}>
                    {entry.label}
                    {selName && <span className="font-normal opacity-80">: {selName}</span>}
                  </button>
                );
              })}
            </div>

            {/* Opções do grupo activo — carrossel horizontal */}
            {activeGroupEntry && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pt-3 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
                {activeGroupEntry.variants.map((v: any) => (
                  <div key={v.id} className="flex-shrink-0 snap-start">
                    <VariantPill v={v} type={activeGroupEntry.type}
                      selected={(activeGroupEntry.isChild ? selectedSubVariants[activeGroupEntry.type] : selectedVariants[activeGroupEntry.type]) === v.id}
                      onSelect={() => handleVariantSelect(activeGroupEntry, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ESPECIFICAÇÕES ── */}
        {specRows.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <p className="text-sm font-bold text-gray-900 mb-2">Especificações</p>
            <div className="grid grid-cols-2 gap-0">
              {specRows.map((row, i) => (
                <div key={row.label} className="py-2 px-2" style={{ background: i % 2 === 0 ? "#fafafa" : "#fff", borderBottom: "1px solid #f0f0f0" }}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{row.label}</p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">{row.value}</p>
                </div>
              ))}
              {specRows.length % 2 !== 0 && (
                <div className="py-2 px-2" style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }} />
              )}
            </div>
          </div>
        )}

        {/* ── SOBRE O PRODUTO ── */}
        <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
          <p className="text-sm font-bold text-gray-900 mb-1.5">Sobre este produto</p>
          <p className={`text-sm leading-relaxed text-gray-700 whitespace-pre-line ${!descExpanded ? "line-clamp-4" : ""}`}>
            {product.description || "Produto de alta qualidade disponível no ZANGU."}
          </p>
          {product.description && product.description.length > 200 && (
            <button onClick={() => setDescExpanded(v => !v)} className="text-xs font-bold mt-1" style={{ color: N.accent }}>
              {descExpanded ? "Ver menos ▲" : "Ver mais ▼"}
            </button>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
            {[
              { icon: "✅", text: "Produto original com garantia" },
              { icon: "🚚", text: "Envio para todo o país" },
              { icon: "🔒", text: "Pagamento seguro" },
              { icon: "⭐", text: "Suporte ao cliente 24/7" },
              { icon: "↩️", text: "Devolução grátis 3 dias" },
              { icon: "📦", text: "Embalagem protegida" },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
                <span className="text-sm flex-shrink-0">{b.icon}</span>
                <span className="text-[11px] text-gray-700 leading-tight">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── ESPECIFICAÇÕES ── */}
        {(() => {
          const raw = dbProduct as any;
          const specs: { label: string; value: string }[] = [
            raw?.condition ? { label: "Condição", value: conditionLabels[raw.condition] || raw.condition } : null,
            raw?.category ? { label: "Categoria", value: raw.category } : null,
            raw?.weight_kg ? { label: "Peso", value: `${Number(raw.weight_kg).toLocaleString("pt-AO")} kg` } : null,
            (raw?.length_cm && raw?.width_cm && raw?.height_cm)
              ? { label: "Dimensões", value: `${raw.length_cm} × ${raw.width_cm} × ${raw.height_cm} cm` }
              : null,
            raw?.sku ? { label: "Referência (SKU)", value: raw.sku } : null,
            typeof raw?.stock === "number" ? { label: "Stock disponível", value: `${raw.stock} unidades` } : null,
            (raw?.city || raw?.province) ? { label: "Local de envio", value: [raw?.city, raw?.province].filter(Boolean).join(", ") } : null,
            publisher?.name ? { label: "Vendedor", value: publisher.name } : null,
          ].filter(Boolean) as { label: string; value: string }[];

          if (specs.length === 0) return null;
          return (
            <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
              <p className="text-sm font-bold text-gray-900 mb-2">Especificações</p>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                {specs.map((s, i) => (
                  <div key={s.label} className="flex text-xs" style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                    <span className="w-2/5 px-3 py-2 font-semibold text-gray-600 border-r border-gray-100">{s.label}</span>
                    <span className="flex-1 px-3 py-2 text-gray-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── ENTREGA ── */}
        <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
          <p className="text-sm font-bold text-gray-900 mb-2">Entrega e devoluções</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <MapPin className="w-4 h-4 text-blue-500" />, bg: "#eff6ff", title: "Luanda, Angola", sub: "2–5 dias úteis" },
              { icon: <Shield className="w-4 h-4 text-green-600" />, bg: "#f0fdf4", title: "Devolução grátis", sub: "Até 3 dias" },
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

        {/* ── LOJA / EMPRESA ── */}
        {publisher && !loadingPublisher && (
          <div className="bg-white border-b border-gray-100">
            <div className="relative h-24 md:h-32 overflow-hidden" style={{ background: N.brownLight }}>
              {publisher.banner_url && <img src={publisher.banner_url} alt="" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
            </div>
            <div className="px-3 md:px-6 -mt-8 pb-3">
              <div className="flex items-end gap-2.5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white bg-white shadow-sm flex-shrink-0">
                  <AvatarWithFallback src={publisher.logo_url || publisher.avatar_url || null} name={publisher.name} isCompany={publisher.__type === "company"} />
                </div>
                <button onClick={handlePublisherNavigate} className="flex-1 min-w-0 pb-0.5 text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold truncate" style={{ color: N.brown }}>{publisher.name}</span>
                    {publisher.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    {publisher.__type === "company" && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Empresa</span>}
                  </div>
                  {publisher?.province && <p className="text-[10px] text-gray-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{String(publisher.province).replace(/0+$/, "").trim()}</p>}
                </button>
                <button
                  onClick={() => togglePublisherFollow.mutate()}
                  disabled={togglePublisherFollow.isPending}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 flex-shrink-0 mb-0.5 disabled:opacity-60"
                  style={isFollowingPublisher ? { background: "#f0f0f0", color: "#555" } : { background: N.brown, color: "#fff" }}
                >
                  {togglePublisherFollow.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isFollowingPublisher ? <Check className="w-3 h-3" /> : null}
                  {isFollowingPublisher ? "A seguir" : "Seguir"}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mt-3">
                <div className="text-center p-1.5 rounded-lg" style={{ background: "#fafafa" }}>
                  <p className="text-xs font-black" style={{ color: N.brown }}>{publisherFollowersCount}</p>
                  <p className="text-[9px] text-gray-500">Seguidores</p>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ background: "#fafafa" }}>
                  <p className="text-xs font-black" style={{ color: N.brown }}>{storeProductCount}</p>
                  <p className="text-[9px] text-gray-500">Produtos</p>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ background: "#fafafa" }}>
                  <p className="text-xs font-black" style={{ color: N.brown }}>{publisher.rating ? Number(publisher.rating).toFixed(1) : "—"}</p>
                  <p className="text-[9px] text-gray-500">Avaliação</p>
                </div>
                <div className="text-center p-1.5 rounded-lg" style={{ background: "#fafafa" }}>
                  <p className="text-xs font-black" style={{ color: N.brown }}>{publisher.total_sales ?? 0}</p>
                  <p className="text-[9px] text-gray-500">Vendas</p>
                </div>
              </div>

              <button onClick={handlePublisherNavigate} className="w-full mt-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border" style={{ borderColor: N.brown, color: N.brown }}>
                Ver loja completa <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {storeOtherProducts.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">Mais desta loja</p>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {storeOtherProducts.map((p: any) => (
                      <MinimalProductCard key={p.id} product={p} onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "store_other" }); navigate(`/produto/${p.id}`); }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPRADOS JUNTOS COM FREQUÊNCIA ── */}
        {boughtTogether.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <p className="text-sm font-bold text-gray-900 mb-3">Comprados juntos com frequência</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {boughtTogether.map((p: any) => (
                <div key={p.id} className="flex flex-col flex-shrink-0" style={{ width: 118 }}>
                  <div onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "bought_together" }); navigate(`/produto/${p.id}`); }} className="relative w-full rounded-lg overflow-hidden cursor-pointer" style={{ aspectRatio: "1/1", background: "#f5f5f5" }}>
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: p.id, quantity: 1 }); }}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
                    >
                      <ShoppingCart className="w-3 h-3" style={{ color: N.brown }} />
                    </button>
                  </div>
                  <button onClick={() => navigate(`/produto/${p.id}`)} className="text-left">
                    <p className="text-[11px] font-semibold leading-snug line-clamp-2 mt-1 text-gray-900">{p.title}</p>
                    <p className="text-[11px] font-black mt-0.5" style={{ color: N.accent }}>{p.price}</p>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AVALIAÇÕES ── */}
        <ProductReviewsSection productId={id || ""} product={product} dbReviews={dbReviews} userOrders={userOrders} trackEvent={trackEvent} />

        {/* ── COMPARAR COM PRODUTOS SEMELHANTES ── */}
        {relatedProducts.length >= 2 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <p className="text-sm font-bold text-gray-900 mb-3">Comparar com produtos semelhantes</p>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 min-w-max border border-gray-100 rounded-lg overflow-hidden">
                {/* Coluna: este produto */}
                <div className="w-32 flex-shrink-0 border-r border-gray-100">
                  <div className="p-2" style={{ background: N.brownLight }}>
                    <p className="text-[9px] font-bold text-center mb-1" style={{ color: N.brown }}>Este produto</p>
                    <div className="w-full rounded-md overflow-hidden mb-1" style={{ aspectRatio: "1/1", background: "#f5f5f5" }}>
                      <img src={displayImages[0]?.url} alt={product.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] font-semibold leading-snug line-clamp-2">{product.title}</p>
                  </div>
                  <div className="px-2 py-1.5 text-xs font-black border-t border-gray-100" style={{ color: N.brown }}>{activePrice}</div>
                  <div className="px-2 py-1.5 text-[10px] text-gray-600 border-t border-gray-100 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {product.rating ? product.rating : "—"}
                  </div>
                </div>
                {/* Colunas: produtos semelhantes reais */}
                {relatedProducts.slice(0, 4).map((p: any) => (
                  <button key={p.id} onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "compare" }); navigate(`/produto/${p.id}`); }} className="w-32 flex-shrink-0 border-r border-gray-100 last:border-r-0 text-left hover:bg-gray-50 transition-colors">
                    <div className="p-2">
                      <p className="text-[9px] text-gray-400 text-center mb-1">&nbsp;</p>
                      <div className="w-full rounded-md overflow-hidden mb-1" style={{ aspectRatio: "1/1", background: "#f5f5f5" }}>
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] font-semibold leading-snug line-clamp-2 text-gray-900">{p.title}</p>
                    </div>
                    <div className="px-2 py-1.5 text-xs font-black border-t border-gray-100" style={{ color: N.accent }}>{p.price}</div>
                    <div className="px-2 py-1.5 text-[10px] text-gray-600 border-t border-gray-100 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {p.rating ? Number(p.rating).toFixed(1) : "—"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUTOS RELACIONADOS ── */}
        {relatedProducts.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <p className="text-sm font-bold text-gray-900 mb-3">Produtos relacionados</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {relatedProducts.map((p: any) => (
                <MinimalProductCard key={p.id} product={p} onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "related" }); navigate(`/produto/${p.id}`); }} />
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUTOS EM PROMOÇÃO ── */}
        {activePromotions.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">🔥 Produtos em promoção</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {activePromotions.slice(0, 8).map((p: any) => (
                <div key={p.id} className="rounded-xl overflow-hidden border border-gray-100">
                  <div onClick={() => { trackEvent(id!, "card_tap", { tapped_product_id: p.id, section: "promotions" }); navigate(`/produto/${p.id}`); }} className="relative w-full cursor-pointer" style={{ aspectRatio: "1/1", background: "#f5f5f5" }}>
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                    {p.discountPercent > 0 && (
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: N.accent }}>-{p.discountPercent}%</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: p.id, quantity: 1 }); }}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
                    >
                      <ShoppingCart className="w-3 h-3" style={{ color: N.brown }} />
                    </button>
                  </div>
                  <button onClick={() => navigate(`/produto/${p.id}`)} className="block w-full text-left p-1.5">
                    <p className="text-[10.5px] font-semibold leading-snug line-clamp-2 text-gray-900">{p.title}</p>
                    <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
                      <span className="text-[11px] font-black" style={{ color: N.accent }}>{p.price}</span>
                      <span className="text-[9px] text-gray-400 line-through">{p.oldPrice}</span>
                    </div>
                    {p.stockLeft != null && p.stockLeft <= 10 && (
                      <p className="text-[9px] font-bold text-red-500 mt-0.5">Só {p.stockLeft} restantes</p>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADS (fundo de página) ── */}
        {productAds.length > 0 && (
          <div className="bg-white px-3 md:px-6 py-3 space-y-3">
            <p className="text-[10px] text-right text-gray-400">Publicidade</p>
            {productAds.map((ad: any) => {
              const inner = (
                <div className="rounded-xl overflow-hidden border border-gray-200 md:max-w-lg">
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

      </div>{/* /max-w-5xl */}

      <div className="h-28 md:hidden" aria-hidden />

      {/* ── BARRA INFERIOR MOBILE (hidden no desktop) ── */}
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
          {/* FIX 2: disabled INDEPENDENTE — carrinho e comprar agora não se bloqueiam mutuamente */}
          <button onClick={handleAddToCart} disabled={addToCart.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 border"
            style={{ borderColor: N.brown, color: N.brown, background: "#fff" }}>
            {addToCart.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Carrinho
          </button>
          <button onClick={handleBuyNow} disabled={buyingNow}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: N.brown }}>
            {buyingNow && <Loader2 className="w-4 h-4 animate-spin" />} Comprar agora
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Banner lateral content ────────────────────────────────────────────────────
const SideBannerContent = ({ ad }: { ad: any }) => (
  <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: "1/1", maxWidth: 160 }}>
    {ad.media_type === "video"
      ? <video src={ad.media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
      : <img src={ad.media_url} alt={ad.title || "Anúncio"} className="w-full h-full object-cover" />}
    {ad.title && (
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
        <p className="text-white text-[9px] font-bold leading-tight line-clamp-2">{ad.title}</p>
      </div>
    )}
    <span className="absolute top-1.5 right-1.5 text-[7px] font-bold text-white/80 bg-black/40 px-1 py-0.5 rounded-full">Pub</span>
  </div>
);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews?.length, productId]);

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
    <div className="bg-white border-b border-gray-100 px-3 md:px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-900">Avaliações dos clientes</p>
        {canReview && (
          <button onClick={() => setShowForm(!showForm)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: N.brown }}>
            Avaliar
          </button>
        )}
      </div>

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
