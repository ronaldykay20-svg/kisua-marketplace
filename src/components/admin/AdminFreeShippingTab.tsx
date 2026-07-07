import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFreight } from "@/hooks/useFreight";
import { Search, Truck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import type { FreeShippingScope } from "@/lib/freeShipping";
import { getFreeShippingLabel } from "@/lib/freeShipping";

const AdminFreeShippingTab = () => {
  const queryClient = useQueryClient();
  const { provinces, municipalities, loadingGeo } = useFreight();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [scope, setScope] = useState<FreeShippingScope>("nenhum");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityIds, setMunicipalityIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: products = [], isFetching } = useQuery({
    queryKey: ["admin_free_shipping_search", search],
    queryFn: async () => {
      if (search.trim().length < 2) return [];
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, title, price, free_shipping, free_shipping_scope, free_shipping_province_id, free_shipping_municipality_ids"
        )
        .ilike("title", `%${search.trim()}%`)
        .order("title")
        .limit(25);
      if (error) throw error;
      return data || [];
    },
  });

  const selectedProduct = products.find((p: any) => p.id === selectedId) || null;

  const openProduct = (p: any) => {
    setSelectedId(p.id);
    setScope((p.free_shipping_scope as FreeShippingScope) || "nenhum");
    setProvinceId(p.free_shipping_province_id ?? null);
    setMunicipalityIds(p.free_shipping_municipality_ids ?? []);
  };

  const municipalitiesOfProvince = provinceId
    ? municipalities.filter((m) => m.province_id === provinceId)
    : [];

  const toggleMunicipality = (id: number) => {
    setMunicipalityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const payload: any = {
        free_shipping: scope !== "nenhum",
        free_shipping_scope: scope,
        free_shipping_province_id: scope === "nenhum" ? null : provinceId,
        free_shipping_municipality_ids:
          scope === "municipio" || scope === "alguns_municipios" ? municipalityIds : null,
      };

      if (scope === "municipio" && municipalityIds.length !== 1) {
        toast.error("Escolhe exactamente um município para este âmbito.");
        setSaving(false);
        return;
      }
      if (scope !== "nenhum" && !provinceId) {
        toast.error("Escolhe a província do frete grátis.");
        setSaving(false);
        return;
      }
      if (scope === "alguns_municipios" && municipalityIds.length === 0) {
        toast.error("Escolhe pelo menos um município.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("products").update(payload).eq("id", selectedProduct.id);
      if (error) throw error;

      toast.success("Frete grátis actualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin_free_shipping_search"] });
      setSelectedId(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const previewLabel = selectedProduct
    ? getFreeShippingLabel(
        {
          free_shipping_scope: scope,
          free_shipping_province_id: provinceId,
          free_shipping_municipality_ids: municipalityIds,
        },
        municipalities,
        provinces
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-sm font-bold text-foreground">Frete grátis por produto</h2>
          <p className="text-xs text-muted-foreground">
            Escolhe um produto e define em que município(s) ele tem entrega grátis.
          </p>
        </div>
      </div>

      {/* Pesquisa de produto */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar produto pelo nome…"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm"
        />
      </div>

      {isFetching && search.trim().length >= 2 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> A procurar…
        </p>
      )}

      <div className="space-y-1.5">
        {products.map((p: any) => (
          <button
            key={p.id}
            onClick={() => openProduct(p)}
            className={`w-full flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
              selectedId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground">{Number(p.price).toLocaleString("pt-AO")} Kz</p>
            </div>
            {p.free_shipping_scope && p.free_shipping_scope !== "nenhum" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 whitespace-nowrap">
                <Check className="w-3 h-3" /> Frete grátis activo
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Formulário do produto seleccionado */}
      {selectedProduct && (
        <div className="rounded-xl border border-border p-4 space-y-4 bg-card">
          <h3 className="text-sm font-bold text-foreground">{selectedProduct.title}</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Âmbito do frete grátis</label>
            <select
              value={scope}
              onChange={(e) => {
                const v = e.target.value as FreeShippingScope;
                setScope(v);
                setMunicipalityIds([]);
              }}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="nenhum">Sem frete grátis</option>
              <option value="municipio">Apenas um município</option>
              <option value="alguns_municipios">Alguns municípios</option>
              <option value="toda_provincia">Toda a província</option>
            </select>
          </div>

          {scope !== "nenhum" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Província</label>
              <select
                value={provinceId ?? ""}
                onChange={(e) => {
                  setProvinceId(e.target.value ? Number(e.target.value) : null);
                  setMunicipalityIds([]);
                }}
                disabled={loadingGeo}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Seleccionar…</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {(scope === "municipio" || scope === "alguns_municipios") && provinceId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {scope === "municipio" ? "Município" : "Municípios (podes escolher vários)"}
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {municipalitiesOfProvince.map((m) => {
                  const checked = municipalityIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (scope === "municipio") setMunicipalityIds([m.id]);
                        else toggleMunicipality(m.id);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-left transition-colors ${
                        checked ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-foreground"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 shrink-0" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {previewLabel && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Pré-visualização no card: <span className="font-semibold">{previewLabel}</span>
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
            >
              {saving ? "A guardar…" : "Guardar"}
            </button>
            <button
              onClick={() => setSelectedId(null)}
              className="h-10 px-4 rounded-lg border border-border text-sm font-semibold text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFreeShippingTab;
