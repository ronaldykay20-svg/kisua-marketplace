import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Gavel, Monitor, Home, Car, Watch, Clock, Trophy, CheckCircle2, Users, Shield, Loader2, X, Upload, Copy } from "lucide-react";
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

// ── Modal Step 1: escolher valor ─────────────────────────────────────────────
const BidModal = ({
  auction,
  onClose,
  onConfirm,
}: {
  auction: any;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) => {
  const minBid = Number(auction.current_bid) + Number(auction.bid_increment || 1000);
  const [value, setValue] = useState(minBid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-card p-5 w-[90vw] max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">DAR LANCE</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-1 font-semibold line-clamp-1">{auction.title}</p>
        <div className="flex justify-between text-xs text-muted-foreground mb-1 mt-3">
          <span>Lance actual:</span>
          <span className="font-bold text-foreground">{Number(auction.current_bid).toLocaleString("pt-AO")} Kz</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>Lance mínimo:</span>
          <span className="font-bold text-walmart-green">{minBid.toLocaleString("pt-AO")} Kz</span>
        </div>
        <label className="text-xs font-bold text-muted-foreground uppercase">O seu lance (Kz)</label>
        <input
          type="number"
          min={minBid}
          step={Number(auction.bid_increment || 1000)}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          className="w-full mt-1 mb-1 px-3 py-2 border border-border rounded-card text-sm font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        {value < minBid && (
          <p className="text-[11px] text-destructive mb-2">Valor abaixo do mínimo ({minBid.toLocaleString("pt-AO")} Kz)</p>
        )}
        <button
          onClick={() => value >= minBid && onConfirm(value)}
          disabled={value < minBid}
          className="w-full mt-3 py-2.5 rounded-card font-bold text-sm text-foreground bg-secondary hover:bg-secondary/80 transition disabled:opacity-50"
        >
          CONTINUAR — {value.toLocaleString("pt-AO")} Kz
        </button>
      </div>
    </div>
  );
};

// ── Modal Step 2: enviar comprovante ─────────────────────────────────────────
const ProofModal = ({
  auction,
  amount,
  onClose,
  onSuccess,
}: {
  auction: any;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: methods = [] } = useQuery({
    queryKey: ["auction_payment_methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("type");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await (supabase as any).storage
        .from("bid-proofs")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await (supabase as any)
        .from("auction_bid_proofs")
        .insert({
          auction_id: auction.id,
          user_id: user.id,
          amount,
          proof_url: path,
          reference: reference || null,
          status: "pending",
        });
      if (insertError) throw insertError;

      toast.success("Comprovante enviado! Aguarde validação do administrador.");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-card p-5 w-[90vw] max-w-sm shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">ENVIAR COMPROVANTE</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="bg-muted/50 rounded-card px-3 py-2 mb-3 text-xs">
          <p className="text-muted-foreground">Leilão: <span className="font-bold text-foreground">{auction.title}</span></p>
          <p className="text-muted-foreground mt-0.5">Valor do lance: <span className="font-bold text-walmart-green">{amount.toLocaleString("pt-AO")} Kz</span></p>
        </div>

        {methods.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-black text-muted-foreground uppercase mb-2">Dados para transferência</p>
            <div className="space-y-2">
              {methods.map((m: any) => (
                <div key={m.id} className="bg-muted rounded-card px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">
                        {m.type === "xpress" ? "Xpress" : m.type === "iban" ? "IBAN / TPA" : m.label}
                      </p>
                      <p className="text-sm font-black text-foreground">{m.value}</p>
                      {m.holder && <p className="text-[10px] text-muted-foreground">{m.holder}</p>}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(m.value); toast.success("Copiado!"); }}
                      className="p-1.5 rounded-lg bg-secondary/20 text-secondary"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {methods.length === 0 && (
          <div className="bg-amber-500/10 text-amber-600 text-xs rounded-card px-3 py-2 mb-4">
            Métodos de pagamento ainda não configurados. Contacte o administrador.
          </div>
        )}

        <p className="text-xs font-black text-muted-foreground uppercase mb-2">Comprovante de transferência</p>

        <input
          type="text"
          placeholder="Referência da transferência (opcional)"
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-border rounded-card text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 border-2 border-dashed border-border rounded-card text-xs font-bold text-muted-foreground hover:border-secondary transition mb-2 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {file ? file.name : "Seleccionar imagem / PDF"}
        </button>

        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full mt-2 py-2.5 rounded-card font-bold text-sm text-foreground bg-secondary hover:bg-secondary/80 transition disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "ENVIAR COMPROVANTE"}
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const Leilao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [bidTarget, setBidTarget] = useState<any>(null);
  const [proofTarget, setProofTarget] = useState<{ auction: any; amount: number } | null>(null);

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
  const displayed = selectedAuction || featured;

  const { data: bids = [] } = useQuery({
    queryKey: ["auction_bids", selectedAuction?.id || featured?.id],
    queryFn: async () => {
      const id = selectedAuction?.id || featured?.id;
      if (!id) return [];
      const { data, error } = await (supabase as any).from("auction_bids")
        .select("id, amount, created_at, user_id, profiles:user_id(full_name)")
        .eq("auction_id", id)
        .order("amount", { ascending: false })
        .limit(10);
      if (error) console.error("Erro bids:", error);
      return data || [];
    },
    enabled: !!(selectedAuction?.id || featured?.id),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const id = selectedAuction?.id || featured?.id;
    if (!id) return;
    const channel = (supabase as any)
      .channel(`bids-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auction_bids", filter: `auction_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["auction_bids", id] });
        qc.invalidateQueries({ queryKey: ["public_auctions"] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [selectedAuction?.id, featured?.id, qc]);

  const openBidModal = (auction: any) => {
    if (!user) { navigate("/auth"); return; }
    setBidTarget(auction);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {bidTarget && (
        <BidModal
          auction={bidTarget}
          onClose={() => setBidTarget(null)}
          onConfirm={(amount) => {
            setProofTarget({ auction: bidTarget, amount });
            setBidTarget(null);
          }}
        />
      )}

      {proofTarget && (
        <ProofModal
          auction={proofTarget.auction}
          amount={proofTarget.amount}
          onClose={() => setProofTarget(null)}
          onSuccess={() => setProofTarget(null)}
        />
      )}

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

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

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
                  <button
                    onClick={() => openBidModal(displayed)}
                    className="w-full mt-4 py-2.5 rounded-card font-bold text-sm text-foreground bg-secondary hover:bg-secondary/80 transition"
                  >
                    DAR LANCE
                  </button>

                  <div className="mt-4">
                    <p className="text-xs font-bold text-muted-foreground mb-2">HISTÓRICO DE LANCES</p>
                    <div className="space-y-1.5">
                      {bids.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem lances ainda. Seja o primeiro!</p>}
                      {bids.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-sm px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-walmart-green" />
                            <span className="font-semibold">{b.profiles?.full_name || b.user_id?.slice(0, 8) || "Anónimo"}</span>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); openBidModal(a); }}
                    className="w-full mt-2 py-1.5 rounded-card text-[11px] font-bold bg-secondary text-foreground hover:bg-secondary/80 transition"
                  >
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
