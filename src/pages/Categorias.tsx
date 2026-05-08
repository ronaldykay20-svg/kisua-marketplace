import { useState, useMemo } from "react";
import {
  Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell,
  BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor,
  Gamepad2, Gem, Plane, PawPrint, ChevronRight, Search, SlidersHorizontal, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "@/hooks/useSupabaseData";

/* ── Ícones ── */
const iconMap: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home,
  "Moda": ShoppingBag, "Casa & Jardim": Wrench, "Desporto": Dumbbell,
  "Bebé & Criança": Baby, "Saúde & Beleza": HeartPulse, "Saúde": HeartPulse,
  "Informática": Monitor, "Gaming": Gamepad2, "Jóias & Relógios": Gem,
  "Jóias": Gem, "Viagens": Plane, "Alimentação": Utensils,
  "Empregos": Briefcase, "Educação": BookOpen, "Animais": PawPrint,
};

/* ── Imagens (principal + capa) por categoria ── */
const categoryImages: Record<string, { main: string; cover: string }> = {
  "Electrónicos": {
    main:  "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=160&fit=crop",
  },
  "Veículos": {
    main:  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=160&fit=crop",
  },
  "Imóveis": {
    main:  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=160&fit=crop",
  },
  "Moda": {
    main:  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=160&fit=crop",
  },
  "Casa & Jardim": {
    main:  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=400&h=160&fit=crop",
  },
  "Desporto": {
    main:  "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=160&fit=crop",
  },
  "Bebé & Criança": {
    main:  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=160&fit=crop",
  },
  "Saúde & Beleza": {
    main:  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=160&fit=crop",
  },
  "Informática": {
    main:  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=160&fit=crop",
  },
  "Gaming": {
    main:  "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=160&fit=crop",
  },
  "Jóias & Relógios": {
    main:  "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=160&fit=crop",
  },
  "Viagens": {
    main:  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=400&h=160&fit=crop",
  },
  "Alimentação": {
    main:  "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=160&fit=crop",
  },
  "Empregos": {
    main:  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=160&fit=crop",
  },
  "Educação": {
    main:  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=160&fit=crop",
  },
  "Animais": {
    main:  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=120&h=120&fit=crop",
    cover: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=160&fit=crop",
  },
};

const staticCategories = Object.entries(categoryImages).map(([name, imgs]) => ({
  name,
  image: imgs.main,
  cover: imgs.cover,
}));

const subcategories: Record<string, string[]> = {
  "Electrónicos": ["Smartphones", "Tablets", "Computadores", "Áudio", "TV & Vídeo", "Câmeras", "Acessórios"],
  "Moda": ["Feminino", "Masculino", "Calçado", "Acessórios", "Infantil"],
  "Casa & Jardim": ["Mobília", "Decoração", "Ferramentas", "Jardim", "Iluminação"],
  "Desporto": ["Fitness", "Futebol", "Natação", "Corrida", "Ciclismo"],
  "Saúde & Beleza": ["Skincare", "Maquiagem", "Perfumes", "Cabelo", "Suplementos"],
  "Veículos": ["Carros", "Motos", "Peças", "Camiões", "Barcos"],
  "Imóveis": ["Apartamentos", "Moradias", "Terrenos", "Escritórios", "Armazéns"],
  "Informática": ["Laptops", "Desktops", "Periféricos", "Redes", "Impressoras"],
  "Gaming": ["Consolas", "Jogos", "Acessórios", "PC Gaming", "Colecionáveis"],
  "Animais": ["Cães", "Gatos", "Aves", "Peixe", "Outros"],
  "Alimentação": ["Frescos", "Bebidas", "Snacks", "Bio", "Restaurantes"],
  "Empregos": ["TI", "Saúde", "Educação", "Construção", "Comércio"],
  "Educação": ["Livros", "Cursos", "Tutoria", "Material", "Online"],
  "Viagens": ["Hotéis", "Voos", "Pacotes", "Cruzeiros", "Experiências"],
  "Jóias & Relógios": ["Colares", "Anéis", "Relógios", "Brincos", "Pulseiras"],
  "Bebé & Criança": ["Roupas", "Brinquedos", "Cadeiras", "Carrinhos", "Alimentação"],
};

/* Cor de acento por categoria (para pill e border) */
const accentColors: Record<string, string> = {
  "Electrónicos": "#D4870A",
  "Veículos":     "#D4870A",
  "Imóveis":      "#D4870A",
  "Moda":         "#D4870A",
};

