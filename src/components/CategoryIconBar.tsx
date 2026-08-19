import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

// ─────────────────────────────────────────────────────────────────────────
// Faixa de categorias — ícones em scroll horizontal, logo abaixo do
// cabeçalho. É a primeira coisa que aparece depois do header: só texto e
// ícones vetoriais (lucide-react), zero imagens, zero peso. Dá ação
// imediata ao utilizador antes mesmo da grelha de produtos carregar —
// é o mesmo truque que Shein/AliExpress usam para a home "parecer" rápida.
// ─────────────────────────────────────────────────────────────────────────

const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home, "Moda": ShoppingBag,
  "Casa & Jardim": Wrench, "Desporto": Dumbbell, "Bebé & Criança": Baby, "Saúde": HeartPulse,
  "Informática": Monitor, "Gaming": Gamepad2, "Jóias": Gem, "Viagens": Plane,
  "Alimentação": Utensils, "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
  "Saúde & Beleza": HeartPulse, "Jóias & Relógios": Gem,
};

const staticCategories = [
  "Electrónicos", "Moda", "Casa & Jardim", "Desporto", "Veículos", "Informática",
  "Bebé & Criança", "Saúde & Beleza", "Gaming", "Jóias & Relógios", "Imóveis", "Animais",
];

const CategoryIconBar = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => c.name)
    : staticCategories;

  return (
    <section className="bg-white">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-3 pt-3 pb-2 snap-x">
        {categories.map((name: string) => {
          const Icon = iconMap[name] || ShoppingBag;
          return (
            <button
              key={name}
              onClick={() => navigate(`/categoria/${encodeURIComponent(name)}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[64px] snap-start active:opacity-60 transition-opacity"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#F7F0E6" }}
              >
                <Icon className="w-6 h-6" style={{ color: "#4A2E0A" }} />
              </div>
              <span
                className="text-[10.5px] font-semibold text-center leading-tight line-clamp-2"
                style={{ color: "#4A2E0A" }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryIconBar;
