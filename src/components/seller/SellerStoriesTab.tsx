import { useState, useRef } from "react";
import { Upload, Trash2, Eye, Video, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  sellerId: string;
}

const SellerStoriesTab = ({ sellerId }: Props) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");

  // Seller's stories
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

  const uploadStory = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo demasiado grande (máx. 50MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `stories/${sellerId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("videos")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);

      const { error: insertErr } = await supabase.from("seller_stories").insert({
        seller_id: sellerId,
        image_url: urlData.publicUrl,
        product_id: selectedProduct || null,
        is_active: true,
      });
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ["seller_stories", sellerId] });
      toast.success("Story publicado!");
      setSelectedProduct("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
    setUploading(false);
  };

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

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" /> Publicar Story em Vídeo
        </h3>

        <div className="space-y-3">
          {/* Product selector */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">
              <Link2 className="w-3 h-3 inline mr-1" />
              Vincular a produto (opcional)
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
            >
              <option value="">Nenhum produto</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {Number(p.price).toLocaleString("pt-AO")} Kz
                </option>
              ))}
            </select>
          </div>

          {/* Upload button */}
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold cursor-pointer bg-primary text-primary-foreground w-fit">
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando vídeo...</>
            ) : (
              <><Upload className="w-4 h-4" /> Enviar Vídeo</>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadStory(e.target.files[0])}
            />
          </label>
          <p className="text-[10px] text-muted-foreground">Máximo 50MB. Formatos: MP4, MOV, WebM</p>
        </div>
      </div>

      {/* Stories list */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          Meus Stories ({stories.length})
        </h3>

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stories.map((s: any) => (
            <div key={s.id} className="bg-card rounded-xl border border-border overflow-hidden group relative">
              <div className="aspect-[9/14] bg-muted">
                <video
                  src={s.image_url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Eye className="w-3 h-3" /> {s.views_count || 0}
                  </div>
                  <button
                    onClick={() => deleteStory.mutate(s.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {s.products && (
                  <p className="text-[9px] text-primary font-bold mt-1 truncate">
                    🔗 {s.products.title}
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {new Date(s.created_at).toLocaleDateString("pt-AO")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && stories.length === 0 && (
          <p className="text-center py-8 text-sm text-muted-foreground">
            Nenhum story publicado. Publique o primeiro!
          </p>
        )}
      </div>
    </div>
  );
};

export default SellerStoriesTab;