const BROWN_BG = "#1C1008";          // fundo principal muito escuro castanho
const BROWN_SIDEBAR = "#140C05";     // sidebar ligeiramente mais escura
const BROWN_CARD = "#2A1A09";        // cards castanho médio
const BROWN_HOVER = "#3A2510";       // hover castanho mais claro
const GOLD = "#D4870A";              // dourado/âmbar da marca
const GOLD_LIGHT = "#F5A623";

/* ─────────────────────────────────────────────────────── */
const Categorias = () => {
  const navigate = useNavigate();
  const { data: dbCategories } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("Todas");
  const [filterPrice, setFilterPrice] = useState("Todos");
  const [filterSort, setFilterSort] = useState("Relevância");
  const [showFilters, setShowFilters] = useState(false);

  /* Mescla dados da BD com estáticos */
  const categories = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map((c: any) => ({
        name: c.name,
        image: c.image_url || categoryImages[c.name]?.main || "",
        cover: categoryImages[c.name]?.cover || "",
      }));
    }
    return staticCategories;
  }, [dbCategories]);

  /* Filtragem por pesquisa */
  const visibleCategories = useMemo(() =>
    categories.filter((c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ),
  [categories, search]);

  const handleCategoryClick = (name: string) => {
    setSelectedCategory(prev => prev === name ? null : name);
  };

  /* ── Botão de filtro activo ── */
  const activeFilters = [filterLocation !== "Todas", filterPrice !== "Todos", filterSort !== "Relevância"]
    .filter(Boolean).length;

  return (
    <div
      className="min-h-screen pb-14 md:pb-0"
      style={{ background: BROWN_BG }}
    >
      <div style={{ paddingTop: "56px" }}>

        {/* ── Barra de pesquisa + filtros ── */}
        <div
          style={{
            background: BROWN_SIDEBAR,
            borderBottom: `1px solid rgba(212,135,10,0.2)`,
            padding: "10px 12px",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search
              style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)",
                width: 15, height: 15, color: "rgba(255,255,255,0.4)"
              }}
            />
            <input
              type="text"
              placeholder="Pesquisar categorias..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.07)",
                border: `1px solid rgba(212,135,10,0.25)`,
                borderRadius: 10,
                padding: "8px 10px 8px 32px",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: 8, top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                <X style={{ width: 14, height: 14, color: "rgba(255,255,255,0.5)" }} />
              </button>
            )}
          </div>

          {/* Filtros rápidos horizontais */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {/* Localização */}
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              style={{
                background: filterLocation !== "Todas" ? GOLD : "rgba(255,255,255,0.08)",
                border: `1px solid ${filterLocation !== "Todas" ? GOLD : "rgba(212,135,10,0.25)"}`,
                borderRadius: 20,
                color: filterLocation !== "Todas" ? "#000" : "rgba(255,255,255,0.8)",
                fontSize: 12,
                padding: "5px 10px",
                cursor: "pointer",
                flexShrink: 0,
                fontWeight: filterLocation !== "Todas" ? 700 : 400,
              }}
            >
              <option value="Todas">📍 Localização</option>
              <option value="Luanda">Luanda</option>
              <option value="Benguela">Benguela</option>
              <option value="Huambo">Huambo</option>
              <option value="Lubango">Lubango</option>
              <option value="Cabinda">Cabinda</option>
              <option value="Malanje">Malanje</option>
            </select>

            {/* Preço */}
            <select
              value={filterPrice}
              onChange={e => setFilterPrice(e.target.value)}
              style={{
                background: filterPrice !== "Todos" ? GOLD : "rgba(255,255,255,0.08)",
                border: `1px solid ${filterPrice !== "Todos" ? GOLD : "rgba(212,135,10,0.25)"}`,
                borderRadius: 20,
                color: filterPrice !== "Todos" ? "#000" : "rgba(255,255,255,0.8)",
                fontSize: 12,
                padding: "5px 10px",
                cursor: "pointer",
                flexShrink: 0,
                fontWeight: filterPrice !== "Todos" ? 700 : 400,
              }}
            >
              <option value="Todos">💰 Preço</option>
              <option value="0-5000">Até 5.000 Kz</option>
              <option value="5000-25000">5.000 – 25.000 Kz</option>
              <option value="25000-100000">25.000 – 100.000 Kz</option>
              <option value="100000+">Acima de 100.000 Kz</option>
            </select>

            {/* Ordenar */}
            <select
              value={filterSort}
              onChange={e => setFilterSort(e.target.value)}
              style={{
                background: filterSort !== "Relevância" ? GOLD : "rgba(255,255,255,0.08)",
                border: `1px solid ${filterSort !== "Relevância" ? GOLD : "rgba(212,135,10,0.25)"}`,
                borderRadius: 20,
                color: filterSort !== "Relevância" ? "#000" : "rgba(255,255,255,0.8)",
                fontSize: 12,
                padding: "5px 10px",
                cursor: "pointer",
                flexShrink: 0,
                fontWeight: filterSort !== "Relevância" ? 700 : 400,
              }}
            >
              <option value="Relevância">↕ Ordenar</option>
              <option value="Mais recentes">Mais recentes</option>
              <option value="Menor preço">Menor preço</option>
              <option value="Maior preço">Maior preço</option>
              <option value="Mais vistos">Mais vistos</option>
            </select>

            {/* Limpar filtros */}
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterLocation("Todas");
                  setFilterPrice("Todos");
                  setFilterSort("Relevância");
                }}
                style={{
                  background: "rgba(255,80,80,0.15)",
                  border: "1px solid rgba(255,80,80,0.4)",
                  borderRadius: 20,
                  color: "#FF6B6B",
                  fontSize: 12,
                  padding: "5px 10px",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <X style={{ width: 11, height: 11 }} />
                Limpar ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* ── Layout principal ── */}
        <div style={{ display: "flex" }}>

          {/* ── Sidebar esquerda ── */}
          <aside
            style={{
              width: 90,
              flexShrink: 0,
              background: BROWN_SIDEBAR,
              borderRight: `1px solid rgba(212,135,10,0.15)`,
              minHeight: "calc(100vh - 56px - 65px)",
              overflowY: "auto",
            }}
          >
            {visibleCategories.map((cat: any) => {
              const Icon = iconMap[cat.name] || ShoppingBag;
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    padding: "10px 6px",
                    background: isActive ? BROWN_HOVER : "transparent",
                    borderLeft: isActive ? `3px solid ${GOLD}` : "3px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Ícone ou foto miniatura */}
                  {cat.image ? (
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", overflow: "hidden",
                      border: isActive ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.15)",
                      flexShrink: 0,
                    }}>
                      <img src={cat.image} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: isActive ? `rgba(212,135,10,0.2)` : "rgba(255,255,255,0.08)",
                      border: isActive ? `2px solid ${GOLD}` : "2px solid rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 18, height: 18, color: isActive ? GOLD : "rgba(255,255,255,0.6)" }} />
                    </div>
                  )}
                  <span style={{
                    fontSize: 10,
                    color: isActive ? GOLD_LIGHT : "rgba(255,255,255,0.65)",
                    fontWeight: isActive ? 700 : 400,
                    textAlign: "center",
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                    hyphens: "auto",
                  }}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* ── Conteúdo direito ── */}
          <div style={{ flex: 1, padding: "12px 10px", minWidth: 0 }}>

            {selectedCategory ? (
              /* ── Vista de categoria seleccionada ── */
              (() => {
                const catData = categories.find((c: any) => c.name === selectedCategory);
                const imgs = categoryImages[selectedCategory];
                const subs = subcategories[selectedCategory] || ["Todos os produtos"];

                return (
                  <>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <h2 style={{ color: "#fff", fontSize: 15, fontWeight: 800, margin: 0 }}>
                        {selectedCategory}
                      </h2>
                      <button
                        onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}`)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: GOLD_LIGHT, fontSize: 12, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 2,
                        }}
                      >
                        Ver todos <ChevronRight style={{ width: 13, height: 13 }} />
                      </button>
                    </div>

                    {/* Foto dupla: principal + capa */}
                    {imgs && (
                      <div style={{ display: "flex", gap: 8, marginBottom: 14, height: 110 }}>
                        {/* Foto principal – quadrado */}
                        <div style={{
                          width: 110, height: 110, borderRadius: 14, overflow: "hidden", flexShrink: 0,
                          border: `2px solid rgba(212,135,10,0.5)`,
                        }}>
                          <img src={imgs.main} alt={selectedCategory} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        {/* Capa – retangular */}
                        <div style={{
                          flex: 1, height: 110, borderRadius: 14, overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                          <img src={imgs.cover} alt={`${selectedCategory} capa`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      </div>
                    )}

                    {/* Filtros activos pill */}
                    {(filterLocation !== "Todas" || filterPrice !== "Todos" || filterSort !== "Relevância") && (
                      <div style={{
                        background: `rgba(212,135,10,0.12)`,
                        border: `1px solid rgba(212,135,10,0.3)`,
                        borderRadius: 8, padding: "6px 10px",
                        marginBottom: 10, fontSize: 11, color: GOLD_LIGHT,
                      }}>
                        Filtros activos:{" "}
                        {filterLocation !== "Todas" && <span style={{ marginRight: 6 }}>📍 {filterLocation}</span>}
                        {filterPrice !== "Todos" && <span style={{ marginRight: 6 }}>💰 {filterPrice} Kz</span>}
                        {filterSort !== "Relevância" && <span>↕ {filterSort}</span>}
                      </div>
                    )}

                    {/* Subcategorias */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                    }}>
                      {subs.map(sub => (
                        <button
                          key={sub}
                          onClick={() => navigate(`/categoria/${encodeURIComponent(selectedCategory)}?sub=${encodeURIComponent(sub)}&local=${encodeURIComponent(filterLocation)}&preco=${encodeURIComponent(filterPrice)}&ordem=${encodeURIComponent(filterSort)}`)}
                          style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", gap: 6,
                            background: BROWN_CARD,
                            border: "1px solid rgba(212,135,10,0.2)",
                            borderRadius: 14, padding: "10px 4px",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = BROWN_HOVER)}
                          onMouseLeave={e => (e.currentTarget.style.background = BROWN_CARD)}
                        >
                          <div style={{
                            width: 44, height: 44, borderRadius: "50%",
                            background: `rgba(212,135,10,0.15)`,
                            border: `1.5px solid rgba(212,135,10,0.4)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <ShoppingBag style={{ width: 18, height: 18, color: GOLD }} />
                          </div>
                          <span style={{
                            fontSize: 10, color: "rgba(255,255,255,0.85)",
                            textAlign: "center", lineHeight: 1.3, fontWeight: 500,
                          }}>
                            {sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()
            ) : (
              /* ── Vista de todas as categorias ── */
              <>
                <h2 style={{ color: "#fff", fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>
                  Todas as Categorias
                  {search && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>
                      ({visibleCategories.length} resultados)
                    </span>
                  )}
                </h2>

                {/* Filtros activos pill */}
                {(filterLocation !== "Todas" || filterPrice !== "Todos" || filterSort !== "Relevância") && (
                  <div style={{
                    background: `rgba(212,135,10,0.12)`,
                    border: `1px solid rgba(212,135,10,0.3)`,
                    borderRadius: 8, padding: "6px 10px",
                    marginBottom: 10, fontSize: 11, color: GOLD_LIGHT,
                  }}>
                    Filtros activos:{" "}
                    {filterLocation !== "Todas" && <span style={{ marginRight: 6 }}>📍 {filterLocation}</span>}
                    {filterPrice !== "Todos" && <span style={{ marginRight: 6 }}>💰 {filterPrice} Kz</span>}
                    {filterSort !== "Relevância" && <span>↕ {filterSort}</span>}
                  </div>
                )}

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}>
                  {visibleCategories.map((cat: any) => {
                    const Icon = iconMap[cat.name] || ShoppingBag;
                    const imgs = categoryImages[cat.name];
                    return (
                      <button
                        key={cat.name}
                        onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}?local=${encodeURIComponent(filterLocation)}&preco=${encodeURIComponent(filterPrice)}&ordem=${encodeURIComponent(filterSort)}`)}
                        style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "center", gap: 0,
                          background: BROWN_CARD,
                          border: "1px solid rgba(212,135,10,0.18)",
                          borderRadius: 14, overflow: "hidden",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          padding: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = BROWN_HOVER)}
                        onMouseLeave={e => (e.currentTarget.style.background = BROWN_CARD)}
                      >
                        {/* Foto dupla: principal pequena + capa */}
                        <div style={{ width: "100%", height: 70, position: "relative" }}>
                          {/* Capa ao fundo */}
                          {imgs?.cover ? (
                            <img
                              src={imgs.cover}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <div style={{
                              width: "100%", height: "100%",
                              background: "rgba(212,135,10,0.08)",
                            }} />
                          )}
                          {/* Foto principal sobreposta (canto inferior-esquerdo) */}
                          {imgs?.main && (
                            <div style={{
                              position: "absolute", bottom: -14, left: 8,
                              width: 30, height: 30, borderRadius: "50%", overflow: "hidden",
                              border: `2px solid ${BROWN_CARD}`,
                            }}>
                              <img src={imgs.main} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          )}
                        </div>

                        {/* Nome */}
                        <div style={{ padding: "18px 6px 10px", width: "100%", textAlign: "center" }}>
                          <span style={{
                            fontSize: 10, color: "rgba(255,255,255,0.85)",
                            fontWeight: 600, lineHeight: 1.3, display: "block",
                          }}>
                            {cat.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {visibleCategories.length === 0 && (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    color: "rgba(255,255,255,0.4)", fontSize: 14,
                  }}>
                    Nenhuma categoria encontrada para "{search}"
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categorias;
