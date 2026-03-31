import { CheckCircle, Star } from "lucide-react";
import store1 from "@/assets/store-1.png";
import store2 from "@/assets/store-2.png";
import store3 from "@/assets/store-3.png";

const stores = [
  { id: 1, name: "TechZone Angola", logo: store1, category: "Electrónicos", rating: 4.8, products: 124, followers: "12.5k" },
  { id: 2, name: "Fashian Boutique", logo: store2, category: "Moda", rating: 4.9, products: 89, followers: "8.3k" },
  { id: 3, name: "AutoPremium LDA", logo: store3, category: "Veículos", rating: 4.7, products: 56, followers: "6.1k" },
  { id: 4, name: "CasaDecor Angola", logo: store1, category: "Casa & Jardim", rating: 4.6, products: 210, followers: "4.7k" },
];

const VerifiedStores = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Páginas Verificadas</h2>
        </div>
        <a href="/empresas" className="text-xs font-semibold text-primary">Ver todas →</a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {stores.map((store) => (
          <div key={store.id} className="bg-card rounded-card border border-border p-3 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-11 h-11 rounded-card overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                <img src={store.logo} alt={store.name} className="w-9 h-9 object-contain" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs font-bold text-foreground truncate">{store.name}</h3>
                  <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                </div>
                <p className="text-[10px] text-muted-foreground">{store.category}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2.5">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-secondary fill-secondary" /> {store.rating}
              </span>
              <span>{store.products} produtos</span>
              <span>{store.followers} seguidores</span>
            </div>
            <button className="w-full py-1.5 rounded-card text-[10px] font-bold text-primary-foreground bg-primary hover:brightness-110 transition">
              Seguir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VerifiedStores;
