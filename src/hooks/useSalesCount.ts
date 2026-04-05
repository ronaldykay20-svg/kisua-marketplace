import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Count confirmed sales for a seller (orders with status confirmed, shipped, or delivered).
 */
export const useSellerSalesCount = (sellerId: string | undefined) =>
  useQuery({
    queryKey: ["seller_sales_count", sellerId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", sellerId!)
        .in("status", ["confirmed", "shipped", "delivered"]);

      // If seller_id column doesn't exist on order_items, fallback to join approach
      if (error) {
        // Fallback: count via products
        const { data: products } = await supabase
          .from("products")
          .select("id")
          .eq("seller_id", sellerId!);
        if (!products || products.length === 0) return 0;

        const productIds = products.map((p: any) => p.id);
        const { data: items } = await supabase
          .from("order_items")
          .select("id, order_id")
          .in("product_id", productIds);
        if (!items || items.length === 0) return 0;

        const orderIds = [...new Set(items.map((i: any) => i.order_id))];
        const { data: orders } = await supabase
          .from("orders")
          .select("id")
          .in("id", orderIds)
          .in("status", ["confirmed", "shipped", "delivered"]);

        if (!orders) return 0;
        const confirmedOrderIds = new Set(orders.map((o: any) => o.id));
        return items.filter((i: any) => confirmedOrderIds.has(i.order_id)).length;
      }

      return count || 0;
    },
    enabled: !!sellerId,
  });

/**
 * Count confirmed sales for a company (via its sellers' products).
 */
export const useCompanySalesCount = (companyId: string | undefined) =>
  useQuery({
    queryKey: ["company_sales_count", companyId],
    queryFn: async () => {
      // Get sellers linked to company
      const { data: sellers } = await supabase
        .from("sellers")
        .select("id")
        .eq("company_id", companyId!);
      const sellerIds = (sellers || []).map((s: any) => s.id);

      // Get products from company directly + via sellers
      let productIds: string[] = [];
      const { data: directProducts } = await supabase
        .from("products")
        .select("id")
        .eq("company_id", companyId!);
      if (directProducts) productIds.push(...directProducts.map((p: any) => p.id));

      if (sellerIds.length > 0) {
        const { data: sellerProducts } = await supabase
          .from("products")
          .select("id")
          .in("seller_id", sellerIds);
        if (sellerProducts) {
          const existing = new Set(productIds);
          sellerProducts.forEach((p: any) => { if (!existing.has(p.id)) productIds.push(p.id); });
        }
      }

      if (productIds.length === 0) return 0;

      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id")
        .in("product_id", productIds);
      if (!items || items.length === 0) return 0;

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .in("status", ["confirmed", "shipped", "delivered"]);

      if (!orders) return 0;
      const confirmedOrderIds = new Set(orders.map((o: any) => o.id));
      return items.filter((i: any) => confirmedOrderIds.has(i.order_id)).length;
    },
    enabled: !!companyId,
  });

/**
 * Get all sellers ranked by confirmed sales count (for Ranking page).
 */
export const useSellerRanking = () =>
  useQuery({
    queryKey: ["seller_ranking"],
    queryFn: async () => {
      // Get all active sellers
      const { data: sellers, error } = await supabase
        .from("sellers")
        .select("id, name, slug, logo_url, rating, is_verified, type")
        .eq("is_active", true);
      if (error) throw error;
      if (!sellers || sellers.length === 0) return [];

      const sellerIds = sellers.map((s: any) => s.id);

      // Get products for these sellers that are NOT linked to a company (avoid mixing with empresa ranking)
      const { data: products } = await supabase
        .from("products")
        .select("id, seller_id")
        .in("seller_id", sellerIds)
        .is("company_id", null);

      if (!products || products.length === 0) {
        return sellers.map((s: any) => ({ ...s, sales: 0 }));
      }

      const productIds = products.map((p: any) => p.id);
      const productSellerMap: Record<string, string> = {};
      products.forEach((p: any) => { productSellerMap[p.id] = p.seller_id; });

      // Get confirmed order items
      const { data: items } = await supabase
        .from("order_items")
        .select("id, product_id, order_id")
        .in("product_id", productIds);

      if (!items || items.length === 0) {
        return sellers.map((s: any) => ({ ...s, sales: 0 }));
      }

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .in("status", ["confirmed", "shipped", "delivered"]);

      const confirmedOrderIds = new Set((orders || []).map((o: any) => o.id));

      // Count sales per seller
      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedOrderIds.has(item.order_id)) {
          const sid = productSellerMap[item.product_id];
          if (sid) salesMap[sid] = (salesMap[sid] || 0) + 1;
        }
      });

      // Get reviews for rating
      const { data: reviews } = await supabase
        .from("seller_reviews")
        .select("seller_id, rating")
        .in("seller_id", sellerIds);

      const ratingMap: Record<string, { avg: number; count: number }> = {};
      if (reviews) {
        const grouped: Record<string, number[]> = {};
        reviews.forEach((r: any) => {
          if (!grouped[r.seller_id]) grouped[r.seller_id] = [];
          grouped[r.seller_id].push(r.rating);
        });
        Object.entries(grouped).forEach(([sid, ratings]) => {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          ratingMap[sid] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
        });
      }

      return sellers
        .map((s: any) => ({
          ...s,
          sales: salesMap[s.id] || 0,
          rating: ratingMap[s.id]?.avg ?? s.rating ?? 0,
          reviews_count: ratingMap[s.id]?.count ?? 0,
        }))
        .sort((a: any, b: any) => b.sales - a.sales);
    },
  });

