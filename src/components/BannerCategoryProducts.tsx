import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Truck, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  categoryId: string;
}

const BannerCategoryProducts = ({ categoryId }: Props) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const { data: products = [] } = useQuery({
    queryKey: ["banner_category_products", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent, rating, total_reviews, sales_count, free_shipping, badge, product_media(url, is_cover)")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!categoryId,
  });

  if (products.length === 0) return null;

  // Grupos de 2 para os dots no mobile
  const totalGroups = Math.ceil(products.length / 2);

  const scroll = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.5 + 8; // largura de 1 card mobile
    const groupWidth = cardWidth * 2;
    el.scrollBy({ left: dir === "left" ? -groupWidth : groupWidth, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.5 + 8;
    const groupWidth = cardWidth * 2;
    const group = Math.round(el.scrollLeft / groupWidth);
    setActiveDot(Math.min(group, totalGroups - 1));
  };

  return (
    <section className="container mx-auto px-3 mt-2">
      {/* Carrossel */}
      <div className="relative">
        <div
          ref={ref}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
        >
          {products.map((p: any) => {
            const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.product_media?.[0]?.url;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/produto/${p.id}`)}
                className="snap-start flex-shrink-0 w-[calc(50%-4px)] sm:w-[calc(33.333%-6px)] md:w-[calc(25%-6px)] lg:w-[calc(20%-7px)] bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition flex flex-col"
              >
                {/* Imagem */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {cover ? (
                    <img src={cover} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                      Sem foto
                    </div>
                  )}
                  {p.discount_percent && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-500">
                      -{p.discount_percent}%
                    </span>
                  )}
                  {p.badge && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-orange-500">
                      {p.badge}
                    </span>
                  )}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow"
                  >
                    <Heart className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-2 flex flex-col gap-1 flex-1">
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
                    {p.title}
                  </p>

                  {/* Rating */}
                  {p.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold">{Number(p.rating).toFixed(1)}</span>
                      {p.total_reviews > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          ({p.total_reviews > 999 ? "1000+" : p.total_reviews})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Preço */}
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="text-[13px] font-black text-red-500">
                      {Number(p.price).toLocaleString("pt-AO")} Kz
                    </span>
                    {p.old_price && (
                      <span className="text-[9px] text-muted-foreground line-through">
                        {Number(p.old_price).toLocaleString("pt-AO")} Kz
                      </span>
                    )}
                  </div>

                  {/* Frete ou vendidos */}
                  {p.free_shipping ? (
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-green-600">
                      <Truck className="w-2.5 h-2.5" /> Frete grátis
                    </span>
                  ) : p.sales_count > 0 ? (
                    <span className="text-[9px] text-muted-foreground">
                      {p.sales_count}+ vendidos
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Setas mobile — só aparecem se tiver mais de 2 produtos */}
        {products.length > 2 && (
          <>
            <button
              onClick={() => scroll("left")}
              className="sm:hidden absolute -left-1 top-[45%] -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border shadow flex items-center justify-center z-10"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="sm:hidden absolute -right-1 top-[45%] -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border shadow flex items-center justify-center z-10"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}

        {/* Setas tablet/desktop */}
        <button
          onClick={() => scroll("left")}
          className="hidden sm:flex absolute -left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card z-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="hidden sm:flex absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots de paginação — mobile, só se tiver mais de 2 produtos */}
      {products.length > 2 && (
        <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeDot ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default BannerCategoryProducts;
