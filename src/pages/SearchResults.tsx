import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, ChevronDown, Star, CheckCircle, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard, { type Product } from "@/components/ProductCard";
import MobileSearchProductCard from "@/components/MobileSearchProductCard";

const GEMINI_API_KEY = "AIzaSyAWG6GlEHL6wkTxX8vmycF8WttF4Kc8dx8";

const searchTabs = ["Produtos", "Vendedores", "Empresas"];
const sortOptions = ["Mais relevantes", "Menor preço", "Maior preço", "Mais vendidos", "Melhor avaliação"];
const ITEMS_PER_PAGE = 12;

const formatPrice = (price: number) =>
  Number(price).toLocaleString("pt-AO").replace(/,/g, ".") + " Kz";

const isNewProduct = (createdAt: string | null | undefined): boolean => {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
};

const aggregateRatings = (reviews: { entity_id: string; rating: number }[]): Record<string, number> => {
  const grouped: Record<string, number[]> = {};
  reviews.forEach(({ entity_id, rating }) => {
    if (!grouped[entity_id]) grouped[entity_id] = [];
    grouped[entity_id].push(rating);
  });
  const result: Record<string, number> = {};
  Object.entries(grouped).forEach(([id, ratings]) => {
    result[id] = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  });
  return result;
};

