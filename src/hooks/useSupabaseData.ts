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
      return (data || []).map(mapDbProduct);
    },
  });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, sellers(name, slug, logo_url, rating, total_sales, is_verified)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && id.length > 10, // UUID check — skip for numeric IDs (static data)
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
      return data;
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
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
      return data;
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
