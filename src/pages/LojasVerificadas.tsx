import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, Star, Users, ShoppingBag, Eye, Package,
  Store, BadgeCheck, Sparkles, ChevronRight, MapPin
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TipoFiltro = "todos" | "vendedores" | "empresas";

// ── Queries ───────────────────────────────────────────────────────────────────
const useVerifiedSellers = () =>
  useQuery({
    queryKey: ["verified_sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, name, description, province, rating, total_reviews, visits_count, followers_count, products_count, logo_url, cover_url")
        .eq("is_verified", true)
        .eq("is_active", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
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
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

const useVerifiedCompanies = () =>
  useQuery({
    queryKey: ["verified_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, description, rating, total_reviews, visits_count, followers_count, logo_url, banner_url")
        .eq("is_verified", true)
        .eq("is_active", true)
        .order("rating", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        tipo: "empresa" as const,
        name: c.name,
        specialty: c.description || "Empresa verificada",
        location: "",
        rating: c.rating ?? 0,
        reviews: c.total_reviews ?? 0,
        visits: c.visits_count ?? 0,
        followers: c.followers_count ?? 0,
        products: 0,
        logo: c.logo_url || null,
        cover: c.banner_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop",
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
      <div className="h-28 overflow-hidden relative">
        <img
          src={item.cover}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Badge tipo */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isEmpresa ? "bg-secondary text-[#3a2412]" : "bg-primary text-primary-foreground"
        }`}>
          {isEmpresa ? <Store className="w-3 h-3" /> : <Users className="w-3 h-3" />}
          {isEmpresa ? "Empresa" : "Vendedor"}
        </div>
        {/* Badge verificado */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 text-primary rounded-full px-2 py-0.5">
          <BadgeCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">Verificado</span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-3 pt-0 relative">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-card border-2 border-border -mt-7 relative z-10 shadow-sm overflow-hidden flex items-center justify-center bg-card">
          {item.logo ? (
            <img src={item.logo} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isEmpresa ? "bg-secondary/20" : "bg-primary/10"}`}>
              {isEmpresa ? <Store className="w-6 h-6 text-secondary" /> : <Users className="w-6 h-6 text-primary" />}
            </div>
          )}
        </div>

        <div className="mt-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{item.specialty}</p>
          {item.location && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-3 h-3" /> {item.location}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 mt-2.5 text-[10px] text-muted-foreground">
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
    <div className="h-28 bg-muted" />
    <div className="p-3 pt-0">
      <div className="w-14 h-14 rounded-card bg-muted -mt-7 mb-2" />
      <div className="h-3 bg-muted rounded w-3/4 mb-1" />
      <div className="h-2 bg-muted rounded w-1/2 mb-3" />
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

  const { data: sellers = [], isLoading: loadingSellers } = useVerifiedSellers();
  const { data: companies = [], isLoading: loadingCompanies } = useVerifiedCompanies();

  const isLoading = loadingSellers || loadingCompanies;

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

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#5C3A1E] via-[#4a2e16] to-[#3a2412] pt-8 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"
              style={{ left: `${(i * 41) % 100}%`, top: `${(i * 57) % 100}%`, animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="w-16 h-16 bg-secondary/20 border border-secondary/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Parceiros Verificados</h1>
          <p className="text-[#d9bfa5] text-sm max-w-xs mx-auto mb-4">
            Vendedores e empresas com identidade confirmada e qualidade garantida.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Identidade confirmada
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <Sparkles className="w-3.5 h-3.5 text-secondary" /> Qualidade garantida
            </span>
          </div>
        </div>
      </div>

      {/* Search + Filtros sobrepostos ao hero */}
      <div className="container mx-auto max-w-2xl px-3 -mt-8 relative z-10">
        <div className="bg-card rounded-card border border-border shadow-xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar parceiros verificados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-card bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contagem */}
      {!isLoading && items.length > 0 && (
        <div className="container mx-auto max-w-2xl px-3 mt-4 mb-2 flex items-center justify-between">
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
      <div className="container mx-auto max-w-2xl px-3 mt-2 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum parceiro verificado encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
