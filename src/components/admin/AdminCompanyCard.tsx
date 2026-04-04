import { useRef } from "react";
import { Building2, ShieldCheck, UsersRound, Camera, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  company: any;
  onMembers: () => void;
  onVerify: () => void;
  queryClient: any;
}

const AdminCompanyCard = ({ company: c, onMembers, onVerify, queryClient }: Props) => {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File, field: "logo_url" | "banner_url") => {
    const ext = file.name.split(".").pop();
    const path = `companies/${c.id}/${field === "logo_url" ? "logo" : "banner"}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("sellers").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("sellers").getPublicUrl(path);
    const { error } = await supabase.from("companies").update({ [field]: publicUrl }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
    toast.success(field === "logo_url" ? "Foto de perfil atualizada" : "Foto de capa atualizada");
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Banner */}
      <div className="relative h-20 bg-muted overflow-hidden group cursor-pointer" onClick={() => bannerRef.current?.click()}>
        {c.banner_url ? (
          <img src={c.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 flex items-center justify-center transition">
          <Camera className="w-5 h-5 text-primary-foreground opacity-0 group-hover:opacity-100 transition" />
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, "banner_url"); }} />
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden relative group cursor-pointer -mt-6 border-2 border-card" onClick={() => logoRef.current?.click()}>
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-4 h-4 text-primary" />
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 flex items-center justify-center rounded-full transition">
                <Camera className="w-3 h-3 text-primary-foreground opacity-0 group-hover:opacity-100 transition" />
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, "logo_url"); }} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-1">
                {c.name} {c.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
              </p>
              <p className="text-[10px] text-muted-foreground">/{c.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMembers} className="p-2 rounded-lg text-muted-foreground hover:bg-accent" title="Gerir membros">
              <UsersRound className="w-4 h-4" />
            </button>
            <button onClick={onVerify} className={`p-2 rounded-lg ${c.is_verified ? "text-blue-500 hover:bg-blue-500/10" : "text-muted-foreground hover:bg-accent"}`}>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCompanyCard;
