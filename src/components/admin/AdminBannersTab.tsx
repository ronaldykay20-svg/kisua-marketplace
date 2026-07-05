import { useState, useRef } from "react";
import {
  Plus, Trash2, Eye, EyeOff, Upload, X, Loader2,
  ImageIcon, ChevronDown, ChevronUp, Pencil, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { getSlotsForDevice, SIDEBAR_SLOTS, getHomeSlotLabel } from "@/lib/bannerSlots";
import { convertToWebP, getFileExtension } from "@/lib/imageToWebp";

type Device = "mobile" | "tablet" | "desktop";

const DEVICES: { value: Device; label: string }[] = [
  { value: "mobile",  label: "Mobile"  },
  { value: "tablet",  label: "Tablet"  },
  { value: "desktop", label: "Desktop" },
];

const FORMATS = [
  { value: "hero",           label: "Hero (carrossel)"          },
  { value: "hero-full",      label: "Hero Full"                 },
  { value: "wide",           label: "Wide"                      },
  { value: "wide-slim",      label: "Wide Slim"                 },
  { value: "duo-square",     label: "Duo (2 imagens)"           },
  { value: "trio-banner",    label: "Trio (3 imagens)"          },
  { value: "mosaic",         label: "Mosaico"                   },
  { value: "promo",          label: "Promo (4 imagens)"         },
  { value: "square",         label: "Quadrado"                  },
  { value: "square-rounded", label: "Quadrado Redondo"          },
  { value: "vertical",       label: "Vertical"                  },
  { value: "story-card",     label: "Story Card"                },
  { value: "tall",           label: "Tall"                      },
  { value: "natural",        label: "Natural"                   },
  { value: "split",          label: "Split (2 colunas livres)"  },
];

// Layouts por número de imagens
const LAYOUTS_BY_COUNT: Record<number, { value: string; label: string; diagram: string }[]> = {
  1: [
    { value: "1-full", label: "Ocupa tudo", diagram: "█" },
  ],
  2: [
    { value: "2-col", label: "Coluna", diagram: "▀\n▄" },
    { value: "2-row", label: "Lado a lado", diagram: "▌▐" },
  ],
  3: [
    { value: "3-col",          label: "Coluna",           diagram: "▀\n▄\n▄" },
    { value: "3-row",          label: "Lado a lado",      diagram: "▌▐▐" },
    { value: "3-2cima-1baixo", label: "2↑ + 1↓",         diagram: "▌▐\n██" },
    { value: "3-1cima-2baixo", label: "1↑ + 2↓",         diagram: "██\n▌▐" },
    { value: "3-2esq-1dir",    label: "2esq + 1dir",      diagram: "▀▐\n▄▐" },
    { value: "3-1esq-2dir",    label: "1esq + 2dir",      diagram: "▌▀\n▌▄" },
  ],
  4: [
    { value: "4-2x2",          label: "Grelha 2×2",       diagram: "▌▐\n▌▐" },
    { value: "4-col",          label: "Coluna",           diagram: "▀\n▄\n▄\n▄" },
    { value: "4-row",          label: "Lado a lado",      diagram: "▌▐▐▐" },
    { value: "4-1cima-3baixo", label: "1↑ + 3↓",         diagram: "███\n▌▐▐" },
    { value: "4-3cima-1baixo", label: "3↑ + 1↓",         diagram: "▌▐▐\n███" },
    { value: "4-1esq-3dir",    label: "1esq + 3dir",      diagram: "▌▀\n▌▄\n▌▄" },
    { value: "4-3esq-1dir",    label: "3esq + 1dir",      diagram: "▀▐\n▄▐\n▄▐" },
  ],
};

const getLayoutsForCount = (n: number) =>
  LAYOUTS_BY_COUNT[Math.min(n, 4)] ?? LAYOUTS_BY_COUNT[1];

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
  split_side: "left" | "right" | null;
  split_layout: string | null;
  banner_group_id: string | null;
  created_at: string;
}

/**
 * Os slots de cada device são posicionalmente equivalentes: mobile 1 ↔
 * tablet 201 ↔ desktop 301, mobile 2 ↔ tablet 202 ↔ desktop 302, etc.
 * Isto permite "traduzir" a posição de um banner de um device para outro
 * quando o Admin marca "mostrar também em Tablet/Desktop". Slots da
 * sidebar (101-103, só existem no desktop) não têm equivalente.
 */
const DEVICE_OFFSET: Record<Device, number> = { mobile: 0, tablet: 200, desktop: 300 };

