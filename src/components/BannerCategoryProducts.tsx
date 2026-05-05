import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Star, Truck, Heart, Flame, Users, ShieldCheck, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  categoryId: string;
}

// Pill colorido
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

// Monta infos disponíveis para o produto
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

  // Sempre tem pelo menos 1
  list.push({ type: "secure", el: <InfoPill type="secure"><ShieldCheck className="w-2.5 h-2.5" /> Compra segura</InfoPill> });

  return list;
};

// Info animada por card — cada um no seu tempo
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

const BannerCategoryProducts = ({ categoryId }: Props) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const { data: products = [] } = useQuery({
    queryKey: ["banner_category_products", categoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, old_price, discount_percent, rating, total_reviews, sales_count, free_shipping, badge, product_media(url, is_cover)")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sales_count", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!categoryId,
  });

  if (products.length === 0) return null;

  const totalGroups = Math.ceil(products.length / 2);

  const scroll = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.47;
    el.scrollBy({ left: dir === "left" ? -(cardWidth * 2 + 8) : (cardWidth * 2 + 8), behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.47;
    const groupWidth = cardWidth * 2 + 8;
    setActiveDot(Math.min(Math.round(el.scrollLeft / groupWidth), totalGroups - 1));
  };

  return (
    <section className="container mx-auto px-3 mt-2">
      <div className="relative">
        <div
          ref={ref}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
        >
          {products.map((p: any, i: number) => {
            const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.product_media?.[0]?.url;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/produto/${p.id}`)}
                // Ligeiramente menor no mobile: 47% em vez de 50%
                className="snap-start flex-shrink-0 w-[47%] sm:w-[calc(33.333%-6px)] md:w-[calc(25%-6px)] lg:w-[calc(20%-7px)] bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:shadow-md transition flex flex-col"
              >
                {/* Imagem */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {cover ? (
                    <img src={cover} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">Sem foto</div>
                  )}
                  {p.discount_percent && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-red-500">
                      -{p.discount_percent}%
                    </span>
                  )}
                  {p.badge && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-orange-500">
                      {p.badge}
                    </span>
                  )}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow"
                  >
                    <Heart className="w-3 h-3 text-gray-400" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-1.5 flex flex-col gap-1 flex-1">
                  {/* Título */}
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">
                    {p.title}
                  </p>

                  {/* Rating — se existir */}
                  {p.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold">{Number(p.rating).toFixed(1)}</span>
                      {p.total_reviews > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          ({p.total_reviews > 999 ? "1000+" : p.total_reviews})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pill animado — preenche o espaço com info real */}
                  <RotatingPill p={p} seed={i} />

                  {/* Preço */}
                  <div className="flex items-baseline gap-1 mt-auto pt-0.5">
                    <span className="text-[12px] font-black text-red-500">
                      {Number(p.price).toLocaleString("pt-AO")} Kz
                    </span>
                    {p.old_price && (
                      <span className="text-[9px] text-muted-foreground line-through">
                        {Number(p.old_price).toLocaleString("pt-AO")} Kz
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Setas mobile */}
        {products.length > 2 && (
          <>
            <button onClick={() => scroll("left")}
              className="sm:hidden absolute -left-1 top-[40%] -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border shadow flex items-center justify-center z-10">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scroll("right")}
              className="sm:hidden absolute -right-1 top-[40%] -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border shadow flex items-center justify-center z-10">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Setas tablet/desktop */}
        <button onClick={() => scroll("left")}
          className="hidden sm:flex absolute -left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card z-10">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll("right")}
          className="hidden sm:flex absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 border border-border items-center justify-center shadow-sm hover:bg-card z-10">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots — mobile, só se > 2 produtos */}
      {products.length > 2 && (
        <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
          {Array.from({ length: totalGroups }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeDot ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
          ))}
        </div>
      )}
    </section>
  );
};

export default BannerCategoryProducts;
