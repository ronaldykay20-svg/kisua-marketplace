import { useState, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, X, Loader2,
  ImageIcon, ChevronDown, ChevronUp, Pencil, Check,
  Save, Edit, Monitor,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BannerPreview from "./banner/BannerPreview";
import BannerImageUploader from "./banner/BannerImageUploader";
import { formats } from "./banner/BannerPreview";
import { HOME_BANNER_SLOTS, getHomeSlotLabel } from "@/lib/bannerSlots";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: { value: Device; label: string }[] = [
  { value: "mobile",  label: "Mobile"  },
  { value: "tablet",  label: "Tablet"  },
  { value: "desktop", label: "Desktop" },
];

// Formatos disponíveis — usados pelo seletor manual (v1) e pelo BannerPreview (v2)
const FORMATS = [
  { value: "hero",           label: "Hero (carrossel)"  },
  { value: "hero-full",      label: "Hero Full"         },
  { value: "wide",           label: "Wide"              },
  { value: "wide-slim",      label: "Wide Slim"         },
  { value: "duo-square",     label: "Duo (2 imagens)"   },
  { value: "trio-banner",    label: "Trio (3 imagens)"  },
  { value: "mosaic",         label: "Mosaico"           },
  { value: "promo",          label: "Promo (4 imagens)" },
  { value: "square",         label: "Quadrado"          },
  { value: "square-rounded", label: "Quadrado Redondo"  },
  { value: "vertical",       label: "Vertical"          },
  { value: "story-card",     label: "Story Card"        },
  { value: "tall",           label: "Tall"              },
  { value: "natural",        label: "Natural"           },
];

const TEXT_POSITIONS = [
  { value: "bottom-left",  label: "↙️ Baixo Esquerda" },
  { value: "bottom-right", label: "↘️ Baixo Direita"  },
  { value: "top-left",     label: "↖️ Cima Esquerda"  },
  { value: "top-right",    label: "↗️ Cima Direita"   },
];

// Slots especiais da sidebar desktop (v1)
const SIDEBAR_SLOTS = [101, 102, 103];

// Máximo de imagens extra por formato
const EXTRA_COUNT: Record<string, number> = {
  "hero": 4, "hero-full": 4, "duo-square": 1,
  "trio-banner": 2, "mosaic": 2, "promo": 3,
};

const MAX_IMAGES_BY_FORMAT: Record<string, number> = {
  "promo": 4, "trio-banner": 3, "duo-square": 2, "mosaic": 3,
};

// ─── Modos do formulário ──────────────────────────────────────────────────────
// "advanced" → v1 (upload de ficheiro, multi-device, sidebar slots)
// "home"     → v2 (BannerImageUploader, live preview, HOME_BANNER_SLOTS, categoria)

type FormMode = "advanced" | "home";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface BannerRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  extra_images: string[] | null;
  extra_links: string[] | null;
  format: string;
  bg_color: string | null;
  sort_order: number;
  is_active: boolean;
  text_position: string | null;
  category_id: string | null;
  device: Device | null;
  created_at: string;
}

// ─── Upload helper (v1) ───────────────────────────────────────────────────────

async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await (supabase as any).storage
    .from("banners")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = (supabase as any).storage.from("banners").getPublicUrl(path);
  return data.publicUrl as string;
}

// ─── Formulário Avançado (v1) ─────────────────────────────────────────────────

