import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SlidersHorizontal, ChevronDown, ShoppingCart, Star, Loader2, X,
  ShieldCheck, Sparkles, Smartphone, Car, Home, Shirt, Sofa, Dumbbell,
  Baby, HeartPulse, Laptop, Gamepad2, Gem, Plane, UtensilsCrossed,
  Briefcase, GraduationCap, PawPrint, Package, ChevronRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { useAddToCart } from "@/hooks/useCartActions";

/* ══════════════════════ Paleta da marca ══════════════════════ */
const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.08)";
const brownMid   = "rgba(74,46,10,0.16)";
const rust       = "#C0552E"; // novo accent — usado só no selo da categoria e no CTA patrocinado

/* ══════════════════════ Dados de apoio ══════════════════════ */
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

const categoryIcons: Record<string, any> = {
  "Electrónicos": Smartphone, "Veículos": Car, "Imóveis": Home, "Moda": Shirt,
  "Vestuário": Shirt, "Casa & Jardim": Sofa, "Desporto": Dumbbell,
  "Bebé & Criança": Baby, "Saúde & Beleza": HeartPulse, "Informática": Laptop,
  "Gaming": Gamepad2, "Jóias & Relógios": Gem, "Viagens": Plane,
  "Alimentação": UtensilsCrossed, "Empregos": Briefcase, "Educação": GraduationCap,
  "Animais": PawPrint,
};

const categoryHeroImages: Record<string, string> = {
  "Electrónicos": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&h=500&fit=crop",
  "Veículos": "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=900&h=500&fit=crop",
  "Imóveis": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=500&fit=crop",
  "Moda": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=500&fit=crop",
  "Casa & Jardim": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&h=500&fit=crop",
  "Desporto": "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=900&h=500&fit=crop",
  "Bebé & Criança": "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=900&h=500&fit=crop",
  "Saúde & Beleza": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&h=500&fit=crop",
  "Informática": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&h=500&fit=crop",
  "Gaming": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=900&h=500&fit=crop",
  "Jóias & Relógios": "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=900&h=500&fit=crop",
  "Viagens": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&h=500&fit=crop",
  "Alimentação": "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=900&h=500&fit=crop",
  "Empregos": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&h=500&fit=crop",
  "Educação": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&h=500&fit=crop",
  "Animais": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=900&h=500&fit=crop",
  "Vestuário": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=500&fit=crop",
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
  { name: "Múltiplo", color: "bg-gradient-to-br from-yellow-400 via-pink-500 to-blue-500", hex: null },
  { name: "Preto",    color: "bg-black",        hex: "#000000" },
  { name: "Branco",   color: "bg-white border border-gray-300", hex: "#FFFFFF" },
  { name: "Rosa",     color: "bg-pink-400",     hex: "#EC4899" },
  { name: "Azul",     color: "bg-blue-500",     hex: "#3B82F6" },
  { name: "Cinza",    color: "bg-gray-400",     hex: "#6B7280" },
  { name: "Verde",    color: "bg-green-500",    hex: "#22C55E" },
  { name: "Vermelho", color: "bg-red-500",      hex: "#EF4444" },
  { name: "Amarelo",  color: "bg-yellow-400",   hex: "#EAB308" },
  { name: "Cáqui",    color: "bg-amber-600",    hex: "#D97706" },
  { name: "Marrom",   color: "bg-amber-800",    hex: "#78350F" },
  { name: "Roxo",     color: "bg-purple-500",   hex: "#A855F7" },
  { name: "Laranja",  color: "bg-orange-500",   hex: "#F97316" },
];

const priceRanges = [
  { label: "Até 10.000 Kz",       min: 0,      max: 10000  },
  { label: "10.000 - 50.000 Kz",  min: 10000,  max: 50000  },
  { label: "50.000 - 200.000 Kz", min: 50000,  max: 200000 },
  { label: "200.000+",            min: 200000, max: Infinity },
];

