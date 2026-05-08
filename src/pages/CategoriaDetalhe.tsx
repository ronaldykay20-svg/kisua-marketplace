import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, Plus, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ── Paleta castanha ── */
const sand     = "#D4B896";
const sandDark = "#B8956A";
const cream    = "#F7F0E6";
const brown    = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";
const brownMid   = "rgba(74,46,10,0.18)";

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
  { name: "Branco", color: "bg-white border border-gray-300" },
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
  const addToCart = useAddToCart();

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
    };
  });

  const subs = subcategories[categoryName] || ["Todos"];

  const toggleColor = (c: string) => {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const heroImage =
    category?.image_url ||
    categoryHeroImages[categoryName] ||
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop";

  const heroSubtitle =
    category?.description ||
    categorySubtitles[categoryName] ||
    "Os melhores produtos para si.";

  /* ── Painel de filtros ── */
  const FiltersPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: sandDark }}>
          Categoria
        </h3>
        <div className="space-y-0.5">
          {subs.map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
              className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: selectedSub === sub ? brownLight : "transparent" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: selectedSub === sub ? sandDark : "#ccc" }}
                >
                  {selectedSub === sub && (
                    <div className="w-2 h-2 rounded-full" style={{ background: sandDark }} />
                  )}
                </div>
                <span className="text-xs" style={{ color: selectedSub === sub ? brown : "#555" }}>{sub}</span>
              </div>
              <Plus className="w-3 h-3" style={{ color: sandDark }} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: sandDark }}>Cor</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {colorOptions.map(c => (
            <button
              key={c.name}
              onClick={() => toggleColor(c.name)}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg transition-colors text-xs"
              style={{
                background: selectedColors.includes(c.name) ? brownLight : "transparent",
                color: selectedColors.includes(c.name) ? brown : "#555",
                fontWeight: selectedColors.includes(c.name) ? 700 : 400,
              }}
            >
              <div className={`w-4 h-4 rounded-full ${c.color} flex-shrink-0`} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: sandDark }}>Preço</h3>
        <div className="space-y-0.5">
          {["Até 10.000 Kz", "10.000 - 50.000 Kz", "50.000 - 200.000 Kz", "200.000+"].map(p => (
            <button key={p} className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-50 text-xs transition-colors" style={{ color: "#555" }}>
              <div className="w-4 h-4 rounded border-2 flex-shrink-0" style={{ borderColor: "#ccc" }} />
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Card de produto ── */
  const ProductCard = ({ product }: { product: any }) => (
    <div
      className="w-full overflow-hidden group"
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1.5px solid ${brownMid}`,
        boxShadow: "0 2px 10px rgba(74,46,10,0.08)",
      }}
    >
      {/* Imagem — clicável para detalhe */}
      <button
        className="w-full text-left"
        onClick={() => navigate(`/produto/${product.id}`)}
      >
        <div className="relative aspect-[3/4] overflow-hidden" style={{ borderRadius: "12px 12px 0 0", background: cream }}>
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {product.discount && (
            <span
              className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "#E53935", color: "#fff" }}
            >
              {product.discount}
            </span>
          )}
          {product.salesCount > 0 && (
            <div
              className="absolute bottom-2 left-2 right-2 text-[9px] font-semibold px-2 py-1 rounded-full text-center"
              style={{ background: "rgba(74,46,10,0.65)", color: "#fff" }}
            >
              Comprado {product.salesCount} vezes hoje
            </div>
          )}
        </div>
      </button>

      {/* Info */}
      <div className="px-2.5 pt-2 pb-2.5">
        <button className="w-full text-left" onClick={() => navigate(`/produto/${product.id}`)}>
          <h3 className="text-xs font-semibold line-clamp-2 leading-snug mb-1" style={{ color: brown }}>
            {product.title}
          </h3>

          {product.rating > 0 && (
            <div className="flex items-center gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-2.5 h-2.5"
                  style={{
                    fill: i < product.rating ? sandDark : "transparent",
                    color: i < product.rating ? sandDark : "#ccc",
                  }}
                />
              ))}
              {product.reviews > 0 && (
                <span className="text-[9px] ml-0.5" style={{ color: sandDark }}>
                  ({product.reviews})
                </span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-1 mb-1.5">
            {product.oldPrice && (
              <span className="text-[10px] line-through" style={{ color: "#aaa" }}>
                {product.oldPrice}
              </span>
            )}
            <span className="text-sm font-black" style={{ color: brown }}>
              {product.priceFormatted}
            </span>
          </div>
        </button>

        {/* Rodapé: frete + botão carrinho */}
        <div className="flex items-center justify-between">
          {product.freeShipping ? (
            <span className="text-[9px] font-bold" style={{ color: sandDark }}>Frete grátis</span>
          ) : (
            <span />
          )}

          {/* Botão adicionar ao carrinho — funcional */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart.mutate({ productId: product.id, quantity: 1 });
            }}
            disabled={addToCart.isPending}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: `linear-gradient(135deg, ${sandDark}, ${sand})`,
              boxShadow: "0 2px 8px rgba(74,46,10,0.25)",
            }}
          >
            {addToCart.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" style={{ color: "#fff" }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-14 md:pb-0" style={{ backgroundColor: "#F5F5F5" }}>

      {/* ══ HERO BANNER ══ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 300 }}>
        <img
          src={heroImage}
          alt={categoryName}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center top" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 35%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.60) 100%)",
          }}
        />
        <div
          className="relative z-10 flex flex-col justify-end px-4 pb-5"
          style={{ paddingTop: 68 }}
        >
          <div className="flex items-center gap-1 text-[11px] text-white/70 mb-2.5">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Início</button>
            <span>/</span>
            <button onClick={() => navigate("/categorias")} className="hover:text-white transition-colors">Categorias</button>
            <span>/</span>
            <span className="text-white font-bold">{categoryName}</span>
          </div>
          <h1 className="text-3xl font-black text-white drop-shadow-lg leading-tight mb-1">
            {categoryName}
          </h1>
          <p className="text-sm text-white/85 drop-shadow max-w-xs">
            {heroSubtitle}
          </p>
        </div>
      </div>

      {/* ══ BARRA DE ORDENAÇÃO ══ */}
      <div
        className="sticky top-14 z-30 border-b"
        style={{ backgroundColor: "#fff", borderBottomColor: brownMid }}
      >
        <div className="container mx-auto px-3 py-2 flex items-center gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: brown }}
            >
              Ordenar por{" "}
              <span className="font-black" style={{ color: sandDark }}>{sortBy}</span>
              <ChevronDown className="w-3 h-3" style={{ color: sandDark }} />
            </button>
            {showSort && (
              <div
                className="absolute top-full left-0 mt-1 rounded-xl shadow-lg z-40 min-w-[170px] overflow-hidden"
                style={{ background: "#fff", border: `1.5px solid ${brownMid}` }}
              >
                {sortOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setShowSort(false); }}
                    className="block w-full text-left px-3 py-2 text-xs transition-colors hover:bg-amber-50"
                    style={{
                      color: opt === sortBy ? sandDark : brown,
                      fontWeight: opt === sortBy ? 800 : 400,
                      background: opt === sortBy ? brownLight : "transparent",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isMobile && (
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={{
                background: brownLight,
                border: `1.5px solid ${brownMid}`,
                color: brown,
              }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: sandDark }} />
              Filtro
            </button>
          )}
        </div>
      </div>

      {/* ══ DRAWER DE FILTROS (mobile) ══ */}
      {isMobile && showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 overflow-y-auto p-4"
            style={{ background: cream }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black" style={{ color: brown }}>Filtros</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: brownLight }}
              >
                <X className="w-4 h-4" style={{ color: brown }} />
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      )}

      {/* ══ LAYOUT PRINCIPAL ══ */}
      <div className="container mx-auto px-3 flex gap-4">
        {!isMobile && (
          <aside
            className="w-56 flex-shrink-0 py-4 px-3 mt-4 rounded-2xl self-start sticky top-[88px]"
            style={{
              background: cream,
              border: `1.5px solid ${brownMid}`,
              boxShadow: "0 2px 10px rgba(74,46,10,0.07)",
            }}
          >
            <FiltersPanel />
          </aside>
        )}

        <div className="flex-1 py-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: sandDark }} />
            </div>
          ) : (
            <>
              <p className="text-xs mb-3 font-medium" style={{ color: sandDark }}>
                {products.length} resultados em "{categoryName}"
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {products.map((p: any) => (
                  <ProductCard key={p.id} product={p} />
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
