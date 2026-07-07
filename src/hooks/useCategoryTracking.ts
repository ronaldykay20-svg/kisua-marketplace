import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackViewedCategory } from "@/lib/recentBrowsing";

type CategoryViewSource = "menu" | "product";

/**
 * Regista a categoria que o utilizador acabou de ver — seja porque tocou
 * nela no menu de categorias, seja porque abriu o detalhe de um produto
 * que pertence a essa categoria.
 *
 * - Guarda sempre localmente (localStorage), para funcionar mesmo sem sessão.
 * - Se houver utilizador autenticado, grava também na base de dados via a
 *   função `track_category_view`. É essa gravação que alimenta a secção
 *   "Recomendado para si" (produtos da mesma família de subcategorias e,
 *   depois, da mesma família de categorias).
 */
export function useCategoryTracking() {
  const { user } = useAuth();

  const trackCategoryView = (
    categoryId: string | null | undefined,
    source: CategoryViewSource = "product"
  ) => {
    if (!categoryId) return;

    trackViewedCategory(categoryId);

    if (!user) return;

    supabase
      .rpc("track_category_view", { _category_id: categoryId, _source: source })
      .then(
        () => {},
        () => {
          /* falha silenciosa — nunca deve travar a navegação do utilizador */
        }
      );
  };

  return { trackCategoryView };
}