const sortOptions = ["Recomendado", "Menor preço", "Maior preço", "Mais vendidos", "Mais recentes"];

const hexClose = (a: string, b: string, tolerance = 60) => {
  const parse = (h: string) => {
    const s = h.replace("#", "");
    return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
  };
  try {
    const [r1,g1,b1] = parse(a);
    const [r2,g2,b2] = parse(b);
    return Math.abs(r1-r2) + Math.abs(g1-g2) + Math.abs(b1-b2) <= tolerance;
  } catch { return false; }
};

/* ══════════════════════ Componente ══════════════════════ */
const CategoriaDetalhe = () => {
  const { nome } = useParams();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(nome || "");
  const [sortBy, setSortBy] = useState("Recomendado");
  const [showSort, setShowSort] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedSub, setSelectedSub]       = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPrice, setSelectedPrice]   = useState<string | null>(null);
  const isMobile = useIsMobile();
  const addToCart = useAddToCart();

  const { data: dbCategories } = useCategories();
  const category   = (dbCategories || []).find((c: any) => c.name === categoryName);
  const categoryId = category?.id;

  /* ── Produtos ── */
  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["category_products", categoryId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_media(url, is_cover), product_variants(variant_type, value, name)")
        .eq("is_active", true);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (sortBy === "Menor preço")        query = query.order("price",       { ascending: true  });
      else if (sortBy === "Maior preço")   query = query.order("price",       { ascending: false });
      else if (sortBy === "Mais vendidos") query = query.order("sales_count", { ascending: false });
      else                                 query = query.order("created_at",  { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryId,
  });

  /* ── Vendedores / empresas patrocinados (tabela ads) ── */
  const { data: sponsoredAds } = useQuery({
    queryKey: ["sponsored_ads_category"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .in("type", ["empresa", "vendedor"])
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const companyIds = useMemo(() => (sponsoredAds || []).filter((a: any) => a.type === "empresa").map((a: any) => a.ref_id), [sponsoredAds]);
  const sellerIds  = useMemo(() => (sponsoredAds || []).filter((a: any) => a.type === "vendedor").map((a: any) => a.ref_id), [sponsoredAds]);

  const { data: sponsoredCompanies } = useQuery({
    queryKey: ["sponsored_companies_detail", companyIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies").select("id, name, logo_url, cover_url, is_verified").in("id", companyIds);
      if (error) throw error;
      return data || [];
    },
    enabled: companyIds.length > 0,
  });

  const { data: sponsoredSellers } = useQuery({
    queryKey: ["sponsored_sellers_detail", sellerIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sellers").select("id, name, avatar_url, is_verified, total_sales").in("id", sellerIds);
      if (error) throw error;
      return data || [];
    },
    enabled: sellerIds.length > 0,
  });

  const featuredSellers = useMemo(() => {
    const fromCompanies = (sponsoredCompanies || []).map((c: any) => ({
      id: c.id, kind: "empresa" as const, name: c.name,
      image: c.logo_url || c.cover_url, verified: c.is_verified,
      subtitle: "Empresa parceira", route: `/empresa/${c.id}`,
    }));
    const fromSellers = (sponsoredSellers || []).map((s: any) => ({
      id: s.id, kind: "vendedor" as const, name: s.name,
      image: s.avatar_url, verified: s.is_verified,
      subtitle: s.total_sales ? `${s.total_sales} vendas` : "Vendedor verificado", route: `/vendedor/${s.id}`,
    }));
    return [...fromCompanies, ...fromSellers];
  }, [sponsoredCompanies, sponsoredSellers]);

  /* ── Produtos formatados + filtros ── */
  const allProducts = useMemo(() =>
    (dbProducts || []).map((p: any) => {
      const cover = p.product_media?.find((m: any) => m.is_cover)?.url
        || p.image_url
        || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop";
      const productColorHexes: string[] = (p.product_variants || [])
        .filter((v: any) => v.variant_type === "color" && v.value)
        .map((v: any) => v.value as string);
      return {
        id: p.id, title: p.title, price: Number(p.price),
        priceFormatted: Number(p.price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz",
        oldPrice: p.old_price ? Number(p.old_price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz" : undefined,
        discount: p.discount_percent ? `-${p.discount_percent}%` : undefined,
        image: cover, rating: p.rating || 0, reviews: p.total_reviews || 0,
        freeShipping: p.free_shipping, salesCount: p.sales_count || 0,
        colorHexes: productColorHexes, subcategory: p.subcategory || null,
      };
    }),
  [dbProducts]);

  const products = useMemo(() => {
    let list = allProducts;
    if (selectedSub) list = list.filter(p => p.subcategory === selectedSub);
    if (selectedColors.length > 0) {
      list = list.filter(p => {
        if (p.colorHexes.length === 0) return false;
        return selectedColors.some(colorName => {
          const filterHex = colorOptions.find(c => c.name === colorName)?.hex;
          if (!filterHex) return false;
          return p.colorHexes.some((h: string) => hexClose(h, filterHex));
        });
      });
    }
    if (selectedPrice) {
      const range = priceRanges.find(r => r.label === selectedPrice);
      if (range) list = list.filter(p => p.price >= range.min && p.price < range.max);
    }
    return list;
  }, [allProducts, selectedSub, selectedColors, selectedPrice]);

  const subs = subcategories[categoryName] || [];
  const toggleColor = (c: string) =>
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const activeFiltersCount = (selectedSub ? 1 : 0) + selectedColors.length + (selectedPrice ? 1 : 0);

  const heroImage = category?.cover_image_url || categoryHeroImages[categoryName]
    || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=500&fit=crop";
  const heroSubtitle = category?.description || categorySubtitles[categoryName] || "Os melhores produtos para si.";
  const CategoryIcon = categoryIcons[categoryName] || Package;

  /* ── Painel de filtros (cor + preço — subcategoria agora é chips no topo) ── */
  const FiltersPanel = () => (
    <div className="space-y-5">
      {activeFiltersCount > 0 && (
        <button
          onClick={() => { setSelectedSub(null); setSelectedColors([]); setSelectedPrice(null); }}
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: brownLight, color: brown, border: `1px solid ${brownMid}` }}>
          <X className="w-3 h-3" /> Limpar filtros ({activeFiltersCount})
        </button>
      )}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] mb-2.5" style={{ color: sandDark }}>Cor</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {colorOptions.map(c => (
            <button key={c.name} onClick={() => toggleColor(c.name)}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg transition-colors text-xs"
              style={{
                background: selectedColors.includes(c.name) ? brownLight : "transparent",
                color:      selectedColors.includes(c.name) ? brown : "#555",
                fontWeight: selectedColors.includes(c.name) ? 700 : 400,
                border:     selectedColors.includes(c.name) ? `1px solid ${brownMid}` : "1px solid transparent",
              }}>
              <div className={`w-4 h-4 rounded-full ${c.color} flex-shrink-0`} />
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.12em] mb-2.5" style={{ color: sandDark }}>Preço</h3>
        <div className="space-y-0.5">
          {priceRanges.map(r => (
            <button key={r.label} onClick={() => setSelectedPrice(selectedPrice === r.label ? null : r.label)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg transition-colors text-xs"
              style={{ background: selectedPrice === r.label ? brownLight : "transparent", color: selectedPrice === r.label ? brown : "#555" }}>
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: selectedPrice === r.label ? sandDark : "#ccc" }}>
                {selectedPrice === r.label && <div className="w-2 h-2 rounded-sm" style={{ background: sandDark }} />}
              </div>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Card de produto ── */
  const ProductCard = ({ product }: { product: any }) => (
    <div className="w-full overflow-hidden group"
      style={{ background: "#fff", borderRadius: 16, border: `1.5px solid ${brownMid}`, boxShadow: "0 2px 10px rgba(74,46,10,0.06)" }}>
      <button className="w-full text-left relative block" onClick={() => navigate(`/produto/${product.id}`)}>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1", background: cream }}>
          <img src={product.image} alt={product.title}
            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500" loading="lazy" />
          {product.discount && (
            <div className="absolute -left-1 top-2.5 flex items-center">
              <span className="text-[9px] font-black pl-2 pr-1.5 py-1 text-white" style={{ background: rust, clipPath: "polygon(0 0, 100% 0, 88% 100%, 0% 100%)" }}>
                {product.discount}
              </span>
            </div>
          )}
          {product.freeShipping && (
            <span className="absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(74,46,10,0.72)", color: "#fff" }}>Frete grátis</span>
          )}
        </div>
      </button>
      <div className="px-2.5 pt-2 pb-2.5">
        <button className="w-full text-left" onClick={() => navigate(`/produto/${product.id}`)}>
          <h3 className="text-[11px] font-semibold leading-snug mb-1 truncate" style={{ color: brown }}>{product.title}</h3>
          {product.rating > 0 && (
            <div className="flex items-center gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-2 h-2"
                  style={{ fill: i < product.rating ? sandDark : "transparent", color: i < product.rating ? sandDark : "#ccc" }} />
              ))}
              {product.reviews > 0 && <span className="text-[8px] ml-0.5" style={{ color: sandDark }}>({product.reviews})</span>}
            </div>
          )}
          <div className="flex items-baseline gap-1">
            {product.oldPrice && <span className="text-[9px] line-through" style={{ color: "#aaa" }}>{product.oldPrice}</span>}
            <span className="text-xs font-black" style={{ color: brown }}>{product.priceFormatted}</span>
          </div>
        </button>
        <div className="flex justify-end mt-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); addToCart.mutate({ productId: product.id, quantity: 1 }); }}
            disabled={addToCart.isPending}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all active:scale-95 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${sandDark}, ${sand})`, boxShadow: "0 2px 6px rgba(74,46,10,0.22)" }}>
            {addToCart.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#fff" }} />
              : <ShoppingCart className="w-3 h-3" style={{ color: "#fff" }} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen pb-14 md:pb-0" style={{ backgroundColor: "#F5F5F5" }}>

      {/* ══ HERO — emblema de categoria sobreposto ══ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 230 }}>
        <img src={heroImage} alt={categoryName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(74,46,10,0.45) 0%, rgba(74,46,10,0.20) 35%, rgba(74,46,10,0.85) 100%)",
        }} />
        <div className="relative z-10 flex flex-col justify-between px-4 pb-9" style={{ paddingTop: 60, minHeight: 230 }}>
          <div className="flex items-center gap-1 text-[11px]">
            <button onClick={() => navigate("/")} className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Início</button>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>/</span>
            <button onClick={() => navigate("/categorias")} className="font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>Categorias</button>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>/</span>
            <span className="font-black text-white">{categoryName}</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: sand }}>Categoria</p>
            <h1 className="text-[28px] font-black leading-none mb-1.5 text-white">{categoryName}</h1>
            <p className="text-sm font-medium max-w-xs" style={{ color: "rgba(255,255,255,0.85)" }}>{heroSubtitle}</p>
          </div>
        </div>

        {/* Selo da categoria — flutua sobre a transição hero → conteúdo */}
        <div className="absolute z-20 left-4 -bottom-7 flex items-center justify-center rounded-2xl"
          style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${rust}, ${sandDark})`, boxShadow: "0 6px 16px rgba(74,46,10,0.35)", border: "3px solid #fff" }}>
          <CategoryIcon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* ══ Linha de resultado + ordenar ══ */}
      <div className="container mx-auto px-3 pt-10 pb-2 flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: sandDark }}>
          <span className="font-black" style={{ color: brown }}>{products.length}</span> resultado{products.length !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 text-xs font-medium" style={{ color: brown }}>
            <span className="font-black" style={{ color: sandDark }}>{sortBy}</span>
            <ChevronDown className="w-3 h-3" style={{ color: sandDark }} />
          </button>
          {showSort && (
            <div className="absolute top-full right-0 mt-1 rounded-xl shadow-lg z-40 min-w-[170px] overflow-hidden"
              style={{ background: "#fff", border: `1.5px solid ${brownMid}` }}>
              {sortOptions.map(opt => (
                <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); }}
                  className="block w-full text-left px-3 py-2 text-xs transition-colors"
                  style={{ color: opt === sortBy ? sandDark : brown, fontWeight: opt === sortBy ? 800 : 400, background: opt === sortBy ? brownLight : "transparent" }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ Chips de subcategoria + botão filtro ══ */}
      {(subs.length > 0 || isMobile) && (
        <div className="sticky top-14 z-30" style={{ backgroundColor: "#F5F5F5" }}>
          <div className="container mx-auto px-3 py-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {subs.map(sub => (
                <button key={sub} onClick={() => setSelectedSub(selectedSub === sub ? null : sub)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap"
                  style={{
                    background: selectedSub === sub ? brown : "#fff",
                    color: selectedSub === sub ? "#fff" : brown,
                    border: `1.5px solid ${selectedSub === sub ? brown : brownMid}`,
                  }}>
                  {sub}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMobileFilters(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={{ background: activeFiltersCount > selectedSub ? sandDark : "#fff", border: `1.5px solid ${brownMid}`, color: activeFiltersCount > (selectedSub ? 1 : 0) ? "#fff" : brown }}>
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: activeFiltersCount > (selectedSub ? 1 : 0) ? "#fff" : sandDark }} />
              {!isMobile && "Filtros"}
            </button>
          </div>
        </div>
      )}

      {/* ══ Drawer de filtros (cor + preço) ══ */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 overflow-y-auto p-4" style={{ background: cream }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black" style={{ color: brown }}>Filtros</h2>
              <button onClick={() => setShowMobileFilters(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: brownLight }}>
                <X className="w-4 h-4" style={{ color: brown }} />
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      )}

      {/* ══ Vendedores em destaque (patrocinados) ══ */}
      {featuredSellers.length > 0 && (
        <div className="container mx-auto px-3 pt-3 pb-1">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: rust }} />
            <h2 className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: brown }}>Vendedores em destaque</h2>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: brownLight, color: sandDark }}>Patrocinado</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {featuredSellers.map(s => (
              <button key={`${s.kind}-${s.id}`} onClick={() => navigate(s.route)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20 group">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: cream, border: `2.5px solid ${sandDark}` }}>
                    {s.image
                      ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                      : <Package className="w-6 h-6" style={{ color: sandDark }} />}
                  </div>
                  {s.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
                      style={{ background: "#3B82F6" }}>
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-center leading-tight truncate w-full" style={{ color: brown }}>{s.name}</p>
                <p className="text-[8px] text-center leading-tight" style={{ color: sandDark }}>{s.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ Layout principal ══ */}
      <div className="container mx-auto px-3 flex gap-4">
        {!isMobile && (
          <aside className="w-56 flex-shrink-0 py-4 px-3 mt-3 rounded-2xl self-start sticky top-[140px]"
            style={{ background: cream, border: `1.5px solid ${brownMid}`, boxShadow: "0 2px 10px rgba(74,46,10,0.07)" }}>
            <FiltersPanel />
          </aside>
        )}
        <div className="flex-1 py-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: sandDark }} />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: brownLight }}>
                <SlidersHorizontal className="w-6 h-6" style={{ color: sandDark }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: brown }}>Sem resultados</p>
              <p className="text-xs text-center max-w-[200px]" style={{ color: "#888" }}>Tente ajustar os filtros para encontrar o que procura.</p>
              <button onClick={() => { setSelectedSub(null); setSelectedColors([]); setSelectedPrice(null); }}
                className="px-4 py-2 rounded-full text-xs font-bold" style={{ background: sandDark, color: "#fff" }}>
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {products.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriaDetalhe;
