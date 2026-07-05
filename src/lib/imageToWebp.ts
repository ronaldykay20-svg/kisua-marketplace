/**
 * Converte um File de imagem para WebP antes do upload para o Supabase.
 * - Ignora vídeos (passam sem alteração).
 * - Ignora GIFs (para não perder a animação).
 * - Se algo falhar (ex: browser antigo sem suporte a WebP), devolve o
 *   ficheiro original em vez de bloquear o upload.
 * - Pela spec do canvas.toBlob, se o navegador não conseguir codificar em
 *   WebP ele devolve PNG *silenciosamente*, sem erro. Por isso confirmamos
 *   sempre o tipo real do blob devolvido antes de nomear o ficheiro — nunca
 *   assumimos "pedi WebP, logo recebi WebP". Isto evita ficheiros com
 *   extensão .webp mas conteúdo GIF/PNG por baixo.
 *
 * @param file      Ficheiro de imagem original
 * @param quality   Qualidade da compressão WebP (0 a 1). 0.8 é um bom equilíbrio.
 * @param maxWidth  Largura máxima em px. Redimensiona mantendo a proporção.
 */
const EXT_BY_MIME: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function extFromFile(file: File): string {
  return file.name.split(".").pop() || "bin";
}

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
          // Confirma o tipo real devolvido pelo navegador — pode não ser
          // WebP se o browser não suportar essa codificação (fallback
          // silencioso para PNG, definido na spec do toBlob).
          const realExt = EXT_BY_MIME[blob.type] ?? extFromFile(file);
          const newName = file.name.replace(/\.[^/.]+$/, `.${realExt}`);
          resolve(
            new File([blob], newName, {
              type: blob.type,
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

/**
 * Extensão real do ficheiro devolvido por convertToWebP — usar isto em vez
 * de assumir "webp" ao montar o caminho de upload, exactamente para cobrir
 * os casos (GIF, fallback do browser) em que a conversão não aconteceu.
 */
export function getFileExtension(file: File): string {
  return extFromFile(file);
}
