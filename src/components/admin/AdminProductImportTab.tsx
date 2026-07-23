import { useState } from "react";
import { Search, Store, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ProductBulkImport from "@/components/ProductBulkImport";

const AdminProductImportTab = () => {
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["admin_seller_search", search],
    queryFn: async () => {
      let q = supabase.from("sellers").select("id, name, logo_url, is_active").order("name").limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !selectedSeller,
  });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-sm font-bold text-foreground mb-1">Importar produtos em nome de um vendedor</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Escolhe a loja para a qual queres importar produtos via Excel/CSV. As fotos continuam a ser
          adicionadas depois, produto a produto.
        </p>

        {selectedSeller ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{selectedSeller.name}</span>
            </div>
            <button onClick={() => setSelectedSeller(null)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar loja/vendedor pelo nome…"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading && <p className="text-xs text-muted-foreground px-2 py-2">A procurar…</p>}
              {!isLoading && sellers.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">Nenhuma loja encontrada.</p>
              )}
              {sellers.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeller({ id: s.id, name: s.name })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition text-left"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                  ) : (
                    <Store className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-foreground flex-1 truncate">{s.name}</span>
                  {!s.is_active && <span className="text-[9px] font-bold text-destructive">Inativa</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedSeller && (
        <ProductBulkImport sellerId={selectedSeller.id} sellerLabel={selectedSeller.name} />
      )}
    </div>
  );
};

export default AdminProductImportTab;
