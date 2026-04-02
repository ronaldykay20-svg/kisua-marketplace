import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useCategories } from "@/hooks/useSupabaseData";

const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home, "Moda": ShoppingBag,
  "Casa & Jardim": Wrench, "Desporto": Dumbbell, "Bebé & Criança": Baby,
  "Saúde & Beleza": HeartPulse, "Saúde": HeartPulse, "Informática": Monitor,
  "Gaming": Gamepad2, "Jóias & Relógios": Gem, "Jóias": Gem, "Viagens": Plane,
  "Alimentação": Utensils, "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
};

const staticCategories = [
  { name: "Electrónicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop" },
  { name: "Veículos", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop" },
  { name: "Imóveis", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop" },
  { name: "Moda", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop" },
  { name: "Casa & Jardim", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop" },
  { name: "Desporto", image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=200&h=200&fit=crop" },
  { name: "Bebé & Criança", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop" },
  { name: "Saúde & Beleza", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop" },
  { name: "Informática", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
  { name: "Gaming", image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop" },
  { name: "Jóias & Relógios", image: "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop" },
  { name: "Viagens", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop" },
  { name: "Alimentação", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=200&h=200&fit=crop" },
  { name: "Empregos", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=200&h=200&fit=crop" },
  { name: "Educação", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop" },
  { name: "Animais", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop" },
];

const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => ({ name: c.name, image: c.image_url || "" }))
    : staticCategories;

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4">
        <h1 className="text-lg font-bold text-foreground mb-4">Todas as Categorias</h1>
        <div className="space-y-1">
          {categories.map((cat: any) => {
            const Icon = iconMap[cat.name] || ShoppingBag;
            return (
              <button key={cat.name} onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
                <span className="text-xs text-muted-foreground">Ver todos →</span>
              </button>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Categorias;
