import { useState, useRef } from "react";
import { Trophy, Medal, Crown, TrendingUp, Loader2, Store, Package, ChevronRight } from "lucide-react";
import { useSellerRanking } from "@/hooks/useSalesCount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const useTopProducts = () =>
  useQuery({
    queryKey: ["top_products_ranking"],
    queryFn: async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, order_id, quantity");
      if (!items || items.length === 0) return [];

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .in("status", ["confirmed", "shipped", "delivered"]);
      const confirmedIds = new Set((orders || []).map((o: any) => o.id));

      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedIds.has(item.order_id)) {
          salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 1);
        }
      });

      const productIds = Object.keys(salesMap);
      if (productIds.length === 0) return [];

      const { data: products } = await supabase
        .from("products")
        .select("id, title, price, image_url, product_media(url, is_cover)")
        .in("id", productIds);

      return (products || [])
        .map((p: any) => {
          const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "";
          return { id: p.id, name: p.title, image: cover, price: p.price, sales: salesMap[p.id] || 0, type: "product" as const };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    },
  });

const useTopCompanies = () =>
  useQuery({
    queryKey: ["top_companies_ranking"],
    queryFn: async () => {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("is_active", true);
      if (!companies || companies.length === 0) return [];

      const companyIds = companies.map((c: any) => c.id);
      const { data: products } = await supabase
        .from("products")
        .select("id, company_id")
        .in("company_id", companyIds);
      if (!products || products.length === 0) return companies.slice(0, 5).map((c: any) => ({ ...c, sales: 0, type: "company" as const }));

      const productIds = products.map((p: any) => p.id);
      const pcMap: Record<string, string> = {};
      products.forEach((p: any) => { pcMap[p.id] = p.company_id; });

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, order_id, quantity")
        .in("product_id", productIds);
      if (!items || items.length === 0) return companies.slice(0, 5).map((c: any) => ({ ...c, sales: 0, type: "company" as const }));

      const orderIds = [...new Set(items.map((i: any) => i.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .in("status", ["confirmed", "shipped", "delivered"]);
      const confirmedIds = new Set((orders || []).map((o: any) => o.id));

      const salesMap: Record<string, number> = {};
      items.forEach((item: any) => {
        if (confirmedIds.has(item.order_id)) {
          const cid = pcMap[item.product_id];
          if (cid) salesMap[cid] = (salesMap[cid] || 0) + (item.quantity || 1);
        }
      });

      return companies
        .map((c: any) => ({ id: c.id, name: c.name, image: c.logo_url, sales: salesMap[c.id] || 0, type: "company" as const }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    },
  });

const RankingSection = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const { data: sellers = [], isLoading: ls } = useSellerRanking();
  const { data: products = [], isLoading: lp } = useTopProducts();
  const { data: companies = [], isLoading: lc } = useTopCompanies();

  const isLoading = ls || lp || lc;

  const topSellers = sellers.slice(0, 5).map((s: any) => ({
    id: s.id, name: s.name, image: s.logo_url, sales: s.sales, rating: s.rating, type: "seller" as const,
  }));

  const slides = [
    { key: "produtos", label: "Produtos", icon: Package, items: products },
    { key: "vendedores", label: "Vendedores", icon: Trophy, items: topSellers },
    { key: "empresas", label: "Empresas", icon: Store, items: companies },
  ];

  const getIcon = (rank: number) => {
    if (rank === 1) return Crown;
    if (rank <= 3) return Medal;
    return TrendingUp;
  };

  const getColor = (rank: number) => {
    if (rank === 1) return "text-secondary";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-amber-700";
    return "text-primary";
  };

  const getLink = (item: any) => {
    if (item.type === "seller") return `/vendedor/${item.id}`;
    if (item.type === "company") return `/empresa/${item.id}`;
    return `/produto/${item.id}`;
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const slideWidth = el.scrollWidth / 3;
    const idx = Math.round(el.scrollLeft / slideWidth);
    setActiveSlide(idx);
  };

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center bg-secondary">
            <Trophy className="w-4 h-4 text-secondary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Ranking</h2>
        </div>
        <a href="/ranking" className="text-xs font-semibold text-primary flex items-center gap-0.5">
          Ver tudo <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {slides.map((s, i) => (
          <button
            key={s.key}
            onClick={() => {
              setActiveSlide(i);
              scrollRef.current?.scrollTo({ left: i * (scrollRef.current.scrollWidth / 3), behavior: "smooth" });
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
              activeSlide === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <s.icon className="w-3 h-3" />
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {slides.map((slide) => (
            <div key={slide.key} className="min-w-full snap-center flex-shrink-0">
              <div className="bg-card rounded-card border border-border overflow-hidden">
                {slide.items.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">Nenhuma venda confirmada ainda.</p>
                ) : (
                  slide.items.map((item: any, i: number) => {
                    const Icon = getIcon(i + 1);
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(getLink(item))}
                        className={`flex items-center gap-3 p-3 ${i !== slide.items.length - 1 ? "border-b border-border" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
                      >
                        <div className="w-8 h-8 rounded-card bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-black text-foreground">{i + 1}</span>
                        </div>
                        <Icon className={`w-5 h-5 ${getColor(i + 1)} flex-shrink-0`} />
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                          <p className="text-[10px] text-muted-foreground">
                            {item.sales} vendas
                            {item.type === "product" && item.price ? ` • ${Number(item.price).toLocaleString("pt-AO")} Kz` : ""}
                            {item.type === "seller" && item.rating ? ` • ⭐ ${item.rating}` : ""}
                          </p>
                        </div>
                        <button className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-colors flex-shrink-0">
                          Ver
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition ${activeSlide === i ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>
    </section>
  );
};

export default RankingSection;
