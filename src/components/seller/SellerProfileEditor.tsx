import { useState } from "react";
import { Save, Upload } from "lucide-react";
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
      const path = `sellers/${seller.id}/${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, [field]: data.publicUrl }));
    } catch (err: any) {
      console.error(err.message);
    }
    setUploading(null);
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-sm font-bold text-foreground mb-3">Editar Perfil da Loja</h2>
      <div className="space-y-3">
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

        {/* Logo & Cover */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Logo</label>
            <div className="flex items-center gap-2">
              {form.logo_url && <img src={form.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />}
              <label className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer bg-accent text-foreground border border-border">
                <Upload className="w-3 h-3" /> {uploading === "logo_url" ? "..." : "Upload"}
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload("logo_url", e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Capa</label>
            <div className="flex items-center gap-2">
              {form.cover_url && <img src={form.cover_url} alt="" className="w-16 h-10 rounded-lg object-cover border border-border" />}
              <label className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer bg-accent text-foreground border border-border">
                <Upload className="w-3 h-3" /> {uploading === "cover_url" ? "..." : "Upload"}
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload("cover_url", e.target.files[0])} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <button onClick={() => updateProfile.mutate()} disabled={!form.name}
          className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> Guardar Perfil
        </button>
      </div>
    </div>
  );
};

export default SellerProfileEditor;
