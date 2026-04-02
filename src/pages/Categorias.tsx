import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const categories = [
  { name: "Electrónicos", icon: Smartphone, color: "bg-blue-50 text-primary", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop" },
  { name: "Veículos", icon: Car, color: "bg-red-50 text-destructive", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop" },
  { name: "Imóveis", icon: Home, color: "bg-green-50 text-walmart-green", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop" },
  { name: "Moda", icon: ShoppingBag, color: "bg-yellow-50 text-walmart-orange", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop" },
  { name: "Casa & Jardim", icon: Wrench, color: "bg-purple-50 text-purple-600", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop" },
  { name: "Desporto", icon: Dumbbell, color: "bg-orange-50 text-walmart-orange", image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=200&h=200&fit=crop" },
  { name: "Bebé & Criança", icon: Baby, color: "bg-pink-50 text-pink-500", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop" },
  { name: "Saúde & Beleza", icon: HeartPulse, color: "bg-emerald-50 text-emerald-600", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop" },
  { name: "Informática", icon: Monitor, color: "bg-cyan-50 text-cyan-600", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
  { name: "Gaming", icon: Gamepad2, color: "bg-indigo-50 text-indigo-600", image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop" },
  { name: "Jóias & Relógios", icon: Gem, color: "bg-amber-50 text-amber-600", image: "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop" },
  { name: "Viagens", icon: Plane, color: "bg-sky-50 text-sky-600", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop" },
  { name: "Alimentação", icon: Utensils, color: "bg-lime-50 text-lime-600", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=200&h=200&fit=crop" },
  { name: "Empregos", icon: Briefcase, color: "bg-slate-50 text-slate-600", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=200&h=200&fit=crop" },
  { name: "Educação", icon: BookOpen, color: "bg-teal-50 text-teal-600", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop" },
  { name: "Animais", icon: PawPrint, color: "bg-rose-50 text-rose-500", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop" },
];

const Categorias = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4">
        <h1 className="text-lg font-bold text-foreground mb-4">Todas as Categorias</h1>
        <div className="space-y-1">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
            >
              <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded-full object-cover border border-border" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
              <span className="text-xs text-muted-foreground">Ver todos →</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Categorias;
