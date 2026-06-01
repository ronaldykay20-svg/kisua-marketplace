import { useState, useEffect, useCallback } from "react";
import { useAdminFreight, FreightZone, FreightSettings } from "@/hooks/useFreight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Settings,
  Truck,
  MapPin,
  Globe,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeftRight,
  Scale,
  X,
} from "lucide-react";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ZoneType = "intra_municipal" | "intra_provincial" | "interprovincial";
type MeasureType = "weight" | "volume" | "dimensions" | "weight_volume";
type PricingModel = "fixed" | "per_unit" | "tiers";

interface Tier {
  min_value: string;
  max_value: string; // "" = sem limite
  price_kwz: string;
  express_price_kwz: string;
}

interface ZoneForm {
  id?: number;
  zone_type: ZoneType;
  origin_province_id: string;
  origin_municipality_id: string;
  dest_province_id: string;
  dest_municipality_id: string;
  price_kwz: string;
  has_express: boolean;
  express_price_kwz: string;
  standard_days_min: string;
  standard_days_max: string;
  express_days_min: string;
  express_days_max: string;
  is_active: boolean;
  notes: string;
  // Medidas
  measure_type: MeasureType | "";
  pricing_model: PricingModel;
  base_price_kwz: string;
  price_per_kg: string;
  price_per_m3: string;
  max_weight_kg: string;
  max_volume_m3: string;
  max_length_cm: string;
  max_width_cm: string;
  max_height_cm: string;
  tiers: Tier[];
  expand_all_dest_municipalities: boolean;
}

const EMPTY_TIER: Tier = {
  min_value: "",
  max_value: "",
  price_kwz: "",
  express_price_kwz: "",
};

const EMPTY_FORM: ZoneForm = {
  zone_type: "intra_municipal",
  origin_province_id: "",
  origin_municipality_id: "",
  dest_province_id: "",
  dest_municipality_id: "",
  price_kwz: "",
  has_express: false,
  express_price_kwz: "",
  standard_days_min: "1",
  standard_days_max: "3",
  express_days_min: "0",
  express_days_max: "1",
  is_active: true,
  notes: "",
  // Medidas
  measure_type: "",
  pricing_model: "fixed",
  base_price_kwz: "",
  price_per_kg: "",
  price_per_m3: "",
  max_weight_kg: "",
  max_volume_m3: "",
  max_length_cm: "",
  max_width_cm: "",
  max_height_cm: "",
  tiers: [],
  expand_all_dest_municipalities: false,
};

const ZONE_LABELS: Record<ZoneType, string> = {
  intra_municipal: "Intra-municipal",
  intra_provincial: "Intra-provincial",
  interprovincial: "Interprovincial",
};

const ZONE_COLORS: Record<ZoneType, string> = {
  intra_municipal: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  intra_provincial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  interprovincial: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const MEASURE_LABELS: Record<MeasureType, string> = {
  weight: "Peso (kg)",
  volume: "Volume (m³)",
  dimensions: "Dimensões (cm)",
  weight_volume: "Peso + Volume",
};

const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  fixed: "Preço fixo",
  per_unit: "Por unidade (base + x/kg ou m³)",
  tiers: "Faixas (ex: 0–5kg = 500kz)",
};

// ─── Estilo para <select> nativo ──────────────────────────────────────────────
const nativeSelectClass =
  "w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

// ─── Utilitário: formatar Kz ──────────────────────────────────────────────────
const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

