import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Crown, Medal, Award, Star, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { allProducts } from "@/data/products";

const periods = ["Mês", "Dia", "Semana"];

const topProducts = [
  { label: "Mais Vendido no Mês", color: "from-primary to-primary/80", product: allProducts[0] },
  { label: "Mais Vendido na Semana", color: "from-walmart-orange to-secondary", product: allProducts[3] },
  { label: "Melhor Avaliado", color: "from-walmart-green to-accent", product: allProducts[6] },
];

const rankingProducts = [
  { rank: 1, product: allProducts[0], sales: "12.800 vendas" },
  { rank: 2, product: allProducts[1], sales: "9.500 vendas" },
  { rank: 3, product: allProducts[3], sales: "8.750 vendas" },
  { rank: 4, product: allProducts[4], sales: "7.200 vendas" },
  { rank: 5, product: allProducts[7], sales: "6.800 vendas" },
  { rank: 6, product: allProducts[5], sales: "5.400 vendas" },
  { rank: 7, product: allProducts[2], sales: "4.900 vendas" },
  { rank: 8, product: allProducts[6], sales: "4.200 vendas" },
];

const ITEMS_PER_PAGE = 6;

const Ranking = () => {
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState("Mês");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(rankingProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = rankingProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-secondary" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-5 h-5 text-walmart-orange" />;
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-secondary/10 text-secondary border-secondary/30";
    if (rank === 2) return "bg-muted text-muted-foreground border-border";
    if (rank === 3) return "bg-walmart-orange/10 text-walmart-orange border-walmart-orange/30";
    return "bg-muted text-foreground border-border";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Period tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex bg-card rounded-card border border-border overflow-hidden">
            {periods.map(period => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                className={`px-5 py-2.5 text-sm font-bold transition ${
                  activePeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-card border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Top 3 highlight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topProducts.map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(`/produto/${item.product.id}`)}
              className="bg-card rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-lg transition group"
            >
              <div className={`bg-gradient-to-r ${item.color} px-3 py-2`}>
                <span className="text-xs font-black text-primary-foreground uppercase tracking-wide">{item.label}</span>
              </div>
              <div className="p-4 flex flex-col items-center">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-card overflow-hidden mb-3 bg-muted">
                  <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <p className="text-sm font-bold text-foreground text-center line-clamp-1">{item.product.title}</p>
                {item.product.reviews && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3.5 h-3.5 text-secondary fill-secondary" />
                    <span className="text-xs font-semibold text-foreground">{item.product.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({item.product.reviews.toLocaleString()} avaliações)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 font-semibold">{rankingProducts[i]?.sales}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table ranking */}
        <div>
          <h2 className="text-lg font-black text-foreground mb-3 uppercase tracking-tight">Top Produtos do Mês</h2>
          <div className="bg-card rounded-card border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_120px_120px] md:grid-cols-[60px_1fr_150px_150px] bg-primary text-primary-foreground">
              <div className="px-3 py-3 text-xs font-black uppercase">#</div>
              <div className="px-3 py-3 text-xs font-black uppercase">Produto</div>
              <div className="px-3 py-3 text-xs font-black uppercase text-center">Vendas</div>
              <div className="px-3 py-3 text-xs font-black uppercase text-center">Preço</div>
            </div>

            {/* Table rows */}
            {paginatedProducts.map((item, i) => (
              <div
                key={item.rank}
                onClick={() => navigate(`/produto/${item.product.id}`)}
                className={`grid grid-cols-[48px_1fr_120px_120px] md:grid-cols-[60px_1fr_150px_150px] items-center cursor-pointer hover:bg-muted/50 transition ${
                  i !== paginatedProducts.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="px-3 py-3 flex items-center justify-center">
                  <span className={`w-8 h-8 rounded-card border flex items-center justify-center text-sm font-black ${getRankColor(item.rank)}`}>
                    {item.rank}
                  </span>
                </div>
                <div className="px-3 py-3 flex items-center gap-3">
                  <img src={item.product.image} alt={item.product.title} className="w-12 h-12 md:w-14 md:h-14 rounded-card object-cover flex-shrink-0" />
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{item.product.title}</span>
                    {getRankIcon(item.rank)}
                  </div>
                </div>
                <div className="px-3 py-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground">{item.sales}</span>
                </div>
                <div className="px-3 py-3 text-center">
                  <span className="text-sm font-black text-primary">{item.product.price}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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
        </div>
      </div>
    </div>
  );
};

export default Ranking;
