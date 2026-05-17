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
  AlertTriangle, Plus, Film, Zap, Calendar, Hash,
  ChevronDown, ChevronUp, LayoutGrid, ListPlus,
  Pause, Volume2, VolumeX, Maximize, ArrowLeft,
  Share2, Bookmark,
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
const MAX_VIDEO_SECONDS   = 7 * 60;
const MAX_RELEASES        = 5;
const MAX_PRODUCTS_LINKED = 5;

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
const isLive = (r: any) => {
  if (r.status !== "scheduled") return false;
  if (r.first_broadcast_ended_at) return false;
  const now = Date.now();
  const start = new Date(r.broadcasts_at).getTime();
  return now >= start && now < start + (r.broadcast_duration_ms ?? 3 * 3600_000);
};
const isUpcoming = (r: any) =>
  r.status === "scheduled" && new Date(r.broadcasts_at).getTime() > Date.now();
const isExpired = (r: any) => {
  if (r.status === "expired") return true;
  return Date.now() >= new Date(r.broadcasts_at).getTime() + (r.broadcast_duration_ms ?? 3 * 3600_000);
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
  <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
    style={{ background: color, animation: "relPulse 1.4s ease-in-out infinite" }} />
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
      <div onClick={() => ref.current?.click()}
        className="relative w-full h-44 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed flex items-center justify-center"
        style={{ borderColor: value ? sandDark : "rgba(74,46,10,0.25)", background: value ? "transparent" : cream }}>
        {value ? (
          <>
            <img src={value} alt="Capa" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Upload className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-bold">Alterar capa</span>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(null, null); }}
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
   PRODUCT PICKER
═══════════════════════════════════════════════════ */
const ProductPicker = ({
  products, selected, onChange,
}: { products: any[]; selected: string[]; onChange: (ids: string[]) => void }) => {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else if (selected.length < MAX_PRODUCTS_LINKED) onChange([...selected, id]);
    else toast.error(`Máximo de ${MAX_PRODUCTS_LINKED} produtos`);
  };
  if (!products.length) return null;
  return (
    <div className="mb-2">
      <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
        {products.map((p: any) => {
          const sel = selected.includes(p.id);
          return (
            <div key={p.id} onClick={() => toggle(p.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
              style={{ background: sel ? brownLight : "#fff", border: `1.5px solid ${sel ? sandDark : "rgba(74,46,10,0.15)"}` }}>
              {p.image_url
                ? <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brownLight }}>
                    <Package className="w-4 h-4" style={{ color: sandDark }} />
                  </div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: brown }}>{p.title}</p>
                <p className="text-[11px]" style={{ color: sandDark }}>{Number(p.price).toLocaleString("pt-AO")} Kz</p>
              </div>
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
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
   PRODUCT FORM — reutilizado na página e no modal
═══════════════════════════════════════════════════ */
const ProductForm = ({
  sellerId, onCreated, onCancel, compact = false,
}: {
  sellerId: string | null;
  onCreated: (p: { id: string; title: string; price: number; image_url: string | null }) => void;
  onCancel?: () => void;
  compact?: boolean;
}) => {
  const imgRef = useRef<HTMLInputElement>(null);
  const [title,    setTitle]    = useState("");
  const [price,    setPrice]    = useState("");
  const [category, setCategory] = useState("");
  const [desc,     setDesc]     = useState("");
  const [imgFile,  setImgFile]  = useState<File | null>(null);
  const [imgPrev,  setImgPrev]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Imagem máx. 5 MB"); return; }
    setImgFile(f); setImgPrev(URL.createObjectURL(f));
  };

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    const priceNum = parseFloat(price.replace(",", "."));
    if (!price || isNaN(priceNum) || priceNum <= 0) { toast.error("Preço inválido"); return; }
    if (!sellerId) { toast.error("Conta de vendedor não encontrada"); return; }
    setLoading(true);
    try {
      let image_url: string | null = null;
      if (imgFile) {
        const ext = imgFile.name.split(".").pop();
        const path = `product-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage.from(STORAGE_BUCKET).upload(path, imgFile);
        if (upErr) throw new Error(upErr.message);
        const { data: urlData } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        image_url = urlData?.publicUrl ?? null;
      }
      const slug = `${title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80)}-${Date.now()}`;
      const { data: row, error } = await (supabase as any)
        .from("products")
        .insert({ seller_id: sellerId, title: title.trim(), description: desc.trim() || null,
          price: priceNum, category: category.trim() || null, image_url, slug, is_active: true, sales_count: 0 })
        .select("id, title, price, image_url").single();
      if (error) throw new Error(error.message);
      toast.success("Produto criado!");
      setTitle(""); setPrice(""); setCategory(""); setDesc(""); setImgFile(null); setImgPrev(null);
      onCreated(row);
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div onClick={() => imgRef.current?.click()}
        className="flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer"
        style={{ background: brownLight, border: "1.5px dashed rgba(74,46,10,0.28)" }}>
        {imgPrev
          ? <img src={imgPrev} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(74,46,10,0.08)" }}>
              <ImageIcon className="w-6 h-6" style={{ color: sandDark }} />
            </div>}
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: brown }}>{imgPrev ? "Alterar imagem" : "Foto do produto"}</p>
          <p className="text-[11px]" style={{ color: sandDark }}>JPG, PNG · máx. 5 MB</p>
        </div>
        {imgPrev && (
          <button type="button" onClick={e => { e.stopPropagation(); setImgFile(null); setImgPrev(null); }}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(229,57,53,0.15)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "#E53935" }} />
          </button>
        )}
      </div>
      <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImg} />

      <div>
        <label className="block text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: brown }}>
          Nome do produto <span style={{ color: "#E53935" }}>*</span>
        </label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
          placeholder="Ex: Vestido de linho bege"
          className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
          style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: brown }}>
            Preço (Kz) <span style={{ color: "#E53935" }}>*</span>
          </label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="1" placeholder="0"
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
            style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
        </div>
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: brown }}>Categoria</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} maxLength={60}
            placeholder="Ex: Moda"
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
            style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
        </div>
      </div>

      {!compact && (
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: brown }}>Descrição</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} maxLength={300}
            placeholder="Breve descrição…"
            className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
            style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-black transition active:scale-95"
            style={{ background: brownLight, color: brown }}>Cancelar</button>
        )}
        <button onClick={handleCreate} disabled={loading || !title.trim() || !price}
          className="flex-1 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
          style={{ background: (loading || !title.trim() || !price) ? "#ccc" : `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />A criar…</> : <><ShoppingBag className="w-4 h-4" />Cadastrar produto</>}
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PAINEL OS MEUS PRODUTOS
═══════════════════════════════════════════════════ */
const MyProductsPanel = ({
  sellerId, onProductCreated,
}: { sellerId: string | null; onProductCreated: (p: any) => void }) => {
  const qc = useQueryClient();
  const [open,     setOpen]     = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: myProducts = [], isLoading } = useQuery({
    queryKey: ["my_products_active", sellerId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("products")
        .select("id, title, price, image_url, is_active, sales_count")
        .eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!sellerId,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("products").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_products_active", sellerId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${sandDark}`, background: cream }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-black/5"
        style={{ background: `linear-gradient(135deg,${brown},#2d1206)` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(245,200,66,0.18)" }}>
          <ShoppingBag className="w-4 h-4" style={{ color: gold }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-black text-white">Os meus produtos</p>
          <p className="text-[11px] text-white/60">
            {isLoading ? "A carregar…" : `${myProducts.length} produto${myProducts.length !== 1 ? "s" : ""} cadastrado${myProducts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!open && <span className="px-3 py-1 rounded-xl text-[11px] font-black" style={{ background: gold, color: brown }}>+ Novo produto</span>}
        {open ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
      </button>

      {open && (
        <div className="px-5 py-4">
          {showForm ? (
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: brown }}>
                <ListPlus className="w-3.5 h-3.5 inline mr-1.5" style={{ color: sandDark }} />
                Cadastrar novo produto
              </p>
              <ProductForm sellerId={sellerId} onCreated={p => { qc.invalidateQueries({ queryKey: ["my_products_active", sellerId] }); onProductCreated(p); setShowForm(false); }} onCancel={() => setShowForm(false)} />
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full mb-4 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
              <Plus className="w-4 h-4" /> Cadastrar produto novo
            </button>
          )}

          {!showForm && !isLoading && myProducts.length === 0 && (
            <div className="py-8 text-center rounded-2xl" style={{ background: brownLight, border: "1.5px dashed rgba(74,46,10,0.20)" }}>
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: sandDark, opacity: 0.5 }} />
              <p className="text-sm font-bold" style={{ color: brown }}>Nenhum produto ainda</p>
              <p className="text-[11px] mt-1" style={{ color: sandDark }}>Cadastra o primeiro produto para o destacar nos lançamentos.</p>
            </div>
          )}

          {!showForm && myProducts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: sandDark }}>
                <LayoutGrid className="w-3 h-3 inline mr-1" />Produtos cadastrados
              </p>
              {myProducts.map((p: any) => (
                <div key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${!p.is_active ? "opacity-50" : ""}`}
                  style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.12)" }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brownLight }}>
                        <Package className="w-5 h-5" style={{ color: sandDark }} />
                      </div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: brown }}>{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-black" style={{ color: sandDark }}>{Number(p.price).toLocaleString("pt-AO")} Kz</span>
                      {p.sales_count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: brownLight, color: brown }}>{p.sales_count} vend.</span>}
                    </div>
                  </div>
                  <button onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition flex-shrink-0"
                    style={{ background: p.is_active ? "rgba(34,197,94,0.12)" : brownLight, color: p.is_active ? "#16a34a" : sandDark }}>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MODAL — CRIAR LANÇAMENTO
═══════════════════════════════════════════════════ */
const CreateModal = ({
  onClose, products: initialProducts, sellerId, currentCount,
}: { onClose: () => void; products: any[]; sellerId: string | null; currentCount: number }) => {
  const qc = useQueryClient();
  const [coverUrl,       setCoverUrl]       = useState<string | null>(null);
  const [coverFile,      setCoverFile]      = useState<File | null>(null);
  const [videoUrl,       setVideoUrl]       = useState<string | null>(null);
  const [videoFile,      setVideoFile]      = useState<File | null>(null);
  const [videoDuration,  setVideoDuration]  = useState<number | null>(null);
  const [title,          setTitle]          = useState("");
  const [desc,           setDesc]           = useState("");
  const [datetime,       setDatetime]       = useState("");
  const [selectedProds,  setSelectedProds]  = useState<string[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [progress,       setProgress]       = useState<string | null>(null);
  const [done,           setDone]           = useState(false);
  const [showNewProd,    setShowNewProd]    = useState(false);
  const [availableProds, setAvailableProds] = useState<any[]>(initialProducts);
  const videoRef = useRef<HTMLInputElement>(null);
  const minDatetime = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 16);
  const slotsLeft = MAX_RELEASES - currentCount;

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { toast.error("Máx. 500 MB"); return; }
    try {
      const dur = await getVideoDuration(f);
      if (dur > MAX_VIDEO_SECONDS) { toast.error(`Vídeo tem ${fmtDuration(dur)} — limite é 7 minutos`); if (videoRef.current) videoRef.current.value = ""; return; }
      setVideoDuration(dur);
    } catch { toast.error("Não foi possível verificar o vídeo"); return; }
    setVideoUrl(URL.createObjectURL(f)); setVideoFile(f);
  };

  const handleNewProductCreated = (p: any) => {
    setAvailableProds(prev => [p, ...prev]);
    if (selectedProds.length < MAX_PRODUCTS_LINKED) setSelectedProds(prev => [p.id, ...prev]);
    setShowNewProd(false);
    qc.invalidateQueries({ queryKey: ["my_products_active", sellerId] });
  };

  const handleSubmit = async () => {
    if (!title.trim())  { toast.error("Adiciona um título"); return; }
    if (!coverUrl)      { toast.error("A capa é obrigatória"); return; }
    if (!videoFile)     { toast.error("O vídeo é obrigatório"); return; }
    if (!datetime)      { toast.error("Define a data de transmissão"); return; }
    if (new Date(datetime) <= new Date()) { toast.error("A data deve ser no futuro"); return; }
    if (!sellerId)      { toast.error("Conta de vendedor não encontrada"); return; }
    if (currentCount >= MAX_RELEASES) { toast.error("Limite atingido"); return; }
    setLoading(true);
    try {
      let thumbnail_url: string | null = null;
      let video_url: string | null = null;
      if (coverFile) {
        setProgress("A carregar capa…");
        const ext = coverFile.name.split(".").pop();
        const path = `release-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await (supabase as any).storage.from(STORAGE_BUCKET).upload(path, coverFile);
        if (error) throw new Error(error.message);
        const { data } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        thumbnail_url = data?.publicUrl ?? null;
      }
      if (videoFile) {
        setProgress(`A carregar vídeo (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)…`);
        const ext = videoFile.name.split(".").pop();
        const path = `release-videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await (supabase as any).storage.from(STORAGE_BUCKET).upload(path, videoFile);
        if (error) throw new Error(error.message);
        const { data } = (supabase as any).storage.from(STORAGE_BUCKET).getPublicUrl(path);
        video_url = data?.publicUrl ?? null;
      }
      setProgress("A publicar…");
      const { data: rows, error } = await (supabase as any).from("releases").insert({
        seller_id: sellerId, title: title.trim(), description: desc.trim() || null,
        thumbnail_url, video_url, video_duration_s: videoDuration ? Math.floor(videoDuration) : null,
        broadcasts_at: new Date(datetime).toISOString(), status: "scheduled",
        linked_product_ids: selectedProds.length ? selectedProds : null,
        views_count: 0, likes_count: 0, comments_count: 0,
      }).select("*, seller:sellers(id, name, logo_url, is_verified)");
      if (error) throw new Error(error.message);
      let linkedProducts: any[] = [];
      if (selectedProds.length) {
        const { data: prods } = await (supabase as any).from("products").select("id, title, price, image_url, slug").in("id", selectedProds);
        linkedProducts = prods || [];
      }
      const newRecord = { ...(rows?.[0] ?? {}), linked_products: linkedProducts };
      qc.setQueryData(["releases_all"], (old: any[] = []) => [newRecord, ...old.filter((r: any) => r.id !== newRecord.id)]);
      setTimeout(() => { qc.invalidateQueries({ queryKey: ["releases_all"] }); qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] }); }, 2000);
      setDone(true); toast.success("Lançamento publicado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally { setLoading(false); setProgress(null); }
  };

  if (done) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl" style={{ background: cream }} onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: brownLight }}>
          <Check className="w-8 h-8" style={{ color: brown }} />
        </div>
        <h3 className="text-lg font-black mb-1" style={{ color: brown }}>Lançamento publicado!</h3>
        <p className="text-sm mb-6" style={{ color: sandDark }}>Será transmitido na data e hora agendada.</p>
        <button onClick={onClose} className="w-full py-3 rounded-2xl text-sm font-black text-white"
          style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>Fechar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: cream, maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${sandDark} 0%, ${brown} 100%)` }}>
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-base font-black text-white">Novo lançamento</h2>
              <p className="text-[10px] text-white/70">{slotsLeft > 0 ? `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} restante${slotsLeft !== 1 ? "s" : ""}` : "Limite atingido"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        {currentCount >= MAX_RELEASES && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-2xl flex items-center gap-2" style={{ background: "rgba(229,57,53,0.10)", border: "1px solid rgba(229,57,53,0.25)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#E53935" }} />
            <p className="text-xs" style={{ color: "#E53935" }}><strong>Limite atingido.</strong> Elimina um lançamento para publicar novo.</p>
          </div>
        )}
        <div className="px-6 py-5">
          <CoverUpload value={coverUrl} onChange={(u, f) => { setCoverUrl(u); setCoverFile(f); }} />
          <div className="mb-5">
            <label className="block text-xs font-black mb-2 uppercase tracking-wider" style={{ color: brown }}>
              Vídeo <span style={{ color: "#E53935" }}>*</span>{" "}
              <span className="text-[10px] font-normal normal-case" style={{ color: sandDark }}>máx. 7 min · 500 MB</span>
            </label>
            {videoUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black">
                <video src={videoUrl} controls className="w-full max-h-44 object-contain" />
                <button type="button" onClick={() => { setVideoUrl(null); setVideoFile(null); setVideoDuration(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.65)" }}>
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {videoDuration !== null && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: "rgba(0,0,0,0.65)" }}>{fmtDuration(videoDuration)}</span>
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
            <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideoFile} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>Título <span style={{ color: "#E53935" }}>*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder="Ex: Nova colecção de Verão 2025"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>Data de transmissão <span style={{ color: "#E53935" }}>*</span></label>
            <input type="datetime-local" value={datetime} min={minDatetime} onChange={e => setDatetime(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>Descrição</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={500}
              placeholder="Descreve o teu lançamento…"
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1" style={{ color: brown }}>
                <Package className="w-3.5 h-3.5" style={{ color: sandDark }} />
                Produtos em destaque <span className="font-normal normal-case text-[10px]" style={{ color: sandDark }}>({selectedProds.length}/{MAX_PRODUCTS_LINKED})</span>
              </label>
              {!showNewProd && (
                <button onClick={() => setShowNewProd(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                  style={{ background: `linear-gradient(135deg,${sandDark},${brown})`, color: "#fff" }}>
                  <Plus className="w-3 h-3" /> Novo produto
                </button>
              )}
            </div>
            {showNewProd && (
              <div className="mb-3 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${sandDark}`, background: "#fff" }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: brownLight, borderBottom: "1px solid rgba(74,46,10,0.12)" }}>
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: brown }}>Novo produto</span>
                  <button onClick={() => setShowNewProd(false)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: brownLight }}>
                    <X className="w-3.5 h-3.5" style={{ color: brown }} />
                  </button>
                </div>
                <div className="p-4">
                  <ProductForm sellerId={sellerId} compact onCreated={handleNewProductCreated} onCancel={() => setShowNewProd(false)} />
                </div>
              </div>
            )}
            {availableProds.length > 0 && !showNewProd && <ProductPicker products={availableProds} selected={selectedProds} onChange={setSelectedProds} />}
            {availableProds.length === 0 && !showNewProd && (
              <div className="px-4 py-5 rounded-2xl text-center" style={{ background: brownLight, border: "1.5px dashed rgba(74,46,10,0.20)" }}>
                <Package className="w-6 h-6 mx-auto mb-2" style={{ color: sandDark, opacity: 0.6 }} />
                <p className="text-xs font-bold mb-1" style={{ color: brown }}>Sem produtos ainda</p>
                <p className="text-[10px]" style={{ color: sandDark }}>Usa o botão "Novo produto" acima ou cadastra na secção da página.</p>
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={loading || !sellerId || currentCount >= MAX_RELEASES || showNewProd}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{ background: (loading || !sellerId || currentCount >= MAX_RELEASES || showNewProd) ? "#ccc" : `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{progress || "A guardar…"}</> : showNewProd ? "Finaliza o produto antes de publicar" : <><Film className="w-4 h-4" />Publicar lançamento</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   COMMENT ITEM
═══════════════════════════════════════════════════ */
const CommentItem = ({ comment, isOwner }: { comment: any; isOwner?: boolean }) => (
  <div className="flex items-start gap-2.5 py-2.5">
    {comment.user_avatar
      ? <img src={comment.user_avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
      : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
          style={{ background: isOwner ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)", color: "#fff" }}>
          {(comment.user_name || "?").charAt(0).toUpperCase()}
        </div>}
    <div className="flex-1 min-w-0">
      <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
        <span className="text-xs font-black text-white">{comment.user_name || "Utilizador"}</span>
        {isOwner && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.20)", color: "#fff" }}>autor</span>}
        <span className="text-[10px] text-white/50">{new Date(comment.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="text-xs leading-relaxed text-white/90">{comment.content}</p>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════
   FULLSCREEN VIDEO PLAYER — ecrã imersivo tipo TikTok
   Ocupa 100dvh × 100dvw, vídeo em fundo, controlos
   sobrepostos como moldura nas margens.
═══════════════════════════════════════════════════ */
const FullscreenPlayer = ({
  release, onClose, userId,
}: { release: any; onClose: () => void; userId: string | null }) => {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const videoRef   = useRef<HTMLVideoElement>(null);
  const commentListRef = useRef<HTMLDivElement>(null);

  const [playing,      setPlaying]      = useState(true);
  const [muted,        setMuted]        = useState(false);
  const [progress,     setProgress]     = useState(0);       // 0–1
  const [duration,     setDuration]     = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [comment,      setComment]      = useState("");
  const [liked,        setLiked]        = useState(false);
  const [notified,     setNotified]     = useState(false);
  const [controlsVis,  setControlsVis]  = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const live     = isLive(release);
  const upcoming = isUpcoming(release);
  const expired  = isExpired(release);
  const canPlay  = (live || expired) && !!release.video_url;

  /* Perfil do utilizador */
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle();
      return data ?? null;
    },
    enabled: !!userId,
  });

  /* Comentários */
  const { data: comments = [] } = useQuery({
    queryKey: ["release_comments", release.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("release_comments").select("*").eq("release_id", release.id)
        .order("created_at", { ascending: true }).limit(200);
      return data || [];
    },
    enabled: !upcoming,
    refetchInterval: live ? 5000 : false,
  });

  useEffect(() => {
    if (commentListRef.current) commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
  }, [comments.length]);

  /* Registar view */
  useEffect(() => {
    if (!release?.id || upcoming) return;
    (supabase as any).from("release_views").insert({ release_id: release.id, user_id: userId });
    (supabase as any).from("releases").update({ views_count: (release.views_count || 0) + 1 }).eq("id", release.id);
  }, [release?.id]);

  /* Auto-hide controlos */
  const resetHideTimer = useCallback(() => {
    setControlsVis(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (canPlay && !showComments && !showProducts) {
      hideTimer.current = setTimeout(() => setControlsVis(false), 3500);
    }
  }, [canPlay, showComments, showProducts]);

  useEffect(() => { resetHideTimer(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [resetHideTimer]);

  /* Bloquear scroll da página */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Progressão do vídeo */
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
    setDuration(v.duration);
  };

  const handleVideoEnded = useCallback(async () => {
    if (!live || !release?.id) return;
    await (supabase as any).from("releases").update({ first_broadcast_ended_at: new Date().toISOString() }).eq("id", release.id);
    qc.invalidateQueries({ queryKey: ["releases_all"] });
  }, [live, release?.id, qc]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    resetHideTimer();
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
    resetHideTimer();
  };

  const sendComment = async () => {
    if (!userId) { navigate("/auth"); return; }
    const text = comment.trim();
    if (!text) return;
    setComment("");
    await (supabase as any).from("release_comments").insert({
      release_id: release.id, user_id: userId,
      user_name: profile?.full_name || "Utilizador",
      user_avatar: profile?.avatar_url || null,
      content: text,
    });
    qc.invalidateQueries({ queryKey: ["release_comments", release.id] });
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black flex items-center justify-center"
      style={{ width: "100dvw", height: "100dvh" }}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}>

      {/* ── VÍDEO / FUNDO ── */}
      {canPlay && (
        <video
          ref={videoRef}
          src={release.video_url}
          autoPlay={live || expired}
          playsInline
          muted={muted}
          loop={expired}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
          onEnded={handleVideoEnded}
          onClick={togglePlay}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "contain", cursor: "pointer" }}
        />
      )}

      {/* Capa desbotada quando agendado */}
      {upcoming && release.thumbnail_url && (
        <img src={release.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
      )}
      {/* Gradientes para legibilidade */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.75) 100%)" }} />

      {/* ════════════════════════════════════════════
          MOLDURA SUPERIOR — topo
      ════════════════════════════════════════════ */}
      <div className={`absolute top-0 left-0 right-0 px-4 pt-safe-top pt-4 pb-3 flex items-center gap-3 transition-opacity duration-300 ${controlsVis ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Fechar */}
        <button onClick={onClose}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Info do lançamento */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {release.seller?.logo_url
              ? <img src={release.seller.logo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white/30 flex-shrink-0" />
              : <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.20)", color: "#fff" }}>
                  {(release.seller?.name || "?").charAt(0)}
                </div>}
            <div className="min-w-0">
              <p className="text-[11px] text-white/70 font-bold truncate">{release.seller?.name}</p>
              <p className="text-sm font-black text-white truncate leading-tight">{release.title}</p>
            </div>
          </div>
        </div>

        {/* Badges estado */}
        {live && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: "#E53935", backdropFilter: "blur(8px)" }}>
            <PulseDot color="#fff" />
            <span className="text-[11px] font-black text-white">AO VIVO</span>
          </div>
        )}
        {expired && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: "rgba(60,60,60,0.80)", backdropFilter: "blur(8px)" }}>
            <span className="text-[11px] font-bold text-white/80">TERMINADO</span>
          </div>
        )}
        {upcoming && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: "rgba(74,46,10,0.80)", backdropFilter: "blur(8px)" }}>
            <Clock className="w-3.5 h-3.5 text-white/80" />
            <span className="text-[11px] font-bold text-white/90">{fmtDate(release.broadcasts_at)}</span>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          CENTRO — play/pause tap (invisível)
      ════════════════════════════════════════════ */}
      {canPlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${!playing || !controlsVis ? "opacity-0" : "opacity-0"}`}
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
            {playing ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          BARRA LATERAL DIREITA — acções
      ════════════════════════════════════════════ */}
      <div className={`absolute right-4 flex flex-col items-center gap-5 transition-opacity duration-300 ${controlsVis ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}>

        {/* Like */}
        <button onClick={() => { setLiked(v => !v); resetHideTimer(); }}
          className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: liked ? "rgba(229,57,53,0.30)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: liked ? "1px solid rgba(229,57,53,0.60)" : "1px solid rgba(255,255,255,0.15)" }}>
            <Heart className={`w-5 h-5 ${liked ? "text-red-400 fill-red-400" : "text-white"}`} />
          </div>
          <span className="text-[10px] font-black text-white drop-shadow">{(release.likes_count || 0) + (liked ? 1 : 0)}</span>
        </button>

        {/* Comentários */}
        <button onClick={() => { setShowComments(v => !v); setShowProducts(false); resetHideTimer(); }}
          className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: showComments ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-black text-white drop-shadow">{comments.length}</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-black text-white drop-shadow">{(release.views_count || 0).toLocaleString("pt-AO")}</span>
        </div>

        {/* Produtos */}
        {release.linked_products?.length > 0 && (
          <button onClick={() => { setShowProducts(v => !v); setShowComments(false); resetHideTimer(); }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: showProducts ? `rgba(245,200,66,0.35)` : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: showProducts ? `1px solid ${gold}` : "1px solid rgba(255,255,255,0.15)" }}>
              <ShoppingBag className="w-5 h-5" style={{ color: showProducts ? gold : "#fff" }} />
            </div>
            <span className="text-[10px] font-black text-white drop-shadow">{release.linked_products.length}</span>
          </button>
        )}

        {/* Mudo/Som */}
        {canPlay && (
          <button onClick={() => { setMuted(v => !v); resetHideTimer(); }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
              {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </div>
          </button>
        )}

        {/* Lembrete (agendado) */}
        {upcoming && (
          <button onClick={() => { setNotified(v => !v); toast.success(notified ? "Lembrete removido" : "Vais ser notificado!"); resetHideTimer(); }}
            className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: notified ? "rgba(245,200,66,0.25)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: `1px solid ${notified ? gold : "rgba(255,255,255,0.15)"}` }}>
              {notified ? <BellOff className="w-5 h-5" style={{ color: gold }} /> : <Bell className="w-5 h-5 text-white" />}
            </div>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════
          RODAPÉ — descrição + progressão
      ════════════════════════════════════════════ */}
      <div className={`absolute left-0 right-0 px-4 transition-opacity duration-300 ${controlsVis ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>

        {/* Descrição */}
        {release.description && (
          <p className="text-white/80 text-xs mb-3 line-clamp-2 max-w-xs drop-shadow">{release.description}</p>
        )}

        {/* Barra de progresso — apenas com vídeo */}
        {canPlay && duration > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] text-white/60 mb-1.5">
              <span>{fmtTime((progress * duration) || 0)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
            <div className="w-full h-1 rounded-full cursor-pointer"
              style={{ background: "rgba(255,255,255,0.25)" }}
              onClick={seekTo}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${gold}, ${sandDark})` }} />
            </div>
          </div>
        )}

        {/* Controlos play/mute na barra */}
        {canPlay && (
          <div className="flex items-center gap-3">
            <button onClick={togglePlay}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
            </button>
            <div className="text-xs text-white/70 flex-1 truncate">
              {live ? "🔴 Em directo" : expired ? "Reprodução completa disponível" : ""}
            </div>
          </div>
        )}

        {/* Placeholder agendado */}
        {upcoming && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Calendar className="w-5 h-5 text-white/60 flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-white">Transmissão agendada</p>
              <p className="text-[11px] text-white/60">{fmtDate(release.broadcasts_at)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          PAINEL LATERAL — COMENTÁRIOS
          Desliza da direita sobre o vídeo
      ════════════════════════════════════════════ */}
      <div className={`absolute top-0 right-0 bottom-0 flex flex-col transition-transform duration-300 ease-out ${showComments ? "translate-x-0" : "translate-x-full"}`}
        style={{ width: "min(360px, 100vw)", background: "rgba(10,5,2,0.88)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-black text-white">Comentários {comments.length > 0 && `(${comments.length})`}</p>
          <button onClick={() => setShowComments(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div ref={commentListRef} className="flex-1 overflow-y-auto px-4 py-2">
          {comments.length === 0 && (
            <div className="py-12 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <p className="text-xs text-white/40">{upcoming ? "Os comentários abrem na transmissão" : "Nenhum comentário ainda"}</p>
            </div>
          )}
          {!upcoming && comments.map((c: any) => <CommentItem key={c.id} comment={c} isOwner={c.user_id === release.seller?.user_id} />)}
        </div>
        {!upcoming && (
          <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                  {(profile?.full_name || "?").charAt(0).toUpperCase()}
                </div>}
            <input type="text" value={comment} onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendComment()}
              placeholder="Escreve um comentário…"
              className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={sendComment} disabled={!comment.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95"
              style={{ background: comment.trim() ? `linear-gradient(135deg,${sandDark},${brown})` : "rgba(255,255,255,0.08)" }}>
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          PAINEL LATERAL — PRODUTOS
          Desliza da esquerda/baixo sobre o vídeo
      ════════════════════════════════════════════ */}
      <div className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${showProducts ? "translate-y-0" : "translate-y-full"}`}
        style={{ background: "rgba(10,5,2,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.10)", borderRadius: "20px 20px 0 0", maxHeight: "55vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <p className="text-sm font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: gold }} />
            Produtos em destaque
          </p>
          <button onClick={() => setShowProducts(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.10)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-6" style={{ flex: 1 }}>
          {release.linked_products?.map((p: any) => (
            <div key={p.id}
              onClick={() => { onClose(); navigate(`/produto/${p.id}`); }}
              className="flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl cursor-pointer transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {p.image_url
                ? <img src={p.image_url} alt={p.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <Package className="w-5 h-5 text-white/40" />
                  </div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.title}</p>
                <p className="text-xs font-black mt-0.5" style={{ color: gold }}>{Number(p.price).toLocaleString("pt-AO")} Kz</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg,${sandDark},${brown})` }}>
                <ArrowLeft className="w-4 h-4 text-white rotate-180" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

/* ═══════════════════════════════════════════════════
   RELEASE CARD
═══════════════════════════════════════════════════ */
const ReleaseCard = ({
  release, onClick, onDelete, canDelete,
}: { release: any; onClick: () => void; onDelete?: () => void; canDelete?: boolean }) => {
  const live     = isLive(release);
  const upcoming = isUpcoming(release);
  const expired  = isExpired(release);

  return (
    <div onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      style={{ background: cream }}>
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        {release.thumbnail_url
          ? <img src={release.thumbnail_url} alt={release.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${expired ? "opacity-75" : ""}`} loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00)" }}>
              <Film className="w-10 h-10 opacity-20 text-white" />
            </div>}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        {live && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "#E53935" }}>
            <PulseDot color="#fff" /><span className="text-[10px] font-black text-white">AO VIVO</span>
          </div>
        )}
        {upcoming && !live && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(74,46,10,0.80)" }}>
            <Clock className="w-3 h-3 text-white/80" />
            <span className="text-[10px] font-bold text-white">{fmtDate(release.broadcasts_at)}</span>
          </div>
        )}
        {expired && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg" style={{ background: "rgba(40,40,40,0.80)" }}>
            <span className="text-[10px] font-bold text-white">TERMINADO</span>
          </div>
        )}
        {release.video_duration_s && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.72)" }}>
            <span className="text-[10px] text-white font-bold">{fmtDuration(release.video_duration_s)}</span>
          </div>
        )}
        {!upcoming && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl" style={{ background: "rgba(255,255,255,0.92)" }}>
              <Play className="w-6 h-6 ml-1" style={{ color: brown }} />
            </div>
          </div>
        )}
        {release.linked_products?.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.65)" }}>
            <Package className="w-3 h-3" style={{ color: gold }} />
            <span className="text-[10px] text-white font-bold">{release.linked_products.length} produto{release.linked_products.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {canDelete && onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
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
        <div className="flex items-center gap-2 text-[11px]" style={{ color: sandDark }}>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg font-black" style={{ background: brownLight, color: brown }}>
            <Eye className="w-3 h-3" />{(release.views_count || 0).toLocaleString("pt-AO")}
          </span>
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

  const [activeRelease, setActiveRelease] = useState<any>(null);  // abre fullscreen player
  const [showCreate,    setShowCreate]    = useState(false);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<"all" | "live" | "upcoming" | "ended">("all");

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

  const { data: myCount = 0 } = useQuery({
    queryKey: ["my_releases_count", sellerId],
    queryFn: async () => {
      const { count } = await (supabase as any).from("releases").select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId).neq("status", "deleted");
      return count || 0;
    },
    enabled: !!sellerId,
  });

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["releases_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("releases")
        .select("*, seller:sellers(id, name, logo_url, is_verified, user_id)")
        .neq("status", "deleted").order("broadcasts_at", { ascending: true }).limit(60);
      if (error) console.error("releases:", error.message);
      if (!data?.length) return [];
      const allProdIds = [...new Set(data.flatMap((r: any) => r.linked_product_ids || []))];
      let prodMap: Record<string, any> = {};
      if (allProdIds.length) {
        const { data: prods } = await (supabase as any).from("products")
          .select("id, title, price, image_url, slug").in("id", allProdIds);
        (prods || []).forEach((p: any) => { prodMap[p.id] = p; });
      }
      return data.map((r: any) => ({
        ...r, linked_products: (r.linked_product_ids || []).map((id: string) => prodMap[id]).filter(Boolean),
      }));
    },
    refetchInterval: 15000, staleTime: 0,
  });

  const { data: myProducts = [] } = useQuery({
    queryKey: ["my_products_active", sellerId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("products")
        .select("id, title, price, image_url").eq("seller_id", sellerId).eq("is_active", true).limit(50);
      return data || [];
    },
    enabled: canPublish && !!sellerId,
  });

  const [modalProducts, setModalProducts] = useState<any[]>([]);
  useEffect(() => { setModalProducts(myProducts); }, [myProducts]);

  useEffect(() => {
    const ch = (supabase as any).channel("releases_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "releases" }, () => {
        qc.invalidateQueries({ queryKey: ["releases_all"] });
        qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
      }).subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [qc, sellerId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este lançamento?")) return;
    const { error } = await (supabase as any).from("releases").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Erro ao eliminar"); return; }
    qc.setQueryData(["releases_all"], (old: any[] = []) => old.filter((r: any) => r.id !== id));
    qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
    toast.success("Lançamento eliminado");
  };

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

      {/* HEADER */}
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
            <div className="flex-1 flex items-center rounded-2xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.10)" }}>
              <Hash className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar lançamentos…"
                className="flex-1 py-2.5 px-2.5 text-sm bg-transparent focus:outline-none" style={{ color: brown }} />
              {search && <button onClick={() => setSearch("")} className="mr-2"><X className="w-4 h-4" style={{ color: sandDark }} /></button>}
            </div>
            {canPublish && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black text-white flex-shrink-0 transition active:scale-95"
                style={{ background: myCount >= MAX_RELEASES ? "#ccc" : `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
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

          {/* Filtros */}
          <div className="flex items-center gap-2 mt-3 pb-1 overflow-x-auto no-scrollbar">
            {[
              { key: "all",      label: "Todos",         count: releases.length },
              { key: "live",     label: "Ao vivo agora", count: liveNow.length  },
              { key: "upcoming", label: "Próximos",      count: upcoming.length },
              { key: "ended",    label: "Terminados",    count: ended.length    },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: filter === f.key ? brown : "rgba(74,46,10,0.10)", color: filter === f.key ? "white" : brown,
                  border: `1px solid ${filter === f.key ? "transparent" : "rgba(74,46,10,0.15)"}` }}>
                {f.key === "live" && f.count > 0 && <PulseDot color={filter === f.key ? "#fff" : "#E53935"} />}
                {f.label}
                {f.count > 0 && (
                  <span className="px-1.5 rounded-full text-[10px]"
                    style={{ background: filter === f.key ? "rgba(255,255,255,0.20)" : brownLight, color: filter === f.key ? "white" : brown }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-5">

        {/* Painel produtos do vendedor */}
        {canPublish && sellerId && (
          <MyProductsPanel sellerId={sellerId} onProductCreated={p => setModalProducts(prev => [p, ...prev])} />
        )}

        {/* Banner slots */}
        {canPublish && (
          <div className="mb-6 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{ background: `linear-gradient(135deg,${brown} 0%,#2d1206 100%)` }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,200,66,0.15)" }}>
                <Zap className="w-5 h-5" style={{ color: gold }} />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {myCount >= MAX_RELEASES ? "Limite atingido — elimina um lançamento para publicar novo"
                    : `${MAX_RELEASES - myCount} slot${MAX_RELEASES - myCount !== 1 ? "s" : ""} disponível${MAX_RELEASES - myCount !== 1 ? "s" : ""}`}
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Cadastra produtos acima · vincula ao lançamento · vídeo máx. 7 min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              {Array.from({ length: MAX_RELEASES }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full"
                  style={{ background: i < myCount ? gold : "rgba(255,255,255,0.20)" }} />
              ))}
              <button onClick={() => setShowCreate(true)} disabled={myCount >= MAX_RELEASES}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.15)" : gold, color: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.5)" : brown }}>
                <Plus className="w-3.5 h-3.5" /> Novo
              </button>
            </div>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: sandDark }} /></div>}

        {!isLoading && (
          <>
            {/* Ao vivo agora */}
            {filter === "all" && liveNow.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#E53935" }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#E53935" }} />
                  </span>
                  <h2 className="text-base font-black" style={{ color: brown }}>Ao vivo agora</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(229,57,53,0.10)", color: "#E53935" }}>{liveNow.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveNow.map((r: any) => (
                    <ReleaseCard key={r.id} release={r} onClick={() => setActiveRelease(r)}
                      canDelete={canPublish && r.seller_id === sellerId} onDelete={() => handleDelete(r.id)} />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                <Film className="w-10 h-10 mx-auto mb-3" style={{ color: sandDark, opacity: 0.4 }} />
                <p className="text-sm font-bold" style={{ color: sandDark }}>{search ? "Sem resultados" : "Nenhum lançamento"}</p>
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
                  <ReleaseCard key={r.id} release={r} onClick={() => setActiveRelease(r)}
                    canDelete={canPublish && r.seller_id === sellerId} onDelete={() => handleDelete(r.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      {/* FULLSCREEN PLAYER — monta sobre tudo */}
      {activeRelease && (
        <FullscreenPlayer
          release={activeRelease}
          onClose={() => setActiveRelease(null)}
          userId={user?.id ?? null}
        />
      )}

      {/* MODAL CRIAR LANÇAMENTO */}
      {showCreate && canPublish && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          products={modalProducts}
          sellerId={sellerId}
          currentCount={myCount}
        />
      )}
    </div>
  );
};

export default Lancamentos;
