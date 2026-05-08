import { useState, useMemo } from "react";
import {
  Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell,
  BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor,
  Gamepad2, Gem, Plane, PawPrint, ChevronDown, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

/* ── Cores idênticas ao Navbar ── */
const bg          = "#FAF8F5";   /* quase branco com toque cream */
const white       = "#ffffff";
const sand        = "#D4B896";
const sandDark    = "#B8956A";
const brown       = "#4A2E0A";
const brownLight  = "rgba(74,46,10,0.08)";
const brownBorder = "rgba(74,46,10,0.12)";

const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home,
  "Moda": ShoppingBag, "Casa & Jardim": Wrench, "Desporto": Dumbbell,
  "Bebé & Criança": Baby, "Saúde & Beleza": HeartPulse, "Saúde": HeartPulse,
  "Informática": Monitor, "Gaming": Gamepad2, "Jóias & Relógios": Gem,
  "Jóias": Gem, "Viagens": Plane, "Alimentação": Utensils,
  "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
};

/* Mesmas URLs estáticas do Navbar — usadas APENAS como fallback
   se a BD não tiver image_url */
const staticImages: Record<string, string> = {
  "Electrónicos":    "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop",
  "Veículos":        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop",
  "Imóveis":         "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop",
  "Moda":            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&h=100&fit=crop",
  "Casa & Jardim":   "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
  "Desporto":        "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=100&h=100&fit=crop",
  "Bebé & Criança":  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop",
  "Saúde & Beleza":  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100&h=100&fit=crop",
  "Informática":     "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop",
  "Gaming":          "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=100&h=100&fit=crop",
  "Jóias & Relógios":"https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=100&h=100&fit=crop",
  "Viagens":         "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&h=100&fit=crop",
  "Alimentação":     "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=100&h=100&fit=crop",
  "Empregos":        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=100&h=100&fit=crop",
  "Educação":        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=100&h=100&fit=crop",
  "Animais":         "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100&h=100&fit=crop",
};

/* Capa (banner largo) — imagem diferente da miniatura */
const coverImages: Record<string, string> = {
  "Electrónicos":    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop",
  "Veículos":        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=200&fit=crop",
  "Imóveis":         "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=200&fit=crop",
  "Moda":            "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=200&fit=crop",
  "Casa & Jardim":   "https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=200&fit=crop",
  "Desporto":        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=200&fit=crop",
  "Bebé & Criança":  "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=200&fit=crop",
  "Saúde & Beleza":  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=200&fit=crop",
  "Informática":     "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop",
  "Gaming":          "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=200&fit=crop",
  "Jóias & Relógios":"https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=200&fit=crop",
  "Viagens":         "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=400&h=200&fit=crop",
  "Alimentação":     "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=200&fit=crop",
  "Empregos":        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop",
  "Educação":        "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=200&fit=crop",
  "Animais":         "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=200&fit=crop",
};

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

const locations = ["Todas", "Luanda", "Benguela", "Huambo", "Lubango", "Cabinda", "Malanje", "Soyo", "Lobito"];
const sortOptions = ["Relevância", "Mais recentes", "Mais vistos"];

