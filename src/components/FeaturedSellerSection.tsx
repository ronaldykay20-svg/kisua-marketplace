import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, CheckCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeaturedSellerSection = () => {
  const navigate = useNavigate();

  // Get a featured seller (is_featured flag or admin-highlighted)
  const { data: seller } = useQuery({
    queryKey: ["featured_seller_home"],
    queryFn: async () => {
      // Check site_settings for a manually featured seller
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "featured_seller_id")
        .maybeSingle();

      let sellerId = setting?.value;

      if (!sellerId) {
        // Fallback: pick verified seller with most sales
        const { data: topSeller } = await supabase
          .from("sellers")
          .select("id")
          .eq("is_active", true)
          .eq("is_verified", true)
          .order("total_sales", { ascending: false })
          .limit(1)
          .maybeSingle();
        sellerId = topSeller?.id;
      }

      if (!sellerId) return null;

      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", sellerId)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Get seller's products
  const { data: products = [] } = useQuery({
    queryKey: ["featured_seller_products", seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller!.id)
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(6);
      if (error) throw error;

      // Get covers
      const ids = (data || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
    },
    enabled: !!seller?.id,
  });

  if (!seller || products.length === 0) return null;

  const isCompany = seller.type === "company";

  return (
    <section className="container mx-auto px-4 py-5">
      {/* Header with seller info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full overflow-hidden bg-muted border-2 border-primary flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/vendedor/${seller.id}`)}
          >
            {seller.logo_url ? (
              <img src={seller.logo_url} alt={seller.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">
                {seller.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h2
                className="text-sm font-bold text-foreground cursor-pointer hover:text-primary transition"
                onClick={() => navigate(`/vendedor/${seller.id}`)}
              >
                {seller.name}
              </h2>
              {seller.is_verified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isCompany ? "Empresa" : "Vendedor"} em destaque
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/vendedor/${seller.id}`)}
          className="text-xs font-semibold text-primary flex items-center gap-0.5"
        >
          Ver tudo <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Products carousel */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
        {products.map((p: any) => {
          const image = p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop";
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-muted overflow-hidden">
                <img src={image} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-2">
                <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight mb-1">{p.title}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-foreground">
                    {Number(p.price).toLocaleString("pt-AO")} Kz
                  </span>
                  {p.old_price && (
                    <span className="text-[9px] text-muted-foreground line-through">
                      {Number(p.old_price).toLocaleString("pt-AO")} Kz
                    </span>
                  )}
                </div>
                {p.free_shipping && (
                  <span className="inline-block mt-0.5 text-[9px] font-bold text-walmart-green">FRETE GRÁTIS</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedSellerSection;
