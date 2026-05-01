import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, ChevronDown, Star, CheckCircle, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type Product } from "@/components/ProductCard";
import MobileProductCard from "@/components/MobileProductCard";
import { useIsMobile } from "@/hooks/use-mobile";

const searchTabs = ["Produtos", "Vendedores", "Empresas"];
const sortOptions = ["Mais relevantes", "Menor preço", "Maior preço", "Mais vendidos", "Melhor avaliação"];

const trendingSearches = ["iPhone", "Samsung", "AirPods", "PlayStation", "Smart TV"];

const ITEMS_PER_PAGE = 12;

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState("Produtos");
  const [sortBy, setSortBy] = useState("Mais relevantes");
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [freeShipping, setFreeShipping] = useState<string>("Todos");
  const isMobile = useIsMobile();

  const effectiveQuery = query.trim();

  // ── Products from DB ──
  const { data: dbProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["search_products", effectiveQuery, sortBy, priceMin, priceMax, freeShipping],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (effectiveQuery) q = q.or(`title.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%`);
      if (priceMin) q = q.gte("price", Number(priceMin));
      if (priceMax) q = q.lte("price", Number(priceMax));
      if (freeShipping === "Sim") q = q.eq("free_shipping", true);
      if (sortBy === "Menor preço") q = q.order("price", { ascending: true });
      else if (sortBy === "Maior preço") q = q.order("price", { ascending: false });
      else if (sortBy === "Mais vendidos") q = q.order("sales_count", { ascending: false });
      else if (sortBy === "Melhor avaliação") q = q.order("rating", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      q = q.limit(200);
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data || []).map((p: any) => p.id);
      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase.from("product_media").select("product_id, url").in("product_id", ids).eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }
      return (data || []).map((p: any) => ({ ...p, cover_url: coverMap[p.id] }));
    },
  });

  // ── Sellers / Empresas from DB ──
  const { data: dbSellers = [], isLoading: loadingSellers } = useQuery({
    queryKey: ["search_sellers", effectiveQuery],
    queryFn: async () => {
      let q = supabase.from("sellers").select("*").eq("is_active", true);
      if (effectiveQuery) q = q.or(`name.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%`);
      q = q.order("rating", { ascending: false }).limit(50);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const products: Product[] = useMemo(
    () => dbProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: formatPrice(p.price),
      oldPrice: p.old_price ? formatPrice(p.old_price) : undefined,
      discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
      image: p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
      rating: p.rating || undefined,
      reviews: p.total_reviews || undefined,
      freeShipping: p.free_shipping || false,
      badge: p.badge || undefined,
    })),
    [dbProducts]
  );

  const vendedores = dbSellers.filter((s: any) => s.type === "individual");
  const empresas = dbSellers.filter((s: any) => s.type === "company");

  const totalCount = activeTab === "Produtos" ? products.length : activeTab === "Vendedores" ? vendedores.length : empresas.length;
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchParams({ q: searchQuery });
  };

  const setTrending = (term: string) => {
    setSearchQuery(term);
    setCurrentPage(1);
    setSearchParams({ q: term });
  };

  const renderSellerCard = (s: any) => (
    <div
      key={s.id}
      onClick={() => navigate(`/vendedor/${s.id}`)}
      className="bg-card rounded-card border border-border p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
    >
      {s.logo_url ? (
        <img src={s.logo_url} alt={s.name} className="w-16 h-16 rounded-card object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-card bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">{s.name.charAt(0)}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground truncate">{s.name}</h3>
          {s.is_verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
          <Star className="w-3 h-3 text-secondary fill-secondary" /> {Number(s.rating || 0).toFixed(1)}
        </div>
        {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
        <button className="mt-1.5 px-3 py-1 rounded-card bg-primary text-primary-foreground text-[10px] font-bold hover:brightness-110 transition">
          Visitar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} className="text-primary-foreground flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <form onSubmit={handleSearch} className="flex-1 flex">
            <div className="relative flex-1 flex">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full py-2 pl-3 pr-10 rounded-l-full bg-primary-foreground text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button type="submit" className="px-3.5 bg-secondary rounded-r-full flex items-center justify-center hover:brightness-110 transition flex-shrink-0">
                <Search className="w-5 h-5 text-secondary-foreground" />
              </button>
            </div>
          </form>
          <button onClick={() => navigate("/carrinho")} className="text-primary-foreground relative flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="text-lg font-black text-foreground">{totalCount}</span> Resultados
            {effectiveQuery && <> para "<span className="font-bold text-foreground">{effectiveQuery}</span>"</>}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 border-b border-border">
            {searchTabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtrar
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                {sortBy} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showSort && (
                <div className="absolute right-0 top-full mt-1 bg-card rounded-card border border-border shadow-lg z-20 min-w-[180px]">
                  {sortOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSort(false); setCurrentPage(1); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition ${sortBy === opt ? "font-bold text-primary" : "text-foreground"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="bg-card rounded-card border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço mín.</label>
              <input value={priceMin} onChange={e => { setPriceMin(e.target.value); setCurrentPage(1); }} placeholder="0" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço máx.</label>
              <input value={priceMax} onChange={e => { setPriceMax(e.target.value); setCurrentPage(1); }} placeholder="1000000" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Frete grátis</label>
              <select value={freeShipping} onChange={e => { setFreeShipping(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none">
                <option>Todos</option>
                <option>Sim</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "Produtos" && (
          <>
            {loadingProducts ? (
              <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Nenhum produto encontrado{effectiveQuery && ` para "${effectiveQuery}"`}.</p>
              </div>
            ) : isMobile ? (
              <div className="columns-2 gap-1.5 space-y-1.5">
                {paginatedProducts.map((p, i) => (
                  <MobileProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {paginatedProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
                <span className="text-xs text-muted-foreground mr-2">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 8) }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-card text-xs font-bold transition ${currentPage === i + 1 ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "Empresas" && (
          loadingSellers ? <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p> :
          empresas.length === 0 ? (
            <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{empresas.map(renderSellerCard)}</div>
          )
        )}

        {activeTab === "Vendedores" && (
          loadingSellers ? <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p> :
          vendedores.length === 0 ? (
            <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhum vendedor encontrado.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{vendedores.map(renderSellerCard)}</div>
          )
        )}

        <div className="bg-card rounded-card border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-tight">Mais Pesquisados</h3>
          <div className="space-y-1">
            {trendingSearches.map(term => (
              <button
                key={term}
                onClick={() => setTrending(term)}
                className="w-full flex items-center justify-between px-2 py-2 rounded-card hover:bg-muted transition text-xs text-foreground"
              >
                {term} <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
