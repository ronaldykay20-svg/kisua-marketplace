import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeaturedSellersProps {
  layout?: "mobile" | "tablet" | "desktop";
}

const FeaturedSellers = ({ layout = "mobile" }: FeaturedSellersProps) => {
  const navigate = useNavigate();

  // Mobile carousel
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Tablet / Desktop carousel
  const wideScrollRef = useRef<HTMLDivElement>(null);
  const [widePage, setWidePage] = useState(0);

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

  const { data: reviewsMap = {} } = useQuery({
    queryKey: ["featured_sellers_reviews", sellerIds],
    queryFn: async () => {
      if (sellerIds.length === 0) return {};
      const { data, error } = await supabase
        .from("seller_reviews")
        .select("seller_id, rating")
        .in("seller_id", sellerIds);
      if (error || !data) return {};

      const map: Record<string, number | null> = {};
      sellerIds.forEach((id: string) => {
        const reviews = data.filter((r: any) => r.seller_id === id);
        if (reviews.length === 0) {
          map[id] = null;
        } else {
          const positive = reviews.filter((r: any) => r.rating >= 4).length;
          map[id] = Math.round((positive / reviews.length) * 100);
        }
      });
      return map;
    },
    enabled: sellerIds.length > 0,
  });

  if (sellers.length === 0) return null;

  // Agrupa lojas em pares para o carrossel tablet/desktop
  const sellerPairs: any[][] = [];
  for (let i = 0; i < sellers.length; i += 2) {
    sellerPairs.push(sellers.slice(i, i + 2));
  }
  const totalWidePages = sellerPairs.length;

  const handleWideScroll = () => {
    const el = wideScrollRef.current;
    if (!el) return;
    const page = Math.round(el.scrollLeft / el.offsetWidth);
    setWidePage(page);
  };

  const scrollWide = (dir: "left" | "right") => {
    const el = wideScrollRef.current;
    if (!el) return;
    const newPage = dir === "left"
      ? Math.max(0, widePage - 1)
      : Math.min(totalWidePages - 1, widePage + 1);
    setWidePage(newPage);
    el.scrollTo({ left: newPage * el.offsetWidth, behavior: "smooth" });
  };

  const scrollMobile = (dir: "left" | "right") => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const newIdx = dir === "left"
      ? Math.max(0, currentIdx - 1)
      : Math.min(sellers.length - 1, currentIdx + 1);
    setCurrentIdx(newIdx);
    const card = el.children[newIdx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  };

  /* ── Card de uma loja ── */
  const SellerCard = ({ seller, productsLimit = 3 }: { seller: any; productsLimit?: number }) => {
    const sellerProducts = allProducts
      .filter((p: any) => p.seller_id === seller.id)
      .slice(0, productsLimit);

    const positivePct: number | null = reviewsMap[seller.id] ?? null;

    return (
      <div className="rounded-gpu-fix border border-border rounded-2xl overflow-hidden flex flex-col bg-card">
        {/* Banner */}
        <div className="relative overflow-hidden h-[160px] bg-muted flex-shrink-0">
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

        {/* Estatísticas */}
        <div className="flex items-center justify-around px-3 py-2 border-b border-border text-[10px] text-muted-foreground">
          {positivePct !== null ? (
            <div className="flex items-center gap-1">
              <span>☆</span>
              <span className="font-bold text-foreground">{positivePct}%</span>
              <span>Avaliações positivas</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>☆</span>
              <span>Sem avaliações ainda</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span>📦</span>
            <span>Envio rápido</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🛡️</span>
            <span>Compra segura</span>
          </div>
        </div>

        {/* Cabeçalho produtos */}
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
        <div className="px-3 pb-3 flex-1">
          {sellerProducts.length === 0 ? (
            <p className="text-[10px] text-muted-foreground py-4 w-full text-center">
              Sem produtos publicados
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sellerProducts.map((p: any) => {
                const img = p.cover_url || p.image_url;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/produto/${p.id}`)}
                    className="rounded-gpu-fix cursor-pointer hover:opacity-90 transition bg-card rounded-xl border border-border overflow-hidden"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {img ? (
                        <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="p-1.5">
                      {/* Botão "Ver em loja" — mesma posição do "Add"/"Options" da Walmart */}
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/vendedor/${seller.id}`); }}
                        className="w-full mb-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold py-1 text-center hover:brightness-110 transition"
                      >
                        Ver em loja
                      </button>

                      <span className="block text-[12px] font-black text-primary mb-0.5">
                        {Number(p.price).toLocaleString("pt-AO")} Kz
                      </span>

                      <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">
                        {p.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ══ TABLET ══ */
  if (layout === "tablet") {
    // 2 lojas ou menos — grelha estática
    if (sellers.length <= 2) {
      return (
        <section className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
            <button onClick={() => navigate("/vendedores")} className="text-xs font-semibold text-primary">
              Ver todas →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {sellers.map((seller: any) => (
              <SellerCard key={seller.id} seller={seller} productsLimit={3} />
            ))}
          </div>
        </section>
      );
    }

    // Mais de 2 lojas — carrossel de pares com pontos
    return (
      <section className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {widePage > 0 && (
                <button
                  onClick={() => scrollWide("left")}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
              )}
              {widePage < totalWidePages - 1 && (
                <button
                  onClick={() => scrollWide("right")}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              )}
            </div>
            <button onClick={() => navigate("/vendedores")} className="text-xs font-semibold text-primary">
              Ver todas →
            </button>
          </div>
        </div>

        <div
          ref={wideScrollRef}
          onScroll={handleWideScroll}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        >
          {sellerPairs.map((pair, pageIdx) => (
            <div key={pageIdx} className="flex-shrink-0 w-full snap-start grid grid-cols-2 gap-3">
              {pair.map((seller: any) => (
                <SellerCard key={seller.id} seller={seller} productsLimit={3} />
              ))}
            </div>
          ))}
        </div>

        {totalWidePages > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalWidePages }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === widePage ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  /* ══ DESKTOP ══ */
  if (layout === "desktop") {
    // 2 lojas ou menos — grelha estática
    if (sellers.length <= 2) {
      return (
        <section className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
            <button onClick={() => navigate("/vendedores")} className="text-xs font-semibold text-primary">
              Ver todas →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {sellers.map((seller: any) => (
              <SellerCard key={seller.id} seller={seller} productsLimit={6} />
            ))}
          </div>
        </section>
      );
    }

    // Mais de 2 lojas — carrossel de pares com pontos
    return (
      <section className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {widePage > 0 && (
                <button
                  onClick={() => scrollWide("left")}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
              )}
              {widePage < totalWidePages - 1 && (
                <button
                  onClick={() => scrollWide("right")}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              )}
            </div>
            <button onClick={() => navigate("/vendedores")} className="text-xs font-semibold text-primary">
              Ver todas →
            </button>
          </div>
        </div>

        <div
          ref={wideScrollRef}
          onScroll={handleWideScroll}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        >
          {sellerPairs.map((pair, pageIdx) => (
            <div key={pageIdx} className="flex-shrink-0 w-full snap-start grid grid-cols-2 gap-4">
              {pair.map((seller: any) => (
                <SellerCard key={seller.id} seller={seller} productsLimit={6} />
              ))}
            </div>
          ))}
        </div>

        {totalWidePages > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: totalWidePages }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === widePage ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  /* ══ MOBILE — carrossel original ══ */
  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Lojas em destaque</h2>
        <div className="flex gap-1">
          {currentIdx > 0 && (
            <button
              onClick={() => scrollMobile("left")}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
          )}
          {currentIdx < sellers.length - 1 && (
            <button
              onClick={() => scrollMobile("right")}
              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          )}
        </div>
      </div>
      <div ref={mobileScrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {sellers.map((seller: any) => (
          <div key={seller.id} className="flex-shrink-0 w-full snap-start">
            <SellerCard seller={seller} productsLimit={3} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedSellers;
