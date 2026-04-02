import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home, "Moda": ShoppingBag,
  "Casa & Jardim": Wrench, "Desporto": Dumbbell, "Bebé & Criança": Baby, "Saúde": HeartPulse,
  "Informática": Monitor, "Gaming": Gamepad2, "Jóias": Gem, "Viagens": Plane,
  "Alimentação": Utensils, "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
  "Saúde & Beleza": HeartPulse, "Jóias & Relógios": Gem,
};

const colorMap: Record<string, string> = {
  "Electrónicos": "bg-blue-50 text-primary", "Veículos": "bg-red-50 text-walmart-red",
  "Imóveis": "bg-green-50 text-walmart-green", "Moda": "bg-yellow-50 text-walmart-orange",
  "Casa & Jardim": "bg-purple-50 text-purple-600", "Desporto": "bg-orange-50 text-walmart-orange",
  "Bebé & Criança": "bg-pink-50 text-pink-500", "Saúde": "bg-emerald-50 text-emerald-600",
  "Informática": "bg-cyan-50 text-cyan-600", "Gaming": "bg-indigo-50 text-indigo-600",
  "Jóias": "bg-amber-50 text-amber-600", "Viagens": "bg-sky-50 text-sky-600",
  "Alimentação": "bg-lime-50 text-lime-600", "Empregos": "bg-slate-50 text-slate-600",
  "Educação": "bg-teal-50 text-teal-600", "Animais": "bg-rose-50 text-rose-500",
  "Saúde & Beleza": "bg-emerald-50 text-emerald-600", "Jóias & Relógios": "bg-amber-50 text-amber-600",
};

const staticCategories = [
  "Electrónicos", "Veículos", "Imóveis", "Moda", "Casa & Jardim", "Desporto",
  "Bebé & Criança", "Saúde", "Informática", "Gaming", "Jóias", "Viagens",
  "Alimentação", "Empregos", "Educação", "Animais",
];

const CategoriesGrid = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => c.name)
    : staticCategories;

  return (
    <section className="container mx-auto px-4 py-5">
      <h2 className="text-base font-bold text-foreground mb-3">Categorias</h2>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {categories.map((name: string) => {
          const Icon = iconMap[name] || ShoppingBag;
          const color = colorMap[name] || "bg-muted text-foreground";
          return (
            <button key={name} onClick={() => navigate(`/categoria/${encodeURIComponent(name)}`)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-card bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-card flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2">{name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoriesGrid;
