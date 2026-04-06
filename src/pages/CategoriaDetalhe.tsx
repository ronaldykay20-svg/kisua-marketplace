import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, Plus, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
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

const colorOptions = [
  { name: "Múltiplo", color: "bg-gradient-to-br from-yellow-400 via-pink-500 to-blue-500" },
  { name: "Preto", color: "bg-black" },
  { name: "Branco", color: "bg-white border border-border" },
  { name: "Rosa", color: "bg-pink-400" },
  { name: "Azul", color: "bg-blue-500" },
  { name: "Cinza", color: "bg-gray-400" },
  { name: "Verde", color: "bg-green-500" },
  { name: "Vermelho", color: "bg-red-500" },
  { name: "Amarelo", color: "bg-yellow-400" },
  { name: "Cáqui", color: "bg-amber-600" },
  { name: "Marrom", color: "bg-amber-800" },
  { name: "Roxo", color: "bg-purple-500" },
  { name: "Laranja", color: "bg-orange-500" },
];

const sortOptions = ["Recomendado", "Menor preço", "Maior preço", "Mais vendidos", "Mais recentes"];

const CategoriaDetalhe = () => {
  const { nome } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(nome || "");
  const [sortBy, setSortBy] = useState("Recomendado");
  const [showSort, setShowSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const isMobile = useIsMobile();

  const { data: dbCategories } = useCategories();
  const category = (dbCategories || []).find((c: any) => c.name === categoryName);
  const categoryId = category?.id;

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["category_products", categoryId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_media(url, is_cover)")
        .eq("is_active", true);
      if (categoryId) query = query.eq("category_id", categoryId);
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

  const products = dbProducts && dbProducts.length > 0
    ? dbProducts.map((p: any) => {
        const cover = p.product_media?.find((m: any) => m.is_cover)?.url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
        return {
          id: p.id,
          title: p.title,
          price: Number(p.price),
          priceFormatted: Number(p.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
          oldPrice: p.old_price ? Number(p.old_price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz" : undefined,
          discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
          image: cover,
          rating: p.rating || 0,
          reviews: p.total_reviews || 0,
          freeShipping: p.free_shipping,
          badge: p.badge,
          salesCount: p.sales_count || 0,
          sellerName: "",
        };
      })
    : allProducts.map(p => ({ ...p, price: 0, priceFormatted: p.price, salesCount: 0, sellerName: "" }));

  const subs = subcategories[categoryName] || ["Todos"];

  const toggleColor = (c: string) => {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const FiltersPanel = () => (
    <div className="space-y-5">
      {/* Subcategory */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2">Categoria</h3>
        <div className="space-y-1">
          {subs.map(sub => (
            <button key={sub} onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
              className="flex items-center justify-between w-full text-left px-1 py-1.5 text-xs text-foreground hover:text-primary">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedSub === sub ? "border-primary" : "border-muted-foreground"}`}>
                  {selectedSub === sub && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                {sub}
              </div>
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2">Cor</h3>
        <div className="grid grid-cols-2 gap-2">
          {colorOptions.map(c => (
            <button key={c.name} onClick={() => toggleColor(c.name)}
              className={`flex items-center gap-2 text-xs ${selectedColors.includes(c.name) ? "font-bold text-primary" : "text-foreground"}`}>
              <div className={`w-5 h-5 rounded-full ${c.color} flex-shrink-0`} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2">Preço</h3>
        <div className="space-y-1">
          {["Até 10.000 Kz", "10.000 - 50.000 Kz", "50.000 - 200.000 Kz", "200.000+"].map(p => (
            <button key={p} className="flex items-center gap-2 w-full text-left px-1 py-1.5 text-xs text-foreground hover:text-primary">
              <div className="w-4 h-4 rounded border border-muted-foreground" />
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Product card matching SHEIN style
  const ProductCardShein = ({ product }: { product: any }) => (
    <button onClick={() => navigate(`/produto/${product.id}`)}
      className="w-full text-left bg-card overflow-hidden group">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        {product.discount && (
          <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{product.discount}</span>
        )}
      </div>
      <div className="px-1 py-2">
        {product.badge && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1 py-0.5 rounded">Local</span>
            {product.discount && <span className="text-[9px] font-bold bg-destructive/10 text-destructive px-1 py-0.5 rounded">{product.discount}</span>}
          </div>
        )}
        <h3 className="text-xs font-medium text-foreground line-clamp-1 mb-0.5">{product.title}</h3>
        {product.salesCount > 0 && (
          <p className="text-[10px] text-primary font-bold mb-0.5">
            #{Math.min(product.salesCount, 7)} Mais Vendido
          </p>
        )}
        {product.rating > 0 && (
          <div className="flex items-center gap-0.5 mb-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-2.5 h-2.5 ${i < product.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
            ))}
            {product.reviews > 0 && <span className="text-[9px] text-muted-foreground ml-0.5">({product.reviews})</span>}
          </div>
        )}
        <div className="flex items-baseline gap-1">
          {product.oldPrice && <span className="text-[10px] text-muted-foreground line-through">{product.oldPrice}</span>}
          <span className="text-sm font-black text-foreground">{product.priceFormatted}</span>
        </div>
        {product.salesCount > 100 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Mais de {product.salesCount.toLocaleString()} unidades vendidas</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {product.freeShipping && <span className="text-[9px] text-accent font-semibold">Frete grátis</span>}
          <div className="ml-auto w-7 h-7 rounded border border-border flex items-center justify-center">
            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </button>
  );

  const categoryColor = category?.color || "#3B82F6";
  const coverImage = category?.cover_image_url;

  return (
    <div className="min-h-screen pb-14 md:pb-0" style={{ backgroundColor: `${categoryColor}08` }}>
      <Navbar />

      {/* Cover image banner */}
      {coverImage && (
        <div className="relative w-full h-32 md:h-48 overflow-hidden">
          <img src={coverImage} alt={categoryName} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${categoryColor}40, ${categoryColor}CC)` }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-xl md:text-3xl font-black text-white drop-shadow-lg">{categoryName}</h1>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="container mx-auto px-3 py-2 flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={() => navigate("/")} className="hover:text-primary">Início</button>
        <span>/</span>
        <button onClick={() => navigate("/categorias")} className="hover:text-primary">Categorias</button>
        <span>/</span>
        <span className="text-foreground font-medium">{categoryName}</span>
      </div>

      {/* Sort bar */}
      <div className="sticky top-[7.5rem] z-30 bg-card border-b border-border">
        <div className="container mx-auto px-3 py-2 flex items-center gap-2">
          <div className="relative flex-1">
            <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 text-xs font-medium text-foreground">
              Ordenar por <span className="text-primary font-bold">{sortBy}</span> <ChevronDown className="w-3 h-3" />
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
          {isMobile && (
            <button onClick={() => setShowMobileFilters(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtro
            </button>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {isMobile && showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileFilters(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card overflow-y-auto p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">Filtro</h2>
              <button onClick={() => setShowMobileFilters(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      )}

      <div className="container mx-auto px-3 flex gap-4">
        {/* Desktop sidebar filters */}
        {!isMobile && (
          <aside className="w-56 flex-shrink-0 py-3">
            <FiltersPanel />
          </aside>
        )}

        {/* Products grid */}
        <div className="flex-1 py-3">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{products.length} resultados em "{categoryName}"</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {products.map((p: any) => (
                  <ProductCardShein key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default CategoriaDetalhe;
