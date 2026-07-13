import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";
import { Heart, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop";
const MIN_TO_SHOW = 4; // mesmo mínimo do RecommendedProducts — abaixo disto não vale a pena mostrar

interface SavingsProduct {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  discount_percent: number | null;
  currency: string | null;
  cover_image_url: string | null;
  reason: "categoria_favorita" | "loja_favorita" | "popular";
  promotion_ends_at?: string | null;
}

// ─── SavingsGrid ─────────────────────────────────────────────────────────────
// Visual igual ao módulo "1,000s of savings — on now" da Walmart (scroll
// horizontal em 2 linhas fixas, badge de desconto, coração, preço "Agora"),
// mas os dados vêm do MESMO motor de recomendação que o RecommendedProducts:
// a RPC get_recommended_products, que olha para categorias/lojas favoritas
// e histórico de navegação do próprio user (produtos que já viu/comprou) e
// devolve os que combinam com esse perfil — exatamente como o "recomendado
// para si" das grandes plataformas. Só aparece para quem está autenticado e
// já tem histórico suficiente (get_recommended_products devolve [] senão).
const SavingsGrid = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scrollRef = useRef<HTMLDivElement>(null);
  useDragScroll(scrollRef);
  const [scrollPct, setScrollPct] = useState(0); // 0 a 1 — posição do scroll horizontal
  const [thumbWidthPct, setThumbWidthPct] = useState(30); // largura da barra, em % da faixa

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setThumbWidthPct(Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
    setScrollPct(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  };

  const { data: allProducts = [] } = useQuery({
    queryKey: ["savings_grid_recommended", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recommended_products", { p_limit: 20 });
      if (error) throw error;
      return (data || []) as SavingsProduct[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min — igual ao RecommendedProducts, não recalcula a cada render
  });

  // Só produtos com desconto real entram nesta secção (agora "Produtos com desconto")
  const products = allProducts.filter((p) => (p.discount_percent || 0) > 0);

  useEffect(() => {
    handleScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  if (!user || products.length < MIN_TO_SHOW) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Produtos com desconto</h2>
          <p className="text-[11px] text-muted-foreground">Aproveite as promoções em destaque</p>
        </div>
      </div>

      {/*
        Scroll horizontal em 2 linhas fixas (igual ao print da Walmart):
        grid-flow-col preenche a 1ª coluna (linha 1 + linha 2) antes de passar
        à coluna seguinte, por isso ao arrastar para o lado aparecem sempre
        pares de produtos novos — não é um grid estático de N colunas.
      */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="grid grid-rows-2 grid-flow-col auto-cols-[44vw] sm:auto-cols-[200px] lg:auto-cols-[220px] gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
      >
        {products.map((p) => {
          const img = p.cover_image_url || FALLBACK_IMG;
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

                {p.discount_percent ? (
                  isBigDrop ? (
                    <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-600">
                      <ArrowDown className="w-3 h-3" /> Baixa
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded border border-red-600 bg-background/90 text-[10px] font-semibold text-red-600">
                      Preço reduzido
                    </span>
                  )
                ) : null}

                <button
                  onClick={(e) => handleHeart(e, p.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center shadow-sm"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-foreground"}`} />
                </button>
              </div>

              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground font-medium">Agora</span>
                <span className="text-[14px] font-black text-red-600">
                  {Number(p.price).toLocaleString("pt-AO")} {p.currency || "Kz"}
                </span>
              </div>
              {p.old_price && (
                <span className="text-[10.5px] text-muted-foreground">
                  Antes <span className="line-through">{Number(p.old_price).toLocaleString("pt-AO")} {p.currency || "Kz"}</span>
                </span>
              )}
              {p.promotion_ends_at && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit mt-0.5">
                  Termina: {new Date(p.promotion_ends_at).toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              )}
              <p className="text-[13px] font-bold text-foreground line-clamp-2 leading-snug mt-1">{p.title}</p>
            </div>
          );
        })}
      </div>

      {/* Barra de progresso do scroll horizontal, na cor de destaque da marca */}
      <div className="w-full h-1 rounded-full bg-muted mt-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#8B6343] transition-transform duration-100 ease-out"
          style={{
            width: `${thumbWidthPct}%`,
            transform: `translateX(${scrollPct * (100 / thumbWidthPct - 1) * 100}%)`,
          }}
        />
      </div>
    </section>
  );
};

export default SavingsGrid;
