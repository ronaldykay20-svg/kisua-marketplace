import { useState, useRef } from "react";
import {
  Megaphone, Plus, Trash2, CheckCircle, Upload, X,
  Play, Image as ImageIcon, Building2, Store, ShoppingBag,
  Gavel, TrendingUp, Users, Eye, EyeOff, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Tipos de anúncio disponíveis ────────────────────────────────────────────
const AD_TYPES = [
  { value: "banner",           label: "Banner (imagem/vídeo)",    icon: ImageIcon,   desc: "Upload direto de imagem ou vídeo" },
  { value: "empresa",          label: "Empresa patrocinada",       icon: Building2,   desc: "Mostra foto de capa + info da empresa" },
  { value: "vendedor",         label: "Vendedor patrocinado",      icon: Store,       desc: "Card do vendedor com produtos" },
  { value: "produto",          label: "Produto patrocinado",       icon: ShoppingBag, desc: "Produto específico em destaque" },
  { value: "leilao",           label: "Leilão em destaque",        icon: Gavel,       desc: "Produto em leilão ativo" },
  { value: "mais_vendidos",    label: "Mais vendidos",             icon: TrendingUp,  desc: "Carrossel automático de top produtos" },
  { value: "vendedores_top",   label: "Vendedores mais seguidos",  icon: Users,       desc: "Carrossel dos vendedores em destaque" },
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

// ─── Formulário de criação ───────────────────────────────────────────────────
const AdForm = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"type" | "details">("type");
  const [adType, setAdType] = useState<AdType>("banner");
  const [title, setTitle] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [refId, setRefId] = useState(""); // ID de empresa, vendedor, produto ou leilão
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Buscar entidades para selecionar
  const needsEntity = ["empresa", "vendedor", "produto", "leilao"].includes(adType);

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
        const ext = file.name.split(".").pop();
        const isVideo = file.type.startsWith("video/");
        mediaType = isVideo ? "video" : "image";
        const path = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await (supabase as any).storage.from("ads").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = (supabase as any).storage.from("ads").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("ads").insert({
        type: adType,
        title: title || null,
        media_url: mediaUrl,
        media_type: mediaType,
        destination_url: destinationUrl || null,
        ref_id: refId || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_ads"] });
      toast.success("Anúncio criado com sucesso!");
      onClose();
    },
    onError: (e: any) => { toast.error(e.message); setUploading(false); },
    onSettled: () => setUploading(false),
  });

  const needsMedia = adType === "banner";
  const autoTypes: AdType[] = ["mais_vendidos", "vendedores_top"];
  const isAuto = autoTypes.includes(adType);
  const canSubmit = isAuto
    ? true
    : needsEntity
      ? !!refId
      : needsMedia
        ? !!file
        : true;

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
                <button
                  key={t.value}
                  onClick={() => setAdType(t.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left ${selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"}`}
                >
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
          <button
            onClick={() => setStep("details")}
            className="w-full mt-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
          >
            Continuar →
          </button>
        </>
      )}

      {step === "details" && (
        <>
          <button onClick={() => setStep("type")} className="text-xs text-primary mb-3 flex items-center gap-1">← Mudar tipo</button>

          {/* Título opcional */}
          <input
            placeholder="Título do anúncio (opcional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground mb-3"
          />

          {/* Upload de media (banners) */}
          {needsMedia && (
            <div className="mb-3">
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border mb-2">
                  {file?.type.startsWith("video/") ? (
                    <video src={preview} className="w-full max-h-40 object-cover" controls />
                  ) : (
                    <img src={preview} alt="Preview" className="w-full max-h-40 object-cover" />
                  )}
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs font-bold text-foreground">Clique para fazer upload</p>
                  <p className="text-[10px] text-muted-foreground">Imagem (JPG, PNG, WebP) ou vídeo (MP4)</p>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* Seleção de entidade */}
          {needsEntity && (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-muted-foreground mb-2">
                Selecionar {adType === "empresa" ? "empresa" : adType === "vendedor" ? "vendedor" : adType === "leilao" ? "leilão" : "produto"}
              </p>
              {entities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {entities.map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => setRefId(e.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition text-left ${refId === e.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                    >
                      {e.image ? (
                        <img src={e.image} alt={e.label} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs font-bold text-foreground truncate">{e.label}</p>
                      {refId === e.id && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auto types info */}
          {isAuto && (
            <div className="mb-3 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
              {adType === "mais_vendidos"
                ? "🔥 Mostra automaticamente os produtos mais vendidos da plataforma em carrossel."
                : "⭐ Mostra automaticamente os vendedores com mais seguidores em carrossel."}
            </div>
          )}

          {/* URL de destino opcional */}
          {!isAuto && (
            <input
              placeholder="URL de destino ao clicar (opcional)"
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground mb-3"
            />
          )}

          <button
            onClick={() => uploadAndCreate.mutate()}
            disabled={!canSubmit || uploadAndCreate.isPending || uploading}
            className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading || uploadAndCreate.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> A publicar...</> : "Publicar anúncio"}
          </button>
        </>
      )}
    </div>
  );
};

// ─── Tab principal ───────────────────────────────────────────────────────────
const AdminAdsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin_ads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_ads"] });
      toast.success("Anúncio removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = {
    total: ads.length,
    active: ads.filter((a: any) => a.is_active).length,
    inactive: ads.filter((a: any) => !a.is_active).length,
  };

  const getTypeInfo = (type: AdType) => AD_TYPES.find(t => t.value === type) || AD_TYPES[0];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-lg font-black text-primary">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-lg font-black text-green-500">{stats.active}</p>
          <p className="text-[10px] text-muted-foreground">Ativos</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/50 p-3 text-center">
          <p className="text-lg font-black text-muted-foreground">{stats.inactive}</p>
          <p className="text-[10px] text-muted-foreground">Inativos</p>
        </div>
      </div>

      {/* Botão criar */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo anúncio
        </button>
      )}

      {/* Formulário */}
      {showForm && <AdForm onClose={() => setShowForm(false)} />}

      {/* Lista */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

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
            <div
              key={ad.id}
              className={`bg-card rounded-xl border border-border overflow-hidden transition ${!ad.is_active ? "opacity-60" : ""}`}
            >
              {/* Media preview */}
              {ad.media_url && (
                <div className="relative w-full h-28 bg-muted">
                  {ad.media_type === "video" ? (
                    <video src={ad.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={ad.media_url} alt={ad.title || "Anúncio"} className="w-full h-full object-cover" />
                  )}
                  {ad.media_type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${colorClass}`}>
                      <Icon className="w-3 h-3" />
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleAd.mutate({ id: ad.id, active: !ad.is_active })}
                      className={`p-1.5 rounded-lg transition ${ad.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}
                      title={ad.is_active ? "Desativar" : "Ativar"}
                    >
                      {ad.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteAd.mutate({ id: ad.id, mediaUrl: ad.media_url })}
                      className="p-1.5 rounded-lg text-destructive bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export default AdminAdsTab;
