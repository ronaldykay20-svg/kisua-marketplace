import { useState, useRef } from "react";
import { Video, Upload, Link2, Trash2, Eye, RefreshCw, Play, CheckCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  sellerId: string;
}

type UploadStep = "idle" | "file_selected" | "choosing_product" | "uploading";

const MAX_STORIES = 50;
const MAX_DURATION_SECONDS = 120; // 2 minutos

const SellerStoriesTab = ({ sellerId }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkedProductId, setLinkedProductId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Republicar: estado
  const [republishStoryData, setRepublishStoryData] = useState<any>(null);
  const [republishProductId, setRepublishProductId] = useState<string>("");
  const [republishing, setRepublishing] = useState(false);

  // Stories list
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["seller_stories", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_stories")
        .select("*, products(id, title, price)")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeStoriesCount = stories.filter((s: any) => s.is_active).length;
  const totalStoriesCount = stories.length;

  // Seller's products for linking
  const { data: products = [] } = useQuery({
    queryKey: ["seller_products_for_stories", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Verificar duração do vídeo
  const checkVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => reject(new Error("Não foi possível ler o vídeo"));
      video.src = URL.createObjectURL(file);
    });
  };

  // Step 1: file selected
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo demasiado grande (máx. 50MB)");
      return;
    }

    try {
      const duration = await checkVideoDuration(file);
      if (duration > MAX_DURATION_SECONDS) {
        toast.error(`O vídeo tem ${Math.round(duration)}s. Máximo permitido: 2 minutos.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    } catch {
      toast.error("Não foi possível verificar a duração do vídeo.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("file_selected");
  };

  // Step 2: go to product selection
  const handleContinueToProduct = () => {
    setStep("choosing_product");
  };

  // Step 3: publish
  const handlePublish = async () => {
    if (!selectedFile) return;

    // Verificar limite de 50 stories
    if (totalStoriesCount >= MAX_STORIES) {
      toast.error(`Tens ${totalStoriesCount} stories. Apaga antigos para publicar novos.`);
      setStep("choosing_product");
      return;
    }

    setStep("uploading");
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `stories/${sellerId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(path, selectedFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);

      const { error: insertError } = await supabase.from("seller_stories").insert({
        seller_id: sellerId,
        image_url: urlData.publicUrl,
        product_id: linkedProductId || null,
        is_active: true,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["seller_stories", sellerId] });
      toast.success("Story publicado!");
      resetForm();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
      setStep("choosing_product");
    } finally {
      setUploading(false);
    }
  };

  // Abrir modal de republicar
  const openRepublish = (story: any) => {
    setRepublishStoryData(story);
    setRepublishProductId(story.product_id || "");
  };

  // Confirmar republicar
  const handleRepublish = async () => {
    if (!republishStoryData) return;

    // Não republicar se já está activo
    if (republishStoryData.is_active) {
      toast.error("Este story já está activo.");
      setRepublishStoryData(null);
      return;
    }

    // Verificar limite
    if (totalStoriesCount >= MAX_STORIES) {
      toast.error(`Tens ${totalStoriesCount} stories. Apaga antigos para publicar novos.`);
      setRepublishStoryData(null);
      return;
    }

    setRepublishing(true);
    try {
      const { error } = await supabase.from("seller_stories").insert({
        seller_id: sellerId,
        image_url: republishStoryData.image_url,
        product_id: republishProductId || null,
        is_active: true,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["seller_stories", sellerId] });
      toast.success("Story republicado!");
      setRepublishStoryData(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRepublishing(false);
    }
  };

  // Apagar story (também do storage se possível)
  const deleteStory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seller_stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_stories", sellerId] });
      toast.success("Story removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setStep("idle");
    setSelectedFile(null);
    setPreviewUrl(null);
    setLinkedProductId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const atLimit = totalStoriesCount >= MAX_STORIES;

  return (
    <div className="space-y-4">

      {/* ── Aviso de limite ── */}
      {atLimit && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-bold">
            Atingiste o limite de {MAX_STORIES} stories. Apaga stories antigos para poderes publicar novos.
          </p>
        </div>
      )}

      {/* ── Upload Card ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Publicar Story em Vídeo</p>
            <p className="text-[10px] text-muted-foreground">MP4, MOV, WebM · máx. 50MB · máx. 2 minutos</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${atLimit ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
            {totalStoriesCount}/{MAX_STORIES}
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-4 pt-3 pb-1">
          {[
            { n: 1, label: "Vídeo" },
            { n: 2, label: "Produto" },
            { n: 3, label: "Publicar" },
          ].map((s, i) => {
            const done =
              (s.n === 1 && (step === "file_selected" || step === "choosing_product" || step === "uploading")) ||
              (s.n === 2 && (step === "choosing_product" || step === "uploading")) ||
              (s.n === 3 && step === "uploading");
            const active =
              (s.n === 1 && step === "idle") ||
              (s.n === 2 && step === "file_selected") ||
              (s.n === 3 && step === "choosing_product");
            return (
              <div key={s.n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary/20 text-primary border border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : s.n}
                  </div>
                  <span className={`text-[9px] mt-0.5 ${active ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className={`w-8 h-px mb-3 mx-1 ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4 pt-2 space-y-3">

          {/* STEP: idle */}
          {step === "idle" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={atLimit}
              />
              <button
                onClick={() => !atLimit && fileInputRef.current?.click()}
                disabled={atLimit}
                className={`w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-2 transition-all group ${
                  atLimit
                    ? "border-border opacity-40 cursor-not-allowed"
                    : "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {atLimit ? "Limite atingido" : "Selecionar Vídeo"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {atLimit ? "Apaga stories antigos primeiro" : "Toca para escolher da galeria"}
                </p>
              </button>
            </>
          )}

          {/* STEP: file selected — preview + continuar */}
          {step === "file_selected" && previewUrl && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-48 flex items-center justify-center">
                <video src={previewUrl} className="h-full w-auto max-w-full object-contain" controls />
                <button
                  onClick={resetForm}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white text-xs"
                >✕</button>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">📹 {selectedFile?.name}</p>
              <button
                onClick={handleContinueToProduct}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: choosing product */}
          {step === "choosing_product" && (
            <div className="space-y-3">
              {previewUrl && (
                <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-32 flex items-center justify-center">
                  <video src={previewUrl} className="h-full w-auto max-w-full object-contain" />
                </div>
              )}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  Vincular a produto (opcional)
                </label>
                <select
                  value={linkedProductId}
                  onChange={e => setLinkedProductId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Nenhum produto</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {Number(p.price).toLocaleString("pt-AO")} Kz
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("file_selected")}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-muted-foreground"
                >
                  Voltar
                </button>
                <button
                  onClick={handlePublish}
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Publicar
                </button>
              </div>
            </div>
          )}

          {/* STEP: uploading */}
          {step === "uploading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-bold text-foreground">A publicar story…</p>
              <p className="text-[10px] text-muted-foreground">Aguarda um momento</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Republicar ── */}
      {republishStoryData && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 pb-6 px-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" /> Republicar Story
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Podes alterar o produto vinculado antes de republicar.</p>
            </div>

            {/* Preview do vídeo */}
            {republishStoryData.image_url && (
              <div className="px-4 pt-3">
                <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-32 flex items-center justify-center">
                  <video
                    src={republishStoryData.image_url}
                    className="h-full w-auto max-w-full object-contain"
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
              </div>
            )}

            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  Produto vinculado (opcional)
                </label>
                <select
                  value={republishProductId}
                  onChange={e => setRepublishProductId(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Nenhum produto</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {Number(p.price).toLocaleString("pt-AO")} Kz
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRepublishStoryData(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRepublish}
                  disabled={republishing}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {republishing ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Republicar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stories List ── */}
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Play className="w-4 h-4" /> Meus Stories ({totalStoriesCount})
      </h2>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">A carregar…</div>
      ) : stories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum story publicado. Publique o primeiro!
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stories.map((s: any) => (
            <div
              key={s.id}
              className={`bg-card rounded-xl border overflow-hidden ${
                s.is_active ? "border-primary/40" : "border-border opacity-70"
              }`}
            >
              {/* Thumbnail — usa image_url directamente no <img> para thumbnail e <video> para preview */}
              <div className="aspect-[9/14] bg-muted relative">
                {s.image_url ? (
                  <>
                    {/* Poster via video element com preload=metadata */}
                    <video
                      src={s.image_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    {/* Badge activo/inactivo */}
                    <span className={`absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                      s.is_active
                        ? "bg-green-500 text-white"
                        : "bg-zinc-600 text-white"
                    }`}>
                      {s.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {s.views_count ?? 0}
                  </span>
                  <span>{new Date(s.created_at).toLocaleDateString("pt-AO")}</span>
                </div>
                {s.products?.title && (
                  <p className="text-[9px] text-primary font-bold truncate">
                    🔗 {s.products.title}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-0.5">
                  <button
                    onClick={() => openRepublish(s)}
                    disabled={s.is_active}
                    title={s.is_active ? "Já está activo" : "Republicar"}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      s.is_active
                        ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                        : "border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    {s.is_active ? "Activo" : "Republicar"}
                  </button>
                  <button
                    onClick={() => deleteStory.mutate(s.id)}
                    disabled={deleteStory.isPending}
                    title="Eliminar"
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerStoriesTab;
