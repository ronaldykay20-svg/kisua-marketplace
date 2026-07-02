/**
 * Converte um File de imagem para WebP antes do upload para o Supabase.
 * - Ignora vídeos (passam sem alteração).
 * - Ignora GIFs (para não perder a animação).
 * - Se algo falhar (ex: browser antigo sem suporte a WebP), devolve o
 *   ficheiro original em vez de bloquear o upload.
 *
 * @param file      Ficheiro de imagem original
 * @param quality   Qualidade da compressão WebP (0 a 1). 0.8 é um bom equilíbrio.
 * @param maxWidth  Largura máxima em px. Redimensiona mantendo a proporção.
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1600
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.[^/.]+$/, ".webp");
          resolve(
            new File([blob], newName, {
              type: "image/webp",
              lastModified: Date.now(),
            })
          );
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => resolve(file);
    reader.onerror = () => resolve(file);

    reader.readAsDataURL(file);
  });
}
