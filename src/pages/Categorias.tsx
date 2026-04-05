import { useState } from "react";
import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint, ChevronRight, Plus } from "lucide-react";
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

const subcategories: Record<string, string[]> = {
  "Electrónicos": ["Smartphones", "Tablets", "Computadores", "Áudio", "TV & Vídeo", "Câmeras", "Acessórios"],
  "Moda": ["Feminino", "Masculino", "Calçado", "Acessórios", "Infantil"],
  "Casa & Jardim": ["Mobília", "Decoração", "Ferramentas", "Jardim", "Iluminação"],
  "Desporto": ["Fitness", "Futebol", "Natação", "Corrida", "Ciclismo"],
  "Saúde & Beleza": ["Skincare", "Maquiagem", "Perfumes", "Cabelo", "Suplementos"],
};

const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => ({ name: c.name, image: c.image_url || "" }))
    : staticCategories;

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 flex gap-0">
        {/* Left sidebar - category list */}
        <aside className="w-28 md:w-48 flex-shrink-0 border-r border-border bg-card">
          {categories.map((cat: any) => {
            const Icon = iconMap[cat.name] || ShoppingBag;
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                className={`w-full flex items-center gap-2 px-2 py-3 text-left border-b border-border/50 transition ${
                  isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[11px] md:text-xs leading-tight ${isActive ? "font-bold text-primary" : "font-medium text-foreground"}`}>{cat.name}</span>
              </button>
            );
          })}
        </aside>

        {/* Right content */}
        <div className="flex-1 py-3 px-3">
          {selectedCategory ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground">{selectedCategory}</h2>
                <button onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}`)}
                  className="text-[11px] text-primary font-semibold flex items-center gap-0.5">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {/* Subcategories grid */}
              <div className="grid grid-cols-3 gap-3">
                {(subcategories[selectedCategory] || ["Todos"]).map(sub => (
                  <button key={sub} onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}`)}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center group-hover:border-primary/50 transition">
                      <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-primary transition" />
                    </div>
                    <span className="text-[10px] text-foreground text-center leading-tight">{sub}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-foreground mb-3">Todas as Categorias</h2>
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat: any) => {
                  const Icon = iconMap[cat.name] || ShoppingBag;
                  return (
                    <button key={cat.name} onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                      className="flex flex-col items-center gap-1.5 group">
                      {cat.image ? (
                        <div className="w-14 h-14 rounded-full overflow-hidden border border-border">
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-[10px] text-foreground text-center leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Categorias;
