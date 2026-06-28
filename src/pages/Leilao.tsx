import { useState, useEffect, useRef } from "react";
import Footer from "@/components/Footer";
import { Gavel, Monitor, Home, Car, Watch, Clock, Trophy, CheckCircle2, Users, Shield, Loader2, X, Upload, Copy, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
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
    <span
      className="text-2xl md:text-4xl font-black tabular-nums px-3 py-2 rounded-xl"
      style={{ background: "#1a1a1a", color: "#f5c842" }}
    >
      {value}
    </span>
    <span className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest">{label}</span>
  </div>
);

const categories = [
  { icon: Monitor, label: "Electrónicos" },
  { icon: Home, label: "Imóveis" },
  { icon: Car, label: "Veículos" },
  { icon: Watch, label: "Luxo & Relógios" },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<any>(null);

  // Imagem hero configurada pelo admin
  const { data: heroImage } = useQuery({
    queryKey: ["auction_hero_image"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_hero_image")
        .select("image_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Slides secundários (carrossel existente)
  const { data: slides = [] } = useQuery({
    queryKey: ["auction_hero_slides"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_hero_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const prev = () => {
    clearInterval(timerRef.current);
    setCurrent(c => (c - 1 + slides.length) % slides.length);
  };
  const next = () => {
    clearInterval(timerRef.current);
    setCurrent(c => (c + 1) % slides.length);
  };

  return (
    <>
      {/* ── IMAGEM HERO (configurada pelo admin) ── */}
      <div className="w-full overflow-hidden" style={{ maxHeight: 320 }}>
        {heroImage?.image_url ? (
          <img
            src={heroImage.image_url}
            alt="Leilão Online"
            className="w-full object-cover"
            style={{ maxHeight: 320, display: "block" }}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            style={{
              minHeight: 220,
              background: "linear-gradient(135deg,#1a0a00 0%,#3d1f00 50%,#1a0a00 100%)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(245,200,66,0.15)" }}
            >
              <Gavel className="w-9 h-9" style={{ color: "#f5c842" }} />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              LEILÃO ONLINE
            </h1>
            <p className="text-base font-semibold mt-2" style={{ color: "#f5c842" }}>
              Dê o seu lance e leve o melhor lote!
            </p>
          </div>
        )}
      </div>

      {/* ── SLIDES SECUNDÁRIOS (carrossel existente, só aparece se houver slides) ── */}
      {slides.length > 0 && (
        <div className="relative w-full overflow-hidden" style={{ minHeight: 180 }}>
          {slides[current]?.type === "video" ? (
            <video
              key={slides[current].id}
              src={slides[current].url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full object-cover"
              style={{ minHeight: 180, maxHeight: 260 }}
            />
          ) : (
            <img
              key={slides[current].id}
              src={slides[current].url}
              alt={slides[current].title || "Leilão"}
              className="w-full object-cover transition-opacity duration-500"
              style={{ minHeight: 180, maxHeight: 260 }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)",
            }}
          />
          {(slides[current]?.title || slides[current]?.subtitle) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              {slides[current]?.title && (
                <h2 className="text-xl md:text-3xl font-black text-white drop-shadow-lg">
                  {slides[current].title}
                </h2>
              )}
              {slides[current]?.subtitle && (
                <p
                  className="text-sm font-semibold mt-1 drop-shadow"
                  style={{ color: "#f5c842" }}
                >
                  {slides[current].subtitle}
                </p>
              )}
            </div>
          )}
          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {slides.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: i === current ? "#f5c842" : "rgba(255,255,255,0.5)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

const BidModal = ({
  auction,
  onClose,
  onConfirm,
}: {
  auction: any;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) => {
  const normalMin = Number(auction.current_bid) + Number(auction.bid_increment || 1000);
  const { data: highestPending } = useQuery({
    queryKey: ["highest_pending", auction.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_bid_proofs")
        .select("amount")
        .eq("auction_id", auction.id)
        .eq("status", "pending")
        .order("amount", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });
  const pendingAmount = highestPending ? Number(highestPending.amount) : 0;
  const pendingMin = pendingAmount > 0 ? Math.ceil(pendingAmount * 1.03) : 0;
  const minBid = Math.max(normalMin, pendingMin);
  const hasPending = pendingAmount > 0;
  const [value, setValue] = useState(minBid);
  useEffect(() => {
    setValue(minBid);
  }, [minBid]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-5 w-[90vw] max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">DAR LANCE</h3>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-1 font-semibold line-clamp-1">
          {auction.title}
        </p>
        <div className="flex justify-between text-xs text-muted-foreground mb-1 mt-3">
          <span>Lance actual:</span>
          <span className="font-bold text-foreground">
            {Number(auction.current_bid).toLocaleString("pt-AO")} Kz
          </span>
        </div>
        {hasPending && (
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Lance pendente mais alto:</span>
            <span className="font-bold text-amber-500">
              {pendingAmount.toLocaleString("pt-AO")} Kz
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Lance mínimo obrigatório:</span>
          <span className="font-bold text-green-600">
            {minBid.toLocaleString("pt-AO")} Kz
          </span>
        </div>
        {hasPending && (
          <div className="bg-amber-500/10 text-amber-600 text-[11px] rounded-xl px-3 py-2 mb-3">
            Existe um lance pendente. O seu lance tem de superar esse valor em pelo menos 3%.
          </div>
        )}
        <label className="text-xs font-bold text-muted-foreground uppercase">
          O seu lance (Kz)
        </label>
        <input
          type="number"
          min={minBid}
          step={Number(auction.bid_increment || 1000)}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          className="w-full mt-1 mb-1 px-3 py-2 border border-border rounded-xl text-sm font-bold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {value < minBid && (
          <p className="text-[11px] text-destructive mb-2">
            Valor abaixo do mínimo ({minBid.toLocaleString("pt-AO")} Kz)
          </p>
        )}
        <button
          onClick={() => value >= minBid && onConfirm(value)}
          disabled={value < minBid}
          className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm text-white transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
        >
          CONTINUAR — {value.toLocaleString("pt-AO")} Kz
        </button>
      </div>
    </div>
  );
};

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-5 w-[90vw] max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground">ENVIAR COMPROVANTE</h3>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="rounded-xl px-3 py-2 mb-3 text-xs" style={{ background: "#f5e6d0" }}>
          <p className="text-gray-600">
            Leilão: <span className="font-bold text-gray-900">{auction.title}</span>
          </p>
          <p className="text-gray-600 mt-0.5">
            Valor:{" "}
            <span className="font-bold text-green-700">
              {amount.toLocaleString("pt-AO")} Kz
            </span>
          </p>
        </div>
        {methods.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-black text-muted-foreground uppercase mb-2">
              Dados para transferência
            </p>
            <div className="space-y-2">
              {methods.map((m: any) => (
                <div
                  key={m.id}
                  className="bg-muted rounded-xl px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      {m.type === "xpress" ? "Xpress" : m.type === "iban" ? "IBAN / TPA" : m.label}
                    </p>
                    <p className="text-sm font-black text-foreground">{m.value}</p>
                    {m.holder && (
                      <p className="text-[10px] text-muted-foreground">{m.holder}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.value);
                      toast.success("Copiado!");
                    }}
                    className="p-1.5 rounded-lg"
                    style={{ background: "rgba(200,169,126,0.2)", color: "#a07a4a" }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {methods.length === 0 && (
          <div className="bg-amber-500/10 text-amber-600 text-xs rounded-xl px-3 py-2 mb-4">
            Métodos de pagamento ainda não configurados. Contacte o administrador.
          </div>
        )}
        <p className="text-xs font-black text-muted-foreground uppercase mb-2">Comprovante</p>
        <input
          type="text"
          placeholder="Referência da transferência (opcional)"
          value={reference}
          onChange={e => setReference(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-border rounded-xl text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-amber-400"
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
          className="w-full py-2.5 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-amber-400 transition mb-2 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {file ? file.name : "Seleccionar imagem / PDF"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          className="w-full mt-2 py-2.5 rounded-xl font-bold text-sm text-white transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
        >
          {uploading ? "Enviando..." : "ENVIAR COMPROVANTE"}
        </button>
      </div>
    </div>
  );
};

const CardTimerInline = ({ ends_at }: { ends_at: string }) => {
  const { h, m, s } = useCountdown(ends_at);
  return (
    <span className="text-[10px] font-bold text-white tabular-nums">
      {h}:{m}:{s}
    </span>
  );
};

const LeilaoEmBreve = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(200,169,126,0.15)" }}
        >
          <Sparkles className="w-8 h-8" style={{ color: "#a07a4a" }} />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Leilões — Em breve</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Estamos a preparar esta funcionalidade. Volte mais tarde para participar nos leilões da
          ZANGU.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
        >
          Voltar à página inicial
        </button>
      </div>
      <Footer />
    </div>
  );
};

const Leilao = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { hasAccess, isLoading: loadingAccess } = useFeatureAccess("leiloes");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [bidTarget, setBidTarget] = useState<any>(null);
  const [proofTarget, setProofTarget] = useState<{ auction: any; amount: number } | null>(null);

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["public_auctions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("auctions")
        .select("*")
        .order("ends_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: hasAccess,
  });

  const active = auctions.filter(
    (a: any) => a.status === "active" && new Date(a.ends_at) > new Date()
  );
  const finished = auctions.filter(
    (a: any) => a.status === "finished" || new Date(a.ends_at) <= new Date()
  );
  const filteredActive = activeCategory
    ? active.filter((a: any) => a.category === activeCategory)
    : active;
  const featured = active.find((a: any) => a.is_featured) || active[0] || null;
  const countdown = useCountdown(featured?.ends_at || null);
  const displayed = selectedAuction || featured;

  const { data: bids = [] } = useQuery({
    queryKey: ["auction_bids", selectedAuction?.id || featured?.id],
    queryFn: async () => {
      const id = selectedAuction?.id || featured?.id;
      if (!id) return [];
      const { data, error } = await (supabase as any)
        .from("auction_bids")
        .select("id, amount, created_at, user_id, profiles:user_id(full_name)")
        .eq("auction_id", id)
        .order("amount", { ascending: false })
        .limit(10);
      if (error) console.error("Erro bids:", error);
      return data || [];
    },
    enabled: hasAccess && !!(selectedAuction?.id || featured?.id),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!hasAccess) return;
    const id = selectedAuction?.id || featured?.id;
    if (!id) return;
    const channel = (supabase as any)
      .channel(`bids-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auction_bids",
          filter: `auction_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["auction_bids", id] });
          qc.invalidateQueries({ queryKey: ["public_auctions"] });
        }
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [selectedAuction?.id, featured?.id, qc, hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    (supabase as any).rpc("close_expired_auctions");
  }, [hasAccess]);

  const openBidModal = (auction: any) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setBidTarget(auction);
  };

  if (loadingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c8a97e" }} />
      </div>
    );
  }

  if (!hasAccess) {
    return <LeilaoEmBreve />;
  }

  return (
    <div className="min-h-screen bg-background">
      {bidTarget && (
        <BidModal
          auction={bidTarget}
          onClose={() => setBidTarget(null)}
          onConfirm={amount => {
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

      {/* ── HERO IMAGE + SLIDES SECUNDÁRIOS ── */}
      <HeroSection />

      {/* ── COUNTDOWN — fundo claro, separado da hero image ── */}
      {displayed && (
        <div className="px-3 mt-3">
          <div
            className="rounded-2xl p-4 text-center shadow-sm"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#7c6a50" }}
            >
              Leilão termina em
            </p>
            <div className="flex justify-center gap-3">
              <TimerBox value={countdown.h} label="Horas" />
              <span
                className="text-3xl font-black self-start mt-1"
                style={{ color: "#1a0a00" }}
              >
                :
              </span>
              <TimerBox value={countdown.m} label="Min" />
              <span
                className="text-3xl font-black self-start mt-1"
                style={{ color: "#1a0a00" }}
              >
                :
              </span>
              <TimerBox value={countdown.s} label="Seg" />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c8a97e" }} />
        </div>
      )}

      {!isLoading && auctions.length === 0 && (
        <div className="container mx-auto px-3 py-10 text-center">
          <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Ainda não há leilões disponíveis. Volte em breve!
          </p>
        </div>
      )}

      {displayed && (
        <section className="container mx-auto px-3 mt-4">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
            <div className="relative aspect-video overflow-hidden bg-muted">
              {displayed.image_url ? (
                <img
                  src={displayed.image_url}
                  alt={displayed.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gavel className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              {displayed.is_featured && (
                <span
                  className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
                >
                  DESTAQUE
                </span>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
                style={{ background: "linear-gradient(to top,rgba(0,0,0,0.7),transparent)" }}
              >
                <span className="text-white text-xs font-bold">{displayed.title}</span>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: "#f5c842", color: "#1a0a00" }}
                >
                  {bids.length} lances
                </span>
              </div>
            </div>
            <div className="p-4 bg-card">
              {displayed.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {displayed.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: "#f5e6d0" }}
                >
                  <p className="text-[10px] text-gray-500 font-semibold">Lance Actual</p>
                  <p className="text-base font-black text-green-700">
                    {Number(displayed.current_bid).toLocaleString("pt-AO")} Kz
                  </p>
                </div>
                <div
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: "#f5e6d0" }}
                >
                  <p className="text-[10px] text-gray-500 font-semibold">Próximo mínimo</p>
                  <p className="text-base font-black text-gray-900">
                    {(
                      Number(displayed.current_bid) + Number(displayed.bid_increment || 1000)
                    ).toLocaleString("pt-AO")}{" "}
                    Kz
                  </p>
                </div>
              </div>
              <button
                onClick={() => openBidModal(displayed)}
                className="w-full py-3 rounded-xl font-black text-sm text-white transition shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
              >
                🔨 DAR LANCE
              </button>
              <div className="mt-4">
                <p className="text-xs font-black text-muted-foreground mb-2 uppercase tracking-wide">
                  Histórico de Lances
                </p>
                <div className="space-y-1.5">
                  {bids.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Sem lances ainda. Seja o primeiro!
                    </p>
                  )}
                  {bids.map((b: any, idx: number) => (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl ${
                        idx === 0 ? "border border-amber-300" : "bg-muted/50"
                      }`}
                      style={idx === 0 ? { background: "#fffbeb" } : {}}
                    >
                      <div className="flex items-center gap-2">
                        {idx === 0 ? (
                          <span>🏆</span>
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                        <span className="font-semibold">
                          {b.profiles?.full_name || b.user_id?.slice(0, 8) || "Anónimo"}
                        </span>
                      </div>
                      <span
                        className="font-black"
                        style={idx === 0 ? { color: "#a07a4a" } : {}}
                      >
                        {Number(b.amount).toLocaleString("pt-AO")} Kz
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-3 mt-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {categories.map(c => (
            <button
              key={c.label}
              onClick={() => setActiveCategory(activeCategory === c.label ? null : c.label)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === c.label
                  ? "text-white border-transparent"
                  : "bg-card text-foreground border-border"
              }`}
              style={
                activeCategory === c.label
                  ? { background: "linear-gradient(135deg,#c8a97e,#a07a4a)", borderColor: "transparent" }
                  : {}
              }
            >
              <c.icon className="w-4 h-4" />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {filteredActive.length > 0 && (
        <section className="container mx-auto px-3 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-4 h-4" style={{ color: "#c8a97e" }} /> Leilões em Andamento
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filteredActive.map((a: any) => (
              <div
                key={a.id}
                onClick={() => setSelectedAuction(a)}
                className="rounded-2xl overflow-hidden shadow-md border border-border cursor-pointer group active:scale-95 transition bg-card"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Gavel className="w-12 h-12 m-auto mt-8 text-muted-foreground" />
                  )}
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(0,0,0,0.65)" }}
                  >
                    <Clock className="w-2.5 h-2.5 text-red-400" />
                    <CardTimerInline ends_at={a.ends_at} />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-bold text-foreground line-clamp-2 mb-2">
                    {a.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Lance actual</p>
                  <p className="text-sm font-black text-foreground mb-2">
                    {Number(a.current_bid).toLocaleString("pt-AO")} Kz
                  </p>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openBidModal(a);
                    }}
                    className="w-full py-2 rounded-xl text-[11px] font-black text-white transition active:scale-95"
                    style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
                  >
                    DAR LANCE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-3 mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-5 flex flex-col justify-center"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#1e40af)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-white" />
            <h3 className="text-sm font-black text-white">FAÇA O SEU CADASTRO</h3>
          </div>
          <p className="text-xs text-white/80 mb-3">E participe dos leilões!</p>
          <button
            onClick={() => navigate("/auth")}
            className="self-start px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}
          >
            CADASTRE-SE
          </button>
        </div>
        <div
          className="rounded-2xl p-5 flex flex-col justify-center"
          style={{ background: "linear-gradient(135deg,#14532d,#166534)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-white" />
            <h3 className="text-sm font-black text-white">LANCES SEGUROS</h3>
          </div>
          <p className="text-xs text-white/80">Ganhe ofertas incríveis com total segurança!</p>
        </div>
      </section>

      {finished.length > 0 && (
        <section className="container mx-auto px-3 mt-5 mb-8">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Gavel className="w-4 h-4 text-muted-foreground" /> Leilões Finalizados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {finished.map((a: any) => (
              <div
                key={a.id}
                className="rounded-2xl overflow-hidden border border-border opacity-80 bg-card"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="w-full h-full object-cover grayscale"
                      loading="lazy"
                    />
                  ) : (
                    <Gavel className="w-12 h-12 m-auto mt-8 text-muted-foreground" />
                  )}
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black text-white bg-red-500">
                    VENDIDO
                  </span>
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-bold text-foreground line-clamp-1 mb-1">
                    {a.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Arrematado por:</p>
                  <p className="text-sm font-black text-green-700">
                    {Number(a.current_bid).toLocaleString("pt-AO")} Kz
                  </p>
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
