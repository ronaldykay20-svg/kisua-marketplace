import { useRef, useState, useEffect } from "react";
import { Upload, Image, Star, Trash2, Loader2, Share2, Facebook, Instagram, Youtube, Twitter, Linkedin, MessageCircle, Music2, Gavel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSetting, useUpdateSiteSetting } from "@/hooks/useSiteSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const FeatureLeiloesSection = () => {
  const { data: enabledValue } = useSiteSetting("feature_leiloes_enabled");
  const updateSetting = useUpdateSiteSetting();
  const isEnabled = enabledValue === undefined || enabledValue === "true";

  const [testerSearch, setTesterSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: testers = [], isLoading: loadingTesters } = useQuery({
    queryKey: ["feature_testers", "leiloes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feature_testers")
        .select("id, user_id, profiles:user_id(full_name)")
        .eq("feature", "leiloes")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["admin_profiles_search_leiloes", testerSearch],
    queryFn: async () => {
      if (!testerSearch) return [];
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${testerSearch}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: testerSearch.length > 1,
  });

  const addTester = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from("feature_testers")
        .insert({ feature: "leiloes", user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_testers", "leiloes"] });
      toast.success("Tester adicionado");
      setTesterSearch("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeTester = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("feature_testers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_testers", "leiloes"] });
      toast.success("Tester removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
        <Gavel className="w-4 h-4 text-primary" /> Leilões
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Quando desativado, "Leilão" deixa de aparecer nos menus para o público. A funcionalidade continua a existir e pode ser testada pelas pessoas abaixo.
      </p>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{isEnabled ? "Visível para todos" : "Oculto do público"}</p>
          <p className="text-[11px] text-muted-foreground">{isEnabled ? "Qualquer pessoa vê e acede aos Leilões" : "Só Admin e testers veem e acedem"}</p>
        </div>
        <button
          onClick={() => updateSetting.mutate({ key: "feature_leiloes_enabled", value: isEnabled ? "false" : "true" })}
          className={`relative w-12 h-7 rounded-full transition-colors ${isEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      <p className="text-[11px] font-bold text-muted-foreground mb-2">Testers autorizados (acesso mesmo oculto)</p>

      <div className="relative mb-2">
        <input
          value={testerSearch}
          onChange={(e) => setTesterSearch(e.target.value)}
          placeholder="Procurar utilizador por nome..."
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
        />
        {testerSearch.length > 1 && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {searchResults.map((p: any) => (
              <button
                key={p.id}
                onClick={() => addTester.mutate(p.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {p.full_name || p.id.slice(0, 8)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingTesters && <p className="text-xs text-muted-foreground">A carregar...</p>}

      <div className="space-y-1.5">
        {testers.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
            <span className="text-sm font-medium text-foreground">{t.profiles?.full_name || t.user_id.slice(0, 8)}</span>
            <button onClick={() => removeTester.mutate(t.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {testers.length === 0 && !loadingTesters && (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum tester adicionado.</p>
        )}
      </div>
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
      const { error } = await supabase.storage.from("banners").upload(path, file, {
        upsert: true,
        // Mesma lógica dos banners: nome do ficheiro é único (timestamp),
        // por isso pode cachear 1 mês no dispositivo de quem visita sem
        // risco de mostrar logo desatualizado.
        cacheControl: "2592000",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("banners").getPublicUrl(path);
      updateSetting.mutate({ key: "site_logo_url", value: data.publicUrl });
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  const refreshLogoCache = useMutation({
    mutationFn: async () => {
      if (!logoUrl) throw new Error("Não há logo enviado ainda");
      const path = decodeURIComponent(new URL(logoUrl).pathname.split("/banners/")[1]);
      const { data: blob, error: downloadError } = await supabase.storage.from("banners").download(path);
      if (downloadError || !blob) throw new Error(downloadError?.message || "Não foi possível descarregar o logo atual");
      const { error: updateError } = await supabase.storage.from("banners").update(path, blob, {
        cacheControl: "2592000",
        contentType: blob.type,
      });
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => toast.success("Cache do logo otimizada"),
    onError: (e: any) => toast.error(e.message),
  });

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
          {logoUrl && (
            <button
              onClick={() => refreshLogoCache.mutate()}
              disabled={refreshLogoCache.isPending}
              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              {refreshLogoCache.isPending ? "A otimizar..." : "Otimizar cache (1x)"}
            </button>
          )}
        </div>
      </div>

      <FeatureLeiloesSection />

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
              {s.name} {s.is_verified ? "✅" : ""} ({s.type === "company" ? "Empresa" : s.type === "dropship" ? "Afiliado" : "Vendedor"})
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
