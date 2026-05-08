import { useState, useMemo } from "react";
import {
  Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell,
  BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor,
  Gamepad2, Gem, Plane, PawPrint, ChevronRight, MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

/* ── Cores idênticas ao Navbar ── */
const sand        = "#D4B896";
const sandDark    = "#B8956A";
const cream       = "#F7F0E6";
const brown       = "#4A2E0A";
const brownLight  = "rgba(74,46,10,0.10)";
const brownBorder = "rgba(74,46,10,0.14)";

/* ── Ícones ── */
const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home,
  "Moda": ShoppingBag, "Casa & Jardim": Wrench, "Desporto": Dumbbell,
  "Bebé & Criança": Baby, "Saúde & Beleza": HeartPulse, "Saúde": HeartPulse,
  "Informática": Monitor, "Gaming": Gamepad2, "Jóias & Relógios": Gem,
  "Jóias": Gem, "Viagens": Plane, "Alimentação": Utensils,
  "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
};

/* ── Fotos: principal (círculo) + capa (banner) ── */
const categoryImages: Record<string, { main: string; cover: string }> = {
  "Electrónicos": {
    main:  "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=200&fit=crop&auto=format",
  },
  "Veículos": {
    main:  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=200&fit=crop&auto=format",
  },
  "Imóveis": {
    main:  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&h=200&fit=crop&auto=format",
  },
  "Moda": {
    main:  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&h=200&fit=crop&auto=format",
  },
  "Casa & Jardim": {
    main:  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=200&fit=crop&auto=format",
  },
  "Desporto": {
    main:  "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=200&fit=crop&auto=format",
  },
  "Bebé & Criança": {
    main:  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=200&fit=crop&auto=format",
  },
  "Saúde & Beleza": {
    main:  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=200&fit=crop&auto=format",
  },
  "Informática": {
    main:  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=200&fit=crop&auto=format",
  },
  "Gaming": {
    main:  "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&h=200&fit=crop&auto=format",
  },
  "Jóias & Relógios": {
    main:  "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=200&fit=crop&auto=format",
  },
  "Viagens": {
    main:  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&h=200&fit=crop&auto=format",
  },
  "Alimentação": {
    main:  "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=200&fit=crop&auto=format",
  },
  "Empregos": {
    main:  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=200&fit=crop&auto=format",
  },
  "Educação": {
    main:  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&h=200&fit=crop&auto=format",
  },
  "Animais": {
    main:  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=120&h=120&fit=crop&auto=format",
    cover: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=600&h=200&fit=crop&auto=format",
  },
};

const staticCategories = Object.entries(categoryImages).map(([name, imgs]) => ({
  name,
  image: imgs.main,
  cover: imgs.cover,
}));

const subcategories: Record<string, string[]> = {
  "Electrónicos":     ["Smartphones", "Tablets", "Computadores", "Áudio", "TV & Vídeo", "Câmeras", "Acessórios"],
  "Moda":             ["Feminino", "Masculino", "Calçado", "Acessórios", "Infantil"],
  "Casa & Jardim":    ["Mobília", "Decoração", "Ferramentas", "Jardim", "Iluminação"],
  "Desporto":         ["Fitness", "Futebol", "Natação", "Corrida", "Ciclismo"],
  "Saúde & Beleza":   ["Skincare", "Maquiagem", "Perfumes", "Cabelo", "Suplementos"],
  "Veículos":         ["Carros", "Motos", "Peças", "Camiões", "Barcos"],
  "Imóveis":          ["Apartamentos", "Moradias", "Terrenos", "Escritórios", "Armazéns"],
  "Informática":      ["Laptops", "Desktops", "Periféricos", "Redes", "Impressoras"],
  "Gaming":           ["Consolas", "Jogos", "Acessórios", "PC Gaming", "Colecionáveis"],
  "Animais":          ["Cães", "Gatos", "Aves", "Peixe", "Outros"],
  "Alimentação":      ["Frescos", "Bebidas", "Snacks", "Bio", "Restaurantes"],
  "Empregos":         ["TI", "Saúde", "Educação", "Construção", "Comércio"],
  "Educação":         ["Livros", "Cursos", "Tutoria", "Material", "Online"],
  "Viagens":          ["Hotéis", "Voos", "Pacotes", "Cruzeiros", "Experiências"],
  "Jóias & Relógios": ["Colares", "Anéis", "Relógios", "Brincos", "Pulseiras"],
  "Bebé & Criança":   ["Roupas", "Brinquedos", "Cadeiras", "Carrinhos", "Alimentação"],
};

