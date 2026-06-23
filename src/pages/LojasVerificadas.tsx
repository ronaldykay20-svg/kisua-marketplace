import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Search, Star, Users, ShoppingBag, Eye, Package,
  Store, BadgeCheck, Sparkles, ChevronRight, MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 12;

type TipoFiltro = "todos" | "vendedores" | "empresas";

// ── Busca paginada de vendedores verificados ──────────────────────────────────
const fetchVerifiedSellers = async (page: number) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from("sellers")
    .select("id, name, description, province, rating, total_reviews, visits_count, followers_count, products_count, logo_url, cover_url, is_verified")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data || []).map((s: any) => ({
    id: s.id,
    tipo: "vendedor" as const,
    name: s.name,
    specialty: s.description || "Vendedor verificado",
    location: s.province || "Angola",
    rating: s.rating ?? 0,
    reviews: s.total_reviews ?? 0,
    visits: s.visits_count ?? 0,
    followers: s.followers_count ?? 0,
    products: s.products_count ?? 0,
    logo: s.logo_url || null,
    cover: s.cover_url || "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=200&fit=crop",
    verified: true,
  }));
};

// ── Busca paginada de empresas verificadas ────────────────────────────────────
const fetchVerifiedCompanies = async (page: number) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, description, rating, total_reviews, visits_count, followers_count, logo_url, banner_url, is_verified")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data || []).map((c: any) => ({
    id: c.id,
    tipo: "empresa" as const,
    name: c.name,
    specialty: c.description || "Empresa verificada",
    location: "Angola",
    rating: c.rating ?? 0,
    reviews: c.total_reviews ?? 0,
    visits: c.visits_count ?? 0,
    followers: c.followers_count ?? 0,
    products: 0,
    logo: c.logo_url || null,
    cover: c.banner_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=300&fit=crop",
    verified: true,
  }));
};

