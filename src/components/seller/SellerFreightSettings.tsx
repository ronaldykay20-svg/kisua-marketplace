import { useState, useEffect } from "react";
import { useSellerFreight, useFreight, FreightMode } from "@/hooks/useFreight";
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
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ZoneType = "intra_municipal" | "intra_provincial" | "interprovincial";

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
}

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
};

// ─── Opções de modo de frete ──────────────────────────────────────────────────

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

const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

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

  // Modo seleccionado localmente
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

  // Sincronizar com config existente
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

  // ── Formulário de zona ─────────────────────────────────────────────────────

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
    });
    setModalOpen(true);
  };

  const handleSubmitZone = async () => {
    if (!form.origin_province_id || !form.dest_province_id) {
      toast({ title: "Preenche origem e destino", variant: "destructive" });
      return;
    }
    if (!form.price_kwz || isNaN(Number(form.price_kwz))) {
      toast({ title: "Preço inválido", variant: "destructive" });
      return;
    }

    const ok = await saveZone({
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
      price_kwz: Number(form.price_kwz),
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
    });

    if (ok) {
      toast({ title: form.id ? "Zona actualizada" : "Zona criada" });
      setModalOpen(false);
    } else {
      toast({ title: "Erro ao guardar zona", variant: "destructive" });
    }
  };

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

      {/* ══ SECÇÃO 1: ESCOLHA DO MODO ══ */}
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
                <span
                  className={
                    selectedMode === opt.value
                      ? ""
                      : "text-muted-foreground"
                  }
                >
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

      {/* Modo custom: preço padrão próprio */}
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

      {/* Modo mixed: info */}
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

      {/* Modo pickup: endereço */}
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {pickupMunicipalities.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
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

      {/* Nota pública (todos os modos) */}
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

      {/* Botão guardar configuração */}
      <Button onClick={handleSaveConfig} disabled={saving} className="gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        Guardar configuração
      </Button>

      {/* ══ SECÇÃO 3: ZONAS PRÓPRIAS (custom / mixed) ══ */}
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
                        {fmtKz(zone.price_kwz)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-sm">
                        {zone.has_express && zone.express_price_kwz ? (
                          fmtKz(zone.express_price_kwz)
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
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

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de zona</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["intra_municipal", "intra_provincial", "interprovincial"] as ZoneType[]).map(
                  (t) => (
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
                      <span
                        className={`block text-xs mb-1 px-1.5 py-0.5 rounded w-fit border ${ZONE_COLORS[t]}`}
                      >
                        {ZONE_LABELS[t]}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t === "intra_municipal" && "Municípios da mesma província"}
                        {t === "intra_provincial" && "Toda a província"}
                        {t === "interprovincial" && "Entre províncias"}
                      </span>
                    </button>
                  )
                )}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showMunicipalityFields && (
                <div className="space-y-1">
                  <Label>
                    Município de origem{" "}
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <Select
                    value={form.origin_municipality_id}
                    onValueChange={(v) => setField("origin_municipality_id", v)}
                    disabled={!form.origin_province_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os municípios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os municípios</SelectItem>
                      {originMunicipalities.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>
                  Município de destino{" "}
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Select
                  value={form.dest_municipality_id}
                  onValueChange={(v) => setField("dest_municipality_id", v)}
                  disabled={!form.dest_province_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os municípios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os municípios</SelectItem>
                    {destMunicipalities.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Preço normal (Kz)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price_kwz}
                  onChange={(e) => setField("price_kwz", e.target.value)}
                  placeholder="ex: 1500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
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
                    onChange={(e) => setField("express_price_kwz", e.target.value)}
                    placeholder="Preço expressa (Kz)"
                  />
                )}
              </div>
            </div>

            {/* Prazos */}
            <div className="space-y-1">
              <Label>Prazo normal (dias úteis)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={form.standard_days_min}
                  onChange={(e) => setField("standard_days_min", e.target.value)}
                  className="w-24"
                  placeholder="Min"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="number"
                  min={0}
                  value={form.standard_days_max}
                  onChange={(e) => setField("standard_days_max", e.target.value)}
                  className="w-24"
                  placeholder="Max"
                />
                <span className="text-muted-foreground text-sm">dias</span>
              </div>
            </div>

            {form.has_express && (
              <div className="space-y-1">
                <Label>Prazo expressa (dias úteis)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.express_days_min}
                    onChange={(e) => setField("express_days_min", e.target.value)}
                    className="w-24"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    type="number"
                    min={0}
                    value={form.express_days_max}
                    onChange={(e) => setField("express_days_max", e.target.value)}
                    className="w-24"
                    placeholder="Max"
                  />
                  <span className="text-muted-foreground text-sm">dias</span>
                </div>
              </div>
            )}

            {/* Activa */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Zona activa</p>
                <p className="text-xs text-muted-foreground">
                  Zonas inactivas não são usadas no cálculo.
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
            <Button onClick={handleSubmitZone} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "Actualizar" : "Criar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ MODAL: CONFIRMAR ELIMINAÇÃO ══ */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar zona?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta zona será removida permanentemente.
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
