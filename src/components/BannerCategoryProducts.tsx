import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect, useMemo } from "react";
import { Star, Truck, Heart, Flame, Users, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  categoryId: string;
}

// Nunca mostrar menos que 4 produtos, e nunca um número ÍMPAR (3, 5, 7...).
// Só são permitidos 4, 6, 8, 10... — ver getEvenCount() abaixo.
const MIN_TO_SHOW = 4;

const getEvenCount = (total: number) => total - (total % 2);

// Classes de grid partilhadas entre o skeleton e a grelha real, para que a
// altura reservada durante o carregamento seja igual à altura final — é
// isso que evita o "salto" de layout quando os produtos aparecem.
const GRID_CLS = "grid grid-rows-2 grid-flow-col auto-cols-[44vw] sm:auto-cols-[200px] lg:auto-cols-[220px] gap-3 pb-1";

const InfoPill = ({ type, children }: { type: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    shipping:  "bg-green-100 text-green-700",
    sales:     "bg-blue-100 text-blue-700",
    recurrent: "bg-purple-100 text-purple-700",
    promo:     "bg-orange-100 text-orange-600",
    fast:      "bg-teal-100 text-teal-700",
    rated:     "bg-yellow-100 text-yellow-700",
    secure:    "bg-gray-100 text-gray-600",
    trending:  "bg-rose-100 text-rose-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${styles[type] || styles.secure}`}>
      {children}
    </span>
  );
};

const buildInfoList = (p: any) => {
  const list: { type: string; el: JSX.Element }[] = [];
  if (p.sales_count > 50)
    list.push({ type: "trending", el: <InfoPill type="trending"><Flame className="w-2.5 h-2.5" /> Tendência</InfoPill> });
  if (p.free_shipping)
    list.push({ type: "shipping", el: <InfoPill type="shipping"><Truck className="w-2.5 h-2.5" /> Frete grátis</InfoPill> });
  if (p.sales_count > 0)
    list.push({ type: "sales", el: <InfoPill type="sales"><Users className="w-2.5 h-2.5" /> {p.sales_count}+ vendidos</InfoPill> });
  if ((p.total_reviews || 0) > 10)
    list.push({ type: "recurrent", el: <InfoPill type="recurrent"><Users className="w-2.5 h-2.5" /> Clientes recorrentes</InfoPill> });
  if (p.discount_percent > 0)
    list.push({ type: "promo", el: <InfoPill type="promo"><Flame className="w-2.5 h-2.5" /> -{p.discount_percent}% hoje</InfoPill> });
  if (p.rating >= 4)
    list.push({ type: "rated", el: <InfoPill type="rated"><Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> Muito bem avaliado</InfoPill> });
  if (p.free_shipping && (p.sales_count || 0) > 5)
    list.push({ type: "fast", el: <InfoPill type="fast"><Truck className="w-2.5 h-2.5" /> Entrega rápida</InfoPill> });
  list.push({ type: "secure", el: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });
  return list;
};