// ─── Secção de separador ──────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminFreightTab() {
  const {
    zones,
    settings,
    loading,
    saving,
    error,
    saveZone,
    toggleZone,
    deleteZone,
    saveSettings,
    provinces,
    municipalities,
  } = useAdminFreight();

  const getMunicipalitiesByProvince = useCallback(
    (provinceId: number) =>
      municipalities.filter((m) => m.province_id === provinceId),
    [municipalities]
  );

  const loadingGeo = loading && provinces.length === 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Estado para diálogo de rota oposta
  const [reverseRouteDialog, setReverseRouteDialog] = useState<{
    open: boolean;
    savedZone: any | null;
  }>({ open: false, savedZone: null });

  const [filterType, setFilterType] = useState<ZoneType | "all">("all");
  const [filterOriginProv, setFilterOriginProv] = useState<string>("all");
  const [filterDestProv, setFilterDestProv] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [localSettings, setLocalSettings] = useState<Partial<FreightSettings>>({});

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  // ── Helpers de formulário ──────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (zone: any) => {
    setForm({
      id: zone.id,
      zone_type: zone.zone_type,
      origin_province_id: String(zone.origin_province_id),
      origin_municipality_id: zone.origin_municipality_id
        ? String(zone.origin_municipality_id)
        : "",
      dest_province_id: String(zone.dest_province_id),
      dest_municipality_id: zone.dest_municipality_id
        ? String(zone.dest_municipality_id)
        : "",
      price_kwz: String(zone.price_kwz),
      has_express: zone.has_express,
      express_price_kwz: zone.express_price_kwz
        ? String(zone.express_price_kwz)
        : "",
      standard_days_min: String(zone.standard_days_min),
      standard_days_max: String(zone.standard_days_max),
      express_days_min: zone.express_days_min ? String(zone.express_days_min) : "0",
      express_days_max: zone.express_days_max ? String(zone.express_days_max) : "1",
      is_active: zone.is_active,
      notes: zone.notes ?? "",
      // Medidas
      measure_type: zone.measure_type ?? "",
      pricing_model: zone.pricing_model ?? "fixed",
      base_price_kwz: zone.base_price_kwz ? String(zone.base_price_kwz) : "",
      price_per_kg: zone.price_per_kg ? String(zone.price_per_kg) : "",
      price_per_m3: zone.price_per_m3 ? String(zone.price_per_m3) : "",
      max_weight_kg: zone.max_weight_kg ? String(zone.max_weight_kg) : "",
      max_volume_m3: zone.max_volume_m3 ? String(zone.max_volume_m3) : "",
      max_length_cm: zone.max_length_cm ? String(zone.max_length_cm) : "",
      max_width_cm: zone.max_width_cm ? String(zone.max_width_cm) : "",
      max_height_cm: zone.max_height_cm ? String(zone.max_height_cm) : "",
      tiers: zone.tiers
        ? zone.tiers.map((t: any) => ({
            min_value: String(t.min_value),
            max_value: t.max_value != null ? String(t.max_value) : "",
            price_kwz: String(t.price_kwz),
            express_price_kwz: t.express_price_kwz
              ? String(t.express_price_kwz)
              : "",
          }))
        : [],
      expand_all_dest_municipalities: zone.expand_all_dest_municipalities ?? false,
    });
    setModalOpen(true);
  };

  const setField = (key: keyof ZoneForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleZoneTypeChange = (val: ZoneType) => {
    setField("zone_type", val);
    if (val === "intra_provincial" || val === "interprovincial") {
      setField("origin_municipality_id", "");
      setField("dest_municipality_id", "");
    }
  };

  // ── Tiers helpers ──────────────────────────────────────────────────────────

  const addTier = () =>
    setForm((f) => ({ ...f, tiers: [...f.tiers, { ...EMPTY_TIER }] }));

  const removeTier = (i: number) =>
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

  const updateTier = (i: number, key: keyof Tier, value: string) =>
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)),
    }));

  // ── Unidade de medida para tiers ───────────────────────────────────────────
  const tierUnit =
    form.measure_type === "volume" || form.measure_type === "weight_volume"
      ? "m³"
      : "kg";

  // ── Submeter zona ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.origin_province_id || !form.dest_province_id) {
      toast({ title: "Preenche origem e destino", variant: "destructive" });
      return;
    }

    // Validação por modelo de preço
    if (form.pricing_model === "fixed") {
      if (!form.price_kwz || isNaN(Number(form.price_kwz))) {
        toast({ title: "Preço inválido", variant: "destructive" });
        return;
      }
    } else if (form.pricing_model === "per_unit") {
      if (!form.base_price_kwz || isNaN(Number(form.base_price_kwz))) {
        toast({ title: "Preço base inválido", variant: "destructive" });
        return;
      }
    } else if (form.pricing_model === "tiers") {
      if (form.tiers.length === 0) {
        toast({ title: "Adiciona pelo menos uma faixa", variant: "destructive" });
        return;
      }
    }

    const payload = {
      id: form.id,
      zone_type: form.zone_type,
      origin_province_id: Number(form.origin_province_id),
      origin_municipality_id: form.origin_municipality_id
        ? Number(form.origin_municipality_id)
        : null,
      dest_province_id: Number(form.dest_province_id),
      dest_municipality_id: form.dest_municipality_id
        ? Number(form.dest_municipality_id)
        : null,
      price_kwz: form.pricing_model === "fixed" ? Number(form.price_kwz) : 0,
      has_express: form.has_express,
      express_price_kwz:
        form.has_express && form.express_price_kwz
          ? Number(form.express_price_kwz)
          : null,
      standard_days_min: Number(form.standard_days_min),
      standard_days_max: Number(form.standard_days_max),
      express_days_min: form.has_express ? Number(form.express_days_min) : null,
      express_days_max: form.has_express ? Number(form.express_days_max) : null,
      is_active: form.is_active,
      notes: form.notes || null,
      // Medidas
      measure_type: form.measure_type || null,
      pricing_model: form.pricing_model,
      base_price_kwz: form.base_price_kwz ? Number(form.base_price_kwz) : null,
      price_per_kg: form.price_per_kg ? Number(form.price_per_kg) : null,
      price_per_m3: form.price_per_m3 ? Number(form.price_per_m3) : null,
      max_weight_kg: form.max_weight_kg ? Number(form.max_weight_kg) : null,
      max_volume_m3: form.max_volume_m3 ? Number(form.max_volume_m3) : null,
      max_length_cm: form.max_length_cm ? Number(form.max_length_cm) : null,
      max_width_cm: form.max_width_cm ? Number(form.max_width_cm) : null,
      max_height_cm: form.max_height_cm ? Number(form.max_height_cm) : null,
      expand_all_dest_municipalities: form.expand_all_dest_municipalities,
      tiers:
        form.pricing_model === "tiers"
          ? form.tiers.map((t) => ({
              measure_type:
                form.measure_type === "volume" ? "volume" : "weight",
              min_value: Number(t.min_value),
              max_value: t.max_value !== "" ? Number(t.max_value) : null,
              price_kwz: Number(t.price_kwz),
              express_price_kwz: t.express_price_kwz
                ? Number(t.express_price_kwz)
                : null,
            }))
          : [],
    };

    const ok = await saveZone(payload);

    if (ok) {
      toast({ title: form.id ? "Zona actualizada" : "Zona criada" });
      setModalOpen(false);

      // Só perguntar sobre rota oposta ao criar (não ao editar)
      if (!form.id) {
        setReverseRouteDialog({ open: true, savedZone: payload });
      }
    } else {
      toast({ title: "Erro ao guardar zona", variant: "destructive" });
    }
  };

  // ── Criar rota oposta ──────────────────────────────────────────────────────

  const handleCreateReverseRoute = async () => {
    const z = reverseRouteDialog.savedZone;
    if (!z) return;

    const reversePayload = {
      ...z,
      id: undefined,
      origin_province_id: z.dest_province_id,
      origin_municipality_id: z.dest_municipality_id,
      dest_province_id: z.origin_province_id,
      dest_municipality_id: z.origin_municipality_id,
    };

    const ok = await saveZone(reversePayload);
    toast({
      title: ok ? "Rota oposta criada" : "Erro ao criar rota oposta",
      variant: ok ? "default" : "destructive",
    });
    setReverseRouteDialog({ open: false, savedZone: null });
  };

  // ── Guardar settings ───────────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    const ok = await saveSettings(localSettings);
    toast({
      title: ok ? "Configurações guardadas" : "Erro ao guardar",
      variant: ok ? "default" : "destructive",
    });
  };

  // ── Filtrar zonas ──────────────────────────────────────────────────────────

  const filtered = zones.filter((z: any) => {
    if (filterType !== "all" && z.zone_type !== filterType) return false;
    if (
      filterOriginProv !== "all" &&
      String(z.origin_province_id) !== filterOriginProv
    )
      return false;
    if (
      filterDestProv !== "all" &&
      String(z.dest_province_id) !== filterDestProv
    )
      return false;
    if (search) {
      const q = search.toLowerCase();
      const origProv = z.origin_province?.name?.toLowerCase() ?? "";
      const origMun = z.origin_municipality?.name?.toLowerCase() ?? "";
      const destProv = z.dest_province?.name?.toLowerCase() ?? "";
      const destMun = z.dest_municipality?.name?.toLowerCase() ?? "";
      if (
        !origProv.includes(q) &&
        !origMun.includes(q) &&
        !destProv.includes(q) &&
        !destMun.includes(q)
      )
        return false;
    }
    return true;
  });

  // ── Municípios disponíveis no formulário ───────────────────────────────────

  const originMunicipalities = form.origin_province_id
    ? getMunicipalitiesByProvince(Number(form.origin_province_id))
    : [];

  const destMunicipalities = form.dest_province_id
    ? getMunicipalitiesByProvince(Number(form.dest_province_id))
    : [];

  const showMunicipalities = form.zone_type === "intra_municipal";

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingGeo) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          A carregar dados geográficos…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <Tabs defaultValue="zones">
        <TabsList className="mb-4">
          <TabsTrigger value="zones" className="gap-2">
            <Truck className="w-4 h-4" /> Zonas de Frete
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> Configurações Globais
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════ TAB: ZONAS ══════════════════ */}
        <TabsContent value="zones" className="space-y-4">
          {/* Barra de acções */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nova Zona
            </Button>

            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <select
              className={nativeSelectClass + " w-44 h-9"}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">Todos os tipos</option>
              <option value="intra_municipal">Intra-municipal</option>
              <option value="intra_provincial">Intra-provincial</option>
              <option value="interprovincial">Interprovincial</option>
            </select>

            <select
              className={nativeSelectClass + " w-44 h-9"}
              value={filterOriginProv}
              onChange={(e) => setFilterOriginProv(e.target.value)}
            >
              <option value="all">Todas as origens</option>
              {provinces.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>

            <select
              className={nativeSelectClass + " w-44 h-9"}
              value={filterDestProv}
              onChange={(e) => setFilterDestProv(e.target.value)}
            >
              <option value="all">Todos os destinos</option>
              {provinces.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>

            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} zona{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma zona encontrada.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={openCreate}
              >
                Criar primeira zona
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Expressa</TableHead>
                    <TableHead>Medida</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((zone: any) => (
                    <TableRow key={zone.id} className="group">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            ZONE_COLORS[zone.zone_type as ZoneType]
                          }`}
                        >
                          {ZONE_LABELS[zone.zone_type as ZoneType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {zone.origin_province?.name ?? "—"}
                          </span>
                          {zone.origin_municipality && (
                            <span className="text-muted-foreground">
                              › {zone.origin_municipality.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {zone.dest_province?.name ?? "—"}
                          </span>
                          {zone.dest_municipality && (
                            <span className="text-muted-foreground">
                              › {zone.dest_municipality.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {zone.pricing_model === "tiers" ? (
                          <span className="text-xs text-muted-foreground">Faixas</span>
                        ) : zone.pricing_model === "per_unit" ? (
                          <span className="text-xs text-muted-foreground">
                            {zone.base_price_kwz
                              ? fmtKz(zone.base_price_kwz)
                              : "—"}{" "}
                            base
                          </span>
                        ) : (
                          fmtKz(zone.price_kwz)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {zone.has_express && zone.express_price_kwz ? (
                          fmtKz(zone.express_price_kwz)
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {zone.measure_type
                          ? MEASURE_LABELS[zone.measure_type as MeasureType]
                          : <span className="text-xs opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {zone.standard_days_min}–{zone.standard_days_max} dias
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleZone(zone.id, !zone.is_active)}
                          className="flex items-center gap-1 text-xs"
                        >
                          {zone.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-green-500" />
                              <span className="text-green-500">Activa</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Inactiva</span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openEdit(zone)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(zone.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ══════════════════ TAB: SETTINGS ══════════════════ */}
        <TabsContent value="settings" className="space-y-6 max-w-xl">
          <div className="rounded-lg border p-5 space-y-5">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Preço padrão global
            </h3>
            <div className="space-y-2">
              <Label>Preço padrão (Kz)</Label>
              <Input
                type="number"
                min={0}
                value={localSettings.default_price_kwz ?? ""}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    default_price_kwz: Number(e.target.value),
                  }))
                }
                placeholder="1500.00"
              />
              <p className="text-xs text-muted-foreground">
                Usado como fallback quando nenhuma regra de zona existe para a
                rota.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Frete grátis acima de (Kz)</Label>
              <Input
                type="number"
                min={0}
                value={localSettings.free_shipping_threshold ?? ""}
                onChange={(e) =>
                  setLocalSettings((s) => ({
                    ...s,
                    free_shipping_threshold: Number(e.target.value),
                  }))
                }
                placeholder="0 = desactivado"
              />
              <p className="text-xs text-muted-foreground">
                Quando o valor do carrinho ultrapassa este valor, o frete é
                grátis. 0 = desactivado.
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4" /> Controlo dos vendedores
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Forçar preço padrão global</p>
                <p className="text-xs text-muted-foreground">
                  Todos os vendedores usam o preço padrão acima,
                  independentemente das suas configurações.
                </p>
              </div>
              <Switch
                checked={localSettings.force_default_for_sellers ?? false}
                onCheckedChange={(v) =>
                  setLocalSettings((s) => ({
                    ...s,
                    force_default_for_sellers: v,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Permitir frete personalizado</p>
                <p className="text-xs text-muted-foreground">
                  Os vendedores podem configurar os seus próprios preços de
                  entrega.
                </p>
              </div>
              <Switch
                checked={localSettings.allow_seller_custom ?? true}
                onCheckedChange={(v) =>
                  setLocalSettings((s) => ({ ...s, allow_seller_custom: v }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Scale className="w-4 h-4" /> Preço da empresa por tipo de zona
            </h3>
            <p className="text-xs text-muted-foreground">
              Quando activado, todos os vendedores usam o preço definido pela empresa
              para cada tipo de zona, independentemente das suas configurações individuais.
            </p>
            {(["intra_municipal", "intra_provincial", "interprovincial"] as ZoneType[]).map((zt) => (
              <div key={zt} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ZONE_LABELS[zt]}</p>
                    <p className="text-xs text-muted-foreground">
                      Forçar preço da empresa para rotas {ZONE_LABELS[zt].toLowerCase()}
                    </p>
                  </div>
                  <Switch
                    checked={!!(localSettings as any)[`force_price_${zt}`]}
                    onCheckedChange={(v) =>
                      setLocalSettings((s) => ({ ...s, [`force_price_${zt}`]: v }))
                    }
                  />
                </div>
                {(localSettings as any)[`force_price_${zt}`] && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Preço normal (Kz)</Label>
                      <Input
                        type="number" min={0}
                        value={(localSettings as any)[`company_price_${zt}`] ?? ""}
                        onChange={(e) =>
                          setLocalSettings((s) => ({
                            ...s,
                            [`company_price_${zt}`]: Number(e.target.value),
                          }))
                        }
                        placeholder="ex: 1500"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preço expressa (Kz)</Label>
                      <Input
                        type="number" min={0}
                        value={(localSettings as any)[`company_express_price_${zt}`] ?? ""}
                        onChange={(e) =>
                          setLocalSettings((s) => ({
                            ...s,
                            [`company_express_price_${zt}`]: Number(e.target.value),
                          }))
                        }
                        placeholder="opcional"
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar configurações
          </Button>
        </TabsContent>
      </Tabs>

      {/* ══════════════════ MODAL: CRIAR / EDITAR ZONA ══════════════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar zona de frete" : "Nova zona de frete"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Tipo de zona */}
            <div className="space-y-2">
              <Label>Tipo de zona</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "intra_municipal",
                    "intra_provincial",
                    "interprovincial",
                  ] as ZoneType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleZoneTypeChange(t)}
                    className={`rounded-lg border p-3 text-sm text-left transition-all ${
                      form.zone_type === t
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span
                      className={`block text-xs mb-1 ${ZONE_COLORS[t]} px-1.5 py-0.5 rounded w-fit`}
                    >
                      {ZONE_LABELS[t]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t === "intra_municipal" &&
                        "Municípios da mesma província"}
                      {t === "intra_provincial" && "Toda a província"}
                      {t === "interprovincial" && "Entre províncias"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Origem */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin_province">Província de origem</Label>
                <select
                  id="origin_province"
                  className={nativeSelectClass}
                  value={form.origin_province_id}
                  onChange={(e) => {
                    setField("origin_province_id", e.target.value);
                    setField("origin_municipality_id", "");
                  }}
                >
                  <option value="">Seleccionar…</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {showMunicipalities && (
                <div className="space-y-2">
                  <Label htmlFor="origin_municipality">
                    Município de origem{" "}
                    <span className="text-muted-foreground text-xs">
                      (opcional)
                    </span>
                  </Label>
                  <select
                    id="origin_municipality"
                    className={nativeSelectClass}
                    value={form.origin_municipality_id}
                    disabled={!form.origin_province_id}
                    onChange={(e) =>
                      setField("origin_municipality_id", e.target.value)
                    }
                  >
                    <option value="">Todos os municípios</option>
                    {originMunicipalities.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest_province">Província de destino</Label>
                <select
                  id="dest_province"
                  className={nativeSelectClass}
                  value={form.dest_province_id}
                  onChange={(e) => {
                    setField("dest_province_id", e.target.value);
                    setField("dest_municipality_id", "");
                  }}
                >
                  <option value="">Seleccionar…</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dest_municipality">
                  Município de destino{" "}
                  <span className="text-muted-foreground text-xs">
                    (opcional)
                  </span>
                </Label>
                <select
                  id="dest_municipality"
                  className={nativeSelectClass}
                  value={form.dest_municipality_id}
                  disabled={!form.dest_province_id}
                  onChange={(e) =>
                    setField("dest_municipality_id", e.target.value)
                  }
                >
                  <option value="">Todos os municípios</option>
                  {destMunicipalities.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expandir para todos os municípios */}
            {!form.dest_municipality_id && form.dest_province_id && (
              <div className="flex items-center justify-between rounded-lg border border-dashed p-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    Aplicar a todos os municípios do destino
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cria automaticamente uma rota individual para cada município da
                    província de destino seleccionada. Se mais tarde configurares uma
                    rota específica para um município, ela terá prioridade.
                  </p>
                </div>
                <Switch
                  checked={form.expand_all_dest_municipalities}
                  onCheckedChange={(v) => setField("expand_all_dest_municipalities", v)}
                />
              </div>
            )}

            {/* ── MEDIDAS ── */}
            <SectionDivider label="Medidas e preço" />

            {/* Tipo de medida */}
            <div className="space-y-2">
              <Label>Tipo de medida</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    "weight",
                    "volume",
                    "dimensions",
                    "weight_volume",
                  ] as MeasureType[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setField(
                        "measure_type",
                        form.measure_type === m ? "" : m
                      )
                    }
                    className={`rounded-lg border p-2.5 text-xs text-left transition-all ${
                      form.measure_type === m
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5 mb-1 opacity-60" />
                    {MEASURE_LABELS[m]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Define a unidade usada para calcular o preço do frete nesta zona.
              </p>
            </div>

            {/* Modelo de preço */}
            {form.measure_type && (
              <div className="space-y-2">
                <Label>Modelo de preço</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(["fixed", "per_unit", "tiers"] as PricingModel[]).map(
                    (pm) => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => setField("pricing_model", pm)}
                        className={`rounded-lg border p-3 text-xs text-left transition-all ${
                          form.pricing_model === pm
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        {PRICING_MODEL_LABELS[pm]}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Preço fixo */}
            {(!form.measure_type || form.pricing_model === "fixed") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço normal (Kz)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price_kwz}
                    onChange={(e) => setField("price_kwz", e.target.value)}
                    placeholder="ex: 1200"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Entrega expressa</Label>
                    <Switch
                      checked={form.has_express}
                      onCheckedChange={(v) => setField("has_express", v)}
                    />
                  </div>
                  {form.has_express && (
                    <Input
                      type="number"
                      min={0}
                      value={form.express_price_kwz}
                      onChange={(e) =>
                        setField("express_price_kwz", e.target.value)
                      }
                      placeholder="Preço expressa (Kz)"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Por unidade */}
            {form.measure_type && form.pricing_model === "per_unit" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço base (Kz)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.base_price_kwz}
                      onChange={(e) =>
                        setField("base_price_kwz", e.target.value)
                      }
                      placeholder="ex: 300"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor mínimo cobrado independentemente do peso/volume.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(form.measure_type === "weight" ||
                      form.measure_type === "weight_volume") && (
                      <>
                        <Label>Preço por kg (Kz)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.price_per_kg}
                          onChange={(e) =>
                            setField("price_per_kg", e.target.value)
                          }
                          placeholder="ex: 50"
                        />
                      </>
                    )}
                    {(form.measure_type === "volume" ||
                      form.measure_type === "weight_volume") && (
                      <>
                        <Label>Preço por m³ (Kz)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.price_per_m3}
                          onChange={(e) =>
                            setField("price_per_m3", e.target.value)
                          }
                          placeholder="ex: 2000"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Expressa para per_unit */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Entrega expressa</Label>
                  <Switch
                    checked={form.has_express}
                    onCheckedChange={(v) => setField("has_express", v)}
                  />
                </div>
                {form.has_express && (
                  <Input
                    type="number"
                    min={0}
                    value={form.express_price_kwz}
                    onChange={(e) =>
                      setField("express_price_kwz", e.target.value)
                    }
                    placeholder="Preço fixo adicional para expressa (Kz)"
                  />
                )}
              </div>
            )}

            {/* Faixas (tiers) */}
            {form.measure_type && form.pricing_model === "tiers" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Faixas de preço{" "}
                    <span className="text-muted-foreground text-xs">
                      (por {tierUnit})
                    </span>
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7 text-xs"
                    onClick={addTier}
                  >
                    <Plus className="w-3 h-3" /> Adicionar faixa
                  </Button>
                </div>

                {form.tiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Nenhuma faixa definida. Clica em "Adicionar faixa".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                      <span>
                        Mín ({tierUnit})
                      </span>
                      <span>
                        Máx ({tierUnit})
                      </span>
                      <span>Preço (Kz)</span>
                      <span>Expressa (Kz)</span>
                      <span />
                    </div>
                    {form.tiers.map((tier, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center"
                      >
                        <Input
                          type="number"
                          min={0}
                          value={tier.min_value}
                          onChange={(e) =>
                            updateTier(i, "min_value", e.target.value)
                          }
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={tier.max_value}
                          onChange={(e) =>
                            updateTier(i, "max_value", e.target.value)
                          }
                          placeholder="∞"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={tier.price_kwz}
                          onChange={(e) =>
                            updateTier(i, "price_kwz", e.target.value)
                          }
                          placeholder="500"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={tier.express_price_kwz}
                          onChange={(e) =>
                            updateTier(i, "express_price_kwz", e.target.value)
                          }
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTier(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">
                      Deixa o campo Máx vazio para indicar "sem limite superior".
                      {form.has_express
                        ? " Expressa é opcional por faixa."
                        : ""}
                    </p>
                  </div>
                )}

                {/* Toggle expressa para tiers */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Entrega expressa disponível</p>
                    <p className="text-xs text-muted-foreground">
                      Activa o campo de preço expressa em cada faixa.
                    </p>
                  </div>
                  <Switch
                    checked={form.has_express}
                    onCheckedChange={(v) => setField("has_express", v)}
                  />
                </div>
              </div>
            )}

            {/* Limites de dimensões (quando measure_type inclui dimensões) */}
            {(form.measure_type === "dimensions" ||
              form.measure_type === "weight_volume") && (
              <div className="space-y-2">
                <Label>
                  Dimensões máximas{" "}
                  <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Comprimento (cm)</p>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_length_cm}
                      onChange={(e) =>
                        setField("max_length_cm", e.target.value)
                      }
                      placeholder="ex: 120"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Largura (cm)</p>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_width_cm}
                      onChange={(e) => setField("max_width_cm", e.target.value)}
                      placeholder="ex: 80"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Altura (cm)</p>
                    <Input
                      type="number"
                      min={0}
                      value={form.max_height_cm}
                      onChange={(e) =>
                        setField("max_height_cm", e.target.value)
                      }
                      placeholder="ex: 60"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Peso/Volume máximos */}
            {form.measure_type &&
              form.measure_type !== "dimensions" && (
                <div className="grid grid-cols-2 gap-4">
                  {(form.measure_type === "weight" ||
                    form.measure_type === "weight_volume") && (
                    <div className="space-y-2">
                      <Label>
                        Peso máximo (kg){" "}
                        <span className="text-muted-foreground text-xs">
                          (opcional)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.max_weight_kg}
                        onChange={(e) =>
                          setField("max_weight_kg", e.target.value)
                        }
                        placeholder="ex: 30"
                      />
                    </div>
                  )}
                  {(form.measure_type === "volume" ||
                    form.measure_type === "weight_volume") && (
                    <div className="space-y-2">
                      <Label>
                        Volume máximo (m³){" "}
                        <span className="text-muted-foreground text-xs">
                          (opcional)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.max_volume_m3}
                        onChange={(e) =>
                          setField("max_volume_m3", e.target.value)
                        }
                        placeholder="ex: 2"
                      />
                    </div>
                  )}
                </div>
              )}

            {/* ── PRAZOS ── */}
            <SectionDivider label="Prazos" />

            <div className="space-y-2">
              <Label>Prazo de entrega normal (dias úteis)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.standard_days_min}
                  onChange={(e) =>
                    setField("standard_days_min", e.target.value)
                  }
                  className="w-24"
                  placeholder="Min"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="number"
                  min={0}
                  value={form.standard_days_max}
                  onChange={(e) =>
                    setField("standard_days_max", e.target.value)
                  }
                  className="w-24"
                  placeholder="Max"
                />
                <span className="text-muted-foreground text-sm">dias</span>
              </div>
            </div>

            {form.has_express && (
              <div className="space-y-2">
                <Label>Prazo de entrega expressa (dias úteis)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.express_days_min}
                    onChange={(e) =>
                      setField("express_days_min", e.target.value)
                    }
                    className="w-24"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    type="number"
                    min={0}
                    value={form.express_days_max}
                    onChange={(e) =>
                      setField("express_days_max", e.target.value)
                    }
                    className="w-24"
                    placeholder="Max"
                  />
                  <span className="text-muted-foreground text-sm">dias</span>
                </div>
              </div>
            )}

            {/* ── EXTRAS ── */}
            <SectionDivider label="Extras" />

            <div className="space-y-2">
              <Label>
                Notas internas{" "}
                <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="ex: Apenas aplicável para encomendas até 5kg"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Zona activa</p>
                <p className="text-xs text-muted-foreground">
                  Zonas inactivas não são usadas no cálculo de frete.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setField("is_active", v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "Actualizar" : "Criar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: ROTA OPOSTA ══════════════════ */}
      <Dialog
        open={reverseRouteDialog.open}
        onOpenChange={(open) =>
          !open && setReverseRouteDialog({ open: false, savedZone: null })
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Criar rota oposta?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Queres criar automaticamente a rota inversa com as mesmas
            configurações de preço e prazos?
          </p>
          {reverseRouteDialog.savedZone && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>
                {provinces.find(
                  (p) =>
                    p.id === reverseRouteDialog.savedZone?.dest_province_id
                )?.name ?? "Destino"}
                {" → "}
                {provinces.find(
                  (p) =>
                    p.id === reverseRouteDialog.savedZone?.origin_province_id
                )?.name ?? "Origem"}
              </span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setReverseRouteDialog({ open: false, savedZone: null })
              }
            >
              Não, obrigado
            </Button>
            <Button onClick={handleCreateReverseRoute} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar rota oposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: CONFIRMAR ELIMINAÇÃO ══════════════════ */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar zona?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acção é irreversível. A zona será removida permanentemente e os
            vendedores que a usavam passarão a usar o preço padrão.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirm !== null) {
                  await deleteZone(deleteConfirm);
                  toast({ title: "Zona eliminada" });
                  setDeleteConfirm(null);
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