/**
 * Bulk sales counts for multiple sellers (for Vendedores list page).
 */
export const useBulkSellerSales = (sellerIds: string[]) =>
  useQuery({
    queryKey: ["bulk_seller_sales", sellerIds],
    queryFn: async () => {
      if (sellerIds.length === 0) return {};

      const { data: products } = await supabase
        .from("products")
        .select("id, seller_id")
        .in("seller_id", sellerIds);

      if (!products || products.length === 0) return {};

      const productIds = products.map((p: any) => p.id);
      const productSellerMap: Record<string, string> = {};
      products.forEach((p: any) => { productSellerMap[p.id] = p.seller_id; });

      const { data: items } = await supabase
        .from("order_items")
        .select("id, product_id, order_id")
        .in("product_id", productIds);

      if (!items || items.length === 0) return {};

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .in("status", ["confirmed", "shipped", "delivered"]);

      const confirmedOrderIds = new Set((orders || []).map((o: any) => o.id));

      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedOrderIds.has(item.order_id)) {
          const sid = productSellerMap[item.product_id];
          if (sid) salesMap[sid] = (salesMap[sid] || 0) + 1;
        }
      });

      return salesMap;
    },
    enabled: sellerIds.length > 0,
  });

/**
 * Ranking of products by confirmed sales count.
 */
export const useProductRanking = () =>
  useQuery({
    queryKey: ["product_ranking"],
    queryFn: async () => {
      // Get all order_items
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, order_id, quantity");
      if (!items || items.length === 0) return [];

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status")
        .in("id", orderIds);

      // Count as sale if order status is confirmed/shipped/delivered
      const confirmedIds = new Set(
        (orders || [])
          .filter((o: any) => ["confirmed", "shipped", "delivered"].includes(o.status))
          .map((o: any) => o.id)
      );

      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedIds.has(item.order_id)) {
          salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 1);
        }
      });

      const productIds = Object.keys(salesMap);
      if (productIds.length === 0) return [];

      const { data: products } = await supabase
        .from("products")
        .select("id, title, price, rating, total_reviews, product_media(url, is_cover)")
        .in("id", productIds);

      return (products || [])
        .map((p: any) => {
          const cover = p.product_media?.find((m: any) => m.is_cover)?.url || "";
          return { ...p, image: cover, sales: salesMap[p.id] || 0, name: p.title, type: "product" as const };
        })
        .sort((a: any, b: any) => b.sales - a.sales);
    },
  });

/**
 * Ranking of companies by confirmed sales count.
 */
export const useCompanyRanking = () =>
  useQuery({
    queryKey: ["company_ranking"],
    queryFn: async () => {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url, is_verified")
        .eq("is_active", true);
      if (!companies || companies.length === 0) return [];

      const companyIds = companies.map((c: any) => c.id);
      const { data: products } = await supabase
        .from("products")
        .select("id, company_id")
        .in("company_id", companyIds);
      if (!products || products.length === 0) return companies.map((c: any) => ({ ...c, sales: 0 }));

      const productIds = products.map((p: any) => p.id);
      const pcMap: Record<string, string> = {};
      products.forEach((p: any) => { pcMap[p.id] = p.company_id; });

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, order_id, quantity")
        .in("product_id", productIds);
      if (!items || items.length === 0) return companies.map((c: any) => ({ ...c, sales: 0 }));

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status")
        .in("id", orderIds);
      const confirmedIds = new Set(
        (orders || [])
          .filter((o: any) => ["confirmed", "shipped", "delivered"].includes(o.status))
          .map((o: any) => o.id)
      );

      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedIds.has(item.order_id)) {
          const cid = pcMap[item.product_id];
          if (cid) salesMap[cid] = (salesMap[cid] || 0) + (item.quantity || 1);
        }
      });

      return companies
        .map((c: any) => ({ ...c, sales: salesMap[c.id] || 0 }))
        .sort((a: any, b: any) => b.sales - a.sales);
    },
  });
