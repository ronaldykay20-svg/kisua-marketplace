import { convertToWebP } from "@/lib/imageToWebp";

// Prepara uma foto tirada/escolhida pelo utilizador para a pesquisa visual:
// 1) comprime e redimensiona (reduz custo/tempo da chamada à Gemini — uma
//    foto de telemóvel em tamanho real não traz mais precisão útil aqui).
// 2) converte para base64, para seguir viajando fora do URL da página
//    (nunca metemos a imagem na query string — é isso que causava o corte
//    de imagens grandes no design anterior).
//
// O resultado deve ser passado via `state` do react-router (não via query
// string) para a página de resultados.
export async function fileToImageSearchPayload(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  const compressed = await convertToWebP(file, 0.8, 1000);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // readAsDataURL devolve "data:image/webp;base64,AAAA..."; só
      // queremos a parte depois da vírgula.
      const parts = result.split(",");
      resolve(parts[1] || "");
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    reader.readAsDataURL(compressed);
  });

  if (!base64) throw new Error("Imagem vazia após conversão");

  return { base64, mimeType: compressed.type || "image/jpeg" };
}
