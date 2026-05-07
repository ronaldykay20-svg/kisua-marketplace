import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, Plus, X } from "lucide-react";
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

/* Imagens de capa por categoria */
const categoryHeroImages: Record<string, string> = {
  "Electrónicos": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=400&fit=crop",
  "Veículos": "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=400&fit=crop",
  "Imóveis": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=400&fit=crop",
  "Moda": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop",
  "Casa & Jardim": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop",
  "Desporto": "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=800&h=400&fit=crop",
  "Bebé & Criança": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&h=400&fit=crop",
  "Saúde & Beleza": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop",
  "Informática": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=400&fit=crop",
  "Gaming": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=400&fit=crop",
  "Jóias & Relógios": "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=800&h=400&fit=crop",
  "Viagens": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop",
  "Alimentação": "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=800&h=400&fit=crop",
  "Empregos": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=400&fit=crop",
  "Educação": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop",
  "Animais": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=400&fit=crop",
  "Vestuário": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop",
};

/* Subtítulos por categoria */
const categorySubtitles: Record<string, string> = {
  "Electrónicos": "Tecnologia de ponta ao seu alcance.",
  "Veículos": "O veículo ideal para cada jornada.",
  "Imóveis": "O seu próximo lar está aqui.",
  "Moda": "Estilo, conforto e moda para todas as ocasiões.",
  "Vestuário": "Estilo, conforto e moda para todas as ocasiões.",
  "Casa & Jardim": "Transforme a sua casa num lar.",
  "Desporto": "Equipamento para cada aventura.",
  "Bebé & Criança": "Tudo para os mais pequenos.",
  "Saúde & Beleza": "Cuide de si com os melhores produtos.",
  "Informática": "Potência e produtividade ao seu dispor.",
  "Gaming": "Leve o jogo a outro nível.",
  "Jóias & Relógios": "Elegância que nunca passa de moda.",
  "Viagens": "Descubra o mundo sem limites.",
  "Alimentação": "Frescura e sabor em cada produto.",
  "Empregos": "A sua próxima oportunidade está aqui.",
  "Educação": "Conhecimento que transforma vidas.",
  "Animais": "Para os seus companheiros de quatro patas.",
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
    enabled: !!categoryId,
  });

  const products = (dbProducts || []).map((p: any) => {
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
  });

  const subs = subcategories[categoryName] || ["Todos"];

  const toggleColor = (c: string) => {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  /* Imagem de capa: usa a da categoria do DB se existir, senão fallback pelo nome */
  const heroImage =
    category?.image_url ||
    categoryHeroImages[categoryName] ||
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop";

  const heroSubtitle =
    category?.description ||
    categorySubtitles[categoryName] ||
    "Os melhores produtos para si.";

  const categoryColor = category?.color || "#3B82F6";

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

  const ProductCardShein = ({ product }: { product: any }) => (
    <button onClick={() => navigate(`/produto/${product.id}`)}
      className="w-full text-left bg-card overflow-hidden group">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        {product.discount && (
          <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{product.discount}</span>
        )}
        {product.salesCount > 0 && (
          <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
            Comprado {product.salesCount} vezes hoje
          </div>
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
        <div className="flex items-center justify-between mt-1">
          {product.freeShipping && <span className="text-[9px] text-accent font-semibold">Frete grátis</span>}
          <div className="ml-auto w-7 h-7 rounded border border-border flex items-center justify-center">
            <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen pb-14 md:pb-0" style={{ backgroundColor: `${categoryColor}08` }}>

      {/* ══ HERO BANNER ══
          O Navbar está em position:absolute sobre esta secção,
          por isso usamos padding-top para compensar a altura do navbar (~56px).
          A imagem ocupa toda a largura e tem um gradiente escuro na parte inferior
          para garantir legibilidade do texto branco. */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 260 }}>
        {/* Imagem de fundo */}
        <img
          src={heroImage}
          alt={categoryName}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center top" }}
        />

        {/* Gradiente sobre a imagem: transparente em cima → escuro em baixo */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.80) 100%)",
          }}
        />

        {/* Conteúdo textual — empurrado para baixo pelo padding-top do navbar */}
        <div
          className="relative z-10 flex flex-col justify-end px-4 pb-5"
          style={{ paddingTop: 72 /* altura do navbar */ }}
        >
          {/* Breadcrumb claro */}
          <div className="flex items-center gap-1 text-xs text-white/70 mb-3">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Início</button>
            <span>/</span>
            <button onClick={() => navigate("/categorias")} className="hover:text-white transition-colors">Categorias</button>
            <span>/</span>
            <span className="text-white font-semibold">{categoryName}</span>
          </div>

          {/* Título + subtítulo */}
          <h1 className="text-3xl font-black text-white drop-shadow-lg leading-tight mb-1">
            {categoryName}
          </h1>
          <p className="text-sm text-white/85 drop-shadow max-w-xs">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* Sort bar — fica sticky logo abaixo do hero */}
      <div className="sticky top-14 z-30 border-b" style={{ backgroundColor: `${categoryColor}0A`, borderBottomColor: `${categoryColor}30` }}>
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
    </div>
  );
};

export default CategoriaDetalhe;