interface AdvancedFormProps {
  initial?: BannerRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const AdvancedBannerForm = ({ initial, onClose, onSaved }: AdvancedFormProps) => {
  const isEdit = !!initial;
  const mainFileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  type FormState = Partial<BannerRow> & { extraImgFiles: File[]; extraImgPreviews: string[] };

  const emptyForm = (): FormState => ({
    title: "", subtitle: "", cta_text: "", cta_link: "",
    image_url: "", extra_images: [], extra_links: [],
    format: "hero", bg_color: "", sort_order: 1, is_active: true,
    text_position: "bottom-left", category_id: null, device: "mobile",
    extraImgFiles: [], extraImgPreviews: [],
  });

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          ...initial,
          extra_images: initial.extra_images || [],
          extra_links: initial.extra_links || [],
          extraImgFiles: [],
          extraImgPreviews: (initial.extra_images || []) as string[],
        }
      : emptyForm(),
  );
  const [mainFile, setMainFile]       = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string>(initial?.image_url || "");
  const [saving, setSaving]           = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleMainFile = (f: File) => {
    setMainFile(f);
    setMainPreview(URL.createObjectURL(f));
  };

  const handleExtraFiles = (files: FileList) => {
    const arr = Array.from(files);
    const previews = arr.map(f => URL.createObjectURL(f));
    setForm(f => ({
      ...f,
      extraImgFiles: [...f.extraImgFiles, ...arr],
      extraImgPreviews: [...f.extraImgPreviews, ...previews],
    }));
  };

  const removeExtra = (i: number) => {
    setForm(f => {
      const existingCount = (initial?.extra_images || []).length;
      const isExisting = i < existingCount && f.extraImgFiles.length === 0;
      if (isExisting) {
        const imgs = [...(f.extra_images || [])];
        imgs.splice(i, 1);
        const prvs = [...f.extraImgPreviews];
        prvs.splice(i, 1);
        return { ...f, extra_images: imgs, extraImgPreviews: prvs };
      }
      const fileIdx = i - existingCount;
      const files = [...f.extraImgFiles];
      files.splice(fileIdx, 1);
      const prvs = [...f.extraImgPreviews];
      prvs.splice(i, 1);
      return { ...f, extraImgFiles: files, extraImgPreviews: prvs };
    });
  };

  const save = async () => {
    if (!mainPreview && !mainFile) { toast.error("Adiciona a imagem principal"); return; }
    setSaving(true);
    try {
      let imageUrl = form.image_url || "";
      if (mainFile) imageUrl = await uploadBannerImage(mainFile);

      const existingExtras: string[] = initial?.extra_images?.filter(u =>
        form.extraImgPreviews.includes(u),
      ) || [];
      const newExtras: string[] = await Promise.all(
        form.extraImgFiles.map(f => uploadBannerImage(f)),
      );
      const allExtras = [...existingExtras, ...newExtras];

      const payload = {
        title:         form.title        || null,
        subtitle:      form.subtitle     || null,
        cta_text:      form.cta_text     || null,
        cta_link:      form.cta_link     || null,
        image_url:     imageUrl,
        extra_images:  allExtras.length  ? allExtras : null,
        extra_links:   (form.extra_links || []).filter(Boolean).length ? form.extra_links : null,
        format:        form.format       || "hero",
        bg_color:      form.bg_color     || null,
        sort_order:    Number(form.sort_order) || 1,
        is_active:     form.is_active    ?? true,
        text_position: form.text_position || null,
        category_id:   form.category_id  || null,
        device:        form.device       || "mobile",
      };

      if (isEdit) {
        const { error } = await (supabase as any).from("banners").update(payload).eq("id", initial!.id);
        if (error) throw error;
        toast.success("Banner atualizado!");
      } else {
        const { error } = await (supabase as any).from("banners").insert(payload);
        if (error) throw error;
        toast.success("Banner criado!");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const needsExtra = EXTRA_COUNT[form.format || "hero"] || 0;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground">
          {isEdit ? "Editar Banner (Avançado)" : "Novo Banner (Avançado)"}
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">

        {/* Dispositivo */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Dispositivo</label>
          <div className="flex gap-2">
            {DEVICES.map(d => (
              <button key={d.value} onClick={() => set("device", d.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                  form.device === d.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slot */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
            Slot (posição na página)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number" min={1} max={200}
              value={form.sort_order || 1}
              onChange={e => set("sort_order", Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">
              {form.device === "desktop" && SIDEBAR_SLOTS.includes(Number(form.sort_order))
                ? "📌 Sidebar direita"
                : `Slot ${form.sort_order} — ${form.device}`}
            </p>
          </div>
          {form.device === "desktop" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Slots 101–103 aparecem na sidebar direita do desktop.
            </p>
          )}
        </div>

        {/* Formato */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Formato</label>
          <select value={form.format || "hero"} onChange={e => set("format", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Imagem principal */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
            Imagem principal *
          </label>
          {mainPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border mb-1">
              <img src={mainPreview} alt="Preview" className="w-full max-h-40 object-cover" />
              <button
                onClick={() => { setMainFile(null); setMainPreview(""); set("image_url", ""); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => mainFileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs font-bold text-foreground">Clique para fazer upload</p>
              <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP, GIF</p>
            </button>
          )}
          <input ref={mainFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleMainFile(e.target.files[0])} />
          <input
            placeholder="Ou cole o URL da imagem"
            value={mainFile ? "" : (form.image_url || "")}
            onChange={e => { set("image_url", e.target.value); setMainPreview(e.target.value); setMainFile(null); }}
            className="w-full mt-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground"
          />
        </div>

        {/* Imagens extra */}
        {needsExtra > 0 && (
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
              Imagens extra ({form.extraImgPreviews.length}/{needsExtra} recomendadas)
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {form.extraImgPreviews.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                  <img src={p} alt={`Extra ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => removeExtra(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {form.extraImgPreviews.length < needsExtra && (
                <button onClick={() => extraFileRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1">Adicionar</p>
                </button>
              )}
            </div>
            <input ref={extraFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => e.target.files && handleExtraFiles(e.target.files)} />
            {form.extraImgPreviews.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[10px] font-bold text-muted-foreground">Links das imagens extra</p>
                {form.extraImgPreviews.map((_, i) => (
                  <input key={i} placeholder={`URL imagem ${i + 2}`}
                    value={(form.extra_links || [])[i] || ""}
                    onChange={e => {
                      const links = [...(form.extra_links || [])];
                      links[i] = e.target.value;
                      set("extra_links", links);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Texto */}
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Título" value={form.title || ""} onChange={e => set("title", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Subtítulo" value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Texto do botão CTA" value={form.cta_text || ""} onChange={e => set("cta_text", e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="URL de destino" value={form.cta_link || ""} onChange={e => set("cta_link", e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>

        {/* Posição do texto */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição do texto</label>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_POSITIONS.map(p => (
              <button key={p.value} onClick={() => set("text_position", p.value)}
                className={`py-2 rounded-lg text-xs font-bold border transition ${
                  form.text_position === p.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activo */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border">
          <span className="text-sm font-bold text-foreground">Activo</span>
          <button onClick={() => set("is_active", !form.is_active)}
            className={`w-10 h-6 rounded-full transition relative ${form.is_active ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-4" : ""}`} />
          </button>
        </div>

        {/* Guardar */}
        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</>
            : <><Check className="w-4 h-4" /> {isEdit ? "Guardar alterações" : "Criar banner"}</>}
        </button>
      </div>
    </div>
  );
};

// ─── Formulário Home (v2) ─────────────────────────────────────────────────────

interface HomeFormProps {
  initial?: BannerRow | null;
  banners: BannerRow[];
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

interface HomeBannerForm {
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

const HomeBannerForm = ({ initial, banners, categories, onClose, onSaved }: HomeFormProps) => {
  const queryClient = useQueryClient();
  const isEdit = !!initial;
  const [showPreview, setShowPreview] = useState(true);

  const emptyHome = (): HomeBannerForm => ({
    title: "", subtitle: "", cta_text: "Compre agora", cta_link: "#",
    images: [], extra_links: [], format: "hero", bg_color: "#F0F9FF",
    sort_order: DEFAULT_HOME_SLOT, text_position: "bottom-left", category_id: "",
  });

  const [form, setForm] = useState<HomeBannerForm>(() =>
    initial
      ? {
          title: initial.title || "",
          subtitle: initial.subtitle || "",
          cta_text: initial.cta_text || "Compre agora",
          cta_link: initial.cta_link || "#",
          images: [initial.image_url, ...(initial.extra_images || [])].filter(Boolean),
          extra_links: initial.extra_links || [],
          format: initial.format || "hero",
          bg_color: initial.bg_color || "#F0F9FF",
          sort_order: String(initial.sort_order || HOME_BANNER_SLOTS[0]?.value || 1),
          text_position: initial.text_position || "bottom-left",
          category_id: initial.category_id || "",
        }
      : emptyHome(),
  );

  const set = (k: keyof HomeBannerForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const saveBanner = useMutation({
    mutationFn: async () => {
      if (form.images.length === 0) throw new Error("Adicione pelo menos uma imagem");
      const selectedSlot = parseInt(form.sort_order, 10);
      if (!Number.isFinite(selectedSlot) || selectedSlot < 1)
        throw new Error("Selecione uma posição válida na home");
      const duplicatedSlot = banners.find(
        (b) => b.sort_order === selectedSlot && b.id !== initial?.id,
      );
      if (duplicatedSlot)
        throw new Error("Já existe um banner nesta posição. Edite o actual ou escolha outra posição.");

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
        device: "mobile" as Device, // home banners padrão mobile; ajustável conforme necessidade
      };

      if (isEdit) {
        const { error } = await supabase.from("banners").update(payload).eq("id", initial!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      toast.success(isEdit ? "Banner atualizado!" : "Banner criado!");
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const maxImages = MAX_IMAGES_BY_FORMAT[form.format] ?? 10;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          {isEdit ? "Editar Banner (Home)" : "Novo Banner (Home)"}
        </h3>
        <button onClick={onClose} className="text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Formato */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Formato *</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(formats ?? FORMATS).map((f: { value: string; label: string }) => (
            <button key={f.value} type="button" onClick={() => set("format", f.value)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                form.format === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload de imagens */}
      <BannerImageUploader
        images={form.images}
        onChange={(imgs: string[]) => set("images", imgs)}
        maxImages={maxImages}
      />

      {/* Live Preview */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <Monitor className="w-3 h-3" /> Preview na Home
          </label>
          <button onClick={() => setShowPreview(s => !s)} className="text-[10px] text-primary font-bold">
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

      {/* Texto */}
      <input placeholder="Título (opcional)" value={form.title} onChange={e => set("title", e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
      <input placeholder="Subtítulo (opcional)" value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />

      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Texto do botão" value={form.cta_text} onChange={e => set("cta_text", e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        <input placeholder="Link principal (1ª imagem)" value={form.cta_link} onChange={e => set("cta_link", e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
      </div>

      {/* Links individuais por imagem */}
      {form.images.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground block">Link de cada imagem (opcional)</label>
          {form.images.map((_img, i) => (
            <input key={i} placeholder={`Link da imagem ${i + 1}`}
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

      {/* Categoria vinculada */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
          Vincular a categoria (opcional — exibe produtos abaixo do banner)
        </label>
        <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
          <option value="">— Sem categoria vinculada —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Slot + cor de fundo */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição na Home</label>
          <select value={form.sort_order} onChange={e => set("sort_order", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {HOME_BANNER_SLOTS.map((slot: { value: number; label: string }) => (
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
        <div className="col-span-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-[11px] font-bold text-muted-foreground">Banner vai aparecer em</p>
          <p className="text-sm font-semibold text-foreground">{getHomeSlotLabel(form.sort_order)}</p>
        </div>
      </div>

      {/* Posição do texto */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição do texto</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TEXT_POSITIONS.map(tp => (
            <button key={tp.value} type="button" onClick={() => set("text_position", tp.value)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center ${
                form.text_position === tp.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground"
              }`}>
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => saveBanner.mutate()}
        disabled={form.images.length === 0 || saveBanner.isPending}
        className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
        <Save className="w-4 h-4" /> {isEdit ? "Atualizar" : "Publicar Banner"}
      </button>
    </div>
  );
};

// ─── Card do banner ───────────────────────────────────────────────────────────

interface CardProps {
  banner: BannerRow;
  onEdit: (mode: FormMode) => void;
  onToggle: () => void;
  onDelete: () => void;
}

const BannerCard = ({ banner, onEdit, onToggle, onDelete }: CardProps) => {
  const deviceColor: Record<string, string> = {
    mobile:  "bg-blue-500/10 text-blue-500",
    tablet:  "bg-purple-500/10 text-purple-500",
    desktop: "bg-green-500/10 text-green-500",
  };

  const fmt = FORMATS.find(f => f.value === banner.format);
  const imgCount = 1 + (banner.extra_images?.length || 0);

  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden transition ${!banner.is_active ? "opacity-55" : ""}`}>
      {banner.image_url && (
        <div className="relative h-24 bg-muted">
          <img src={banner.image_url} alt={banner.title || "Banner"} className="w-full h-full object-cover" />
          {banner.extra_images && banner.extra_images.length > 0 && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              +{banner.extra_images.length} imgs
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${deviceColor[banner.device || "mobile"] || deviceColor.mobile}`}>
              {banner.device || "mobile"}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {fmt?.label || banner.format}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
              slot {banner.sort_order}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {imgCount} img{imgCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {/* Editar no modo Home */}
            <button onClick={() => onEdit("home")}
              title="Editar modo Home"
              className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-accent transition">
              <Monitor className="w-3.5 h-3.5" />
            </button>
            {/* Editar no modo Avançado */}
            <button onClick={() => onEdit("advanced")}
              title="Editar modo Avançado"
              className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-accent transition">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggle}
              className={`p-1.5 rounded-lg transition ${banner.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>
              {banner.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {banner.title && <p className="text-xs font-bold text-foreground truncate">{banner.title}</p>}
        {banner.cta_link && <p className="text-[10px] text-muted-foreground truncate">{banner.cta_link}</p>}
        {banner.sort_order && (
          <p className="text-[10px] text-muted-foreground">{getHomeSlotLabel(String(banner.sort_order))}</p>
        )}
      </div>
    </div>
  );
};

// ─── Tab principal ─────────────────────────────────────────────────────────────

const AdminBannersTab = () => {
  const queryClient = useQueryClient();

  // Estado de UI
  const [formMode, setFormMode]         = useState<FormMode>("home");
  const [showForm, setShowForm]         = useState(false);
  const [editBanner, setEditBanner]     = useState<BannerRow | null>(null);
  const [editMode, setEditMode]         = useState<FormMode>("home");
  const [filterDevice, setFilterDevice] = useState<Device | "all">("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [collapsed, setCollapsed]       = useState(false);

  // Dados
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin_banners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select("*")
        .order("device")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data || []) as BannerRow[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories_simple"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  const toggleBanner = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("banners").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Banner eliminado"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Estatísticas
  const stats = {
    total:   banners.length,
    active:  banners.filter(b => b.is_active).length,
    mobile:  banners.filter(b => (b.device || "mobile") === "mobile").length,
    tablet:  banners.filter(b => b.device === "tablet").length,
    desktop: banners.filter(b => b.device === "desktop").length,
  };

  // Filtros combinados
  const filtered = banners
    .filter(b => filterDevice === "all" || (b.device || "mobile") === filterDevice)
    .filter(b => filterFormat === "all" || b.format === filterFormat);

  const handleEdit = (b: BannerRow, mode: FormMode) => {
    setEditBanner(b);
    setEditMode(mode);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => { setShowForm(false); setEditBanner(null); };

  // Formatos com banners existentes (para filtro)
  const formatsWithBanners = FORMATS.filter(f => banners.some(b => b.format === f.value));

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: "Total",   value: stats.total,   color: "text-primary border-primary/20 bg-primary/5" },
          { label: "Ativos",  value: stats.active,  color: "text-green-500 border-green-500/20 bg-green-500/5" },
          { label: "Mobile",  value: stats.mobile,  color: "text-blue-500 border-blue-500/20 bg-blue-500/5" },
          { label: "Tablet",  value: stats.tablet,  color: "text-purple-500 border-purple-500/20 bg-purple-500/5" },
          { label: "Desktop", value: stats.desktop, color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-2 text-center ${s.color}`}>
            <p className="text-base font-black">{s.value}</p>
            <p className="text-[9px] font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Formulário activo (edição ou criação) */}
      {editBanner ? (
        editMode === "advanced" ? (
          <AdvancedBannerForm
            initial={editBanner}
            onClose={closeForm}
            onSaved={invalidate}
          />
        ) : (
          <HomeBannerForm
            initial={editBanner}
            banners={banners}
            categories={categories}
            onClose={closeForm}
            onSaved={invalidate}
          />
        )
      ) : showForm ? (
        formMode === "advanced" ? (
          <AdvancedBannerForm onClose={closeForm} onSaved={invalidate} />
        ) : (
          <HomeBannerForm
            banners={banners}
            categories={categories}
            onClose={closeForm}
            onSaved={invalidate}
          />
        )
      ) : (
        /* Botões de criação com escolha de modo */
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setFormMode("home"); setShowForm(true); }}
            className="py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2">
            <Monitor className="w-4 h-4" /> Novo Banner Home
          </button>
          <button
            onClick={() => { setFormMode("advanced"); setShowForm(true); }}
            className="py-3 bg-secondary text-secondary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-border">
            <Plus className="w-4 h-4" /> Novo Banner Avançado
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-2">
        {/* Filtro por device */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "Todos" }, ...DEVICES].map(d => (
            <button key={d.value} onClick={() => setFilterDevice(d.value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition ${
                filterDevice === d.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}>
              {d.label}
            </button>
          ))}
          <button onClick={() => setCollapsed(c => !c)}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:bg-muted flex items-center gap-1">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            {collapsed ? "Expandir" : "Colapsar"}
          </button>
        </div>

        {/* Filtro por formato */}
        {formatsWithBanners.length > 0 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterFormat("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${
                filterFormat === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}>
              Todos ({banners.length})
            </button>
            {formatsWithBanners.map(f => {
              const count = banners.filter(b => b.format === f.value).length;
              return (
                <button key={f.value} onClick={() => setFilterFormat(f.value)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${
                    filterFormat === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  }`}>
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-10">
          <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Nenhum banner</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro banner</p>
        </div>
      )}

      {!collapsed && (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(b => (
            <BannerCard
              key={b.id}
              banner={b}
              onEdit={(mode) => handleEdit(b, mode)}
              onToggle={() => toggleBanner.mutate({ id: b.id, active: !b.is_active })}
              onDelete={() => { if (confirm("Eliminar este banner?")) deleteBanner.mutate(b.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBannersTab;