// Gemini analisa a imagem e devolve termos de pesquisa visuais detalhados
const analisarImagemComGemini = async (base64: string): Promise<string[]> => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64,
              }
            },
            {
              text: `Analisa esta imagem de produto para um marketplace. 
Responde APENAS com uma lista JSON de termos de pesquisa em português, do mais específico ao mais geral.
Inclui: tipo de produto, material, cor, estilo, uso, categoria.
Exemplo: ["sapato social masculino preto couro", "sapato social preto", "sapato masculino", "calçado social", "sapato"]
Devolve só o array JSON, sem mais texto.`
            }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
      }),
    }
  );
  if (!res.ok) throw new Error("Erro Gemini: " + res.status);
  const data = await res.json();
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const limpo = texto.replace(/```json|```/g, "").trim();
  return JSON.parse(limpo);
};

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const modoImagem = searchParams.get("modo") === "imagem";
  const imgBase64 = searchParams.get("img") || "";

  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState("Produtos");
  const [sortBy, setSortBy] = useState("Mais relevantes");
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [freeShipping, setFreeShipping] = useState("Todos");
  const [imagemResultados, setImagemResultados] = useState<any[]>([]);
  const [carregandoImagem, setCarregandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState("");
  const [termosDetectados, setTermosDetectados] = useState<string[]>([]);

  const effectiveQuery = query.trim();

  // Pesquisa visual via Gemini
  useEffect(() => {
    if (!modoImagem || !imgBase64) return;
    setCarregandoImagem(true);
    setErroImagem("");
    setImagemResultados([]);

    analisarImagemComGemini(imgBase64)
      .then(async (termos) => {
        setTermosDetectados(termos);

        if (termos.length === 0) {
          setImagemResultados([]);
          setCarregandoImagem(false);
          return;
        }

        // Pesquisa por cada termo, do mais específico ao mais geral
        // Junta todos os resultados únicos por ordem de relevância
        const vistos = new Set<string>();
        const resultados: any[] = [];

        for (const termo of termos) {
          const { data } = await supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .or(`title.ilike.%${termo}%,description.ilike.%${termo}%,category.ilike.%${termo}%`)
            .limit(20);

          for (const p of data || []) {
            if (!vistos.has(p.id)) {
              vistos.add(p.id);
              resultados.push(p);
            }
          }

          // Se já temos 20+ resultados, chega
          if (resultados.length >= 20) break;
        }

        setImagemResultados(resultados);
        setCarregandoImagem(false);
      })
      .catch((err) => {
        console.error(err);
        setErroImagem("Não foi possível analisar a imagem. Tente novamente.");
        setCarregandoImagem(false);
      });
  }, [modoImagem, imgBase64]);

  // Pesquisa normal por texto
  const { data: dbProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["search_products", effectiveQuery, sortBy, priceMin, priceMax, freeShipping],
    enabled: !modoImagem,
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (effectiveQuery) q = q.or(`title.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%`);
      if (priceMin) q = q.gte("price", Number(priceMin));
      if (priceMax) q = q.lte("price", Number(priceMax));
      if (freeShipping === "Sim") q = q.eq("free_shipping", true);
      if (sortBy === "Menor preço") q = q.order("price", { ascending: true });
      else if (sortBy === "Maior preço") q = q.order("price", { ascending: false });
      else if (sortBy === "Mais vendidos") q = q.order("sales_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      q = q.limit(200);
      const { data, error } = await q;
      if (error) throw error;

      const ids = (data || []).map((p: any) => p.id);
      const sellerIds = [...new Set((data || []).map((p: any) => p.seller_id).filter(Boolean))];

      const coverMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: media } = await supabase
          .from("product_media")
          .select("product_id, url")
          .in("product_id", ids)
          .eq("is_cover", true);
        (media || []).forEach((m: any) => { coverMap[m.product_id] = m.url; });
      }

      let sellerRatingMap: Record<string, number> = {};
      if (sellerIds.length > 0) {
        const { data: sReviews } = await supabase
          .from("seller_reviews")
          .select("seller_id, rating")
          .in("seller_id", sellerIds);
        sellerRatingMap = aggregateRatings(
          (sReviews || []).map((r: any) => ({ entity_id: r.seller_id, rating: r.rating }))
        );
      }

      const result = (data || []).map((p: any) => ({
        ...p,
        cover_url: coverMap[p.id],
        real_rating: (p.seller_id && sellerRatingMap[p.seller_id]) || p.rating || 0,
      }));

      if (sortBy === "Melhor avaliação") result.sort((a: any, b: any) => b.real_rating - a.real_rating);
      return result;
    },
  });

  const { data: dbSellers = [], isLoading: loadingSellers } = useQuery({
    queryKey: ["search_sellers", effectiveQuery],
    enabled: !modoImagem,
    queryFn: async () => {
      let q = supabase.from("sellers").select("*").eq("is_active", true);
      if (effectiveQuery) q = q.or(`name.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%`);
      q = q.limit(50);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const sellerIds = data.map((s: any) => s.id);
      const { data: sReviews } = await supabase.from("seller_reviews").select("seller_id, rating").in("seller_id", sellerIds);
      const ratingMap = aggregateRatings((sReviews || []).map((r: any) => ({ entity_id: r.seller_id, rating: r.rating })));
      return data.map((s: any) => ({ ...s, real_rating: ratingMap[s.id] ?? 0 }));
    },
  });

  const { data: dbCompanies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["search_companies", effectiveQuery],
    enabled: !modoImagem,
    queryFn: async () => {
      let q = supabase.from("companies").select("*").eq("is_active", true);
      if (effectiveQuery) q = q.or(`name.ilike.%${effectiveQuery}%,description.ilike.%${effectiveQuery}%`);
      q = q.limit(50);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const produtosParaExibir = modoImagem ? imagemResultados : dbProducts;

  const products: Product[] = useMemo(
    () => produtosParaExibir.map((p: any) => ({
      id:           p.id,
      title:        p.title,
      price:        formatPrice(p.price),
      oldPrice:     p.old_price ? formatPrice(p.old_price) : undefined,
      discount:     p.discount_percent ? `-${p.discount_percent}%` : undefined,
      image:        p.cover_url || p.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
      rating:       p.real_rating || undefined,
      reviews:      p.total_reviews || undefined,
      freeShipping: p.free_shipping || false,
      badge:        isNewProduct(p.created_at) ? "NOVO" : (p.badge || undefined),
      description:  p.description || undefined,
      sellerName:   p.seller_name || undefined,
    })),
    [produtosParaExibir]
  );

  const vendedores = dbSellers.filter((s: any) => s.type === "individual");
  const empresas   = dbSellers.filter((s: any) => s.type === "company");
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalCount = activeTab === "Produtos" ? products.length : activeTab === "Vendedores" ? vendedores.length : empresas.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchParams({ q: searchQuery });
  };

  const renderSellerCard = (s: any) => (
    <div key={s.id} onClick={() => navigate(`/vendedor/${s.id}`)}
      className="bg-card rounded-card border border-border p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition">
      {s.logo_url
        ? <img src={s.logo_url} alt={s.name} className="w-16 h-16 rounded-card object-cover flex-shrink-0" />
        : <div className="w-16 h-16 rounded-card bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">{s.name.charAt(0)}</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground truncate">{s.name}</h3>
          {s.is_verified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
          <Star className="w-3 h-3 text-secondary fill-secondary" />
          {Number(s.real_rating).toFixed(1)}
        </div>
        {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
        <button className="mt-1.5 px-3 py-1 rounded-card bg-primary text-primary-foreground text-[10px] font-bold hover:brightness-110 transition">Visitar</button>
      </div>
    </div>
  );

  const isLoading = modoImagem ? carregandoImagem : loadingProducts;

  return (
    <div className="min-h-screen bg-background">

      <div className="sticky top-0 z-30 bg-background border-b border-border px-4 py-2 flex items-center gap-2.5">
        <button onClick={() => navigate(-1)} className="text-foreground flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {modoImagem ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-full">
            <Camera className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              {carregandoImagem ? "A analisar imagem..." : termosDetectados.length > 0 ? termosDetectados[0] : "Pesquisa por imagem"}
            </span>
          </div>
        ) : (
          <form onSubmit={handleSearch} className="flex-1 flex">
            <div className="relative flex-1 flex bg-card border border-border rounded-full overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full py-2 pl-4 pr-10 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button type="submit" className="px-3.5 flex items-center justify-center text-muted-foreground">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-4 space-y-0 sm:space-y-4">

        <div className="px-4 pt-3 sm:pt-0">
          {modoImagem ? (
            <p className="text-sm text-muted-foreground">
              {carregandoImagem
                ? "A identificar produto na imagem..."
                : erroImagem
                ? <span className="text-destructive">{erroImagem}</span>
                : <><span className="text-lg font-black text-foreground">{products.length}</span> produtos encontrados por imagem</>
              }
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="text-lg font-black text-foreground">{totalCount}</span> Resultados
              {effectiveQuery && <> para "<span className="font-bold text-foreground">{effectiveQuery}</span>"</>}
            </p>
          )}
        </div>

        {!modoImagem && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0 sm:gap-3 px-4 sm:px-0">
            <div className="flex items-center gap-1 border-b border-border">
              {searchTabs.map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                  className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 py-2 sm:py-0">
              <button onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filtrar
              </button>
              <div className="relative">
                <button onClick={() => setShowSort(!showSort)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition">
                  {sortBy} <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showSort && (
                  <div className="absolute right-0 top-full mt-1 bg-card rounded-card border border-border shadow-lg z-20 min-w-[180px]">
                    {sortOptions.map(opt => (
                      <button key={opt} onClick={() => { setSortBy(opt); setShowSort(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition ${sortBy === opt ? "font-bold text-primary" : "text-foreground"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!modoImagem && showFilters && (
          <div className="bg-card border-y sm:rounded-card sm:border border-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço mín.</label>
              <input value={priceMin} onChange={e => { setPriceMin(e.target.value); setCurrentPage(1); }} placeholder="0" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Preço máx.</label>
              <input value={priceMax} onChange={e => { setPriceMax(e.target.value); setCurrentPage(1); }} placeholder="1000000" className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Frete grátis</label>
              <select value={freeShipping} onChange={e => { setFreeShipping(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-2 rounded-card border border-border bg-background text-xs text-foreground focus:outline-none">
                <option>Todos</option>
                <option>Sim</option>
              </select>
            </div>
          </div>
        )}

        {(modoImagem || activeTab === "Produtos") && (
          <>
            {isLoading ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">A identificar produto na imagem...</p>
              </div>
            ) : erroImagem && modoImagem ? (
              <div className="text-center py-12">
                <p className="text-sm text-destructive">{erroImagem}</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 rounded-card bg-primary text-primary-foreground text-xs font-bold">
                  Tentar novamente
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  {modoImagem ? "Nenhum produto encontrado para esta imagem." : `Nenhum produto encontrado${effectiveQuery ? ` para "${effectiveQuery}"` : ""}.`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col divide-y divide-border sm:hidden">
                  {paginatedProducts.map(p => <MobileSearchProductCard key={p.id} product={p} />)}
                </div>
                <div className="hidden sm:grid sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 sm:px-0">
                  {paginatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-4 pb-6 flex-wrap px-4">
                <span className="text-xs text-muted-foreground mr-2">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 8) }).map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-card text-xs font-bold transition ${currentPage === i + 1 ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {!modoImagem && activeTab === "Empresas" && (
          <div className="px-4 sm:px-0 pb-6">
            {loadingSellers ? <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p>
              : empresas.length === 0 ? <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhuma empresa encontrada.</p></div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{empresas.map(renderSellerCard)}</div>}
          </div>
        )}

        {!modoImagem && activeTab === "Vendedores" && (
          <div className="px-4 sm:px-0 pb-6">
            {loadingSellers ? <p className="text-center text-sm text-muted-foreground py-8">A carregar...</p>
              : vendedores.length === 0 ? <div className="text-center py-12"><p className="text-sm text-muted-foreground">Nenhum vendedor encontrado.</p></div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{vendedores.map(renderSellerCard)}</div>}
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchResults;
