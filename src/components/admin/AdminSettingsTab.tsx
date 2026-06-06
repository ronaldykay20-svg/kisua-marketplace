import { useRef, useState, useEffect } from "react";
import { Upload, Image, Star, Trash2, Loader2, Share2, Facebook, Instagram, Youtube, Twitter, Linkedin, MessageCircle, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting, useUpdateSiteSetting } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const SOCIALS = [
  { key: "social_facebook_url", label: "Facebook", Icon: Facebook, placeholder: "https://facebook.com/..." },
  { key: "social_instagram_url", label: "Instagram", Icon: Instagram, placeholder: "https://instagram.com/..." },
  { key: "social_whatsapp_url", label: "WhatsApp", Icon: MessageCircle, placeholder: "https://wa.me/244..." },
  { key: "social_tiktok_url", label: "TikTok", Icon: Music2, placeholder: "https://tiktok.com/@..." },
  { key: "social_youtube_url", label: "YouTube", Icon: Youtube, placeholder: "https://youtube.com/@..." },
  { key: "social_twitter_url", label: "X / Twitter", Icon: Twitter, placeholder: "https://x.com/..." },
  { key: "social_linkedin_url", label: "LinkedIn", Icon: Linkedin, placeholder: "https://linkedin.com/company/..." },
] as const;

const SocialRow = ({ keyName, label, Icon, placeholder }: { keyName: string; label: string; Icon: any; placeholder: string }) => {
  const { data: value } = useSiteSetting(keyName);
  const update = useUpdateSiteSetting();
  const [draft, setDraft] = useState("");
  useEffect(() => { setDraft(value || ""); }, [value]);
  const active = !!(value && value.trim());
  return (
    <div className="flex items-center gap-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-foreground">{label} {active && <span className="text-accent">• ativo</span>}</p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-0.5 px-2 py-1.5 rounded-md bg-background border border-border text-xs text-foreground"
        />
      </div>
      <button
        onClick={() => update.mutate({ key: keyName, value: draft.trim() })}
        className="text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground"
      >
        Salvar
      </button>
      {active && (
        <button
          onClick={() => { setDraft(""); update.mutate({ key: keyName, value: "" }); }}
          className="text-[11px] font-bold px-2 py-1.5 rounded-md text-destructive hover:bg-destructive/10"
          title="Desativar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const AdminSettingsTab = () => {
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const { data: featuredSellerId } = useSiteSetting("featured_seller_id");
  const updateSetting = useUpdateSiteSetting();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Load all active sellers for the dropdown
  const { data: allSellers = [] } = useQuery({
    queryKey: ["admin_all_sellers_for_featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, name, type, is_verified")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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
      {/* Logo */}
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
            <button onClick={() => updateSetting.mutate({ key: "site_logo_url", value: "" })} className="text-xs text-destructive hover:underline">
              Remover
            </button>
          )}
        </div>
      </div>

      {/* Featured Seller */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-secondary" /> Vendedor/Empresa em Destaque
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Escolha um vendedor ou empresa para destacar na homepage com os seus produtos.
        </p>
        <select
          value={featuredSellerId || ""}
          onChange={(e) => updateSetting.mutate({ key: "featured_seller_id", value: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground"
        >
          <option value="">Automático (maior vendedor verificado)</option>
          {allSellers.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.is_verified ? "✅" : ""} ({s.type === "company" ? "Empresa" : "Vendedor"})
            </option>
          ))}
        </select>
        {featuredSellerId && (
          <button
            onClick={() => updateSetting.mutate({ key: "featured_seller_id", value: "" })}
            className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Remover destaque manual
          </button>
        )}
      </div>

      {/* Social links */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> Redes Sociais
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cole o link de cada rede. Apenas as redes com link preenchido aparecem no rodapé.
        </p>
        <div className="space-y-2">
          {SOCIALS.map((s) => (
            <SocialRow key={s.key} keyName={s.key} label={s.label} Icon={s.Icon} placeholder={s.placeholder} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
