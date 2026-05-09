import { useState, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, X, Loader2,
  ImageIcon, ChevronDown, ChevronUp, Pencil, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { HOME_BANNER_SLOTS, getHomeSlotLabel } from "@/lib/bannerSlots";

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: { value: Device; label: string }[] = [
  { value: "mobile",  label: "Mobile"  },
  { value: "tablet",  label: "Tablet"  },
  { value: "desktop", label: "Desktop" },
];

const FORMATS = [
  { value: "hero",           label: "Hero (carrossel)"           },
  { value: "hero-full",      label: "Hero Full"                  },
  { value: "wide",           label: "Wide"                       },
  { value: "wide-slim",      label: "Wide Slim"                  },
  { value: "duo-square",     label: "Duo (2 imagens)"            },
  { value: "trio-banner",    label: "Trio (3 imagens)"           },
  { value: "mosaic",         label: "Mosaico"                    },
  { value: "promo",          label: "Promo (4 imagens)"          },
  { value: "square",         label: "Quadrado"                   },
  { value: "square-rounded", label: "Quadrado Redondo"           },
  { value: "vertical",       label: "Vertical"                   },
  { value: "story-card",     label: "Story Card"                 },
  { value: "tall",           label: "Tall"                       },
  { value: "natural",        label: "Natural"                    },
  { value: "split",          label: "Split (2 colunas livres)"   }, // ← NOVO
];

const TEXT_POSITIONS = [
  { value: "top-left",      label: "↖ Cima Esquerda"  },
  { value: "top-center",    label: "↑ Cima Centro"    },
  { value: "top-right",     label: "↗ Cima Direita"   },
  { value: "middle-left",   label: "← Meio Esquerda"  },
  { value: "middle-center", label: "· Meio Centro"    },
  { value: "middle-right",  label: "→ Meio Direita"   },
  { value: "bottom-left",   label: "↙ Baixo Esquerda" },
  { value: "bottom-center", label: "↓ Baixo Centro"   },
  { value: "bottom-right",  label: "↘ Baixo Direita"  },
];

const SIDEBAR_SLOTS = [101, 102, 103];

const EXTRA_COUNT: Record<string, number> = {
  "hero": 4, "hero-full": 4, "duo-square": 1,
  "trio-banner": 2, "mosaic": 2, "promo": 3,
};

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
  text_color: string | null;
  text_bg_color: string | null;
  category_id: string | null;
  device: Device | null;
  split_side: "left" | "right" | null; // ← NOVO
  created_at: string;
}

async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.banners)
    .upload(path, file, { upsert: true });
  if (error) throw new Error("Upload falhou: " + error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKETS.banners).getPublicUrl(path);
  return data.publicUrl;
}

interface FormProps {
  initial?: BannerRow | null;
  existingSlots: number[];
  onClose: () => void;
  onSaved: () => void;
}

type FormState = Partial<BannerRow> & {
  extraImgFiles: File[];
  extraImgPreviews: string[];
  text_color: string;
  text_bg_color: string;
  text_bg_enabled: boolean;
  split_side: "left" | "right"; // ← NOVO
};

const emptyForm = (): FormState => ({
  title: "", subtitle: "", cta_text: "", cta_link: "",
  image_url: "", extra_images: [], extra_links: [],
  format: "hero", bg_color: "", sort_order: 1, is_active: true,
  text_position: "bottom-left", category_id: null, device: "mobile",
  text_color: "#ffffff", text_bg_color: "#000000", text_bg_enabled: false,
  extraImgFiles: [], extraImgPreviews: [],
  split_side: "left", // ← NOVO
});

