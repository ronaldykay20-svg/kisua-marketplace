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
  Image as ImageIcon, CalendarClock, Check, VideoOff,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────────────────────────
   STORAGE BUCKET
───────────────────────────────────────────── */
const STORAGE_BUCKET = "media";

/* ─────────────────────────────────────────────
   CORES
───────────────────────────────────────────── */
const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const gold       = "#f5c842";

/* ─────────────────────────────────────────────
   CONSTANTE — duração máxima do vídeo (segundos)
───────────────────────────────────────────── */
const MAX_VIDEO_SECONDS = 10 * 60; // 10 minutos

/* ─────────────────────────────────────────────
   HOOK — contagem de lives ao vivo
   Exportado para usar no Navbar
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
   HELPERS — expiração de vídeo (7 dias após starts_at)
───────────────────────────────────────────── */
const VIDEO_EXPIRY_DAYS = 7;

/** true se o vídeo ainda não expirou — permite "ended" com vídeo */
const videoStillAvailable = (stream: any): boolean => {
  if (!stream.preview_video_url) return false;
  const base = stream.starts_at ?? stream.created_at;
  if (!base) return true;
  const expiry = new Date(base);
  expiry.setDate(expiry.getDate() + VIDEO_EXPIRY_DAYS);
  return new Date() < expiry;
};

/** label legível do tempo restante, ex: "Expira em 3 dias" */
const expiryLabel = (stream: any): string | null => {
  const base = stream.starts_at ?? stream.created_at;
  if (!base) return null;
  const expiry = new Date(base);
  expiry.setDate(expiry.getDate() + VIDEO_EXPIRY_DAYS);
  const diffMs = expiry.getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 24) return `Expira em ${diffH}h`;
  return `Expira em ${Math.floor(diffH / 24)} dia${Math.floor(diffH / 24) !== 1 ? "s" : ""}`;
};

/* ─────────────────────────────────────────────
   PULSE DOT animado
───────────────────────────────────────────── */
const PulseDot = ({ color = "#E53935" }: { color?: string }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{ background: color, animation: "livePulse 1.4s ease-in-out infinite" }}
  />
);

/* ─────────────────────────────────────────────
   LIVE BADGE — exportado para Navbar
───────────────────────────────────────────── */
export const LiveBadge = ({ count }: { count: number }) =>
  count > 0 ? (
    <span
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
      style={{ background: "#E53935" }}
    >
      {count > 9 ? "9+" : count}
    </span>
  ) : null;

/* ─────────────────────────────────────────────
   UPLOAD DE CAPA
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
    onChange(URL.createObjectURL(file), file);
  };

  return (
    <div className="mb-5">
      <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
        Capa da live
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-all hover:border-solid flex items-center justify-center"
        style={{ borderColor: value ? sandDark : "rgba(74,46,10,0.25)", background: value ? "transparent" : cream }}
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: brownLight }}>
              <ImageIcon className="w-6 h-6" style={{ color: sandDark }} />
            </div>
            <p className="text-sm font-bold" style={{ color: brown }}>Clique para adicionar uma capa</p>
            <p className="text-[11px]" style={{ color: sandDark }}>JPG, PNG ou WebP · Máx. 5 MB · 16:9 recomendado</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
};

/* ─────────────────────────────────────────────
   HELPER — valida duração do vídeo
   Retorna a duração em segundos (ou lança erro)
───────────────────────────────────────────── */
const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo"));
    };
    video.src = url;
  });

