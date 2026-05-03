import { useState } from "react";
import { Plus, Edit, Trash2, X, Save, Eye, EyeOff, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BannerPreview from "./banner/BannerPreview";
import BannerImageUploader from "./banner/BannerImageUploader";
import { formats } from "./banner/BannerPreview";
import { HOME_BANNER_SLOTS, getHomeSlotLabel } from "@/lib/bannerSlots";

const TEXT_POSITIONS = [
  { value: "bottom-left", label: "Inferior esquerdo" },
  { value: "bottom-right", label: "Inferior direito" },
  { value: "top-left", label: "Superior esquerdo" },
  { value: "top-right", label: "Superior direito" },
];

interface BannerForm {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  images: string[];
  extra_links: string[];
  format: string;
  bg_color: string;
  sort_order: string;
  text_position: string;
  category_id: string;
}

const DEFAULT_HOME_SLOT = String(HOME_BANNER_SLOTS[0]?.value ?? 1);

const empty: BannerForm = {
  title: "", subtitle: "", cta_text: "Compre agora", cta_link: "#",
  images: [], extra_links: [], format: "hero", bg_color: "#F0F9FF", sort_order: DEFAULT_HOME_SLOT,
  text_position: "bottom-left", category_id: "",
};

const AdminBannersTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<BannerForm>(empty);
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [showPreview, setShowPreview] = useState(true);

  const { data: banners = [] } = useQuery({
    queryKey: ["admin_banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order").order("format");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin_categories_select"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const saveBanner = useMutation({
    mutationFn: async () => {
      if (form.images.length === 0) throw new Error("Adicione pelo menos uma imagem");
      const selectedSlot = parseInt(form.sort_order, 10);
      if (!Number.isFinite(selectedSlot) || selectedSlot < 1) throw new Error("Selecione uma posição válida na home");
      const duplicatedSlot = banners.find((banner: any) => banner.sort_order === selectedSlot && banner.id !== editing?.id);
      if (duplicatedSlot) throw new Error("Já existe um banner nesta posição da home. Edite o actual ou escolha outra posição.");

      const payload = {
        title: form.title,
        subtitle: form.subtitle || "",
        cta_text: form.cta_text || "Compre agora",
        cta_link: form.cta_link || "#",
        image_url: form.images[0],
        extra_images: form.images.length > 1 ? form.images.slice(1) : [],
        extra_links: form.extra_links.slice(0, form.images.length),
        format: form.format,
        bg_color: form.bg_color || "#F0F9FF",
        sort_order: selectedSlot,
        is_active: true,
        text_position: form.text_position || "bottom-left",
        category_id: form.category_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("banners").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(editing ? "Banner atualizado!" : "Banner criado!");
      setShowForm(false);
      setEditing(null);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Banner removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("banners").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });

  const openEdit = (b: any) => {
    const allImages = [b.image_url, ...(b.extra_images || [])].filter(Boolean);
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      cta_text: b.cta_text || "Compre agora",
      cta_link: b.cta_link || "#",
      images: allImages,
      extra_links: b.extra_links || [],
      format: b.format || "hero",
      bg_color: b.bg_color || "#F0F9FF",
      sort_order: String(b.sort_order || HOME_BANNER_SLOTS[0]?.value || 1),
      text_position: b.text_position || "bottom-left",
      category_id: b.category_id || "",
    });
    setShowForm(true);
  };

  const set = (k: keyof BannerForm, v: any) => setForm(f => ({ ...f, [k]: v }));
  const filtered = filterFormat === "all" ? banners : banners.filter((b: any) => b.format === filterFormat);

  return (
    <div>
      <button onClick={() => { setEditing(null); setForm(empty); setShowForm(!showForm); }}
        className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1">
        <Plus className="w-4 h-4" /> Novo Banner
      </button>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{editing ? "Editar Banner" : "Novo Banner"}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
          </div>

          {/* Format selector */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Formato *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {formats.map(f => (
                <button key={f.value} type="button" onClick={() => set("format", f.value)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${form.format === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <BannerImageUploader
            images={form.images}
            onChange={(imgs) => set("images", imgs)}
            maxImages={form.format === "promo" ? 4 : form.format === "trio-banner" ? 3 : form.format === "duo-square" ? 2 : form.format === "mosaic" ? 3 : 10}
          />

          {/* Live preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Preview na Home
              </label>
              <button onClick={() => setShowPreview(!showPreview)} className="text-[10px] text-primary font-bold">
                {showPreview ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showPreview && (
              <div className="bg-muted/50 rounded-xl p-3 border border-border">
                <BannerPreview
                  format={form.format}
                  images={form.images}
                  title={form.title}
                  subtitle={form.subtitle}
                  ctaText={form.cta_text}
                  bgColor={form.bg_color}
                />
              </div>
            )}
          </div>

          <input placeholder="Título (opcional)" value={form.title} onChange={e => set("title", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Subtítulo (opcional)" value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Texto do botão (opcional)" value={form.cta_text} onChange={e => set("cta_text", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <input placeholder="Link principal (1ª imagem)" value={form.cta_link} onChange={e => set("cta_link", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>

          {/* Links individuais por imagem (apenas se há mais de 1 imagem) */}
          {form.images.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground block">Link de cada imagem (opcional)</label>
              {form.images.map((_img, i) => (
                <input
                  key={i}
                  placeholder={`Link da imagem ${i + 1} (interno ou externo)`}
                  value={form.extra_links[i] || ""}
                  onChange={e => {
                    const next = [...form.extra_links];
                    next[i] = e.target.value;
                    set("extra_links", next);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground"
                />
              ))}
              <p className="text-[10px] text-muted-foreground">Se vazio, usa o link principal acima.</p>
            </div>
          )}

          {/* Categoria vinculada (opcional) — se definido, mostra produtos abaixo do banner na home */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
              Vincular a categoria (opcional — exibe produtos da categoria abaixo do banner)
            </label>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
              <option value="">— Sem categoria vinculada —</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição na Home</label>
              <select value={form.sort_order} onChange={e => set("sort_order", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
                {HOME_BANNER_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Cor de fundo</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.bg_color} onChange={e => set("bg_color", e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer" />
                <input value={form.bg_color} onChange={e => set("bg_color", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
              <p className="text-[11px] font-bold text-muted-foreground">Banner vai aparecer em</p>
              <p className="text-sm font-semibold text-foreground">{getHomeSlotLabel(form.sort_order)}</p>
            </div>
          </div>

          {/* Text position selector */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição do texto</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TEXT_POSITIONS.map(tp => (
                <button key={tp.value} type="button" onClick={() => set("text_position", tp.value)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${form.text_position === tp.value ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                  {tp.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => saveBanner.mutate()} disabled={form.images.length === 0 || saveBanner.isPending}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {editing ? "Atualizar" : "Publicar Banner"}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterFormat("all")}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
          Todos ({banners.length})
        </button>
        {formats.map(f => {
          const count = banners.filter((b: any) => b.format === f.value).length;
          if (count === 0) return null;
          return (
            <button key={f.value} onClick={() => setFilterFormat(f.value)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Banner list */}
      <div className="space-y-2">
        {filtered.map((b: any) => {
          const fmt = formats.find(f => f.value === b.format);
          const imgCount = 1 + (b.extra_images?.length || 0);
          return (
            <div key={b.id} className={`bg-card rounded-xl border border-border overflow-hidden ${!b.is_active ? "opacity-50" : ""}`}>
              <div className="aspect-[21/9] max-h-28 overflow-hidden">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{b.title || "Sem título"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmt?.label || b.format} • {getHomeSlotLabel(b.sort_order)} • {imgCount} img{imgCount > 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => toggleActive.mutate({ id: b.id, active: !b.is_active })}
                  className={`p-1.5 rounded-lg ${b.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                  {b.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => openEdit(b)} className="p-1.5 text-muted-foreground hover:bg-accent rounded-lg">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteBanner.mutate(b.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center py-6 text-sm text-muted-foreground">Nenhum banner.</p>}
      </div>
    </div>
  );
};

export default AdminBannersTab;
