import { useState, useEffect } from "react";
import {
  useSellerFreight,
  useFreight,
  FreightMode,
  FreightZoneTier,
} from "@/hooks/useFreight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/hooks/use-toast";
import {
  Truck,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Package,
  Store,
  Zap,
  Gift,
  Layers,
  AlertCircle,
  Loader2,
  Info,
  Scale,
  X,
  ArrowLeftRight,
} from "lucide-react";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type ZoneType = "intra_municipal" | "intra_provincial" | "interprovincial";
type MeasureType = "weight" | "volume" | "dimensions" | "weight_volume";
type PricingModel = "fixed" | "per_unit" | "tiers";

interface Tier {
  min_value: string;
  max_value: string;
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

// ─── Constantes de apresentação ───────────────────────────────────────────────

interface ModeOption {
  value: FreightMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "admin",
    label: "Tabela da plataforma",
    description: "Usa os preços configurados pelo administrador da Kisua.",
    icon: <Layers className="w-5 h-5" />,
    color: "border-blue-500 bg-blue-500/10 text-blue-400",
  },
  {
    value: "custom",
    label: "Frota própria",
    description: "Define os teus próprios preços de entrega por zona.",
    icon: <Truck className="w-5 h-5" />,
    color: "border-green-500 bg-green-500/10 text-green-400",
  },
  {
    value: "mixed",
    label: "Misto",
    description: "As tuas zonas têm prioridade; a plataforma cobre o resto.",
    icon: <Zap className="w-5 h-5" />,
    color: "border-amber-500 bg-amber-500/10 text-amber-400",
  },
  {
    value: "free",
    label: "Entrega grátis",
    description: "Absorves o custo de entrega. O comprador não paga frete.",
    icon: <Gift className="w-5 h-5" />,
    color: "border-purple-500 bg-purple-500/10 text-purple-400",
  },
  {
    value: "pickup",
    label: "Retirada na loja",
    description: "O comprador retira pessoalmente. Sem entrega ao domicílio.",
    icon: <Store className="w-5 h-5" />,
    color: "border-rose-500 bg-rose-500/10 text-rose-400",
  },
];

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
  per_unit: "Por unidade",
  tiers: "Faixas",
};

