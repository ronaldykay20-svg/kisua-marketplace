import { useState, useEffect, useCallback } from "react";
import { useAdminFreight, FreightZone, FreightSettings } from "@/hooks/useFreight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

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
  notes: string;
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
  notes: "",
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

// Sentinela para "nenhum município seleccionado" — o Radix não aceita value=""
const NO_MUN = "none";

// ─── Utilitário: formatar Kz ──────────────────────────────────────────────────

const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

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

  // ── Submeter zona ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
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
      express_price_kwz: form.has_express && form.express_price_kwz
        ? Number(form.express_price_kwz)
        : null,
      standard_days_min: Number(form.standard_days_min),
      standard_days_max: Number(form.standard_days_max),
      express_days_min: form.has_express ? Number(form.express_days_min) : null,
      express_days_max: form.has_express ? Number(form.express_days_max) : null,
      is_active: form.is_active,
      notes: form.notes || null,
    });

    if (ok) {
      toast({ title: form.id ? "Zona actualizada" : "Zona criada" });
      setModalOpen(false);
    } else {
      toast({ title: "Erro ao guardar zona", variant: "destructive" });
    }
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
    if (filterOriginProv !== "all" && String(z.origin_province_id) !== filterOriginProv) return false;
    if (filterDestProv !== "all" && String(z.dest_province_id) !== filterDestProv) return false;
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
        <span className="ml-2 text-muted-foreground">A carregar dados geográficos…</span>
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

            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="intra_municipal">Intra-municipal</SelectItem>
                <SelectItem value="intra_provincial">Intra-provincial</SelectItem>
                <SelectItem value="interprovincial">Interprovincial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterOriginProv} onValueChange={setFilterOriginProv}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDestProv} onValueChange={setFilterDestProv}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os destinos</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                    <TableHead>Prazo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acções</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((zone: any) => (
                    <TableRow key={zone.id} className="group">
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${ZONE_COLORS[zone.zone_type as ZoneType]}`}>
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
                      <TableCell className="text-right font-mono text-sm">{fmtKz(zone.price_kwz)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {zone.has_express && zone.express_price_kwz
                          ? fmtKz(zone.express_price_kwz)
                          : <span className="text-muted-foreground text-xs">—</span>}
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
                type="number" min={0}
                value={localSettings.default_price_kwz ?? ""}
                onChange={(e) => setLocalSettings((s) => ({ ...s, default_price_kwz: Number(e.target.value) }))}
                placeholder="1500.00"
              />
              <p className="text-xs text-muted-foreground">
                Usado como fallback quando nenhuma regra de zona existe para a rota.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Frete grátis acima de (Kz)</Label>
              <Input
                type="number" min={0}
                value={localSettings.free_shipping_threshold ?? ""}
                onChange={(e) => setLocalSettings((s) => ({ ...s, free_shipping_threshold: Number(e.target.value) }))}
                placeholder="0 = desactivado"
              />
              <p className="text-xs text-muted-foreground">
                Quando o valor do carrinho ultrapassa este valor, o frete é grátis. 0 = desactivado.
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
                  Todos os vendedores usam o preço padrão acima, independentemente das suas configurações.
                </p>
              </div>
              <Switch
                checked={localSettings.force_default_for_sellers ?? false}
                onCheckedChange={(v) => setLocalSettings((s) => ({ ...s, force_default_for_sellers: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Permitir frete personalizado</p>
                <p className="text-xs text-muted-foreground">
                  Os vendedores podem configurar os seus próprios preços de entrega.
                </p>
              </div>
              <Switch
                checked={localSettings.allow_seller_custom ?? true}
                onCheckedChange={(v) => setLocalSettings((s) => ({ ...s, allow_seller_custom: v }))}
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
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
                {(["intra_municipal", "intra_provincial", "interprovincial"] as ZoneType[]).map((t) => (
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
                    <span className={`block text-xs mb-1 ${ZONE_COLORS[t]} px-1.5 py-0.5 rounded w-fit`}>
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
              <div className="space-y-2">
                <Label>Província de origem</Label>
                <Select
                  value={form.origin_province_id}
                  onValueChange={(v) => {
                    setField("origin_province_id", v);
                    setField("origin_municipality_id", "");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showMunicipalities && (
                <div className="space-y-2">
                  <Label>
                    Município de origem{" "}
                    <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Select
                    value={form.origin_municipality_id || NO_MUN}
                    onValueChange={(v) => setField("origin_municipality_id", v === NO_MUN ? "" : v)}
                    disabled={!form.origin_province_id}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos os municípios" /></SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value={NO_MUN}>Todos os municípios</SelectItem>
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
              <div className="space-y-2">
                <Label>Província de destino</Label>
                <Select
                  value={form.dest_province_id}
                  onValueChange={(v) => {
                    setField("dest_province_id", v);
                    setField("dest_municipality_id", "");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Município de destino{" "}
                  <span className="text-muted-foreground text-xs">(opcional)</span>
                </Label>
                <Select
                  value={form.dest_municipality_id || NO_MUN}
                  onValueChange={(v) => setField("dest_municipality_id", v === NO_MUN ? "" : v)}
                  disabled={!form.dest_province_id}
                >
                  <SelectTrigger><SelectValue placeholder="Todos os municípios" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value={NO_MUN}>Todos os municípios</SelectItem>
                    {destMunicipalities.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço normal (Kz)</Label>
                <Input
                  type="number" min={0}
                  value={form.price_kwz}
                  onChange={(e) => setField("price_kwz", e.target.value)}
                  placeholder="ex: 1200"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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

            {/* Prazos normais */}
            <div className="space-y-2">
              <Label>Prazo de entrega normal (dias úteis)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={form.standard_days_min} onChange={(e) => setField("standard_days_min", e.target.value)} className="w-24" placeholder="Min" />
                <span className="text-muted-foreground text-sm">a</span>
                <Input type="number" min={0} value={form.standard_days_max} onChange={(e) => setField("standard_days_max", e.target.value)} className="w-24" placeholder="Max" />
                <span className="text-muted-foreground text-sm">dias</span>
              </div>
            </div>

            {/* Prazos expressos */}
            {form.has_express && (
              <div className="space-y-2">
                <Label>Prazo de entrega expressa (dias úteis)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} value={form.express_days_min} onChange={(e) => setField("express_days_min", e.target.value)} className="w-24" placeholder="Min" />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input type="number" min={0} value={form.express_days_max} onChange={(e) => setField("express_days_max", e.target.value)} className="w-24" placeholder="Max" />
                  <span className="text-muted-foreground text-sm">dias</span>
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas internas <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="ex: Apenas aplicável para encomendas até 5kg"
                rows={2}
              />
            </div>

            {/* Activa */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Zona activa</p>
                <p className="text-xs text-muted-foreground">Zonas inactivas não são usadas no cálculo de frete.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", v)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "Actualizar" : "Criar zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: CONFIRMAR ELIMINAÇÃO ══════════════════ */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar zona?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acção é irreversível. A zona será removida permanentemente e
            os vendedores que a usavam passarão a usar o preço padrão.
          </p>
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
