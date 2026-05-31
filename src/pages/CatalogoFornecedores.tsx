import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Package,
  Plus,
  Check,
  Filter,
  ArrowLeft,
  Store,
  TrendingUp,
  Star,
  ShoppingBag,
  ChevronDown,
  X,
  DollarSign,
} from "lucide-react";

interface SupplierProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  cost_price: number;
  suggested_price: number;
  min_price: number;
  stock_quantity: number;
  total_sold: number;
  images: string[];
  suppliers: {
    company_name: string;
    province: string;
    rating: number;
    is_verified: boolean;
  };
}

interface DropshipStore {
  id: string;
  store_name: string;
}

export default function CatalogoFornecedores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [myStore, setMyStore] = useState<DropshipStore | null>(null);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [sellingPrice, setSellingPrice] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  const CATEGORIES = [
    "Todos", "Eletrônicos", "Calçados", "Vestuário", "Acessórios",
    "Casa e Jardim", "Beleza", "Desporto", "Alimentação", "Outros"
  ];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar loja do dropshipper
      const { data: storeData } = await supabase
        .from("dropship_stores")
        .select("id, store_name")
        .eq("user_id", user?.id)
        .single();

      setMyStore(storeData);

      // Se tem loja, buscar produtos já adicionados
      if (storeData) {
        const { data: addedData } = await supabase
          .from("dropship_store_products")
          .select("supplier_product_id")
          .eq("store_id", storeData.id);

        if (addedData) {
          setAddedProducts(new Set(addedData.map(d => d.supplier_product_id)));
        }
      }

      // Buscar catálogo de fornecedores aprovados
      const { data: productsData } = await supabase
        .from("supplier_products")
        .select(`
          *,
          suppliers!inner(company_name, province, rating, is_verified, status)
        `)
        .eq("status", "active")
        .eq("suppliers.status", "approved")
        .gt("stock_quantity", 0)
        .order("total_sold", { ascending: false });

      setProducts(productsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToStore = async () => {
    if (!myStore || !selectedProduct) return;

    const price = parseFloat(sellingPrice);
    if (!price || price < (selectedProduct.min_price || selectedProduct.cost_price)) {
      toast.error(`Preço mínimo de venda: ${formatKz(selectedProduct.min_price || selectedProduct.cost_price)}`);
      return;
    }

    setAddingProduct(true);
    try {
      const { error } = await supabase.from("dropship_store_products").insert({
        store_id: myStore.id,
        supplier_product_id: selectedProduct.id,
        selling_price: price,
        is_active: true,
      });

      if (error) throw error;

      setAddedProducts(prev => new Set([...prev, selectedProduct.id]));
      toast.success(`"${selectedProduct.name}" adicionado à tua loja!`);
      setSelectedProduct(null);
      setSellingPrice("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAddingProduct(false);
    }
  };

  const formatKz = (v: number) => `${v.toLocaleString("pt-AO")} Kz`;

  const calcMargin = (selling: number, cost: number) => {
    if (!selling || !cost) return 0;
    return ((selling - cost) / selling * 100).toFixed(0);
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || categoryFilter === "Todos" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">A carregar catálogo...</p>
        </div>
      </div>
    );
  }

  // Se não tem loja dropshipping
  if (!myStore) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Store size={28} className="text-amber-700" />
          </div>
          <h2 className="text-xl font-bold">Cria a tua Loja Primeiro</h2>
          <p className="text-gray-500 text-sm">Para acederes ao catálogo de fornecedores, precisas de criar a tua loja dropshipping.</p>
          <Button
            onClick={() => navigate("/criar-loja")}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl h-11"
          >
            Criar Loja Dropshipping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-base">Catálogo de Fornecedores</h1>
              <p className="text-xs text-gray-500">Escolhe produtos para a tua loja</p>
            </div>
            <div className="bg-amber-700 text-white text-xs px-3 py-1 rounded-full">
              {myStore.store_name}
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar produtos ou fornecedores..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border ${showFilters ? "bg-amber-700 text-white border-amber-700" : "bg-white border-gray-200"}`}
            >
              <Filter size={16} />
            </button>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === "Todos" ? "" : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                    (categoryFilter === cat) || (cat === "Todos" && !categoryFilter)
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contador */}
      <div className="max-w-2xl mx-auto px-4 py-3">
        <p className="text-xs text-gray-500">
          {filteredProducts.length} produtos disponíveis • {addedProducts.size} na tua loja
        </p>
      </div>

      {/* Grid de produtos */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const isAdded = addedProducts.has(product.id);
            const margin = product.suggested_price
              ? calcMargin(product.suggested_price, product.cost_price)
              : null;

            return (
              <div
                key={product.id}
                className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                  isAdded ? "border-green-300" : "border-gray-100"
                }`}
              >
                {/* Imagem */}
                <div className="relative h-36 bg-gray-100 flex items-center justify-center">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={32} className="text-gray-300" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isAdded && (
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} />
                        Na loja
                      </span>
                    )}
                    {product.total_sold > 10 && (
                      <span className="bg-amber-700 text-white text-xs px-2 py-0.5 rounded-full">
                        🔥 Popular
                      </span>
                    )}
                  </div>

                  {margin && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        +{margin}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                    {product.name}
                  </p>

                  <div className="flex items-center gap-1 mb-2">
                    <Store size={10} className="text-gray-400" />
                    <p className="text-xs text-gray-400 truncate">{product.suppliers?.company_name}</p>
                    {product.suppliers?.is_verified && (
                      <Check size={10} className="text-blue-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Custo</span>
                      <span className="text-xs font-bold text-amber-700">{formatKz(product.cost_price)}</span>
                    </div>
                    {product.suggested_price && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">Sugerido</span>
                        <span className="text-xs text-gray-600">{formatKz(product.suggested_price)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-400">Stock</span>
                      <span className={`text-xs font-medium ${product.stock_quantity < 10 ? "text-red-500" : "text-gray-600"}`}>
                        {product.stock_quantity} un.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isAdded) {
                        setSelectedProduct(product);
                        setSellingPrice(product.suggested_price?.toString() || "");
                      }
                    }}
                    disabled={isAdded}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                      isAdded
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-amber-700 text-white hover:bg-amber-800"
                    }`}
                  >
                    {isAdded ? (
                      <><Check size={12} /> Na minha loja</>
                    ) : (
                      <><Plus size={12} /> Adicionar</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Modal definir preço de venda */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-gray-800">{selectedProduct.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedProduct.suppliers?.company_name}</p>
              </div>
              <button
                onClick={() => { setSelectedProduct(null); setSellingPrice(""); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preços de referência */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Preço de custo (pagas ao fornecedor)</span>
                <span className="font-bold text-amber-700">{formatKz(selectedProduct.cost_price)}</span>
              </div>
              {selectedProduct.min_price && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preço mínimo de venda</span>
                  <span className="font-bold text-red-500">{formatKz(selectedProduct.min_price)}</span>
                </div>
              )}
              {selectedProduct.suggested_price && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preço sugerido pelo fornecedor</span>
                  <span className="font-bold text-green-600">{formatKz(selectedProduct.suggested_price)}</span>
                </div>
              )}
            </div>

            {/* Definir preço de venda */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                O teu preço de venda (Kz)
              </label>
              <Input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="Ex: 70000"
                className="rounded-xl text-lg font-bold text-center h-14"
              />
            </div>

            {/* Margem em tempo real */}
            {sellingPrice && parseFloat(sellingPrice) > selectedProduct.cost_price && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">O teu lucro por venda</span>
                  <span className="font-bold text-green-600">
                    {formatKz(parseFloat(sellingPrice) - selectedProduct.cost_price - (parseFloat(sellingPrice) * 0.15))}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Margem (após comissões)</span>
                  <span>{calcMargin(parseFloat(sellingPrice) - parseFloat(sellingPrice) * 0.15, selectedProduct.cost_price)}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">* Deduzidas comissões da plataforma (5%) e afiliados (10%)</p>
              </div>
            )}

            <Button
              onClick={handleAddToStore}
              disabled={addingProduct || !sellingPrice}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white h-13 rounded-xl font-semibold text-base"
            >
              {addingProduct ? "A adicionar..." : "Adicionar à minha loja"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
