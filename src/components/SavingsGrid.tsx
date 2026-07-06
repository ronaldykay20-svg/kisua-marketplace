import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";

interface SavingsProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  cover_url?: string;
}

// Limite de itens a mostrar consoante o layout do site (2 col no telemóvel,
// mais colunas conforme o ecrã cresce — ver className da grid abaixo).
const LIMIT = 12;

// ─── SavingsGrid ─────────────────────────────────────────────────────────────
// Réplica do módulo "1,000s of savings — on now" da app da Walmart:
// grid 2x N no telemóvel, badge "Preço reduzido" (contorno) ou "Baixa" (cheio,
// com seta) consoante o desconto, coração para favoritos no canto superior
// direito, preço "Agora" a verde e preço antigo riscado por baixo.
const SavingsGrid = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: products = [] } = useQuery({
    queryKey: ["savings_grid_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent")
        .eq("is_active", true)
        .not("discount_percent", "is", null)
        .gt("discount_percent", 0)
        .order("discount_percent", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      let coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] })) as SavingsProduct[];
    },
  });

  if (products.length === 0) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-bold text-foreground">Milhares de poupanças — já disponíveis</h2>
        <button onClick={() => navigate("/promocoes")} className="text-sm font-semibold text-primary underline underline-offset-2 whitespace-nowrap">
          Ver tudo
        </button>
      </div>

      {/*
        Scroll horizontal em 2 linhas fixas (igual ao print da Walmart):
        grid-flow-col preenche a 1ª coluna (linha 1 + linha 2) antes de passar
        à coluna seguinte, por isso ao arrastar para o lado aparecem sempre
        pares de produtos novos — não é um grid estático de N colunas.
      */}
      <div className="grid grid-rows-2 grid-flow-col auto-cols-[44vw] sm:auto-cols-[200px] lg:auto-cols-[220px] gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
        {products.map((p) => {
          const img = p.cover_url || FALLBACK_IMG;
          const fav = isFavorite(p.id);
          const isBigDrop = (p.discount_percent || 0) >= 25;

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="flex flex-col cursor-pointer snap-start"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" />

                {isBigDrop ? (
                  <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-600">
                    <ArrowDown className="w-3 h-3" /> Baixa
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded border border-primary bg-background/90 text-[10px] font-semibold text-primary">
                    Preço reduzido
                  </span>
                )}

                <button
                  onClick={(e) => handleHeart(e, p.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center shadow-sm"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-foreground"}`} />
                </button>
              </div>

              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[13px] text-muted-foreground font-medium">Agora</span>
                <span className="text-[17px] font-black text-green-600">
                  {Number(p.price).toLocaleString("pt-AO")} Kz
                </span>
              </div>
              {p.old_price && (
                <span className="text-[12px] text-muted-foreground line-through">
                  {Number(p.old_price).toLocaleString("pt-AO")} Kz
                </span>
              )}
              <p className="text-[12px] text-foreground line-clamp-2 leading-snug mt-0.5">{p.title}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SavingsGrid;
