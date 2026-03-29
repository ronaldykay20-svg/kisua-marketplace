import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";

const rankingItems = [
  { rank: 1, name: "TechZone Angola", sales: "2.340 vendas", rating: 4.9, icon: Crown, color: "text-secondary" },
  { rank: 2, name: "ModaAO Store", sales: "1.890 vendas", rating: 4.8, icon: Medal, color: "text-gray-400" },
  { rank: 3, name: "AutoPremium LDA", sales: "1.450 vendas", rating: 4.7, icon: Medal, color: "text-amber-700" },
  { rank: 4, name: "CasaDecor Angola", sales: "1.200 vendas", rating: 4.6, icon: TrendingUp, color: "text-primary" },
  { rank: 5, name: "SportMax", sales: "980 vendas", rating: 4.5, icon: TrendingUp, color: "text-primary" },
];

const RankingSection = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-card flex items-center justify-center bg-secondary">
            <Trophy className="w-4 h-4 text-secondary-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">Ranking de Vendedores</h2>
        </div>
        <a href="#" className="text-xs font-semibold text-primary">Ver ranking →</a>
      </div>

      <div className="bg-card rounded-card border border-border overflow-hidden">
        {rankingItems.map((item, i) => (
          <div key={item.rank} className={`flex items-center gap-3 p-3 ${i !== rankingItems.length - 1 ? "border-b border-border" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}>
            <div className="w-8 h-8 rounded-card bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-foreground">{item.rank}</span>
            </div>
            <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
              <p className="text-[10px] text-muted-foreground">{item.sales} • ⭐ {item.rating}</p>
            </div>
            <button className="px-3 py-1.5 rounded-card text-[10px] font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-colors flex-shrink-0">
              Ver loja
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RankingSection;
