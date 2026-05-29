import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Save, X, Trash2, Image as ImageIcon, Film, Plus,
  ChevronDown, ChevronRight, AlertTriangle, Clock, Camera,
  Weight, Package2, Ruler, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { useUserRole } from "@/hooks/useUserRole";

// ─── Types ────────────────────────────────────────────────
interface ProductFormData {
  title: string;
  description: string;
  price: string;
  old_price: string;
  discount_percent: string;
  stock: string;
  sku: string;
  condition: string;
  category_id: string;
  free_shipping: boolean;
  badge: string;
  is_sponsored: boolean;
  promotion_ends_at: string;
  // Medidas
  weight_kg: string;
  volume_m3: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
}

interface MediaItem {
  id?: string;
  url: string;
  type: "image" | "video";
  is_cover: boolean;
  sort_order: number;
  file?: File;
}

export interface VariantItem {
  id?: string;
  variant_type: string;
  name: string;
  value: string;
  price_override: string;
  stock: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string | null;
  _tempId: string;
  _children?: VariantItem[];
  _expanded?: boolean;
}

interface Props {
  editingProduct?: any;
  existingMedia?: any[];
  existingVariants?: any[];
  onSave: (data: any, media: MediaItem[], variants: VariantItem[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

// ─── Constantes ───────────────────────────────────────────
const generateTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyVariant = (parentId?: string | null): VariantItem => ({
  variant_type: parentId ? "size" : "color",
  name: "", value: "", price_override: "", stock: "1", image_url: "",
  sort_order: 0, is_active: true, parent_id: parentId || null,
  _tempId: generateTempId(), _expanded: true,
});

const emptyForm: ProductFormData = {
  title: "", description: "", price: "", old_price: "", discount_percent: "",
  stock: "1", sku: "", condition: "new",
  category_id: "", free_shipping: false, badge: "", is_sponsored: false,
  promotion_ends_at: "",
  weight_kg: "", volume_m3: "", length_cm: "", width_cm: "", height_cm: "",
};

const conditions = [
  { value: "new", label: "Novo" },
  { value: "like_new", label: "Como novo" },
  { value: "good", label: "Bom estado" },
  { value: "used", label: "Usado" },
  { value: "refurbished", label: "Recondicionado" },
];

const badges = [
  { value: "", label: "Nenhum" },
  { value: "HOT", label: "🔥 HOT" },
  { value: "NOVO", label: "🆕 NOVO" },
  { value: "PROMO", label: "💰 PROMO" },
  { value: "LIMITED", label: "⏰ LIMITADO" },
];

const variantTypes = [
  { value: "color", label: "Cor" },
  { value: "size", label: "Tamanho" },
  { value: "weight", label: "Peso" },
  { value: "capacity", label: "Capacidade" },
  { value: "model", label: "Modelo" },
  { value: "voltage", label: "Voltagem" },
  { value: "material", label: "Material" },
  { value: "style", label: "Estilo" },
  { value: "pack", label: "Pacote/Quantidade" },
  { value: "other", label: "Outro" },
];

const colorPresets = [
  { name: "Preto", value: "#000000" }, { name: "Branco", value: "#FFFFFF" },
  { name: "Vermelho", value: "#EF4444" }, { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#22C55E" }, { name: "Amarelo", value: "#EAB308" },
  { name: "Rosa", value: "#EC4899" }, { name: "Roxo", value: "#A855F7" },
  { name: "Laranja", value: "#F97316" }, { name: "Cinza", value: "#6B7280" },
  { name: "Castanho", value: "#92400E" }, { name: "Bege", value: "#D2B48C" },
];

const getPlaceholder = (type: string) => {
  switch (type) {
    case "color": return "Ex: Azul";
    case "size": return "Ex: M, L, XL";
    case "weight": return "Ex: 500g, 1kg";
    case "capacity": return "Ex: 64GB, 128GB";
    case "model": return "Ex: Pro, Lite";
    case "voltage": return "Ex: 110V, 220V";
    case "pack": return "Ex: 3 unidades";
    default: return "Ex: Algodão";
  }
};

const toLocalDatetimeValue = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};

// ─── Paleta castanha / âmbar para a secção de medidas ────
const amber = {
  bg: "rgba(120, 80, 40, 0.06)",
  border: "rgba(160, 100, 40, 0.25)",
  borderFocus: "rgba(180, 120, 50, 0.6)",
  label: "#7C5328",
  labelLight: "#A0743C",
  inputBg: "rgba(255, 248, 235, 0.6)",
  accent: "#92400E",
  accentBg: "rgba(146, 64, 14, 0.10)",
  accentBorder: "rgba(146, 64, 14, 0.30)",
  warningBg: "rgba(146, 64, 14, 0.07)",
  warningBorder: "rgba(180, 100, 30, 0.35)",
  warningText: "#7C3D10",
};

// ─── Componente principal ─────────────────────────────────
const SellerProductForm = ({
  editingProduct, existingMedia = [], existingVariants = [],
  onSave, onCancel, saving,
}: Props) => {
  const { isAdmin } = useUserRole();

  // ── Estado do formulário ──────────────────────────────
  const [form, setForm] = useState<ProductFormData>(() => {
    if (editingProduct) {
      return {
        title: editingProduct.title || "",
        description: editingProduct.description || "",
        price: String(editingProduct.price || ""),
        old_price: editingProduct.old_price ? String(editingProduct.old_price) : "",
        discount_percent: editingProduct.discount_percent ? String(editingProduct.discount_percent) : "",
        stock: String(editingProduct.stock ?? 1),
        sku: editingProduct.sku || "",
        condition: editingProduct.condition || "new",
        category_id: editingProduct.category_id || "",
        free_shipping: editingProduct.free_shipping || false,
        badge: editingProduct.badge || "",
        is_sponsored: editingProduct.is_sponsored || false,
        promotion_ends_at: toLocalDatetimeValue(editingProduct.promotion_ends_at),
        weight_kg: editingProduct.weight_kg ? String(editingProduct.weight_kg) : "",
        volume_m3: editingProduct.volume_m3 ? String(editingProduct.volume_m3) : "",
        length_cm: editingProduct.length_cm ? String(editingProduct.length_cm) : "",
        width_cm: editingProduct.width_cm ? String(editingProduct.width_cm) : "",
        height_cm: editingProduct.height_cm ? String(editingProduct.height_cm) : "",
      };
    }
    return emptyForm;
  });

  const [lastEdited, setLastEdited] = useState<"price" | "old_price" | "discount_percent" | null>(null);

  const set = useCallback((key: keyof ProductFormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  // ── Cálculos automáticos de preço ────────────────────
  useEffect(() => {
    if (lastEdited !== "price" && lastEdited !== "old_price") return;
    const price = parseFloat(form.price);
    const oldPrice = parseFloat(form.old_price);
    if (!isNaN(price) && !isNaN(oldPrice) && oldPrice > price && price > 0) {
      const pct = Math.round(((oldPrice - price) / oldPrice) * 100);
      setForm(f => ({ ...f, discount_percent: String(pct) }));
    }
  }, [form.price, form.old_price, lastEdited]);

  useEffect(() => {
    if (lastEdited !== "discount_percent") return;
    const pct = parseInt(form.discount_percent);
    if (isNaN(pct) || pct <= 0 || pct >= 100) return;
    const oldPrice = parseFloat(form.old_price);
    const price = parseFloat(form.price);
    if (!isNaN(oldPrice) && oldPrice > 0) {
      setForm(f => ({ ...f, price: String(Math.round(oldPrice * (1 - pct / 100))) }));
    } else if (!isNaN(price) && price > 0) {
      setForm(f => ({ ...f, old_price: String(Math.round(price / (1 - pct / 100))) }));
    }
  }, [form.discount_percent, lastEdited]);

  useEffect(() => {
    if (lastEdited !== "old_price") return;
    const oldPrice = parseFloat(form.old_price);
    const pct = parseInt(form.discount_percent);
    if (!isNaN(oldPrice) && !isNaN(pct) && pct > 0 && pct < 100 && oldPrice > 0) {
      setForm(f => ({ ...f, price: String(Math.round(oldPrice * (1 - pct / 100))) }));
    }
  }, [form.old_price, lastEdited]);

  useEffect(() => {
    if (lastEdited !== "price") return;
    const price = parseFloat(form.price);
    const pct = parseInt(form.discount_percent);
    if (!isNaN(price) && !isNaN(pct) && pct > 0 && pct < 100 && price > 0) {
      setForm(f => ({ ...f, old_price: String(Math.round(price / (1 - pct / 100))) }));
    }
  }, [form.price, lastEdited]);

  const handlePriceChange = (val: string) => { setLastEdited("price"); set("price", val); };
  const handleOldPriceChange = (val: string) => { setLastEdited("old_price"); set("old_price", val); };
  const handleDiscountChange = (val: string) => { setLastEdited("discount_percent"); set("discount_percent", val); };

  // ── Medidas ───────────────────────────────────────────
  const hasWeight = !!form.weight_kg && parseFloat(form.weight_kg) > 0;
  const hasDimensions = !!(form.length_cm || form.width_cm || form.height_cm);

  useEffect(() => {
    const l = parseFloat(form.length_cm);
    const w = parseFloat(form.width_cm);
    const h = parseFloat(form.height_cm);
    if (!isNaN(l) && !isNaN(w) && !isNaN(h) && l > 0 && w > 0 && h > 0) {
      const volM3 = (l * w * h) / 1_000_000;
      setForm(f => ({ ...f, volume_m3: volM3.toFixed(4) }));
    }
  }, [form.length_cm, form.width_cm, form.height_cm]);

  // ── Média ─────────────────────────────────────────────
  const [media, setMedia] = useState<MediaItem[]>(() =>
    existingMedia.map((m: any, i: number) => ({
      id: m.id, url: m.url, type: m.type || "image",
      is_cover: m.is_cover || false, sort_order: m.sort_order ?? i,
    }))
  );

  useEffect(() => {
    if (existingMedia.length > 0 && media.length === 0) {
      setMedia(existingMedia.map((m: any, i: number) => ({
        id: m.id, url: m.url, type: m.type || "image",
        is_cover: m.is_cover || false, sort_order: m.sort_order ?? i,
      })));
    }
  }, [existingMedia]);

  // ── Variações ─────────────────────────────────────────
  const [variants, setVariants] = useState<VariantItem[]>(() =>
    existingVariants.map((v: any, i: number) => ({
      id: v.id, variant_type: v.variant_type || "color", name: v.name || "", value: v.value || "",
      price_override: v.price_override ? String(v.price_override) : "", stock: String(v.stock ?? 1),
      image_url: v.image_url || "", sort_order: v.sort_order ?? i, is_active: v.is_active ?? true,
      parent_id: v.parent_id || null, _tempId: v.id || generateTempId(), _expanded: true,
    }))
  );

  useEffect(() => {
    if (existingVariants.length > 0 && variants.length === 0) {
      setVariants(existingVariants.map((v: any, i: number) => ({
        id: v.id, variant_type: v.variant_type || "color", name: v.name || "", value: v.value || "",
        price_override: v.price_override ? String(v.price_override) : "", stock: String(v.stock ?? 1),
        image_url: v.image_url || "", sort_order: v.sort_order ?? i, is_active: v.is_active ?? true,
        parent_id: v.parent_id || null, _tempId: v.id || generateTempId(), _expanded: true,
      })));
    }
  }, [existingVariants]);

  const [uploading, setUploading] = useState(false);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);

  const parentVariants = useMemo(() => variants.filter(v => !v.parent_id), [variants]);
  const getChildren = (parentTempId: string) => variants.filter(v => v.parent_id === parentTempId);

  const totalVariantStock = useMemo(() => {
    let total = 0;
    for (const parent of parentVariants) {
      const children = getChildren(parent._tempId);
      total += children.length > 0
        ? children.reduce((sum, c) => sum + (parseInt(c.stock) || 0), 0)
        : (parseInt(parent.stock) || 0);
    }
    return total;
  }, [variants, parentVariants]);

  const productStock = parseInt(form.stock) || 0;
  const stockExceeded = variants.length > 0 && totalVariantStock > productStock;
  const hasDiscount = !!form.discount_percent && parseInt(form.discount_percent) > 0;

  const promotionEndsAtPreview = useMemo(() => {
    if (!form.promotion_ends_at) return null;
    try { return new Date(form.promotion_ends_at); } catch { return null; }
  }, [form.promotion_ends_at]);

  const savingsSummary = useMemo(() => {
    const price = parseFloat(form.price);
    const oldPrice = parseFloat(form.old_price);
    const pct = parseInt(form.discount_percent);
    if (!isNaN(price) && !isNaN(oldPrice) && oldPrice > price && pct > 0)
      return { saving: Math.round(oldPrice - price), pct };
    return null;
  }, [form.price, form.old_price, form.discount_percent]);

  // ── Categorias ────────────────────────────────────────
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories_with_subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("id, name, parent_id")
        .eq("is_active", true).order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
  });

  const parentCategories = allCategories.filter((c: any) => !c.parent_id);
  const getSubcategories = (parentId: string) => allCategories.filter((c: any) => c.parent_id === parentId);

  // ── Upload ────────────────────────────────────────────
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setPhotoError(false);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKETS.products).upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from(STORAGE_BUCKETS.products).getPublicUrl(path);
        setMedia(prev => [...prev, { url: data.publicUrl, type, is_cover: prev.length === 0, sort_order: prev.length }]);
      }
    } catch (err: any) {
      console.error("Upload error:", err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, tempId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVariantIdx(tempId);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.products).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.products).getPublicUrl(path);
      setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, image_url: data.publicUrl } : v));
    } catch (err: any) {
      console.error("Variant image upload error:", err.message);
    }
    setUploadingVariantIdx(null);
    e.target.value = "";
  };

  const removeMedia = (index: number) => {
    setMedia(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(m => m.is_cover)) updated[0].is_cover = true;
      return updated;
    });
  };

  const setCover = (index: number) => setMedia(prev => prev.map((m, i) => ({ ...m, is_cover: i === index })));

  // ── Variações CRUD ────────────────────────────────────
  const addVariant = () => setVariants(prev => [...prev, createEmptyVariant()]);
  const addSubVariant = (parentTempId: string) => setVariants(prev => [...prev, createEmptyVariant(parentTempId)]);
  const updateVariant = (tempId: string, key: keyof VariantItem, value: any) =>
    setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, [key]: value } : v));
  const removeVariant = (tempId: string) =>
    setVariants(prev => prev.filter(v => v._tempId !== tempId && v.parent_id !== tempId));
  const toggleExpanded = (tempId: string) =>
    setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, _expanded: !v._expanded } : v));

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = () => {
    if (media.length === 0) { setPhotoError(true); return; }
    if (stockExceeded) return;

    const payload: any = {
      title: form.title,
      description: form.description || null,
      price: parseFloat(form.price),
      old_price: form.old_price ? parseFloat(form.old_price) : null,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      stock: parseInt(form.stock) || 1,
      sku: form.sku || null,
      condition: form.condition,
      category_id: form.category_id || null,
      free_shipping: form.free_shipping,
      badge: form.badge || null,
      is_sponsored: form.is_sponsored,
      promotion_ends_at: form.promotion_ends_at
        ? new Date(form.promotion_ends_at).toISOString()
        : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      volume_m3: form.volume_m3 ? parseFloat(form.volume_m3) : null,
      length_cm: form.length_cm ? parseFloat(form.length_cm) : null,
      width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      interprovincial_available: hasWeight,
    };
    onSave(payload, media, variants);
  };

  // ── Render de variação ────────────────────────────────
  const renderVariantCard = (variant: VariantItem, isChild: boolean) => {
    const children = isChild ? [] : getChildren(variant._tempId);
    const childrenStock = children.reduce((s, c) => s + (parseInt(c.stock) || 0), 0);

    return (
      <div key={variant._tempId}
        className={`border rounded-lg p-3 relative ${isChild ? "border-border/50 bg-muted/20 ml-4" : "border-border bg-muted/30"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {!isChild && (
              <button type="button" onClick={() => toggleExpanded(variant._tempId)} className="p-0.5 text-muted-foreground">
                {variant._expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {isChild ? "Sub-variação" : "Variação"} • {variantTypes.find(t => t.value === variant.variant_type)?.label}
            </span>
          </div>
          <button onClick={() => removeVariant(variant._tempId)} className="text-destructive hover:bg-destructive/10 rounded p-0.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Tipo</label>
            <select value={variant.variant_type} onChange={e => updateVariant(variant._tempId, "variant_type", e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground">
              {variantTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Nome *</label>
            <input value={variant.name} onChange={e => updateVariant(variant._tempId, "name", e.target.value)}
              placeholder={getPlaceholder(variant.variant_type)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
          </div>
        </div>

        {variant.variant_type === "color" && (
          <div className="mb-2">
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Cor</label>
            <div className="flex gap-1.5 flex-wrap">
              {colorPresets.map(c => (
                <button key={c.value} type="button"
                  onClick={() => { updateVariant(variant._tempId, "value", c.value); if (!variant.name) updateVariant(variant._tempId, "name", c.name); }}
                  className={`w-6 h-6 rounded-full border-2 transition ${variant.value === c.value ? "border-primary scale-110" : "border-border"}`}
                  style={{ backgroundColor: c.value }} title={c.name} />
              ))}
              <input type="color" value={variant.value || "#000000"} onChange={e => updateVariant(variant._tempId, "value", e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0 p-0" title="Cor personalizada" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Preço (Kz) — vazio = base</label>
            <input type="number" value={variant.price_override} onChange={e => updateVariant(variant._tempId, "price_override", e.target.value)}
              placeholder={form.price || "Preço base"}
              className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">
              Stock {!isChild && children.length > 0 ? `(filhos: ${childrenStock})` : ""}
            </label>
            <input type="number" value={variant.stock} onChange={e => updateVariant(variant._tempId, "stock", e.target.value)}
              placeholder="1"
              className={`w-full px-2 py-1.5 rounded-lg bg-muted border text-xs text-foreground ${!isChild && children.length > 0 && childrenStock > (parseInt(variant.stock) || 0) ? "border-destructive" : "border-border"}`} />
          </div>
        </div>

        <div className="mb-2">
          <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Imagem</label>
          <div className="flex items-center gap-2">
            {variant.image_url ? (
              <div className="relative w-14 h-14 rounded-lg border border-border overflow-hidden">
                <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateVariant(variant._tempId, "image_url", "")}
                  className="absolute top-0 right-0 bg-destructive/80 text-destructive-foreground p-0.5 rounded-bl">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition ${uploadingVariantIdx === variant._tempId ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
                <ImageIcon className="w-3 h-3" /> Upload
                <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(e, variant._tempId)} className="hidden" disabled={uploadingVariantIdx === variant._tempId} />
              </label>
            )}
          </div>
        </div>

        {!isChild && variant._expanded && (
          <div className="mt-2 space-y-2">
            {children.map(child => renderVariantCard(child, true))}
            <button type="button" onClick={() => addSubVariant(variant._tempId)}
              className="flex items-center gap-1 ml-4 px-2 py-1 rounded-lg text-[10px] font-bold text-primary border border-primary/30 hover:bg-primary/5 transition">
              <Plus className="w-3 h-3" /> Sub-variação (ex: tamanho)
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">
          {editingProduct ? "Editar Produto" : "Novo Produto"}
        </h2>
        <button onClick={onCancel} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-3">

        {/* Título */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Nome do produto *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="Ex: iPhone 15 Pro Max 256GB"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>

        {/* Descrição */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Descrição</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Descreva o produto em detalhe..."
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-20 resize-none" />
        </div>

        {/* Preços */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1.5 block">Preços e Promoção</label>
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Preço antigo (Kz)</label>
                <input type="number" value={form.old_price} onChange={e => handleOldPriceChange(e.target.value)}
                  placeholder="Ex: 50 000"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Preço antes da promoção</p>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-0.5 block" style={{ color: "#C0392B" }}>Desconto %</label>
                <input type="number" value={form.discount_percent} onChange={e => handleDiscountChange(e.target.value)}
                  placeholder="Ex: 20" min="1" max="99"
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm font-bold"
                  style={{ borderColor: form.discount_percent ? "#C0392B" : undefined, color: form.discount_percent ? "#C0392B" : undefined }} />
                <p className="text-[9px] text-muted-foreground mt-0.5">Calcula o preço novo</p>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Preço actual (Kz) *</label>
              <input type="number" value={form.price} onChange={e => handlePriceChange(e.target.value)}
                placeholder="Ex: 40 000"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-bold" />
              <p className="text-[9px] text-muted-foreground mt-0.5">Preenche → calcula % automaticamente</p>
            </div>
            {savingsSummary && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#FFF5F5" }}>
                <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: "#C0392B", color: "#fff" }}>
                  -{savingsSummary.pct}%
                </span>
                <span className="text-xs" style={{ color: "#6B3A2A" }}>
                  O cliente poupa <strong>{Number(savingsSummary.saving).toLocaleString("pt-AO").replace(/,/g, ".")} Kz</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fim de promoção */}
        {hasDiscount && (
          <div className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: "#C0392B44", background: "#FFF8F5" }}>
            <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: "#C0392B" }}>
              <Clock className="w-3.5 h-3.5" /> Fim da promoção (opcional)
            </label>
            <input type="datetime-local" value={form.promotion_ends_at}
              onChange={e => set("promotion_ends_at", e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-border text-sm text-foreground" />
            {promotionEndsAtPreview && (
              <p className="text-[10px]" style={{ color: "#8B4A35" }}>
                Termina em {promotionEndsAtPreview.toLocaleString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} — o produto sai das Promoções automaticamente.
              </p>
            )}
            {form.promotion_ends_at && (
              <button type="button" onClick={() => set("promotion_ends_at", "")}
                className="text-[10px] underline" style={{ color: "#C0392B" }}>
                Remover data limite
              </button>
            )}
          </div>
        )}

        {/* Stock & SKU */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Stock total</label>
            <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)}
              placeholder="1"
              className={`w-full px-3 py-2 rounded-lg bg-muted border text-sm text-foreground ${stockExceeded ? "border-destructive" : "border-border"}`} />
            {stockExceeded && (
              <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Variações ({totalVariantStock}) excedem o stock ({productStock})
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">SKU</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)}
              placeholder="REF-001"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
        </div>

        {/* Medidas */}
        <div
          className="rounded-xl p-3.5 space-y-3"
          style={{ background: amber.bg, border: `1.5px solid ${amber.border}` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: amber.label }}>
                <Package2 className="w-3.5 h-3.5" />
                Medidas do produto
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: amber.labelLight }}>
                Usadas para calcular o frete. Preenche o que se aplica.
              </p>
            </div>
            {hasWeight ? (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: amber.accentBg, color: amber.accent, border: `1px solid ${amber.accentBorder}` }}>
                ✓ Interprovincial disponível
              </span>
            ) : (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: amber.warningBg, color: amber.warningText, border: `1px solid ${amber.warningBorder}` }}>
                Sem entrega interprovincial
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: amber.label }}>
              <Weight className="w-3 h-3 inline mr-1" />
              Peso (kg)
            </label>
            <input
              type="number" min={0} step="0.01" value={form.weight_kg}
              onChange={e => set("weight_kg", e.target.value)}
              placeholder="Ex: 1.5"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: amber.inputBg, border: `1px solid ${form.weight_kg ? amber.accentBorder : amber.border}`, color: "inherit" }}
            />
            {!hasWeight && (
              <p className="text-[9px] mt-1 flex items-center gap-1" style={{ color: amber.warningText }}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Sem peso definido — entrega interprovincial não estará disponível para este produto.
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: amber.label }}>
              <Ruler className="w-3 h-3 inline mr-1" />
              Dimensões (cm) — opcional
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "length_cm" as const, label: "Comprimento" },
                { key: "width_cm" as const, label: "Largura" },
                { key: "height_cm" as const, label: "Altura" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="text-[9px] mb-0.5" style={{ color: amber.labelLight }}>{label}</p>
                  <input
                    type="number" min={0} step="0.1" value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1.5 rounded-lg text-xs"
                    style={{ background: amber.inputBg, border: `1px solid ${amber.border}`, color: "inherit" }}
                  />
                </div>
              ))}
            </div>
            {hasDimensions && form.volume_m3 && (
              <p className="text-[9px] mt-1" style={{ color: amber.labelLight }}>
                Volume calculado: <strong>{parseFloat(form.volume_m3).toFixed(4)} m³</strong>
              </p>
            )}
          </div>

          {!hasDimensions && (
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: amber.label }}>
                Volume (m³) — opcional
              </label>
              <input
                type="number" min={0} step="0.0001" value={form.volume_m3}
                onChange={e => set("volume_m3", e.target.value)}
                placeholder="Ex: 0.02"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: amber.inputBg, border: `1px solid ${amber.border}`, color: "inherit" }}
              />
              <p className="text-[9px] mt-0.5" style={{ color: amber.labelLight }}>
                Ou preenche as dimensões acima e o volume é calculado automaticamente.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg px-3 py-2"
            style={{ background: amber.accentBg, border: `1px solid ${amber.accentBorder}` }}>
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: amber.accent }} />
            <p className="text-[10px] leading-relaxed" style={{ color: amber.label }}>
              O peso e volume são usados para calcular o custo de frete com base nas tabelas de zonas configuradas.
              {!hasWeight && " Sem peso, apenas entregas locais (intra-municipal e intra-provincial) estarão disponíveis."}
            </p>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Categoria</label>
          <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            <option value="">Selecionar</option>
            {parentCategories.map((c: any) => {
              const subs = getSubcategories(c.id);
              return (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name} (geral)</option>
                  {subs.map((s: any) => <option key={s.id} value={s.id}>&nbsp;&nbsp;↳ {s.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Condição */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Condição</label>
          <select value={form.condition} onChange={e => set("condition", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Badge */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Badge / Destaque</label>
          <div className="flex gap-2 flex-wrap">
            {badges.map(b => (
              <button key={b.value} type="button" onClick={() => set("badge", b.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${form.badge === b.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border"}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Imagens */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block flex items-center gap-1">
            <Camera className="w-3.5 h-3.5" />
            Imagens e Vídeos *
            <span className="text-[9px] text-destructive font-bold">(mínimo 1 foto obrigatória)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <label className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer border transition ${uploading ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
              <ImageIcon className="w-3.5 h-3.5" /> Imagens
              <input type="file" accept="image/*" multiple onChange={e => handleFilesUpload(e, "image")} className="hidden" disabled={uploading} />
            </label>
            <label className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer border transition ${uploading ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
              <Film className="w-3.5 h-3.5" /> Vídeos
              <input type="file" accept="video/*" multiple onChange={e => handleFilesUpload(e, "video")} className="hidden" disabled={uploading} />
            </label>
            {uploading && <span className="text-xs text-muted-foreground self-center">A enviar...</span>}
          </div>
          {photoError && media.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2" style={{ background: "#FFF0F0", border: "1.5px solid #C0392B55" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C0392B" }} />
              <p className="text-xs font-bold" style={{ color: "#C0392B" }}>É obrigatório adicionar pelo menos uma foto do produto antes de publicar.</p>
            </div>
          )}
          {media.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {media.map((m, i) => (
                <div key={i} className={`relative rounded-lg border-2 overflow-hidden aspect-square ${m.is_cover ? "border-primary" : "border-border"}`}>
                  {m.type === "image" ? <img src={m.url} alt="" className="w-full h-full object-cover" /> : <video src={m.url} className="w-full h-full object-cover" />}
                  {m.is_cover && <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-primary text-primary-foreground">CAPA</span>}
                  <div className="absolute bottom-0 inset-x-0 bg-background/80 flex justify-between p-0.5">
                    {!m.is_cover && <button onClick={() => setCover(i)} className="text-[9px] font-bold text-primary px-1">Capa</button>}
                    <button onClick={() => removeMedia(i)} className="text-destructive ml-auto p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 gap-2"
              style={{ borderColor: photoError ? "#C0392B" : undefined }}>
              <Camera className="w-8 h-8" style={{ color: photoError ? "#C0392B" : "#ccc" }} />
              <p className="text-xs text-muted-foreground">Clique em "Imagens" para adicionar fotos</p>
            </div>
          )}
        </div>

        {/* Variações */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Variações (cor, tamanho, etc.)</label>
              {variants.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Stock total: {productStock} • Usado: {totalVariantStock}
                  {stockExceeded && <span className="text-destructive font-bold"> ⚠ Excedido!</span>}
                </p>
              )}
            </div>
            <button type="button" onClick={addVariant}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-primary border border-primary/30 hover:bg-primary/5 transition">
              <Plus className="w-3 h-3" /> Variação
            </button>
          </div>
          {variants.length === 0 && (
            <p className="text-[10px] text-muted-foreground">Sem variações. Adicione cores, tamanhos ou outros atributos.</p>
          )}
          <div className="space-y-3">{parentVariants.map(v => renderVariantCard(v, false))}</div>
        </div>

        {/* Checkboxes */}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.free_shipping} onChange={e => set("free_shipping", e.target.checked)} className="rounded" />
          Frete grátis
        </label>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-foreground p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <input type="checkbox" checked={form.is_sponsored} onChange={e => set("is_sponsored", e.target.checked)} className="rounded" />
            <span className="font-semibold">⭐ Patrocinado</span>
            <span className="text-xs text-muted-foreground">— aparecerá nas secções "Patrocinado"</span>
          </label>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.title || !form.price || saving || stockExceeded}
          className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "A guardar..." : editingProduct ? "Atualizar Produto" : "Adicionar Produto"}
        </button>

      </div>
    </div>
  );
};

export default SellerProductForm;
