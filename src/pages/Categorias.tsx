import { useState } from "react";
import { Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home, "Moda": ShoppingBag,
  "Casa & Jardim": Wrench, "Desporto": Dumbbell, "Bebé & Criança": Baby,
  "Saúde & Beleza": HeartPulse, "Saúde": HeartPulse, "Informática": Monitor,
  "Gaming": Gamepad2, "Jóias & Relógios": Gem, "Jóias": Gem, "Viagens": Plane,
  "Alimentação": Utensils, "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
};

/* Cor de fundo principal por categoria */
const categoryBgColors: Record<string, string> = {
  "Electrónicos": "linear-gradient(160deg, #1565C0 0%, #0D47A1 100%)",
  "Veículos":     "linear-gradient(160deg, #B71C1C 0%, #7F0000 100%)",
  "Imóveis":      "linear-gradient(160deg, #1B5E20 0%, #003300 100%)",
  "Moda":         "linear-gradient(160deg, #F57F17 0%, #E65100 100%)",
  "Casa & Jardim":"linear-gradient(160deg, #4A148C 0%, #1A0030 100%)",
  "Desporto":     "linear-gradient(160deg, #E65100 0%, #BF360C 100%)",
  "Bebé & Criança":"linear-gradient(160deg, #880E4F 0%, #4A0030 100%)",
  "Saúde & Beleza":"linear-gradient(160deg, #00695C 0%, #004D40 100%)",
  "Informática":  "linear-gradient(160deg, #006064 0%, #003D40 100%)",
  "Gaming":       "linear-gradient(160deg, #311B92 0%, #1A0070 100%)",
  "Jóias & Relógios":"linear-gradient(160deg, #F9A825 0%, #E65100 100%)",
  "Viagens":      "linear-gradient(160deg, #01579B 0%, #003060 100%)",
  "Alimentação":  "linear-gradient(160deg, #33691E 0%, #1B4000 100%)",
  "Empregos":     "linear-gradient(160deg, #37474F 0%, #102027 100%)",
  "Educação":     "linear-gradient(160deg, #004D40 0%, #002020 100%)",
  "Animais":      "linear-gradient(160deg, #BF360C 0%, #7F1500 100%)",
};

const defaultBg = "linear-gradient(160deg, #4A2E0A 0%, #2A1200 100%)";

const staticCategories = [
  { name: "Electrónicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop" },
  { name: "Veículos",     image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop" },
  { name: "Imóveis",      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=200&fit=crop" },
  { name: "Moda",         image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop" },
  { name: "Casa & Jardim",image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop" },
  { name: "Desporto",     image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=200&h=200&fit=crop" },
  { name: "Bebé & Criança",image:"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop" },
  { name: "Saúde & Beleza",image:"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop" },
  { name: "Informática",  image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
  { name: "Gaming",       image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=200&h=200&fit=crop" },
  { name: "Jóias & Relógios",image:"https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=200&h=200&fit=crop" },
  { name: "Viagens",      image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop" },
  { name: "Alimentação",  image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=200&h=200&fit=crop" },
  { name: "Empregos",     image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=200&h=200&fit=crop" },
  { name: "Educação",     image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop" },
  { name: "Animais",      image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop" },
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
    ? dbCategories.map((c: any) => ({
        name: c.name,
        image: c.image_url || staticCategories.find(s => s.name === c.name)?.image || "",
      }))
    : staticCategories;

  /* Fundo dinâmico conforme a categoria seleccionada */
  const currentBg = selectedCategory
    ? (categoryBgColors[selectedCategory] || defaultBg)
    : defaultBg;

  return (
    <div
      className="min-h-screen pb-14 md:pb-0 transition-all duration-500"
      style={{ background: currentBg }}
    >
      {/* Espaço para o navbar transparente (altura fixa do navbar: 56px) */}
      <div style={{ paddingTop: "56px" }}>
        <div className="flex gap-0">

          {/* ── Sidebar esquerda ── */}
          <aside
            className="w-28 md:w-48 flex-shrink-0 overflow-y-auto"
            style={{
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(8px)",
              minHeight: "calc(100vh - 56px)",
            }}
          >
            {categories.map((cat: any) => {
              const Icon = iconMap[cat.name] || ShoppingBag;
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                  className="w-full flex items-center gap-2 px-2 py-3 text-left border-b transition"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                    borderLeft: isActive ? "3px solid #fff" : "3px solid transparent",
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.65)" }}
                  />
                  <span
                    className="text-[11px] md:text-xs leading-tight"
                    style={{
                      color: isActive ? "#fff" : "rgba(255,255,255,0.75)",
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* ── Conteúdo direito ── */}
          <div
            className="flex-1 py-4 px-3"
            style={{ background: "rgba(0,0,0,0.10)" }}
          >
            {selectedCategory ? (
              <>
                {/* Cabeçalho da categoria seleccionada */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-white">{selectedCategory}</h2>
                  <button
                    onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}`)}
                    className="text-[11px] font-semibold flex items-center gap-0.5"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Banner da categoria */}
                {(() => {
                  const catData = categories.find((c: any) => c.name === selectedCategory);
                  return catData?.image ? (
                    <div className="w-full h-28 rounded-2xl overflow-hidden mb-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                      <img src={catData.image} alt={selectedCategory} className="w-full h-full object-cover" />
                    </div>
                  ) : null;
                })()}

                {/* Subcategorias */}
                <div className="grid grid-cols-3 gap-3">
                  {(subcategories[selectedCategory] || ["Todos os produtos"]).map(sub => (
                    <button
                      key={sub}
                      onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}`)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center transition"
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          border: "2px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        <ShoppingBag className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] text-white text-center leading-tight font-medium">{sub}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Todas as categorias */}
                <h2 className="text-sm font-black text-white mb-4">Todas as Categorias</h2>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat: any) => {
                    const Icon = iconMap[cat.name] || ShoppingBag;
                    return (
                      <button
                        key={cat.name}
                        onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        {cat.image ? (
                          <div
                            className="w-14 h-14 rounded-full overflow-hidden"
                            style={{ border: "2px solid rgba(255,255,255,0.4)" }}
                          >
                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center"
                            style={{
                              background: "rgba(255,255,255,0.15)",
                              border: "2px solid rgba(255,255,255,0.3)",
                            }}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="text-[10px] text-white text-center leading-tight font-medium">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Categorias;
