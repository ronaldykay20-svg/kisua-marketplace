import { motion } from "framer-motion";
import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils } from "lucide-react";

const categories = [
  { name: "Veículos", icon: Car, count: "2.4k" },
  { name: "Imóveis", icon: Home, count: "1.8k" },
  { name: "Electrónicos", icon: Smartphone, count: "5.2k" },
  { name: "Moda", icon: ShoppingBag, count: "3.1k" },
  { name: "Empregos", icon: Briefcase, count: "890" },
  { name: "Desporto", icon: Dumbbell, count: "760" },
  { name: "Educação", icon: BookOpen, count: "420" },
  { name: "Alimentação", icon: Utensils, count: "1.3k" },
];

const Categories = () => {
  return (
    <section className="py-16 container mx-auto px-4">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold font-heading text-foreground">Categorias</h2>
          <p className="text-muted-foreground mt-1">Explore por categoria</p>
        </div>
        <button className="text-sm font-semibold text-primary hover:underline">
          Ver todas →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all group"
            style={{ boxShadow: 'var(--card-shadow)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <cat.icon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">{cat.name}</span>
            <span className="text-xs text-muted-foreground">{cat.count} anúncios</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default Categories;
