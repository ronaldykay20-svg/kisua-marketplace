import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Star, Package, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeaturedSellerSection = () => {
  const navigate = useNavigate();

  const { data: seller } = useQuery({
    queryKey: ["featured_seller_home"],
    queryFn: async () => {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "featured_seller_id")
        .maybeSingle();

      let sellerId = setting?.value;

      if (!sellerId) {
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

  // Busca avaliações reais do vendedor e calcula % positivas (rating >= 4)
  const { data: positiveReviewPct } = useQuery({
    queryKey: ["featured_seller_review_pct", seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("rating")
        .eq("seller_id", seller!.id);
      if (error || !data || data.length === 0) return null;
      const positive = data.filter((r: any) => r.rating >= 4).length;
      return Math.round((positive / data.length) * 100);
    },
    enabled: !!seller?.id,
  });

  if (!seller || products.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-4">

      {/* Banner da loja */}
      {seller.banner_url && (
        <div
          className="w-full rounded-xl overflow-hidden mb-4 cursor-pointer"
          style={{ aspectRatio: "16/7" }}
          onClick={() => navigate(`/vendedor/${seller.id}`)}
        >
          <img
            src={seller.banner_url}
            alt={seller.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Badges de confiança */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
        {positiveReviewPct !== null && positiveReviewPct !== undefined && (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
            <span className="font-semibold text-foreground">{positiveReviewPct}%</span> Avaliações positivas
          </span>
        )}
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5 text-primary" />
          Envio rápido
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Compra segura
        </span>
      </div>

      {/* Título com linha — "Produtos da loja" */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm font-bold text-foreground whitespace-nowrap">
            Produtos da loja
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <button
          onClick={() => navigate(`/vendedor/${seller.id}`)}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary ml-3 whitespace-nowrap"
        >
          Veja agora <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid 3 colunas */}
      <div className="grid grid-cols-3 gap-2">
        {products.slice(0, 6).map((p: any) => {
          const image = p.cover_url || p.image_url;
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              {/* Imagem */}
              <div className="aspect-square bg-muted overflow-hidden">
                {image ? (
                  <img
                    src={image}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Sem foto
                  </div>
                )}
              </div>

              <div className="p-2">
                {/* Botão "Ver em loja" — mesma posição do "Add"/"Options" da Walmart */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/vendedor/${seller.id}`);
                  }}
                  className="w-full mb-1.5 rounded-full border border-primary text-primary text-[10px] font-semibold py-1 text-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Ver em loja
                </button>

                {/* Preço */}
                <span className="block text-[13px] font-black text-primary mb-0.5">
                  {Number(p.price).toLocaleString("pt-AO")} Kz
                </span>

                {/* Título */}
                <h3 className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                  {p.title}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
};

export default FeaturedSellerSection;