// ── Card de loja verificada ───────────────────────────────────────────────────
const LojaCard = ({ item, onClick }: { item: any; onClick: () => void }) => {
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const isEmpresa = item.tipo === "empresa";

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Cover */}
      <div className="h-28 overflow-hidden relative">
        <img
          src={item.cover}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Badge tipo */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isEmpresa
            ? "bg-secondary text-[#3a2412]"
            : "bg-primary text-primary-foreground"
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
        <div className="w-14 h-14 rounded-xl bg-card border-2 border-border -mt-7 relative z-10 shadow-md overflow-hidden flex items-center justify-center">
          {item.logo ? (
            <img src={item.logo} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isEmpresa ? "bg-secondary/20" : "bg-primary/10"}`}>
              {isEmpresa
                ? <Store className="w-6 h-6 text-secondary" />
                : <Users className="w-6 h-6 text-primary" />
              }
            </div>
          )}
        </div>

        {/* Nome */}
        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{item.specialty}</p>
          {item.location && item.location !== "Angola" && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
              <MapPin className="w-3 h-3" /> {item.location}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-1 mt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-secondary fill-secondary" />
            <span className="font-bold text-foreground">{item.rating}</span>
            <span>({item.reviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{fmt(item.visits)} visitas</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{fmt(item.followers)} seguidores</span>
          </div>
          {item.products > 0 && (
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>{fmt(item.products)} produtos</span>
            </div>
          )}
        </div>

        {/* Botão */}
        <button className={`w-full mt-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition ${
          isEmpresa
            ? "bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30"
            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
        }`}>
          Ver {isEmpresa ? "empresa" : "perfil"} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
    <div className="h-28 bg-muted" />
    <div className="p-3 pt-0">
      <div className="w-14 h-14 rounded-xl bg-muted -mt-7 mb-2" />
      <div className="h-3 bg-muted rounded w-3/4 mb-1" />
      <div className="h-2 bg-muted rounded w-1/2 mb-3" />
      <div className="grid grid-cols-2 gap-1">
        {[...Array(4)].map((_, i) => <div key={i} className="h-2 bg-muted rounded" />)}
      </div>
      <div className="h-8 bg-muted rounded-xl mt-3" />
    </div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────
const LojasVerificadas = () => {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoFiltro>("todos");
  const [search, setSearch] = useState("");

  // Paginação separada para vendedores e empresas
  const [sellerPage, setSellerPage] = useState(0);
  const [companyPage, setCompanyPage] = useState(0);
  const [sellers, setSellers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [sellersDone, setSellersDone] = useState(false);
  const [companiesDone, setCompaniesDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Carregamento inicial
  useEffect(() => {
    const load = async () => {
      setLoadingMore(true);
      const [s, c] = await Promise.all([
        fetchVerifiedSellers(0),
        fetchVerifiedCompanies(0),
      ]);
      setSellers(s);
      setCompanies(c);
      if (s.length < PAGE_SIZE) setSellersDone(true);
      if (c.length < PAGE_SIZE) setCompaniesDone(true);
      setLoadingMore(false);
    };
    load();
  }, []);

  // Carregar mais
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const needSellers = (tipo === "todos" || tipo === "vendedores") && !sellersDone;
    const needCompanies = (tipo === "todos" || tipo === "empresas") && !companiesDone;
    if (!needSellers && !needCompanies) return;

    setLoadingMore(true);
    const nextSellerPage = sellerPage + 1;
    const nextCompanyPage = companyPage + 1;

    const [newS, newC] = await Promise.all([
      needSellers ? fetchVerifiedSellers(nextSellerPage) : Promise.resolve([]),
      needCompanies ? fetchVerifiedCompanies(nextCompanyPage) : Promise.resolve([]),
    ]);

    if (needSellers) {
      setSellers(prev => [...prev, ...newS]);
      setSellerPage(nextSellerPage);
      if (newS.length < PAGE_SIZE) setSellersDone(true);
    }
    if (needCompanies) {
      setCompanies(prev => [...prev, ...newC]);
      setCompanyPage(nextCompanyPage);
      if (newC.length < PAGE_SIZE) setCompaniesDone(true);
    }
    setLoadingMore(false);
  }, [loadingMore, sellersDone, companiesDone, sellerPage, companyPage, tipo]);

  // Intersection Observer para infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // Lista final filtrada
  const items = useMemo(() => {
    let list: any[] = [];
    if (tipo === "todos" || tipo === "vendedores") list = [...list, ...sellers];
    if (tipo === "todos" || tipo === "empresas") list = [...list, ...companies];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.specialty.toLowerCase().includes(q));
    }
    return list;
  }, [tipo, sellers, companies, search]);

  const hasMore = (tipo !== "empresas" && !sellersDone) || (tipo !== "vendedores" && !companiesDone);

  const totalVerificados = sellers.length + companies.length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#5C3A1E] via-[#4a2e16] to-[#3a2412] pt-8 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-secondary rounded-full animate-pulse"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="w-16 h-16 bg-secondary/20 border border-secondary/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BadgeCheck className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Parceiros Verificados</h1>
          <p className="text-[#d9bfa5] text-sm max-w-xs mx-auto mb-4">
            Vendedores e empresas com identidade confirmada, qualidade garantida e suporte dedicado.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Identidade confirmada
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <Sparkles className="w-3.5 h-3.5 text-secondary" /> Qualidade garantida
            </span>
          </div>
        </div>
      </div>

      {/* Search + Filtros */}
      <div className="container mx-auto max-w-4xl px-3 -mt-8 relative z-10">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar parceiros verificados..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Filtros tipo */}
          <div className="flex gap-2">
            {([
              { key: "todos", label: "Todos", icon: BadgeCheck },
              { key: "vendedores", label: "Vendedores", icon: Users },
              { key: "empresas", label: "Empresas", icon: Store },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTipo(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition ${
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
      <div className="container mx-auto max-w-4xl px-3 mt-5 mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length > 0 ? (
            <><span className="font-bold text-foreground">{items.length}</span> parceiros encontrados</>
          ) : ""}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Vendedores
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Empresas
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto max-w-4xl px-3">
        {items.length === 0 && !loadingMore ? (
          <div className="text-center py-16">
            <BadgeCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum parceiro verificado encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <LojaCard
                key={`${item.tipo}-${item.id}`}
                item={item}
                onClick={() => navigate(item.tipo === "empresa" ? `/empresa/${item.id}` : `/vendedor/${item.id}`)}
              />
            ))}
            {/* Skeletons enquanto carrega mais */}
            {loadingMore && [...Array(3)].map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
          </div>
        )}

        {/* Sentinel para infinite scroll */}
        {hasMore && <div ref={sentinelRef} className="h-10 mt-4" />}

        {/* Fim da lista */}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-2">
            <BadgeCheck className="w-4 h-4 text-primary" />
            Todos os parceiros verificados foram carregados
          </p>
        )}
      </div>

    </div>
  );
};

export default LojasVerificadas;
