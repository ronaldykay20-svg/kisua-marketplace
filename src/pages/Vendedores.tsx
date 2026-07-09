import { useState, useMemo, useEffect } from "react";
import Footer from "@/components/Footer";
import { Search, Star, MapPin, CheckCircle, ChevronRight, Users, ShoppingBag, Eye, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSellers } from "@/hooks/useSupabaseData";
import { useBulkSellerSales } from "@/hooks/useSalesCount";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


const filtersList = ["Todos", "Verificados", "Mais Vendidos", "Melhor Avaliação", "Luanda", "Benguela"];

const Vendedores = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  // Sem filtro de tipo: mostra vendedores individuais, lojas e fornecedores/afiliados no mesmo sítio
  const { data: dbSellers, isLoading } = useSellers();

  // ✅ Estabiliza o array para não quebrar a query key do useBulkSellerSales
  const sellerIds = useMemo(
    () => (dbSellers || []).map((s: any) => s.id),
    [dbSellers]
  );

  const { data: salesMap = {}, refetch: refetchSalesMap } = useBulkSellerSales(sellerIds);

  // ── FIX: contagem real de seguidores por vendedor, em vez da coluna
  // estática seller.followers_count (que não é actualizada automaticamente).
  const { data: followersMap = {}, refetch: refetchFollowersMap } = useQuery({
    queryKey: ["sellers_followers_map", sellerIds],
    queryFn: async () => {
      if (sellerIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("seller_follows")
        .select("seller_id")
        .in("seller_id", sellerIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((f: any) => {
        map[f.seller_id] = (map[f.seller_id] || 0) + 1;
      });
      return map;
    },
    enabled: sellerIds.length > 0,
  });

  // ── Tempo real: seguidores E vendas. Vendas mudam quando um item de
  // encomenda é criado (order_items) ou quando o status da encomenda avança
  // para confirmed/shipped/delivered (orders) — por isso ouvimos as duas.
  useEffect(() => {
    const channel = supabase
      .channel("vendedores_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seller_follows" },
        () => {
          refetchFollowersMap();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          refetchSalesMap();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          refetchSalesMap();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchFollowersMap, refetchSalesMap]);

  const sellers = useMemo(() =>
    (dbSellers || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      specialty: s.description || "Vendedor",
      location: s.province || "Angola",
      rating: s.rating ?? 0,
      reviews: s.total_reviews ?? 0,
      sales: (salesMap as Record<string, number>)[s.id] ?? 0,
      products: s.products_count ?? 0,
      visits: s.visits_count ?? 0,
      followers: (followersMap as Record<string, number>)[s.id] ?? s.followers_count ?? 0,
      verified: s.is_verified,
      isAffiliate: s.type === "dropship",
      image: s.logo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
      cover: s.cover_url || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop",
    })),
    [dbSellers, salesMap, followersMap]
  );

  const filtered = useMemo(() =>
    sellers.filter((s: any) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeFilter === "Verificados") return s.verified;
      if (activeFilter === "Mais Vendidos") return s.sales > 500;
      if (activeFilter === "Melhor Avaliação") return s.rating >= 4.8;
      if (activeFilter === "Luanda" || activeFilter === "Benguela") return s.location === activeFilter;
      return true;
    }),
    [sellers, search, activeFilter]
  );

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary py-6">
        <div className="container mx-auto px-3 text-center">
          <Users className="w-8 h-8 text-secondary mx-auto mb-2" />
          <h1 className="text-xl md:text-2xl font-black text-primary-foreground">Vendedores</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">Encontre os melhores vendedores de Angola</p>
        </div>
      </section>

      <section className="container mx-auto px-3 -mt-4 relative z-10">
        <div className="bg-card rounded-card border border-border p-3 shadow-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar vendedores..."
              className="w-full pl-9 pr-3 py-2 rounded-card bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-3 mt-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filtersList.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-card text-xs font-semibold whitespace-nowrap border transition ${activeFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-3 mt-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((seller: any) => (
            <div key={seller.id} onClick={() => navigate(`/vendedor/${seller.id}`)}
              className="rounded-gpu-fix bg-card rounded-card border border-border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <div className="h-24 overflow-hidden relative">
                <img src={seller.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
              </div>
              <div className="p-3 -mt-6 relative">
                <div className="flex items-end gap-3">
                  <img src={seller.image} alt={seller.name} className="w-14 h-14 rounded-card border-2 border-card object-cover" />
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{seller.name}</h3>
                      {seller.verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      {seller.isAffiliate && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex-shrink-0">
                          Afiliado
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{seller.specialty}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1"><Star className="w-3 h-3 text-secondary fill-secondary" /><span className="font-bold text-foreground">{seller.rating}</span><span>({seller.reviews})</span></div>
                  <div className="flex items-center gap-1"><Package className="w-3 h-3" /><span>{seller.products} produtos</span></div>
                  <div className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /><span>{seller.sales} vendas</span></div>
                  <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{seller.followers} seguidores</span></div>
                  <div className="flex items-center gap-1"><Eye className="w-3 h-3" /><span>{seller.visits} visitas</span></div>
                </div>
                <button className="w-full mt-3 py-2 rounded-card text-[11px] font-bold border border-primary/20 text-primary hover:bg-primary/5 transition flex items-center justify-center gap-1">
                  Ver perfil <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Vendedores;
