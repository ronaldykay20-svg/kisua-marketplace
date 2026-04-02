import { useState } from "react";
import { Save, Upload, X, User, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const provinces = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte",
  "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte",
  "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire",
];

interface Props {
  seller: any;
}

const SellerProfileEditor = ({ seller }: Props) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: seller.name || "",
    description: seller.description || "",
    phone: seller.phone || "",
    whatsapp: seller.whatsapp || "",
    email: seller.email || "",
    province: seller.province || "",
    city: seller.city || "",
    address: seller.address || "",
    website: seller.website || "",
    logo_url: seller.logo_url || "",
    cover_url: seller.cover_url || "",
  });
  const [uploading, setUploading] = useState<string | null>(null);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sellers").update({
        name: form.name,
        description: form.description || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        province: form.province || null,
        city: form.city || null,
        address: form.address || null,
        website: form.website || null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
      }).eq("id", seller.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_seller"] });
      toast.success("Perfil atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleUpload = async (field: "logo_url" | "cover_url", file: File) => {
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const path = `sellers/${seller.id}/${field.replace("_url", "")}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, [field]: data.publicUrl }));
      toast.success(field === "logo_url" ? "Logo carregado!" : "Capa carregada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(null);
  };

  const clearImage = (field: "logo_url" | "cover_url") => {
    setForm(f => ({ ...f, [field]: "" }));
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-bold text-foreground mb-3">Editar Perfil da Loja</h2>
      <div className="space-y-3">

        {/* ═══ COVER PREVIEW ═══ */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Imagem de Capa</label>
          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted border border-border">
            {form.cover_url ? (
              <>
                <img src={form.cover_url} alt="Capa" className="w-full h-full object-cover" />
                <button onClick={() => clearImage("cover_url")}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-destructive hover:bg-background">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mb-1" />
                <span className="text-[10px]">Sem imagem de capa</span>
              </div>
            )}
            <label className={`absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer bg-background/90 text-foreground border border-border backdrop-blur-sm hover:bg-background ${uploading === "cover_url" ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="w-3 h-3" /> {uploading === "cover_url" ? "A enviar..." : "Alterar capa"}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload("cover_url", e.target.files[0])} className="hidden" disabled={uploading === "cover_url"} />
            </label>
          </div>
        </div>

        {/* ═══ LOGO PREVIEW ═══ */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Logo / Foto de Perfil</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
              {form.logo_url ? (
                <>
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  <button onClick={() => clearImage("logo_url")}
                    className="absolute top-0 right-0 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center text-destructive hover:bg-background">
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <User className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">Imagem quadrada, mínimo 200×200px. Formatos: JPG, PNG.</p>
              <label className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-accent text-foreground border border-border hover:bg-accent/80 ${uploading === "logo_url" ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="w-3.5 h-3.5" /> {uploading === "logo_url" ? "A enviar..." : "Carregar logo"}
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload("logo_url", e.target.files[0])} className="hidden" disabled={uploading === "logo_url"} />
              </label>
            </div>
          </div>
        </div>

        {/* ═══ DADOS ═══ */}
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Nome da loja</label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Descrição</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-16 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Telefone</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">WhatsApp</label>
            <input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Email</label>
          <input value={form.email} onChange={e => set("email", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>
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
            <input value={form.city} onChange={e => set("city", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Endereço</label>
          <input value={form.address} onChange={e => set("address", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>
        <div>
          <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Website</label>
          <input value={form.website} onChange={e => set("website", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground" />
        </div>

        <button onClick={() => updateProfile.mutate()} disabled={!form.name || updateProfile.isPending}
          className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {updateProfile.isPending ? "A guardar..." : "Guardar Perfil"}
        </button>
      </div>
    </div>
  );
};

export default SellerProfileEditor;
