import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Footer from "@/components/Footer";
import {
  Play, Upload, X, Loader2, Star, ShoppingBag, Check,
  VideoOff, Image as ImageIcon, Clock, Send, Trash2,
  Eye, MessageCircle, Heart, Bell, BellOff, Package,
  ChevronRight, AlertTriangle, Plus, Film, Zap,
  ExternalLink, Radio, Calendar, Hash,
} from "lucide-react";
import { toast } from "sonner";

/* ─── STORAGE ─── */
const STORAGE_BUCKET = "media";

/* ─── CORES ─── */
const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const gold       = "#f5c842";

/* ─── LIMITES ─── */
const MAX_VIDEO_SECONDS   = 7 * 60;   // 7 minutos
const MAX_RELEASES        = 5;         // máximo por vendedor
const MAX_PRODUCTS_LINKED = 5;         // produtos vinculados

/* ─── SQL MIGRATION — cole no Supabase SQL editor ─── */
// Ver ficheiro: releases_schema.sql
// NOTA: Adicionar coluna à tabela releases:
//   ALTER TABLE releases ADD COLUMN IF NOT EXISTS first_broadcast_ended_at timestamptz;
// Adicionar coluna à tabela release_comments:
//   ALTER TABLE release_comments ADD COLUMN IF NOT EXISTS user_name text;
//   ALTER TABLE release_comments ADD COLUMN IF NOT EXISTS user_avatar text;

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-AO", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

// AO VIVO apenas durante a janela da primeira transmissão
// e apenas enquanto first_broadcast_ended_at não estiver preenchido
const isLive = (r: any) => {
  if (r.status !== "scheduled") return false;
  if (r.first_broadcast_ended_at) return false;
  const now = Date.now();
  const start = new Date(r.broadcasts_at).getTime();
  return now >= start && now < start + (r.broadcast_duration_ms ?? 3 * 3600_000);
};

const isUpcoming = (r: any) =>
  r.status === "scheduled" && new Date(r.broadcasts_at).getTime() > Date.now();

// CORREÇÃO: isExpired simplificada — não depende de first_broadcast_ended_at.
// Um lançamento é "terminado" assim que a janela de tempo passa, mesmo que
// ninguém tenha assistido e o campo first_broadcast_ended_at nunca seja preenchido.
const isExpired = (r: any) => {
  if (r.status === "expired") return true;
  const windowEnd =
    new Date(r.broadcasts_at).getTime() +
    (r.broadcast_duration_ms ?? 3 * 3600_000);
  return Date.now() >= windowEnd;
};

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Erro ao ler vídeo")); };
    v.src = url;
  });

/* ═══════════════════════════════════════════════════
   PULSE DOT
═══════════════════════════════════════════════════ */
const PulseDot = ({ color = "#E53935" }: { color?: string }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{ background: color, animation: "relPulse 1.4s ease-in-out infinite" }}
  />
);

