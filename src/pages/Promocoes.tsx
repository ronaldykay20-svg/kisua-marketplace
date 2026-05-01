import { useState, useEffect } from "react";
import { Zap, Star, Flame, Tag, TrendingDown, Heart, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const usePromoProducts = () =>
  useQuery({
    queryKey: ["promotions_page_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("discount_percent", "is", null)
        .gt("discount_percent", 0)
        .order("discount_percent", { ascending: false })
        .limit(80);
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => {
          coverMap[m.product_id] = m.url;
        });
      }
      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
    },
  });

const CountdownTimer = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState(endTime - Date.now());
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(endTime - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  const h = Math.max(0, Math.floor(timeLeft / 3600000));
  const m = Math.max(0, Math.floor((timeLeft % 3600000) / 60000));
  const s = Math.max(0, Math.floor((timeLeft % 60000) / 1000));
  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="bg-primary-foreground text-destructive text-xs font-black px-2 py-1 rounded-md min-w-[28px] text-center">{String(v).padStart(2, "0")}</span>
          {i < 2 && <span className="text-primary-foreground font-bold text-xs">:</span>}
        </span>
      ))}
    </div>
  );
};

const Promocoes = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"flash" | "regular">("flash");
  const flashEnd = Date.now() + 4 * 3600000;
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { data: products = [], isLoading } = usePromoProducts();

  // Flash = top 30% biggest discounts; Regular = the rest
  const flashProducts = products.slice(0, Math.max(8, Math.floor(products.length * 0.4)));
  const regularPromos = products;

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderEmpty = () => (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground">Sem produtos em promoção no momento.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />

      <div className="bg-gradient-to-r from-destructive via-walmart-red to-walmart-orange px-3 py-5">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black text-primary-foreground tracking-tight">PROMOÇÕES</h1>
              <p className="text-[11px] text-primary-foreground/80">Ofertas reais por tempo limitado!</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-primary-foreground/70 mb-1">Termina em</p>
            <CountdownTimer endTime={flashEnd} />
          </div>
        </div>
      </div>

      <div className="sticky top-[7.5rem] z-30 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto flex">
          <button onClick={() => setTab("flash")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition border-b-2 ${tab === "flash" ? "border-destructive text-destructive" : "border-transparent text-muted-foreground"}`}>
            <Zap className="w-4 h-4" /> Relâmpago
          </button>
          <button onClick={() => setTab("regular")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition border-b-2 ${tab === "regular" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Flame className="w-4 h-4" /> Promoções
          </button>
        </div>
      </div>

      <div className="container mx-auto px-2 py-3">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p>
        ) : tab === "flash" ? (
          <>
            <div className="mb-3 bg-gradient-to-r from-foreground to-foreground/90 rounded-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-secondary" />
                <div>
                  <p className="text-xs font-black text-primary-foreground">OFERTA DO DIA</p>
                  <p className="text-[10px] text-primary-foreground/60">Maiores descontos do momento</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-primary-foreground/50" />
            </div>

            {flashProducts.length === 0 ? renderEmpty() : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
                {flashProducts.map((p: any, i: number) => {
                  const soldPct = Math.min(95, 40 + i * 5);
                  const isTopSeller = i < 3;
                  const img = p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
                  return (
                    <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)}
                      className="w-full bg-card rounded-card border border-border overflow-hidden text-left group break-inside-avoid block mb-0">
                      <div className="relative overflow-hidden">
                        <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-sm z-10">-{p.discount_percent}%</span>
                        {isTopSeller && (
                          <span className="absolute top-1.5 right-1.5 bg-walmart-orange text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10">
                            #{i + 1} Top
                          </span>
                        )}
                        <button onClick={(e) => toggleLike(p.id, e)}
                          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <Heart className={`w-3.5 h-3.5 ${likedIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                        </button>
                        <img src={img} alt={p.title} className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                      <div className="p-2">
                        {p.badge && (
                          <span className="inline-block bg-walmart-orange/10 text-walmart-orange text-[9px] font-bold px-1.5 py-0.5 rounded mb-1">🔥 {p.badge}</span>
                        )}
                        <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1.5 leading-tight">{p.title}</h3>
                        {p.old_price && (
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.old_price)}</span>
                          </div>
                        )}
                        <span className="text-sm font-black text-destructive">{formatPrice(p.price)}</span>
                        {p.free_shipping && (
                          <span className="block text-[9px] text-accent font-semibold mt-0.5">Frete grátis</span>
                        )}
                        <div className="relative h-3.5 bg-destructive/10 rounded-full overflow-hidden mt-1.5">
                          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-destructive to-walmart-orange rounded-full transition-all duration-1000" style={{ width: `${soldPct}%` }} />
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-primary-foreground">{soldPct}% vendido</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {regularPromos.length === 0 ? renderEmpty() : (
              <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
                {regularPromos.map((p: any, i: number) => {
                  const img = p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
                  return (
                    <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)}
                      className="w-full bg-card rounded-card border border-border overflow-hidden text-left group break-inside-avoid block">
                      <div className="relative overflow-hidden">
                        {p.discount_percent && <span className="absolute top-1.5 left-1.5 bg-walmart-orange text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10">-{p.discount_percent}%</span>}
                        <button onClick={(e) => toggleLike(p.id, e)}
                          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <Heart className={`w-3.5 h-3.5 ${likedIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                        </button>
                        <img src={img} alt={p.title}
                          className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}`}
                          loading="lazy" />
                      </div>
                      <div className="p-2">
                        {i < 5 && p.rating && p.rating >= 4 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-walmart-orange mb-1">
                            <TrendingDown className="w-3 h-3" /> #{i + 1} Mais Vendido
                          </span>
                        )}
                        <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1 leading-tight">{p.title}</h3>
                        {p.rating > 0 && (
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`w-2.5 h-2.5 ${j < (p.rating || 0) ? "fill-walmart-orange text-walmart-orange" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-[9px] text-muted-foreground">({p.total_reviews || 0})</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-black text-foreground">{formatPrice(p.price)}</span>
                        </div>
                        {p.old_price && (
                          <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.old_price)}</span>
                        )}
                        {p.free_shipping && <span className="block text-[9px] text-accent font-semibold mt-0.5">Frete grátis</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Promocoes;
