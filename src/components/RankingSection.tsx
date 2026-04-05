import { Trophy, Medal, Crown, TrendingUp, Loader2 } from "lucide-react";
import { useSellerRanking } from "@/hooks/useSalesCount";
import { useNavigate } from "react-router-dom";

const RankingSection = () => {
  const { data: sellers = [], isLoading } = useSellerRanking();
  const navigate = useNavigate();

  const top5 = sellers.slice(0, 5);

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

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center bg-secondary">
            <Trophy className="w-4 h-4 text-secondary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Ranking de Vendedores</h2>
        </div>
        <a href="/ranking" className="text-xs font-semibold text-primary">Ver ranking →</a>
      </div>

      <div className="bg-card rounded-card border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : top5.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground">Nenhuma venda confirmada ainda.</p>
        ) : (
          top5.map((item: any, i: number) => {
            const Icon = getIcon(i + 1);
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/vendedor/${item.id}`)}
                className={`flex items-center gap-3 p-3 ${i !== top5.length - 1 ? "border-b border-border" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
              >
                <div className="w-8 h-8 rounded-card bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-foreground">{i + 1}</span>
                </div>
                <Icon className={`w-5 h-5 ${getColor(i + 1)} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{item.sales} vendas • ⭐ {item.rating}</p>
                </div>
                <button className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-colors flex-shrink-0">
                  Ver loja
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default RankingSection;