const RotatingPill = ({ p, seed }: { p: any; seed: number }) => {
  const infoList = useMemo(() => buildInfoList(p), [p.id]);
  const [idx, setIdx] = useState(seed % infoList.length);
  const [visible, setVisible] = useState(true);
  const interval = useMemo(() => 5000 + (seed % 7) * 1000, [seed]);

  useEffect(() => {
    if (infoList.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % infoList.length);
        setVisible(true);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [infoList.length, interval]);

  return (
    <div style={{ transition: "opacity 0.4s ease", opacity: visible ? 1 : 0, minHeight: "18px" }}>
      {infoList[idx]?.el}
    </div>
  );
};

// Esqueleto mostrado enquanto a query ainda não respondeu. Usa exatamente
// as mesmas classes de grid (GRID_CLS) da versão final, para reservar a
// MESMA altura — assim, quando os produtos chegam, não há salto de "0px"
// para "altura cheia" a meio do scroll.
const BannerCategoryProductsSkeleton = () => (
  <section className="container mx-auto px-3 mt-2">
    <div className={`${GRID_CLS} overflow-hidden`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border/60 rounded-2xl overflow-hidden animate-pulse flex flex-col">
          <div className="aspect-square bg-muted" />
          <div className="p-2.5 flex flex-col gap-1.5">
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-2.5 w-10 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const BannerCategoryProducts = ({ categoryId }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);
  const [thumbWidthPct, setThumbWidthPct] = useState(30);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setThumbWidthPct(Math.min(100, (el.clientWidth / el.scrollWidth) * 100));
    setScrollPct(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  };

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["banner_category_products", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent, rating, total_reviews, sales_count, free_shipping, badge, product_media(url, is_cover)")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(20); // busca de sobra para depois cortar sempre num número par
      return data || [];
    },
    enabled: !!categoryId,
  });

  // Corta sempre a lista para um número PAR (4, 6, 8, 10...) — nunca 3, 5 ou 7.
  // Se não sobrar pelo menos 4 depois de arredondar para baixo, a secção some.
  const products = useMemo(() => {
    const evenCount = getEvenCount(rawProducts.length);
    return evenCount >= MIN_TO_SHOW ? rawProducts.slice(0, evenCount) : [];
  }, [rawProducts]);

  useEffect(() => {
    handleScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Enquanto a query não respondeu, mostra o esqueleto (mesma altura da
  // grelha real) em vez de nada — evita o salto de layout ao entrar em
  // ecrã. Só depois de saber se há produtos suficientes é que decide entre
  // mostrar a grelha real ou não reservar espaço nenhum.
  if (isLoading) return <BannerCategoryProductsSkeleton />;
  if (products.length < MIN_TO_SHOW) return null;

  const handleHeart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(productId);
  };

  return (
    <section className="container mx-auto px-3 mt-2">
      {/*
        Mesmo layout da secção "Produtos com desconto" (SavingsGrid): scroll
        horizontal em 2 linhas fixas (grid-flow-col). Como cada coluna tem
        sempre 2 produtos (linha de cima + linha de baixo), arrastar para o
        lado nunca revela um número ímpar — vem sempre +2. No mobile,
        auto-cols-[44vw] deixa ~2 colunas visíveis de início = 4 produtos;
        em sm/lg só a largura da coluna muda (200px / 220px), a regra dos
        pares continua igual em qualquer visor.
      */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`${GRID_CLS} overflow-x-auto snap-x snap-mandatory scrollbar-hide`}
      >
        {products.map((p: any, i: number) => {
          const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.product_media?.[0]?.url;
          const fav = isFavorite(p.id);

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/produto/${p.id}`)}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer flex flex-col snap-start"
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                {cover ? (
                  <img src={cover} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
                )}

                {p.discount_percent ? (
                  <span className="absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-sm">
                    -{p.discount_percent}%
                  </span>
                ) : p.badge ? (
                  <span className="absolute top-2 left-2 px-1.5 py-[3px] rounded-full text-[10px] font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 shadow-sm">
                    {p.badge}
                  </span>
                ) : null}

                <button
                  onClick={(e) => handleHeart(e, p.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm shadow-sm flex items-center justify-center"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${fav ? "fill-[#8B6343] text-[#8B6343]" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="p-2.5 flex flex-col gap-1">
                <p className="text-[12.5px] font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.4em]">{p.title}</p>

                {p.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-semibold text-foreground">{Number(p.rating).toFixed(1)}</span>
                    {p.total_reviews > 0 && (
                      <span className="text-[9.5px] text-muted-foreground">
                        ({p.total_reviews > 999 ? "1000+" : p.total_reviews})
                      </span>
                    )}
                  </div>
                )}

                <RotatingPill p={p} seed={i} />

                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[14px] font-black" style={{ color: "#8B6343" }}>
                    {Number(p.price).toLocaleString("pt-AO")}
                  </span>
                  <span className="text-[10.5px] font-semibold text-muted-foreground">Kz</span>
                </div>
                {p.old_price && (
                  <span className="text-[10.5px] text-muted-foreground line-through -mt-0.5">
                    {Number(p.old_price).toLocaleString("pt-AO")} Kz
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de progresso do scroll horizontal, na cor castanha de destaque */}
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

export default BannerCategoryProducts;