const BannerForm = ({ initial, existingSlots, onClose, onSaved }: FormProps) => {
  const isEdit = !!initial;
  const mainFileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          ...initial,
          extra_images:     initial.extra_images || [],
          extra_links:      initial.extra_links  || [],
          text_color:       (initial as any).text_color    || "#ffffff",
          text_bg_color:    (initial as any).text_bg_color || "#000000",
          text_bg_enabled:  !!(initial as any).text_bg_color,
          extraImgFiles:    [],
          extraImgPreviews: (initial.extra_images || []) as string[],
          split_side:       (initial.split_side || "left") as "left" | "right", // ← NOVO
        }
      : emptyForm(),
  );
  const [mainFile, setMainFile]       = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string>(initial?.image_url || "");
  const [saving, setSaving]           = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleMainFile = (f: File) => { setMainFile(f); setMainPreview(URL.createObjectURL(f)); };

  const handleExtraFiles = (files: FileList) => {
    const arr = Array.from(files);
    const previews = arr.map(f => URL.createObjectURL(f));
    setForm(f => ({
      ...f,
      extraImgFiles:    [...f.extraImgFiles, ...arr],
      extraImgPreviews: [...f.extraImgPreviews, ...previews],
    }));
  };

  const removeExtra = (i: number) => {
    setForm(f => {
      const existingCount = (initial?.extra_images || []).length;
      const isExisting = i < existingCount && f.extraImgFiles.length === 0;
      if (isExisting) {
        const imgs = [...(f.extra_images || [])]; imgs.splice(i, 1);
        const prvs = [...f.extraImgPreviews];     prvs.splice(i, 1);
        return { ...f, extra_images: imgs, extraImgPreviews: prvs };
      }
      const fileIdx = i - existingCount;
      const files = [...f.extraImgFiles]; files.splice(fileIdx, 1);
      const prvs  = [...f.extraImgPreviews]; prvs.splice(i, 1);
      return { ...f, extraImgFiles: files, extraImgPreviews: prvs };
    });
  };

  const allSlots = HOME_BANNER_SLOTS;
  const slotOccupied = (slotVal: number) =>
    /* split permite vários banners no mesmo slot */
    form.format !== "split" &&
    existingSlots.includes(slotVal) &&
    slotVal !== initial?.sort_order;

  const save = async () => {
    if (!mainPreview && !mainFile) { toast.error("Adiciona a imagem principal"); return; }
    setSaving(true);
    try {
      let imageUrl = form.image_url || "";
      if (mainFile) imageUrl = await uploadBannerImage(mainFile);
      if (!imageUrl) throw new Error("URL da imagem principal em falta");

      const existingExtras = (initial?.extra_images || []).filter(u =>
        form.extraImgPreviews.includes(u),
      );
      const newExtras = await Promise.all(form.extraImgFiles.map(uploadBannerImage));
      const allExtras = [...existingExtras, ...newExtras];

      const payload: Record<string, any> = {
        title:         form.title         ?? "",
        subtitle:      form.subtitle      || "",
        cta_text:      form.cta_text      || "Compre agora",
        cta_link:      form.cta_link      || "#",
        image_url:     imageUrl,
        extra_images:  allExtras.length   ? allExtras : [],
        extra_links:   (form.extra_links  || []).filter(Boolean),
        format:        form.format        || "hero",
        bg_color:      form.bg_color      || "#F0F9FF",
        sort_order:    Number(form.sort_order) || 1,
        is_active:     form.is_active     ?? true,
        text_position: form.text_position || "bottom-left",
        text_color:    form.text_color    || "#ffffff",
        text_bg_color: form.text_bg_enabled ? (form.text_bg_color || "#000000") : null,
        category_id:   form.category_id   || null,
        device:        form.device        || "mobile",
        split_side:    form.format === "split" ? (form.split_side || "left") : null, // ← NOVO
      };

      if (isEdit) {
        const { error } = await supabase.from("banners" as any).update(payload).eq("id", initial!.id);
        if (error) throw new Error(error.message);
        toast.success("Banner atualizado!");
      } else {
        const { error } = await supabase.from("banners" as any).insert(payload);
        if (error) throw new Error(error.message);
        toast.success("Banner criado!");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const needsExtra = EXTRA_COUNT[form.format || "hero"] || 0;
  const isSplit = form.format === "split";

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground">{isEdit ? "Editar Banner" : "Novo Banner"}</h3>
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${form.device === d.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slot */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
            Posição na página {isSplit && <span className="text-primary">(mesmo número = mesmo bloco split)</span>}
          </label>
          <select
            value={form.sort_order || 1}
            onChange={e => set("sort_order", Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
          >
            {allSlots.map(slot => {
              const occupied = slotOccupied(slot.value);
              return (
                <option key={slot.value} value={slot.value} disabled={occupied}>
                  {slot.label}{occupied ? " — ocupado" : ""}
                </option>
              );
            })}
          </select>
          {form.device === "desktop" && SIDEBAR_SLOTS.includes(Number(form.sort_order)) && (
            <p className="text-[10px] text-muted-foreground mt-1">📌 Aparece na sidebar direita do desktop.</p>
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

        {/* ── NOVO: Coluna split ── */}
        {isSplit && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <label className="text-[11px] font-bold text-primary block">
              Coluna do bloco Split
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "left",  label: "◧  Esquerda" },
                { value: "right", label: "◨  Direita"  },
              ] as const).map(s => (
                <button
                  key={s.value}
                  onClick={() => set("split_side", s.value)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                    form.split_side === s.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Banners com o <strong>mesmo slot</strong> e o mesmo <strong>dispositivo</strong> formam um bloco.
              Cada lado pode ter <strong>1 a 4 banners</strong> — todos dividem a altura igualmente.
            </p>
          </div>
        )}

        {/* Imagem principal */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem principal *</label>
          {mainPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border mb-1">
              <img src={mainPreview} alt="Preview" className="w-full max-h-40 object-cover" />
              <button onClick={() => { setMainFile(null); setMainPreview(""); set("image_url", ""); }}
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

        {/* Imagens extra — não aparecem no formato split */}
        {!isSplit && needsExtra > 0 && (
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
                    className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Texto */}
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Título (opcional)" value={form.title || ""} onChange={e => set("title", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Subtítulo (opcional)" value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Texto CTA" value={form.cta_text || ""} onChange={e => set("cta_text", e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="URL de destino" value={form.cta_link || ""} onChange={e => set("cta_link", e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>

        {/* Posição do texto */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição do texto</label>
          <div className="grid grid-cols-3 gap-1.5">
            {TEXT_POSITIONS.map(p => (
              <button key={p.value} onClick={() => set("text_position", p.value)}
                className={`py-2 rounded-lg text-[10px] font-bold border transition text-center ${form.text_position === p.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cor do texto */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Cor do texto</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.text_color || "#ffffff"}
              onChange={e => set("text_color", e.target.value)}
              className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
            <input value={form.text_color || "#ffffff"}
              onChange={e => set("text_color", e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <span className="px-3 py-1.5 rounded-lg text-xs font-black border border-border"
              style={{ color: form.text_color || "#ffffff", backgroundColor: form.text_bg_enabled ? (form.text_bg_color || "#000000") : "transparent" }}>
              Texto
            </span>
          </div>
        </div>

        {/* Fundo do texto */}
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Fundo do texto (caixa)</span>
            <button onClick={() => set("text_bg_enabled", !form.text_bg_enabled)}
              className={`w-10 h-6 rounded-full transition relative ${form.text_bg_enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.text_bg_enabled ? "translate-x-4" : ""}`} />
            </button>
          </div>
          {form.text_bg_enabled && (
            <div className="flex items-center gap-2">
              <input type="color" value={form.text_bg_color || "#000000"}
                onChange={e => set("text_bg_color", e.target.value)}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
              <input value={form.text_bg_color || "#000000"}
                onChange={e => set("text_bg_color", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
              <p className="text-[10px] text-muted-foreground">ex: #00000080</p>
            </div>
          )}
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

interface CardProps {
  banner: BannerRow;
  onEdit: () => void;
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
          {imgCount > 1 && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              +{imgCount - 1} imgs
            </span>
          )}
          {/* Badge split_side */}
          {banner.format === "split" && banner.split_side && (
            <span className="absolute top-1.5 left-1.5 bg-primary/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {banner.split_side === "left" ? "◧ Esq" : "◨ Dir"}
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
              {getHomeSlotLabel(banner.sort_order)}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {imgCount} img{imgCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-accent transition">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggle} className={`p-1.5 rounded-lg transition ${banner.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>
              {banner.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {banner.title && <p className="text-xs font-bold text-foreground truncate">{banner.title}</p>}
        {banner.cta_link && <p className="text-[10px] text-muted-foreground truncate">{banner.cta_link}</p>}
      </div>
    </div>
  );
};

const AdminBannersTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]         = useState(false);
  const [editBanner, setEditBanner]     = useState<BannerRow | null>(null);
  const [filterDevice, setFilterDevice] = useState<Device | "all">("all");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [collapsed, setCollapsed]       = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin_banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners" as any)
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) { console.error("Erro banners:", error); throw new Error(error.message); }
      return (data || []) as BannerRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin_banners"] });
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  const toggleBanner = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("banners" as any).update({ is_active: active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners" as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); toast.success("Banner eliminado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = {
    total:   banners.length,
    active:  banners.filter(b => b.is_active).length,
    mobile:  banners.filter(b => (b.device || "mobile") === "mobile").length,
    tablet:  banners.filter(b => b.device === "tablet").length,
    desktop: banners.filter(b => b.device === "desktop").length,
  };

  const formatsWithBanners = FORMATS.filter(f => banners.some(b => b.format === f.value));

  const filtered = banners
    .filter(b => filterDevice === "all" || (b.device || "mobile") === filterDevice)
    .filter(b => filterFormat === "all" || b.format === filterFormat);

  const existingSlots = banners
    .filter(b => b.format !== "split")
    .map(b => b.sort_order);

  const handleEdit = (b: BannerRow) => {
    setEditBanner(b);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => { setShowForm(false); setEditBanner(null); };

  return (
    <div className="space-y-4">

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

      {editBanner ? (
        <BannerForm initial={editBanner} existingSlots={existingSlots} onClose={closeForm} onSaved={invalidate} />
      ) : showForm ? (
        <BannerForm existingSlots={existingSlots} onClose={closeForm} onSaved={invalidate} />
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Novo Banner
        </button>
      )}

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "Todos" }, ...DEVICES].map(d => (
            <button key={d.value} onClick={() => setFilterDevice(d.value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition ${filterDevice === d.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}>
              {d.label}
            </button>
          ))}
          <button onClick={() => setCollapsed(c => !c)}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:bg-muted flex items-center gap-1">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            {collapsed ? "Expandir" : "Colapsar"}
          </button>
        </div>

        {formatsWithBanners.length > 0 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterFormat("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              Todos ({banners.length})
            </button>
            {formatsWithBanners.map(f => (
              <button key={f.value} onClick={() => setFilterFormat(f.value)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
                {f.label} ({banners.filter(b => b.format === f.value).length})
              </button>
            ))}
          </div>
        )}
      </div>

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
              onEdit={() => handleEdit(b)}
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
