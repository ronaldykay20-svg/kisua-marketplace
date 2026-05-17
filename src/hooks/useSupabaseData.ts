import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Product } from "@/components/ProductCard";

// ── Helpers ──
const formatPrice = (price: number) => {
  return price.toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";
};

const mapDbProduct = (p: any): Product => ({
  id: p.id,
  title: p.title,
  price: formatPrice(p.price),
  oldPrice: p.old_price ? formatPrice(p.old_price) : undefined,
  discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
  image: p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
  rating: p.rating || undefined,
  reviews: p.total_reviews || undefined,
  freeShipping: p.free_shipping || false,
  badge: p.badge || undefined,
});

// ── Categories ──
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

// ── Products ──
export const useProducts = (options?: { featured?: boolean; freeShipping?: boolean; categoryId?: string; limit?: number; search?: string }) =>
  useQuery({
    queryKey: ["products", options],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (options?.featured) query = query.eq("is_featured", true);
      if (options?.freeShipping) query = query.eq("free_shipping", true);
      if (options?.categoryId) query = query.eq("category_id", options.categoryId);
      if (options?.search) query = query.ilike("title", `%${options.search}%`);
      if (options?.limit) query = query.limit(options.limit);

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Load cover images for all products
      const productIds = (data || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: mediaData } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (mediaData || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      return (data || []).map((p: any) => mapDbProduct({ ...p, cover_url: coverMap[p.id] }));
    },
  });

// ── CORRIGIDO: useProduct agora inclui company_id e faz join com companies ──
export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          sellers(id, name, slug, logo_url, avatar_url, rating, total_sales, is_verified, province),
          companies(id, name, logo_url, cover_url, is_verified, province, rating, total_reviews)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;

      // Busca a imagem de capa via product_media
      const { data: mediaData } = await supabase
        .from("product_media")
        .select("url, is_cover, type, sort_order")
        .eq("product_id", id)
        .order("sort_order");

      const cover = (mediaData || []).find((m: any) => m.is_cover)?.url
        || (mediaData || [])[0]?.url
        || null;

      return { ...data, cover_url: cover, _media: mediaData || [] };
    },
    enabled: !!id && id.length > 10,
  });

// ── Sellers ──
export const useSellers = (options?: { type?: "individual" | "company"; verified?: boolean; limit?: number }) =>
  useQuery({
    queryKey: ["sellers", options],
    queryFn: async () => {
      let query = supabase
        .from("sellers")
        .select("*")
        .eq("is_active", true);

      if (options?.type) query = query.eq("type", options.type);
      if (options?.verified) query = query.eq("is_verified", true);
      if (options?.limit) query = query.limit(options.limit);

      query = query.order("rating", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const sellerIds = (data || []).map((s: any) => s.id);
      let ratingsMap: Record<string, { avg: number; count: number }> = {};
      let productsCountMap: Record<string, number> = {};
      if (sellerIds.length > 0) {
        const { data: reviews } = await supabase
          .from("seller_reviews")
          .select("seller_id, rating")
          .in("seller_id", sellerIds);
        if (reviews) {
          const grouped: Record<string, number[]> = {};
          reviews.forEach((r: any) => {
            if (!grouped[r.seller_id]) grouped[r.seller_id] = [];
            grouped[r.seller_id].push(r.rating);
          });
          Object.entries(grouped).forEach(([sid, ratings]) => {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            ratingsMap[sid] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
          });
        }

        const { data: products } = await supabase
          .from("products")
          .select("seller_id")
          .in("seller_id", sellerIds)
          .eq("is_active", true);
        if (products) {
          products.forEach((p: any) => {
            productsCountMap[p.seller_id] = (productsCountMap[p.seller_id] || 0) + 1;
          });
        }
      }

      return (data || []).map((s: any) => ({
        ...s,
        rating: ratingsMap[s.id]?.avg ?? s.rating ?? 0,
        total_reviews: ratingsMap[s.id]?.count ?? 0,
        products_count: productsCountMap[s.id] ?? 0,
      }));
    },
  });

export const useSeller = (id: string) =>
  useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && id.length > 10,
  });

// ── Auctions ──
export const useAuctions = (status?: "upcoming" | "active" | "ended") =>
  useQuery({
    queryKey: ["auctions", status],
    queryFn: async () => {
      let query = supabase.from("auctions").select("*");
      if (status) query = query.eq("status", status);
      query = query.order("ends_at", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

// ── Live Streams ──
export const useLiveStreams = (status?: "scheduled" | "live" | "ended") =>
  useQuery({
    queryKey: ["live_streams", status],
    queryFn: async () => {
      let query = supabase.from("live_streams").select("*");
      if (status) query = query.eq("status", status);
      query = query.order("starts_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

// ── Promotions ──
export const usePromotions = (type?: "regular" | "flash") =>
  useQuery({
    queryKey: ["promotions", type],
    queryFn: async () => {
      let query = supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true);
      if (type) query = query.eq("type", type);
      query = query.order("ends_at", { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

// ── Favorites ──
export const useFavorites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, products(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        product: f.products ? mapDbProduct(f.products) : null,
      }));
    },
    enabled: !!user,
  });
};

// ── Orders ──
export const useOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const orders = data || [];
      if (orders.length === 0) return [];

      const orderIds = orders.map((order: any) => order.id);
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      if (itemsError) throw itemsError;

      const itemsByOrder = (items || []).reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});

      return orders.map((order: any) => ({
        ...order,
        order_items: itemsByOrder[order.id] || [],
      }));
    },
    enabled: !!user,
  });
};

// ── Cart ──
export const useCart = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, products(*)")
        .eq("user_id", user!.id);
      if (error) throw error;

      const cartItems = data || [];
      if (cartItems.length === 0) return cartItems;

      const productIds = cartItems
        .map((item: any) => item.products?.id)
        .filter(Boolean);

      let coverMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const { data: mediaData } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", productIds)
          .eq("is_cover", true);
        (mediaData || []).forEach((m: any) => {
          coverMap[m.product_id] = m.url;
        });
      }

      return cartItems.map((item: any) => ({
        ...item,
        products: item.products
          ? { ...item.products, cover_url: coverMap[item.products.id] || null }
          : item.products,
      }));
    },
    enabled: !!user,
  });
};

// ── Profile ──
export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
