import { useState } from "react";
import { Save, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  image_url: string;
}

const emptyForm: ProductFormData = {
  title: "", description: "", price: "", old_price: "", discount_percent: "",
  stock: "1", sku: "", condition: "new", province: "", city: "",
  category_id: "", free_shipping: false, badge: "", image_url: "",
};

interface Props {
  editingProduct?: any;
  onSave: (data: any) => void;
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

const SellerProductForm = ({ editingProduct, onSave, onCancel, saving }: Props) => {
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
        image_url: editingProduct.image_url || "",
      };
    }
    return emptyForm;
  });

  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `products/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
    } catch (err: any) {
      console.error("Upload error:", err.message);
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    const payload: any = {
      title: form.title,
      description: form.description || null,
      price: parseFloat(form.price),
      old_price: form.old_price ? parseFloat(form.old_price) : null,
      discount_percent: form.discount_percent ? parseInt(form.discount_percent) : null,
      stock: parseInt(form.stock) || 1,
      sku: form.sku || null,
      condition: form.condition,
      province: form.province || null,
      city: form.city || null,
      category_id: form.category_id || null,
      free_shipping: form.free_shipping,
      badge: form.badge || null,
      image_url: form.image_url || null,
    };
    onSave(payload);
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

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Categoria</label>
            <select value={form.category_id} onChange={e => set("category_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
              <option value="">Selecionar</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Condição</label>
            <select value={form.condition} onChange={e => set("condition", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
              {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
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

        {/* Image */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem do produto</label>
          <div className="flex gap-2">
            <input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="URL da imagem ou faça upload"
              className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
            <label className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer border transition ${uploading ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
              <Upload className="w-3.5 h-3.5" /> {uploading ? "..." : "Upload"}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="Preview" className="w-20 h-20 rounded-lg object-cover mt-2 border border-border" />
          )}
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
