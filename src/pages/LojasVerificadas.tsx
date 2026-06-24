import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, Star, Users, Eye, Package,
  Store, BadgeCheck, ChevronRight, MapPin, CheckCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellers } from "@/hooks/useSupabaseData";

type TipoFiltro = "todos" | "vendedores" | "empresas";

// ── Empresas verificadas (igual a Empresas.tsx) ───────────────────────────────
const useVerifiedCompanies = () =>
  useQuery({
    queryKey: ["verified_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_verified", true)
        .eq("is_active", true)
        .order("rating", { ascending: false });
      if (error) throw error;

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

      return (data || []).map((c: any) => ({
        id: c.id,
        tipo: "empresa" as const,
        name: c.name,
        specialty: c.description || "Empresa verificada",
        location: "",
        rating: ratingsMap[c.id]?.avg ?? c.rating ?? 0,
        reviews: ratingsMap[c.id]?.count ?? 0,
        visits: c.visits_count ?? 0,
        followers: followersMap[c.id] ?? c.followers_count ?? 0,
        products: 0,
        logo: c.logo_url || null,
        cover: c.banner_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop",
        verified: true,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

// ── Card ──────────────────────────────────────────────────────────────────────
const LojaCard = ({ item, onClick }: { item: any; onClick: () => void }) => {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const isEmpresa = item.tipo === "empresa";

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
    >
      {/* Cover */}
      <div className="h-24 overflow-hidden relative">
        <img
          src={item.cover}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isEmpresa ? "bg-secondary text-[#3a2412]" : "bg-primary text-primary-foreground"
        }`}>
          {isEmpresa ? <Store className="w-3 h-3" /> : <Users className="w-3 h-3" />}
          {isEmpresa ? "Empresa" : "Vendedor"}
        </div>
      </div>

      {/* Corpo — igual ao padrão Vendedores.tsx */}
      <div className="p-3 -mt-6 relative">
        <div className="flex items-end gap-3">
          <div className="w-14 h-14 rounded-card border-2 border-card overflow-hidden flex items-center justify-center bg-card shrink-0">
            {item.logo ? (
              <img src={item.logo} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isEmpresa ? "bg-secondary/20" : "bg-primary/10"}`}>
                {isEmpresa ? <Store className="w-6 h-6 text-secondary" /> : <Users className="w-6 h-6 text-primary" />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{item.specialty}</p>
            {item.location && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MapPin className="w-3 h-3" /> {item.location}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-secondary fill-secondary" />
            <span className="font-bold text-foreground">{item.rating}</span>
            <span>({item.reviews})</span>
          </div>
          <div className="flex items-center gap-1"><Eye className="w-3 h-3" /><span>{fmt(item.visits)} visitas</span></div>
          <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span>{fmt(item.followers)} seguidores</span></div>
          {item.products > 0 && (
            <div className="flex items-center gap-1"><Package className="w-3 h-3" /><span>{fmt(item.products)} produtos</span></div>
          )}
        </div>

        <button className={`w-full mt-3 py-2 rounded-card text-[11px] font-bold flex items-center justify-center gap-1 border transition ${
          isEmpresa
            ? "border-secondary/30 text-secondary hover:bg-secondary/10"
            : "border-primary/20 text-primary hover:bg-primary/5"
        }`}>
          Ver {isEmpresa ? "empresa" : "perfil"} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-card rounded-card border border-border overflow-hidden animate-pulse">
    <div className="h-24 bg-muted" />
    <div className="p-3 -mt-6">
      <div className="flex items-end gap-3 mb-3">
        <div className="w-14 h-14 rounded-card bg-muted shrink-0" />
        <div className="flex-1 pb-1 space-y-1">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-2 bg-muted rounded" />)}
      </div>
      <div className="h-8 bg-muted rounded-card" />
    </div>
  </div>
);

// ── Página ────────────────────────────────────────────────────────────────────
const LojasVerificadas = () => {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoFiltro>("todos");
  const [search, setSearch] = useState("");

  // Vendedores verificados — usa o mesmo hook que Vendedores.tsx
  const { data: dbSellers = [], isLoading: loadingSellers } = useSellers({ verified: true });
  const { data: companies = [], isLoading: loadingCompanies } = useVerifiedCompanies();

  const isLoading = loadingSellers || loadingCompanies;

  // Mapeia vendedores para o formato do card
  const sellers = useMemo(() =>
    (dbSellers as any[]).map((s: any) => ({
      id: s.id,
      tipo: "vendedor" as const,
      name: s.name,
      specialty: s.description || "Vendedor verificado",
      location: s.province || "",
      rating: s.rating ?? 0,
      reviews: s.total_reviews ?? 0,
      visits: s.visits_count ?? 0,
      followers: s.followers_count ?? 0,
      products: s.products_count ?? 0,
      logo: s.logo_url || null,
      cover: s.cover_url || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop",
      verified: true,
    })),
    [dbSellers]
  );

  const items = useMemo(() => {
    let list: any[] = [];
    if (tipo === "todos" || tipo === "vendedores") list = [...list, ...sellers];
    if (tipo === "todos" || tipo === "empresas") list = [...list, ...companies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) || i.specialty.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tipo, sellers, companies, search]);

  return (
    <div className="min-h-screen bg-background">

      {/* Cabeçalho */}
      <div className="container mx-auto max-w-2xl px-3 pt-4 pb-3 flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-black text-foreground">Parceiros Verificados</h1>
      </div>

      {/* Search + Filtros */}
      <div className="container mx-auto max-w-2xl px-3 space-y-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar parceiros verificados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-card bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {([
            { key: "todos", label: "Todos", icon: BadgeCheck },
            { key: "vendedores", label: "Vendedores", icon: Users },
            { key: "empresas", label: "Empresas", icon: Store },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-card text-xs font-bold border transition ${
                tipo === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contagem */}
      {!isLoading && items.length > 0 && (
        <div className="container mx-auto max-w-2xl px-3 mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{items.length}</span> parceiros encontrados
          </p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Vendedores</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Empresas</span>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="container mx-auto max-w-2xl px-3 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum parceiro verificado encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item) => (
              <LojaCard
                key={`${item.tipo}-${item.id}`}
                item={item}
                onClick={() => navigate(item.tipo === "empresa" ? `/empresa/${item.id}` : `/vendedor/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default LojasVerificadas;
