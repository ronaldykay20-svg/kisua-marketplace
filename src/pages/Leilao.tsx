import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Gavel, Monitor, Home, Car, Watch, Clock, ArrowRight, Trophy, CheckCircle2, Users, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ── helpers ── */
const useCountdown = (seconds: number) => {
  const [t, setT] = useState(seconds);
  useEffect(() => { const i = setInterval(() => setT(p => (p > 0 ? p - 1 : 0)), 1000); return () => clearInterval(i); }, []);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return { h, m, s };
};

const TimerBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl md:text-4xl font-black text-secondary tabular-nums bg-foreground/90 px-2.5 py-1.5 rounded-card">{value}</span>
    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase">{label}</span>
  </div>
);

/* ── data ── */
const categories = [
  { icon: Monitor, label: "Electrónicos" },
  { icon: Home, label: "Imóveis" },
  { icon: Car, label: "Veículos" },
  { icon: Watch, label: "Luxo & Relógios" },
];

const featuredAuction = {
  title: "Toyota Hilux 2022 Dupla Cabine",
  image: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&h=500&fit=crop",
  currentBid: "18.500.000 Kz",
  totalBids: 19,
  bids: [
    { user: "João R.", amount: "18.500.000 Kz" },
    { user: "Ana M.", amount: "18.200.000 Kz" },
    { user: "Ricardo L.", amount: "18.000.000 Kz" },
    { user: "Beatriz S.", amount: "17.800.000 Kz" },
  ],
};

