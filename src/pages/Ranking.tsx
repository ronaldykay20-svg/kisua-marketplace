import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Crown, Medal, Award, Star, ChevronLeft, ChevronRight, ShoppingCart, Loader2 } from "lucide-react";
import { useSellerRanking } from "@/hooks/useSalesCount";

const ITEMS_PER_PAGE = 10;

const Ranking = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: sellers = [], isLoading } = useSellerRanking();

  const filtered = searchQuery
    ? sellers.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sellers;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const top3 = sellers.slice(0, 3);
  const top3Labels = ["Mais Vendas", "2º Lugar", "3º Lugar"];
  const top3Colors = ["from-primary to-primary/80", "from-muted-foreground to-muted-foreground/80", "from-amber-700 to-amber-600"];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-secondary" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-secondary/10 text-secondary border-secondary/30";
    if (rank === 2) return "bg-muted text-muted-foreground border-border";
    if (rank === 3) return "bg-amber-700/10 text-amber-700 border-amber-700/30";
    return "bg-muted text-foreground border-border";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-primary-foreground tracking-tight">RANKING</h1>
          <button className="text-primary-foreground relative">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-black text-foreground">Ranking de Vendedores</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar vendedor..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-card border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Top 3 */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {top3.map((seller: any, i: number) => (
                  <div
                    key={seller.id}
                    onClick={() => navigate(`/vendedor/${seller.id}`)}
                    className="bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-lg transition group"
                  >
                    <div className={`bg-gradient-to-r ${top3Colors[i]} px-3 py-2`}>
                      <span className="text-xs font-black text-primary-foreground uppercase tracking-wide">{top3Labels[i]}</span>
                    </div>
                    <div className="p-4 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-muted border-2 border-border">
                        <img
                          src={seller.logo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"}
                          alt={seller.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm font-bold text-foreground text-center line-clamp-1">{seller.name}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
                        <span className="text-xs font-semibold text-foreground">{seller.rating}</span>
                        <span className="text-[10px] text-muted-foreground">({seller.reviews_count} avaliações)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-semibold">{seller.sales} vendas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            <div>
              <h2 className="text-lg font-black text-foreground mb-3 uppercase tracking-tight">Top Vendedores</h2>
              <div className="bg-card rounded-card border border-border overflow-hidden">
                <div className="grid grid-cols-[48px_1fr_100px_80px] md:grid-cols-[60px_1fr_150px_100px] bg-primary text-primary-foreground">
                  <div className="px-3 py-3 text-xs font-black uppercase">#</div>
                  <div className="px-3 py-3 text-xs font-black uppercase">Vendedor</div>
                  <div className="px-3 py-3 text-xs font-black uppercase text-center">Vendas</div>
                  <div className="px-3 py-3 text-xs font-black uppercase text-center">Rating</div>
                </div>

                {paginated.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">Nenhum vendedor encontrado.</p>
                ) : (
                  paginated.map((seller: any, i: number) => {
                    const rank = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                    return (
                      <div
                        key={seller.id}
                        onClick={() => navigate(`/vendedor/${seller.id}`)}
                        className={`grid grid-cols-[48px_1fr_100px_80px] md:grid-cols-[60px_1fr_150px_100px] items-center cursor-pointer hover:bg-muted/50 transition ${
                          i !== paginated.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <div className="px-3 py-3 flex items-center justify-center">
                          <span className={`w-8 h-8 rounded-card border flex items-center justify-center text-sm font-black ${getRankColor(rank)}`}>
                            {rank}
                          </span>
                        </div>
                        <div className="px-3 py-3 flex items-center gap-3">
                          <img
                            src={seller.logo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"}
                            alt={seller.name}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">{seller.name}</span>
                            {getRankIcon(rank)}
                          </div>
                        </div>
                        <div className="px-3 py-3 text-center">
                          <span className="text-xs font-semibold text-muted-foreground">{seller.sales} vendas</span>
                        </div>
                        <div className="px-3 py-3 text-center">
                          <span className="text-sm font-black text-primary">{seller.rating}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  <span className="text-xs text-muted-foreground mr-2">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-card text-xs font-bold transition ${
                        currentPage === i + 1
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Ranking;