const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sellerId: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SellerFreightSettings({ sellerId }: Props) {
  const {
    config,
    zones,
    loading,
    saving,
    error,
    saveConfig,
    saveZone,
    toggleZone,
    deleteZone,
  } = useSellerFreight(sellerId);

  const { provinces, municipalities, getMunicipalitiesByProvince, loadingGeo } =
    useFreight();

  // Configuração de modo
  const [selectedMode, setSelectedMode] = useState<FreightMode>("admin");
  const [customDefault, setCustomDefault] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupProvinceId, setPickupProvinceId] = useState("");
  const [pickupMunicipalityId, setPickupMunicipalityId] = useState("");
  const [publicNote, setPublicNote] = useState("");

  // Modal de zona
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Diálogo rota oposta
  const [reverseRouteDialog, setReverseRouteDialog] = useState<{
    open: boolean;
    savedZone: any | null;
  }>({ open: false, savedZone: null });

  // Sincronizar config existente
  useEffect(() => {
    if (config) {
      setSelectedMode(config.freight_mode);
      setCustomDefault(config.custom_default_price_kwz?.toString() ?? "");
      setPickupAddress(config.pickup_address ?? "");
      setPickupProvinceId(config.pickup_province_id?.toString() ?? "");
      setPickupMunicipalityId(config.pickup_municipality_id?.toString() ?? "");
      setPublicNote(config.public_note ?? "");
    }
  }, [config]);

  // ── Guardar configuração de modo ───────────────────────────────────────────

  const handleSaveConfig = async () => {
    const ok = await saveConfig({
      freight_mode: selectedMode,
      custom_default_price_kwz: customDefault ? Number(customDefault) : null,
      pickup_address: pickupAddress || null,
      pickup_province_id: pickupProvinceId ? Number(pickupProvinceId) : null,
      pickup_municipality_id: pickupMunicipalityId
        ? Number(pickupMunicipalityId)
        : null,
      public_note: publicNote || null,
    });
    toast({
      title: ok ? "Configuração guardada" : "Erro ao guardar",
      variant: ok ? "default" : "destructive",
    });
  };

  // ── Helpers de formulário ──────────────────────────────────────────────────

  const setField = (key: keyof ZoneForm, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

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
      express_price_kwz: zone.express_price_kwz?.toString() ?? "",
      standard_days_min: String(zone.standard_days_min),
      standard_days_max: String(zone.standard_days_max),
      express_days_min: zone.express_days_min?.toString() ?? "0",
      express_days_max: zone.express_days_max?.toString() ?? "1",
      is_active: zone.is_active,
      notes: zone.notes ?? "",
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
      expand_all_dest_municipalities:
        zone.expand_all_dest_municipalities ?? false,
    });
    setModalOpen(true);
  };

  // ── Tiers ──────────────────────────────────────────────────────────────────

  const addTier = () =>
    setForm((f) => ({ ...f, tiers: [...f.tiers, { ...EMPTY_TIER }] }));

  const removeTier = (i: number) =>
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

  const updateTier = (i: number, key: keyof Tier, value: string) =>
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)),
    }));

  const tierUnit =
    form.measure_type === "volume" || form.measure_type === "weight_volume"
      ? "m³"
      : "kg";

  // ── Submeter zona ──────────────────────────────────────────────────────────

  const handleSubmitZone = async () => {
    if (!form.origin_province_id || !form.dest_province_id) {
      toast({ title: "Preenche origem e destino", variant: "destructive" });
      return;
    }

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

    const tiersPayload: FreightZoneTier[] =
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
        : [];

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
      tiers: tiersPayload,
    };

    const ok = await saveZone(payload);

    if (ok) {
      toast({ title: form.id ? "Zona actualizada" : "Zona criada" });
      setModalOpen(false);
      if (!form.id) {
        setReverseRouteDialog({ open: true, savedZone: payload });
      }
    } else {
      toast({ title: "Erro ao guardar zona", variant: "destructive" });
    }
  };

  // ── Rota oposta ────────────────────────────────────────────────────────────

  const handleCreateReverseRoute = async () => {
    const z = reverseRouteDialog.savedZone;
    if (!z) return;
    const ok = await saveZone({
      ...z,
      id: undefined,
      origin_province_id: z.dest_province_id,
      origin_municipality_id: z.dest_municipality_id,
      dest_province_id: z.origin_province_id,
      dest_municipality_id: z.origin_municipality_id,
    });
    toast({
      title: ok ? "Rota oposta criada" : "Erro ao criar rota oposta",
      variant: ok ? "default" : "destructive",
    });
    setReverseRouteDialog({ open: false, savedZone: null });
  };

  // ── Municípios disponíveis ─────────────────────────────────────────────────

  const originMunicipalities = form.origin_province_id
    ? getMunicipalitiesByProvince(Number(form.origin_province_id))
    : [];

  const destMunicipalities = form.dest_province_id
    ? getMunicipalitiesByProvince(Number(form.dest_province_id))
    : [];

  const pickupMunicipalities = pickupProvinceId
    ? getMunicipalitiesByProvince(Number(pickupProvinceId))
    : [];

  const showZones = selectedMode === "custom" || selectedMode === "mixed";
  const showMunicipalityFields = form.zone_type === "intra_municipal";

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loadingGeo || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">A carregar…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ══ SECÇÃO 1: MODO DE ENTREGA ══ */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-base">Modo de entrega</h3>
          <p className="text-sm text-muted-foreground">
            Escolhe como queres gerir as entregas das tuas encomendas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedMode(opt.value)}
              className={`rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.01] ${
                selectedMode === opt.value
                  ? opt.color + " border-2"
                  : "border-border hover:border-muted-foreground bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={selectedMode === opt.value ? "" : "text-muted-foreground"}>
                  {opt.icon}
                </span>
                <span className="font-medium text-sm">{opt.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ══ SECÇÃO 2: OPÇÕES ESPECÍFICAS DO MODO ══ */}

      {selectedMode === "custom" && (
        <div className="rounded-lg border p-4 space-y-3 bg-green-500/5">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-green-400" />
            Preço padrão da tua frota
          </h4>
          <div className="space-y-1">
            <Label>Preço padrão (Kz)</Label>
            <Input
              type="number"
              min={0}
              value={customDefault}
              onChange={(e) => setCustomDefault(e.target.value)}
              placeholder="ex: 2000"
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Usado quando nenhuma das tuas zonas cobre a rota pedida.
            </p>
          </div>
        </div>
      )}

      {selectedMode === "mixed" && (
        <div className="rounded-lg border border-amber-500/30 p-4 bg-amber-500/5 flex gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            No modo misto, as tuas zonas têm prioridade. Quando uma rota não está
            coberta pelas tuas zonas, a plataforma usa automaticamente a tabela
            do administrador.
          </p>
        </div>
      )}

      {selectedMode === "pickup" && (
        <div className="rounded-lg border border-rose-500/30 p-4 space-y-4 bg-rose-500/5">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-rose-400" />
            Morada de retirada
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Província</Label>
              <Select
                value={pickupProvinceId}
                onValueChange={(v) => {
                  setPickupProvinceId(v);
                  setPickupMunicipalityId("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Município</Label>
              <Select
                value={pickupMunicipalityId}
                onValueChange={setPickupMunicipalityId}
                disabled={!pickupProvinceId}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {pickupMunicipalities.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Morada completa</Label>
            <Textarea
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="ex: Rua da Missão, nº 12, Ingombota"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Nota pública */}
      <div className="space-y-1">
        <Label>
          Nota visível ao comprador{" "}
          <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Textarea
          value={publicNote}
          onChange={(e) => setPublicNote(e.target.value)}
          placeholder="ex: Entregas apenas em Luanda, de segunda a sexta."
          rows={2}
        />
      </div>

      <Button onClick={handleSaveConfig} disabled={saving} className="gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Guardar configuração
      </Button>

      {/* ══ SECÇÃO 3: ZONAS PRÓPRIAS ══ */}
      {showZones && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">As tuas zonas de frete</h3>
              <p className="text-sm text-muted-foreground">
                Define preços específicos por rota.
              </p>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nova zona
            </Button>
          </div>

          {zones.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Ainda não tens zonas configuradas.
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={openCreate}>
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
                  {zones.map((zone: any) => (
                    <TableRow key={zone.id} className="group">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${ZONE_COLORS[zone.zone_type as ZoneType]}`}
                        >
                          {ZONE_LABELS[zone.zone_type as ZoneType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{zone.origin_province?.name ?? "—"}</span>
                          {zone.origin_municipality && (
                            <span className="text-muted-foreground">› {zone.origin_municipality.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{zone.dest_province?.name ?? "—"}</span>
                          {zone.dest_municipality && (
                            <span className="text-muted-foreground">› {zone.dest_municipality.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {zone.pricing_model === "tiers" ? (
                          <span className="text-xs text-muted-foreground">Faixas</span>
                        ) : zone.pricing_model === "per_unit" ? (
                          <span className="text-xs text-muted-foreground">
                            {zone.base_price_kwz ? fmtKz(zone.base_price_kwz) : "—"} base
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
                            <><ToggleRight className="w-4 h-4 text-green-500" /><span className="text-green-500">Activa</span></>
                          ) : (
                            <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Inactiva</span></>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(zone)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(zone.id)}>
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
        </div>
      )}

      {/* ══ MODAL: CRIAR / EDITAR ZONA ══ */}
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
                {(["intra_municipal", "intra_provincial", "interprovincial"] as ZoneType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setField("zone_type", t);
                      if (t !== "intra_municipal") {
                        setField("origin_municipality_id", "");
                        setField("dest_municipality_id", "");
                      }
                    }}
                    className={`rounded-lg border p-3 text-sm text-left transition-all ${
                      form.zone_type === t
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className={`block text-xs mb-1 px-1.5 py-0.5 rounded w-fit border ${ZONE_COLORS[t]}`}>
                      {ZONE_LABELS[t]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t === "intra_municipal" && "Municípios da mesma província"}
                      {t === "intra_provincial" && "Toda a província"}
                      {t === "interprovincial" && "Entre províncias"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Origem */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Província de origem</Label>
                <Select
                  value={form.origin_province_id}
                  onValueChange={(v) => {
                    setField("origin_province_id", v);
                    setField("origin_municipality_id", "");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showMunicipalityFields && (
                <div className="space-y-1">
                  <Label>Município de origem <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                  <Select
                    value={form.origin_municipality_id}
                    onValueChange={(v) => setField("origin_municipality_id", v)}
                    disabled={!form.origin_province_id}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos os municípios" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os municípios</SelectItem>
                      {originMunicipalities.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Província de destino</Label>
                <Select
                  value={form.dest_province_id}
                  onValueChange={(v) => {
                    setField("dest_province_id", v);
                    setField("dest_municipality_id", "");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Município de destino <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Select
                  value={form.dest_municipality_id}
                  onValueChange={(v) => setField("dest_municipality_id", v)}
                  disabled={!form.dest_province_id}
                >
                  <SelectTrigger><SelectValue placeholder="Todos os municípios" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os municípios</SelectItem>
                    {destMunicipalities.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expandir municípios */}
            {!form.dest_municipality_id && form.dest_province_id && (
              <div className="flex items-center justify-between rounded-lg border border-dashed p-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    Aplicar a todos os municípios do destino
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cria automaticamente uma rota para cada município da província de destino.
                  </p>
                </div>
                <Switch
                  checked={form.expand_all_dest_municipalities}
                  onCheckedChange={(v) => setField("expand_all_dest_municipalities", v)}
                />
              </div>
            )}

            {/* ── MEDIDAS E PREÇO ── */}
            <SectionDivider label="Medidas e preço" />

            {/* Tipo de medida */}
            <div className="space-y-2">
              <Label>Tipo de medida</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["weight", "volume", "dimensions", "weight_volume"] as MeasureType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setField("measure_type", form.measure_type === m ? "" : m)}
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
            </div>

            {/* Modelo de preço */}
            {form.measure_type && (
              <div className="space-y-2">
                <Label>Modelo de preço</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["fixed", "per_unit", "tiers"] as PricingModel[]).map((pm) => (
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
                  ))}
                </div>
              </div>
            )}

            {/* Preço fixo */}
            {(!form.measure_type || form.pricing_model === "fixed") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Preço normal (Kz)</Label>
                  <Input
                    type="number" min={0}
                    value={form.price_kwz}
                    onChange={(e) => setField("price_kwz", e.target.value)}
                    placeholder="ex: 1500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Entrega expressa</Label>
                    <Switch checked={form.has_express} onCheckedChange={(v) => setField("has_express", v)} />
                  </div>
                  {form.has_express && (
                    <Input
                      type="number" min={0}
                      value={form.express_price_kwz}
                      onChange={(e) => setField("express_price_kwz", e.target.value)}
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
                  <div className="space-y-1">
                    <Label>Preço base (Kz)</Label>
                    <Input
                      type="number" min={0}
                      value={form.base_price_kwz}
                      onChange={(e) => setField("base_price_kwz", e.target.value)}
                      placeholder="ex: 300"
                    />
                  </div>
                  <div className="space-y-1">
                    {(form.measure_type === "weight" || form.measure_type === "weight_volume") && (
                      <>
                        <Label>Preço por kg (Kz)</Label>
                        <Input type="number" min={0} value={form.price_per_kg} onChange={(e) => setField("price_per_kg", e.target.value)} placeholder="ex: 50" />
                      </>
                    )}
                    {(form.measure_type === "volume" || form.measure_type === "weight_volume") && (
                      <>
                        <Label>Preço por m³ (Kz)</Label>
                        <Input type="number" min={0} value={form.price_per_m3} onChange={(e) => setField("price_per_m3", e.target.value)} placeholder="ex: 2000" />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label>Entrega expressa</Label>
                  <Switch checked={form.has_express} onCheckedChange={(v) => setField("has_express", v)} />
                </div>
                {form.has_express && (
                  <Input type="number" min={0} value={form.express_price_kwz} onChange={(e) => setField("express_price_kwz", e.target.value)} placeholder="Preço fixo adicional expressa (Kz)" />
                )}
              </div>
            )}

            {/* Faixas */}
            {form.measure_type && form.pricing_model === "tiers" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Faixas de preço <span className="text-muted-foreground text-xs">(por {tierUnit})</span></Label>
                  <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addTier}>
                    <Plus className="w-3 h-3" /> Adicionar faixa
                  </Button>
                </div>
                {form.tiers.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Nenhuma faixa definida. Clica em "Adicionar faixa".
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                      <span>Mín ({tierUnit})</span>
                      <span>Máx ({tierUnit})</span>
                      <span>Preço (Kz)</span>
                      <span>Expressa (Kz)</span>
                      <span />
                    </div>
                    {form.tiers.map((tier, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                        <Input type="number" min={0} value={tier.min_value} onChange={(e) => updateTier(i, "min_value", e.target.value)} placeholder="0" className="h-8 text-sm" />
                        <Input type="number" min={0} value={tier.max_value} onChange={(e) => updateTier(i, "max_value", e.target.value)} placeholder="∞" className="h-8 text-sm" />
                        <Input type="number" min={0} value={tier.price_kwz} onChange={(e) => updateTier(i, "price_kwz", e.target.value)} placeholder="500" className="h-8 text-sm" />
                        <Input type="number" min={0} value={tier.express_price_kwz} onChange={(e) => updateTier(i, "express_price_kwz", e.target.value)} placeholder="—" className="h-8 text-sm" />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeTier(i)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Entrega expressa disponível</p>
                    <p className="text-xs text-muted-foreground">Activa o campo de preço expressa em cada faixa.</p>
                  </div>
                  <Switch checked={form.has_express} onCheckedChange={(v) => setField("has_express", v)} />
                </div>
              </div>
            )}

            {/* Dimensões máximas */}
            {(form.measure_type === "dimensions" || form.measure_type === "weight_volume") && (
              <div className="space-y-2">
                <Label>Dimensões máximas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Comprimento (cm)</p>
                    <Input type="number" min={0} value={form.max_length_cm} onChange={(e) => setField("max_length_cm", e.target.value)} placeholder="ex: 120" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Largura (cm)</p>
                    <Input type="number" min={0} value={form.max_width_cm} onChange={(e) => setField("max_width_cm", e.target.value)} placeholder="ex: 80" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Altura (cm)</p>
                    <Input type="number" min={0} value={form.max_height_cm} onChange={(e) => setField("max_height_cm", e.target.value)} placeholder="ex: 60" className="h-8" />
                  </div>
                </div>
              </div>
            )}

            {/* Peso / Volume máximos */}
            {form.measure_type && form.measure_type !== "dimensions" && (
              <div className="grid grid-cols-2 gap-4">
                {(form.measure_type === "weight" || form.measure_type === "weight_volume") && (
                  <div className="space-y-1">
                    <Label>Peso máximo (kg) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                    <Input type="number" min={0} value={form.max_weight_kg} onChange={(e) => setField("max_weight_kg", e.target.value)} placeholder="ex: 30" />
                  </div>
                )}
                {(form.measure_type === "volume" || form.measure_type === "weight_volume") && (
                  <div className="space-y-1">
                    <Label>Volume máximo (m³) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                    <Input type="number" min={0} value={form.max_volume_m3} onChange={(e) => setField("max_volume_m3", e.target.value)} placeholder="ex: 2" />
                  </div>
                )}
              </div>
            )}

            {/* ── PRAZOS ── */}
            <SectionDivider label="Prazos" />

            <div className="space-y-1">
              <Label>Prazo normal (dias úteis)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={form.standard_days_min} onChange={(e) => setField("standard_days_min", e.target.value)} className="w-24" placeholder="Min" />
                <span className="text-muted-foreground text-sm">a</span>
                <Input type="number" min={0} value={form.standard_days_max} onChange={(e) => setField("standard_days_max", e.target.value)} className="w-24" placeholder="Max" />
                <span className="text-muted-foreground text-sm">dias</span>
              </div>
            </div>

            {form.has_express && (
              <div className="space-y-1">
                <Label>Prazo expressa (dias úteis)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} value={form.express_days_min} onChange={(e) => setField("express_days_min", e.target.value)} className="w-24" placeholder="Min" />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input type="number" min={0} value={form.express_days_max} onChange={(e) => setField("express_days_max", e.target.value)} className="w-24" placeholder="Max" />
                  <span className="text-muted-foreground text-sm">dias</span>
                </div>
              </div>
            )}

            {/* ── EXTRAS ── */}
            <SectionDivider label="Extras" />

            <div className="space-y-1">
              <Label>Notas internas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="ex: Apenas para encomendas até 5kg" rows={2} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Zona activa</p>
                <p className="text-xs text-muted-foreground">Zonas inactivas não são usadas no cálculo.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitZone} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "Actualizar" : "Criar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: ROTA OPOSTA ══ */}
      <Dialog
        open={reverseRouteDialog.open}
        onOpenChange={(open) => !open && setReverseRouteDialog({ open: false, savedZone: null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> Criar rota oposta?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Queres criar automaticamente a rota inversa com as mesmas configurações?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReverseRouteDialog({ open: false, savedZone: null })}>
              Não, obrigado
            </Button>
            <Button onClick={handleCreateReverseRoute} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar rota oposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: CONFIRMAR ELIMINAÇÃO ══ */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar zona?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta zona será removida permanentemente.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
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
