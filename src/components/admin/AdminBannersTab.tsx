import { useState } from "react";
import { Plus, Edit, Trash2, X, Save, Upload, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STORAGE_BUCKETS } from "@/lib/storage";

interface BannerForm {
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  format: string;
  bg_color: string;
  sort_order: string;
}

const empty: BannerForm = {
  title: "", subtitle: "", cta_text: "Compre agora", cta_link: "#",
  image_url: "", format: "hero", bg_color: "#F0F9FF", sort_order: "0",
};

const formats = [
  { value: "hero", label: "🖼️ Hero (carrossel principal)", aspect: "aspect-[21/9]" },
  { value: "wide", label: "📐 Wide (publicidade horizontal)", aspect: "aspect-[21/9]" },
  { value: "square", label: "⬜ Square (publicidade quadrada)", aspect: "aspect-square" },
  { value: "promo", label: "🎯 Promo (card promocional)", aspect: "aspect-[4/3]" },
];

const AdminBannersTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<BannerForm>(empty);
  const [uploading, setUploading] = useState(false);
  const [filterFormat, setFilterFormat] = useState<string>("all");

  const { data: banners = [] } = useQuery({
    queryKey: ["admin_banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("format").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.banners).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.banners).getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  const saveBanner = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || "",
        cta_text: form.cta_text || "Compre agora",
        cta_link: form.cta_link || "#",
        image_url: form.image_url,
        format: form.format,
        bg_color: form.bg_color || "#F0F9FF",
        sort_order: parseInt(form.sort_order) || 0,
        is_active: true,
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
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      cta_text: b.cta_text || "Compre agora",
      cta_link: b.cta_link || "#",
      image_url: b.image_url || "",
      format: b.format || "hero",
      bg_color: b.bg_color || "#F0F9FF",
      sort_order: String(b.sort_order || 0),
    });
    setShowForm(true);
  };

  const set = (k: keyof BannerForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedFormat = formats.find(f => f.value === form.format);
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
            <div className="grid grid-cols-2 gap-1.5">
              {formats.map(f => (
                <button key={f.value} type="button" onClick={() => set("format", f.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-left ${form.format === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload + preview */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem *</label>
            {form.image_url && (
              <div className={`relative rounded-lg overflow-hidden border border-border mb-2 ${selectedFormat?.aspect || "aspect-[21/9]"} max-w-full`}>
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => set("image_url", "")} className="absolute top-1 right-1 bg-destructive/80 text-destructive-foreground rounded-full p-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <label className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-accent text-foreground border border-border w-fit">
              <Upload className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Upload Imagem"}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" disabled={uploading} />
            </label>
          </div>

          <input placeholder="Título" value={form.title} onChange={e => set("title", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Subtítulo" value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Texto do botão" value={form.cta_text} onChange={e => set("cta_text", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <input placeholder="Link" value={form.cta_link} onChange={e => set("cta_link", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Cor de fundo</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.bg_color} onChange={e => set("bg_color", e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer" />
                <input value={form.bg_color} onChange={e => set("bg_color", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Ordem</label>
              <input type="number" value={form.sort_order} onChange={e => set("sort_order", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            </div>
          </div>

          <button onClick={() => saveBanner.mutate()} disabled={!form.image_url || saveBanner.isPending}
            className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {editing ? "Atualizar" : "Criar"}
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
          return (
            <button key={f.value} onClick={() => setFilterFormat(f.value)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              {f.value} ({count})
            </button>
          );
        })}
      </div>

      {/* Banner list */}
      <div className="space-y-2">
        {filtered.map((b: any) => {
          const fmt = formats.find(f => f.value === b.format);
          return (
            <div key={b.id} className={`bg-card rounded-xl border border-border overflow-hidden ${!b.is_active ? "opacity-50" : ""}`}>
              <div className={`${fmt?.aspect || "aspect-[21/9]"} max-h-32 overflow-hidden`}>
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{b.title || "Sem título"}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt?.label || b.format} • Ordem: {b.sort_order}</p>
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
