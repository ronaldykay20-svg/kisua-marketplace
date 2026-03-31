import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, ChevronDown, Star, CheckCircle, ShoppingCart, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { allProducts } from "@/data/products";
import ProductCard from "@/components/ProductCard";

const searchTabs = ["Produtos", "Vendedores", "Empresas"];
const sortOptions = ["Mais relevantes", "Menor preço", "Maior preço", "Mais vendidos", "Melhor avaliação"];

const empresasResults = [
  { id: 1, name: "Prime Electrónicos", products: 114, rating: 4.9, reviews: 114, image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop" },
  { id: 2, name: "Boutique Digital", products: 97, rating: 4.7, reviews: 97, image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop" },
];

const trendingSearches = ["iPhone 15 Pro", "Samsung Galaxy", "AirPods Pro", "PlayStation 5", "Smart TV 55\""];

const ITEMS_PER_PAGE = 8;

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState("Produtos");
  const [sortBy, setSortBy] = useState("Mais relevantes");
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const results = allProducts.filter(p =>
    !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const paginatedResults = results.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <button className="text-primary-foreground relative flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Results count */}
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="text-lg font-black text-foreground">{results.length}</span> Resultados encontrados
            {searchQuery && <> para "<span className="font-bold text-foreground">{searchQuery}</span>"</>}
          </p>
        </div>

        {/* Tabs + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1 border-b border-border">
            {searchTabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
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
                      onClick={() => { setSortBy(opt); setShowSort(false); }}
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

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-card rounded-card border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço mín.</label>
              <input placeholder="0 Kz" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço máx.</label>
              <input placeholder="1.000.000 Kz" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Condição</label>
              <select className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none">
                <option>Todos</option>
                <option>Novo</option>
                <option>Seminovo</option>
                <option>Usado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Frete grátis</label>
              <select className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none">
                <option>Todos</option>
                <option>Sim</option>
              </select>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === "Produtos" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {paginatedResults.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <span className="text-xs text-muted-foreground mr-2">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {empresasResults.map(emp => (
              <div
                key={emp.id}
                onClick={() => navigate(`/empresa/${emp.id}`)}
                className="bg-card rounded-card border border-border p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
              >
                <img src={emp.image} alt={emp.name} className="w-16 h-16 rounded-card object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-foreground truncate">{emp.name}</h3>
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-secondary fill-secondary" /> {emp.rating} ({emp.reviews})
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">+{emp.products} produtos</p>
                  <button className="mt-1.5 px-3 py-1 rounded-card bg-primary text-primary-foreground text-[10px] font-bold hover:brightness-110 transition">
                    Visitar Loja
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Vendedores" && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Funcionalidade em breve disponível.</p>
          </div>
        )}

        {/* Trending */}
        <div className="bg-card rounded-card border border-border p-4">
          <h3 className="text-sm font-bold text-foreground mb-2 uppercase tracking-tight">Mais Pesquisados</h3>
          <div className="space-y-1">
            {trendingSearches.map(term => (
              <button
                key={term}
                onClick={() => { setSearchQuery(term); setCurrentPage(1); }}
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
