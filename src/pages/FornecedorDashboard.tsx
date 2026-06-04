import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package, TrendingUp, ShoppingBag, DollarSign,
  Plus, Trash2, BarChart3, Star,
  AlertCircle, Clock, ArrowLeft, Camera,
  ImageIcon, X, Upload, Save, Weight,
  Ruler, Package2, Info, AlertTriangle, Edit, Eye, EyeOff,
} from "lucide-react";
import SellerProductForm from "@/components/seller/SellerProductForm";
import SellerProfileEditor from "@/components/seller/SellerProfileEditor";
import { User as UserIcon } from "lucide-react";

type Tab = "visao" | "produtos" | "pedidos" | "ganhos" | "perfil";

const CATEGORIES = [
  "Eletrônicos", "Calçados", "Vestuário", "Acessórios",
  "Casa e Jardim", "Beleza", "Desporto", "Alimentação", "Outros",
];

// Paleta âmbar para secção de medidas
const amber = {
  bg: "rgba(120, 80, 40, 0.06)",
  border: "rgba(160, 100, 40, 0.25)",
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

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  cost_price: string;
  suggested_price: string;
  min_price: string;
  stock_quantity: string;
  sku: string;
  weight_kg: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  volume_m3: string;
}

const emptyForm: ProductFormData = {
  name: "", description: "", category: "",
  cost_price: "", suggested_price: "", min_price: "",
  stock_quantity: "1", sku: "",
  weight_kg: "", length_cm: "", width_cm: "", height_cm: "", volume_m3: "",
};

interface MediaItem {
  url: string;
  is_cover: boolean;
}

