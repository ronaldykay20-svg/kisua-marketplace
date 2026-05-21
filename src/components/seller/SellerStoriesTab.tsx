import { useState, useRef } from "react";
import { Video, Upload, Link2, Trash2, Eye, RefreshCw, Play, CheckCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  sellerId: string;
}

type UploadStep = "idle" | "file_selected" | "choosing_product" | "uploading";

const SellerStoriesTab = ({ sellerId }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [linkedProductId, setLinkedProductId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // Stories list — tabela: seller_stories, campo: image_url
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

  // Step 1: file selected
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo demasiado grande (máx. 50MB)");
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

  // Step 3: publish — bucket: videos, campo: image_url, is_active: true
  const handlePublish = async () => {
    if (!selectedFile) return;
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

  // Republicar: clona o story existente como novo
  const republishStory = useMutation({
    mutationFn: async (story: any) => {
      const { error } = await supabase.from("seller_stories").insert({
        seller_id: sellerId,
        image_url: story.image_url,
        product_id: story.product_id || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller_stories", sellerId] });
      toast.success("Story republicado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  return (
    <div className="space-y-4">

      {/* ── Upload Card ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Publicar Story em Vídeo</p>
            <p className="text-[10px] text-muted-foreground">MP4, MOV, WebM · máx. 50MB</p>
          </div>
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

          {/* STEP: idle — escolher ficheiro */}
          {step === "idle" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground">Selecionar Vídeo</p>
                <p className="text-[10px] text-muted-foreground">Toca para escolher da galeria</p>
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

      {/* ── Stories List ── */}
      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Play className="w-4 h-4" /> Meus Stories ({stories.length})
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
            <div key={s.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Thumbnail */}
              <div className="aspect-[9/14] bg-muted relative flex items-center justify-center">
                {s.image_url ? (
                  <video
                    src={s.image_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <Video className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {s.views_count ?? 0}
                  </span>
                  <span>
                    {new Date(s.created_at).toLocaleDateString("pt-AO")}
                  </span>
                </div>
                {s.products?.title && (
                  <p className="text-[9px] text-primary font-bold truncate flex items-center gap-1">
                    🔗 {s.products.title}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-1 pt-0.5">
                  <button
                    onClick={() => republishStory.mutate(s)}
                    disabled={republishStory.isPending}
                    title="Republicar"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border text-[10px] font-bold text-foreground hover:bg-accent transition-all"
                  >
                    <RefreshCw className="w-3 h-3" /> Republicar
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
