import { useState, useRef, useEffect } from "react";
import {
  Plus, Trash2, CheckCircle, XCircle, Eye, EyeOff,
  Video, ImageIcon, Store, Building2, ShoppingBag,
  Gavel, TrendingDown, Upload, Loader2, Edit2, X,
  CalendarDays, Banknote, Play, Pause, ChevronLeft, ChevronRight,
  Megaphone, Save, AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Constantes ────────────────────────────────────────────────────────────────
const PRICE_PER_DAY = 3000;

type AdType = "video" | "image" | "seller" | "company" | "product" | "auction" | "auction_ended";

const AD_TYPES: { value: AdType; label: string; icon: any; color: string; desc: string }[] = [
  { value: "image",         label: "Imagem",            icon: ImageIcon,    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",     desc: "Banner estático ou animado" },
  { value: "video",         label: "Vídeo",             icon: Video,        color: "text-purple-500 bg-purple-500/10 border-purple-500/20", desc: "Vídeo promocional" },
  { value: "seller",        label: "Vendedor",          icon: Store,        color: "text-green-500 bg-green-500/10 border-green-500/20",   desc: "Perfil de vendedor verificado" },
  { value: "company",       label: "Empresa",           icon: Building2,    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",   desc: "Página de empresa" },
  { value: "product",       label: "Produto",           icon: ShoppingBag,  color: "text-pink-500 bg-pink-500/10 border-pink-500/20",      desc: "Produto patrocinado" },
  { value: "auction",       label: "Leilão Ativo",      icon: Gavel,        color: "text-red-500 bg-red-500/10 border-red-500/20",         desc: "Leilão a decorrer" },
  { value: "auction_ended", label: "Leilão Finalizado", icon: TrendingDown, color: "text-slate-500 bg-slate-500/10 border-slate-500/20",   desc: '"O que perdeste"' },
];

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-500/10 text-green-500 border-green-500/20",
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  expired:   "bg-red-500/10 text-red-500 border-red-500/20",
  paused:    "bg-amber-500/10 text-amber-500 border-amber-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", scheduled: "Agendado", expired: "Expirado", paused: "Pausado",
};

const emptyForm = {
  type: "image" as AdType,
  title: "",
  description: "",
  media_url: "",
  days_paid: 1,
  start_date: new Date().toISOString().split("T")[0],
  seller_id: "",
  company_id: "",
  product_id: "",
  auction_id: "",
  show_on_product_page: true,
  display_order: 0,
};

// ── Calcula computed_status no cliente ────────────────────────────────────────
const computeStatus = (a: any): string => {
  if (!a.is_active) return "paused";
  const today = new Date().toISOString().split("T")[0];
  if (a.end_date && a.end_date < today) return "expired";
  if (a.start_date && a.start_date > today) return "scheduled";
  return "active";
};

// ── Mini Carrossel de Preview ─────────────────────────────────────────────────
const AdsCarouselPreview = ({ ads }: { ads: any[] }) => {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || ads.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 4000);
    return () => clearInterval(t);
  }, [playing, ads.length]);

  if (ads.length === 0) {
    return (
      <div className="bg-muted rounded-xl border border-border p-8 text-center mb-4">
        <Megaphone className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum anúncio ativo</p>
        <p className="text-[10px] text-muted-foreground mt-1">Os anúncios aparecerão aqui em carrossel</p>
      </div>
    );
  }

  const ad = ads[idx];
  const typeInfo = AD_TYPES.find(t => t.value === ad.type);
  const TypeIcon = typeInfo?.icon || ImageIcon;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Preview do Carrossel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{idx + 1}/{ads.length}</span>
          <button onClick={() => setPlaying(!playing)} className="p-1 rounded text-muted-foreground hover:text-foreground">
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/7] bg-muted overflow-hidden">
        {ad.type === "video" && ad.media_url ? (
          <video src={ad.media_url} autoPlay muted loop className="w-full h-full object-cover" />
        ) : ad.media_url ? (
          <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
        ) : ad.type === "seller" && ad.seller_avatar ? (
          <img src={ad.seller_avatar} alt={ad.seller_name} className="w-full h-full object-cover" />
        ) : ad.type === "company" && ad.company_cover ? (
          <img src={ad.company_cover} alt={ad.company_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${typeInfo?.color || ""}`}>
            <TypeIcon className="w-10 h-10 opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeInfo?.color}`}>
              {typeInfo?.label}
            </span>
            {ad.computed_status && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[ad.computed_status] || ""}`}>
                {STATUS_LABEL[ad.computed_status]}
              </span>
            )}
          </div>
          <p className="text-white text-sm font-bold leading-tight line-clamp-1">{ad.title}</p>
          {ad.description && <p className="text-white/70 text-[10px] line-clamp-1 mt-0.5">{ad.description}</p>}
        </div>
        {ads.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + ads.length) % ads.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % ads.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {ads.length > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {ads.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"}`} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Render de um anúncio na lista ─────────────────────────────────────────────
const AdCard = ({
  ad, onEdit, onToggle, onDelete
}: { ad: any; onEdit: () => void; onToggle: () => void; onDelete: () => void }) => {
  const typeInfo = AD_TYPES.find(t => t.value === ad.type);
  const TypeIcon = typeInfo?.icon || ImageIcon;
  const thumb = ad.media_url || ad.seller_avatar || ad.company_cover || null;

  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden ${ad.computed_status === "expired" ? "opacity-50" : ""}`}>
      <div className="flex gap-3 p-3">
        <div className={`w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden border border-border ${typeInfo?.color || "bg-muted"}`}>
          {thumb
            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><TypeIcon className="w-6 h-6 opacity-60" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${STATUS_BADGE[ad.computed_status] || ""}`}>
              {STATUS_LABEL[ad.computed_status] || ad.computed_status}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeInfo?.color}`}>
              {typeInfo?.label}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <CalendarDays className="w-3 h-3" />
              {ad.days_paid}d • {new Date(ad.start_date).toLocaleDateString("pt-AO")} → {ad.end_date ? new Date(ad.end_date).toLocaleDateString("pt-AO") : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Banknote className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-bold text-green-500">
              {Number(ad.total_paid || 0).toLocaleString("pt-AO")} Kz
            </span>
            <span className="text-[10px] text-muted-foreground">({PRICE_PER_DAY.toLocaleString("pt-AO")} Kz/dia)</span>
          </div>
        </div>
      </div>
      <div className="flex border-t border-border">
        <button onClick={onToggle}
          className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition
            ${ad.is_active ? "text-green-500 hover:bg-green-500/5" : "text-muted-foreground hover:bg-muted"}`}>
          {ad.is_active ? <><Eye className="w-3.5 h-3.5" /> Ativo</> : <><EyeOff className="w-3.5 h-3.5" /> Pausado</>}
        </button>
        <button onClick={onEdit}
          className="flex-1 py-2 text-[10px] font-bold text-primary flex items-center justify-center gap-1 hover:bg-primary/5 border-x border-border">
          <Edit2 className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={onDelete}
          className="flex-1 py-2 text-[10px] font-bold text-destructive flex items-center justify-center gap-1 hover:bg-destructive/5">
          <Trash2 className="w-3.5 h-3.5" /> Remover
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
const AdminAdsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<AdType | "all">("all");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin_advertisements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select("*, sellers(name, avatar_url), companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        seller_name: a.sellers?.name,
        seller_avatar: a.sellers?.avatar_url,
        company_name: a.companies?.name,
        computed_status: computeStatus(a),
      }));
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["ads_sellers_list"],
    queryFn: async () => {
      const { data } = await supabase.from("sellers").select("id, name, avatar_url").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["ads_companies_list"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["ads_products_list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products").select("id, title").eq("is_active", true).order("title").limit(100);
      return data || [];
    },
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["ads_auctions_list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auctions").select("id, title, status").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  // ── Upload ───────────────────────────────────────────────────────────────
  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error } = await (supabase as any).storage.from("advertisements").upload(path, file);
      if (error) throw error;
      const { data } = (supabase as any).storage.from("advertisements").getPublicUrl(path);
      setForm(f => ({ ...f, media_url: data.publicUrl }));
      toast.success("Ficheiro enviado!");
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveAd = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Título obrigatório");
      const payload: any = {
        type: form.type,
        title: form.title,
        description: form.description || null,
        media_url: form.media_url || null,
        media_type: form.type === "video" ? "video" : "image",
        days_paid: form.days_paid,
        price_per_day: PRICE_PER_DAY,
        start_date: form.start_date,
        seller_id: form.seller_id || null,
        company_id: form.company_id || null,
        product_id: form.product_id || null,
        auction_id: form.auction_id || null,
        show_on_product_page: form.show_on_product_page,
        display_order: form.display_order,
        is_active: true,
        created_by: user!.id,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("advertisements").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("advertisements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_advertisements"] });
      queryClient.invalidateQueries({ queryKey: ["active_advertisements"] });
      toast.success(editingId ? "Anúncio atualizado!" : "Anúncio criado!");
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("advertisements").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_advertisements"] });
      queryClient.invalidateQueries({ queryKey: ["active_advertisements"] });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("advertisements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_advertisements"] });
      queryClient.invalidateQueries({ queryKey: ["active_advertisements"] });
      toast.success("Anúncio removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (ad: any) => {
    setEditingId(ad.id);
    setForm({
      type: ad.type,
      title: ad.title || "",
      description: ad.description || "",
      media_url: ad.media_url || "",
      days_paid: ad.days_paid || 1,
      start_date: ad.start_date || new Date().toISOString().split("T")[0],
      seller_id: ad.seller_id || "",
      company_id: ad.company_id || "",
      product_id: ad.product_id || "",
      auction_id: ad.auction_id || "",
      show_on_product_page: ad.show_on_product_page ?? true,
      display_order: ad.display_order || 0,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const activeAds    = ads.filter((a: any) => a.computed_status === "active");
  const totalRevenue = ads.reduce((s: number, a: any) => s + (a.total_paid || 0), 0);
  const filtered     = filterType === "all" ? ads : ads.filter((a: any) => a.type === filterType);
  const totalCost    = PRICE_PER_DAY * form.days_paid;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-500">{activeAds.length}</p>
          <p className="text-[10px] text-green-500">Ativos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-foreground">{ads.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
          <p className="text-sm font-bold text-primary">{(totalRevenue / 1000).toFixed(0)}k Kz</p>
          <p className="text-[10px] text-primary">Receita</p>
        </div>
      </div>

      {/* Carrossel preview */}
      <AdsCarouselPreview ads={activeAds} />

      {/* Botão novo */}
      <button
        onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(!showForm); }}
        className="w-full mb-3 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" /> {showForm && !editingId ? "Cancelar" : "Novo Anúncio"}
      </button>

      {/* Formulário */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              {editingId ? "Editar Anúncio" : "Novo Anúncio"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tipo */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1.5 block">Tipo de Anúncio *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {AD_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${form.type === t.value ? `${t.color} border-current` : "border-border text-foreground hover:bg-muted"}`}>
                  <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold">{t.label}</p>
                    <p className="text-[9px] opacity-70">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Título do Anúncio *</label>
            <input
              placeholder="Ex: Promoção de Verão - Até 50% off"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Descrição (opcional)</label>
            <textarea
              placeholder="Texto adicional do anúncio..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground resize-none"
            />
          </div>

          {/* Media */}
          {(form.type === "image" || form.type === "video") && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                {form.type === "video" ? "Vídeo" : "Imagem"} *
              </label>
              {form.media_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  {form.type === "video"
                    ? <video src={form.media_url} controls className="w-full max-h-40 object-contain bg-black" />
                    : <img src={form.media_url} alt="" className="w-full max-h-40 object-cover" />
                  }
                  <button onClick={() => setForm(f => ({ ...f, media_url: "" }))}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{uploading ? "A enviar..." : `Clique para enviar ${form.type === "video" ? "vídeo" : "imagem"}`}</span>
                  <input ref={fileInputRef} type="file" accept={form.type === "video" ? "video/*" : "image/*"} disabled={uploading} className="hidden"
                    onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
                </label>
              )}
            </div>
          )}

          {/* Referências por tipo */}
          {form.type === "seller" && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Vendedor *</label>
              <select value={form.seller_id} onChange={e => setForm(f => ({ ...f, seller_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                <option value="">— Selecionar vendedor —</option>
                {sellers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {form.type === "company" && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Empresa *</label>
              <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                <option value="">— Selecionar empresa —</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {form.type === "product" && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Produto *</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                <option value="">— Selecionar produto —</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}

          {(form.type === "auction" || form.type === "auction_ended") && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Leilão *</label>
              <select value={form.auction_id} onChange={e => setForm(f => ({ ...f, auction_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                <option value="">— Selecionar leilão —</option>
                {auctions.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title} ({a.status})</option>
                ))}
              </select>
              {form.type === "auction_ended" && (
                <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Este tipo mostra "O que perdeste" com o resultado final
                </p>
              )}
            </div>
          )}

          {/* Precificação */}
          <div className="bg-muted rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5" /> Precificação
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Data de início</label>
                <input type="date" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Nº de dias</label>
                <input type="number" min={1} max={365} value={form.days_paid}
                  onChange={e => setForm(f => ({ ...f, days_paid: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border">
              <div className="text-xs text-muted-foreground">
                {form.days_paid} dia{form.days_paid > 1 ? "s" : ""} × {PRICE_PER_DAY.toLocaleString("pt-AO")} Kz
              </div>
              <div className="text-sm font-black text-primary">
                = {totalCost.toLocaleString("pt-AO")} Kz
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-xs font-bold text-foreground">Mostrar na pág. de produto</p>
              <p className="text-[10px] text-muted-foreground">Aparece no bloco lateral (tablet/desktop)</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, show_on_product_page: !f.show_on_product_page }))}
              className={`w-10 h-6 rounded-full transition-colors ${form.show_on_product_page ? "bg-primary" : "bg-border"}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.show_on_product_page ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-muted-foreground">Ordem no carrossel</label>
            <input type="number" min={0} value={form.display_order}
              onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              className="w-20 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>

          <button onClick={() => saveAd.mutate()} disabled={!form.title || saveAd.isPending}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saveAd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? "Atualizar Anúncio" : "Publicar Anúncio"}
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
          Todos ({ads.length})
        </button>
        {AD_TYPES.map(t => {
          const count = ads.filter((a: any) => a.type === t.value).length;
          if (count === 0) return null;
          return (
            <button key={t.value} onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterType === t.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ad: any) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onEdit={() => openEdit(ad)}
              onToggle={() => toggleActive.mutate({ id: ad.id, active: !ad.is_active })}
              onDelete={() => deleteAd.mutate(ad.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">Nenhum anúncio encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAdsTab;
