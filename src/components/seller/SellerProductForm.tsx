// STORAGE: Cloudflare R2 (uploadToR2)
// Para reverter para Supabase Storage, trocar uploadToR2() por:
//   supabase.storage.from(STORAGE_BUCKETS.products).upload(path, file)
//   supabase.storage.from(STORAGE_BUCKETS.products).getPublicUrl(path)

import { uploadToR2 } from "@/lib/r2";

const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  setUploading(true);
  setPhotoError(false);
  try {
    for (const file of Array.from(files)) {
      const folder = type === "video" ? "produtos/videos" : "produtos/imagens";
      const url = await uploadToR2(file, folder);
      setMedia(prev => [...prev, { url, type, is_cover: prev.length === 0, sort_order: prev.length }]);
    }
  } catch (err: any) {
    console.error("Upload error:", err.message);
  }
  setUploading(false);
  e.target.value = "";
};

const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, tempId: string) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploadingVariantIdx(tempId);
  try {
    const url = await uploadToR2(file, "produtos/variantes");
    setVariants(prev => prev.map(v => v._tempId === tempId ? { ...v, image_url: url } : v));
  } catch (err: any) {
    console.error("Variant image upload error:", err.message);
  }
  setUploadingVariantIdx(null);
  e.target.value = "";
};