const locations = ["Luanda", "Benguela", "Huambo", "Lubango", "Cabinda", "Malanje", "Soyo", "Lobito"];

/* ─────────────────────────────────────────────── */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);

  const categories: any[] = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map((c: any) => ({
        name: c.name,
        image: c.image_url || categoryImages[c.name]?.main || "",
        cover: categoryImages[c.name]?.cover || "",
      }));
    }
    return staticCategories;
  }, [dbCategories]);

  const buildUrl = (catName: string, sub?: string) => {
    const params = new URLSearchParams();
    if (filterLocation) params.set("local", filterLocation);
    if (sub) params.set("sub", sub);
    const qs = params.toString();
    return `/categoria/${encodeURIComponent(catName)}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div style={{ background: cream, minHeight: "100vh" }}>

      {/* ── Filtro de localização ── */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${brownBorder}`,
        padding: "10px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <MapPin style={{ width: 13, height: 13, color: sandDark, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: brown, fontWeight: 700 }}>
            Filtrar por localização
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {/* "Todas" */}
          <button
            onClick={() => setFilterLocation(null)}
            style={{
              flexShrink: 0,
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: filterLocation === null ? 700 : 500,
              background: filterLocation === null
                ? `linear-gradient(135deg, ${sandDark}, ${sand})`
                : brownLight,
              border: `1px solid ${filterLocation === null ? sandDark : brownBorder}`,
              color: filterLocation === null ? "#fff" : brown,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Todas
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setFilterLocation(filterLocation === loc ? null : loc)}
              style={{
                flexShrink: 0,
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: filterLocation === loc ? 700 : 500,
                background: filterLocation === loc
                  ? `linear-gradient(135deg, ${sandDark}, ${sand})`
                  : brownLight,
                border: `1px solid ${filterLocation === loc ? sandDark : brownBorder}`,
                color: filterLocation === loc ? "#fff" : brown,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout: sidebar + conteúdo ── */}
      <div style={{ display: "flex" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 88,
          flexShrink: 0,
          background: "#fff",
          borderRight: `1px solid ${brownBorder}`,
          minHeight: "calc(100vh - 56px - 75px)",
          overflowY: "auto",
        }}>
          {categories.map((cat: any) => {
            const Icon = iconMap[cat.name] || ShoppingBag;
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  padding: "10px 6px",
                  background: isActive ? cream : "transparent",
                  borderLeft: isActive ? `3px solid ${sandDark}` : "3px solid transparent",
                  borderBottom: `1px solid ${brownBorder}`,
                  cursor: "pointer",
                }}
              >
                {cat.image ? (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
                    border: isActive ? `2px solid ${sandDark}` : `2px solid ${brownBorder}`,
                    flexShrink: 0,
                  }}>
                    <img
                      src={cat.image}
                      alt={cat.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: isActive ? `rgba(184,149,106,0.2)` : brownLight,
                    border: isActive ? `2px solid ${sandDark}` : `2px solid ${brownBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 18, height: 18, color: isActive ? sandDark : brown }} />
                  </div>
                )}
                <span style={{
                  fontSize: 10,
                  color: isActive ? sandDark : brown,
                  fontWeight: isActive ? 700 : 500,
                  textAlign: "center",
                  lineHeight: 1.25,
                  wordBreak: "break-word",
                }}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* ── Conteúdo ── */}
        <div style={{ flex: 1, padding: "12px 10px", minWidth: 0, background: cream }}>

          {selectedCategory ? (() => {
            const imgs = categoryImages[selectedCategory];
            const subs = subcategories[selectedCategory] || ["Todos os produtos"];
            const Icon = iconMap[selectedCategory] || ShoppingBag;

            return (
              <>
                {/* Header */}
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 10,
                }}>
                  <h2 style={{ color: brown, fontSize: 15, fontWeight: 800, margin: 0 }}>
                    {selectedCategory}
                  </h2>
                  <button
                    onClick={() => navigate(buildUrl(selectedCategory))}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: sandDark, fontSize: 12, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 2,
                    }}
                  >
                    Ver todos <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>

                {/* Fotos duplas */}
                {imgs && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, height: 104 }}>
                    <div style={{
                      width: 104, height: 104, borderRadius: 14,
                      overflow: "hidden", flexShrink: 0,
                      border: `2px solid ${sand}`,
                      boxShadow: "0 2px 8px rgba(74,46,10,0.12)",
                    }}>
                      <img src={imgs.main} alt={selectedCategory}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{
                      flex: 1, height: 104, borderRadius: 14,
                      overflow: "hidden",
                      border: `1px solid ${brownBorder}`,
                      boxShadow: "0 2px 8px rgba(74,46,10,0.07)",
                    }}>
                      <img src={imgs.cover} alt={`${selectedCategory} capa`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  </div>
                )}

                {/* Pill de localização activa */}
                {filterLocation && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: `rgba(184,149,106,0.15)`,
                    border: `1px solid ${sand}`,
                    borderRadius: 8, padding: "5px 10px", marginBottom: 10,
                  }}>
                    <MapPin style={{ width: 11, height: 11, color: sandDark }} />
                    <span style={{ fontSize: 11, color: brown, fontWeight: 600 }}>
                      Resultados em {filterLocation}
                    </span>
                  </div>
                )}

                {/* Subcategorias */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {subs.map(sub => (
                    <button
                      key={sub}
                      onClick={() => navigate(buildUrl(selectedCategory, sub))}
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 6,
                        background: "#fff",
                        border: `1px solid ${brownBorder}`,
                        borderRadius: 14, padding: "12px 4px",
                        cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(74,46,10,0.06)",
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: brownLight,
                        border: `1.5px solid ${brownBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon style={{ width: 16, height: 16, color: sandDark }} />
                      </div>
                      <span style={{
                        fontSize: 10, color: brown,
                        textAlign: "center", lineHeight: 1.3, fontWeight: 600,
                      }}>
                        {sub}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            );
          })() : (
            /* ── Todas as categorias ── */
            <>
              <h2 style={{ color: brown, fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>
                Todas as Categorias
              </h2>

              {filterLocation && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: `rgba(184,149,106,0.15)`,
                  border: `1px solid ${sand}`,
                  borderRadius: 8, padding: "5px 10px", marginBottom: 10,
                }}>
                  <MapPin style={{ width: 11, height: 11, color: sandDark }} />
                  <span style={{ fontSize: 11, color: brown, fontWeight: 600 }}>
                    Anúncios em {filterLocation}
                  </span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {categories.map((cat: any) => {
                  const imgs = categoryImages[cat.name];
                  return (
                    <button
                      key={cat.name}
                      onClick={() => navigate(buildUrl(cat.name))}
                      style={{
                        display: "flex", flexDirection: "column",
                        background: "#fff",
                        border: `1px solid ${brownBorder}`,
                        borderRadius: 14, overflow: "hidden",
                        cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(74,46,10,0.07)",
                        padding: 0, textAlign: "left",
                      }}
                    >
                      {/* Banner (capa) */}
                      <div style={{ width: "100%", height: 72, position: "relative", flexShrink: 0 }}>
                        {imgs?.cover ? (
                          <img src={imgs.cover} alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: brownLight }} />
                        )}
                        {/* Foto principal — círculo sobreposto */}
                        {imgs?.main && (
                          <div style={{
                            position: "absolute", bottom: -15, left: 10,
                            width: 32, height: 32, borderRadius: "50%",
                            overflow: "hidden",
                            border: "2.5px solid #fff",
                            boxShadow: "0 1px 6px rgba(74,46,10,0.15)",
                          }}>
                            <img src={imgs.main} alt={cat.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                      </div>

                      {/* Nome */}
                      <div style={{
                        padding: "20px 10px 10px",
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span style={{ fontSize: 11, color: brown, fontWeight: 700, lineHeight: 1.25 }}>
                          {cat.name}
                        </span>
                        <ChevronRight style={{ width: 12, height: 12, color: sandDark, flexShrink: 0 }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categorias;