// ─── Formulário de produto melhorado ─────────────────────
const SupplierProductForm = ({
  supplierId,
  onSuccess,
  onCancel,
}: {
  supplierId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof ProductFormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  // Calcular volume automaticamente das dimensões
  const updateVolume = (l: string, w: string, h: string) => {
    const lv = parseFloat(l), wv = parseFloat(w), hv = parseFloat(h);
    if (!isNaN(lv) && !isNaN(wv) && !isNaN(hv) && lv > 0 && wv > 0 && hv > 0) {
      setForm(f => ({ ...f, volume_m3: ((lv * wv * hv) / 1_000_000).toFixed(4) }));
    }
  };

  const hasWeight = !!form.weight_kg && parseFloat(form.weight_kg) > 0;
  const hasDimensions = !!(form.length_cm || form.width_cm || form.height_cm);

  // Calcular margem sugerida
  const margin = form.cost_price && form.suggested_price
    ? Math.round(((parseFloat(form.suggested_price) - parseFloat(form.cost_price)) / parseFloat(form.suggested_price)) * 100)
    : null;

  // Upload de imagens
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setPhotoError(false);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `supplier_products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("products").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("products").getPublicUrl(path);
        setMedia(prev => [...prev, { url: data.publicUrl, is_cover: prev.length === 0 }]);
      }
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setMedia(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(m => m.is_cover)) updated[0].is_cover = true;
      return updated;
    });
  };

  const setCover = (index: number) =>
    setMedia(prev => prev.map((m, i) => ({ ...m, is_cover: i === index })));

  const handleSubmit = async () => {
    if (!form.name || !form.cost_price || !form.stock_quantity) {
      toast.error("Preenche os campos obrigatórios: nome, preço de custo e stock");
      return;
    }
    if (media.length === 0) {
      setPhotoError(true);
      toast.error("Adiciona pelo menos uma imagem do produto");
      return;
    }

    setSaving(true);
    try {
      const imageUrls = media.map(m => m.url);

      const { error } = await supabase.from("supplier_products").insert({
        supplier_id: supplierId,
        name: form.name,
        description: form.description || null,
        category: form.category || null,
        cost_price: parseFloat(form.cost_price),
        suggested_price: form.suggested_price ? parseFloat(form.suggested_price) : null,
        min_price: form.min_price ? parseFloat(form.min_price) : null,
        stock_quantity: parseInt(form.stock_quantity),
        sku: form.sku || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        length_cm: form.length_cm ? parseFloat(form.length_cm) : null,
        width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        volume_m3: form.volume_m3 ? parseFloat(form.volume_m3) : null,
        images: imageUrls,
        status: "active",
      });

      if (error) throw error;
      toast.success("Produto adicionado com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao guardar produto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-sm">Novo Produto</h3>
        <button onClick={onCancel} className="p-1 text-muted-foreground hover:bg-accent rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nome */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-1">Nome do produto *</label>
        <input
          value={form.name}
          onChange={e => set("name", e.target.value)}
          placeholder="Ex: Smartphone Samsung Galaxy A54"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-1">Descrição</label>
        <textarea
          value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Descreve o produto em detalhe: especificações, materiais, uso..."
          rows={3}
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Categoria & SKU */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">Categoria</label>
          <select
            value={form.category}
            onChange={e => set("category", e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Selecciona...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground block mb-1">SKU / Referência</label>
          <input
            value={form.sku}
            onChange={e => set("sku", e.target.value)}
            placeholder="SAM-A54-BLK"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Preços */}
      <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
        <p className="text-[11px] font-bold text-muted-foreground">Preços (Kz)</p>

        <div>
          <label className="text-[10px] font-bold text-muted-foreground block mb-1">
            Preço de custo * <span className="text-muted-foreground font-normal">— o que recebes por venda</span>
          </label>
          <input
            type="number"
            value={form.cost_price}
            onChange={e => set("cost_price", e.target.value)}
            placeholder="Ex: 50 000"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">
              Preço mínimo <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={form.min_price}
              onChange={e => set("min_price", e.target.value)}
              placeholder="Ex: 60 000"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[9px] text-muted-foreground mt-0.5">Dropshipper não pode vender abaixo</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">Preço sugerido</label>
            <input
              type="number"
              value={form.suggested_price}
              onChange={e => set("suggested_price", e.target.value)}
              placeholder="Ex: 70 000"
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[9px] text-muted-foreground mt-0.5">Recomendação para dropshippers</p>
          </div>
        </div>

        {/* Margem sugerida */}
        {margin !== null && margin > 0 && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-green-500/5 border border-green-500/20">
            <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-600">
              Margem sugerida para dropshippers: <strong>{margin}%</strong>
            </p>
          </div>
        )}

        <div className="bg-muted rounded-xl p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            O <strong className="text-foreground">preço de custo</strong> é o valor que recebes por cada venda.
            Os dropshippers definem o seu preço de venda acima do preço mínimo.
          </p>
        </div>
      </div>

      {/* Stock */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-1">Stock disponível *</label>
        <input
          type="number"
          value={form.stock_quantity}
          onChange={e => set("stock_quantity", e.target.value)}
          placeholder="Ex: 50"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
              ✓ Frete disponível
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: amber.warningBg, color: amber.warningText, border: `1px solid ${amber.warningBorder}` }}>
              Sem frete interprovincial
            </span>
          )}
        </div>

        {/* Peso */}
        <div>
          <label className="text-[10px] font-bold mb-1 block" style={{ color: amber.label }}>
            <Weight className="w-3 h-3 inline mr-1" />
            Peso (kg)
          </label>
          <input
            type="number" min={0} step="0.01"
            value={form.weight_kg}
            onChange={e => set("weight_kg", e.target.value)}
            placeholder="Ex: 1.5"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: amber.inputBg, border: `1px solid ${form.weight_kg ? amber.accentBorder : amber.border}`, color: "inherit" }}
          />
          {!hasWeight && (
            <p className="text-[9px] mt-1 flex items-center gap-1" style={{ color: amber.warningText }}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Sem peso — entrega interprovincial não disponível.
            </p>
          )}
        </div>

        {/* Dimensões */}
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
                  type="number" min={0} step="0.1"
                  value={form[key]}
                  onChange={e => {
                    set(key, e.target.value);
                    const vals = {
                      length_cm: form.length_cm,
                      width_cm: form.width_cm,
                      height_cm: form.height_cm,
                      [key]: e.target.value,
                    };
                    updateVolume(vals.length_cm, vals.width_cm, vals.height_cm);
                  }}
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

        {/* Volume manual se não tiver dimensões */}
        {!hasDimensions && (
          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: amber.label }}>
              Volume (m³) — opcional
            </label>
            <input
              type="number" min={0} step="0.0001"
              value={form.volume_m3}
              onChange={e => set("volume_m3", e.target.value)}
              placeholder="Ex: 0.02"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: amber.inputBg, border: `1px solid ${amber.border}`, color: "inherit" }}
            />
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{ background: amber.accentBg, border: `1px solid ${amber.accentBorder}` }}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: amber.accent }} />
          <p className="text-[10px] leading-relaxed" style={{ color: amber.label }}>
            O peso e volume são usados para calcular o custo de frete.
            {!hasWeight && " Sem peso, apenas entregas locais estarão disponíveis."}
          </p>
        </div>
      </div>

      {/* Imagens */}
      <div>
        <label className="text-[11px] font-bold text-muted-foreground mb-1 flex items-center gap-1.5 block">
          <Camera className="w-3.5 h-3.5" />
          Imagens do produto *
          <span className="text-[9px] text-destructive font-bold">(mínimo 1 obrigatória)</span>
        </label>

        <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border transition mb-2 w-fit ${uploading ? "opacity-50" : "bg-accent text-foreground border-border hover:bg-accent/80"}`}>
          <ImageIcon className="w-3.5 h-3.5" />
          {uploading ? "A enviar..." : "Adicionar Imagens"}
          <input type="file" accept="image/*" multiple onChange={handleImagesUpload} className="hidden" disabled={uploading} />
        </label>

        {photoError && media.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2" style={{ background: "#FFF0F0", border: "1.5px solid #C0392B55" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#C0392B" }} />
            <p className="text-xs font-bold" style={{ color: "#C0392B" }}>Adiciona pelo menos uma foto antes de publicar.</p>
          </div>
        )}

        {media.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {media.map((m, i) => (
              <div key={i} className={`relative rounded-lg border-2 overflow-hidden aspect-square ${m.is_cover ? "border-primary" : "border-border"}`}>
                <img src={m.url} alt="" className="w-full h-full object-cover" />
                {m.is_cover && (
                  <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-primary text-primary-foreground">CAPA</span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-background/80 flex justify-between p-0.5">
                  {!m.is_cover && (
                    <button onClick={() => setCover(i)} className="text-[9px] font-bold text-primary px-1">Capa</button>
                  )}
                  <button onClick={() => removeImage(i)} className="text-destructive ml-auto p-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 gap-2 ${photoError ? "border-destructive" : "border-border"}`}>
            <Camera className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Clique em "Adicionar Imagens" para carregar fotos</p>
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !form.name || !form.cost_price || !form.stock_quantity}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "A guardar..." : "Adicionar Produto"}
        </button>
      </div>
    </div>
  );
};

// ─── Dashboard principal ──────────────────────────────────
export default function FornecedorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("visao");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [supplierMinPrice, setSupplierMinPrice] = useState("");

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["my_supplier", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Perfil de vendedor unificado — os produtos do fornecedor/afiliado vivem em `products`
  // e aparecem nas mesmas listagens dos vendedores normais.
  const { data: seller } = useQuery({
    queryKey: ["my_seller_for_supplier", user?.id],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (existing) return existing;

      // Auto-cria se não existir (fornecedores antigos sem sellers row)
      const baseName = supplier?.company_name || "Fornecedor";
      const slug = baseName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) + "-" + user!.id.slice(0, 6);

      const { data: created, error } = await (supabase as any)
        .from("sellers")
        .insert({
          user_id: user!.id,
          name: baseName,
          slug,
          type: "company",
          description: supplier?.description || null,
          phone: supplier?.phone || null,
          email: supplier?.email || null,
          province: supplier?.province || null,
          address: supplier?.address || null,
          is_active: supplier?.status === "approved",
        })
        .select("*")
        .single();
      if (error) throw error;
      return created;
    },
    enabled: !!user && !!supplier,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["supplier_categories_for_mirror"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["supplier_seller_products", seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!seller?.id,
  });

  const { data: productCovers = {} } = useQuery({
    queryKey: ["supplier_product_covers", seller?.id],
    queryFn: async () => {
      const ids = products.map((p: any) => p.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from("product_media")
        .select("product_id, url")
        .in("product_id", ids)
        .eq("is_cover", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((m: any) => { map[m.product_id] = m.url; });
      return map;
    },
    enabled: products.length > 0,
  });

  const { data: editingMedia = [] } = useQuery({
    queryKey: ["product_media", editingProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_media").select("*").eq("product_id", editingProduct!.id).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!editingProduct?.id,
  });

  const { data: editingVariants = [] } = useQuery({
    queryKey: ["product_variants_edit", editingProduct?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", editingProduct!.id).order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!editingProduct?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["supplier_orders_items", supplier?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_order_items")
        .select("*, supplier_orders(id, created_at, status), supplier_products(name)")
        .eq("supplier_id", supplier!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!supplier?.id,
  });

  const saveProduct = useMutation({
    mutationFn: async ({ payload, media, variants }: { payload: any; media: any[]; variants?: any[] }) => {
      if (!seller?.id) throw new Error("Perfil de vendedor indisponível");
      const fullPayload = { ...payload, seller_id: seller.id, is_active: true };
      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase.from("products").update(fullPayload).eq("id", editingProduct.id);
        if (error) throw error;
        await supabase.from("product_media").delete().eq("product_id", editingProduct.id);
        await supabase.from("product_variants").delete().eq("product_id", editingProduct.id);
      } else {
        const { data, error } = await supabase.from("products").insert(fullPayload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      if (media.length > 0 && productId) {
        const mediaRows = media.map((m: any, i: number) => ({
          product_id: productId, url: m.url, type: m.type, is_cover: m.is_cover, sort_order: i,
        }));
        const { error } = await supabase.from("product_media").insert(mediaRows);
        if (error) throw error;
      }

      if (!editingProduct && supplier?.id) {
        const supplierPrice = Number(payload.price) || 0;
        const minimumPrice = Math.max(Number(supplierMinPrice) || supplierPrice, supplierPrice);
        const categoryName = (categories as any[]).find((c: any) => c.id === payload.category_id)?.name || null;
        const { error: mirrorError } = await (supabase as any).from("supplier_products").insert({
          supplier_id: supplier.id,
          name: payload.title,
          description: payload.description || null,
          category: categoryName,
          cost_price: supplierPrice,
          suggested_price: Math.ceil(minimumPrice * 1.1),
          min_price: minimumPrice,
          stock_quantity: payload.stock || 1,
          sku: payload.sku || null,
          weight_kg: payload.weight_kg || null,
          length_cm: payload.length_cm || null,
          width_cm: payload.width_cm || null,
          height_cm: payload.height_cm || null,
          volume_m3: payload.volume_m3 || null,
          images: media.map((m: any) => m.url),
          status: "active",
        });
        if (mirrorError) throw mirrorError;
      }

      if (variants && variants.length > 0 && productId) {
        const parents = variants.filter((v: any) => v.name && !v.parent_id);
        const tempIdToDbId: Record<string, string> = {};
        for (let i = 0; i < parents.length; i++) {
          const v = parents[i];
          const { data, error } = await supabase.from("product_variants").insert({
            product_id: productId, variant_type: v.variant_type, name: v.name,
            value: v.value || null, price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock: parseInt(v.stock) || 0, image_url: v.image_url || null,
            sort_order: i, is_active: true, parent_id: null,
          }).select("id").single();
          if (error) throw error;
          tempIdToDbId[v._tempId] = data.id;
        }
        const children = variants.filter((v: any) => v.name && v.parent_id);
        if (children.length > 0) {
          const childRows = children.map((v: any, i: number) => ({
            product_id: productId, variant_type: v.variant_type, name: v.name,
            value: v.value || null, price_override: v.price_override ? parseFloat(v.price_override) : null,
            stock: parseInt(v.stock) || 0, image_url: v.image_url || null,
            sort_order: i, is_active: true,
            parent_id: tempIdToDbId[v.parent_id] || null,
          }));
          const { error } = await supabase.from("product_variants").insert(childRows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_seller_products"] });
      queryClient.invalidateQueries({ queryKey: ["supplier_product_covers"] });
      queryClient.invalidateQueries({ queryKey: ["product_media"] });
      toast.success(editingProduct ? "Produto actualizado!" : "Produto adicionado!");
      setShowAddProduct(false);
      setEditingProduct(null);
      setSupplierMinPrice("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supplier_seller_products"] }); toast.success("Estado alterado"); },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_seller_products"] });
      toast.success("Produto removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("supplier_order_items")
        .update({ supplier_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_orders_items"] });
      toast.success("Estado actualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatKz = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const statusColor: Record<string, string> = {
    pending:      "bg-amber-500/10 text-amber-500",
    active:       "bg-green-500/10 text-green-500",
    confirmed:    "bg-blue-500/10 text-blue-500",
    shipped:      "bg-purple-500/10 text-purple-500",
    delivered:    "bg-green-500/10 text-green-500",
    suspended:    "bg-destructive/10 text-destructive",
    out_of_stock: "bg-muted text-muted-foreground",
  };

  const statusLabel: Record<string, string> = {
    pending:      "Pendente",
    active:       "Activo",
    confirmed:    "Confirmado",
    shipped:      "Enviado",
    delivered:    "Entregue",
    suspended:    "Suspenso",
    out_of_stock: "Sem stock",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Ainda não és Fornecedor</h2>
          <p className="text-sm text-muted-foreground">
            Regista a tua empresa para começares a fornecer produtos à rede de dropshippers do Zangu.
          </p>
          <button
            onClick={() => navigate("/seja-fornecedor")}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Registar como Fornecedor
          </button>
        </div>
      </div>
    );
  }

  if (supplier.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Pedido em Análise</h2>
          <p className="text-sm text-muted-foreground">
            O teu pedido está a ser verificado pela equipa. Receberás uma notificação em 24 a 48 horas.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 text-left">
            <p className="text-sm font-bold text-foreground">{supplier.company_name}</p>
            <p className="text-xs text-muted-foreground mt-1">Submetido — aguarda aprovação</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 border border-border rounded-xl text-sm font-bold text-foreground"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "visao",    label: "Visão Geral", icon: BarChart3 },
    { key: "perfil",   label: "Perfil",      icon: UserIcon },
    { key: "produtos", label: "Produtos",    icon: Package },
    { key: "pedidos",  label: "Pedidos",     icon: ShoppingBag },
    { key: "ganhos",   label: "Ganhos",      icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">Painel do Fornecedor</p>
            <h1 className="text-lg font-bold text-foreground leading-tight">{supplier.company_name}</h1>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusColor[supplier.status]}`}>
            {statusLabel[supplier.status]}
          </span>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Produtos", value: products.length,                          icon: Package,    color: "text-primary" },
            { label: "Pedidos",  value: orders.length,                            icon: ShoppingBag, color: "text-amber-500" },
            { label: "Receita",  value: formatKz(supplier.total_revenue || 0),    icon: TrendingUp, color: "text-green-500" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap flex-shrink-0 ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── VISÃO GERAL ── */}
        {tab === "visao" && (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{supplier.rating > 0 ? supplier.rating.toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">Avaliação média</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Resumo Financeiro</h3>
              {[
                { label: "Total de Receita",  value: formatKz(supplier.total_revenue || 0), color: "text-green-500" },
                { label: "Pedidos entregues", value: orders.filter((o: any) => o.supplier_status === "delivered").length, color: "text-foreground" },
                { label: "Pedidos pendentes", value: orders.filter((o: any) => o.supplier_status === "pending").length,   color: "text-amber-500" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-foreground text-sm">Produtos Recentes</h3>
              {products.slice(0, 3).map((p: any) => {
                const cover = (productCovers as any)[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {cover
                        ? <img src={cover} alt="" className="w-full h-full object-cover rounded-lg" />
                        : <Package className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground">{p.sales_count || 0} vendas</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{formatKz(p.price)}</p>
                  </div>
                );
              })}
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Adiciona o primeiro produto!</p>
              )}
            </div>
          </div>
        )}

        {/* ── PRODUTOS ── */}
        {tab === "produtos" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Os meus Produtos ({products.length})</h2>
              {!showAddProduct && (
                <button
                  onClick={() => { setEditingProduct(null); setSupplierMinPrice(""); setShowAddProduct(true); }}
                  className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              )}
            </div>

            {!seller && (
              <div className="bg-card border border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                A preparar perfil de vendedor…
              </div>
            )}

            {showAddProduct && seller && (
              <div className="space-y-3">
                {!editingProduct && (
                  <div className="bg-card border border-primary/20 rounded-xl p-3">
                    <label className="text-[11px] font-bold text-foreground block mb-1">Preço mínimo para afiliados (Kz)</label>
                    <input
                      type="number"
                      value={supplierMinPrice}
                      onChange={(e) => setSupplierMinPrice(e.target.value)}
                      placeholder="Se vazio, usa o preço actual do produto"
                      className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Ao importar, o afiliado vê uma sugestão automática de +10% sobre este mínimo.</p>
                  </div>
                )}
                <SellerProductForm
                  editingProduct={editingProduct}
                  existingMedia={editingProduct ? editingMedia : []}
                  existingVariants={editingProduct ? editingVariants : []}
                  onSave={(data, media, variants) => saveProduct.mutate({ payload: data, media, variants })}
                  onCancel={() => { setShowAddProduct(false); setEditingProduct(null); setSupplierMinPrice(""); }}
                  saving={saveProduct.isPending}
                  supplierMode
                />
              </div>
            )}

            <div className="space-y-2">
              {products.map((p: any) => {
                const cover = (productCovers as any)[p.id];
                return (
                  <div key={p.id} className={`bg-card border border-border rounded-xl p-3 ${!p.is_active ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {cover
                          ? <img src={cover} alt="" className="w-full h-full object-cover" />
                          : <Package className="w-5 h-5 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{p.title}</p>
                        <p className="text-sm font-bold text-primary mt-0.5">{formatKz(p.price)}</p>
                        <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>{p.is_active ? "Activo" : "Inactivo"}</span>
                          {p.stock != null && <span>• Stock: {p.stock}</span>}
                          {p.badge && <span className="text-primary font-bold">• {p.badge}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingProduct(p); setShowAddProduct(true); }} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleActive.mutate({ id: p.id, active: !p.is_active })} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                          {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteProduct.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {products.length === 0 && !showAddProduct && (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Ainda não adicionaste produtos</p>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="text-primary text-sm font-bold mt-1"
                  >
                    Adicionar primeiro produto →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Pedidos Recebidos</h2>
            {orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Ainda não há pedidos</p>
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {order.supplier_products?.name || "Produto"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Qtd: {order.quantity} • {new Date(order.created_at).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColor[order.supplier_status] || "bg-muted text-muted-foreground"}`}>
                      {statusLabel[order.supplier_status] || order.supplier_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tu recebes</p>
                      <p className="font-bold text-green-500 text-sm">{formatKz(order.supplier_amount || 0)}</p>
                    </div>
                    <div className="flex gap-2">
                      {order.supplier_status === "pending" && (
                        <button
                          onClick={() => updateOrderStatus.mutate({ id: order.id, status: "confirmed" })}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
                        >
                          Confirmar
                        </button>
                      )}
                      {order.supplier_status === "confirmed" && (
                        <button
                          onClick={() => updateOrderStatus.mutate({ id: order.id, status: "shipped" })}
                          className="px-3 py-1.5 border border-border text-xs font-bold rounded-lg text-foreground"
                        >
                          Marcar Enviado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── GANHOS ── */}
        {tab === "ganhos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">Os meus Ganhos</h2>

            <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Total acumulado</p>
              <p className="text-3xl font-bold mt-1">{formatKz(supplier.total_revenue || 0)}</p>
              <p className="text-xs opacity-60 mt-1">
                {orders.filter((o: any) => o.supplier_status === "delivered").length} entregas confirmadas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">Pendente</p>
                <p className="font-bold text-amber-500 mt-1">
                  {formatKz(
                    orders
                      .filter((o: any) => o.supplier_status === "pending")
                      .reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0)
                  )}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] text-muted-foreground">A caminho</p>
                <p className="font-bold text-blue-500 mt-1">
                  {formatKz(
                    orders
                      .filter((o: any) => o.supplier_status === "shipped")
                      .reduce((s: number, o: any) => s + (o.supplier_amount || 0), 0)
                  )}
                </p>
              </div>
            </div>

            <button className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm">
              Pedir Pagamento
            </button>

            <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
              <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Os pagamentos são processados após confirmação de entrega, em 2 a 5 dias úteis.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
