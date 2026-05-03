import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle, Star, ShoppingCart, ShoppingBag, MapPin, Users, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const filters = ["Todas", "Verificadas", "Melhor Avaliação", "Mais Visitas", "Mais Seguidores"];

const Empresas = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch real reviews for each company
      const companyIds = (data || []).map((c: any) => c.id);
      let ratingsMap: Record<string, { avg: number; count: number }> = {};
      let followersMap: Record<string, number> = {};

      if (companyIds.length > 0) {
        const { data: reviews } = await supabase
          .from("company_reviews")
          .select("company_id, rating")
          .in("company_id", companyIds);
        if (reviews) {
          const grouped: Record<string, number[]> = {};
          reviews.forEach((r: any) => {
            if (!grouped[r.company_id]) grouped[r.company_id] = [];
            grouped[r.company_id].push(r.rating);
          });
          Object.entries(grouped).forEach(([cid, ratings]) => {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
            ratingsMap[cid] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
          });
        }

        const { data: follows } = await supabase
          .from("company_follows")
          .select("company_id")
          .in("company_id", companyIds);
        if (follows) {
          follows.forEach((f: any) => {
            followersMap[f.company_id] = (followersMap[f.company_id] || 0) + 1;
          });
        }
      }

      // Count products per company (real data)
      let productsMap: Record<string, number> = {};
      if (companyIds.length > 0) {
        const { data: companyProducts } = await supabase
          .from("products")
          .select("id, company_id")
          .in("company_id", companyIds)
          .eq("is_active", true);
        (companyProducts || []).forEach((p: any) => {
          productsMap[p.company_id] = (productsMap[p.company_id] || 0) + 1;
        });
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        category: c.description || "Empresa",
        rating: ratingsMap[c.id]?.avg ?? c.rating ?? 0,
        reviews: ratingsMap[c.id]?.count ?? c.total_reviews ?? 0,
        visits: c.visits_count ?? 0,
        followers: followersMap[c.id] ?? c.followers_count ?? 0,
        products: productsMap[c.id] ?? 0,
        cover: c.banner_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop",
        logo: c.logo_url || null,
        verified: c.is_verified,
      }));
    },
  });

  const filtered = empresas.filter((e: any) => {
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter === "Verificadas") return e.verified;
    if (activeFilter === "Melhor Avaliação") return e.rating >= 4;
    return true;
  });

  const formatCount = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-black text-primary-foreground tracking-tight">EMPRESAS</h1>
          <button className="text-primary-foreground relative"><ShoppingCart className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-black text-foreground">Empresas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-card border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(activeFilter === f ? null : f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-xs font-semibold transition ${activeFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((empresa: any) => (
              <div key={empresa.id} onClick={() => navigate(`/empresa/${empresa.id}`)}
                className="bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-lg transition group">
                <div className="h-28 overflow-hidden relative">
                  <img src={empresa.cover} alt={empresa.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-3 pt-0 relative">
                  <div className="w-14 h-14 rounded-full bg-card border-2 border-border flex items-center justify-center -mt-7 relative z-10 shadow-sm overflow-hidden">
                    {empresa.logo ? (
                      <img src={empresa.logo} alt={empresa.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-foreground">{empresa.name}</h3>
                      {empresa.verified && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{empresa.category}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-secondary fill-secondary" /> {empresa.rating} ({empresa.reviews})</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {formatCount(empresa.visits)} visitas</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5"><ShoppingBag className="w-3 h-3" /> {formatCount(empresa.products)} produtos</span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {formatCount(empresa.followers)} seguidores</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Empresas;
