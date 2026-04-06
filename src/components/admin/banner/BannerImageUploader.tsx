import { useState } from "react";
import { Upload, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { toast } from "sonner";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

const BannerImageUploader = ({ images, onChange, maxImages = 10 }: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (images.length >= maxImages) {
      toast.error(`Máximo de ${maxImages} imagens`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.banners).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.banners).getPublicUrl(path);
      onChange([...images, data.publicUrl]);
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    }
    setUploading(false);
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground mb-1.5 block">
        Imagens ({images.length}/{maxImages})
      </label>
      
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
              <img src={url} alt={`Img ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => remove(i)}
                className="absolute top-0.5 right-0.5 bg-destructive/80 text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-0.5 left-0.5 bg-background/70 text-[9px] font-bold px-1 rounded">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-accent text-foreground border border-border w-fit">
        <Upload className="w-3.5 h-3.5" /> {uploading ? "Enviando..." : "Adicionar Imagem"}
        <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
};

export default BannerImageUploader;
