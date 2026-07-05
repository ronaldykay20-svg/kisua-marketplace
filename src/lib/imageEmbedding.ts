import { supabase } from "@/integrations/supabase/client";

// Depois de inserir linhas em `product_media`, chama esta função para
// gerar o "código visual" (embedding) de cada imagem em segundo plano.
//
// IMPORTANTE: não usamos `await` no chamador — isto dispara os pedidos e
// não bloqueia o ecrã de "produto guardado com sucesso". Se uma imagem
// falhar a gerar embedding, o produto continua visível e à venda
// normalmente; só a pesquisa por foto é que não vai encontrar essa imagem
// em particular (pode ser reprocessada depois pelo backfill em lote).
export function triggerImageEmbeddings(
  mediaRows: { id: string; type: string }[]
) {
  const imageRows = mediaRows.filter((m) => m.type === "image");
  for (const row of imageRows) {
    supabase.functions
      .invoke("generate-image-embedding", {
        body: { product_media_id: row.id },
      })
      .catch((err) => {
        console.warn("Falha ao gerar embedding de imagem:", row.id, err);
      });
  }
}
