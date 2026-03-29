import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";

const categories = [
  { name: "Electrónicos", icon: Smartphone, color: "bg-blue-50 text-primary" },
  { name: "Veículos", icon: Car, color: "bg-red-50 text-walmart-red" },
  { name: "Imóveis", icon: Home, color: "bg-green-50 text-walmart-green" },
  { name: "Moda", icon: ShoppingBag, color: "bg-yellow-50 text-walmart-orange" },
  { name: "Casa & Jardim", icon: Wrench, color: "bg-purple-50 text-purple-600" },
  { name: "Desporto", icon: Dumbbell, color: "bg-orange-50 text-walmart-orange" },
  { name: "Bebé & Criança", icon: Baby, color: "bg-pink-50 text-pink-500" },
  { name: "Saúde", icon: HeartPulse, color: "bg-emerald-50 text-emerald-600" },
  { name: "Informática", icon: Monitor, color: "bg-cyan-50 text-cyan-600" },
  { name: "Gaming", icon: Gamepad2, color: "bg-indigo-50 text-indigo-600" },
  { name: "Jóias", icon: Gem, color: "bg-amber-50 text-amber-600" },
  { name: "Viagens", icon: Plane, color: "bg-sky-50 text-sky-600" },
  { name: "Alimentação", icon: Utensils, color: "bg-lime-50 text-lime-600" },
  { name: "Empregos", icon: Briefcase, color: "bg-slate-50 text-slate-600" },
  { name: "Educação", icon: BookOpen, color: "bg-teal-50 text-teal-600" },
  { name: "Animais", icon: PawPrint, color: "bg-rose-50 text-rose-500" },
];

const CategoriesGrid = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <h2 className="text-base font-bold text-foreground mb-3">Categorias</h2>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.name}
            className="flex flex-col items-center gap-1.5 p-3 rounded-card bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-card flex items-center justify-center ${cat.color}`}>
              <cat.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2">{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoriesGrid;
