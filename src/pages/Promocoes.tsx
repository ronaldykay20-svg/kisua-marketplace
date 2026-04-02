import { useState, useEffect } from "react";
import { Zap, Clock, ArrowRight, Star, ShoppingCart, Flame, Tag, TrendingDown, Heart, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { allProducts } from "@/data/products";

const flashProducts = allProducts.filter(p => p.discount).slice(0, 8);
const regularPromos = allProducts.filter(p => p.oldPrice).slice(0, 16);
const dealOfDay = allProducts.filter(p => p.discount).slice(0, 3);

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
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />

      {/* Flash banner - gradient header */}
      <div className="bg-gradient-to-r from-destructive via-walmart-red to-walmart-orange px-3 py-5">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-primary-foreground fill-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black text-primary-foreground tracking-tight">PROMOÇÕES</h1>
              <p className="text-[11px] text-primary-foreground/80">Ofertas incríveis por tempo limitado!</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-primary-foreground/70 mb-1">Termina em</p>
            <CountdownTimer endTime={flashEnd} />
          </div>
        </div>
      </div>

      {/* Coupon strip */}
      <div className="bg-gradient-to-r from-walmart-orange/10 to-destructive/10 border-b border-border">
        <div className="container mx-auto px-3 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { label: "10% OFF", desc: "Primeira compra", color: "from-destructive to-walmart-red" },
            { label: "FRETE GRÁTIS", desc: "Acima 50.000 Kz", color: "from-primary to-accent" },
            { label: "25% OFF", desc: "Electrónicos", color: "from-walmart-orange to-secondary" },
          ].map((coupon, i) => (
            <div key={i} className={`flex-shrink-0 bg-gradient-to-r ${coupon.color} rounded-lg px-4 py-2 min-w-[140px]`}>
              <p className="text-xs font-black text-primary-foreground">{coupon.label}</p>
              <p className="text-[9px] text-primary-foreground/80">{coupon.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
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
        {tab === "flash" && (
          <>
            {/* Deal of the day banner */}
            <div className="mb-3 bg-gradient-to-r from-foreground to-foreground/90 rounded-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-secondary" />
                <div>
                  <p className="text-xs font-black text-primary-foreground">OFERTA DO DIA</p>
                  <p className="text-[10px] text-primary-foreground/60">Só hoje, aproveite!</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-primary-foreground/50" />
            </div>

            {/* Shein-style masonry product grid */}
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
              {flashProducts.map((p, i) => {
                const soldPct = Math.min(95, 40 + i * 8);
                const isTopSeller = i < 3;
                return (
                  <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)}
                    className="w-full bg-card rounded-card border border-border overflow-hidden text-left group break-inside-avoid block mb-0">
                    <div className="relative overflow-hidden">
                      <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-black px-2 py-0.5 rounded-sm z-10">{p.discount}</span>
                      {isTopSeller && (
                        <span className="absolute top-1.5 right-1.5 bg-walmart-orange text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10">
                          #{i + 1} Mais Vendido
                        </span>
                      )}
                      <button onClick={(e) => toggleLike(p.id, e)}
                        className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <Heart className={`w-3.5 h-3.5 ${likedIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      </button>
                      <img src={p.image} alt={p.title} className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <div className="p-2">
                      {p.badge && (
                        <span className="inline-block bg-walmart-orange/10 text-walmart-orange text-[9px] font-bold px-1.5 py-0.5 rounded mb-1">🔥 {p.badge}</span>
                      )}
                      <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1.5 leading-tight">{p.title}</h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-[10px] text-muted-foreground line-through">{p.oldPrice}</span>
                      </div>
                      <span className="text-sm font-black text-destructive">{p.price}</span>
                      {p.freeShipping && (
                        <span className="block text-[9px] text-accent font-semibold mt-0.5">Frete grátis</span>
                      )}
                      {/* Sold bar */}
                      <div className="relative h-3.5 bg-destructive/10 rounded-full overflow-hidden mt-1.5">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-destructive to-walmart-orange rounded-full transition-all duration-1000" style={{ width: `${soldPct}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-primary-foreground">{soldPct}% vendido</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "regular" && (
          <>
            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1">
              {["Todos", "Electrónicos", "Moda", "Casa", "Desporto", "Beleza"].map((cat, i) => (
                <button key={cat} className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${i === 0 ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Shein-style masonry grid */}
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-1.5 space-y-1.5">
              {regularPromos.map((p, i) => (
                <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)}
                  className="w-full bg-card rounded-card border border-border overflow-hidden text-left group break-inside-avoid block">
                  <div className="relative overflow-hidden">
                    {p.discount && <span className="absolute top-1.5 left-1.5 bg-walmart-orange text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10">{p.discount}</span>}
                    <button onClick={(e) => toggleLike(p.id, e)}
                      className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <Heart className={`w-3.5 h-3.5 ${likedIds.has(p.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                    <img src={p.image} alt={p.title}
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
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < (p.rating || 0) ? "fill-walmart-orange text-walmart-orange" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-[9px] text-muted-foreground">({p.reviews})</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-foreground">{p.price}</span>
                    </div>
                    {p.oldPrice && (
                      <span className="text-[10px] text-muted-foreground line-through">{p.oldPrice}</span>
                    )}
                    {p.freeShipping && <span className="block text-[9px] text-accent font-semibold mt-0.5">Frete grátis</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Promocoes;
