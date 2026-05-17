import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { STORAGE_BUCKETS } from "@/lib/storage";
import Footer from "@/components/Footer";
import {
  Play, Upload, X, Loader2, Star, ShoppingBag, Check,
  VideoOff, Image as ImageIcon, Clock, Send, Trash2,
  Eye, MessageCircle, Heart, Bell, BellOff, Package,
  ChevronRight, AlertTriangle, Plus, Film, Zap,
  ExternalLink, Radio, Calendar, Hash, Tag, DollarSign,
  Save, Palette, Ruler, ChevronDown, Film as FilmIcon,
  Volume2, VolumeX, Maximize2, Share2, ShoppingCart,
  BadgeCheck,
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
   TIPOS DO FORMULÁRIO DE PRODUTO
═══════════════════════════════════════════════════ */
interface ProductFormData {
  title: string;
  description: string;
  price: string;
  old_price: string;
  discount_percent: string;
  stock: string;
  sku: string;
  condition: string;
  province: string;
  city: string;
  category_id: string;
  free_shipping: boolean;
  badge: string;
  is_sponsored: boolean;
}

interface MediaItem {
  id?: string;
  url: string;
  type: "image" | "video";
  is_cover: boolean;
  sort_order: number;
  file?: File;
}

interface VariantItem {
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

const generateTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createEmptyVariant = (parentId?: string | null): VariantItem => ({
  variant_type: parentId ? "size" : "color",
  name: "", value: "", price_override: "", stock: "1", image_url: "",
  sort_order: 0, is_active: true, parent_id: parentId || null,
  _tempId: generateTempId(), _expanded: true,
});

const emptyProductForm: ProductFormData = {
  title: "", description: "", price: "", old_price: "", discount_percent: "",
  stock: "1", sku: "", condition: "new", province: "", city: "",
  category_id: "", free_shipping: false, badge: "", is_sponsored: false,
};

const provinces = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte",
  "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte",
  "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire",
];

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

const getVariantPlaceholder = (type: string) => {
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
   PRODUCT PICKER — apenas novos (criados agora)
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
        Produtos criados neste lançamento{" "}
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
   NEW PRODUCT INLINE
═══════════════════════════════════════════════════ */
const NewProductInline = ({
  sellerId,
  onCreated,
  onCancel,
}: {
  sellerId: string | null;
  onCreated: (product: { id: string; title: string; price: number; image_url: string | null }) => void;
  onCancel: () => void;
}) => {
  const { isAdmin } = useUserRole();
  const [form, setForm] = useState<ProductFormData>(emptyProductForm);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof ProductFormData, value: any) => setForm(f => ({ ...f, [key]: value }));

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories_with_subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order").order("name");
      if (error) throw error;
      return data;
    },
  });
  const parentCategories = allCategories.filter((c: any) => !c.parent_id);
  const getSubcategories = (parentId: string) => allCategories.filter((c: any) => c.parent_id === parentId);

  const parentVariants = useMemo(() => variants.filter(v => !v.parent_id), [variants]);
  const getChildren = (parentTempId: string) => variants.filter(v => v.parent_id === parentTempId);

  const totalVariantStock = useMemo(() => {
    let total = 0;
    for (const parent of parentVariants) {
      const children = getChildren(parent._tempId);
      if (children.length > 0) {
        total += children.reduce((sum, c) => sum + (parseInt(c.stock) || 0), 0);
      } else {
        total += parseInt(parent.stock) || 0;
      }
    }
    return total;
  }, [variants, parentVariants]);

  const productStock = parseInt(form.stock) || 0;
  const stockExceeded = variants.length > 0 && totalVariantStock > productStock;

  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
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
      toast.error("Erro no upload: " + err.message);
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
      toast.error("Erro no upload da variação: " + err.message);
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

  const addVariant = () => setVariants(prev => [...prev, createEmptyVariant()]);
  const addSubVariant = (parentTempId: string) => setVariants(prev => [...prev, createEmptyVariant(parentTempId)]);
  const updateVariant = (tempId: string, key: keyof VariantItem, value: any) =>
    setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, [key]: value } : v));
  const removeVariant = (tempId: string) =>
    setVariants(prev => prev.filter(v => v._tempId !== tempId && v.parent_id !== tempId));
  const toggleExpanded = (tempId: string) =>
    setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, _expanded: !v._expanded } : v));

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    const priceNum = parseFloat(form.price.replace(",", "."));
    if (!form.price || isNaN(priceNum) || priceNum <= 0) { toast.error("Preço inválido"); return; }
    if (!sellerId) { toast.error("Conta de vendedor não encontrada"); return; }
    if (stockExceeded) { toast.error("Stock das variações excede o stock total"); return; }

    setSaving(true);
    try {
      const coverMedia = media.find(m => m.is_cover) || media[0] || null;
      const image_url = coverMedia?.url ?? null;
      const slug = `${form.title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80)}-${Date.now()}`;

      const payload: any = {
        seller_id:        sellerId,
        title:            form.title.trim(),
        description:      form.description.trim() || null,
        price:            priceNum,
        old_price:        form.old_price ? parseFloat(form.old_price) : null,
        discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
        stock:            parseInt(form.stock) || 1,
        sku:              form.sku || null,
        condition:        form.condition,
        province:         form.province || null,
        city:             form.city || null,
        category_id:      form.category_id || null,
        free_shipping:    form.free_shipping,
        badge:            form.badge || null,
        is_sponsored:     form.is_sponsored,
        image_url,
        slug,
        is_active:        true,
        sales_count:      0,
      };

      const { data: row, error } = await (supabase as any)
        .from("products")
        .insert(payload)
        .select("id, title, price, image_url")
        .single();

      if (error) throw new Error(error.message);

      if (media.length > 0) {
        await (supabase as any).from("product_media").insert(
          media.map((m, i) => ({
            product_id: row.id,
            url: m.url,
            type: m.type,
            is_cover: m.is_cover,
            sort_order: i,
          }))
        );
      }

      if (variants.length > 0) {
        const variantsToInsert = variants.map((v, i) => ({
          product_id:     row.id,
          variant_type:   v.variant_type,
          name:           v.name,
          value:          v.value || null,
          price_override: v.price_override ? parseFloat(v.price_override) : null,
          stock:          parseInt(v.stock) || 0,
          image_url:      v.image_url || null,
          sort_order:     i,
          is_active:      v.is_active,
          parent_id:      null,
        }));
        await (supabase as any).from("product_variants").insert(variantsToInsert);
      }

      toast.success("Produto criado e vinculado ao lançamento!");
      onCreated(row);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar produto");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "#fff",
    border: "1.5px solid rgba(74,46,10,0.18)",
    color: brown,
  };
  const labelCls = "block text-[10px] font-black uppercase tracking-wider mb-1";

  const renderVariantCard = (variant: VariantItem, isChild: boolean) => {
    const children = isChild ? [] : getChildren(variant._tempId);
    const childrenStock = children.reduce((s, c) => s + (parseInt(c.stock) || 0), 0);

    return (
      <div key={variant._tempId}
        className={`rounded-xl p-3 relative ${isChild ? "ml-4" : ""}`}
        style={{
          border: `1.5px solid ${isChild ? "rgba(74,46,10,0.12)" : "rgba(74,46,10,0.20)"}`,
          background: isChild ? "rgba(74,46,10,0.03)" : "rgba(74,46,10,0.06)",
        }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            {!isChild && (
              <button type="button" onClick={() => toggleExpanded(variant._tempId)} className="p-0.5" style={{ color: sandDark }}>
                {variant._expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: sandDark }}>
              {isChild ? "Sub-variação" : "Variação"} · {variantTypes.find(t => t.value === variant.variant_type)?.label}
            </span>
          </div>
          <button onClick={() => removeVariant(variant._tempId)} style={{ color: "#E53935" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls} style={{ color: brown }}>Tipo</label>
            <select value={variant.variant_type} onChange={e => updateVariant(variant._tempId, "variant_type", e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle}>
              {variantTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>Nome *</label>
            <input value={variant.name} onChange={e => updateVariant(variant._tempId, "name", e.target.value)}
              placeholder={getVariantPlaceholder(variant.variant_type)}
              className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
          </div>
        </div>

        {variant.variant_type === "color" && (
          <div className="mb-2">
            <label className={labelCls} style={{ color: brown }}>Cor</label>
            <div className="flex gap-1.5 flex-wrap">
              {colorPresets.map(c => (
                <button key={c.value} type="button"
                  onClick={() => { updateVariant(variant._tempId, "value", c.value); if (!variant.name) updateVariant(variant._tempId, "name", c.name); }}
                  className="w-6 h-6 rounded-full border-2 transition"
                  style={{ backgroundColor: c.value, borderColor: variant.value === c.value ? brown : "rgba(74,46,10,0.20)" }}
                  title={c.name} />
              ))}
              <input type="color" value={variant.value || "#000000"}
                onChange={e => updateVariant(variant._tempId, "value", e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0 p-0" title="Cor personalizada" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className={labelCls} style={{ color: brown }}>Preço (Kz)</label>
            <input type="number" value={variant.price_override} onChange={e => updateVariant(variant._tempId, "price_override", e.target.value)}
              placeholder={form.price || "Preço base"} className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>
              Stock {!isChild && children.length > 0 ? `(filhos: ${childrenStock})` : ""}
            </label>
            <input type="number" value={variant.stock} onChange={e => updateVariant(variant._tempId, "stock", e.target.value)}
              placeholder="1" className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none"
              style={{ ...inputStyle, borderColor: !isChild && children.length > 0 && childrenStock > (parseInt(variant.stock) || 0) ? "#E53935" : "rgba(74,46,10,0.18)" }} />
          </div>
        </div>

        <div className="mb-2">
          <label className={labelCls} style={{ color: brown }}>Imagem</label>
          <div className="flex items-center gap-2">
            {variant.image_url ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden" style={{ border: "1.5px solid rgba(74,46,10,0.18)" }}>
                <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => updateVariant(variant._tempId, "image_url", "")}
                  className="absolute top-0 right-0 p-0.5 rounded-bl"
                  style={{ background: "rgba(229,57,53,0.85)" }}>
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition"
                style={{ background: brownLight, color: brown, border: "1.5px solid rgba(74,46,10,0.18)" }}>
                <ImageIcon className="w-3 h-3" /> Upload
                <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(e, variant._tempId)} className="hidden"
                  disabled={uploadingVariantIdx === variant._tempId} />
              </label>
            )}
            {uploadingVariantIdx === variant._tempId && <span className="text-[10px]" style={{ color: sandDark }}>A enviar…</span>}
          </div>
        </div>

        {!isChild && variant._expanded && (
          <div className="mt-2 space-y-2">
            {children.map(child => renderVariantCard(child, true))}
            <button type="button" onClick={() => addSubVariant(variant._tempId)}
              className="flex items-center gap-1 ml-4 px-2 py-1 rounded-lg text-[10px] font-bold transition"
              style={{ color: sandDark, border: `1px solid ${sandDark}`, background: "transparent" }}>
              <Plus className="w-3 h-3" /> Sub-variação (ex: tamanho)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${sandDark}`, background: "#fff" }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: `linear-gradient(135deg,${brownLight},rgba(74,46,10,0.05))`, borderBottom: `1px solid rgba(74,46,10,0.12)` }}>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" style={{ color: sandDark }} />
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: brown }}>Novo produto</span>
        </div>
        <button onClick={onCancel} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: brownLight }}>
          <X className="w-3.5 h-3.5" style={{ color: brown }} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className={labelCls} style={{ color: brown }}>Nome do produto *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: iPhone 15 Pro Max 256GB"
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
        </div>

        <div>
          <label className={labelCls} style={{ color: brown }}>Descrição</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Descreva o produto em detalhe…" rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none" style={inputStyle} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls} style={{ color: brown }}>Preço (Kz) *</label>
            <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>Preço antigo</label>
            <input type="number" value={form.old_price} onChange={e => set("old_price", e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>Desconto %</label>
            <input type="number" value={form.discount_percent} onChange={e => set("discount_percent", e.target.value)} placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={{ color: brown }}>Stock total</label>
            <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="1"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ ...inputStyle, borderColor: stockExceeded ? "#E53935" : "rgba(74,46,10,0.18)" }} />
            {stockExceeded && (
              <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "#E53935" }}>
                <AlertTriangle className="w-3 h-3" />
                Variações ({totalVariantStock}) excedem o stock ({productStock})
              </p>
            )}
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>SKU</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="REF-001"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelCls} style={{ color: brown }}>Categoria</label>
          <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none" style={inputStyle}>
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

        <div>
          <label className={labelCls} style={{ color: brown }}>Condição</label>
          <select value={form.condition} onChange={e => set("condition", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none" style={inputStyle}>
            {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls} style={{ color: brown }}>Província</label>
            <select value={form.province} onChange={e => set("province", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none appearance-none" style={inputStyle}>
              <option value="">Selecionar</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} style={{ color: brown }}>Cidade</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cidade"
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className={labelCls} style={{ color: brown }}>Badge / Destaque</label>
          <div className="flex gap-2 flex-wrap">
            {badges.map(b => (
              <button key={b.value} type="button" onClick={() => set("badge", b.value)}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition"
                style={{
                  background: form.badge === b.value ? sandDark : brownLight,
                  color: form.badge === b.value ? "#fff" : brown,
                  border: `1.5px solid ${form.badge === b.value ? sandDark : "rgba(74,46,10,0.15)"}`,
                }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls} style={{ color: brown }}>Imagens e Vídeos</label>
          <div className="flex gap-2 mb-2">
            <label className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${uploading ? "opacity-50" : ""}`}
              style={{ background: brownLight, color: brown, border: "1.5px solid rgba(74,46,10,0.18)" }}>
              <ImageIcon className="w-3.5 h-3.5" /> Imagens
              <input type="file" accept="image/*" multiple onChange={e => handleFilesUpload(e, "image")} className="hidden" disabled={uploading} />
            </label>
            <label className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${uploading ? "opacity-50" : ""}`}
              style={{ background: brownLight, color: brown, border: "1.5px solid rgba(74,46,10,0.18)" }}>
              <Film className="w-3.5 h-3.5" /> Vídeos
              <input type="file" accept="video/*" multiple onChange={e => handleFilesUpload(e, "video")} className="hidden" disabled={uploading} />
            </label>
            {uploading && <span className="text-xs self-center" style={{ color: sandDark }}>A enviar…</span>}
          </div>
          {media.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square"
                  style={{ border: `2px solid ${m.is_cover ? sandDark : "rgba(74,46,10,0.18)"}` }}>
                  {m.type === "image"
                    ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                    : <video src={m.url} className="w-full h-full object-cover" />}
                  {m.is_cover && (
                    <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-black text-white"
                      style={{ background: sandDark }}>CAPA</span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 flex justify-between p-0.5"
                    style={{ background: "rgba(247,240,230,0.85)" }}>
                    {!m.is_cover && (
                      <button onClick={() => setCover(i)} className="text-[9px] font-bold px-1" style={{ color: sandDark }}>Capa</button>
                    )}
                    <button onClick={() => removeMedia(i)} className="ml-auto p-0.5" style={{ color: "#E53935" }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className={labelCls} style={{ color: brown }}>Variações</label>
              {variants.length > 0 && (
                <p className="text-[10px]" style={{ color: sandDark }}>
                  Stock total: {productStock} · Usado: {totalVariantStock}
                  {stockExceeded && <span style={{ color: "#E53935", fontWeight: "bold" }}> ⚠ Excedido!</span>}
                </p>
              )}
            </div>
            <button type="button" onClick={addVariant}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition"
              style={{ color: sandDark, border: `1px solid ${sandDark}`, background: "transparent" }}>
              <Plus className="w-3 h-3" /> Variação
            </button>
          </div>
          <div className="space-y-3">
            {parentVariants.map(variant => renderVariantCard(variant, false))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: brown }}>
          <input type="checkbox" checked={form.free_shipping} onChange={e => set("free_shipping", e.target.checked)} className="rounded" />
          Frete grátis
        </label>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm cursor-pointer px-3 py-2 rounded-xl"
            style={{ color: brown, background: "rgba(245,200,66,0.10)", border: "1.5px solid rgba(245,200,66,0.30)" }}>
            <input type="checkbox" checked={form.is_sponsored} onChange={e => set("is_sponsored", e.target.checked)} className="rounded" />
            <span className="font-bold">⭐ Patrocinado</span>
          </label>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl text-sm font-black transition active:scale-95"
            style={{ background: brownLight, color: brown }}>
            Cancelar
          </button>
          <button onClick={handleCreate}
            disabled={saving || !form.title.trim() || !form.price || stockExceeded}
            className="flex-1 py-2.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{
              background: (saving || !form.title.trim() || !form.price || stockExceeded)
                ? "#ccc"
                : `linear-gradient(135deg, ${sandDark}, ${brown})`,
            }}>
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />A criar…</>
              : <><ShoppingBag className="w-4 h-4" />Criar produto</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   MODAL — CRIAR LANÇAMENTO
═══════════════════════════════════════════════════ */
const CreateModal = ({
  onClose, sellerId, currentCount,
}: {
  onClose: () => void;
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
  const [showNewProduct, setShowNewProduct] = useState(false);

  const [newProducts, setNewProducts] = useState<any[]>([]);

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

  const handleNewProductCreated = (product: { id: string; title: string; price: number; image_url: string | null }) => {
    setNewProducts(prev => [product, ...prev]);
    if (selectedProds.length < MAX_PRODUCTS_LINKED) {
      setSelectedProds(prev => [product.id, ...prev]);
    }
    setShowNewProduct(false);
    qc.invalidateQueries({ queryKey: ["my_products_active", sellerId] });
  };

  const handleSubmit = async () => {
    if (!title.trim())  { toast.error("Adiciona um título"); return; }
    if (!coverUrl)      { toast.error("A capa é obrigatória"); return; }
    if (!videoFile)     { toast.error("O vídeo é obrigatório"); return; }
    if (!datetime)      { toast.error("Define a data de transmissão"); return; }
    if (new Date(datetime) <= new Date()) { toast.error("A data deve ser no futuro"); return; }
    if (!sellerId)      { toast.error("Conta de vendedor não encontrada"); return; }
    if (currentCount >= MAX_RELEASES) { toast.error("Atingiste o limite de 5 lançamentos."); return; }

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
        .select(`*, seller:sellers(id, name, logo_url, is_verified)`);

      if (error) throw new Error(error.message);

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
        <p className="text-sm mb-6" style={{ color: sandDark }}>O teu lançamento será transmitido na data agendada.</p>
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

          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Título <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
              placeholder="Ex: Nova colecção de Verão 2025"
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: "#fff", border: "1.5px solid rgba(74,46,10,0.18)", color: brown }} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-black mb-1.5 uppercase tracking-wider" style={{ color: brown }}>
              Data de transmissão <span style={{ color: "#E53935" }}>*</span>
            </label>
            <input type="datetime-local" value={datetime} min={minDatetime}
              onChange={e => setDatetime(e.target.value)}
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
              <div>
                <label className="block text-xs font-black uppercase tracking-wider" style={{ color: brown }}>
                  <Package className="w-3.5 h-3.5 inline mr-1" style={{ color: sandDark }} />
                  Produtos do lançamento
                </label>
                <p className="text-[10px] mt-0.5" style={{ color: sandDark }}>
                  Apenas produtos criados neste formulário podem ser vinculados
                </p>
              </div>
              {!showNewProduct && (
                <button onClick={() => setShowNewProduct(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                  style={{ background: `linear-gradient(135deg,${sandDark},${brown})`, color: "#fff" }}>
                  <Plus className="w-3 h-3" /> Novo produto
                </button>
              )}
            </div>

            {showNewProduct && (
              <NewProductInline
                sellerId={sellerId}
                onCreated={handleNewProductCreated}
                onCancel={() => setShowNewProduct(false)}
              />
            )}

            {newProducts.length > 0 && !showNewProduct && (
              <ProductPicker
                products={newProducts}
                selected={selectedProds}
                onChange={setSelectedProds}
              />
            )}

            {newProducts.length === 0 && !showNewProduct && (
              <div className="px-4 py-5 rounded-2xl text-center"
                style={{ background: brownLight, border: "1.5px dashed rgba(74,46,10,0.20)" }}>
                <Package className="w-6 h-6 mx-auto mb-2" style={{ color: sandDark, opacity: 0.6 }} />
                <p className="text-xs font-bold mb-1" style={{ color: brown }}>Sem produtos ainda</p>
                <p className="text-[10px]" style={{ color: sandDark }}>
                  Cria um produto novo para destacar neste lançamento.
                </p>
              </div>
            )}
          </div>

          <button onClick={handleSubmit}
            disabled={loading || !sellerId || currentCount >= MAX_RELEASES || showNewProduct}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition active:scale-95"
            style={{
              background: (loading || !sellerId || currentCount >= MAX_RELEASES || showNewProduct)
                ? "#ccc"
                : `linear-gradient(135deg, ${sandDark}, ${brown})`,
            }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />{progress || "A guardar…"}</>
              : showNewProduct
              ? "Finaliza o produto antes de publicar"
              : <><Film className="w-4 h-4" />Publicar lançamento</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PRODUCT OVERLAY — ecrã completo sobre o vídeo
═══════════════════════════════════════════════════ */
const ProductsOverlay = ({
  products,
  onClose,
  onNavigate,
}: {
  products: any[];
  onClose: () => void;
  onNavigate: (slug: string, id: string) => void;
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ background: `linear-gradient(180deg, rgba(74,46,10,0.92) 0%, rgba(30,14,2,0.97) 100%)` }}
    >
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(212,184,150,0.15)" }}>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" style={{ color: sand }} />
          <span className="text-sm font-black text-white">Produtos em destaque</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(212,184,150,0.15)", color: sand }}>
            {products.length}
          </span>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ background: "rgba(212,184,150,0.15)" }}>
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {products.map((p: any) => (
          <div
            key={p.id}
            onClick={() => onNavigate(p.slug, p.id)}
            className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all active:scale-95"
            style={{
              background: "rgba(212,184,150,0.08)",
              border: "1px solid rgba(212,184,150,0.18)",
            }}
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
              style={{ border: "1.5px solid rgba(212,184,150,0.25)" }}>
              {p.image_url
                ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(74,46,10,0.4)" }}>
                    <Package className="w-6 h-6" style={{ color: sand }} />
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate mb-1">{p.title}</p>
              <p className="text-lg font-black" style={{ color: gold }}>
                {Number(p.price).toLocaleString("pt-AO")} Kz
              </p>
              {p.old_price && (
                <p className="text-[11px] line-through" style={{ color: "rgba(212,184,150,0.5)" }}>
                  {Number(p.old_price).toLocaleString("pt-AO")} Kz
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition"
                style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              <span className="text-[9px] font-bold text-center" style={{ color: sand }}>Ver produto</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 flex-shrink-0 text-center"
        style={{ borderTop: "1px solid rgba(212,184,150,0.10)" }}>
        <p className="text-[11px]" style={{ color: "rgba(212,184,150,0.5)" }}>
          Toca num produto para abrir a página completa
        </p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TIKTOK-STYLE WATCH MODAL — REDESENHADO
   FIX 1: comentários na barra lateral (não em zona inferior)
   FIX 2: input de comentário funcional + SQL seguro
   FIX 3: vídeo ocupa toda a tela; legenda e produtos na margem inferior
═══════════════════════════════════════════════════ */
const WatchModal = ({
  release, onClose, userId, sellerId, onDeleted,
}: { release: any; onClose: () => void; userId: string | null; sellerId: string | null; onDeleted?: (id: string) => void }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [notified, setNotified] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showComments, setShowComments] = useState(false); // FIX 1: comentários abertos num painel lateral
  const [muted, setMuted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const commentListRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const live     = isLive(release);
  const upcoming = isUpcoming(release);
  const expired  = isExpired(release);
  const canPlayVideo = !!release.video_url;
  const isOwner = !!sellerId && sellerId === release.seller_id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("full_name, avatar_url, is_verified").eq("id", userId).maybeSingle();
      return data ?? null;
    },
    enabled: !!userId,
  });

  const handleDelete = async () => {
    if (!confirm("Eliminar este lançamento? Esta acção é irreversível.")) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("releases").update({ status: "deleted" }).eq("id", release.id);
    setDeleting(false);
    if (error) { toast.error("Erro ao eliminar"); return; }
    toast.success("Lançamento eliminado");
    onDeleted?.(release.id);
    onClose();
  };

  /* Contagem de visualizações */
  useEffect(() => {
    if (!release?.id || upcoming) return;
    const trackView = async () => {
      await (supabase as any)
        .from("release_views")
        .upsert(
          { release_id: release.id, user_id: userId ?? null, viewed_at: new Date().toISOString() },
          { onConflict: "release_id,user_id", ignoreDuplicates: true }
        );
      await (supabase as any)
        .from("releases")
        .update({ views_count: (release.views_count || 0) + 1 })
        .eq("id", release.id);
    };
    trackView();
  }, [release?.id]);

  const handleVideoEnded = useCallback(async () => {
    if (!live || !release?.id) return;
    await (supabase as any).from("releases").update({ first_broadcast_ended_at: new Date().toISOString() }).eq("id", release.id);
    qc.invalidateQueries({ queryKey: ["releases_all"] });
  }, [live, release?.id, qc]);

  /* FIX 2: buscar comentários com query correta */
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["release_comments", release.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("release_comments")
        .select("id, release_id, user_id, user_name, user_avatar, content, created_at, user:profiles(full_name, avatar_url, is_verified)")
        .eq("release_id", release.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        // Se a tabela não existir, retorna vazio sem quebrar
        console.warn("release_comments query error:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !upcoming,
    refetchInterval: live ? 5000 : 10000,
  });

  /* Auto-scroll comentários para o fim */
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments.length, showComments]);

  /* FIX 2: enviar comentário de forma robusta */
  const sendComment = async () => {
    if (!userId) { navigate("/auth"); return; }
    const text = comment.trim();
    if (!text || sendingComment) return;

    setSendingComment(true);
    const optimisticComment = {
      id: `tmp_${Date.now()}`,
      release_id: release.id,
      user_id: userId,
      user_name: profile?.full_name || "Utilizador",
      user_avatar: profile?.avatar_url || null,
      content: text,
      created_at: new Date().toISOString(),
      user: profile,
    };

    setComment("");

    try {
      const { error } = await (supabase as any).from("release_comments").insert({
        release_id: release.id,
        user_id: userId,
        user_name: profile?.full_name || "Utilizador",
        user_avatar: profile?.avatar_url || null,
        content: text,
      });

      if (error) {
        // Tenta criar a tabela se não existir (fallback gracioso)
        if (error.code === "42P01") {
          toast.error("Sistema de comentários não configurado. Contacta o administrador.");
        } else {
          toast.error("Erro ao enviar comentário: " + error.message);
        }
        setComment(text); // Restaura o texto
      } else {
        // Atualizar contagem de comentários
        await (supabase as any)
          .from("releases")
          .update({ comments_count: (release.comments_count || 0) + 1 })
          .eq("id", release.id);
        refetchComments();
      }
    } catch (err: any) {
      toast.error("Erro ao enviar comentário");
      setComment(text);
    } finally {
      setSendingComment(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setMuted(newMuted);
    }
  };

  const isAuthor = (c: any) => c.user_id === release.seller?.user_id;

  const handleProductNavigate = (slug: string, id: string) => {
    onClose();
    navigate(`/produto/${id}`);
  };

  /* FIX 1: Painel de comentários deslizante — sobrepõe o vídeo pelo lado direito */
  const CommentsPanel = () => (
    <div
      className="absolute inset-0 z-30 flex"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={() => setShowComments(false)}
    >
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col"
        style={{
          width: "85%",
          maxWidth: 340,
          background: "linear-gradient(180deg, #110703 0%, #1a0a02 100%)",
          borderLeft: `1px solid rgba(212,184,150,0.20)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(212,184,150,0.12)" }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" style={{ color: sand }} />
            <span className="text-sm font-black text-white">
              Comentários {comments.length > 0 && `(${comments.length})`}
            </span>
          </div>
          <button onClick={() => setShowComments(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(212,184,150,0.15)" }}>
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Lista */}
        <div
          ref={commentListRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
          style={{ scrollbarWidth: "none" }}
        >
          {!upcoming && comments.length === 0 && (
            <div className="py-10 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(212,184,150,0.2)" }} />
              <p className="text-[12px]" style={{ color: "rgba(212,184,150,0.4)" }}>
                Nenhum comentário ainda.<br />Sê o primeiro!
              </p>
            </div>
          )}
          {upcoming && (
            <p className="text-center text-[11px] py-8" style={{ color: "rgba(212,184,150,0.4)" }}>
              Comentários abrem na transmissão
            </p>
          )}
          {!upcoming && comments.map((c: any) => {
            const author = isAuthor(c);
            const verified = c.user?.is_verified || false;
            const displayName = c.user?.full_name || c.user_name || "Utilizador";
            const avatar = c.user?.avatar_url || c.user_avatar;

            return (
              <div key={c.id} className="flex items-start gap-2">
                {avatar
                  ? <img src={avatar} alt=""
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                      style={{ border: author ? `1.5px solid ${sandDark}` : "1.5px solid rgba(212,184,150,0.2)" }} />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: author ? sandDark : "rgba(74,46,10,0.5)", color: cream }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1 mb-0.5">
                    <span className="text-[11px] font-black text-white">{displayName}</span>
                    {verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: gold }} />}
                    {author && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: sandDark, color: cream }}>
                        autor
                      </span>
                    )}
                    <span className="text-[9px]" style={{ color: "rgba(212,184,150,0.4)" }}>
                      {new Date(c.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input comentário — FIX 2 */}
        {!upcoming && (
          <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(212,184,150,0.10)" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              : <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: sandDark, color: cream }}>
                  {(profile?.full_name || userId || "?").charAt(0).toUpperCase()}
                </div>}
            <input
              ref={commentInputRef}
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
              placeholder={userId ? "Adiciona um comentário…" : "Faz login para comentar"}
              disabled={!userId || sendingComment}
              className="flex-1 px-3 py-2 rounded-full text-xs focus:outline-none"
              style={{
                background: "rgba(212,184,150,0.08)",
                border: "1px solid rgba(212,184,150,0.18)",
                color: "white",
              }}
            />
            <button
              onClick={sendComment}
              disabled={!comment.trim() || sendingComment || !userId}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              style={{
                background: (comment.trim() && !sendingComment && userId)
                  ? `linear-gradient(135deg,${sandDark},${brown})`
                  : "rgba(74,46,10,0.3)"
              }}>
              {sendingComment
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center"
      style={{ background: "rgba(0,0,0,0.96)" }}
      onClick={onClose}
    >
      {/* Container principal — moldura TikTok, vídeo ocupa toda a tela */}
      <div
        className="relative flex w-full max-w-[420px] flex-col"
        style={{
          background: "#000",
          maxHeight: "100vh",
          overflow: "hidden",
          boxShadow: `0 0 0 1px ${sandDark}33, 0 0 60px rgba(74,46,10,0.4)`,
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── FIX 3: VÍDEO OCUPA TODA A TELA (position absolute, inset-0) ── */}
        <div className="absolute inset-0" style={{ background: "#000" }}>
          {/* Thumbnail de fundo */}
          {release.thumbnail_url && (
            <img
              src={release.thumbnail_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: canPlayVideo ? 0.12 : upcoming ? 0.35 : 0.5,
                filter: expired && !release.video_url ? "grayscale(1)" : "none",
              }}
            />
          )}

          {/* Vídeo — ocupa toda a tela */}
          {canPlayVideo && (
            <video
              ref={videoRef}
              src={release.video_url}
              autoPlay
              muted={muted}
              playsInline
              controls
              controlsList="nodownload"
              onEnded={handleVideoEnded}
              onLoadedMetadata={() => {
                // Garante reprodução no Safari iOS: começa muted e depois tenta com som
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.play().catch(() => {
                    // Safari bloqueou: reproduz com mute
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      setMuted(true);
                      videoRef.current.play().catch(() => {});
                    }
                  });
                }
              }}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ background: "transparent", zIndex: 1 }}
            />
          )}

          {/* Gradiente inferior — para as legendas ficarem legíveis */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 30%, transparent 55%)", zIndex: 2 }} />

          {/* Gradiente superior — para os botões do topo ficarem legíveis */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 22%)", zIndex: 2 }} />

          {/* Overlay de produtos */}
          {showProducts && release.linked_products?.length > 0 && (
            <ProductsOverlay
              products={release.linked_products}
              onClose={() => setShowProducts(false)}
              onNavigate={handleProductNavigate}
            />
          )}

          {/* FIX 1: Painel de comentários deslizante */}
          {showComments && <CommentsPanel />}
        </div>

        {/* ── TOPO: vendedor + botões (sobre o vídeo) ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-10 pb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {release.seller?.logo_url
              ? <img src={release.seller.logo_url} alt=""
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${sandDark}` }} />
              : <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ background: sandDark, color: cream }}>
                  {(release.seller?.name || "?").charAt(0).toUpperCase()}
                </div>}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white truncate">{release.seller?.name || "Vendedor"}</span>
                {release.seller?.is_verified && (
                  <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: gold }} />
                )}
              </div>
              <p className="text-[10px] truncate" style={{ color: sand }}>{release.title}</p>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition"
              style={{ background: "rgba(229,57,53,0.75)", border: "1px solid rgba(229,57,53,0.5)" }}
              title="Eliminar lançamento"
            >
              {deleting
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Trash2 className="w-4 h-4 text-white" />}
            </button>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(212,184,150,0.25)" }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Badge LIVE */}
        {live && (
          <div className="absolute top-20 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "#E53935" }}>
            <PulseDot color="#fff" />
            <span className="text-[10px] font-black text-white">AO VIVO</span>
          </div>
        )}

        {/* Badge TERMINADO */}
        {expired && !live && (
          <div className="absolute top-20 left-4 z-20 px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(40,40,40,0.85)" }}>
            <span className="text-[10px] font-bold text-white/70">TERMINADO</span>
          </div>
        )}

        {/* Sem vídeo disponível */}
        {!canPlayVideo && !upcoming && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
            <VideoOff className="w-10 h-10 text-white/30" />
            <p className="text-white/40 text-sm font-bold">Vídeo não disponível</p>
          </div>
        )}

        {/* Estado UPCOMING */}
        {upcoming && !showProducts && !showComments && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <Calendar className="w-12 h-12 text-white/50 mx-auto" />
            <div>
              <p className="text-white font-black text-lg mb-1">Transmissão agendada</p>
              <p className="text-white/60 text-sm mb-4">{fmtDate(release.broadcasts_at)}</p>
              <button onClick={() => { setNotified(v => !v); toast.success(notified ? "Lembrete removido" : "Vais ser notificado!"); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white mx-auto"
                style={{ background: notified ? `rgba(184,149,106,0.3)` : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                {notified ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {notified ? "Lembrete activo" : "Lembrar-me"}
              </button>
            </div>
          </div>
        )}

        {/* ── FIX 1: BARRA LATERAL DIREITA — inclui botão de comentários ── */}
        {!showProducts && !showComments && (
          <div className="absolute right-3 z-20 flex flex-col items-center gap-4"
            style={{ bottom: 120 }}>

            {/* Like */}
            <button onClick={() => setLiked(v => !v)} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: liked ? "rgba(229,57,53,0.25)" : "rgba(0,0,0,0.55)" }}>
                <Heart className={`w-6 h-6 ${liked ? "fill-current" : ""}`}
                  style={{ color: liked ? "#E53935" : "white" }} />
              </div>
              <span className="text-[10px] font-bold text-white">
                {(release.likes_count || 0) + (liked ? 1 : 0)}
              </span>
            </button>

            {/* FIX 1: Comentários — abre o painel lateral */}
            <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-bold text-white">
                {comments.length || release.comments_count || 0}
              </span>
            </button>

            {/* Visualizações */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-bold text-white">
                {(release.views_count || 0).toLocaleString("pt-AO")}
              </span>
            </div>

            {/* Mute/Unmute */}
            {canPlayVideo && (
              <button onClick={toggleMute} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)" }}>
                  {muted
                    ? <VolumeX className="w-6 h-6 text-white" />
                    : <Volume2 className="w-6 h-6 text-white" />}
                </div>
              </button>
            )}

            {/* Produtos */}
            {release.linked_products?.length > 0 && (
              <button onClick={() => setShowProducts(true)} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})` }}>
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold" style={{ color: sand }}>
                  {release.linked_products.length}
                </span>
              </button>
            )}
          </div>
        )}

        {/* ── FIX 3: INFO INFERIOR — legenda + botão produtos (margem inferior, sobre vídeo) ── */}
        {!showProducts && !showComments && (
          <div className="absolute bottom-0 left-0 right-16 z-20 px-4 pb-6">
            {/* Seller mini info */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-black" style={{ color: sand }}>
                @{release.seller?.name || "vendedor"}
              </span>
              {release.seller?.is_verified && <BadgeCheck className="w-3 h-3" style={{ color: gold }} />}
            </div>

            {/* Título */}
            <p className="text-base font-black text-white mb-1 leading-tight line-clamp-2">
              {release.title}
            </p>

            {/* Descrição */}
            {release.description && (
              <p className="text-[12px] text-white/60 mb-2 line-clamp-2 leading-relaxed">
                {release.description}
              </p>
            )}

            {/* Chips: duração + ver produtos */}
            <div className="flex items-center gap-2 flex-wrap">
              {release.video_duration_s && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(0,0,0,0.65)", color: sand }}>
                  {fmtDuration(release.video_duration_s)}
                </span>
              )}
              {release.linked_products?.length > 0 && (
                <button
                  onClick={() => setShowProducts(true)}
                  className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-full transition active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${sandDark}, ${brown})`, color: "#fff" }}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Ver {release.linked_products.length} produto{release.linked_products.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Spacer para o vídeo ocupar toda a altura — necessário porque o container é flex mas o vídeo é absolute */}
        <div style={{ height: "100vh" }} />
      </div>

      {/* Botão fechar lateral (desktop) */}
      <button
        onClick={onClose}
        className="hidden md:flex absolute right-6 top-6 w-10 h-10 rounded-full items-center justify-center"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
      >
        <X className="w-5 h-5 text-white" />
      </button>
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
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
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
          {release.seller?.is_verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sandDark }} />}
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

  const [watchRelease, setWatchRelease] = useState<any>(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [filter,       setFilter]       = useState<"all" | "live" | "upcoming" | "ended">("all");

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
        .select(`*, seller:sellers(id, name, logo_url, is_verified, user_id)`)
        .neq("status", "deleted").order("broadcasts_at", { ascending: true }).limit(60);
      if (error) console.error("releases:", error.message);
      if (!data?.length) return [];
      const allProdIds = [...new Set(data.flatMap((r: any) => r.linked_product_ids || []))];
      let prodMap: Record<string, any> = {};
      if (allProdIds.length) {
        const { data: prods } = await (supabase as any).from("products").select("id, title, price, old_price, image_url, slug").in("id", allProdIds);
        (prods || []).forEach((p: any) => { prodMap[p.id] = p; });
      }
      return data.map((r: any) => ({
        ...r,
        linked_products: (r.linked_product_ids || []).map((id: string) => prodMap[id]).filter(Boolean),
      }));
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  useEffect(() => {
    const ch = (supabase as any).channel("releases_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "releases" }, () => {
        qc.invalidateQueries({ queryKey: ["releases_all"] });
        qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
      }).subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [qc, sellerId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este lançamento? Esta acção é irreversível.")) return;
    const { error } = await (supabase as any).from("releases").update({ status: "deleted" }).eq("id", id);
    if (error) { toast.error("Erro ao eliminar"); return; }
    qc.setQueryData(["releases_all"], (old: any[] = []) => old.filter((r: any) => r.id !== id));
    qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
    toast.success("Lançamento eliminado");
  };

  const filtered = releases.filter((r: any) => {
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
            <div className="flex-1" />
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

          <div className="flex items-center gap-2 mt-3 pb-1 overflow-x-auto no-scrollbar">
            {[
              { key: "all",      label: "Todos",         count: releases.length },
              { key: "live",     label: "Ao vivo agora", count: liveNow.length  },
              { key: "upcoming", label: "Próximos",      count: upcoming.length },
              { key: "ended",    label: "Terminados",    count: ended.length    },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as any)}
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
        {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: sandDark }} /></div>}

        {!isLoading && (
          <>
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
                        : `${MAX_RELEASES - myCount} slot${MAX_RELEASES - myCount !== 1 ? "s" : ""} disponível${MAX_RELEASES - myCount !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-[11px] text-white/60 mt-0.5">
                      Cada lançamento pode ter até 5 produtos novos · vídeo máx. 7 min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                  {Array.from({ length: MAX_RELEASES }).map((_, i) => (
                    <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < myCount ? gold : "rgba(255,255,255,0.20)" }} />
                  ))}
                  <button onClick={() => setShowCreate(true)} disabled={myCount >= MAX_RELEASES}
                    className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.15)" : gold, color: myCount >= MAX_RELEASES ? "rgba(255,255,255,0.5)" : brown }}>
                    <Plus className="w-3.5 h-3.5" /> Novo
                  </button>
                </div>
              </div>
            )}

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
                    <ReleaseCard key={r.id} release={r} onClick={() => setWatchRelease(r)}
                      canDelete={canPublish && r.seller_id === sellerId} onDelete={() => handleDelete(r.id)} />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: cream, border: `1px dashed rgba(74,46,10,0.20)` }}>
                <Film className="w-10 h-10 mx-auto mb-3" style={{ color: sandDark, opacity: 0.4 }} />
                <p className="text-sm font-bold" style={{ color: sandDark }}>Nenhum lançamento</p>
                {canPublish && (
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
                    canDelete={canPublish && r.seller_id === sellerId} onDelete={() => handleDelete(r.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />

      {watchRelease && (
        <WatchModal
          release={watchRelease}
          onClose={() => setWatchRelease(null)}
          userId={user?.id ?? null}
          sellerId={sellerId}
          onDeleted={(id) => {
            qc.setQueryData(["releases_all"], (old: any[] = []) => old.filter((r: any) => r.id !== id));
            qc.invalidateQueries({ queryKey: ["my_releases_count", sellerId] });
            setWatchRelease(null);
          }}
        />
      )}
      {showCreate && canPublish && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          sellerId={sellerId}
          currentCount={myCount}
        />
      )}
    </div>
  );
};

export default Lancamentos;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * SQL NECESSÁRIO — cria a tabela de comentários se ainda não existir
 * Copia e executa no Supabase SQL Editor:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * create table if not exists public.release_comments (
 *   id          uuid primary key default gen_random_uuid(),
 *   release_id  uuid not null references public.releases(id) on delete cascade,
 *   user_id     uuid references auth.users(id) on delete set null,
 *   user_name   text,
 *   user_avatar text,
 *   content     text not null,
 *   created_at  timestamptz not null default now()
 * );
 *
 * -- Índices para performance
 * create index if not exists release_comments_release_id_idx on public.release_comments(release_id);
 * create index if not exists release_comments_created_at_idx on public.release_comments(created_at);
 *
 * -- Row Level Security
 * alter table public.release_comments enable row level security;
 *
 * -- Qualquer pessoa pode ler comentários
 * create policy "release_comments_select" on public.release_comments
 *   for select using (true);
 *
 * -- Apenas utilizadores autenticados podem comentar
 * create policy "release_comments_insert" on public.release_comments
 *   for insert with check (auth.uid() = user_id);
 *
 * -- Apenas o autor pode apagar o seu próprio comentário
 * create policy "release_comments_delete" on public.release_comments
 *   for delete using (auth.uid() = user_id);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
