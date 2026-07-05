import { useState, useRef } from "react";
import { Shield, Users, Search, Plus, Trash2, Crown, Building2, Store, CheckCircle, XCircle, ShieldCheck, UserCheck, UsersRound, FolderTree, ImageIcon, ShoppingBag, Settings, Star, Gavel, Upload, Eye, EyeOff, Copy, Megaphone, Play, TrendingUp, Users as UsersIcon, X, Loader2, Truck, Banknote, Ticket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminCompanyMembersModal from "@/components/admin/AdminCompanyMembersModal";
import AdminCompanyCard from "@/components/admin/AdminCompanyCard";
import AdminCategoriesTab from "@/components/admin/AdminCategoriesTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import AdminBannersTab from "@/components/admin/AdminBannersTab";
import AdminFreightTab from "@/components/admin/AdminFreightTab";
import AdminSuppliersTab from "@/components/admin/AdminSuppliersTab";
import AdminPaymentReviewTab from "@/components/admin/AdminPaymentReviewTab";
import CouponManagerTab from "@/components/coupons/CouponManagerTab";
import { toast } from "sonner";
import { convertToWebP } from "@/lib/imageToWebp";

const roleBadge: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: "Admin", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: Crown },
  moderator: { label: "Moderador", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Shield },
  user: { label: "Utilizador", color: "bg-primary/10 text-primary border-primary/20", icon: Users },
};

type Tab = "utilizadores" | "cargos" | "vendedores" | "empresas" | "pedidos" | "encomendas" | "categorias" | "banners" | "definicoes" | "leiloes" | "publicidade" | "frete" | "fornecedores" | "pagamentos" | "cupons";

const AD_TYPES = [
  { value: "banner",           label: "Banner (imagem/vídeo)",   icon: ImageIcon,   desc: "Upload direto de imagem ou vídeo" },
  { value: "empresa",          label: "Empresa patrocinada",      icon: Building2,   desc: "Mostra foto de capa + info da empresa" },
  { value: "vendedor",         label: "Vendedor patrocinado",     icon: Store,       desc: "Card do vendedor com produtos" },
  { value: "produto",          label: "Produto patrocinado",      icon: ShoppingBag, desc: "Produto específico em destaque" },
  { value: "leilao",           label: "Leilão em destaque",       icon: Gavel,       desc: "Produto em leilão ativo" },
  { value: "mais_vendidos",    label: "Mais vendidos",            icon: TrendingUp,  desc: "Carrossel automático de top produtos" },
  { value: "vendedores_top",   label: "Vendedores mais seguidos", icon: UsersIcon,   desc: "Carrossel dos vendedores em destaque" },
] as const;

type AdType = typeof AD_TYPES[number]["value"];

