import { motion } from "framer-motion";
import { CheckCircle, Star } from "lucide-react";
import store1 from "@/assets/store-1.png";
import store2 from "@/assets/store-2.png";
import store3 from "@/assets/store-3.png";

const stores = [
  { id: 1, name: "TechZone Angola", logo: store1, category: "Electrónicos", rating: 4.8, products: 124, verified: true },
  { id: 2, name: "Fashian Boutique", logo: store2, category: "Moda", rating: 4.9, products: 89, verified: true },
  { id: 3, name: "AutoPremium LDA", logo: store3, category: "Veículos", rating: 4.7, products: 56, verified: true },
];

const VerifiedStores = () => {
  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-heading text-foreground">Páginas Verificadas</h2>
          <button className="text-xs font-semibold text-primary">Ver todas →</button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0 w-[260px] bg-card rounded-2xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-all"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  <img src={store.logo} alt={store.name} className="w-10 h-10 object-contain" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{store.name}</h3>
                    {store.verified && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{store.category}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-accent fill-accent" /> {store.rating}
                </span>
                <span>{store.products} produtos</span>
              </div>

              <button className="w-full mt-3 py-2 rounded-xl text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 transition-colors">
                Ver loja
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VerifiedStores;