function equivalentSlot(fromDevice: Device, slotValue: number, toDevice: Device): number | null {
  if (SIDEBAR_SLOTS.includes(slotValue)) return null; // sem equivalente noutros devices
  const basePosition = slotValue - DEVICE_OFFSET[fromDevice];
  if (basePosition < 1 || basePosition > 16) return null;
  return basePosition + DEVICE_OFFSET[toDevice];
}

async function uploadBannerImage(file: File): Promise<string> {
  const uploadFile = await convertToWebP(file, 0.8, 1600);
  const ext = getFileExtension(uploadFile);
  const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.banners)
    .upload(path, uploadFile, { upsert: true });
  if (error) throw new Error("Upload falhou: " + error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKETS.banners).getPublicUrl(path);
  return data.publicUrl;
}

/* ─── CategorySelect ─────────────────────────────────────────────────────── */
const CategorySelect = ({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories_for_banner"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value || null)}
      className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
    >
      <option value="">— Sem categoria —</option>
      {isLoading && <option disabled>A carregar...</option>}
      {categories.map((c: any) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
};

/* ─── SplitSideUploader ──────────────────────────────────────────────────── */
interface SplitSideUploaderProps {
  side: "left" | "right";
  images: { file?: File; preview: string; link: string }[];
  layout: string;
  onChange: (imgs: { file?: File; preview: string; link: string }[]) => void;
  onLayoutChange: (layout: string) => void;
}

const SplitSideUploader = ({ side, images, layout, onChange, onLayoutChange }: SplitSideUploaderProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const label = side === "left" ? "◧ Esquerda" : "◨ Direita";
  const color = side === "left" ? "border-blue-500/40 bg-blue-500/5" : "border-purple-500/40 bg-purple-500/5";
  const badge = side === "left" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500";

  const imgCount = Math.max(images.length, 1);
  const layouts = getLayoutsForCount(imgCount);

  const validLayout = layouts.find(l => l.value === layout) ? layout : layouts[0].value;

  const addFiles = (files: FileList) => {
    const toAdd = Array.from(files).slice(0, 4 - images.length);
    const newImgs = toAdd.map(f => ({ file: f, preview: URL.createObjectURL(f), link: "" }));
    const next = [...images, ...newImgs];
    onChange(next);
    const newLayouts = getLayoutsForCount(next.length);
    if (!newLayouts.find(l => l.value === layout)) onLayoutChange(newLayouts[0].value);
  };

  const remove = (i: number) => {
    const next = [...images]; next.splice(i, 1); onChange(next);
    const newLayouts = getLayoutsForCount(Math.max(next.length, 1));
    if (!newLayouts.find(l => l.value === layout)) onLayoutChange(newLayouts[0].value);
  };

  const setLink = (i: number, val: string) => {
    const next = [...images]; next[i] = { ...next[i], link: val }; onChange(next);
  };

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${color}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
        <span className="text-[10px] text-muted-foreground">{images.length}/4 imagens</span>
      </div>

      {images.length === 0 ? (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs font-bold text-foreground">Upload para {label}</p>
          <p className="text-[10px] text-muted-foreground">1 a 4 imagens</p>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, i) => (
            <div key={i} className="space-y-1">
              <div className="relative rounded-lg overflow-hidden border border-border aspect-video">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => remove(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">
                  {i === 0 ? "Principal" : `Extra ${i}`}
                </span>
              </div>
              <input placeholder="Link ao clicar" value={img.link} onChange={e => setLink(i, e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-background border border-border text-[10px] text-foreground" />
            </div>
          ))}
          {images.length < 4 && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition">
              <Plus className="w-5 h-5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground mt-1">Adicionar</p>
            </button>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

      {images.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground mb-1.5">
            Disposição ({images.length} {images.length === 1 ? "imagem" : "imagens"})
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {layouts.map(l => (
              <button key={l.value} type="button" onClick={() => onLayoutChange(l.value)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition ${
                  validLayout === l.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}>
                <span className="font-mono text-[11px] leading-none whitespace-pre opacity-70">{l.diagram}</span>
                <span className="text-[10px] font-bold leading-tight">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Formulário ─────────────────────────────────────────────────────────── */
interface FormProps {
  initial?: BannerRow | null;
  initialSplitPair?: { left: BannerRow | null; right: BannerRow | null };
  existingBanners: BannerRow[];
  onClose: () => void;
  onSaved: () => void;
}

type ImgEntry = { file?: File; preview: string; link: string };

type FormState = {
  device: Device;
  extraDevices: Device[];
  sort_order: number;
  format: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  text_position: string;
  text_color: string;
  text_bg_color: string;
  text_bg_enabled: boolean;
  is_active: boolean;
  category_id: string | null;
  bg_color: string;
  extraImgFiles: File[];
  extraImgPreviews: string[];
  extra_links: string[];
  splitLeft: ImgEntry[];
  splitRight: ImgEntry[];
  splitLeftLayout: string;
  splitRightLayout: string;
};

const emptyForm = (): FormState => ({
  device: "mobile", extraDevices: [], sort_order: 1, format: "hero",
  title: "", subtitle: "", cta_text: "", cta_link: "", image_url: "",
  text_position: "bottom-left", text_color: "#ffffff",
  text_bg_color: "#000000", text_bg_enabled: false,
  is_active: true, category_id: null, bg_color: "#F0F9FF",
  extraImgFiles: [], extraImgPreviews: [], extra_links: [],
  splitLeft: [], splitRight: [],
  splitLeftLayout: "1-full", splitRightLayout: "1-full",
});

const BannerForm = ({ initial, initialSplitPair, existingBanners, onClose, onSaved }: FormProps) => {
  const isEdit = !!initial || !!initialSplitPair;
  const isSplitEdit = !!initialSplitPair;
  const mainFileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(() => {
    if (initialSplitPair) {
      const ref = initialSplitPair.left || initialSplitPair.right!;
      const buildSideEntries = (b: BannerRow | null): ImgEntry[] => {
        if (!b) return [];
        const allImgs = [b.image_url, ...(b.extra_images || [])].filter(Boolean);
        const links   = [b.cta_link || "", ...(b.extra_links || [])];
        return allImgs.map((url, i) => ({ preview: url, link: links[i] || "" }));
      };
      return {
        device: ref.device || "mobile", extraDevices: [], sort_order: ref.sort_order, format: "split",
        title: ref.title || "", subtitle: ref.subtitle || "",
        cta_text: ref.cta_text || "", cta_link: ref.cta_link || "", image_url: "",
        text_position: ref.text_position || "bottom-left",
        text_color: (ref as any).text_color || "#ffffff",
        text_bg_color: (ref as any).text_bg_color || "#000000",
        text_bg_enabled: !!(ref as any).text_bg_color,
        is_active: ref.is_active, category_id: ref.category_id, bg_color: ref.bg_color || "#F0F9FF",
        extraImgFiles: [], extraImgPreviews: [], extra_links: [],
        splitLeft: buildSideEntries(initialSplitPair.left),
        splitRight: buildSideEntries(initialSplitPair.right),
        splitLeftLayout:  initialSplitPair.left?.split_layout  || "1-full",
        splitRightLayout: initialSplitPair.right?.split_layout || "1-full",
      };
    }
    if (!initial) return emptyForm();
    const siblingDevices = initial.banner_group_id
      ? existingBanners
          .filter(b => b.banner_group_id === initial.banner_group_id && b.id !== initial.id)
          .map(b => b.device || "mobile")
      : [];
    return {
      device: initial.device || "mobile", extraDevices: siblingDevices, sort_order: initial.sort_order, format: initial.format,
      title: initial.title || "", subtitle: initial.subtitle || "",
      cta_text: initial.cta_text || "", cta_link: initial.cta_link || "",
      image_url: initial.image_url || "", text_position: initial.text_position || "bottom-left",
      text_color: (initial as any).text_color || "#ffffff",
      text_bg_color: (initial as any).text_bg_color || "#000000",
      text_bg_enabled: !!(initial as any).text_bg_color,
      is_active: initial.is_active, category_id: initial.category_id, bg_color: initial.bg_color || "#F0F9FF",
      extraImgFiles: [], extraImgPreviews: (initial.extra_images || []) as string[],
      extra_links: (initial.extra_links || []) as string[],
      splitLeft: [], splitRight: [],
      splitLeftLayout: "1-full", splitRightLayout: "1-full",
    };
  });

  const [mainFile, setMainFile]       = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string>(initial?.image_url || "");
  const [saving, setSaving]           = useState(false);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const slots = getSlotsForDevice(form.device);
  const occupiedSlots = existingBanners
    .filter(b => (b.device || "mobile") === form.device && b.format !== "split")
    .filter(b => !isEdit || b.id !== initial?.id)
    .map(b => b.sort_order);

  const isSplit    = form.format === "split";
  const needsExtra = !isSplit ? (EXTRA_COUNT[form.format] || 0) : 0;

  const handleMainFile = (f: File) => { setMainFile(f); setMainPreview(URL.createObjectURL(f)); };
  const handleExtraFiles = (files: FileList) => {
    const arr = Array.from(files);
    const previews = arr.map(f => URL.createObjectURL(f));
    setForm(f => ({ ...f, extraImgFiles: [...f.extraImgFiles, ...arr], extraImgPreviews: [...f.extraImgPreviews, ...previews] }));
  };
  const removeExtra = (i: number) => {
    setForm(f => {
      const imgs = [...f.extraImgPreviews]; imgs.splice(i, 1);
      const files = [...f.extraImgFiles];
      const existingCount = (initial?.extra_images || []).length;
      if (i >= existingCount) files.splice(i - existingCount, 1);
      return { ...f, extraImgPreviews: imgs, extraImgFiles: files };
    });
  };

  const save = async () => {
    if (isSplit) {
      if (form.splitLeft.length === 0 && form.splitRight.length === 0) {
        toast.error("Adiciona pelo menos uma imagem num dos lados"); return;
      }
    } else {
      if (!mainPreview && !mainFile) { toast.error("Adiciona a imagem principal"); return; }
    }
    setSaving(true);
    try {
      if (isSplit) {
        if (isSplitEdit) {
          const ids = [initialSplitPair?.left?.id, initialSplitPair?.right?.id].filter(Boolean) as string[];
          for (const id of ids) await supabase.from("banners" as any).delete().eq("id", id);
        }
        const uploadSide = async (imgs: ImgEntry[], side: "left" | "right", sideLayout: string) => {
          if (imgs.length === 0) return;
          const uploadedUrls = await Promise.all(imgs.map(img => img.file ? uploadBannerImage(img.file) : Promise.resolve(img.preview)));
          const [mainUrl, ...extraUrls] = uploadedUrls;
          const [mainLink, ...extraLinks] = imgs.map(img => img.link || "");
          const { error } = await supabase.from("banners" as any).insert({
            title: form.title || null, subtitle: form.subtitle || null,
            cta_text: form.cta_text || null, cta_link: mainLink || form.cta_link || "#",
            image_url: mainUrl, extra_images: extraUrls,
            extra_links: extraLinks.filter(Boolean),
            format: "split", bg_color: form.bg_color, sort_order: form.sort_order,
            is_active: form.is_active, text_position: form.text_position,
            text_color: form.text_color,
            text_bg_color: form.text_bg_enabled ? form.text_bg_color : null,
            category_id: form.category_id, device: form.device,
            split_side: side, split_layout: sideLayout,
          });
          if (error) throw new Error(error.message);
        };
        await uploadSide(form.splitLeft,  "left",  form.splitLeftLayout);
        await uploadSide(form.splitRight, "right", form.splitRightLayout);
        toast.success(isSplitEdit ? "Split atualizado!" : "Split criado!");
      } else {
        let imageUrl = form.image_url;
        if (mainFile) imageUrl = await uploadBannerImage(mainFile);
        if (!imageUrl) throw new Error("URL da imagem principal em falta");
        const existingExtras = (initial?.extra_images || []).filter(u => form.extraImgPreviews.includes(u));
        const newExtras = await Promise.all(form.extraImgFiles.map(uploadBannerImage));
        const allExtras = [...existingExtras, ...newExtras];

        // Só criamos/mantemos um group_id se houver pelo menos um device
        // extra marcado. Reaproveita o group_id existente ao editar, para
        // não perder a ligação aos clones já criados.
        const groupId = form.extraDevices.length > 0
          ? (initial?.banner_group_id || crypto.randomUUID())
          : null;

        const basePayload: Record<string, any> = {
          title: form.title || "", subtitle: form.subtitle || "",
          cta_text: form.cta_text || "Compre agora", cta_link: form.cta_link || "#",
          image_url: imageUrl, extra_images: allExtras.length ? allExtras : [],
          extra_links: form.extra_links.filter(Boolean), format: form.format,
          bg_color: form.bg_color, is_active: form.is_active,
          text_position: form.text_position, text_color: form.text_color,
          text_bg_color: form.text_bg_enabled ? form.text_bg_color : null,
          category_id: form.category_id, split_side: null, split_layout: null,
        };
        const primaryPayload = { ...basePayload, device: form.device, sort_order: form.sort_order, banner_group_id: groupId };

        let primaryId = initial?.id as string | undefined;
        if (isEdit && initial) {
          const { error } = await supabase.from("banners" as any).update(primaryPayload).eq("id", initial.id);
          if (error) throw new Error(error.message);
        } else {
          const { data, error } = await supabase.from("banners" as any).insert(primaryPayload).select("id").single();
          if (error) throw new Error(error.message);
          primaryId = (data as any).id;
        }

        // Os clones de outros devices são sempre recriados de raiz — mais
        // simples e seguro do que tentar sincronizar campo a campo.
        if (initial?.banner_group_id) {
          await supabase.from("banners" as any).delete()
            .eq("banner_group_id", initial.banner_group_id)
            .neq("id", primaryId as string);
        }

        const skippedDevices: string[] = [];
        for (const targetDevice of form.extraDevices) {
          const targetSlot = equivalentSlot(form.device, form.sort_order, targetDevice);
          if (targetSlot === null) { skippedDevices.push(DEVICES.find(d => d.value === targetDevice)!.label); continue; }
          const occupied = existingBanners.some(b =>
            b.id !== primaryId && b.banner_group_id !== groupId && b.format !== "split" &&
            (b.device || "mobile") === targetDevice && b.sort_order === targetSlot
          );
          if (occupied) { skippedDevices.push(`${DEVICES.find(d => d.value === targetDevice)!.label} (posição ocupada)`); continue; }
          const { error } = await supabase.from("banners" as any).insert({
            ...basePayload, device: targetDevice, sort_order: targetSlot, banner_group_id: groupId,
          });
          if (error) throw new Error(error.message);
        }

        if (skippedDevices.length > 0) {
          toast.error(`Não foi possível duplicar para: ${skippedDevices.join(", ")}. Ajusta manualmente na aba desse device.`);
        }
        toast.success(isEdit ? "Banner atualizado!" : "Banner criado!");
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground">{isEdit ? "Editar Banner" : "Novo Banner"}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Dispositivo</label>
          <div className="flex gap-2">
            {DEVICES.map(d => (
              <button type="button" key={d.value}
                onClick={() => {
                  set("device", d.value);
                  set("sort_order", getSlotsForDevice(d.value)[0].value);
                  set("extraDevices", form.extraDevices.filter(x => x !== d.value));
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${form.device === d.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"}`}>
                {d.label}
              </button>
            ))}
          </div>
          {!isSplit && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Também mostrar (mesmo conteúdo, posição equivalente):
              </p>
              <div className="flex gap-2">
                {DEVICES.filter(d => d.value !== form.device).map(d => {
                  const checked = form.extraDevices.includes(d.value);
                  return (
                    <button type="button" key={d.value}
                      onClick={() => set("extraDevices", checked
                        ? form.extraDevices.filter(x => x !== d.value)
                        : [...form.extraDevices, d.value])}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${checked ? "bg-primary/10 text-primary border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-border"}`}>
                        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </span>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
            Posição na página
            {isSplit && <span className="text-primary ml-1">(mesmo número = mesmo bloco split)</span>}
          </label>
          <select value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {slots.map(slot => {
              const occupied = !isSplit && occupiedSlots.includes(slot.value);
              return <option key={slot.value} value={slot.value} disabled={occupied}>{slot.label}{occupied ? " — ocupado" : ""}</option>;
            })}
          </select>
          {form.device === "desktop" && SIDEBAR_SLOTS.includes(form.sort_order) && (
            <p className="text-[10px] text-muted-foreground mt-1">📌 Aparece na sidebar direita do desktop.</p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Formato</label>
          <select value={form.format} onChange={e => { set("format", e.target.value); if (e.target.value === "split") set("extraDevices", []); }}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {isSplit ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-bold text-foreground mb-1">◧ Esquerda | ◨ Direita — 50% cada</p>
              <p className="text-[10px] text-muted-foreground">
                Adiciona 1 a 4 imagens por lado. A disposição adapta-se ao número de imagens.
              </p>
            </div>
            <SplitSideUploader side="left"  images={form.splitLeft}  layout={form.splitLeftLayout}
              onChange={v => set("splitLeft", v)} onLayoutChange={v => set("splitLeftLayout", v)} />
            <SplitSideUploader side="right" images={form.splitRight} layout={form.splitRightLayout}
              onChange={v => set("splitRight", v)} onLayoutChange={v => set("splitRightLayout", v)} />
          </div>
        ) : (
          <>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem principal *</label>
              {mainPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border mb-1">
                  <img src={mainPreview} alt="Preview" className="w-full max-h-40 object-cover" />
                  <button type="button" onClick={() => { setMainFile(null); setMainPreview(""); set("image_url", ""); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => mainFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <p className="text-xs font-bold text-foreground">Clique para fazer upload</p>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP, GIF</p>
                </button>
              )}
              <input ref={mainFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleMainFile(e.target.files[0])} />
              <input placeholder="Ou cole o URL da imagem"
                value={mainFile ? "" : (form.image_url || "")}
                onChange={e => { set("image_url", e.target.value); setMainPreview(e.target.value); setMainFile(null); }}
                className="w-full mt-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground" />
            </div>
            {needsExtra > 0 && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
                  Imagens extra ({form.extraImgPreviews.length}/{needsExtra} recomendadas)
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {form.extraImgPreviews.map((p, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                      <img src={p} alt={`Extra ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExtra(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {form.extraImgPreviews.length < needsExtra && (
                    <button type="button" onClick={() => extraFileRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition">
                      <Plus className="w-5 h-5 text-muted-foreground" /><p className="text-[10px] text-muted-foreground mt-1">Adicionar</p>
                    </button>
                  )}
                </div>
                <input ref={extraFileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => e.target.files && handleExtraFiles(e.target.files)} />
                {form.extraImgPreviews.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[10px] font-bold text-muted-foreground">Links das imagens extra</p>
                    {form.extraImgPreviews.map((_, i) => (
                      <input key={i} placeholder={`URL imagem ${i + 2}`} value={form.extra_links[i] || ""}
                        onChange={e => { const links = [...form.extra_links]; links[i] = e.target.value; set("extra_links", links); }}
                        className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Título (opcional)" value={form.title} onChange={e => set("title", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          <input placeholder="Subtítulo (opcional)" value={form.subtitle} onChange={e => set("subtitle", e.target.value)}
            className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          {!isSplit && <>
            <input placeholder="Texto CTA" value={form.cta_text} onChange={e => set("cta_text", e.target.value)}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <input placeholder="URL de destino" value={form.cta_link} onChange={e => set("cta_link", e.target.value)}
              className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </>}
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Posição do texto</label>
          <div className="grid grid-cols-3 gap-1.5">
            {TEXT_POSITIONS.map(p => (
              <button type="button" key={p.value} onClick={() => set("text_position", p.value)}
                className={`py-2 rounded-lg text-[10px] font-bold border transition text-center ${form.text_position === p.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Cor do texto</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.text_color} onChange={e => set("text_color", e.target.value)}
              className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
            <input value={form.text_color} onChange={e => set("text_color", e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <span className="px-3 py-1.5 rounded-lg text-xs font-black border border-border"
              style={{ color: form.text_color, backgroundColor: form.text_bg_enabled ? form.text_bg_color : "transparent" }}>Texto</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Fundo do texto (caixa)</span>
            <button type="button" onClick={() => set("text_bg_enabled", !form.text_bg_enabled)}
              className={`w-10 h-6 rounded-full transition relative ${form.text_bg_enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.text_bg_enabled ? "translate-x-4" : ""}`} />
            </button>
          </div>
          {form.text_bg_enabled && (
            <div className="flex items-center gap-2">
              <input type="color" value={form.text_bg_color} onChange={e => set("text_bg_color", e.target.value)}
                className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
              <input value={form.text_bg_color} onChange={e => set("text_bg_color", e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            </div>
          )}
        </div>

        {/* ─── Categoria vinculada ─────────────────────────────────────────── */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
            Categoria vinculada (opcional)
          </label>
          <CategorySelect value={form.category_id} onChange={v => set("category_id", v)} />
          <p className="text-[10px] text-muted-foreground mt-1">
            Ao clicar no banner, o utilizador será redirecionado para esta categoria.
          </p>
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border">
          <span className="text-sm font-bold text-foreground">Activo</span>
          <button type="button" onClick={() => set("is_active", !form.is_active)}
            className={`w-10 h-6 rounded-full transition relative ${form.is_active ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_active ? "translate-x-4" : ""}`} />
          </button>
        </div>

        <button type="button" onClick={save} disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</> : <><Check className="w-4 h-4" /> {isEdit ? "Guardar alterações" : "Criar banner"}</>}
        </button>
      </div>
    </div>
  );
};

/* ─── Cards ──────────────────────────────────────────────────────────────── */
const SplitBannerCard = ({ leftBanner, rightBanner, onEdit, onToggle, onDelete }: {
  leftBanner: BannerRow | null; rightBanner: BannerRow | null;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) => {
  const ref = leftBanner || rightBanner!;
  const isActive = ref.is_active;
  const leftCount  = leftBanner  ? 1 + (leftBanner.extra_images?.length  || 0) : 0;
  const rightCount = rightBanner ? 1 + (rightBanner.extra_images?.length || 0) : 0;

  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden transition ${!isActive ? "opacity-55" : ""}`}>
      <div className="grid grid-cols-2 h-24 bg-muted gap-0.5">
        <div className="relative overflow-hidden">
          {leftBanner ? <img src={leftBanner.image_url} alt="Esquerda" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-muted"><span className="text-[10px] text-muted-foreground">Sem imagem</span></div>}
          <span className="absolute top-1 left-1 text-[9px] bg-blue-500/90 text-white px-1.5 py-0.5 rounded-full font-bold">
            ◧ {leftCount}img · {leftBanner?.split_layout || "—"}
          </span>
        </div>
        <div className="relative overflow-hidden">
          {rightBanner ? <img src={rightBanner.image_url} alt="Direita" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-muted"><span className="text-[10px] text-muted-foreground">Sem imagem</span></div>}
          <span className="absolute top-1 right-1 text-[9px] bg-purple-500/90 text-white px-1.5 py-0.5 rounded-full font-bold">
            ◨ {rightCount}img · {rightBanner?.split_layout || "—"}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ref.device === "tablet" ? "bg-purple-500/10 text-purple-500" : ref.device === "desktop" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>{ref.device || "mobile"}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Split · {leftCount}esq + {rightCount}dir</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{getHomeSlotLabel(ref.sort_order)}</span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button type="button" onClick={onEdit} className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-accent transition"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={onToggle} className={`p-1.5 rounded-lg transition ${isActive ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>{isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
            <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {ref.title && <p className="text-xs font-bold text-foreground truncate">{ref.title}</p>}
      </div>
    </div>
  );
};

const BannerCard = ({ banner, otherDevices, onEdit, onToggle, onDelete }: {
  banner: BannerRow; otherDevices: Device[]; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) => {
  const deviceColor: Record<string, string> = { mobile: "bg-blue-500/10 text-blue-500", tablet: "bg-purple-500/10 text-purple-500", desktop: "bg-green-500/10 text-green-500" };
  const fmt = FORMATS.find(f => f.value === banner.format);
  const imgCount = 1 + (banner.extra_images?.length || 0);
  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden transition ${!banner.is_active ? "opacity-55" : ""}`}>
      {banner.image_url && (
        <div className="relative h-24 bg-muted">
          <img src={banner.image_url} alt={banner.title || "Banner"} className="w-full h-full object-cover" />
          {imgCount > 1 && <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">+{imgCount - 1} imgs</span>}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${deviceColor[banner.device || "mobile"] || deviceColor.mobile}`}>{banner.device || "mobile"}</span>
            {otherDevices.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground" title="Mesmo banner, mostrado também nestes devices">
                + {otherDevices.join(", ")}
              </span>
            )}
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{fmt?.label || banner.format}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">{getHomeSlotLabel(banner.sort_order)}</span>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button type="button" onClick={onEdit} className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-accent transition"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={onToggle} className={`p-1.5 rounded-lg transition ${banner.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>{banner.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
            <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {banner.title && <p className="text-xs font-bold text-foreground truncate">{banner.title}</p>}
        {banner.cta_link && <p className="text-[10px] text-muted-foreground truncate">{banner.cta_link}</p>}
      </div>
    </div>
  );
};

/* ─── Tab principal ──────────────────────────────────────────────────────── */
const AdminBannersTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]           = useState(false);
  const [editBanner, setEditBanner]       = useState<BannerRow | null>(null);
  const [editSplitPair, setEditSplitPair] = useState<{ left: BannerRow | null; right: BannerRow | null } | null>(null);
  const [filterDevice, setFilterDevice]   = useState<Device | "all">("all");
  const [filterFormat, setFilterFormat]   = useState<string>("all");
  const [collapsed, setCollapsed]         = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin_banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners" as any).select("*").order("sort_order").order("created_at");
      if (error) throw new Error(error.message);
      return (data || []) as BannerRow[];
    },
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["admin_banners"] }); queryClient.invalidateQueries({ queryKey: ["banners"] }); };

  const toggleBanner = useMutation({
    mutationFn: async ({ id, active, groupId }: { id: string; active: boolean; groupId?: string | null }) => {
      // Se pertence a um grupo (mostrado em vários devices), activa/desactiva
      // todos os clones juntos — senão ficaria inconsistente entre devices.
      const query = groupId
        ? supabase.from("banners" as any).update({ is_active: active }).eq("banner_group_id", groupId)
        : supabase.from("banners" as any).update({ is_active: active }).eq("id", id);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate, onError: (e: any) => toast.error(e.message),
  });

  const deleteBanner = useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId?: string | null }) => {
      // O mesmo raciocínio do toggle: eliminar um elimina o grupo todo.
      const query = groupId
        ? supabase.from("banners" as any).delete().eq("banner_group_id", groupId)
        : supabase.from("banners" as any).delete().eq("id", id);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { invalidate(); toast.success("Banner eliminado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = { total: banners.length, active: banners.filter(b => b.is_active).length, mobile: banners.filter(b => (b.device || "mobile") === "mobile").length, tablet: banners.filter(b => b.device === "tablet").length, desktop: banners.filter(b => b.device === "desktop").length };

  const splitGroups = new Map<string, { left: BannerRow | null; right: BannerRow | null }>();
  const nonSplitBanners: BannerRow[] = [];
  banners.forEach(b => {
    if (b.format === "split") {
      const key = `${b.device || "mobile"}-${b.sort_order}`;
      if (!splitGroups.has(key)) splitGroups.set(key, { left: null, right: null });
      const group = splitGroups.get(key)!;
      if (b.split_side === "left"  && !group.left)  group.left  = b;
      if (b.split_side === "right" && !group.right) group.right = b;
    } else { nonSplitBanners.push(b); }
  });

  const filteredNonSplit = nonSplitBanners.filter(b => filterDevice === "all" || (b.device || "mobile") === filterDevice).filter(b => filterFormat === "all" || b.format === filterFormat);
  const filteredSplitGroups = [...splitGroups.entries()].filter(([key]) => filterDevice === "all" || key.startsWith(filterDevice + "-")).filter(() => filterFormat === "all" || filterFormat === "split");
  const formatsWithBanners = FORMATS.filter(f => banners.some(b => b.format === f.value));
  const closeForm = () => { setShowForm(false); setEditBanner(null); setEditSplitPair(null); };

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
            <p className="text-base font-black">{s.value}</p><p className="text-[9px] font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      {editSplitPair ? <BannerForm initialSplitPair={editSplitPair} existingBanners={banners} onClose={closeForm} onSaved={invalidate} />
        : editBanner ? <BannerForm initial={editBanner} existingBanners={banners} onClose={closeForm} onSaved={invalidate} />
        : showForm ? <BannerForm existingBanners={banners} onClose={closeForm} onSaved={invalidate} />
        : <button type="button" onClick={() => setShowForm(true)} className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Novo Banner</button>}

      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[{ value: "all", label: "Todos" }, ...DEVICES].map(d => (
            <button type="button" key={d.value} onClick={() => setFilterDevice(d.value as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition ${filterDevice === d.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}>
              {d.label}
            </button>
          ))}
          <button type="button" onClick={() => setCollapsed(c => !c)}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:bg-muted flex items-center gap-1">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}{collapsed ? "Expandir" : "Colapsar"}
          </button>
        </div>
        {formatsWithBanners.length > 0 && (
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            <button type="button" onClick={() => setFilterFormat("all")}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
              Todos ({banners.length})
            </button>
            {formatsWithBanners.map(f => (
              <button type="button" key={f.value} onClick={() => setFilterFormat(f.value)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${filterFormat === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}>
                {f.label} ({banners.filter(b => b.format === f.value).length})
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
      {!isLoading && filteredNonSplit.length === 0 && filteredSplitGroups.length === 0 && (
        <div className="text-center py-10">
          <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Nenhum banner</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro banner</p>
        </div>
      )}

      {!collapsed && (
        <div className="grid grid-cols-1 gap-3">
          {filteredSplitGroups.map(([key, group]) => (
            <SplitBannerCard key={key} leftBanner={group.left} rightBanner={group.right}
              onEdit={() => { setEditSplitPair(group); setShowForm(false); setEditBanner(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onToggle={() => { const ids = [group.left?.id, group.right?.id].filter(Boolean) as string[]; const active = !(group.left || group.right)?.is_active; ids.forEach(id => toggleBanner.mutate({ id, active })); }}
              onDelete={() => { if (!confirm("Eliminar este bloco split?")) return; const ids = [group.left?.id, group.right?.id].filter(Boolean) as string[]; ids.forEach(id => deleteBanner.mutate({ id })); }}
            />
          ))}
          {filteredNonSplit.map(b => (
            <BannerCard key={b.id} banner={b}
              otherDevices={b.banner_group_id
                ? banners.filter(x => x.banner_group_id === b.banner_group_id && x.id !== b.id).map(x => x.device || "mobile")
                : []}
              onEdit={() => { setEditBanner(b); setShowForm(false); setEditSplitPair(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onToggle={() => toggleBanner.mutate({ id: b.id, active: !b.is_active, groupId: b.banner_group_id })}
              onDelete={() => { if (confirm(b.banner_group_id ? "Este banner também aparece noutro(s) device(s) — eliminar vai remover todas as cópias. Continuar?" : "Eliminar este banner?")) deleteBanner.mutate({ id: b.id, groupId: b.banner_group_id }); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBannersTab;
