import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Gavel, Monitor, Home, Car, Watch, Clock, Trophy, CheckCircle2, Users, Shield, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const useCountdown = (endDate: string | null) => {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!endDate) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000));
      setT(diff);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [endDate]);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return { h, m, s, total: t };
};

const TimerBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-2xl md:text-4xl font-black text-secondary tabular-nums bg-foreground/90 px-2.5 py-1.5 rounded-card">{value}</span>
    <span className="text-[9px] text-muted-foreground mt-0.5 uppercase">{label}</span>
  </div>
);

const categories = [
  { icon: Monitor, label: "Electrónicos" },
  { icon: Home, label: "Imóveis" },
  { icon: Car, label: "Veículos" },
  { icon: Watch, label: "Luxo & Relógios" },
];

const CardTimer = ({ ends_at }: { ends_at: string }) => {
  const { h, m, s } = useCountdown(ends_at);
  return (
    <div className="flex items-center gap-1 text-xs font-bold text-destructive">
      <Clock className="w-3 h-3" />
      <span className="tabular-nums">{h}:{m}:{s}</span>
    </div>
  );
};

const Leilao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["public_auctions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("auctions")
        .select("*").order("ends_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const active = auctions.filter((a: any) => a.status === "active" && new Date(a.ends_at) > new Date());
  const finished = auctions.filter((a: any) => a.status === "finished" || new Date(a.ends_at) <= new Date());
  const filteredActive = activeCategory ? active.filter((a: any) => a.category === activeCategory) : active;
  const featured = active.find((a: any) => a.is_featured) || active[0] || null;
  const countdown = useCountdown(featured?.ends_at || null);

  const { data: bids = [] } = useQuery({
    queryKey: ["auction_bids", selectedAuction?.id || featured?.id],
    queryFn: async () => {
      const id = selectedAuction?.id || featured?.id;
      if (!id) return [];
      const { data } = await (supabase as any).from("auction_bids")
        .select("*, profiles:user_id(full_name)")
        .eq("auction_id", id)
        .order("amount", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!(selectedAuction?.id || featured?.id),
  });

  const placeBid = useMutation({
    mutationFn: async (auction: any) => {
      if (!user) throw new Error("Faça login para dar lance");
      const amount = Number(auction.current_bid) + Number(auction.bid_increment || 1000);
      const { error } = await (supabase as any).from("auction_bids")
        .insert({ auction_id: auction.id, user_id: user.id, amount });
      if (error) throw error;
      return amount;
    },
    onSuccess: (amount) => {
      toast.success(`Lance de ${Number(amount).toLocaleString("pt-AO")} Kz registado!`);
      qc.invalidateQueries({ queryKey: ["public_auctions"] });
      qc.invalidateQueries({ queryKey: ["auction_bids"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const displayed = selectedAuction || featured;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(25 40% 12%) 0%, hsl(35 50% 18%) 40%, hsl(25 40% 12%) 100%)" }}>
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

      {isLoading && (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      )}

      {!isLoading && auctions.length === 0 && (
        <div className="container mx-auto px-3 py-10 text-center">
          <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ainda não há leilões disponíveis. Volte em breve!</p>
        </div>
      )}

      {displayed && (
        <>
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

          <section className="container mx-auto px-3 mt-4">
            <div className="bg-card border border-border rounded-card overflow-hidden shadow-md">
              <div className="md:grid md:grid-cols-2">
                <div className="relative aspect-video md:aspect-auto overflow-hidden bg-muted">
                  {displayed.image_url
                    ? <img src={displayed.image_url} alt={displayed.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Gavel className="w-16 h-16 text-muted-foreground" /></div>}
                  {displayed.is_featured && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-sm text-[10px] font-black text-primary-foreground" style={{ background: "var(--promo-gradient)" }}>DESTAQUE</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-base md:text-lg font-black text-foreground">{displayed.title}</h2>
                  {displayed.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{displayed.description}</p>}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lance Actual:</span>
                      <span className="font-black text-walmart-green text-base">{Number(displayed.current_bid).toLocaleString("pt-AO")} Kz</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ofertas:</span>
                      <span className="font-bold">{bids.length} Lances</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Próximo lance mín.:</span>
                      <span className="font-bold">{(Number(displayed.current_bid) + Number(displayed.bid_increment || 1000)).toLocaleString("pt-AO")} Kz</span>
                    </div>
                  </div>
                  <button onClick={() => placeBid.mutate(displayed)} disabled={placeBid.isPending}
                    className="w-full mt-4 py-2.5 rounded-card font-bold text-sm text-foreground bg-secondary hover:bg-secondary/80 transition disabled:opacity-50">
                    {placeBid.isPending ? "Enviando..." : "DAR LANCE"}
                  </button>

                  <div className="mt-4">
                    <p className="text-xs font-bold text-muted-foreground mb-2">HISTÓRICO DE LANCES</p>
                    <div className="space-y-1.5">
                      {bids.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem lances ainda. Seja o primeiro!</p>}
                      {bids.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-sm px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-walmart-green" />
                            <span className="font-semibold">{b.profiles?.full_name || "Anónimo"}</span>
                          </div>
                          <span className="font-bold">{Number(b.amount).toLocaleString("pt-AO")} Kz</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="container mx-auto px-3 mt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map(c => (
            <button key={c.label} onClick={() => setActiveCategory(activeCategory === c.label ? null : c.label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-card border text-xs font-semibold whitespace-nowrap transition ${activeCategory === c.label ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              <c.icon className="w-4 h-4" />{c.label}
            </button>
          ))}
        </div>
      </section>

      {filteredActive.length > 0 && (
        <section className="container mx-auto px-3 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-secondary" /> Leilões em Andamento
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {filteredActive.map((a: any) => (
              <div key={a.id} onClick={() => setSelectedAuction(a)} className="bg-card border border-border rounded-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {a.image_url ? <img src={a.image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <Gavel className="w-12 h-12 m-auto mt-12 text-muted-foreground" />}
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-bold text-foreground line-clamp-1 mb-1">{a.title}</h3>
                  <CardTimer ends_at={a.ends_at} />
                  <p className="text-[10px] text-muted-foreground mt-1">Lance actual:</p>
                  <p className="text-sm font-black text-foreground">{Number(a.current_bid).toLocaleString("pt-AO")} Kz</p>
                  <button onClick={(e) => { e.stopPropagation(); placeBid.mutate(a); }}
                    className="w-full mt-2 py-1.5 rounded-card text-[11px] font-bold bg-secondary text-foreground hover:bg-secondary/80 transition">
                    DAR LANCE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-3 mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="rounded-card overflow-hidden p-5 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, hsl(215 100% 45%) 0%, hsl(215 100% 35%) 100%)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary-foreground" />
            <h3 className="text-sm font-black text-primary-foreground">FAÇA O SEU CADASTRO</h3>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3">E participe dos leilões!</p>
          <button onClick={() => navigate("/auth")} className="self-start px-4 py-2 rounded-card text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition">CADASTRE-SE</button>
        </div>
        <div className="rounded-card overflow-hidden p-5 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, hsl(145 65% 32%) 0%, hsl(145 65% 22%) 100%)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary-foreground" />
            <h3 className="text-sm font-black text-primary-foreground">LANCES RÁPIDOS E SEGUROS</h3>
          </div>
          <p className="text-xs text-primary-foreground/80 mb-3">Ganhe ofertas incríveis!</p>
        </div>
      </section>

      {finished.length > 0 && (
        <section className="container mx-auto px-3 mt-4 mb-6">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Gavel className="w-4 h-4 text-muted-foreground" /> Leilões Finalizados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {finished.map((a: any) => (
              <div key={a.id} className="bg-card border border-border rounded-card overflow-hidden relative opacity-90">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {a.image_url ? <img src={a.image_url} alt={a.title} className="w-full h-full object-cover grayscale" loading="lazy" /> : <Gavel className="w-12 h-12 m-auto mt-12 text-muted-foreground" />}
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-sm text-[9px] font-black text-primary-foreground bg-destructive">VENDIDO!</span>
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-bold text-foreground line-clamp-1 mb-1">{a.title}</h3>
                  <p className="text-[10px] text-muted-foreground">Arrematado por:</p>
                  <p className="text-sm font-black text-walmart-green">{Number(a.current_bid).toLocaleString("pt-AO")} Kz</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Leilao;
