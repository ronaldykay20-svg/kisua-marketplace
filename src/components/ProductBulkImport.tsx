import { useState, useRef } from "react";
import { Upload, Download, AlertTriangle, CheckCircle2, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  readSpreadsheetFile, parseProductRows, downloadImportTemplate,
  ParsedProductRow, ProductImportError, CategoryOption,
} from "@/lib/productImport";

interface Props {
  sellerId: string;
  sellerLabel?: string; // nome da loja, só para contexto visual no modo Admin
  onClose?: () => void;
  onImported?: () => void;
}

const ProductBulkImport = ({ sellerId, sellerLabel, onClose, onImported }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validRows, setValidRows] = useState<ParsedProductRow[]>([]);
  const [errorRows, setErrorRows] = useState<ProductImportError[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories_with_subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("id, name, parent_id")
        .eq("is_active", true).order("sort_order").order("name");
      if (error) throw error;
      return data as CategoryOption[];
    },
  });

  const reset = () => {
    setFileName(null);
    setValidRows([]);
    setErrorRows([]);
    setImportedCount(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedCount(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const rows = await readSpreadsheetFile(file);
      const { valid, errors } = parseProductRows(rows, categories);
      setValidRows(valid);
      setErrorRows(errors);
      if (valid.length === 0 && errors.length === 0) {
        toast.error("O ficheiro não tem nenhuma linha de produto.");
      }
    } catch (err: any) {
      toast.error(`Não consegui ler o ficheiro: ${err.message || "formato inválido"}.`);
      reset();
    }
    setParsing(false);
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const payload = validRows.map(r => ({
        seller_id: sellerId,
        title: r.title,
        description: r.description,
        price: r.price,
        old_price: r.old_price,
        discount_percent: r.discount_percent,
        stock: r.stock,
        sku: r.sku,
        condition: r.condition,
        category_id: r.category_id,
        free_shipping: r.free_shipping,
        weight_kg: r.weight_kg,
        length_cm: r.length_cm,
        width_cm: r.width_cm,
        height_cm: r.height_cm,
        is_active: true,
      }));

      // Inserido em blocos de 200 para não sobrecarregar um único pedido
      // caso o vendedor carregue uma folha muito grande.
      const chunkSize = 200;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      setImportedCount(inserted);
      toast.success(`${inserted} produto${inserted === 1 ? "" : "s"} importado${inserted === 1 ? "" : "s"}! Falta só adicionar as fotos a cada um.`);
      queryClient.invalidateQueries({ queryKey: ["seller_products"] });
      queryClient.invalidateQueries({ queryKey: ["admin_products"] });
      onImported?.();
    } catch (err: any) {
      toast.error(`Falha ao importar: ${err.message}`);
    }
    setImporting(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Importar produtos (Excel/CSV)</h3>
          {sellerLabel && <p className="text-[11px] text-muted-foreground">Loja: {sellerLabel}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1.5">
        <p>Carrega um ficheiro <strong>.xlsx</strong> ou <strong>.csv</strong> com uma linha por produto (colunas: Nome, Preço, Stock, Categoria, etc.).</p>
        <p>As <strong>fotos não vêm no ficheiro</strong> — depois de importar, entra em cada produto para adicionar as imagens.</p>
        <button type="button" onClick={downloadImportTemplate}
          className="flex items-center gap-1 text-primary font-bold mt-1">
          <Download className="w-3 h-3" /> Descarregar modelo em branco
        </button>
      </div>

      {!fileName ? (
        <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Escolher ficheiro .xlsx ou .csv</span>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground truncate">{fileName}</span>
            <button onClick={reset} className="text-muted-foreground hover:text-destructive font-bold">Trocar ficheiro</button>
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> A ler o ficheiro…
            </div>
          )}

          {!parsing && importedCount === null && (
            <>
              <div className="flex gap-2">
                {validRows.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} prontos para importar
                  </div>
                )}
                {errorRows.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> {errorRows.length} com erro
                  </div>
                )}
              </div>

              {errorRows.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 max-h-32 overflow-y-auto space-y-1">
                  {errorRows.map((e, i) => (
                    <p key={i} className="text-[10px] text-destructive">
                      Linha {e.rowNumber}: {e.message}
                    </p>
                  ))}
                </div>
              )}

              {validRows.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">Produto</th>
                          <th className="text-right px-2 py-1.5 font-bold text-muted-foreground">Preço</th>
                          <th className="text-right px-2 py-1.5 font-bold text-muted-foreground">Stock</th>
                          <th className="text-left px-2 py-1.5 font-bold text-muted-foreground">Categoria</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-2 py-1.5 text-foreground truncate max-w-[140px]">{r.title}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{r.price.toLocaleString("pt-AO")} Kz</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{r.stock}</td>
                            <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[100px]">{r.category_label || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {validRows.length > 0 && (
                <button onClick={handleImport} disabled={importing}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing ? "A importar…" : `Importar ${validRows.length} produto${validRows.length === 1 ? "" : "s"}`}
                </button>
              )}
            </>
          )}

          {importedCount !== null && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {importedCount} produtos importados com sucesso.
              </p>
              <p className="text-[11px] text-emerald-700/80 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 shrink-0" /> Já estão na lista de produtos, mas sem fotos — abre cada um para adicionar as imagens antes de ativar a venda.
              </p>
              <button onClick={reset} className="text-[11px] font-bold text-primary">Importar outro ficheiro</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductBulkImport;