const TYPE_COLORS: Record<AdType, string> = {
  banner:         "bg-blue-500/10 text-blue-500 border-blue-500/20",
  empresa:        "bg-purple-500/10 text-purple-500 border-purple-500/20",
  vendedor:       "bg-amber-500/10 text-amber-500 border-amber-500/20",
  produto:        "bg-green-500/10 text-green-500 border-green-500/20",
  leilao:         "bg-red-500/10 text-red-500 border-red-500/20",
  mais_vendidos:  "bg-orange-500/10 text-orange-500 border-orange-500/20",
  vendedores_top: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const AdForm = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"type" | "details">("type");
  const [adType, setAdType] = useState<AdType>("banner");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [refId, setRefId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const needsEntity = ["empresa", "vendedor", "produto", "leilao"].includes(adType);
  const autoTypes: AdType[] = ["mais_vendidos", "vendedores_top"];
  const isAuto = autoTypes.includes(adType);
  const needsMedia = adType === "banner";

  const { data: entities = [] } = useQuery({
    queryKey: ["ad_entities", adType],
    queryFn: async () => {
      if (adType === "empresa") {
        const { data } = await (supabase as any).from("companies").select("id, name, cover_url, logo_url").eq("is_active", true).limit(30);
        return (data || []).map((e: any) => ({ id: e.id, label: e.name, image: e.cover_url || e.logo_url }));
      }
      if (adType === "vendedor") {
        const { data } = await (supabase as any).from("sellers").select("id, name, avatar_url").eq("is_active", true).limit(30);
        return (data || []).map((e: any) => ({ id: e.id, label: e.name, image: e.avatar_url }));
      }
      if (adType === "produto") {
        const { data } = await (supabase as any).from("products").select("id, title, image_url").eq("is_active", true).order("sales_count", { ascending: false }).limit(30);
        return (data || []).map((e: any) => ({ id: e.id, label: e.title, image: e.image_url }));
      }
      if (adType === "leilao") {
        const { data } = await (supabase as any).from("auctions").select("id, title, image_url").eq("status", "active").limit(30);
        return (data || []).map((e: any) => ({ id: e.id, label: e.title, image: e.image_url }));
      }
      return [];
    },
    enabled: needsEntity && step === "details",
  });

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const uploadAndCreate = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | null = null;
      if (file) {
        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";
        // Converte para WebP antes de enviar (só imagens; vídeos passam direto)
        const uploadFile = isVideo ? file : await convertToWebP(file, 0.8, 1600);
        const ext = isVideo ? file.name.split(".").pop() : "webp";
        const path = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage.from("ads").upload(path, uploadFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = (supabase as any).storage.from("ads").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }
      const { error } = await (supabase as any).from("ads").insert({
        type: adType, title: title || null, media_url: mediaUrl, media_type: mediaType,
        destination_url: destinationUrl || null, ref_id: refId || null, is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_ads"] }); toast.success("Anúncio criado com sucesso!"); onClose(); },
    onError: (e: any) => { toast.error(e.message); setUploading(false); },
    onSettled: () => setUploading(false),
  });

  const canSubmit = isAuto ? true : needsEntity ? !!refId : needsMedia ? !!file : true;

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground">Novo anúncio</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      {step === "type" && (
        <>
          <p className="text-xs text-muted-foreground mb-3">Que tipo de conteúdo quer promover?</p>
          <div className="space-y-2">
            {AD_TYPES.map(t => {
              const Icon = t.icon;
              const selected = adType === t.value;
              return (
                <button key={t.value} onClick={() => setAdType(t.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left ${selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${selected ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                  </div>
                  {selected && <CheckCircle className="w-4 h-4 text-primary ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep("details")} className="w-full mt-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl">Continuar →</button>
        </>
      )}

      {step === "details" && (
        <>
          <button onClick={() => setStep("type")} className="text-xs text-primary mb-3 flex items-center gap-1">← Mudar tipo</button>
          <input placeholder="Título do anúncio (opcional)" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground mb-3" />

          {needsMedia && (
            <div className="mb-3">
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border mb-2">
                  {file?.type.startsWith("video/") ? <video src={preview} className="w-full max-h-40 object-cover" controls /> : <img src={preview} alt="Preview" className="w-full max-h-40 object-cover" />}
                  <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs font-bold text-foreground">Clique para fazer upload</p>
                  <p className="text-[10px] text-muted-foreground">Imagem (JPG, PNG, WebP) ou vídeo (MP4)</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {needsEntity && (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-muted-foreground mb-2">
                Selecionar {adType === "empresa" ? "empresa" : adType === "vendedor" ? "vendedor" : adType === "leilao" ? "leilão" : "produto"}
              </p>
              {entities.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p> : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {entities.map((e: any) => (
                    <button key={e.id} onClick={() => setRefId(e.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${refId === e.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                      {e.image ? <img src={e.image} alt={e.label} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" /> : <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>}
                      <p className="text-xs font-bold text-foreground truncate">{e.label}</p>
                      {refId === e.id && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isAuto && (
            <div className="mb-3 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
              {adType === "mais_vendidos" ? "🔥 Mostra automaticamente os produtos mais vendidos da plataforma em carrossel." : "⭐ Mostra automaticamente os vendedores com mais seguidores em carrossel."}
            </div>
          )}

          {!isAuto && <input placeholder="URL de destino ao clicar (opcional)" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground mb-3" />}

          <button onClick={() => uploadAndCreate.mutate()} disabled={!canSubmit || uploadAndCreate.isPending || uploading}
            className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading || uploadAndCreate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> A publicar...</> : "Publicar anúncio"}
          </button>
        </>
      )}
    </div>
  );
};

const AdminAdsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin_ads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleAd = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("ads").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_ads"] }),
  });

  const deleteAd = useMutation({
    mutationFn: async ({ id, mediaUrl }: { id: string; mediaUrl: string | null }) => {
      if (mediaUrl) {
        const path = mediaUrl.split("/ads/")[1];
        if (path) await (supabase as any).storage.from("ads").remove([path]);
      }
      const { error } = await (supabase as any).from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_ads"] }); toast.success("Anúncio removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = { total: ads.length, active: ads.filter((a: any) => a.is_active).length, inactive: ads.filter((a: any) => !a.is_active).length };
  const getTypeInfo = (type: AdType) => AD_TYPES.find(t => t.value === type) || AD_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center"><p className="text-lg font-black text-primary">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center"><p className="text-lg font-black text-green-500">{stats.active}</p><p className="text-[10px] text-muted-foreground">Ativos</p></div>
        <div className="rounded-xl border border-border bg-muted/50 p-3 text-center"><p className="text-lg font-black text-muted-foreground">{stats.inactive}</p><p className="text-[10px] text-muted-foreground">Inativos</p></div>
      </div>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Novo anúncio
        </button>
      )}

      {showForm && <AdForm onClose={() => setShowForm(false)} />}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

      {!isLoading && ads.length === 0 && (
        <div className="text-center py-10">
          <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">Nenhum anúncio ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Crie o primeiro anúncio para começar</p>
        </div>
      )}

      <div className="space-y-3">
        {ads.map((ad: any) => {
          const typeInfo = getTypeInfo(ad.type as AdType);
          const Icon = typeInfo.icon;
          const colorClass = TYPE_COLORS[ad.type as AdType] || TYPE_COLORS.banner;
          return (
            <div key={ad.id} className={`bg-card rounded-xl border border-border overflow-hidden transition ${!ad.is_active ? "opacity-60" : ""}`}>
              {ad.media_url && (
                <div className="relative w-full h-28 bg-muted">
                  {ad.media_type === "video" ? <video src={ad.media_url} className="w-full h-full object-cover" muted /> : <img src={ad.media_url} alt={ad.title || "Anúncio"} className="w-full h-full object-cover" />}
                  {ad.media_type === "video" && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div></div>}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${colorClass}`}><Icon className="w-3 h-3" />{typeInfo.label}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggleAd.mutate({ id: ad.id, active: !ad.is_active })} className={`p-1.5 rounded-lg transition ${ad.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>
                      {ad.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteAd.mutate({ id: ad.id, mediaUrl: ad.media_url })} className="p-1.5 rounded-lg text-destructive bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {ad.title && <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  {ad.ref_id && <span>ID: {ad.ref_id.slice(0, 8)}…</span>}
                  {ad.destination_url && <span className="truncate">→ {ad.destination_url.replace(/^https?:\/\//, "").slice(0, 30)}</span>}
                  <span className="ml-auto">{new Date(ad.created_at).toLocaleDateString("pt-AO")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminLeiloesTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [proofModal, setProofModal] = useState<any>(null);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodForm, setMethodForm] = useState({ type: "xpress", label: "", value: "", holder: "" });

  const { data: heroImage } = useQuery({
    queryKey: ["auction_hero_image"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_hero_image")
        .select("image_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const uploadHero = async (file: File) => {
    setHeroUploading(true);
    try {
      // Converte para WebP antes de enviar
      const webpFile = await convertToWebP(file, 0.8, 1600);
      const path = `hero-${Date.now()}.webp`;
      const { error: upErr } = await (supabase as any).storage
        .from("auction-hero")
        .upload(path, webpFile, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = (supabase as any).storage
        .from("auction-hero")
        .getPublicUrl(path);

      const { error } = await (supabase as any)
        .from("auction_hero_image")
        .upsert(
          { image_url: urlData.publicUrl, updated_by: user!.id },
          { onConflict: "id" }
        );
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["auction_hero_image"] });
      toast.success("Imagem hero atualizada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setHeroUploading(false);
    }
  };

  const { data: proofs = [] } = useQuery({
    queryKey: ["admin_bid_proofs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("auction_bid_proofs")
        .select("*, profiles:user_id(full_name), auctions:auction_id(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["auction_payment_methods"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("auction_payment_methods")
        .select("*")
        .order("type");
      return data || [];
    },
  });

  const addMethod = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .insert({ ...methodForm, label: methodForm.label || methodForm.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Método adicionado!");
      setMethodForm({ type: "xpress", label: "", value: "", holder: "" });
      setShowMethodForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMethod = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] }),
  });

  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("auction_payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auction_payment_methods"] });
      toast.success("Removido");
    },
  });

  const reviewProof = useMutation({
    mutationFn: async ({ id, status, auctionId, userId, amount }: any) => {
      const { error } = await (supabase as any)
        .from("auction_bid_proofs")
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        await (supabase as any)
          .from("auction_bids")
          .insert({ auction_id: auctionId, user_id: userId, amount });
        await (supabase as any)
          .from("auctions")
          .update({ current_bid: amount })
          .eq("id", auctionId)
          .lt("current_bid", amount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_bid_proofs"] });
      queryClient.invalidateQueries({ queryKey: ["public_auctions"] });
      queryClient.invalidateQueries({ queryKey: ["auction_bids"] });
      setProofModal(null);
      toast.success("Comprovante processado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getProofUrl = async (path: string) => {
    const { data } = await (supabase as any).storage
      .from("bid-proofs")
      .createSignedUrl(path, 60);
    return data?.signedUrl;
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> Imagem Hero do Leilão
          </h2>
          <button
            onClick={() => heroFileRef.current?.click()}
            disabled={heroUploading}
            className="text-xs font-bold text-primary flex items-center gap-1 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {heroUploading ? "A enviar..." : heroImage?.image_url ? "Trocar imagem" : "Fazer upload"}
          </button>
          <input
            ref={heroFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadHero(f);
              e.target.value = "";
            }}
          />
        </div>

        {heroImage?.image_url ? (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={heroImage.image_url}
              alt="Hero do leilão"
              className="w-full object-cover"
              style={{ maxHeight: 200 }}
            />
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[10px] text-white font-bold"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              Imagem actual — clique em "Trocar imagem" para substituir
            </div>
          </div>
        ) : (
          <button
            onClick={() => heroFileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs font-bold text-foreground">Nenhuma imagem definida</p>
            <p className="text-[10px] text-muted-foreground">
              Clique para fazer upload (JPG, PNG, WebP)
            </p>
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Métodos de Pagamento
          </h2>
          <button
            onClick={() => setShowMethodForm(!showMethodForm)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>
        {showMethodForm && (
          <div className="space-y-2 mb-3 p-3 bg-muted rounded-lg">
            <select
              value={methodForm.type}
              onChange={e => setMethodForm({ ...methodForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            >
              <option value="xpress">Xpress</option>
              <option value="iban">IBAN / TPA</option>
              <option value="outro">Outro</option>
            </select>
            {methodForm.type === "outro" && (
              <input
                placeholder="Nome do método"
                value={methodForm.label}
                onChange={e => setMethodForm({ ...methodForm, label: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
              />
            )}
            <input
              placeholder={
                methodForm.type === "xpress"
                  ? "Número Xpress"
                  : methodForm.type === "iban"
                  ? "IBAN"
                  : "Valor/Número"
              }
              value={methodForm.value}
              onChange={e => setMethodForm({ ...methodForm, value: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <input
              placeholder="Titular da conta"
              value={methodForm.holder}
              onChange={e => setMethodForm({ ...methodForm, holder: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
            />
            <button
              onClick={() => addMethod.mutate()}
              disabled={!methodForm.value || addMethod.isPending}
              className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {addMethod.isPending ? "A guardar..." : "Guardar"}
            </button>
          </div>
        )}
        <div className="space-y-2">
          {methods.map((m: any) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                m.is_active ? "border-border bg-background" : "border-border bg-muted opacity-60"
              }`}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {m.type === "xpress" ? "Xpress" : m.type === "iban" ? "IBAN" : m.label}
                </p>
                <p className="text-sm font-bold text-foreground">{m.value}</p>
                {m.holder && <p className="text-[10px] text-muted-foreground">{m.holder}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleMethod.mutate({ id: m.id, active: !m.is_active })}
                  className={`p-1.5 rounded-lg ${
                    m.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMethod.mutate(m.id)}
                  className="p-1.5 rounded-lg text-destructive bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum método configurado.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Pendentes",  status: "pending",  color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
          { label: "Aprovados",  status: "approved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
          { label: "Rejeitados", status: "rejected", color: "bg-red-500/10 text-red-500 border-red-500/20" },
        ].map(s => (
          <div key={s.status} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">
              {proofs.filter((p: any) => p.status === s.status).length}
            </p>
            <p className="text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {proofs.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">
            Nenhum comprovante submetido.
          </p>
        )}
        {proofs.map((p: any) => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {p.profiles?.full_name || "Anónimo"}
                </p>
                <p className="text-[10px] text-muted-foreground">{p.auctions?.title || "—"}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === "pending"
                    ? "bg-amber-500/10 text-amber-500"
                    : p.status === "approved"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {p.status === "pending"
                  ? "Pendente"
                  : p.status === "approved"
                  ? "Aprovado"
                  : "Rejeitado"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>
                Lance:{" "}
                <span className="font-bold text-foreground">
                  {Number(p.amount).toLocaleString("pt-AO")} Kz
                </span>
              </span>
              {p.reference && <span>Ref: {p.reference}</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const url = await getProofUrl(p.proof_url);
                  setProofModal({ ...p, signedUrl: url });
                }}
                className="flex-1 py-1.5 bg-muted text-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Ver
              </button>
              {p.status === "pending" && (
                <>
                  <button
                    onClick={() =>
                      reviewProof.mutate({
                        id: p.id,
                        status: "approved",
                        auctionId: p.auction_id,
                        userId: p.user_id,
                        amount: p.amount,
                      })
                    }
                    className="flex-1 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() =>
                      reviewProof.mutate({
                        id: p.id,
                        status: "rejected",
                        auctionId: p.auction_id,
                        userId: p.user_id,
                        amount: p.amount,
                      })
                    }
                    className="flex-1 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setProofModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl p-4 w-[92vw] max-w-sm shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-foreground mb-3">Comprovante</h3>
            <div className="text-xs space-y-1 mb-3">
              <p className="text-muted-foreground">
                Utilizador:{" "}
                <span className="font-bold text-foreground">
                  {proofModal.profiles?.full_name || "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Leilão:{" "}
                <span className="font-bold text-foreground">
                  {proofModal.auctions?.title || "—"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Valor:{" "}
                <span className="font-bold text-green-500">
                  {Number(proofModal.amount).toLocaleString("pt-AO")} Kz
                </span>
              </p>
              {proofModal.reference && (
                <p className="text-muted-foreground">
                  Ref:{" "}
                  <span className="font-bold text-foreground">{proofModal.reference}</span>
                </p>
              )}
            </div>
            {proofModal.signedUrl && (
              <img
                src={proofModal.signedUrl}
                alt="Comprovante"
                className="w-full rounded-lg mb-3 max-h-64 object-contain bg-muted"
              />
            )}
            <button
              onClick={() => setProofModal(null)}
              className="w-full py-2 bg-muted text-foreground text-xs font-bold rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("utilizadores");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [membersModal, setMembersModal] = useState<{ id: string; name: string } | null>(null);

  const { data: allRoles = [], isLoading } = useQuery({
    queryKey: ["admin_all_roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("*, profiles(full_name)")
        .order("role");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin_profiles", searchTerm],
    queryFn: async () => {
      let q = (supabase as any).from("profiles").select("id, full_name").limit(20);
      if (searchTerm) q = q.ilike("full_name", `%${searchTerm}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "cargos",
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo atribuído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await (supabase as any).from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_all_roles"] });
      toast.success("Cargo removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["admin_sellers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "vendedores",
  });

  const toggleVerifySeller = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase as any)
        .from("sellers")
        .update({ is_verified: verified })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Vendedor atualizado");
    },
  });

  const toggleActiveSeller = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("sellers")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Estado alterado");
    },
  });

  const toggleFeaturedSeller = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await (supabase as any)
        .from("sellers")
        .update({ is_featured: featured } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      queryClient.invalidateQueries({ queryKey: ["featured_sellers_home"] });
      toast.success("Destaque atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin_companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && tab === "empresas",
  });

  const [companyForm, setCompanyForm] = useState({ name: "", slug: "", description: "" });
  const [showCompanyForm, setShowCompanyForm] = useState(false);

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("companies")
        .insert({ ...companyForm, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success("Empresa criada");
      setCompanyForm({ name: "", slug: "", description: "" });
      setShowCompanyForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVerifyCompany = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await (supabase as any)
        .from("companies")
        .update({ is_verified: verified })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_companies"] });
      toast.success("Empresa atualizada");
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["admin_seller_applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seller_applications")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && tab === "pedidos",
  });

  const reviewApplication = useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
      name,
    }: {
      id: string;
      status: string;
      userId: string;
      name: string;
    }) => {
      const { error } = await (supabase as any)
        .from("seller_applications")
        .update({
          status,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const slug = name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        await (supabase as any)
          .from("sellers")
          .insert({ name, slug, user_id: userId, type: "individual", is_active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_seller_applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_sellers"] });
      toast.success("Pedido processado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = allRoles.reduce((acc: any, r: any) => {
    acc[r.role] = acc[r.role] || [];
    acc[r.role].push(r);
    return acc;
  }, {});

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "utilizadores", label: "Utilizadores", icon: UsersRound },
    { key: "categorias",   label: "Categorias",   icon: FolderTree },
    { key: "cargos",       label: "Cargos",        icon: Crown },
    { key: "vendedores",   label: "Vendedores",    icon: Store },
    { key: "empresas",     label: "Empresas",      icon: Building2 },
    { key: "encomendas",   label: "Encomendas",    icon: ShoppingBag },
    { key: "pagamentos",   label: "Pagamentos",    icon: Banknote },
    { key: "banners",      label: "Banners",       icon: ImageIcon },
    { key: "publicidade",  label: "Publicidade",   icon: Megaphone },
    { key: "frete",        label: "Frete",         icon: Truck },
    { key: "fornecedores", label: "Fornecedores",  icon: Building2 },
    { key: "cupons",       label: "Cupons",        icon: Ticket },
    { key: "pedidos",      label: "Candidaturas",  icon: UserCheck },
    { key: "leiloes",      label: "Leilões",       icon: Gavel },
    { key: "definicoes",   label: "Definições",    icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Administração</h1>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap border ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "utilizadores" && <AdminUsersTab />}
        {tab === "categorias"   && <AdminCategoriesTab />}
        {tab === "publicidade"  && <AdminAdsTab />}
        {tab === "encomendas"   && <AdminOrdersTab />}
        {tab === "pagamentos"   && <AdminPaymentReviewTab />}
        {tab === "banners"      && <AdminBannersTab />}
        {tab === "definicoes"   && <AdminSettingsTab />}
        {tab === "leiloes"      && <AdminLeiloesTab />}
        {tab === "frete"        && <AdminFreightTab />}
        {tab === "fornecedores" && <AdminSuppliersTab />}
        {tab === "cupons"       && <CouponManagerTab scope="platform" ownerId={null} heading="Cupons da Plataforma" />}

        {tab === "cargos" && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["admin", "moderator", "user"] as const).map(role => {
                const info = roleBadge[role];
                return (
                  <div key={role} className={`rounded-xl border p-3 text-center ${info.color}`}>
                    <info.icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-lg font-bold">{grouped[role]?.length || 0}</p>
                    <p className="text-[10px]">{info.label}s</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-card rounded-xl border border-border p-4 mb-4">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Atribuir Cargo
              </h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Procurar utilizador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
              </div>
              {searchTerm && profiles.length > 0 && (
                <div className="bg-muted rounded-lg border border-border mb-3 max-h-32 overflow-y-auto">
                  {profiles.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedUserId(p.id);
                        setSearchTerm(p.full_name || p.id.slice(0, 8));
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition ${
                        selectedUserId === p.id ? "bg-accent" : ""
                      }`}
                    >
                      {p.full_name || p.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && (
                <div className="flex gap-2">
                  {(["admin", "moderator", "user"] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => addRole.mutate({ userId: selectedUserId, role })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border ${roleBadge[role].color}`}
                    >
                      {roleBadge[role].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(["admin", "moderator", "user"] as const).map(role => {
              const items = grouped[role] || [];
              if (!items.length) return null;
              const info = roleBadge[role];
              return (
                <div key={role} className="mb-4">
                  <h3
                    className={`text-sm font-bold mb-2 flex items-center gap-2 ${
                      info.color.split(" ")[1]
                    }`}
                  >
                    <info.icon className="w-4 h-4" /> {info.label}s ({items.length})
                  </h3>
                  <div className="bg-card rounded-xl border border-border divide-y divide-border">
                    {items.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {r.profiles?.full_name || r.user_id.slice(0, 8)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.user_id.slice(0, 12)}...
                          </p>
                        </div>
                        {r.user_id !== user?.id && (
                          <button
                            onClick={() => removeRole.mutate(r.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "vendedores" && (
          <div className="space-y-2">
            {sellers.map((s: any) => (
              <div
                key={s.id}
                className={`bg-card rounded-xl border border-border p-3 ${
                  !s.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-1">
                        {s.name}{" "}
                        {s.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.type} • {s.total_sales || 0} vendas
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        toggleFeaturedSeller.mutate({ id: s.id, featured: !s.is_featured })
                      }
                      className={`p-2 rounded-lg text-xs ${
                        s.is_featured
                          ? "text-secondary bg-secondary/10"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${s.is_featured ? "fill-secondary" : ""}`} />
                    </button>
                    <button
                      onClick={() =>
                        toggleVerifySeller.mutate({ id: s.id, verified: !s.is_verified })
                      }
                      className={`p-2 rounded-lg text-xs ${
                        s.is_verified
                          ? "text-blue-500 hover:bg-blue-500/10"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        toggleActiveSeller.mutate({ id: s.id, active: !s.is_active })
                      }
                      className={`p-2 rounded-lg text-xs ${
                        s.is_active
                          ? "text-green-500 hover:bg-green-500/10"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s.is_active ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sellers.length === 0 && (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Nenhum vendedor registado.
              </p>
            )}
          </div>
        )}

        {tab === "empresas" && (
          <>
            <button
              onClick={() => setShowCompanyForm(!showCompanyForm)}
              className="w-full mb-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nova Empresa
            </button>
            {showCompanyForm && (
              <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-3">
                <input
                  placeholder="Nome da empresa"
                  value={companyForm.name}
                  onChange={e =>
                    setCompanyForm({
                      ...companyForm,
                      name: e.target.value,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
                <input
                  placeholder="Slug"
                  value={companyForm.slug}
                  onChange={e => setCompanyForm({ ...companyForm, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
                />
                <textarea
                  placeholder="Descrição"
                  value={companyForm.description}
                  onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground h-16 resize-none"
                />
                <button
                  onClick={() => createCompany.mutate()}
                  disabled={!companyForm.name || !companyForm.slug}
                  className="w-full py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg disabled:opacity-50"
                >
                  Criar Empresa
                </button>
              </div>
            )}
            <div className="space-y-2">
              {companies.map((c: any) => (
                <AdminCompanyCard
                  key={c.id}
                  company={c}
                  onMembers={() => setMembersModal({ id: c.id, name: c.name })}
                  onVerify={() => toggleVerifyCompany.mutate({ id: c.id, verified: !c.is_verified })}
                  queryClient={queryClient}
                />
              ))}
              {companies.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma empresa.</p>
              )}
            </div>
          </>
        )}

        {tab === "pedidos" && (
          <div className="space-y-2">
            {applications.map((a: any) => (
              <div key={a.id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(a.profiles as any)?.full_name} • {a.province || "—"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      a.status === "pending"
                        ? "bg-amber-500/10 text-amber-500"
                        : a.status === "approved"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {a.status === "pending"
                      ? "Pendente"
                      : a.status === "approved"
                      ? "Aprovado"
                      : "Rejeitado"}
                  </span>
                </div>
                {a.bio && (
                  <p className="text-xs text-muted-foreground mb-2">{a.bio}</p>
                )}
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        reviewApplication.mutate({
                          id: a.id,
                          status: "approved",
                          userId: a.user_id,
                          name: a.name,
                        })
                      }
                      className="flex-1 py-1.5 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() =>
                        reviewApplication.mutate({
                          id: a.id,
                          status: "rejected",
                          userId: a.user_id,
                          name: a.name,
                        })
                      }
                      className="flex-1 py-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            ))}
            {applications.length === 0 && (
              <p className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma candidatura de vendedor.
              </p>
            )}
          </div>
        )}

        {isLoading && tab === "cargos" && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {membersModal && (
        <AdminCompanyMembersModal
          companyId={membersModal.id}
          companyName={membersModal.name}
          onClose={() => setMembersModal(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
