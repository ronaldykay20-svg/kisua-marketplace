import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Package, Plus, Check, Filter,
  ArrowLeft, Store, X, AlertCircle,
} from "lucide-react";

const CATEGORIES = [
  "Todos", "Eletrônicos", "Calçados", "Vestuário", "Acessórios",
  "Casa e Jardim", "Beleza", "Desporto", "Alimentação", "Outros",
];

export default function CatalogoFornecedores() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState("");
  const [category, setCategory]         = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [selected, setSelected]         = useState<any>(null);
  const [sellingPrice, setSellingPrice] = useState("");

  // ✅ Buscar loja do dropshipper — dropship_stores
  const { data: myStore } = useQuery({
    queryKey: ["my_dropship_store", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dropship_stores")
        .select("id, store_name")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ✅ Buscar produtos já adicionados — dropship_store_products
  const { data: addedIds = [] } = useQuery({
    queryKey: ["added_supplier_products", myStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dropship_store_products")
        .select("supplier_product_id")
        .eq("store_id", myStore!.id);
      if (error) throw error;
      return (data || []).map((d: any) => d.supplier_product_id);
    },
    enabled: !!myStore?.id,
  });

  const addedSet = new Set(addedIds);

  // ✅ Buscar catálogo — supplier_products com join em suppliers (approved)
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["supplier_catalogue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*, suppliers!inner(company_name, province, rating, is_verified, status)")
        .eq("status", "active")
        .eq("suppliers.status", "approved")
        .gt("stock_quantity", 0)
        .order("total_sold", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ✅ Adicionar produto à loja — insere em dropship_store_products
  const addProduct = useMutation({
    mutationFn: async () => {
      if (!myStore || !selected) return;
      const price = parseFloat(sellingPrice);
      const minP  = selected.min_price || selected.cost_price;
      if (!price || price < minP) {
        throw new Error(`Preço mínimo de venda: ${fmt(minP)}`);
      }
      const { error } = await supabase.from("dropship_store_products").insert({
        store_id: myStore.id,
        supplier_product_id: selected.id,
        selling_price: price,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["added_supplier_products"] });
      queryClient.invalidateQueries({ queryKey: ["dropship_store_products"] });
      toast.success(`"${selected?.name}" adicionado à tua loja!`);
      setSelected(null);
      setSellingPrice("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const fmt = (v: number) => `${(v || 0).toLocaleString("pt-AO")} Kz`;

  const calcMargin = (sell: number, cost: number) =>
    sell && cost ? ((sell - cost) / sell * 100).toFixed(0) : null;

  const filtered = products.filter((p: any) => {
    const mS = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.suppliers?.company_name?.toLowerCase().includes(search.toLowerCase());
    const mC = !category || category === "Todos" || p.category === category;
    return mS && mC;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem loja criada
  if (!myStore) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Cria a tua Loja Primeiro</h2>
          <p className="text-sm text-muted-foreground">
            Para acederes ao catálogo precisas de uma loja dropshipping.
          </p>
          <button
            onClick={() => navigate("/criar-loja")}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Criar Loja Dropshipping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">

      {/* Header fixo */}
      <div className="bg-background border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-3 py-3 max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-accent rounded-lg text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-base text-foreground">Catálogo de Fornecedores</h1>
              <p className="text-[10px] text-muted-foreground">Escolhe produtos para a tua loja</p>
            </div>
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-bold">
              {myStore.store_name}
            </span>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar produtos ou fornecedores..."
                className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showFilters
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground"
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Filtros por categoria */}
          {showFilters && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === "Todos" ? "" : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                    (category === cat) || (cat === "Todos" && !category)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-3 py-3 max-w-2xl">
        <p className="text-[10px] text-muted-foreground mb-3">
          {filtered.length} produtos disponíveis • {addedSet.size} na tua loja
        </p>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p: any) => {
            const isAdded = addedSet.has(p.id);
            const margin  = p.suggested_price
              ? calcMargin(p.suggested_price, p.cost_price)
              : null;

            return (
              <div
                key={p.id}
                className={`bg-card border rounded-2xl overflow-hidden ${
                  isAdded ? "border-green-500/40" : "border-border"
                }`}
              >
                {/* Imagem */}
                <div className="relative h-36 bg-muted flex items-center justify-center">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isAdded && (
                      <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Na loja
                      </span>
                    )}
                    {p.total_sold > 10 && (
                      <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                        🔥 Popular
                      </span>
                    )}
                  </div>

                  {margin && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      +{margin}%
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-1">
                    {p.name}
                  </p>

                  <div className="flex items-center gap-1 mb-2">
                    <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-[10px] text-muted-foreground truncate">
                      {p.suppliers?.company_name}
                    </p>
                    {p.suppliers?.is_verified && (
                      <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5 mb-3">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground">Custo</span>
                      <span className="text-[10px] font-bold text-primary">{fmt(p.cost_price)}</span>
                    </div>
                    {p.suggested_price && (
                      <div className="flex justify-between">
                        <span className="text-[10px] text-muted-foreground">Sugerido</span>
                        <span className="text-[10px] text-foreground">{fmt(p.suggested_price)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground">Stock</span>
                      <span className={`text-[10px] font-bold ${p.stock_quantity < 10 ? "text-destructive" : "text-foreground"}`}>
                        {p.stock_quantity} un.
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={isAdded}
                    onClick={() => {
                      if (!isAdded) {
                        setSelected(p);
                        setSellingPrice(p.suggested_price?.toString() || "");
                      }
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      isAdded
                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {isAdded
                      ? <><Check className="w-3 h-3" /> Na minha loja</>
                      : <><Plus className="w-3 h-3" /> Adicionar</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        )}
      </div>

      {/* Modal definir preço de venda */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-background w-full rounded-t-3xl p-6 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-foreground">{selected.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.suppliers?.company_name}
                </p>
              </div>
              <button
                onClick={() => { setSelected(null); setSellingPrice(""); }}
                className="p-2 hover:bg-accent rounded-full"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Preços de referência */}
            <div className="bg-muted rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço de custo</span>
                <span className="font-bold text-primary">{fmt(selected.cost_price)}</span>
              </div>
              {selected.min_price && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço mínimo</span>
                  <span className="font-bold text-destructive">{fmt(selected.min_price)}</span>
                </div>
              )}
              {selected.suggested_price && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço sugerido</span>
                  <span className="font-bold text-green-500">{fmt(selected.suggested_price)}</span>
                </div>
              )}
            </div>

            {/* Input preço de venda */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">
                O teu preço de venda (Kz)
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                placeholder="Ex: 70000"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg font-bold text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Margem em tempo real */}
            {sellingPrice && parseFloat(sellingPrice) > selected.cost_price && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">O teu lucro estimado</span>
                  <span className="font-bold text-green-500">
                    {fmt(parseFloat(sellingPrice) - selected.cost_price - parseFloat(sellingPrice) * 0.15)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  * Após comissões da plataforma (5%) e afiliados (10%)
                </p>
              </div>
            )}

            <button
              onClick={() => addProduct.mutate()}
              disabled={addProduct.isPending || !sellingPrice}
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm disabled:opacity-60"
            >
              {addProduct.isPending ? "A adicionar..." : "Adicionar à minha loja"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
