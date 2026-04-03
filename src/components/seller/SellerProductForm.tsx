import { useState } from "react";
import { Save, X, Upload, Trash2, Image as ImageIcon, Film, Plus, Palette, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { STORAGE_BUCKETS } from "@/lib/storage";

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
}

const emptyVariant: VariantItem = {
  variant_type: "color", name: "", value: "", price_override: "", stock: "1", image_url: "", sort_order: 0, is_active: true,
};

const emptyForm: ProductFormData = {
  title: "", description: "", price: "", old_price: "", discount_percent: "",
  stock: "1", sku: "", condition: "new", province: "", city: "",
  category_id: "", free_shipping: false, badge: "",
};

interface Props {
  editingProduct?: any;
  existingMedia?: any[];
  existingVariants?: any[];
  onSave: (data: any, media: MediaItem[], variants: VariantItem[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

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
  { value: "color", label: "Cor", icon: Palette },
  { value: "size", label: "Tamanho", icon: Ruler },
  { value: "material", label: "Material" },
  { value: "style", label: "Estilo" },
  { value: "other", label: "Outro" },
];

const colorPresets = [
  { name: "Preto", value: "#000000" },
  { name: "Branco", value: "#FFFFFF" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#22C55E" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Roxo", value: "#A855F7" },
  { name: "Laranja", value: "#F97316" },
  { name: "Cinza", value: "#6B7280" },
  { name: "Castanho", value: "#92400E" },
  { name: "Bege", value: "#D2B48C" },
];

const SellerProductForm = ({ editingProduct, existingMedia = [], existingVariants = [], onSave, onCancel, saving }: Props) => {
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
        province: editingProduct.province || "",
        city: editingProduct.city || "",
        category_id: editingProduct.category_id || "",
        free_shipping: editingProduct.free_shipping || false,
        badge: editingProduct.badge || "",
      };
    }
    return emptyForm;
  });

  const [media, setMedia] = useState<MediaItem[]>(() =>
    existingMedia.map((m: any, i: number) => ({
      id: m.id, url: m.url, type: m.type || "image", is_cover: m.is_cover || false, sort_order: m.sort_order ?? i,
    }))
  );

  const [variants, setVariants] = useState<VariantItem[]>(() =>
    existingVariants.map((v: any, i: number) => ({
      id: v.id, variant_type: v.variant_type || "color", name: v.name || "", value: v.value || "",
      price_override: v.price_override ? String(v.price_override) : "", stock: String(v.stock ?? 1),
      image_url: v.image_url || "", sort_order: v.sort_order ?? i, is_active: v.is_active ?? true,
    }))
  );

  const [uploading, setUploading] = useState(false);
  const [uploadingVariantIdx, setUploadingVariantIdx] = useState<number | null>(null);

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
      console.error("Upload error:", err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVariantIdx(index);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.products).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.products).getPublicUrl(path);
      setVariants(prev => prev.map((v, i) => i === index ? { ...v, image_url: data.publicUrl } : v));
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

  const setCover = (index: number) => {
    setMedia(prev => prev.map((m, i) => ({ ...m, is_cover: i === index })));
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { ...emptyVariant, sort_order: prev.length }]);
  };

  const updateVariant = (index: number, key: keyof VariantItem, value: any) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [key]: value } : v));
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const payload: any = {
      title: form.title, description: form.description || null,
      price: parseFloat(form.price), old_price: form.old_price ? parseFloat(form.old_price) : null,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      stock: parseInt(form.stock) || 1, sku: form.sku || null, condition: form.condition,
      province: form.province || null, city: form.city || null,
      category_id: form.category_id || null, free_shipping: form.free_shipping, badge: form.badge || null,
    };
    onSave(payload, media, variants);
  };

  const set = (key: keyof ProductFormData, value: any) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">{editingProduct ? "Editar Produto" : "Novo Produto"}</h2>
        <button onClick={onCancel} className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Nome do produto *</label>
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: iPhone 15 Pro Max 256GB"
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Descrição</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Descreva o produto em detalhe..."
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-20 resize-none" />
        </div>

        {/* Price row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Preço (Kz) *</label>
            <input type="number" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Preço antigo</label>
            <input type="number" value={form.old_price} onChange={e => set("old_price", e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Desconto %</label>
            <input type="number" value={form.discount_percent} onChange={e => set("discount_percent", e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
        </div>

        {/* Stock & SKU */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Stock</label>
            <input type="number" value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="1"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">SKU</label>
            <input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="REF-001"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
        </div>

        {/* Category */}
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
                  {subs.map((s: any) => (
                    <option key={s.id} value={s.id}>&nbsp;&nbsp;↳ {s.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Condição</label>
          <select value={form.condition} onChange={e => set("condition", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Província</label>
            <select value={form.province} onChange={e => set("province", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
              <option value="">Selecionar</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Cidade</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cidade"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
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

        {/* ═══ MEDIA ═══ */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagens e Vídeos</label>
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
          {media.length > 0 && (
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
          )}
          {media.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhuma imagem. Faça upload de pelo menos uma.</p>}
        </div>

        {/* ═══ VARIAÇÕES ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-muted-foreground">Variações (cor, tamanho, etc.)</label>
            <button type="button" onClick={addVariant} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-primary border border-primary/30 hover:bg-primary/5 transition">
              <Plus className="w-3 h-3" /> Adicionar variação
            </button>
          </div>

          {variants.length === 0 && (
            <p className="text-[10px] text-muted-foreground">Sem variações. Adicione cores, tamanhos ou outros atributos.</p>
          )}

          <div className="space-y-3">
            {variants.map((variant, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 bg-muted/30 relative">
                <button onClick={() => removeVariant(idx)} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 rounded p-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  {/* Type */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Tipo</label>
                    <select value={variant.variant_type} onChange={e => updateVariant(idx, "variant_type", e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground">
                      {variantTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Nome *</label>
                    <input value={variant.name} onChange={e => updateVariant(idx, "name", e.target.value)}
                      placeholder={variant.variant_type === "color" ? "Ex: Azul" : variant.variant_type === "size" ? "Ex: M" : "Ex: Algodão"}
                      className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  </div>
                </div>

                {/* Color presets */}
                {variant.variant_type === "color" && (
                  <div className="mb-2">
                    <label className="text-[10px] font-bold text-muted-foreground mb-1 block">Cor</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {colorPresets.map(c => (
                        <button key={c.value} type="button" onClick={() => { updateVariant(idx, "value", c.value); if (!variant.name) updateVariant(idx, "name", c.name); }}
                          className={`w-6 h-6 rounded-full border-2 transition ${variant.value === c.value ? "border-primary scale-110" : "border-border"}`}
                          style={{ backgroundColor: c.value }} title={c.name} />
                      ))}
                      <input type="color" value={variant.value || "#000000"} onChange={e => updateVariant(idx, "value", e.target.value)}
                        className="w-6 h-6 rounded-full cursor-pointer border-0 p-0" title="Cor personalizada" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-2">
                  {/* Price override */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Preço (Kz) — vazio = base</label>
                    <input type="number" value={variant.price_override} onChange={e => updateVariant(idx, "price_override", e.target.value)}
                      placeholder={form.price || "Preço base"} className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  </div>
                  {/* Stock */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Stock</label>
                    <input type="number" value={variant.stock} onChange={e => updateVariant(idx, "stock", e.target.value)}
                      placeholder="1" className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground" />
                  </div>
                </div>

                {/* Variant image */}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">Imagem da variação</label>
                  <div className="flex items-center gap-2">
                    {variant.image_url ? (
                      <div className="relative w-14 h-14 rounded-lg border border-border overflow-hidden">
                        <img src={variant.image_url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => updateVariant(idx, "image_url", "")} className="absolute top-0 right-0 bg-destructive/80 text-destructive-foreground p-0.5 rounded-bl">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition ${uploadingVariantIdx === idx ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
                        <ImageIcon className="w-3 h-3" /> Upload
                        <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(e, idx)} className="hidden" disabled={uploadingVariantIdx === idx} />
                      </label>
                    )}
                    {uploadingVariantIdx === idx && <span className="text-[10px] text-muted-foreground">A enviar...</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkboxes */}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.free_shipping} onChange={e => set("free_shipping", e.target.checked)} className="rounded" />
          Frete grátis
        </label>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={!form.title || !form.price || saving}
          className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" />
          {editingProduct ? "Atualizar Produto" : "Adicionar Produto"}
        </button>
      </div>
    </div>
  );
};

export default SellerProductForm;