/* ─────────────────────────────────────────────────── */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState("Todas");
  const [filterSort, setFilterSort]         = useState("Relevância");

  /* Cada categoria tem:
     - image: vem da BD (image_url) ou fallback estático — mesma lógica do Navbar
     - cover: banner largo (sempre do mapa local, não existe na BD) */
  const categories: any[] = useMemo(() => {
    const base = dbCategories && dbCategories.length > 0 ? dbCategories : null;
    if (base) {
      return base.map((c: any) => ({
        name:  c.name,
        image: c.image_url || staticImages[c.name] || "",
        cover: coverImages[c.name] || "",
      }));
    }
    return Object.keys(staticImages).map(name => ({
      name,
      image: staticImages[name],
      cover: coverImages[name] || "",
    }));
  }, [dbCategories]);

  const buildUrl = (catName: string, sub?: string) => {
    const params = new URLSearchParams();
    if (filterLocation !== "Todas") params.set("local", filterLocation);
    if (sub) params.set("sub", sub);
    const qs = params.toString();
    return `/categoria/${encodeURIComponent(catName)}${qs ? `?${qs}` : ""}`;
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    appearance: "none" as any,
    WebkitAppearance: "none" as any,
    background: white,
    border: `1px solid ${brownBorder}`,
    borderRadius: 24,
    padding: "9px 30px 9px 32px",
    fontSize: 13,
    color: brown,
    fontWeight: 500,
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div style={{ background: bg, minHeight: "100vh" }}>

      {/* ── Barra de pesquisa ── */}
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: white,
          border: `1px solid ${brownBorder}`,
          borderRadius: 14,
          padding: "10px 14px",
          boxShadow: "0 1px 4px rgba(74,46,10,0.06)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={sandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Pesquisar categorias..."
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", fontSize: 14, color: brown,
            }}
            onKeyDown={(e) => {
              const val = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && val) navigate(`/pesquisa?q=${encodeURIComponent(val)}`);
            }}
          />
        </div>
      </div>

      {/* ── Filtros: Localização · Ordenar ── */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px" }}>

        {/* Localização */}
        <div style={{ position: "relative", flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} style={selectStyle}>
            {locations.map(l => <option key={l} value={l}>{l === "Todas" ? "Localização" : l}</option>)}
          </select>
          <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: brown, pointerEvents: "none" }} />
        </div>

        {/* Ordenar */}
        <div style={{ position: "relative", flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sandDark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <path d="M3 9l4-4 4 4M7 5v14M21 15l-4 4-4-4m4 4V5"/>
          </svg>
          <select value={filterSort} onChange={e => setFilterSort(e.target.value)} style={selectStyle}>
            {sortOptions.map(s => <option key={s} value={s}>{s === "Relevância" ? "Ordenar" : s}</option>)}
          </select>
          <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: brown, pointerEvents: "none" }} />
        </div>
      </div>

      {/* ── Layout: sidebar + grelha ── */}
      <div style={{
        display: "flex",
        margin: "0 10px",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(74,46,10,0.08)",
        border: `1px solid ${brownBorder}`,
      }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: 96,
          flexShrink: 0,
          background: bg,
          borderRight: `1px solid ${brownBorder}`,
          overflowY: "auto",
          maxHeight: "calc(100vh - 195px)",
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
                  padding: "11px 6px",
                  background: isActive ? white : "transparent",
                  borderLeft: isActive ? `3px solid ${sandDark}` : "3px solid transparent",
                  borderBottom: `1px solid ${brownBorder}`,
                  cursor: "pointer",
                }}
              >
                {/* Usa cat.image — vem da BD ou fallback estático */}
                {cat.image ? (
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%", overflow: "hidden",
                    border: isActive ? `2.5px solid ${sandDark}` : `2px solid ${brownBorder}`,
                    flexShrink: 0,
                  }}>
                    <img src={cat.image} alt={cat.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%",
                    background: isActive ? `rgba(184,149,106,0.2)` : brownLight,
                    border: isActive ? `2.5px solid ${sandDark}` : `2px solid ${brownBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 20, height: 20, color: isActive ? sandDark : brown }} />
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

        {/* ── Conteúdo direito ── */}
        <div style={{ flex: 1, padding: "14px 10px", background: white, minWidth: 0 }}>

          {selectedCategory ? (() => {
            const cat = categories.find((c: any) => c.name === selectedCategory);
            const subs = subcategories[selectedCategory] || ["Todos os produtos"];
            const Icon = iconMap[selectedCategory] || ShoppingBag;

            return (
              <>
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 12,
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

                {/* Fotos: miniatura quadrada + banner largo */}
                {cat && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, height: 110 }}>
                    {/* Miniatura — usa cat.image (BD ou fallback) */}
                    <div style={{
                      width: 110, height: 110, borderRadius: 14,
                      overflow: "hidden", flexShrink: 0,
                      border: `2px solid ${sand}`,
                      boxShadow: "0 2px 8px rgba(74,46,10,0.12)",
                    }}>
                      {cat.image ? (
                        <img src={cat.image} alt={selectedCategory}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%", background: brownLight,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Icon style={{ width: 32, height: 32, color: sandDark }} />
                        </div>
                      )}
                    </div>
                    {/* Banner — usa cat.cover */}
                    <div style={{
                      flex: 1, height: 110, borderRadius: 14,
                      overflow: "hidden", border: `1px solid ${brownBorder}`,
                    }}>
                      {cat.cover ? (
                        <img src={cat.cover} alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: brownLight }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Subcategorias 3 colunas */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {subs.map(sub => (
                    <button
                      key={sub}
                      onClick={() => navigate(buildUrl(selectedCategory, sub))}
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 6,
                        background: bg,
                        border: `1px solid ${brownBorder}`,
                        borderRadius: 14, padding: "10px 4px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%",
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
            /* ── Todas as categorias: 3 colunas ── */
            <>
              <h2 style={{ color: brown, fontSize: 15, fontWeight: 800, margin: "0 0 14px" }}>
                Todas as Categorias
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {categories.map((cat: any) => (
                  <button
                    key={cat.name}
                    onClick={() => navigate(buildUrl(cat.name))}
                    style={{
                      display: "flex", flexDirection: "column",
                      background: white,
                      border: `1px solid ${brownBorder}`,
                      borderRadius: 16,
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(74,46,10,0.07)",
                      padding: 0,
                    }}
                  >
                    {/* Banner (capa) */}
                    <div style={{ width: "100%", aspectRatio: "1/0.65", position: "relative" }}>
                      {cat.cover ? (
                        <img src={cat.cover} alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: brownLight }} />
                      )}

                      {/* Círculo miniatura sobreposto */}
                      {cat.image && (
                        <div style={{
                          position: "absolute", bottom: -13, left: 8,
                          width: 30, height: 30,
                          borderRadius: "50%",
                          overflow: "hidden",
                          border: "2.5px solid white",
                          boxShadow: "0 1px 5px rgba(74,46,10,0.2)",
                        }}>
                          <img src={cat.image} alt={cat.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                    </div>

                    {/* Nome */}
                    <div style={{ padding: "18px 8px 10px" }}>
                      <p style={{
                        margin: 0, fontSize: 11, fontWeight: 700,
                        color: brown, lineHeight: 1.25, textAlign: "left",
                      }}>
                        {cat.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
};

export default Categorias;
