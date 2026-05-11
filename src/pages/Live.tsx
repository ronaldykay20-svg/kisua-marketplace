import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import {
  Radio, Search, SlidersHorizontal, Bell, Play, Eye,
  Calendar, Clock, ChevronRight, Gavel, Video, X,
  Loader2, Users, Zap, Star, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────────────────────────
   CORES DO PROJECTO (igual ao DesktopNavbar)
───────────────────────────────────────────── */
const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const gold       = "#f5c842";

/* ─────────────────────────────────────────────
   HOOK: lives ao vivo (partilhado com Navbar)
───────────────────────────────────────────── */
export const useLiveCount = () =>
  useQuery({
    queryKey: ["live_active_count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("live_streams")
        .select("*", { count: "exact", head: true })
        .eq("status", "live");
      return count || 0;
    },
    refetchInterval: 15000,
  });

/* ─────────────────────────────────────────────
   PULSE DOT — ponto vermelho/verde a piscar
───────────────────────────────────────────── */
const PulseDot = ({ color = "#E53935" }: { color?: string }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{
      background: color,
      boxShadow: `0 0 0 0 ${color}`,
      animation: "livePulse 1.4s ease-in-out infinite",
    }}
  />
);

/* ─────────────────────────────────────────────
   BADGE de contagem
───────────────────────────────────────────── */
const LiveBadge = ({ count }: { count: number }) =>
  count > 0 ? (
    <span
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
      style={{ background: "#E53935" }}
    >
      {count > 9 ? "9+" : count}
    </span>
  ) : null;

