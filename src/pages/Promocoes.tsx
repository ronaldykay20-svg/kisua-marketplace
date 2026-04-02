import { useState, useEffect } from "react";
import { Zap, Clock, ArrowRight, Star, ShoppingCart, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { allProducts } from "@/data/products";

const flashProducts = allProducts.filter(p => p.discount).slice(0, 8);
const regularPromos = allProducts.filter(p => p.oldPrice).slice(0, 12);

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
          <span className="bg-foreground text-background text-xs font-bold px-1.5 py-0.5 rounded">{String(v).padStart(2, "0")}</span>
          {i < 2 && <span className="text-foreground font-bold text-xs">:</span>}
        </span>
      ))}
    </div>
  );
};

const Promocoes = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"flash" | "regular">("flash");
  const flashEnd = Date.now() + 4 * 3600000;

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />

      {/* Flash banner */}
      <div className="bg-gradient-to-r from-destructive to-walmart-orange px-3 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
            <div>
              <h1 className="text-lg font-black text-primary-foreground">PROMOÇÕES</h1>
              <p className="text-[10px] text-primary-foreground/80">Ofertas incríveis para você!</p>
            </div>
          </div>
          <CountdownTimer endTime={flashEnd} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[7.5rem] z-30 bg-card border-b border-border">
        <div className="container mx-auto flex">
          <button onClick={() => setTab("flash")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition border-b-2 ${tab === "flash" ? "border-destructive text-destructive" : "border-transparent text-muted-foreground"}`}>
            <Zap className="w-4 h-4" /> Relâmpago
          </button>
          <button onClick={() => setTab("regular")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition border-b-2 ${tab === "regular" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Flame className="w-4 h-4" /> Promoções
          </button>
        </div>
      </div>

      <div className="container mx-auto px-3 py-4">
        {tab === "flash" && (
          <>
            {/* Flash sale progress cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {flashProducts.map((p, i) => {
                const soldPct = Math.min(95, 40 + i * 8);
                return (
                  <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-lg border border-destructive/20 overflow-hidden text-left group">
                    <div className="relative aspect-square overflow-hidden">
                      <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded z-10">{p.discount}</span>
                      <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1">{p.title}</h3>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-sm font-bold text-destructive">{p.price}</span>
                        <span className="text-[10px] text-muted-foreground line-through">{p.oldPrice}</span>
                      </div>
                      {/* Sold bar */}
                      <div className="relative h-4 bg-destructive/10 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-destructive to-walmart-orange rounded-full" style={{ width: `${soldPct}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-foreground">{soldPct}% vendido</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "regular" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {regularPromos.map(p => (
              <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-lg border border-border overflow-hidden text-left group hover:shadow-md transition">
                <div className="relative aspect-square overflow-hidden">
                  {p.discount && <span className="absolute top-1.5 left-1.5 bg-walmart-orange text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded z-10">{p.discount}</span>}
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-medium text-foreground line-clamp-2 mb-1">{p.title}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-2.5 h-2.5 ${i < (p.rating || 0) ? "fill-walmart-orange text-walmart-orange" : "text-muted-foreground"}`} />
                    ))}
                    <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground">{p.price}</span>
                      {p.oldPrice && <span className="text-[10px] text-muted-foreground line-through ml-1">{p.oldPrice}</span>}
                    </div>
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  {p.freeShipping && <span className="text-[9px] text-walmart-green font-semibold">Frete grátis</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Promocoes;
