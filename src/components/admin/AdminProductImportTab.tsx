import { useState } from "react";
import { Search, Store, Building2, Truck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ProductBulkImport, { ImportTarget } from "@/components/ProductBulkImport";

type Kind = "seller" | "company" | "supplier";

const KIND_CONFIG: Record<Kind, { label: string; table: string; nameColumn: string; icon: any }> = {
  seller:   { label: "Vendedor",   table: "sellers",   nameColumn: "name",         icon: Store },
  company:  { label: "Empresa",    table: "companies", nameColumn: "name",         icon: Building2 },
  supplier: { label: "Fornecedor", table: "suppliers", nameColumn: "company_name", icon: Truck },
};

const AdminProductImportTab = () => {
  const [kind, setKind] = useState<Kind>("seller");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const config = KIND_CONFIG[kind];

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["admin_target_search", kind, search],
    queryFn: async () => {
      let q = (supabase as any).from(config.table).select("*").order(config.nameColumn).limit(20);
      if (search.trim()) q = q.ilike(config.nameColumn, `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r[config.nameColumn],
        logo_url: r.logo_url,
        isActive: kind === "supplier" ? r.status === "active" || r.status === "approved" : r.is_active !== false,
      }));
    },
    enabled: !selected,
  });

  const changeKind = (k: Kind) => {
    setKind(k);
    setSelected(null);
    setSearch("");
  };

  const target: ImportTarget | null = selected ? { kind, id: selected.id } : null;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-sm font-bold text-foreground mb-1">Importar produtos em nome de um vendedor, empresa ou fornecedor</h2>
        <p className="text-xs text-muted-foreground mb-3">
          As fotos continuam a ser adicionadas depois, produto a produto — os produtos importados entram sempre
          inativos até terem pelo menos uma imagem.
        </p>

        <div className="flex gap-1.5 mb-3">
          {(Object.keys(KIND_CONFIG) as Kind[]).map(k => {
            const c = KIND_CONFIG[k];
            return (
              <button
                key={k}
                onClick={() => changeKind(k)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-bold border transition ${
                  kind === k ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border"
                }`}
              >
                <c.icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-2">
              <config.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{selected.name}</span>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 rounded-full hover:bg-accent text-muted-foreground">
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
                placeholder={`Pesquisar ${config.label.toLowerCase()} pelo nome…`}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {isLoading && <p className="text-xs text-muted-foreground px-2 py-2">A procurar…</p>}
              {!isLoading && results.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">Nenhum resultado encontrado.</p>
              )}
              {results.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => setSelected({ id: r.id, name: r.name })}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition text-left"
                >
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                  ) : (
                    <config.icon className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-foreground flex-1 truncate">{r.name}</span>
                  {!r.isActive && <span className="text-[9px] font-bold text-destructive">Inativo</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {target && selected && (
        <ProductBulkImport target={target} targetLabel={selected.name} />
      )}
    </div>
  );
};

export default AdminProductImportTab;