/* ─────────────────────────────────────────────
   CARD — Live ao vivo
───────────────────────────────────────────── */
const LiveCard = ({ stream, onClick }: { stream: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex-shrink-0"
    style={{ minWidth: 0 }}
  >
    {/* Thumbnail */}
    <div className="relative aspect-video bg-gray-900 overflow-hidden">
      {stream.thumbnail_url ? (
        <img
          src={stream.thumbnail_url}
          alt={stream.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a0a00, #3d1f00)" }}
        >
          <Video className="w-12 h-12 opacity-30 text-white" />
        </div>
      )}

      {/* Overlay escuro no hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

      {/* Badge AO VIVO */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: "#E53935" }}>
        <PulseDot color="#fff" />
        <span className="text-[10px] font-black text-white tracking-wider">AO VIVO</span>
      </div>

      {/* Viewers */}
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,0,0,0.65)" }}>
        <Eye className="w-3 h-3 text-white" />
        <span className="text-[10px] font-bold text-white">
          {stream.viewers_count >= 1000
            ? `${(stream.viewers_count / 1000).toFixed(1)}k`
            : stream.viewers_count}
        </span>
      </div>

      {/* Botão play central */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{ background: "rgba(255,255,255,0.92)" }}>
          <Play className="w-6 h-6 ml-1" style={{ color: brown }} />
        </div>
      </div>

      {/* Produto leilão vinculado */}
      {stream.linked_auction && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
          <Gavel className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gold }} />
          <span className="text-[10px] font-bold text-white line-clamp-1">{stream.linked_auction.title}</span>
          <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: gold, color: "#1a0a00" }}>
            {Number(stream.linked_auction.current_price).toLocaleString("pt-AO")} Kz
          </span>
        </div>
      )}
    </div>

    {/* Info card */}
    <div className="p-3" style={{ background: cream }}>
      {/* Seller row */}
      <div className="flex items-center gap-2 mb-2">
        {stream.seller?.logo_url ? (
          <img src={stream.seller.logo_url} alt={stream.seller.name}
            className="w-7 h-7 rounded-full object-cover border-2"
            style={{ borderColor: sand }} />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: brownLight, color: brown }}>
            {(stream.seller?.name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold truncate" style={{ color: brown }}>
              {stream.seller?.name || "Vendedor"}
            </span>
            {stream.seller?.is_verified && (
              <Star className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
            )}
          </div>
        </div>
      </div>
      <h3 className="text-sm font-black line-clamp-2 mb-2" style={{ color: brown }}>
        {stream.title}
      </h3>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="w-full py-2 rounded-xl text-xs font-black text-white transition active:scale-95"
        style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
      >
        ▶ Assistir agora
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   CARD — Próxima live (agendada)
───────────────────────────────────────────── */
const ScheduledCard = ({
  stream, onRemember, remembered,
}: { stream: any; onRemember: (id: string) => void; remembered: boolean }) => {
  const date = stream.starts_at ? new Date(stream.starts_at) : null;
  const day   = date ? String(date.getDate()).padStart(2, "0") : "--";
  const month = date
    ? date.toLocaleString("pt-AO", { month: "short" }).toUpperCase()
    : "---";
  const time  = date
    ? date.toLocaleString("pt-AO", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="flex items-stretch gap-3 py-3 border-b last:border-0"
      style={{ borderColor: "rgba(74,46,10,0.12)" }}>
      {/* Data */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm"
        style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
        <span className="text-lg font-black leading-none" style={{ color: brown }}>{day}</span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: sandDark }}>{month}</span>
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-gray-200">
        {stream.thumbnail_url
          ? <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${cream}, ${sand})` }}>
              <Video className="w-5 h-5" style={{ color: sandDark }} />
            </div>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
            <span className="text-[11px] font-bold" style={{ color: sandDark }}>{time}</span>
          </div>
          <h3 className="text-sm font-black line-clamp-1 mb-0.5" style={{ color: brown }}>{stream.title}</h3>
          {stream.description && (
            <p className="text-[11px] line-clamp-1" style={{ color: sandDark }}>{stream.description}</p>
          )}
          {/* Seller */}
          <div className="flex items-center gap-1 mt-1">
            {stream.seller?.logo_url
              ? <img src={stream.seller.logo_url} alt={stream.seller.name}
                  className="w-4 h-4 rounded-full object-cover" />
              : <div className="w-4 h-4 rounded-full" style={{ background: brownLight }} />}
            <span className="text-[10px] font-semibold" style={{ color: sandDark }}>
              {stream.seller?.name || "Vendedor"}
            </span>
            {stream.seller?.is_verified && (
              <Star className="w-2.5 h-2.5" style={{ color: sandDark }} />
            )}
          </div>
        </div>
      </div>

      {/* Botão Lembrar */}
      <div className="flex-shrink-0 flex items-center">
        <button
          onClick={() => onRemember(stream.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: remembered ? brownLight : "white",
            border: `1px solid ${remembered ? sandDark : "rgba(74,46,10,0.20)"}`,
            color: remembered ? brown : sandDark,
          }}
        >
          <Bell className="w-3.5 h-3.5" />
          {remembered ? "Lembrando" : "Lembrar"}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MODAL — Assistir live
───────────────────────────────────────────── */
const WatchModal = ({ stream, onClose }: { stream: any; onClose: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: `linear-gradient(135deg, ${cream}, ${sand})` }}>
          <div className="flex items-center gap-3">
            {stream.seller?.logo_url
              ? <img src={stream.seller.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2"
                  style={{ borderColor: sandDark }} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                  style={{ background: brownLight, color: brown }}>
                  {(stream.seller?.name || "?").charAt(0)}
                </div>}
            <div>
              <p className="text-xs font-bold" style={{ color: sandDark }}>{stream.seller?.name}</p>
              <h2 className="text-sm font-black" style={{ color: brown }}>{stream.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: brownLight }}>
            <X className="w-4 h-4" style={{ color: brown }} />
          </button>
        </div>

        {/* Área de vídeo */}
        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
          {stream.stream_url ? (
            <video src={stream.stream_url} controls autoPlay className="w-full h-full" />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(245,200,66,0.15)" }}>
                <Radio className="w-8 h-8" style={{ color: gold }} />
              </div>
              <p className="text-white font-bold text-sm">A transmissão está em curso</p>
              <p className="text-white/50 text-xs mt-1">Aguarde a integração AgoraRTC</p>
            </div>
          )}
          {stream.status === "live" && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: "#E53935" }}>
              <PulseDot color="#fff" />
              <span className="text-[10px] font-black text-white">AO VIVO</span>
              <span className="text-[10px] text-white/80 ml-1">
                <Eye className="w-3 h-3 inline mr-0.5" />
                {stream.viewers_count}
              </span>
            </div>
          )}
        </div>

        {/* Produto em leilão vinculado */}
        {stream.linked_auction && (
          <div className="px-5 py-3 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #1a0a00, #3d1f00)" }}>
            {stream.linked_auction.image_url && (
              <img src={stream.linked_auction.image_url} alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Gavel className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gold }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: gold }}>
                  Leilão em curso
                </span>
              </div>
              <p className="text-sm font-bold text-white line-clamp-1">{stream.linked_auction.title}</p>
              <p className="text-xs font-black" style={{ color: gold }}>
                Lance actual: {Number(stream.linked_auction.current_price).toLocaleString("pt-AO")} Kz
              </p>
            </div>
            <button
              onClick={() => { onClose(); navigate("/leilao"); }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
            >
              <Gavel className="w-3.5 h-3.5" />
              Dar lance
            </button>
          </div>
        )}

        {stream.description && (
          <div className="px-5 py-3">
            <p className="text-sm" style={{ color: sandDark }}>{stream.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   PÁGINA PRINCIPAL — Live
───────────────────────────────────────────── */
const Live = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [watchStream,  setWatchStream]  = useState<any>(null);
  const [remembered,   setRemembered]   = useState<Set<string>>(new Set());

  /* ── Fetch lives ao vivo ── */
  const { data: liveStreams = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live_streams_active"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified),
          linked_auction:auctions(id, title, current_price, image_url, status)
        `)
        .eq("status", "live")
        .order("viewers_count", { ascending: false });
      return data || [];
    },
    refetchInterval: 10000,
  });

  /* ── Fetch próximas lives ── */
  const { data: scheduledStreams = [], isLoading: loadingScheduled } = useQuery({
    queryKey: ["live_streams_scheduled"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified)
        `)
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  /* ── Realtime: novos viewers ── */
  useEffect(() => {
    const channel = (supabase as any)
      .channel("live_streams_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        qc.invalidateQueries({ queryKey: ["live_streams_active"] });
        qc.invalidateQueries({ queryKey: ["live_streams_scheduled"] });
        qc.invalidateQueries({ queryKey: ["live_active_count"] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [qc]);

  const handleRemember = (id: string) => {
    if (!user) { navigate("/auth"); return; }
    setRemembered(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info("Lembrete removido"); }
      else { next.add(id); toast.success("Vais receber um lembrete antes da live!"); }
      return next;
    });
  };

  /* ── Filtro de pesquisa ── */
  const filteredLive = liveStreams.filter((s: any) =>
    !searchQuery ||
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScheduled = scheduledStreams.filter((s: any) =>
    !searchQuery ||
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingLive || loadingScheduled;

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0" }}>

      <style>{`
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          50%  { box-shadow: 0 0 0 6px transparent; opacity: 0.7; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
        }
        @keyframes liveGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(229,57,53,0); }
        }
      `}</style>

      {/* ══ HEADER DA PÁGINA ══ */}
      <div className="sticky top-0 z-40" style={{
        background: `linear-gradient(160deg, ${cream} 0%, ${sand} 60%, #C9A87C 100%)`,
        borderBottom: `1px solid rgba(74,46,10,0.15)`,
        boxShadow: "0 2px 16px rgba(74,46,10,0.12)",
      }}>
        {/* Só visível em tablet/desktop — mobile usa a navbar existente */}
        <div className="hidden md:block max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(229,57,53,0.12)", border: "1px solid rgba(229,57,53,0.25)" }}>
                <Radio className="w-5 h-5" style={{ color: "#E53935" }} />
              </div>
              <div>
                <h1 className="text-xl font-black" style={{ color: brown }}>Live</h1>
                <p className="text-xs" style={{ color: sandDark }}>
                  Assista, interaja e aproveite ofertas exclusivas em tempo real.
                </p>
              </div>
            </div>

            {/* Barra pesquisa */}
            <div className="flex-1 flex items-center rounded-2xl overflow-hidden ml-4"
              style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.12)" }}>
              <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar lives, produtos ou vendedores..."
                className="flex-1 py-2.5 px-3 text-sm bg-transparent focus:outline-none"
                style={{ color: brown }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="mr-2">
                  <X className="w-4 h-4" style={{ color: sandDark }} />
                </button>
              )}
            </div>

            {/* Filtros */}
            <button
              onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: filterOpen ? brown : "white",
                color: filterOpen ? "white" : brown,
                border: `1px solid rgba(74,46,10,0.20)`,
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Header mobile simplificado */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5" style={{ color: "#E53935" }} />
            <h1 className="text-base font-black" style={{ color: brown }}>Live</h1>
            {liveStreams.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{ background: "#E53935" }}>
                {liveStreams.length} ao vivo
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center rounded-xl overflow-hidden"
            style={{ background: "#fff", boxShadow: "0 1px 4px rgba(74,46,10,0.10)" }}>
            <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lives, produtos ou vendedores..."
              className="flex-1 py-2 px-2.5 text-sm bg-transparent focus:outline-none"
              style={{ color: brown }}
            />
          </div>
        </div>
      </div>

      {/* ══ CONTEÚDO ══ */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-5">

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: sandDark }} />
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── SECÇÃO: Ao vivo agora ── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {/* Ícone pulsante */}
                  <span className="relative flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full absolute" style={{
                      background: "#E53935", opacity: 0.4,
                      animation: "liveGlow 1.4s ease-in-out infinite",
                    }} />
                    <span className="w-3 h-3 rounded-full" style={{ background: "#E53935" }} />
                  </span>
                  <h2 className="text-base font-black" style={{ color: brown }}>Ao vivo agora</h2>
                  {filteredLive.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(229,57,53,0.10)", color: "#E53935" }}>
                      {filteredLive.length}
                    </span>
                  )}
                </div>
                {filteredLive.length > 3 && (
                  <button className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: sandDark }}>
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredLive.length === 0 ? (
                <div className="rounded-2xl py-12 text-center"
                  style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                  <Radio className="w-10 h-10 mx-auto mb-3" style={{ color: sandDark, opacity: 0.5 }} />
                  <p className="text-sm font-bold" style={{ color: sandDark }}>
                    {searchQuery ? "Sem resultados para a pesquisa" : "Nenhuma live ao vivo agora"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: sandDark, opacity: 0.7 }}>
                    Confira as próximas lives abaixo!
                  </p>
                </div>
              ) : (
                /* Grid responsivo: 1 col mobile, 2 tablet, 3 desktop */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLive.map((stream: any) => (
                    <LiveCard
                      key={stream.id}
                      stream={stream}
                      onClick={() => setWatchStream(stream)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Banner CTA vendedor ── */}
            {user && (
              <section className="mb-8">
                <div
                  className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
                  style={{ background: `linear-gradient(135deg, ${brown} 0%, #2d1206 100%)` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(245,200,66,0.15)" }}>
                      <Video className="w-6 h-6" style={{ color: gold }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Vai ao vivo agora!</h3>
                      <p className="text-xs text-white/70 mt-0.5">
                        Partilha os teus produtos, faz leilões em directo e aumenta as tuas vendas.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:ml-auto flex-shrink-0">
                    <button
                      onClick={() => navigate("/painel-vendedor")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                      style={{ background: gold, color: brown }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Iniciar live
                    </button>
                    <button
                      onClick={() => navigate("/painel-vendedor")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)" }}
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── SECÇÃO: Próximas lives ── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: sandDark }} />
                  <h2 className="text-base font-black" style={{ color: brown }}>Próximas lives</h2>
                </div>
                {filteredScheduled.length > 5 && (
                  <button className="flex items-center gap-1 text-xs font-bold" style={{ color: sandDark }}>
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredScheduled.length === 0 ? (
                <div className="rounded-2xl py-10 text-center"
                  style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: sandDark, opacity: 0.5 }} />
                  <p className="text-sm font-bold" style={{ color: sandDark }}>
                    Sem próximas lives agendadas
                  </p>
                </div>
              ) : (
                /* Layout 2 colunas em desktop para aproveitar espaço */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 rounded-2xl px-5 py-2"
                  style={{ background: cream, border: `1px solid rgba(74,46,10,0.12)` }}>
                  {filteredScheduled.map((stream: any) => (
                    <ScheduledCard
                      key={stream.id}
                      stream={stream}
                      onRemember={handleRemember}
                      remembered={remembered.has(stream.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Estatísticas / info ── */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { icon: Radio,      label: "Ao vivo agora",     value: liveStreams.length,    color: "#E53935" },
                { icon: Calendar,   label: "Próximas lives",    value: scheduledStreams.length, color: sandDark },
                { icon: Users,      label: "Espectadores total",
                  value: liveStreams.reduce((acc: number, s: any) => acc + (s.viewers_count || 0), 0),
                  color: brown },
                { icon: ShoppingBag, label: "Com leilão activo",
                  value: liveStreams.filter((s: any) => s.linked_auction).length,
                  color: gold },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: cream, border: `1px solid rgba(74,46,10,0.12)` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: brown }}>{stat.value}</p>
                    <p className="text-[10px]" style={{ color: sandDark }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      <Footer />

      {/* ── Modal assistir live ── */}
      {watchStream && (
        <WatchModal stream={watchStream} onClose={() => setWatchStream(null)} />
      )}
    </div>
  );
};

export { LiveBadge, PulseDot };
export default Live;