/* ─────────────────────────────────────────────
   MODAL — Agendar Live
───────────────────────────────────────────── */
const ScheduleModal = ({
  onClose, auctions, products, sellerId,
}: {
  onClose: () => void;
  auctions: any[];
  products: any[];
  sellerId: string | null;
}) => {
  const qc = useQueryClient();
  const [coverUrl,       setCoverUrl]       = useState<string | null>(null);
  const [coverFile,      setCoverFile]      = useState<File | null>(null);
  const [videoUrl,       setVideoUrl]       = useState<string | null>(null);
  const [videoFile,      setVideoFile]      = useState<File | null>(null);
  const [videoDuration,  setVideoDuration]  = useState<number | null>(null);
  const [title,          setTitle]          = useState("");
  const [desc,           setDesc]           = useState("");
  const [datetime,       setDatetime]       = useState("");
  const [auctionId,      setAuctionId]      = useState("");
  const [productId,      setProductId]      = useState("");
  const [loading,        setLoading]        = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [done,           setDone]           = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const minDatetime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      toast.error("O vídeo não pode ter mais de 500 MB");
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_SECONDS) {
        toast.error(
          `O vídeo tem ${formatDuration(duration)} — o limite é 10 minutos. Por favor, usa um vídeo mais curto.`,
          { duration: 5000 }
        );
        if (videoInputRef.current) videoInputRef.current.value = "";
        return;
      }
      setVideoDuration(duration);
    } catch {
      toast.error("Não foi possível verificar a duração do vídeo. Tenta outro ficheiro.");
      return;
    }

    setVideoUrl(URL.createObjectURL(file));
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Adiciona um título"); return; }
    if (!coverUrl)     { toast.error("A capa é obrigatória"); return; }
    if (!datetime)     { toast.error("Escolhe data e hora da live"); return; }
    if (new Date(datetime) <= new Date()) { toast.error("A data deve ser no futuro"); return; }
    if (!sellerId)     { toast.error("Não foi encontrado um vendedor associado à tua conta"); return; }

    setLoading(true);
    try {
      let thumbnail_url: string | null = null;
      let preview_video_url: string | null = null;

      if (coverFile) {
        setUploadProgress("A carregar capa…");
        const ext  = coverFile.name.split(".").pop();
        const path = `live-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage
          .from(STORAGE_BUCKET).upload(path, coverFile, { upsert: false });
        if (upErr) throw new Error(`Upload capa: ${upErr.message}`);
        const { data: urlData } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        thumbnail_url = urlData?.publicUrl ?? null;
      }

      if (videoFile) {
        setUploadProgress(`A carregar vídeo (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)…`);
        const ext  = videoFile.name.split(".").pop();
        const path = `live-previews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: vErr } = await (supabase as any).storage
          .from(STORAGE_BUCKET).upload(path, videoFile, { upsert: false });
        if (vErr) throw new Error(`Upload vídeo: ${vErr.message}`);
        const { data: vData } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        preview_video_url = vData?.publicUrl ?? null;
      }

      setUploadProgress("A publicar lançamento…");

      const startsAt = new Date(datetime);
      const videoExpiresAt = new Date(startsAt);
      videoExpiresAt.setDate(videoExpiresAt.getDate() + VIDEO_EXPIRY_DAYS);

      const { error, data: insertedData } = await (supabase as any).from("live_streams").insert({
        seller_id:         sellerId,
        title:             title.trim(),
        description:       desc.trim() || null,
        thumbnail_url,
        preview_video_url,
        status:            "scheduled",
        starts_at:         startsAt.toISOString(),
        video_expires_at:  preview_video_url ? videoExpiresAt.toISOString() : null,
        viewers_count:     0,
        linked_auction_id: auctionId || null,
        linked_product_id: productId || null,
      }).select();

      if (error) throw new Error(error.message);

      console.log("✅ INSERT resultado:", insertedData);

      // Verificação directa após insert — confirma que o registo existe na BD
      const { data: checkData, error: checkErr } = await (supabase as any)
        .from("live_streams")
        .select("id, status, title, seller_id")
        .order("created_at", { ascending: false })
        .limit(5);
      console.log("🔍 CHECK após insert:", checkData, "erro:", checkErr);

      // FIX: Invalidar TODAS as queries relevantes para forçar refetch imediato
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["live_streams_scheduled"] }),
        qc.invalidateQueries({ queryKey: ["live_streams_active"] }),
        qc.invalidateQueries({ queryKey: ["live_streams_ended"] }),
        qc.invalidateQueries({ queryKey: ["live_active_count"] }),
      ]);

      setUploadProgress(null);
      setDone(true);
      toast.success("Lançamento publicado!");
    } catch (err: any) {
      setUploadProgress(null);
      toast.error(err.message || "Erro ao publicar o lançamento");
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
        <h3 className="text-lg font-black mb-1" style={{ color: brown }}>Lançamento publicado!</h3>
        <p className="text-sm mb-2" style={{ color: sandDark }}>O vídeo já está disponível para todos assistirem.</p>
        <p className="text-xs mb-6" style={{ color: sandDark, opacity: 0.75 }}>
          Ficará visível durante 7 dias a contar da data do lançamento.
        </p>
        <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-black text-white"
          style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
          Fechar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}>
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-white" />
            <h2 className="text-base font-black text-white">Criar lançamento</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="px-6 py-5">
          <CoverUpload value={coverUrl} onChange={(url, file) => { setCoverUrl(url); setCoverFile(file); }} />

          <div className="mb-5">
            <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
              Vídeo de pré-visualização{" "}
              <span className="text-[10px] font-normal normal-case" style={{ color: sandDark }}>(opcional · máx. 10 min)</span>
            </label>

            <div className="mb-3 px-3 py-2.5 rounded-xl flex items-start gap-2"
              style={{ background: "rgba(74,46,10,0.07)", border: "1px solid rgba(74,46,10,0.15)" }}>
              <VideoOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: sandDark }} />
              <p className="text-[11px]" style={{ color: brown }}>
                Este vídeo será exibido enquanto a live estiver agendada e também após terminar.
                <strong> Ficará disponível durante 7 dias a contar da data do lançamento.</strong>
              </p>
            </div>

            {videoUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ background: "#000" }}>
                <video src={videoUrl} controls className="w-full max-h-44 object-contain" />
                <button type="button" onClick={() => { setVideoUrl(null); setVideoFile(null); setVideoDuration(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {videoFile && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white"
                      style={{ background: "rgba(0,0,0,0.65)" }}>
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    {videoDuration !== null && (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white"
                        style={{ background: "rgba(0,0,0,0.65)" }}>
                        {formatDuration(videoDuration)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div onClick={() => videoInputRef.current?.click()}
                className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-solid transition-all"
                style={{ borderColor: "rgba(74,46,10,0.25)", background: cream }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brownLight }}>
                  <Video className="w-5 h-5" style={{ color: sandDark }} />
                </div>
                <p className="text-xs font-bold" style={{ color: brown }}>Carregar vídeo de pré-visualização</p>
                <p className="text-[10px]" style={{ color: sandDark }}>MP4, MOV ou WebM · Máx. 10 minutos · Máx. 500 MB</p>
              </div>
            )}
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm"
              className="hidden" onChange={handleVideoFile} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Título <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
              placeholder="Ex: Grande leilão de electrónica — Sábado!"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Data e hora <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="datetime-local" value={datetime} min={minDatetime}
              onChange={(e) => setDatetime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>Descrição</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={300}
              placeholder="O que vais apresentar?"
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
              style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: brown }} />
          </div>

          {auctions.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <Gavel className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular leilão <span className="font-normal normal-case text-[10px]" style={{ color: sandDark }}>(opcional)</span>
              </label>
              <select value={auctionId} onChange={(e) => setAuctionId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: auctionId ? brown : sandDark }}>
                <option value="">— Sem leilão vinculado —</option>
                {auctions.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          )}

          {products.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
                <ShoppingBag className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                Vincular produto <span className="font-normal normal-case text-[10px]" style={{ color: sandDark }}>(opcional)</span>
              </label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none appearance-none"
                style={{ background: "#fff", border: `1.5px solid rgba(74,46,10,0.18)`, color: productId ? brown : sandDark }}>
                <option value="">— Sem produto vinculado —</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !sellerId}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{ background: (loading || !sellerId) ? "#ccc" : `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress || "A guardar…"}</>
              : <><CalendarClock className="w-4 h-4" /> Publicar lançamento</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   CARD — Live ao vivo (status "live" da BD)
───────────────────────────────────────────── */
const LiveCard = ({ stream, onClick }: { stream: any; onClick: () => void }) => (
  <div onClick={onClick}
    className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
    style={{ minWidth: 0 }}>
    <div className="relative aspect-video bg-gray-900 overflow-hidden">
      {stream.thumbnail_url
        ? <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00)" }}>
            <Video className="w-12 h-12 opacity-30 text-white" />
          </div>}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "#E53935" }}>
        <PulseDot color="#fff" />
        <span className="text-[10px] font-black text-white tracking-wider">AO VIVO</span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.65)" }}>
        <Eye className="w-3 h-3 text-white" />
        <span className="text-[10px] font-bold text-white">
          {stream.viewers_count >= 1000 ? `${(stream.viewers_count / 1000).toFixed(1)}k` : stream.viewers_count}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl" style={{ background: "rgba(255,255,255,0.92)" }}>
          <Play className="w-6 h-6 ml-1" style={{ color: brown }} />
        </div>
      </div>

      {stream.linked_auction && (
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,0.85),transparent)" }}>
          <Gavel className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gold }} />
          <span className="text-[10px] font-bold text-white line-clamp-1">{stream.linked_auction.title}</span>
          <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
            style={{ background: gold, color: "#1a0a00" }}>
            {Number(stream.linked_auction.current_bid).toLocaleString("pt-AO")} Kz
          </span>
        </div>
      )}
    </div>

    <div className="p-3" style={{ background: cream }}>
      <div className="flex items-center gap-2 mb-2">
        {stream.seller?.logo_url
          ? <img src={stream.seller.logo_url} alt="" className="w-7 h-7 rounded-full object-cover border-2" style={{ borderColor: sand }} />
          : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: brownLight, color: brown }}>
              {(stream.seller?.name || "?").charAt(0).toUpperCase()}
            </div>}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-bold truncate" style={{ color: brown }}>{stream.seller?.name || "Vendedor"}</span>
          {stream.seller?.is_verified && <Star className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />}
        </div>
      </div>
      <h3 className="text-sm font-black line-clamp-2 mb-2" style={{ color: brown }}>{stream.title}</h3>
      <button onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="w-full py-2 rounded-xl text-xs font-black text-white transition active:scale-95"
        style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
        ▶ Assistir agora
      </button>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   CARD — Próxima live agendada
───────────────────────────────────────────── */
const ScheduledCard = ({
  stream, onRemember, remembered, onClick,
}: { stream: any; onRemember: (id: string) => void; remembered: boolean; onClick: () => void }) => {
  const date       = stream.starts_at ? new Date(stream.starts_at) : null;
  const day        = date ? String(date.getDate()).padStart(2, "0") : "--";
  const month      = date ? date.toLocaleString("pt-AO", { month: "short" }).toUpperCase() : "---";
  const time       = date ? date.toLocaleString("pt-AO", { hour: "2-digit", minute: "2-digit" }) : "Hora a definir";
  const hasVideo   = videoStillAvailable(stream);
  const expiry     = hasVideo ? expiryLabel(stream) : null;

  return (
    <div className="flex items-stretch gap-3 py-3 border-b last:border-0" style={{ borderColor: "rgba(74,46,10,0.12)" }}>
      <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm"
        style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
        <span className="text-lg font-black leading-none" style={{ color: brown }}>{day}</span>
        <span className="text-[9px] font-bold tracking-widest" style={{ color: sandDark }}>{month}</span>
      </div>
      <div
        className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden relative ${hasVideo ? "cursor-pointer group" : ""}`}
        onClick={hasVideo ? onClick : undefined}>
        {stream.thumbnail_url
          ? <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg,${cream},${sand})` }}>
              <Video className="w-5 h-5" style={{ color: sandDark }} />
            </div>}
        {hasVideo && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1 flex-wrap">
          <Clock className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
          <span className="text-[11px] font-bold" style={{ color: sandDark }}>{time}</span>
          {hasVideo && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black"
              style={{ background: "rgba(74,46,10,0.10)", color: brown }}>
              ▶ COM VÍDEO
            </span>
          )}
          {expiry && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: "rgba(245,200,66,0.20)", color: "#7a5500" }}>
              ⏱ {expiry}
            </span>
          )}
        </div>
        <h3
          className={`text-sm font-black line-clamp-1 ${hasVideo ? "cursor-pointer hover:underline" : ""}`}
          style={{ color: brown }}
          onClick={hasVideo ? onClick : undefined}>
          {stream.title}
        </h3>
        {stream.description && <p className="text-[11px] line-clamp-1" style={{ color: sandDark }}>{stream.description}</p>}
        <div className="flex items-center gap-1 mt-0.5">
          {stream.seller?.logo_url
            ? <img src={stream.seller.logo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
            : <div className="w-4 h-4 rounded-full" style={{ background: brownLight }} />}
          <span className="text-[10px] font-semibold" style={{ color: sandDark }}>{stream.seller?.name || "Vendedor"}</span>
          {stream.seller?.is_verified && <Star className="w-2.5 h-2.5" style={{ color: sandDark }} />}
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end justify-center gap-1.5">
        {hasVideo && (
          <button onClick={onClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black text-white transition active:scale-95"
            style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
            <Play className="w-3 h-3" /> Ver
          </button>
        )}
        <button onClick={() => onRemember(stream.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
          style={{
            background: remembered ? brownLight : "white",
            border: `1px solid ${remembered ? sandDark : "rgba(74,46,10,0.20)"}`,
            color: remembered ? brown : sandDark,
          }}>
          <Bell className="w-3 h-3" />
          {remembered ? "✓" : "Lembrar"}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   CARD — Live terminada — agora clicável se tiver vídeo
───────────────────────────────────────────── */
const EndedCard = ({ stream, onClick }: { stream: any; onClick: () => void }) => {
  const hasVideo = videoStillAvailable(stream);
  return (
    <div
      onClick={hasVideo ? onClick : undefined}
      className={`rounded-2xl overflow-hidden border bg-card transition-all duration-200 ${hasVideo ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : ""}`}
      style={{ borderColor: "rgba(74,46,10,0.12)", opacity: hasVideo ? 1 : 0.75 }}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        {stream.thumbnail_url
          ? <img src={stream.thumbnail_url} alt={stream.title} className={`w-full h-full object-cover ${hasVideo ? "" : "grayscale"}`} loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00)" }}>
              <Video className="w-8 h-8 opacity-20 text-white" />
            </div>}

        {hasVideo && (
          <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.90)" }}>
              <Play className="w-5 h-5 ml-0.5" style={{ color: brown }} />
            </div>
          </div>
        )}

        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-black text-white"
          style={{ background: hasVideo ? "rgba(74,46,10,0.80)" : "rgba(60,60,60,0.85)" }}>
          {hasVideo ? "▶ VER VÍDEO" : "TERMINADA"}
        </span>
      </div>
      <div className="p-3" style={{ background: cream }}>
        <div className="flex items-center gap-1.5 mb-1">
          {stream.seller?.logo_url
            ? <img src={stream.seller.logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            : <div className="w-5 h-5 rounded-full" style={{ background: brownLight }} />}
          <span className="text-[10px] font-semibold" style={{ color: sandDark }}>{stream.seller?.name || "Vendedor"}</span>
        </div>
        <h3 className="text-xs font-black line-clamp-2" style={{ color: brown }}>{stream.title}</h3>
        {stream.ended_at && (
          <p className="text-[10px] mt-1" style={{ color: sandDark }}>
            {new Date(stream.ended_at).toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MODAL — Assistir live / lançamento / terminada
───────────────────────────────────────────── */
const WatchModal = ({ stream, onClose }: { stream: any; onClose: () => void }) => {
  const navigate = useNavigate();

  const isLive       = stream.status === "live";
  const isEnded      = stream.status === "ended";
  const hasVideo     = videoStillAvailable(stream);
  const videoExpired = !!stream.preview_video_url && !hasVideo;
  const expiry       = hasVideo ? expiryLabel(stream) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl" style={{ background: cream }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(135deg,${cream},${sand})` }}>
          <div className="flex items-center gap-3">
            {stream.seller?.logo_url
              ? <img src={stream.seller.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: sandDark }} />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: brownLight, color: brown }}>
                  {(stream.seller?.name || "?").charAt(0)}
                </div>}
            <div>
              <p className="text-xs font-bold" style={{ color: sandDark }}>{stream.seller?.name}</p>
              <h2 className="text-sm font-black" style={{ color: brown }}>{stream.title}</h2>
              {expiry && (
                <p className="text-[10px] mt-0.5" style={{ color: sandDark }}>⏱ {expiry}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: brownLight }}>
            <X className="w-4 h-4" style={{ color: brown }} />
          </button>
        </div>

        <div className="relative bg-gray-900 flex items-center justify-center" style={{ aspectRatio: "16/9" }}>

          {/* 1 — Vídeo disponível (scheduled ou ended com vídeo dentro dos 7 dias) */}
          {hasVideo && !isLive && (
            <video src={stream.preview_video_url} controls autoPlay className="w-full h-full" />
          )}

          {/* 2 — Live ao vivo com URL */}
          {isLive && stream.stream_url && !stream.channel_name && (
            <video src={stream.stream_url} controls autoPlay className="w-full h-full" />
          )}

          {/* 3 — Live ao vivo sem URL */}
          {isLive && !stream.stream_url && (
            <div className="text-center px-6">
              <Radio className="w-10 h-10 mx-auto mb-2" style={{ color: gold }} />
              <p className="text-white font-bold text-sm">Transmissão em curso</p>
              <p className="text-white/50 text-xs mt-1">Utiliza a aplicação oficial para assistir</p>
            </div>
          )}

          {/* 4 — Lançamento agendado sem vídeo */}
          {!isLive && !isEnded && !hasVideo && !videoExpired && (
            <div className="text-center px-6">
              {stream.thumbnail_url && (
                <img src={stream.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <CalendarClock className="w-12 h-12 text-white/70" />
                <p className="text-white font-bold text-sm">Lançamento agendado</p>
                {stream.starts_at && (
                  <p className="text-white/60 text-xs">
                    {new Date(stream.starts_at).toLocaleString("pt-AO", {
                      weekday: "long", day: "2-digit", month: "long",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 5 — Vídeo expirou (7 dias passados) */}
          {videoExpired && (
            <div className="text-center px-6">
              {stream.thumbnail_url && (
                <img src={stream.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <VideoOff className="w-10 h-10 text-white/50" />
                <p className="text-white/70 font-bold text-sm">Lançamento expirado</p>
                <p className="text-white/40 text-xs">Este vídeo já não está disponível.</p>
              </div>
            </div>
          )}

          {/* 6 — Live encerrada sem vídeo (nunca teve preview ou já expirou) */}
          {isEnded && !hasVideo && !videoExpired && (
            <div className="text-center px-6 flex flex-col items-center gap-3">
              {stream.thumbnail_url && (
                <img src={stream.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <VideoOff className="w-10 h-10 text-white/50" />
                <p className="text-white/70 font-bold text-sm">Esta live já terminou</p>
                <p className="text-white/40 text-xs">Não existe vídeo disponível.</p>
              </div>
            </div>
          )}

          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "#E53935" }}>
              <PulseDot color="#fff" />
              <span className="text-[10px] font-black text-white">AO VIVO</span>
              <Eye className="w-3 h-3 text-white/80 ml-1" />
              <span className="text-[10px] text-white/80">{stream.viewers_count}</span>
            </div>
          )}
        </div>

        {stream.linked_auction && (
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00)" }}>
            {stream.linked_auction.image_url && (
              <img src={stream.linked_auction.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Gavel className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gold }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: gold }}>Leilão em curso</span>
              </div>
              <p className="text-sm font-bold text-white line-clamp-1">{stream.linked_auction.title}</p>
              <p className="text-xs font-black" style={{ color: gold }}>
                Lance actual: {Number(stream.linked_auction.current_bid).toLocaleString("pt-AO")} Kz
              </p>
            </div>
            <button onClick={() => { onClose(); navigate("/leilao"); }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
              <Gavel className="w-3.5 h-3.5" /> Dar lance
            </button>
          </div>
        )}

        {stream.linked_product && (
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: `linear-gradient(135deg,${brownLight},rgba(74,46,10,0.05))` }}>
            {stream.linked_product.image_url && (
              <img src={stream.linked_product.image_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <ShoppingBag className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sandDark }}>Produto em destaque</span>
              </div>
              <p className="text-sm font-bold line-clamp-1" style={{ color: brown }}>{stream.linked_product.title}</p>
              {stream.linked_product.price && (
                <p className="text-xs font-black" style={{ color: sandDark }}>
                  {Number(stream.linked_product.price).toLocaleString("pt-AO")} Kz
                </p>
              )}
            </div>
            <button onClick={() => { onClose(); navigate(`/produto/${stream.linked_product.id}`); }}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
              style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
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
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const { isAdmin } = useUserRole();

  const { data: sellerData } = useQuery({
    queryKey: ["my_seller_id", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sellers").select("id").eq("user_id", user!.id).maybeSingle();
      return data ?? null;
    },
    enabled: !!user,
  });
  const sellerId = sellerData?.id ?? null;

  const { data: isSeller = false } = useQuery({
    queryKey: ["is_seller", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sellers").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
  const canPublish = isSeller || isAdmin;

  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [watchStream,  setWatchStream]  = useState<any>(null);
  const [remembered,   setRemembered]   = useState<Set<string>>(new Set());
  const [showSchedule, setShowSchedule] = useState(false);

  /* ── Lives ao vivo ── */
  const { data: liveStreams = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live_streams_active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified),
          linked_auction:auctions(id, title, current_bid, image_url, status),
          linked_product:products(id, title, price, image_url)
        `)
        .eq("status", "live")
        .order("viewers_count", { ascending: false });
      if (error) console.error("live_streams_active:", error.message);
      return data || [];
    },
    refetchInterval: 10000,
  });

  /* ── Lançamentos agendados ── */
  const { data: scheduledStreams = [], isLoading: loadingScheduled } = useQuery({
    queryKey: ["live_streams_scheduled"],
    queryFn: async () => {
      // DEBUG: primeiro verifica quantos registos existem SEM filtros
      const { data: allRaw, error: allErr } = await (supabase as any)
        .from("live_streams")
        .select("id, status, title, seller_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      console.log("🔍 DEBUG — todos os live_streams (sem filtro):", allRaw, "erro:", allErr);

      // Query real com filtro de status
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified),
          linked_auction:auctions(id, title, current_bid, image_url, status),
          linked_product:products(id, title, price, image_url)
        `)
        .eq("status", "scheduled")
        .order("created_at", { ascending: false })
        .limit(50);
      console.log("🔍 DEBUG — scheduled streams:", data, "erro:", error);
      if (error) console.error("live_streams_scheduled:", error.message);
      return data || [];
    },
    refetchInterval: 30000,
    staleTime: 0,
  });

  /* ── Lives terminadas ──
     FIX: query separada e limpa — só busca status "ended",
     sem misturar com scheduled. Lives scheduled com data passada
     devem ser tratadas na lógica da app ou via trigger na BD.
  ── */
  const { data: endedStreams = [], isLoading: loadingEnded } = useQuery({
    queryKey: ["live_streams_ended"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("live_streams")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified),
          linked_auction:auctions(id, title, current_bid, image_url, status),
          linked_product:products(id, title, price, image_url)
        `)
        .eq("status", "ended")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) console.error("live_streams_ended:", error.message);
      return data || [];
    },
    refetchInterval: 60000,
    staleTime: 0,
  });

  const { data: myAuctions = [] } = useQuery({
    queryKey: ["my_auctions_active", sellerId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auctions").select("id, title").eq("seller_id", sellerId).eq("status", "active");
      return data || [];
    },
    enabled: canPublish && !!sellerId,
  });

  const { data: myProducts = [] } = useQuery({
    queryKey: ["my_products_active", sellerId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products").select("id, title").eq("seller_id", sellerId).eq("is_active", true).limit(50);
      return data || [];
    },
    enabled: canPublish && !!sellerId,
  });

  /* ── Realtime ── */
  useEffect(() => {
    const ch = (supabase as any)
      .channel("live_page_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        qc.invalidateQueries({ queryKey: ["live_streams_active"] });
        qc.invalidateQueries({ queryKey: ["live_streams_scheduled"] });
        qc.invalidateQueries({ queryKey: ["live_streams_ended"] });
        qc.invalidateQueries({ queryKey: ["live_active_count"] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
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

  const q = searchQuery.toLowerCase();
  const filteredLive      = liveStreams.filter((s: any) => !q || s.title?.toLowerCase().includes(q) || s.seller?.name?.toLowerCase().includes(q));
  const filteredScheduled = scheduledStreams.filter((s: any) => !q || s.title?.toLowerCase().includes(q) || s.seller?.name?.toLowerCase().includes(q));

  const isLoading = loadingLive || loadingScheduled || loadingEnded;

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0" }}>
      <style>{`
        @keyframes livePulse {
          0%,100% { box-shadow: 0 0 0 0 currentColor; opacity:1; }
          50%      { box-shadow: 0 0 0 6px transparent; opacity:0.7; }
        }
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="sticky top-0 z-40" style={{
        background: `linear-gradient(160deg,${cream} 0%,${sand} 60%,#C9A87C 100%)`,
        borderBottom: `1px solid rgba(74,46,10,0.15)`,
        boxShadow: "0 2px 16px rgba(74,46,10,0.12)",
      }}>
        <div className="hidden md:block max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(229,57,53,0.12)", border: "1px solid rgba(229,57,53,0.25)" }}>
                <Radio className="w-5 h-5" style={{ color: "#E53935" }} />
              </div>
              <div>
                <h1 className="text-xl font-black" style={{ color: brown }}>Live</h1>
                <p className="text-xs" style={{ color: sandDark }}>Assista, interaja e aproveite ofertas exclusivas em tempo real.</p>
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
              <button onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white transition active:scale-95"
                style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
                <CalendarClock className="w-4 h-4" /> Criar lançamento
              </button>
            )}

            <button onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: filterOpen ? brown : "white", color: filterOpen ? "white" : brown, border: `1px solid rgba(74,46,10,0.20)` }}>
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5" style={{ color: "#E53935" }} />
              <h1 className="text-base font-black" style={{ color: brown }}>Live</h1>
              {liveStreams.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: "#E53935" }}>
                  {liveStreams.length} ao vivo
                </span>
              )}
            </div>
            {canPublish && (
              <button onClick={() => setShowSchedule(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
                <CalendarClock className="w-3.5 h-3.5" /> Lançamento
              </button>
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
            {/* ── Ao vivo agora ── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#E53935" }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#E53935" }} />
                  </span>
                  <h2 className="text-base font-black" style={{ color: brown }}>Ao vivo agora</h2>
                  {filteredLive.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,57,53,0.10)", color: "#E53935" }}>
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
                <div className="rounded-2xl py-12 text-center" style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                  <Radio className="w-10 h-10 mx-auto mb-3" style={{ color: sandDark, opacity: 0.5 }} />
                  <p className="text-sm font-bold" style={{ color: sandDark }}>
                    {searchQuery ? "Sem resultados para a pesquisa" : "Nenhuma live ao vivo agora"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: sandDark, opacity: 0.7 }}>Confira as próximas lives abaixo!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLive.map((s: any) => <LiveCard key={s.id} stream={s} onClick={() => setWatchStream(s)} />)}
                </div>
              )}
            </section>

            {/* ── Banner CTA vendedor ── */}
            {canPublish && (
              <section className="mb-8">
                <div className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4"
                  style={{ background: `linear-gradient(135deg,${brown} 0%,#2d1206 100%)` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,200,66,0.15)" }}>
                      <CalendarClock className="w-6 h-6" style={{ color: gold }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Publica o teu lançamento!</h3>
                      <p className="text-xs text-white/70 mt-0.5">Cria um agendamento com capa e vídeo de preview. Os teus seguidores serão notificados.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:ml-auto flex-shrink-0">
                    <button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black"
                      style={{ background: gold, color: brown }}>
                      <Zap className="w-3.5 h-3.5" /> Criar lançamento
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Lançamentos ── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: sandDark }} />
                  <h2 className="text-base font-black" style={{ color: brown }}>Lançamentos</h2>
                  {filteredScheduled.length > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: brownLight, color: brown }}>
                      {filteredScheduled.length}
                    </span>
                  )}
                </div>
              </div>

              {filteredScheduled.length === 0 ? (
                <div className="rounded-2xl py-10 text-center" style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: sandDark, opacity: 0.5 }} />
                  <p className="text-sm font-bold" style={{ color: sandDark }}>Sem lançamentos publicados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 rounded-2xl px-5 py-2"
                  style={{ background: cream, border: `1px solid rgba(74,46,10,0.12)` }}>
                  {filteredScheduled.map((s: any) => (
                    <ScheduledCard key={s.id} stream={s} onRemember={handleRemember} remembered={remembered.has(s.id)} onClick={() => setWatchStream(s)} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Estatísticas ── */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { icon: Radio,       label: "Ao vivo agora",      value: liveStreams.length,                                                   color: "#E53935" },
                { icon: Calendar,    label: "Lançamentos",        value: scheduledStreams.length,                                              color: sandDark  },
                { icon: Users,       label: "Espectadores total", value: liveStreams.reduce((a: number, s: any) => a + (s.viewers_count || 0), 0), color: brown  },
                { icon: ShoppingBag, label: "Com leilão activo",  value: liveStreams.filter((s: any) => s.linked_auction).length,              color: gold      },
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

            {/* ── Lives terminadas ── */}
            {endedStreams.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Video className="w-4 h-4" style={{ color: sandDark }} />
                  <h2 className="text-base font-black" style={{ color: brown }}>Lives terminadas</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: brownLight, color: sandDark }}>
                    {endedStreams.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {endedStreams.map((s: any) => (
                    <EndedCard key={s.id} stream={s} onClick={() => setWatchStream(s)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />

      {watchStream  && <WatchModal stream={watchStream} onClose={() => setWatchStream(null)} />}
      {showSchedule && canPublish && (
        <ScheduleModal onClose={() => setShowSchedule(false)} auctions={myAuctions} products={myProducts} sellerId={sellerId} />
      )}
    </div>
  );
};

export default Live;