/* ═══════════════════════════════════════════════════
   COVER UPLOAD
═══════════════════════════════════════════════════ */
const CoverUpload = ({
  value, onChange,
}: { value: string | null; onChange: (url: string | null, file: File | null) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Máx. 5 MB"); return; }
    onChange(URL.createObjectURL(f), f);
  };
  return (
    <div className="mb-5">
      <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
        Capa <span style={{ color: "#E53935" }}>*</span>
      </label>
      <div
        onClick={() => ref.current?.click()}
        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed flex items-center justify-center"
        style={{ borderColor: value ? sandDark : "rgba(74,46,10,0.25)", background: value ? "transparent" : cream }}>
        {value ? (
          <>
            <img src={value} alt="Capa" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-bold">Alterar capa</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null, null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}>
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: brownLight }}>
              <ImageIcon className="w-6 h-6" style={{ color: sandDark }} />
            </div>
            <p className="text-sm font-bold" style={{ color: brown }}>Clique para adicionar a capa</p>
            <p className="text-[11px]" style={{ color: sandDark }}>JPG, PNG · Máx. 5 MB · 16:9 recomendado</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PRODUCT PICKER (até 5 produtos)
   CORREÇÃO: os produtos são recebidos via prop (já carregados pela query
   "my_products_active" na página principal, igual ao padrão usado nos Stories
   — não faz query própria, evita chamadas duplicadas e erros de contexto).
═══════════════════════════════════════════════════ */
const ProductPicker = ({
  products, selected, onChange,
}: { products: any[]; selected: string[]; onChange: (ids: string[]) => void }) => {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else if (selected.length < MAX_PRODUCTS_LINKED) {
      onChange([...selected, id]);
    } else {
      toast.error(`Máximo de ${MAX_PRODUCTS_LINKED} produtos por lançamento`);
    }
  };
  if (!products.length) return null;
  return (
    <div className="mb-5">
      <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
        <Package className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
        Produtos em destaque{" "}
        <span className="font-normal normal-case text-[10px]" style={{ color: sandDark }}>
          ({selected.length}/{MAX_PRODUCTS_LINKED} seleccionados)
        </span>
      </label>
      <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
        {products.map((p: any) => {
          const sel = selected.includes(p.id);
          return (
            <div key={p.id}
              onClick={() => toggle(p.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{
                background: sel ? brownLight : "#fff",
                border: `1.5px solid ${sel ? sandDark : "rgba(74,46,10,0.15)"}`,
              }}>
              {p.image_url
                ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brownLight }}>
                    <Package className="w-4 h-4" style={{ color: sandDark }} />
                  </div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: brown }}>{p.title}</p>
                <p className="text-[11px]" style={{ color: sandDark }}>
                  {Number(p.price).toLocaleString("pt-AO")} Kz
                </p>
              </div>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0`}
                style={{ background: sel ? sandDark : "rgba(74,46,10,0.10)", border: sel ? "none" : "1.5px solid rgba(74,46,10,0.25)" }}>
                {sel && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MODAL — CRIAR LANÇAMENTO
═══════════════════════════════════════════════════ */
const CreateModal = ({
  onClose, products, sellerId, currentCount,
}: {
  onClose: () => void;
  products: any[];
  sellerId: string | null;
  currentCount: number;
}) => {
  const qc = useQueryClient();
  const [coverUrl,      setCoverUrl]      = useState<string | null>(null);
  const [coverFile,     setCoverFile]     = useState<File | null>(null);
  const [videoUrl,      setVideoUrl]      = useState<string | null>(null);
  const [videoFile,     setVideoFile]     = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [title,         setTitle]         = useState("");
  const [desc,          setDesc]          = useState("");
  const [datetime,      setDatetime]      = useState("");
  const [selectedProds, setSelectedProds] = useState<string[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [progress,      setProgress]      = useState<string | null>(null);
  const [done,          setDone]          = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  const minDatetime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);
  const slotsLeft = MAX_RELEASES - currentCount;

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { toast.error("Máx. 500 MB"); return; }
    try {
      const dur = await getVideoDuration(f);
      if (dur > MAX_VIDEO_SECONDS) {
        toast.error(`Vídeo tem ${fmtDuration(dur)} — limite é 7 minutos`, { duration: 5000 });
        if (videoRef.current) videoRef.current.value = "";
        return;
      }
      setVideoDuration(dur);
    } catch {
      toast.error("Não foi possível verificar o vídeo");
      return;
    }
    setVideoUrl(URL.createObjectURL(f));
    setVideoFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim())  { toast.error("Adiciona um título"); return; }
    if (!coverUrl)      { toast.error("A capa é obrigatória"); return; }
    if (!videoFile)     { toast.error("O vídeo é obrigatório"); return; }
    if (!datetime)      { toast.error("Define a data de transmissão"); return; }
    if (new Date(datetime) <= new Date()) { toast.error("A data deve ser no futuro"); return; }
    if (!sellerId)      { toast.error("Conta de vendedor não encontrada"); return; }
    if (currentCount >= MAX_RELEASES) { toast.error("Atingiste o limite de 5 lançamentos. Elimina um antes de publicar."); return; }

    setLoading(true);
    try {
      let thumbnail_url: string | null = null;
      let video_url: string | null = null;

      if (coverFile) {
        setProgress("A carregar capa…");
        const ext  = coverFile.name.split(".").pop();
        const path = `release-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await (supabase as any).storage.from(STORAGE_BUCKET).upload(path, coverFile);
        if (error) throw new Error(`Upload capa: ${error.message}`);
        const { data } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        thumbnail_url = data?.publicUrl ?? null;
      }

      if (videoFile) {
        setProgress(`A carregar vídeo (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)…`);
        const ext  = videoFile.name.split(".").pop();
        const path = `release-videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await (supabase as any).storage.from(STORAGE_BUCKET).upload(path, videoFile);
        if (error) throw new Error(`Upload vídeo: ${error.message}`);
        const { data } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        video_url = data?.publicUrl ?? null;
      }

      setProgress("A publicar lançamento…");

      const { data: rows, error } = await (supabase as any)
        .from("releases")
        .insert({
          seller_id:            sellerId,
          title:                title.trim(),
          description:          desc.trim() || null,
          thumbnail_url,
          video_url,
          video_duration_s:     videoDuration ? Math.floor(videoDuration) : null,
          broadcasts_at:        new Date(datetime).toISOString(),
          status:               "scheduled",
          linked_product_ids:   selectedProds.length ? selectedProds : null,
          views_count:          0,
          likes_count:          0,
          comments_count:       0,
        })
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified)
        `);

      if (error) throw new Error(error.message);

      // Buscar produtos vinculados para popular o cache imediatamente
      let linkedProducts: any[] = [];
      if (selectedProds.length) {
        const { data: prods } = await (supabase as any)
          .from("products")
          .select("id, title, price, image_url, slug")
          .in("id", selectedProds);
        linkedProducts = prods || [];
      }

      const newRecord = { ...(rows?.[0] ?? {}), linked_products: linkedProducts };

      qc.setQueryData(["releases_all"], (old: any[] = []) =>
        [newRecord, ...old.filter((r: any) => r.id !== newRecord.id)]
      );

      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["releases_all"] });
        qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
      }, 2000);

      setProgress(null);
      setDone(true);
      toast.success("Lançamento publicado!");
    } catch (err: any) {
      setProgress(null);
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl" style={{ background: cream }} onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: brownLight }}>
          <Check className="w-8 h-8" style={{ color: brown }} />
        </div>
        <h3 className="text-lg font-black mb-1" style={{ color: brown }}>Lançamento publicado!</h3>
        <p className="text-sm mb-6" style={{ color: sandDark }}>
          O teu lançamento será transmitido na data e hora agendada.
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
        style={{ background: cream, maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}>
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-base font-black text-white">Novo lançamento</h2>
              {slotsLeft < MAX_RELEASES && (
                <p className="text-[10px] text-white/70">
                  {slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} restante${slotsLeft !== 1 ? "s" : ""}` : "Limite atingido"}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Aviso limite */}
        {currentCount >= MAX_RELEASES && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "rgba(229,57,53,0.10)", border: "1px solid rgba(229,57,53,0.25)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#E53935" }} />
            <p className="text-xs" style={{ color: "#E53935" }}>
              <strong>Limite atingido.</strong> Tens {MAX_RELEASES} lançamentos. Elimina um para publicar novo.
            </p>
          </div>
        )}

        <div className="px-6 py-5">
          <CoverUpload value={coverUrl} onChange={(u, f) => { setCoverUrl(u); setCoverFile(f); }} />

          {/* Vídeo */}
          <div className="mb-5">
            <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
              Vídeo <span style={{ color: "#E53935" }}>*</span>{" "}
              <span className="text-[10px] font-normal normal-case" style={{ color: sandDark }}>máx. 7 min · 500 MB</span>
            </label>
            {videoUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black">
                <video src={videoUrl} controls className="w-full max-h-44 object-contain" />
                <button type="button"
                  onClick={() => { setVideoUrl(null); setVideoFile(null); setVideoDuration(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.65)" }}>
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {videoDuration !== null && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                    style={{ background: "rgba(0,0,0,0.65)" }}>
                    {fmtDuration(videoDuration)}
                  </span>
                )}
              </div>
            ) : (
              <div onClick={() => videoRef.current?.click()}
                className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer"
                style={{ borderColor: "rgba(74,46,10,0.25)", background: cream }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brownLight }}>
                  <Film className="w-5 h-5" style={{ color: sandDark }} />
                </div>
                <p className="text-xs font-bold" style={{ color: brown }}>Carregar vídeo</p>
                <p className="text-[10px]" style={{ color: sandDark }}>MP4, MOV ou WebM</p>
              </div>
            )}
            <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm"
              className="hidden" onChange={handleVideoFile} />
          </div>

          {/* Título */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Título <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder="Ex: Nova colecção de Verão 2025"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>

          {/* Data */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Data de transmissão <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="datetime-local" value={datetime} min={minDatetime}
              onChange={e => setDatetime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}
              placeholder="Descreve o teu lançamento…"
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>

          {/* Produtos — recebidos via prop, sem query própria */}
          <ProductPicker products={products} selected={selectedProds} onChange={setSelectedProds} />

          <button onClick={handleSubmit}
            disabled={loading || !sellerId || currentCount >= MAX_RELEASES}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{
              background: (loading || !sellerId || currentCount >= MAX_RELEASES)
                ? "#ccc"
                : `linear-gradient(135deg, ${sandDark}, ${brown})`,
            }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{progress || "A guardar…"}</>
              : <><Film className="w-4 h-4" />Publicar lançamento</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   COMMENT ITEM
   · Sem anónimos: mostra sempre user_name
   · Badge "dono da publicação" se isOwner = true
═══════════════════════════════════════════════════ */
const CommentItem = ({ comment, isOwner }: { comment: any; isOwner?: boolean }) => (
  <div className="flex items-start gap-2.5 py-3 border-b last:border-0" style={{ borderColor: "rgba(74,46,10,0.10)" }}>
    {comment.user_avatar
      ? <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      : <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{
            background: isOwner ? brown : brownLight,
            color: isOwner ? cream : brown,
          }}>
          {(comment.user_name || "?").charAt(0).toUpperCase()}
        </div>}

    <div className="flex-1 min-w-0">
      <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
        <span className="text-xs font-black" style={{ color: brown }}>
          {comment.user_name || "Utilizador"}
        </span>
        {isOwner && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: brown, color: cream, letterSpacing: "0.03em" }}>
            dono da publicação
          </span>
        )}
        <span className="text-[10px]" style={{ color: sandDark }}>
          {new Date(comment.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: brown }}>{comment.content}</p>

      <div className="flex items-center gap-3 mt-1.5">
        <button className="flex items-center gap-1 text-[10px]" style={{ color: sandDark }}>
          <Heart className="w-3 h-3" />
          {comment.likes_count || 0}
        </button>
        <button className="text-[10px] font-bold" style={{ color: sandDark }}>
          Responder
        </button>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════
   MODAL — ASSISTIR / DETALHES
   CORREÇÃO: <video> com playsInline para não sair da moldura no iOS/Android.
   O container tem position:relative + overflow:hidden e o vídeo usa
   position:absolute + inset-0 para ficar sempre contido.
═══════════════════════════════════════════════════ */
const WatchModal = ({
  release, onClose, userId,
}: { release: any; onClose: () => void; userId: string | null }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [notified, setNotified] = useState(false);
  const commentListRef = useRef<HTMLDivElement>(null);

  const live    = isLive(release);
  const upcoming = isUpcoming(release);
  const expired  = isExpired(release);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!userId,
  });

  const isReleaseOwner = !!userId && userId === release.seller?.user_id;

  useEffect(() => {
    if (!release?.id || (!live && upcoming)) return;
    (supabase as any).from("release_views").insert({ release_id: release.id, user_id: userId });
    (supabase as any).from("releases").update({ views_count: (release.views_count || 0) + 1 })
      .eq("id", release.id);
  }, [release?.id]);

  /* Quando o vídeo ao vivo terminar, grava first_broadcast_ended_at */
  const handleVideoEnded = useCallback(async () => {
    if (!live || !release?.id) return;
    await (supabase as any)
      .from("releases")
      .update({ first_broadcast_ended_at: new Date().toISOString() })
      .eq("id", release.id);
    qc.invalidateQueries({ queryKey: ["releases_all"] });
  }, [live, release?.id, qc]);

  const { data: comments = [] } = useQuery({
    queryKey: ["release_comments", release.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("release_comments")
        .select("*")
        .eq("release_id", release.id)
        .order("created_at", { ascending: true })
        .limit(200);
      return data || [];
    },
    enabled: !upcoming,
    refetchInterval: live ? 5000 : false,
  });

  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments.length]);

  const sendComment = async () => {
    if (!userId) { navigate("/auth"); return; }
    const text = comment.trim();
    if (!text) return;
    setComment("");

    const userName   = profile?.full_name || "Utilizador";
    const userAvatar = profile?.avatar_url || null;

    const { error } = await (supabase as any).from("release_comments").insert({
      release_id:   release.id,
      user_id:      userId,
      user_name:    userName,
      user_avatar:  userAvatar,
      content:      text,
    });
    if (error) toast.error("Erro ao enviar comentário");
    else qc.invalidateQueries({ queryKey: ["release_comments", release.id] });
  };

  const toggleLike = async () => {
    if (!userId) { navigate("/auth"); return; }
    setLiked(v => !v);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        style={{ background: cream, maxHeight: "92vh", maxWidth: "900px", width: "100%" }}
        onClick={e => e.stopPropagation()}>

        {/* ── Coluna esquerda — vídeo ── */}
        <div className="flex flex-col" style={{ flex: "0 0 auto", width: "100%", maxWidth: "560px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ background: `linear-gradient(135deg,${cream},${sand})` }}>
            {release.seller?.logo_url
              ? <img src={release.seller.logo_url} alt="" className="w-9 h-9 rounded-full object-cover border-2" style={{ borderColor: sandDark }} />
              : <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style={{ background: brownLight, color: brown }}>
                  {(release.seller?.name || "?").charAt(0)}
                </div>}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: sandDark }}>{release.seller?.name}</p>
              <h2 className="text-sm font-black truncate" style={{ color: brown }}>{release.title}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: brownLight }}>
              <X className="w-4 h-4" style={{ color: brown }} />
            </button>
          </div>

          {/* ── Vídeo player — sempre dentro da moldura ──
              CORREÇÃO: overflow:hidden no container + position:absolute no vídeo
              + playsInline para bloquear fullscreen nativo no iOS Safari       */}
          <div
            className="relative flex-shrink-0 bg-black overflow-hidden"
            style={{ aspectRatio: "16/9" }}
          >
            {/* AO VIVO: apenas na primeira transmissão */}
            {live && release.video_url && (
              <video
                src={release.video_url}
                controls
                autoPlay
                playsInline
                onEnded={handleVideoEnded}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            )}

            {/* AGENDADO: capa + data */}
            {upcoming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {release.thumbnail_url && (
                  <img src={release.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                )}
                <div className="relative z-10 text-center px-6">
                  <Calendar className="w-10 h-10 text-white/60 mx-auto mb-3" />
                  <p className="text-white font-bold text-sm mb-1">Transmissão agendada</p>
                  <p className="text-white/60 text-xs">{fmtDate(release.broadcasts_at)}</p>
                  <button
                    onClick={() => { setNotified(v => !v); toast.success(notified ? "Lembrete removido" : "Vais ser notificado!"); }}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white mx-auto"
                    style={{ background: notified ? brownLight : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                    {notified ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    {notified ? "Lembrete activo" : "Lembrar-me"}
                  </button>
                </div>
              </div>
            )}

            {/* TERMINADO: capa desbotada — sem vídeo, sem replay */}
            {expired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {release.thumbnail_url && (
                  <img src={release.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
                )}
                <VideoOff className="relative z-10 w-10 h-10 text-white/50" />
                <p className="relative z-10 text-white/60 text-sm font-bold">Transmissão já terminou</p>
              </div>
            )}

            {/* Badge AO VIVO */}
            {live && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg z-10"
                style={{ background: "#E53935" }}>
                <PulseDot color="#fff" />
                <span className="text-[10px] font-black text-white">AO VIVO</span>
              </div>
            )}

            {/* Stats */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-white"
                style={{ background: "rgba(0,0,0,0.65)" }}>
                <Eye className="w-3 h-3" />{release.views_count || 0}
              </span>
            </div>
          </div>

          {/* Acções */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(74,46,10,0.12)" }}>
            <button onClick={toggleLike}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: liked ? "rgba(229,57,53,0.12)" : brownLight,
                color: liked ? "#E53935" : brown,
                border: `1px solid ${liked ? "rgba(229,57,53,0.30)" : "rgba(74,46,10,0.15)"}`,
              }}>
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
              {(release.likes_count || 0) + (liked ? 1 : 0)}
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: brownLight, color: brown }}>
              <MessageCircle className="w-3.5 h-3.5" />
              {comments.length}
            </button>
            {release.description && (
              <p className="text-[11px] ml-2 line-clamp-1 flex-1" style={{ color: sandDark }}>
                {release.description}
              </p>
            )}
          </div>

          {/* Micro carrossel de produtos */}
          {release.linked_products?.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(74,46,10,0.12)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: sandDark }}>
                <Package className="w-3 h-3 inline mr-1" style={{ color: sandDark }} />
                Produtos em destaque
              </p>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {release.linked_products.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => { onClose(); navigate(`/produto/${p.id}`); }}
                    className="flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border hover:shadow-md transition-all"
                    style={{ width: 100, background: "#fff", border: "1px solid rgba(74,46,10,0.12)" }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} className="w-full object-cover" style={{ height: 68 }} />
                      : <div className="flex items-center justify-center" style={{ height: 68, background: brownLight }}>
                          <Package className="w-5 h-5" style={{ color: sandDark }} />
                        </div>}
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-bold truncate" style={{ color: brown }}>{p.title}</p>
                      <p className="text-[10px] font-black" style={{ color: sandDark }}>
                        {Number(p.price).toLocaleString("pt-AO")} Kz
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita — comentários (desktop) ── */}
        <div className="hidden md:flex flex-col flex-1 min-h-0" style={{ borderLeft: "1px solid rgba(74,46,10,0.12)" }}>
          <div className="flex flex-col flex-1 min-h-0">
            <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider flex-shrink-0" style={{ color: sandDark }}>
              Comentários {comments.length > 0 && `(${comments.length})`}
            </p>
            <div ref={commentListRef} className="flex-1 overflow-y-auto px-4 pb-2" style={{ minHeight: 0 }}>
              {!upcoming && comments.length === 0 && (
                <div className="py-8 text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: sandDark, opacity: 0.4 }} />
                  <p className="text-xs" style={{ color: sandDark }}>Nenhum comentário ainda</p>
                </div>
              )}
              {!upcoming && comments.map((c: any) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  isOwner={c.user_id === release.seller?.user_id}
                />
              ))}
              {upcoming && (
                <div className="py-6 text-center">
                  <p className="text-xs" style={{ color: sandDark }}>Os comentários abrem na transmissão</p>
                </div>
              )}
            </div>

            {!upcoming && !expired && (
              <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
                style={{ borderTop: "1px solid rgba(74,46,10,0.12)" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{ background: brownLight, color: brown }}>
                      {(profile?.full_name || "?").charAt(0).toUpperCase()}
                    </div>}
                <input
                  type="text" value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendComment()}
                  placeholder="Escreve um comentário…"
                  className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
                  style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
                <button onClick={sendComment} disabled={!comment.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: comment.trim() ? `linear-gradient(135deg,${sandDark},${brown})` : "#e5e5e5" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel mobile — comentários ── */}
        <div className="md:hidden flex flex-col border-t" style={{ borderColor: "rgba(74,46,10,0.12)", maxHeight: 240 }}>
          <div ref={commentListRef} className="flex-1 overflow-y-auto px-3 py-1">
            {!upcoming && comments.length === 0 && (
              <p className="text-center text-xs py-4" style={{ color: sandDark }}>Nenhum comentário ainda</p>
            )}
            {!upcoming && comments.map((c: any) => (
              <CommentItem
                key={c.id}
                comment={c}
                isOwner={c.user_id === release.seller?.user_id}
              />
            ))}
            {upcoming && (
              <p className="text-center text-xs py-4" style={{ color: sandDark }}>Os comentários abrem na transmissão</p>
            )}
          </div>
          {!upcoming && !expired && (
            <div className="flex items-center gap-2 p-2 border-t flex-shrink-0" style={{ borderColor: "rgba(74,46,10,0.12)" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                    style={{ background: brownLight, color: brown }}>
                    {(profile?.full_name || "?").charAt(0).toUpperCase()}
                  </div>}
              <input type="text" value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendComment()}
                placeholder="Comentar…"
                className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
                style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
              <button onClick={sendComment}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   CARD — lançamento
═══════════════════════════════════════════════════ */
const ReleaseCard = ({
  release, onClick, onDelete, canDelete,
}: { release: any; onClick: () => void; onDelete?: () => void; canDelete?: boolean }) => {
  const live = isLive(release);
  const upcoming = isUpcoming(release);
  const expired = isExpired(release);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      style={{ background: cream }}>

      <div className="relative aspect-video overflow-hidden bg-gray-900">
        {release.thumbnail_url
          ? <img src={release.thumbnail_url} alt={release.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${expired ? "grayscale opacity-60" : ""}`}
              loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00)" }}>
              <Film className="w-10 h-10 opacity-20 text-white" />
            </div>}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

        {live && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "#E53935" }}>
            <PulseDot color="#fff" />
            <span className="text-[10px] font-black text-white">AO VIVO</span>
          </div>
        )}
        {upcoming && !live && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: "rgba(74,46,10,0.80)" }}>
            <Clock className="w-3 h-3 text-white/80" />
            <span className="text-[10px] font-bold text-white">{fmtDate(release.broadcasts_at)}</span>
          </div>
        )}
        {expired && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg"
            style={{ background: "rgba(60,60,60,0.80)" }}>
            <span className="text-[10px] font-bold text-white">TERMINADO</span>
          </div>
        )}

        {release.video_duration_s && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md"
            style={{ background: "rgba(0,0,0,0.72)" }}>
            <span className="text-[10px] text-white font-bold">{fmtDuration(release.video_duration_s)}</span>
          </div>
        )}

        {!upcoming && !expired && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl" style={{ background: "rgba(255,255,255,0.92)" }}>
              <Play className="w-6 h-6 ml-1" style={{ color: brown }} />
            </div>
          </div>
        )}

        {release.linked_products?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: "rgba(0,0,0,0.65)" }}>
            <Package className="w-3 h-3" style={{ color: gold }} />
            <span className="text-[10px] text-white font-bold">{release.linked_products.length} produto{release.linked_products.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {canDelete && onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            style={{ background: "rgba(229,57,53,0.90)" }}>
            <Trash2 className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          {release.seller?.logo_url
            ? <img src={release.seller.logo_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 border" style={{ borderColor: sand }} />
            : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background: brownLight, color: brown }}>
                {(release.seller?.name || "?").charAt(0)}
              </div>}
          <span className="text-[11px] font-bold truncate" style={{ color: sandDark }}>{release.seller?.name || "Vendedor"}</span>
          {release.seller?.is_verified && <Star className="w-3 h-3 flex-shrink-0" style={{ color: sandDark }} />}
        </div>
        <h3 className="text-sm font-black line-clamp-2 mb-2" style={{ color: brown }}>{release.title}</h3>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: sandDark }}>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{release.views_count || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{release.comments_count || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{release.likes_count || 0}</span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════ */
const Lancamentos = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const qc          = useQueryClient();
  const { isAdmin } = useUserRole();

  const [watchRelease, setWatchRelease] = useState<any>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<"all" | "live" | "upcoming" | "ended">("all");

  /* Seller ID */
  const { data: sellerData } = useQuery({
    queryKey: ["my_seller_id", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("sellers").select("id").eq("user_id", user!.id).maybeSingle();
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

  /* Contagem dos meus lançamentos */
  const { data: myCount = 0 } = useQuery({
    queryKey: ["my_releases_count", sellerId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("releases").select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId).neq("status", "deleted");
      return count || 0;
    },
    enabled: !!sellerId,
  });

  /* Todos os lançamentos */
  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["releases_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("releases")
        .select(`
          *,
          seller:sellers(id, name, logo_url, is_verified, user_id)
        `)
        .neq("status", "deleted")
        .order("broadcasts_at", { ascending: true })
        .limit(60);
      if (error) console.error("releases:", error.message);
      if (!data?.length) return [];

      // Recolher todos os IDs de produtos vinculados de todos os lançamentos
      // e fazer UMA única query à tabela products — igual ao padrão dos Stories
      // que carrega todos os dados de uma vez em vez de query por query.
      const allProdIds = [...new Set(data.flatMap((r: any) => r.linked_product_ids || []))];
      let prodMap: Record<string, any> = {};
      if (allProdIds.length) {
        const { data: prods } = await (supabase as any)
          .from("products")
          .select("id, title, price, image_url, slug")
          .in("id", allProdIds);
        (prods || []).forEach((p: any) => { prodMap[p.id] = p; });
      }

      return data.map((r: any) => ({
        ...r,
        linked_products: (r.linked_product_ids || [])
          .map((id: string) => prodMap[id])
          .filter(Boolean),
      }));
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  /* Meus produtos — carregados uma vez aqui e passados como prop ao CreateModal,
     evitando que o modal faça a sua própria query (que pode falhar por contexto) */
  const { data: myProducts = [] } = useQuery({
    queryKey: ["my_products_active", sellerId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, title, price, image_url")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .limit(50);
      return data || [];
    },
    enabled: canPublish && !!sellerId,
  });

  /* Realtime */
  useEffect(() => {
    const ch = (supabase as any)
      .channel("releases_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "releases" }, () => {
        qc.invalidateQueries({ queryKey: ["releases_all"] });
        qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [qc, sellerId]);

  /* Eliminar lançamento */
  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este lançamento? Esta acção é irreversível.")) return;
    const { error } = await (supabase as any).from("releases").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Erro ao eliminar"); return; }
    qc.setQueryData(["releases_all"], (old: any[] = []) => old.filter((r: any) => r.id !== id));
    qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
    toast.success("Lançamento eliminado");
  };

  /* Filtros */
  const q = search.toLowerCase();
  const filtered = releases.filter((r: any) => {
    if (q && !r.title?.toLowerCase().includes(q) && !r.seller?.name?.toLowerCase().includes(q)) return false;
    if (filter === "live")     return isLive(r);
    if (filter === "upcoming") return isUpcoming(r) && !isLive(r);
    if (filter === "ended")    return isExpired(r);
    return true;
  });

  const liveNow  = releases.filter(isLive);
  const upcoming = releases.filter((r: any) => isUpcoming(r) && !isLive(r));
  const ended    = releases.filter(isExpired);

  return (
    <div className="min-h-screen" style={{ background: "#faf6f0" }}>
      <style>{`
        @keyframes relPulse {
          0%,100% { box-shadow:0 0 0 0 currentColor;opacity:1; }
          50%      { box-shadow:0 0 0 6px transparent;opacity:0.7; }
        }
      `}</style>

      {/* ══ HEADER ══ */}
      <div className="sticky top-0 z-40" style={{
        background: `linear-gradient(160deg,${cream} 0%,${sand} 60%,#C9A87C 100%)`,
        borderBottom: `1px solid rgba(74,46,10,0.15)`,
        boxShadow: "0 2px 16px rgba(74,46,10,0.12)",
      }}>
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(245,200,66,0.18)", border: "1px solid rgba(245,200,66,0.35)" }}>
                <Film className="w-4 h-4" style={{ color: brown }} />
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-black" style={{ color: brown }}>Lançamentos</h1>
                <p className="text-[11px]" style={{ color: sandDark }}>Vídeos programados com produtos em destaque</p>
              </div>
              <h1 className="md:hidden text-base font-black" style={{ color: brown }}>Lançamentos</h1>
            </div>

            {/* Busca */}
            <div className="flex-1 flex items-center rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.10)" }}>
              <Hash className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar lançamentos…"
                className="flex-1 py-2.5 px-2.5 text-sm bg-transparent focus:outline-none" style={{ color: brown }} />
              {search && (
                <button onClick={() => setSearch("")} className="mr-2">
                  <X className="w-4 h-4" style={{ color: sandDark }} />
                </button>
              )}
            </div>

            {/* CTA publicar */}
            {canPublish && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white flex-shrink-0 transition active:scale-95"
                style={{
                  background: myCount >= MAX_RELEASES
                    ? "#ccc"
                    : `linear-gradient(135deg, ${sandDark}, ${brown})`,
                }}>
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Criar lançamento</span>
                <span className="md:hidden">Criar</span>
                {myCount > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: myCount >= MAX_RELEASES ? "rgba(229,57,53,0.8)" : "rgba(255,255,255,0.25)" }}>
                    {myCount}/{MAX_RELEASES}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mt-3 pb-1 overflow-x-auto no-scrollbar">
            {[
              { key: "all",      label: "Todos",          count: releases.length },
              { key: "live",     label: "Ao vivo agora",  count: liveNow.length  },
              { key: "upcoming", label: "Próximos",       count: upcoming.length },
              { key: "ended",    label: "Terminados",     count: ended.length    },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: filter === f.key ? brown : "rgba(74,46,10,0.10)",
                  color: filter === f.key ? "white" : brown,
                  border: `1px solid ${filter === f.key ? "transparent" : "rgba(74,46,10,0.15)"}`,
                }}>
                {f.key === "live" && f.count > 0 && <PulseDot color={filter === f.key ? "#fff" : "#E53935"} />}
                {f.label}
                {f.count > 0 && (
                  <span className="px-1.5 rounded-full text-[10px]"
                    style={{
                      background: filter === f.key ? "rgba(255,255,255,0.20)" : brownLight,
                      color: filter === f.key ? "white" : brown,
                    }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTEÚDO ══ */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-5">

        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: sandDark }} />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Banner vendedor */}
            {canPublish && (
              <div className="mb-6 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                style={{ background: `linear-gradient(135deg,${brown} 0%,#2d1206 100%)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,200,66,0.15)" }}>
                    <Zap className="w-5 h-5" style={{ color: gold }} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {myCount >= MAX_RELEASES
                        ? "Limite atingido — elimina um lançamento para publicar novo"
                        : `${MAX_RELEASES - myCount} slot${MAX_RELEASES - myCount !== 1 ? "s" : ""} disponível${MAX_RELEASES - myCount !== 1 ? "s" : ""} para novos lançamentos`}
                    </p>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      Cada lançamento pode ter até 5 produtos · vídeo máx. 7 min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                  {Array.from({ length: MAX_RELEASES }).map((_, i) => (
                    <div key={i} className="w-3 h-3 rounded-full"
                      style={{ background: i < myCount ? gold : "rgba(255,255,255,0.20)" }} />
                  ))}
                  <button onClick={() => setShowCreate(true)}
                    disabled={myCount >= MAX_RELEASES}
                    className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.15)" : gold, color: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.5)" : brown }}>
                    <Plus className="w-3.5 h-3.5" /> Novo
                  </button>
                </div>
              </div>
            )}

            {/* Live agora */}
            {filter === "all" && liveNow.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#E53935" }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#E53935" }} />
                  </span>
                  <h2 className="text-base font-black" style={{ color: brown }}>Ao vivo agora</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,57,53,0.10)", color: "#E53935" }}>
                    {liveNow.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveNow.map((r: any) => (
                    <ReleaseCard key={r.id} release={r} onClick={() => setWatchRelease(r)}
                      canDelete={canPublish && r.seller_id === sellerId}
                      onDelete={() => handleDelete(r.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Grid principal */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                <Film className="w-10 h-10 mx-auto mb-3" style={{ color: sandDark, opacity: 0.4 }} />
                <p className="text-sm font-bold" style={{ color: sandDark }}>
                  {search ? "Sem resultados" : "Nenhum lançamento"}
                </p>
                {canPublish && !search && (
                  <button onClick={() => setShowCreate(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white mx-auto"
                    style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
                    <Plus className="w-4 h-4" /> Criar primeiro lançamento
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((r: any) => (
                  <ReleaseCard key={r.id} release={r} onClick={() => setWatchRelease(r)}
                    canDelete={canPublish && r.seller_id === sellerId}
                    onDelete={() => handleDelete(r.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      {watchRelease && (
        <WatchModal release={watchRelease} onClose={() => setWatchRelease(null)} userId={user?.id ?? null} />
      )}
      {showCreate && canPublish && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          products={myProducts}
          sellerId={sellerId}
          currentCount={myCount}
        />
      )}
    </div>
  );
};

export default Lancamentos;
