import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Footer from "@/components/Footer";
import {
  Radio, Search, SlidersHorizontal, Bell, Play, Eye,
  Calendar, Clock, ChevronRight, Gavel, Video, X,
  Loader2, Users, Zap, Star, ShoppingBag, Upload,
  Image as ImageIcon, CalendarClock, Check, Mic, MicOff,
  VideoOff, PhoneOff, MonitorPlay,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────────────────────────
   AGORA CONFIG
───────────────────────────────────────────── */
const AGORA_APP_ID = "0503d343fd7e416fb8b594e53470cc1e";
// O certificado primário é usado no servidor para gerar tokens.
// No cliente usamos apenas o APP_ID + canal. Para produção,
// gera tokens no backend com o certificado: da7e8c601c3149a4ae9169c350862d49

/* ─────────────────────────────────────────────
   CORES DO PROJECTO
───────────────────────────────────────────── */
const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const gold       = "#f5c842";

/* ─────────────────────────────────────────────
   HOOK: contagem de lives ao vivo
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
   PULSE DOT
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
   LIVE BADGE
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
   UPLOAD DE CAPA — componente reutilizável
───────────────────────────────────────────── */
const CoverUpload = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null, file: File | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem não pode ter mais de 5 MB");
      return;
    }
    const url = URL.createObjectURL(file);
    onChange(url, file);
  };

  return (
    <div className="mb-5">
      <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
        Capa da live
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-all hover:border-solid flex items-center justify-center"
        style={{
          borderColor: value ? sandDark : "rgba(74,46,10,0.25)",
          background: value ? "transparent" : cream,
        }}
      >
        {value ? (
          <>
            <img src={value} alt="Capa" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-bold">Alterar capa</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: brownLight }}>
              <ImageIcon className="w-6 h-6" style={{ color: sandDark }} />
            </div>
            <p className="text-sm font-bold" style={{ color: brown }}>Clique para adicionar uma capa</p>
            <p className="text-[11px]" style={{ color: sandDark }}>JPG, PNG ou WebP · Máx. 5 MB · 16:9 recomendado</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   HOOK — Agora RTC (transmissão ao vivo)
───────────────────────────────────────────── */
const useAgoraStream = () => {
  const clientRef = useRef<any>(null);
  const localTracksRef = useRef<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startStream = async (channel: string, localVideoEl: HTMLElement) => {
    try {
      setError(null);

      // Importa o SDK Agora dinamicamente (deve estar instalado: npm i agora-rtc-sdk-ng)
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;

      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      // Host
      await client.setClientRole("host");

      // Junta-se ao canal — sem token (modo de teste; usa token em produção)
      await client.join(AGORA_APP_ID, channel, null, null);

      // Cria tracks locais de câmara e microfone
      const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTracksRef.current = [micTrack, camTrack];

      // Pré-visualiza localmente
      camTrack.play(localVideoEl);

      // Publica no canal
      await client.publish([micTrack, camTrack]);

      setIsStreaming(true);
      return true;
    } catch (err: any) {
      const msg = err?.message || "Erro ao iniciar a transmissão";
      setError(msg);
      toast.error(`Falha ao iniciar live: ${msg}`);
      return false;
    }
  };

  const stopStream = async () => {
    try {
      localTracksRef.current.forEach((t) => { t.stop(); t.close(); });
      localTracksRef.current = [];
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
    } catch (_) {}
    setIsStreaming(false);
  };

  const toggleMic = async () => {
    const [mic] = localTracksRef.current;
    if (!mic) return;
    await mic.setEnabled(!micOn);
    setMicOn((v) => !v);
  };

  const toggleCam = async () => {
    const [, cam] = localTracksRef.current;
    if (!cam) return;
    await cam.setEnabled(!camOn);
    setCamOn((v) => !v);
  };

  return { startStream, stopStream, toggleMic, toggleCam, isStreaming, micOn, camOn, error };
};

/* ─────────────────────────────────────────────
   MODAL — Iniciar Live agora (com Agora RTC)
───────────────────────────────────────────── */
const GoLiveModal = ({
  onClose,
  auctions,
  products,
}: {
  onClose: () => void;
  auctions: any[];
  products: any[];
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localVideoRef = useRef<HTMLDivElement>(null);
  const { startStream, stopStream, toggleMic, toggleCam, isStreaming, micOn, camOn, error } = useAgoraStream();

  const [coverUrl,   setCoverUrl]   = useState<string | null>(null);
  const [coverFile,  setCoverFile]  = useState<File | null>(null);
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [auctionId,  setAuctionId]  = useState("");
  const [productId,  setProductId]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [streamId,   setStreamId]   = useState<string | null>(null);
  const [step,       setStep]       = useState<"form" | "live">("form");

  // Gera um nome de canal único baseado no user id + timestamp
  const channelName = useRef(`live-${user?.id?.slice(0, 8)}-${Date.now()}`).current;

  const handleGoLive = async () => {
    if (!title.trim()) { toast.error("Adiciona um título à live"); return; }
    if (!coverUrl)     { toast.error("A capa é obrigatória"); return; }

    setLoading(true);
    try {
      let thumbnail_url: string | null = null;

      if (coverFile) {
        const ext  = coverFile.name.split(".").pop();
        const path = `live-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage
          .from("media")
          .upload(path, coverFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = (supabase as any).storage.from("media").getPublicUrl(path);
        thumbnail_url = urlData?.publicUrl ?? null;
      }

      const { data: inserted, error: dbErr } = await (supabase as any)
        .from("live_streams")
        .insert({
          seller_id:          user?.id,
          title:              title.trim(),
          description:        desc.trim() || null,
          thumbnail_url,
          status:             "live",
          viewers_count:      0,
          channel_name:       channelName,
          linked_auction_id:  auctionId  || null,
          linked_product_id:  productId  || null,
        })
        .select("id")
        .single();
      if (dbErr) throw dbErr;

      setStreamId(inserted.id);

      // Inicia o stream Agora
      if (localVideoRef.current) {
        const ok = await startStream(channelName, localVideoRef.current);
        if (!ok) {
          // Reverte o registo se o Agora falhar
          await (supabase as any).from("live_streams").delete().eq("id", inserted.id);
          setLoading(false);
          return;
        }
      }

      qc.invalidateQueries({ queryKey: ["live_streams_active"] });
      qc.invalidateQueries({ queryKey: ["live_active_count"] });
      toast.success("Live iniciada com sucesso! 🎉");
      setStep("live");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar a live");
    } finally {
      setLoading(false);
    }
  };

  const handleEndLive = async () => {
    await stopStream();
    if (streamId) {
      await (supabase as any)
        .from("live_streams")
        .update({ status: "ended" })
        .eq("id", streamId);
    }
    qc.invalidateQueries({ queryKey: ["live_streams_active"] });
    qc.invalidateQueries({ queryKey: ["live_active_count"] });
    toast.info("Live encerrada.");
    onClose();
  };

  /* ── ECRÃ AO VIVO ── */
  if (step === "live") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl bg-black">
          {/* Vídeo local */}
          <div ref={localVideoRef} className="w-full aspect-video bg-gray-900" />

          {/* Badge AO VIVO */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "#E53935" }}>
            <PulseDot color="#fff" />
            <span className="text-[10px] font-black text-white">AO VIVO</span>
          </div>

          {/* Controlos */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 py-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}>
            <button
              onClick={toggleMic}
              className="w-12 h-12 rounded-full flex items-center justify-center transition"
              style={{ background: micOn ? "rgba(255,255,255,0.15)" : "#E53935" }}
            >
              {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={toggleCam}
              className="w-12 h-12 rounded-full flex items-center justify-center transition"
              style={{ background: camOn ? "rgba(255,255,255,0.15)" : "#E53935" }}
            >
              {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
            </button>
            <button
              onClick={handleEndLive}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black text-white"
              style={{ background: "#E53935" }}
            >
              <PhoneOff className="w-4 h-4" /> Terminar live
            </button>
          </div>

          {/* Título no topo */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(0,0,0,0.65)" }}>
            <p className="text-xs font-bold text-white truncate max-w-[200px]">{title}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORMULÁRIO ── */
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(135deg, #E53935 0%, #b71c1c 100%)" }}>
          <div className="flex items-center gap-3">
            <PulseDot color="#fff" />
            <h2 className="text-base font-black text-white">Iniciar live agora</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Aviso Agora */}
          <div className="mb-5 px-4 py-3 rounded-2xl flex items-start gap-3"
            style={{ background: "rgba(229,57,53,0.07)", border: "1px solid rgba(229,57,53,0.20)" }}>
            <MonitorPlay className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#E53935" }} />
            <p className="text-xs" style={{ color: brown }}>
              A transmissão usa <strong>Agora RTC</strong>. O browser irá pedir permissão para a câmara e microfone.
            </p>
          </div>

          {/* Capa */}
          <CoverUpload
            value={coverUrl}
            onChange={(url, file) => { setCoverUrl(url); setCoverFile(file); }}
          />

          {/* Título */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Título <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex: Promoção relâmpago — Tênis Nike Air Max"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }}
            />
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Descrição
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Conta o que vais apresentar nesta live..."
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }}
            />
          </div>

          {/* Vincular leilão */}
          {auctions.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <Gavel className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular leilão (opcional)
              </label>
              <select
                value={auctionId}
                onChange={(e) => setAuctionId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: auctionId ? brown : sandDark }}
              >
                <option value="">— Sem leilão vinculado —</option>
                {auctions.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vincular produto */}
          {products.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <ShoppingBag className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular produto (opcional)
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: productId ? brown : sandDark }}
              >
                <option value="">— Sem produto vinculado —</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name || p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Erro Agora */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-2xl text-xs font-semibold"
              style={{ background: "rgba(229,57,53,0.10)", color: "#E53935", border: "1px solid rgba(229,57,53,0.25)" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleGoLive}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{ background: loading ? "#ccc" : "linear-gradient(135deg, #E53935, #b71c1c)" }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Radio className="w-4 h-4" /> Ir ao vivo agora</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MODAL — Agendar Live (com vídeo e produto)
───────────────────────────────────────────── */
const ScheduleModal = ({
  onClose,
  auctions,
  products,
}: {
  onClose: () => void;
  auctions: any[];
  products: any[];
}) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [coverUrl,   setCoverUrl]   = useState<string | null>(null);
  const [coverFile,  setCoverFile]  = useState<File | null>(null);
  const [videoUrl,   setVideoUrl]   = useState<string | null>(null);
  const [videoFile,  setVideoFile]  = useState<File | null>(null);
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [datetime,   setDatetime]   = useState("");
  const [auctionId,  setAuctionId]  = useState("");
  const [productId,  setProductId]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const minDatetime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error("O vídeo não pode ter mais de 200 MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Adiciona um título"); return; }
    if (!coverUrl)     { toast.error("A capa é obrigatória"); return; }
    if (!datetime)     { toast.error("Escolhe data e hora da live"); return; }
    if (new Date(datetime) <= new Date()) { toast.error("A data deve ser no futuro"); return; }

    setLoading(true);
    try {
      let thumbnail_url: string | null = null;
      let preview_video_url: string | null = null;

      /* Upload capa */
      if (coverFile) {
        const ext  = coverFile.name.split(".").pop();
        const path = `live-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage
          .from("media").upload(path, coverFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = (supabase as any).storage.from("media").getPublicUrl(path);
        thumbnail_url = urlData?.publicUrl ?? null;
      }

      /* Upload vídeo de pré-visualização */
      if (videoFile) {
        const ext  = videoFile.name.split(".").pop();
        const path = `live-previews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: vErr } = await (supabase as any).storage
          .from("media").upload(path, videoFile, { upsert: false });
        if (vErr) throw vErr;
        const { data: vData } = (supabase as any).storage.from("media").getPublicUrl(path);
        preview_video_url = vData?.publicUrl ?? null;
      }

      const { error } = await (supabase as any).from("live_streams").insert({
        seller_id:          user?.id,
        title:              title.trim(),
        description:        desc.trim() || null,
        thumbnail_url,
        preview_video_url,
        status:             "scheduled",
        starts_at:          new Date(datetime).toISOString(),
        viewers_count:      0,
        linked_auction_id:  auctionId || null,
        linked_product_id:  productId || null,
      });
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ["live_streams_scheduled"] });
      setDone(true);
      toast.success("Live agendada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar a live");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl" style={{ background: cream }} onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: brownLight }}>
          <Check className="w-8 h-8" style={{ color: brown }} />
        </div>
        <h3 className="text-lg font-black mb-1" style={{ color: brown }}>Live agendada!</h3>
        <p className="text-sm mb-6" style={{ color: sandDark }}>Os teus seguidores verão a live na secção "Próximas lives".</p>
        <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-black text-white"
          style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
          Fechar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}>
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-white" />
            <h2 className="text-base font-black text-white">Agendar live</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Capa */}
          <CoverUpload
            value={coverUrl}
            onChange={(url, file) => { setCoverUrl(url); setCoverFile(file); }}
          />

          {/* Vídeo de pré-visualização */}
          <div className="mb-5">
            <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
              Vídeo de pré-visualização <span className="text-[10px] font-normal normal-case" style={{ color: sandDark }}>(opcional)</span>
            </label>
            {videoUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: "#000" }}>
                <video src={videoUrl} controls className="w-full max-h-40 object-contain" />
                <button
                  type="button"
                  onClick={() => { setVideoUrl(null); setVideoFile(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.65)" }}
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-solid transition-all"
                style={{ borderColor: "rgba(74,46,10,0.25)", background: cream }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brownLight }}>
                  <Video className="w-5 h-5" style={{ color: sandDark }} />
                </div>
                <p className="text-xs font-bold" style={{ color: brown }}>Carregar vídeo de pré-visualização</p>
                <p className="text-[10px]" style={{ color: sandDark }}>MP4, MOV ou WebM · Máx. 200 MB</p>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleVideoFile}
            />
          </div>

          {/* Título */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Título <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex: Grande leilão de electrónica — Sábado!"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }}
            />
          </div>

          {/* Data e hora */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Data e hora <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={datetime}
              min={minDatetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }}
            />
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Descrição
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="O que vais apresentar?"
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }}
            />
          </div>

          {/* Vincular leilão */}
          {auctions.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <Gavel className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular leilão (opcional)
              </label>
              <select
                value={auctionId}
                onChange={(e) => setAuctionId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: auctionId ? brown : sandDark }}
              >
                <option value="">— Sem leilão vinculado —</option>
                {auctions.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vincular produto */}
          {products.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <ShoppingBag className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular produto (opcional)
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: productId ? brown : sandDark }}
              >
                <option value="">— Sem produto vinculado —</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name || p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{ background: loading ? "#ccc" : `linear-gradient(135deg, ${sandDark}, ${brown})` }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><CalendarClock className="w-4 h-4" /> Confirmar agendamento</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   CARD — Live ao vivo
───────────────────────────────────────────── */
const LiveCard = ({ stream, onClick }: { stream: any; onClick: () => void }) => (
  <div
    onClick={onClick}
    className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex-shrink-0"
    style={{ minWidth: 0 }}
  >
    <div className="relative aspect-video bg-gray-900 overflow-hidden">
      {stream.thumbnail_url ? (
        <img src={stream.thumbnail_url} alt={stream.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a0a00, #3d1f00)" }}>
          <Video className="w-12 h-12 opacity-30 text-white" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: "#E53935" }}>
        <PulseDot color="#fff" />
        <span className="text-[10px] font-black text-white tracking-wider">AO VIVO</span>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg"
        style={{ background: "rgba(0,0,0,0.65)" }}>
        <Eye className="w-3 h-3 text-white" />
        <span className="text-[10px] font-bold text-white">
          {stream.viewers_count >= 1000
            ? `${(stream.viewers_count / 1000).toFixed(1)}k`
            : stream.viewers_count}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
          style={{ background: "rgba(255,255,255,0.92)" }}>
          <Play className="w-6 h-6 ml-1" style={{ color: brown }} />
        </div>
      </div>
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
    <div className="p-3" style={{ background: cream }}>
      <div className="flex items-center gap-2 mb-2">
        {stream.seller?.logo_url ? (
          <img src={stream.seller.logo_url} alt={stream.seller.name}
            className="w-7 h-7 rounded-full object-cover border-2" style={{ borderColor: sand }} />
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
      <h3 className="text-sm font-black line-clamp-2 mb-2" style={{ color: brown }}>{stream.title}</h3>
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
   CARD — Próxima live agendada
───────────────────────────────────────────── */
const ScheduledCard = ({
  stream, onRemember, remembered,
}: { stream: any; onRemember: (id: string) => void; remembered: boolean }) => {
  const date  = stream.starts_at ? new Date(stream.starts_at) : null;
  const day   = date ? String(date.getDate()).padStart(2, "0") : "--";
  const month = date ? date.toLocaleString("pt-AO", { month: "short" }).toUpperCase() : "---";
  const time  = date ? date.toLocaleString("pt-AO", { hour: "2-digit", minute: "2-digit" }) : "--:--";

  return (
    <div className="flex items-stretch gap-3 py-3 border-b last:border-0"
      style={{ borderColor: "rgba(74,46,10,0.12)" }}>
      <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm"
        style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
        <span className="text-lg font-black leading-none" style={{ color: brown }}>{day}</span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: sandDark }}>{month}</span>
      </div>
      <div className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-gray-200">
        {stream.thumbnail_url
          ? <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${cream}, ${sand})` }}>
              <Video className="w-5 h-5" style={{ color: sandDark }} />
            </div>}
      </div>
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
          {/* Produto vinculado */}
          {stream.linked_product && (
            <div className="flex items-center gap-1 mt-0.5">
              <ShoppingBag className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
              <span className="text-[10px] font-semibold truncate" style={{ color: sandDark }}>
                {stream.linked_product?.name || stream.linked_product?.title}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            {stream.seller?.logo_url
              ? <img src={stream.seller.logo_url} alt={stream.seller.name} className="w-4 h-4 rounded-full object-cover" />
              : <div className="w-4 h-4 rounded-full" style={{ background: brownLight }} />}
            <span className="text-[10px] font-semibold" style={{ color: sandDark }}>
              {stream.seller?.name || "Vendedor"}
            </span>
            {stream.seller?.is_verified && <Star className="w-2.5 h-2.5" style={{ color: sandDark }} />}
          </div>
        </div>
      </div>
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
   MODAL — Assistir live (com Agora viewer)
───────────────────────────────────────────── */
const WatchModal = ({ stream, onClose }: { stream: any; onClose: () => void }) => {
  const navigate = useNavigate();
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!stream.channel_name) return;

    const joinAsAudience = async () => {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        clientRef.current = client;

        await client.setClientRole("audience");
        await client.join(AGORA_APP_ID, stream.channel_name, null, null);

        client.on("user-published", async (user: any, mediaType: "audio" | "video") => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        setConnected(true);
      } catch (err) {
        console.error("Erro ao ligar ao stream Agora:", err);
      }
    };

    joinAsAudience();
    return () => {
      clientRef.current?.leave().catch(() => {});
    };
  }, [stream.channel_name]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream }}
        onClick={(e) => e.stopPropagation()}>
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

        {/* Vídeo remoto Agora ou fallback */}
        <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
          {stream.channel_name ? (
            <div ref={remoteVideoRef} className="w-full h-full" />
          ) : stream.stream_url ? (
            <video src={stream.stream_url} controls autoPlay className="w-full h-full" />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(245,200,66,0.15)" }}>
                <Radio className="w-8 h-8" style={{ color: gold }} />
              </div>
              <p className="text-white font-bold text-sm">A transmissão está em curso</p>
              <p className="text-white/50 text-xs mt-1">A ligar ao canal Agora RTC…</p>
            </div>
          )}

          {stream.status === "live" && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: "#E53935" }}>
              <PulseDot color="#fff" />
              <span className="text-[10px] font-black text-white">AO VIVO</span>
              <span className="text-[10px] text-white/80 ml-1">
                <Eye className="w-3 h-3 inline mr-0.5" />{stream.viewers_count}
              </span>
            </div>
          )}

          {!connected && stream.channel_name && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
              style={{ background: "rgba(0,0,0,0.65)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span className="text-[10px] text-white font-semibold">A ligar…</span>
            </div>
          )}
        </div>

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
              <Gavel className="w-3.5 h-3.5" /> Dar lance
            </button>
          </div>
        )}

        {/* Produto vinculado */}
        {stream.linked_product && (
          <div className="px-5 py-3 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${brownLight}, rgba(74,46,10,0.05))` }}>
            {stream.linked_product?.image_url && (
              <img src={stream.linked_product.image_url} alt=""
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <ShoppingBag className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sandDark }}>Produto em destaque</span>
              </div>
              <p className="text-sm font-bold line-clamp-1" style={{ color: brown }}>
                {stream.linked_product?.name || stream.linked_product?.title}
              </p>
              {stream.linked_product?.price && (
                <p className="text-xs font-black" style={{ color: sandDark }}>
                  {Number(stream.linked_product.price).toLocaleString("pt-AO")} Kz
                </p>
              )}
            </div>
            <button
              onClick={() => { onClose(); navigate(`/produto/${stream.linked_product?.id}`); }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Ver produto
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
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const { isAdmin } = useUserRole();

  const { data: isSellerData = false } = useQuery({
    queryKey: ["is_seller", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const canPublish = isSellerData || isAdmin;

  const [searchQuery,    setSearchQuery]    = useState("");
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [watchStream,    setWatchStream]    = useState<any>(null);
  const [remembered,     setRemembered]     = useState<Set<string>>(new Set());
  const [showGoLive,     setShowGoLive]     = useState(false);
  const [showSchedule,   setShowSchedule]   = useState(false);

  /* Fetch lives ao vivo */
  const { data: liveStreams = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live_streams_active"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id,name,logo_url,is_verified),
          linked_auction:auctions(id,title,current_price,image_url,status),
          linked_product:products(id,name,title,price,image_url)
        `)
        .eq("status", "live")
        .order("viewers_count", { ascending: false });
      return data || [];
    },
    refetchInterval: 10000,
  });

  /* Fetch próximas lives */
  const { data: scheduledStreams = [], isLoading: loadingScheduled } = useQuery({
    queryKey: ["live_streams_scheduled"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id,name,logo_url,is_verified),
          linked_product:products(id,name,title,price,image_url)
        `)
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      return data || [];
    },
    refetchInterval: 30000,
  });

  /* Fetch leilões activos do vendedor */
  const { data: myAuctions = [] } = useQuery({
    queryKey: ["my_auctions_active", user?.id],
    queryFn: async () => {
      if (!canPublish || !user?.id) return [];
      const { data } = await (supabase as any)
        .from("auctions")
        .select("id, title")
        .eq("seller_id", user.id)
        .eq("status", "active");
      return data || [];
    },
    enabled: canPublish && !!user?.id,
  });

  /* Fetch produtos activos do vendedor */
  const { data: myProducts = [] } = useQuery({
    queryKey: ["my_products_active", user?.id],
    queryFn: async () => {
      if (!canPublish || !user?.id) return [];
      // Tenta primeiro pela tabela "products", depois "listings" se não houver dados
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name, title")
        .eq("seller_id", user.id)
        .eq("status", "active")
        .limit(50);
      return data || [];
    },
    enabled: canPublish && !!user?.id,
  });

  /* Realtime */
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

      {/* ══ HEADER ══ */}
      <div className="sticky top-0 z-40" style={{
        background: `linear-gradient(160deg, ${cream} 0%, ${sand} 60%, #C9A87C 100%)`,
        borderBottom: `1px solid rgba(74,46,10,0.15)`,
        boxShadow: "0 2px 16px rgba(74,46,10,0.12)",
      }}>
        {/* Desktop */}
        <div className="hidden md:block max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
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
            <div className="flex-1 flex items-center rounded-2xl overflow-hidden ml-4"
              style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.12)" }}>
              <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar lives, produtos ou vendedores..."
                className="flex-1 py-2.5 px-3 text-sm bg-transparent focus:outline-none" style={{ color: brown }} />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="mr-2">
                  <X className="w-4 h-4" style={{ color: sandDark }} />
                </button>
              )}
            </div>

            {canPublish && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGoLive(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white transition active:scale-95"
                  style={{ background: "linear-gradient(135deg, #E53935, #b71c1c)" }}
                >
                  <Radio className="w-4 h-4" /> Iniciar live
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition"
                  style={{ background: "white", border: `1px solid rgba(74,46,10,0.20)`, color: brown }}
                >
                  <CalendarClock className="w-4 h-4" /> Agendar
                </button>
              </div>
            )}

            <button
              onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: filterOpen ? brown : "white",
                color: filterOpen ? "white" : brown,
                border: `1px solid rgba(74,46,10,0.20)`,
              }}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center justify-between gap-2">
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
            {canPublish && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGoLive(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                  style={{ background: "#E53935" }}
                >
                  <Radio className="w-3.5 h-3.5" /> Live
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: "white", border: `1px solid rgba(74,46,10,0.20)`, color: brown }}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center rounded-xl overflow-hidden"
            style={{ background: "#fff", boxShadow: "0 1px 4px rgba(74,46,10,0.10)" }}>
            <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lives, produtos ou vendedores..."
              className="flex-1 py-2 px-2.5 text-sm bg-transparent focus:outline-none" style={{ color: brown }} />
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
            {/* Secção: Ao vivo agora */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
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
                  <button className="flex items-center gap-1 text-xs font-bold" style={{ color: sandDark }}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLive.map((stream: any) => (
                    <LiveCard key={stream.id} stream={stream} onClick={() => setWatchStream(stream)} />
                  ))}
                </div>
              )}
            </section>

            {/* Banner CTA — APENAS vendedores/admins */}
            {canPublish && (
              <section className="mb-8">
                <div className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
                  style={{ background: `linear-gradient(135deg, ${brown} 0%, #2d1206 100%)` }}>
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
                      onClick={() => setShowGoLive(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                      style={{ background: gold, color: brown }}
                    >
                      <Zap className="w-3.5 h-3.5" /> Iniciar live
                    </button>
                    <button
                      onClick={() => setShowSchedule(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)" }}
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Secção: Próximas lives */}
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
                  <p className="text-sm font-bold" style={{ color: sandDark }}>Sem próximas lives agendadas</p>
                </div>
              ) : (
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

            {/* Estatísticas */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { icon: Radio,       label: "Ao vivo agora",      value: liveStreams.length,    color: "#E53935" },
                { icon: Calendar,    label: "Próximas lives",     value: scheduledStreams.length, color: sandDark },
                { icon: Users,       label: "Espectadores total",
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

      {/* Modais */}
      {watchStream  && <WatchModal stream={watchStream} onClose={() => setWatchStream(null)} />}
      {showGoLive   && canPublish && (
        <GoLiveModal
          onClose={() => setShowGoLive(false)}
          auctions={myAuctions}
          products={myProducts}
        />
      )}
      {showSchedule && canPublish && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          auctions={myAuctions}
          products={myProducts}
        />
      )}
    </div>
  );
};

export { LiveBadge, PulseDot };
export default Live;
