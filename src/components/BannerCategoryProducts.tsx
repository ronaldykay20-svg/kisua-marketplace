import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  categoryId: string;
}

/** Carrossel de produtos arrastáveis abaixo de um banner vinculado a categoria.
 *  Mobile: 2 visíveis · Tablet: 3-4 · Desktop: 5. Sempre arrastável.
 */
const BannerCategoryProducts = ({ categoryId }: Props) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["banner_category_products", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, product_media(url, is_cover)")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!categoryId,
  });

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.7 : el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <section className="container mx-auto px-3 mt-2 relative">
      <div ref={ref} className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
        {products.map((p: any) => {
          const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.product_media?.[0]?.url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="snap-start flex-shrink-0 w-[calc(50%-4px)] sm:w-[calc(33.333%-6px)] md:w-[calc(25%-6px)] lg:w-[calc(20%-7px)] bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-md transition"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={cover} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-2">
                <p className="text-[11px] font-medium text-foreground line-clamp-2">{p.title}</p>
                <p className="text-xs font-black text-primary mt-1">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll arrows (desktop/tablet) */}
      <button onClick={() => scroll("left")} aria-label="Anterior"
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={() => scroll("right")} aria-label="Próximo"
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card">
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
};

export default BannerCategoryProducts;
