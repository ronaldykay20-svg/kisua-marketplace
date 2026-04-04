import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import MobileProductCard from "@/components/MobileProductCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { allProducts } from "@/data/products";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";

const subcategories: Record<string, string[]> = {
  "Electrónicos": ["Smartphones", "Tablets", "Computadores", "Áudio", "TV & Vídeo", "Câmeras", "Acessórios"],
  "Veículos": ["Carros", "Motas", "Peças", "Camiões", "Barcos"],
  "Imóveis": ["Apartamentos", "Moradias", "Terrenos", "Escritórios", "Armazéns"],
  "Moda": ["Feminino", "Masculino", "Calçado", "Acessórios", "Infantil"],
  "Casa & Jardim": ["Mobília", "Decoração", "Ferramentas", "Jardim", "Iluminação"],
  "Desporto": ["Fitness", "Futebol", "Natação", "Corrida", "Ciclismo"],
  "Bebé & Criança": ["Roupa", "Brinquedos", "Alimentação", "Higiene", "Móveis"],
  "Saúde & Beleza": ["Skincare", "Maquiagem", "Perfumes", "Cabelo", "Suplementos"],
  "Informática": ["Laptops", "Desktop", "Componentes", "Periféricos", "Redes"],
  "Gaming": ["Consolas", "Jogos", "Acessórios", "PC Gaming", "VR"],
  "Jóias & Relógios": ["Anéis", "Colares", "Relógios", "Pulseiras", "Brincos"],
  "Viagens": ["Pacotes", "Voos", "Hotéis", "Aluguer", "Excursões"],
  "Alimentação": ["Frescos", "Bebidas", "Congelados", "Mercearia", "Bio"],
  "Empregos": ["TI", "Saúde", "Educação", "Vendas", "Engenharia"],
  "Educação": ["Cursos", "Livros", "Material", "Explicações", "Online"],
  "Animais": ["Cães", "Gatos", "Aves", "Acessórios", "Alimentação"],
};

const sortOptions = ["Recomendado", "Menor preço", "Maior preço", "Mais vendidos", "Mais recentes"];

const CategoriaDetalhe = () => {
  const { nome } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(nome || "");
  const [sortBy, setSortBy] = useState("Recomendado");
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { data: dbCategories } = useCategories();

  // Find the category ID from the name
  const category = (dbCategories || []).find((c: any) => c.name === categoryName);
  const categoryId = category?.id;

  // Load products from DB filtered by category
  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["category_products", categoryId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_media(url, is_cover)")
        .eq("is_active", true);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (sortBy === "Menor preço") query = query.order("price", { ascending: true });
      else if (sortBy === "Maior preço") query = query.order("price", { ascending: false });
      else if (sortBy === "Mais vendidos") query = query.order("sales_count", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  // Map DB products to display format, fallback to static
  const products = dbProducts && dbProducts.length > 0
    ? dbProducts.map((p: any) => {
        const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
        return {
          id: p.id,
          title: p.title,
          price: Number(p.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
          oldPrice: p.old_price ? Number(p.old_price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz" : undefined,
          discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
          image: cover,
          rating: p.rating || 0,
          reviews: p.total_reviews || 0,
          freeShipping: p.free_shipping,
          badge: p.badge,
        };
      })
    : allProducts;

  const subs = subcategories[categoryName] || ["Todos"];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />

      <div className="container mx-auto px-3 py-2 flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={() => navigate("/")} className="hover:text-primary">Início</button>
        <span>/</span>
        <button onClick={() => navigate("/categorias")} className="hover:text-primary">Categorias</button>
        <span>/</span>
        <span className="text-foreground font-medium">{categoryName}</span>
      </div>

      <div className="sticky top-[7.5rem] z-30 bg-card border-b border-border">
        <div className="container mx-auto px-3 py-2 flex items-center gap-2">
          <div className="relative flex-1">
            <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 text-xs font-medium text-foreground">
              Ordenar: <span className="text-primary">{sortBy}</span> <ChevronDown className="w-3 h-3" />
            </button>
            {showSort && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40 min-w-[160px]">
                {sortOptions.map(opt => (
                  <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); }}
                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-muted ${opt === sortBy ? "text-primary font-bold" : "text-foreground"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
          </button>
        </div>
      </div>

      <div className="container mx-auto px-3 flex gap-4">
        <aside className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-56 flex-shrink-0 py-3`}>
          <div className="bg-card rounded-lg border border-border p-3 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground mb-2">Subcategoria</h3>
              <div className="space-y-1">
                {subs.map(sub => (
                  <button key={sub} onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
                    className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs ${selectedSub === sub ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${selectedSub === sub ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                    {sub}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground mb-2">Preço</h3>
              <div className="space-y-1">
                {["Até 10.000 Kz", "10.000 - 50.000 Kz", "50.000 - 200.000 Kz", "200.000+"].map(p => (
                  <button key={p} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs text-foreground hover:bg-muted">
                    <div className="w-3.5 h-3.5 rounded border border-muted-foreground" />
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1">
            {subs.map(sub => (
              <button key={sub} onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedSub === sub ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/30"}`}>
                {sub}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{products.length} resultados em "{categoryName}"</p>

              {isMobile ? (
                <div className="columns-2 gap-1.5 space-y-1.5">
                  {products.map((p: any, i: number) => (
                    <MobileProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {products.map((p: any) => (
                    <button key={p.id} onClick={() => navigate(`/produto/${p.id}`)} className="bg-card rounded-lg border border-border overflow-hidden text-left hover:shadow-md transition group">
                      <div className="relative aspect-square overflow-hidden">
                        {p.discount && <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded z-10">{p.discount}</span>}
                        {p.badge && <span className="absolute top-1.5 right-1.5 bg-walmart-orange text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded z-10">{p.badge}</span>}
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                      <div className="p-2">
                        <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1">{p.title}</h3>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < (p.rating || 0) ? "fill-walmart-orange text-walmart-orange" : "text-muted-foreground"}`} />
                          ))}
                          <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-foreground">{p.price}</span>
                            {p.oldPrice && <span className="text-[10px] text-muted-foreground line-through ml-1">{p.oldPrice}</span>}
                          </div>
                          <ShoppingCart className="w-4 h-4 text-primary" />
                        </div>
                        {p.freeShipping && <span className="text-[9px] text-walmart-green font-semibold">Frete grátis</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default CategoriaDetalhe;