const activeAuctions = [
  { id: 1, title: "iPhone 15 Pro Max", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop", timeLeft: 19508, currentBid: "520.000 Kz" },
  { id: 2, title: "Apartamento T3 Talatona", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=400&fit=crop", timeLeft: 7510, currentBid: "45.000.000 Kz" },
  { id: 3, title: "Moto Honda CB 650R", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop", timeLeft: 5440, currentBid: "2.800.000 Kz" },
  { id: 4, title: "Samsung Galaxy S24 Ultra", image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop", timeLeft: 11423, currentBid: "380.000 Kz" },
];

const finishedAuctions = [
  { id: 10, title: "MacBook Pro M3", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop", finalPrice: "1.200.000 Kz" },
  { id: 11, title: "Gerador Eléctrico 5000W", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop", finalPrice: "450.000 Kz" },
];

/* ── small countdown for cards ── */
const CardTimer = ({ seconds }: { seconds: number }) => {
  const { h, m, s } = useCountdown(seconds);
  return (
    <div className="flex items-center gap-1 text-xs font-bold text-destructive">
      <Clock className="w-3 h-3" />
      <span className="tabular-nums">{h}:{m}:{s}</span>
    </div>
  );
};

/* ── page ── */
const Leilao = () => {
  const navigate = useNavigate();
  const countdown = useCountdown(11565);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(25 40% 12%) 0%, hsl(35 50% 18%) 40%, hsl(25 40% 12%) 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(45 100% 51% / 0.3) 0%, transparent 60%)" }} />
        <div className="container mx-auto px-4 py-8 md:py-14 text-center relative z-10">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
              <Gavel className="w-8 h-8 text-secondary" />
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-primary-foreground tracking-tight">LEILÃO ONLINE</h1>
          <p className="text-sm md:text-base text-secondary font-semibold mt-1">Dê o seu lance e leve o melhor lote!</p>
        </div>
      </section>

      {/* ─── Countdown ─── */}
      <section className="container mx-auto px-3 -mt-5 relative z-20">
        <div className="bg-card border border-border rounded-card p-4 text-center shadow-lg">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Leilão termina em:</p>
          <div className="flex justify-center gap-3">
            <TimerBox value={countdown.h} label="Horas" />
            <span className="text-2xl md:text-4xl font-black text-foreground self-start mt-1">:</span>
            <TimerBox value={countdown.m} label="Min" />
            <span className="text-2xl md:text-4xl font-black text-foreground self-start mt-1">:</span>
            <TimerBox value={countdown.s} label="Seg" />
          </div>
        </div>
      </section>

      {/* ─── Featured auction ─── */}
      <section className="container mx-auto px-3 mt-4">
        <div className="bg-card border border-border rounded-card overflow-hidden shadow-md">
          <div className="md:grid md:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-video md:aspect-auto overflow-hidden">
              <img src={featuredAuction.image} alt={featuredAuction.title} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-1 rounded-sm text-[10px] font-black text-primary-foreground" style={{ background: "var(--promo-gradient)" }}>DESTAQUE</span>
            </div>
            {/* Info */}
            <div className="p-4">
              <h2 className="text-base md:text-lg font-black text-foreground">{featuredAuction.title}</h2>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lance Actual:</span>
                  <span className="font-black text-walmart-green text-base">{featuredAuction.currentBid}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ofertas:</span>
                  <span className="font-bold">{featuredAuction.totalBids} Lances</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2.5 rounded-card font-bold text-sm text-foreground bg-secondary hover:bg-secondary/80 transition">
                DAR LANCE
              </button>

              {/* Bid history */}
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground mb-2">HISTÓRICO DE LANCES</p>
                <div className="space-y-1.5">
                  {featuredAuction.bids.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-sm px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-walmart-green" />
                        <span className="font-semibold">{b.user}</span>
                      </div>
                      <span className="font-bold">{b.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Categories filter ─── */}
      <section className="container mx-auto px-3 mt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map(c => (
            <button
              key={c.label}
              onClick={() => setActiveCategory(activeCategory === c.label ? null : c.label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-card border text-xs font-semibold whitespace-nowrap transition ${activeCategory === c.label ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
            >
              <c.icon className="w-4 h-4" />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Active auctions ─── */}
      <section className="container mx-auto px-3 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-secondary" /> Leilões em Andamento
          </h2>
          <a href="#" className="text-[11px] font-semibold text-primary flex items-center gap-0.5">Ver todos <ChevronRight className="w-3 h-3" /></a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {activeAuctions.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
              <div className="p-2.5">
                <h3 className="text-xs font-bold text-foreground line-clamp-1 mb-1">{a.title}</h3>
                <CardTimer seconds={a.timeLeft} />
                <p className="text-[10px] text-muted-foreground mt-1">Lance actual:</p>
                <p className="text-sm font-black text-foreground">{a.currentBid}</p>
                <button className="w-full mt-2 py-1.5 rounded-card text-[11px] font-bold bg-secondary text-foreground hover:bg-secondary/80 transition">
                  DAR LANCE
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banners ─── */}
      <section className="container mx-auto px-3 mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="rounded-card overflow-hidden p-5 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, hsl(215 100% 45%) 0%, hsl(215 100% 35%) 100%)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary-foreground" />
            <h3 className="text-sm font-black text-primary-foreground">FAÇA O SEU CADASTRO</h3>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3">E participe dos leilões!</p>
          <button onClick={() => navigate("/")} className="self-start px-4 py-2 rounded-card text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition">
            CADASTRE-SE
          </button>
        </div>
        <div className="rounded-card overflow-hidden p-5 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, hsl(145 65% 32%) 0%, hsl(145 65% 22%) 100%)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary-foreground" />
            <h3 className="text-sm font-black text-primary-foreground">LANCES RÁPIDOS E SEGUROS</h3>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3">Ganhe ofertas incríveis!</p>
          <button className="self-start px-4 py-2 rounded-card text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition">
            ENTENDA COMO FUNCIONA
          </button>
        </div>
      </section>

      {/* ─── Finished auctions ─── */}
      <section className="container mx-auto px-3 mt-4 mb-6">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Gavel className="w-4 h-4 text-muted-foreground" /> Leilões Finalizados
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {finishedAuctions.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-card overflow-hidden relative opacity-90">
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img src={a.image} alt={a.title} className="w-full h-full object-cover grayscale" loading="lazy" />
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black text-primary-foreground bg-destructive">VENDIDO!</span>
              </div>
              <div className="p-2.5">
                <h3 className="text-xs font-bold text-foreground line-clamp-1 mb-1">{a.title}</h3>
                <p className="text-[10px] text-muted-foreground">Arrematado por:</p>
                <p className="text-sm font-black text-walmart-green">{a.finalPrice}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Leilao;
