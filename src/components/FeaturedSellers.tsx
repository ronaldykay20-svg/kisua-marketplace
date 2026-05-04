import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeaturedSellers = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const { data: sellers = [] } = useQuery({
    queryKey: ["featured_sellers_home"],
    queryFn: async () => {
      const { data: featured } = await supabase
        .from("sellers")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("featured_order", { ascending: true })
        .limit(20);
      if (featured && featured.length > 0) return featured;

      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("is_active", true)
        .order("total_sales", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const sellerIds = sellers.map((s: any) => s.id);
  const { data: allProducts = [] } = useQuery({
    queryKey: ["featured_sellers_products", sellerIds],
    queryFn: async () => {
      if (sellerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("seller_id", sellerIds)
        .eq("is_active", true)
        .order("sales_count", { ascending: false });
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
    enabled: sellerIds.length > 0,
  });

  if (sellers.length === 0) return null;

  const scrollTo = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const newIdx = dir === "left" ? Math.max(0, currentIdx - 1) : Math.min(sellers.length - 1, currentIdx + 1);
    setCurrentIdx(newIdx);
    const card = el.children[newIdx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      {/* Cabeçalho da secção */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
        <div className="flex gap-1">
          {currentIdx > 0 && (
            <button onClick={() => scrollTo("left")} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          {currentIdx < sellers.length - 1 && (
            <button onClick={() => scrollTo("right")} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {sellers.map((seller: any) => {
          const sellerProducts = allProducts.filter((p: any) => p.seller_id === seller.id).slice(0, 3);
          return (
            <div key={seller.id} className="flex-shrink-0 w-full snap-start border border-border rounded-2xl overflow-hidden">

              {/* Banner com info do vendedor */}
              <div className="relative overflow-hidden h-[160px] sm:h-[200px] md:h-[240px] bg-muted">
                {seller.cover_url ? (
                  <img src={seller.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-card border-2 border-white flex-shrink-0">
                    {seller.logo_url ? (
                      <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10">
                        {seller.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white">{seller.name}</span>
                      {seller.is_verified && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-[10px] text-white/70">
                      {seller.type === "company" ? "Empresa" : "Vendedor"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/vendedor/${seller.id}`)}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold hover:brightness-110 transition"
                >
                  Ver loja
                </button>
              </div>

              {/* Título com linha + "Veja agora" */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-bold text-foreground whitespace-nowrap">Produtos da loja</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <button
                  onClick={() => navigate(`/vendedor/${seller.id}`)}
                  className="flex items-center gap-0.5 text-sm font-semibold text-primary ml-3 whitespace-nowrap"
                >
                  Veja agora <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Grid de produtos */}
              <div className="px-3 pb-3">
                {sellerProducts.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-4 w-full text-center">Sem produtos publicados</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {sellerProducts.map((p: any) => {
                      const img = p.cover_url || p.image_url;
                      return (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/produto/${p.id}`)}
                          className="w-full cursor-pointer hover:opacity-80 transition"
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                            {img ? (
                              <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                Sem foto
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-foreground line-clamp-1 mt-1">{p.title}</p>
                          <p className="text-[12px] font-black text-primary">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedSellers;
