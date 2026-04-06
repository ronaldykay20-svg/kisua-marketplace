import { useRef, useState } from "react";
import { Upload, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting, useUpdateSiteSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const AdminSettingsTab = () => {
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const updateSetting = useUpdateSiteSetting();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `site/logo_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("banners").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      updateSetting.mutate({ key: "site_logo_url", value: data.publicUrl });
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Image className="w-4 h-4" /> Logo do Cabeçalho
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Este logo será exibido no cabeçalho do site no lugar do texto padrão.
        </p>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="h-10 bg-primary rounded-lg px-3 flex items-center">
              <img src={logoUrl} alt="Logo" className="h-7 object-contain" />
            </div>
          ) : (
            <div className="h-10 w-24 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Sem logo</span>
            </div>
          )}

          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-primary text-primary-foreground">
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Upload Logo"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} disabled={uploading} />
          </label>

          {logoUrl && (
            <button
              onClick={() => updateSetting.mutate({ key: "site_logo_url", value: "" })}
              className="text-xs text-destructive hover:underline"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
