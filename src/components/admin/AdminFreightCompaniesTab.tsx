import { useState, useMemo, useRef } from "react";
import {
  useAdminFreightCompanies,
  FreightCompany,
  FreightCompanyRate,
} from "@/hooks/useFreightCompanies";
import { supabase } from "@/integrations/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { convertToWebP, getFileExtension } from "@/lib/imageToWebp";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Truck,
  Building2,
  Loader2,
  Package,
  ArrowRight,
  Scale,
  Image as ImageIcon,
  X,
  Upload,
} from "lucide-react";

async function uploadFreightLogo(file: File): Promise<string> {
  const uploadFile = await convertToWebP(file, 0.85, 400);
  const ext = getFileExtension(uploadFile);
  const path = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.freight)
    .upload(path, uploadFile, { upsert: true, cacheControl: "2592000" });
  if (error) throw new Error("Upload falhou: " + error.message);
  const { data } = supabase.storage.from(STORAGE_BUCKETS.freight).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Estilo para <select> nativo (consistente com AdminFreightTab) ───────────
const nativeSelectClass =
  "w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

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

// ─── Tipos locais de formulário ───────────────────────────────────────────────

interface CompanyForm {
  id?: string;
  name: string;
  contact_phone: string;
  contact_email: string;
  logo_url: string;
  notes: string;
  is_active: boolean;
}

const EMPTY_COMPANY: CompanyForm = {
  name: "",
  contact_phone: "",
  contact_email: "",
  logo_url: "",
  notes: "",
  is_active: true,
};

interface RateForm {
  id?: string;
  company_id: string;
  origin_province_id: string;
  dest_province_id: string;
  origin_municipality_id: string; // "" = província toda
  dest_municipality_id: string; // "" = província toda
  material_type_id: string; // "" = todos os materiais
  min_weight_kg: string;
  max_weight_kg: string; // "" = sem limite
  price_kwz: string;
  days_min: string;
  days_max: string;
  notes: string;
  is_active: boolean;
}

const emptyRate = (companyId: string): RateForm => ({
  company_id: companyId,
  origin_province_id: "",
  dest_province_id: "",
  origin_municipality_id: "",
  dest_municipality_id: "",
  material_type_id: "",
  min_weight_kg: "0",
  max_weight_kg: "",
  price_kwz: "",
  days_min: "2",
  days_max: "5",
  notes: "",
  is_active: true,
});

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminFreightCompaniesTab() {
  const {
    provinces,
    municipalities,
    materialTypes,
    companies,
    rates,
    loading,
    saving,
    error,
    saveCompany,
    toggleCompany,
    deleteCompany,
    saveRate,
    toggleRate,
    deleteRate,
    getRatesByCompany,
  } = useAdminFreightCompanies();

  // ── Modal de empresa ──────────────────────────────────────────────────────
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(EMPTY_COMPANY);
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState<
    string | null
  >(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const openCreateCompany = () => {
    setCompanyForm(EMPTY_COMPANY);
    setCompanyModalOpen(true);
  };

  const openEditCompany = (c: FreightCompany) => {
    setCompanyForm({
      id: c.id,
      name: c.name,
      contact_phone: c.contact_phone ?? "",
      contact_email: c.contact_email ?? "",
      logo_url: c.logo_url ?? "",
      notes: c.notes ?? "",
      is_active: c.is_active,
    });
    setCompanyModalOpen(true);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-seleccionar o mesmo ficheiro depois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecciona um ficheiro de imagem", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadFreightLogo(file);
      setCompanyForm((f) => ({ ...f, logo_url: url }));
    } catch (err: any) {
      toast({
        title: "Erro ao enviar o logótipo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmitCompany = async () => {
    if (!companyForm.name.trim()) {
      toast({ title: "Indica o nome da empresa", variant: "destructive" });
      return;
    }
    const ok = await saveCompany({
      id: companyForm.id,
      name: companyForm.name.trim(),
      contact_phone: companyForm.contact_phone.trim() || null,
      contact_email: companyForm.contact_email.trim() || null,
      logo_url: companyForm.logo_url.trim() || null,
      notes: companyForm.notes.trim() || null,
      is_active: companyForm.is_active,
    });
    if (ok) {
      toast({ title: companyForm.id ? "Empresa actualizada" : "Empresa criada" });
      setCompanyModalOpen(false);
    } else {
      toast({ title: "Erro ao guardar empresa", variant: "destructive" });
    }
  };

  // ── Painel de tarifário (por empresa) ─────────────────────────────────────
  const [ratesCompany, setRatesCompany] = useState<FreightCompany | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateForm, setRateForm] = useState<RateForm | null>(null);
  const [deleteRateConfirm, setDeleteRateConfirm] = useState<string | null>(
    null
  );

  const companyRates = useMemo(
    () => (ratesCompany ? getRatesByCompany(ratesCompany.id) : []),
    [ratesCompany, getRatesByCompany]
  );

  const openCreateRate = () => {
    if (!ratesCompany) return;
    setRateForm(emptyRate(ratesCompany.id));
    setRateModalOpen(true);
  };

  const openEditRate = (r: FreightCompanyRate) => {
    setRateForm({
      id: r.id,
      company_id: r.company_id,
      origin_province_id: String(r.origin_province_id),
      dest_province_id: String(r.dest_province_id),
      origin_municipality_id: r.origin_municipality_id
        ? String(r.origin_municipality_id)
        : "",
      dest_municipality_id: r.dest_municipality_id
        ? String(r.dest_municipality_id)
        : "",
      material_type_id: r.material_type_id ? String(r.material_type_id) : "",
      min_weight_kg: String(r.min_weight_kg),
      max_weight_kg: r.max_weight_kg !== null ? String(r.max_weight_kg) : "",
      price_kwz: String(r.price_kwz),
      days_min: String(r.days_min),
      days_max: String(r.days_max),
      notes: r.notes ?? "",
      is_active: r.is_active,
    });
    setRateModalOpen(true);
  };

  const setRateField = <K extends keyof RateForm>(key: K, value: RateForm[K]) =>
    setRateForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  // Ao mudar a província, limpa o município seleccionado dessa ponta
  // (evita ficar com um município "órfão" de outra província).
  const setRateProvince = (side: "origin" | "dest", value: string) => {
    setRateForm((prev) => {
      if (!prev) return prev;
      return side === "origin"
        ? { ...prev, origin_province_id: value, origin_municipality_id: "" }
        : { ...prev, dest_province_id: value, dest_municipality_id: "" };
    });
  };

  const municipalitiesForProvince = (provinceId: string) =>
    provinceId
      ? municipalities.filter((m) => String(m.province_id) === provinceId)
      : [];

  const handleSubmitRate = async () => {
    if (!rateForm) return;
    if (!rateForm.origin_province_id || !rateForm.dest_province_id) {
      toast({
        title: "Selecciona a província de origem e destino",
        variant: "destructive",
      });
      return;
    }
    if (!rateForm.price_kwz || Number(rateForm.price_kwz) <= 0) {
      toast({ title: "Indica um preço válido", variant: "destructive" });
      return;
    }
    const ok = await saveRate({
      id: rateForm.id,
      company_id: rateForm.company_id,
      origin_province_id: Number(rateForm.origin_province_id),
      dest_province_id: Number(rateForm.dest_province_id),
      origin_municipality_id: rateForm.origin_municipality_id
        ? Number(rateForm.origin_municipality_id)
        : null,
      dest_municipality_id: rateForm.dest_municipality_id
        ? Number(rateForm.dest_municipality_id)
        : null,
      material_type_id: rateForm.material_type_id
        ? Number(rateForm.material_type_id)
        : null,
      min_weight_kg: Number(rateForm.min_weight_kg || 0),
      max_weight_kg: rateForm.max_weight_kg
        ? Number(rateForm.max_weight_kg)
        : null,
      price_kwz: Number(rateForm.price_kwz),
      days_min: Number(rateForm.days_min || 2),
      days_max: Number(rateForm.days_max || 5),
      notes: rateForm.notes.trim() || null,
      is_active: rateForm.is_active,
    });
    if (ok) {
      toast({ title: rateForm.id ? "Tarifa actualizada" : "Tarifa criada" });
      setRateModalOpen(false);
    } else {
      toast({ title: "Erro ao guardar tarifa", variant: "destructive" });
    }
  };

  const provinceName = (id: number) =>
    provinces.find((p) => p.id === id)?.name ?? `#${id}`;

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        A carregar empresas de frete…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Empresas de frete interprovincial
          </h3>
          <p className="text-sm text-muted-foreground">
            Empresas transportadoras com tarifário próprio (por rota, material e
            peso). No checkout, o comprador escolhe entre o frete padrão da
            ZANGU e as opções destas empresas.
          </p>
        </div>
        <Button onClick={openCreateCompany} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova empresa
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm p-3">
          {error}
        </div>
      )}

      {/* ── Tabela de empresas ── */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-center">Tarifas</TableHead>
              <TableHead className="text-center">Activa</TableHead>
              <TableHead className="text-right">Acções</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhuma empresa cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {companies.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  {c.name}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.contact_phone || c.contact_email || "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {getRatesByCompany(c.id).length}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={(v) => toggleCompany(c.id, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setRatesCompany(c)}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Tarifário
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditCompany(c)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteCompanyConfirm(c.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ══════════════════ MODAL: CRIAR/EDITAR EMPRESA ══════════════════ */}
      <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {companyForm.id ? "Editar empresa" : "Nova empresa de frete"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input
                value={companyForm.name}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="ex: TransAngola Logística"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={companyForm.contact_phone}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      contact_phone: e.target.value,
                    }))
                  }
                  placeholder="9XX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={companyForm.contact_email}
                  onChange={(e) =>
                    setCompanyForm((f) => ({
                      ...f,
                      contact_email: e.target.value,
                    }))
                  }
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Logótipo{" "}
                <span className="text-muted-foreground text-xs">
                  (opcional — aparece no checkout ao escolher a transportadora)
                </span>
              </Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {companyForm.logo_url ? (
                    <img
                      src={companyForm.logo_url}
                      alt="Logótipo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        A enviar…
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        {companyForm.logo_url ? "Trocar imagem" : "Carregar imagem"}
                      </>
                    )}
                  </Button>
                  {companyForm.logo_url && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm((f) => ({ ...f, logo_url: "" }))}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 w-fit"
                    >
                      <X className="w-3 h-3" />
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Notas internas{" "}
                <span className="text-muted-foreground text-xs">
                  (opcional)
                </span>
              </Label>
              <Textarea
                value={companyForm.notes}
                onChange={(e) =>
                  setCompanyForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Empresa activa</p>
                <p className="text-xs text-muted-foreground">
                  Empresas inactivas não aparecem no checkout.
                </p>
              </div>
              <Switch
                checked={companyForm.is_active}
                onCheckedChange={(v) =>
                  setCompanyForm((f) => ({ ...f, is_active: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCompany} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {companyForm.id ? "Actualizar" : "Criar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: CONFIRMAR ELIMINAÇÃO DE EMPRESA ══════════════════ */}
      <Dialog
        open={deleteCompanyConfirm !== null}
        onOpenChange={() => setDeleteCompanyConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar empresa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acção é irreversível e vai eliminar também todas as tarifas
            associadas a esta empresa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCompanyConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteCompanyConfirm) {
                  await deleteCompany(deleteCompanyConfirm);
                  toast({ title: "Empresa eliminada" });
                  setDeleteCompanyConfirm(null);
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ PAINEL: TARIFÁRIO DA EMPRESA ══════════════════ */}
      <Dialog
        open={ratesCompany !== null}
        onOpenChange={(open) => !open && setRatesCompany(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Tarifário — {ratesCompany?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={openCreateRate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova tarifa
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-center">Activa</TableHead>
                  <TableHead className="text-right">Acções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyRates.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma tarifa cadastrada para esta empresa.
                    </TableCell>
                  </TableRow>
                )}
                {companyRates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {r.origin_municipality?.name ??
                          r.origin_province?.name ??
                          provinceName(r.origin_province_id)}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        {r.dest_municipality?.name ??
                          r.dest_province?.name ??
                          provinceName(r.dest_province_id)}
                      </div>
                      {(r.origin_municipality || r.dest_municipality) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rota exacta por município
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.material_type?.name ?? (
                        <span className="text-muted-foreground">
                          Todos os materiais
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Scale className="w-3 h-3 text-muted-foreground" />
                        {r.min_weight_kg}
                        {r.max_weight_kg !== null ? ` – ${r.max_weight_kg}` : "+"}{" "}
                        kg
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {fmtKz(r.price_kwz)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.days_min}–{r.days_max} dias
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => toggleRate(r.id, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditRate(r)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRateConfirm(r.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatesCompany(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: CRIAR/EDITAR TARIFA ══════════════════ */}
      <Dialog
        open={rateModalOpen}
        onOpenChange={(open) => !open && setRateModalOpen(false)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {rateForm?.id ? "Editar tarifa" : "Nova tarifa"}
            </DialogTitle>
          </DialogHeader>

          {rateForm && (
            <div className="space-y-4">
              <SectionDivider label="Rota" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Província de origem</Label>
                  <select
                    className={nativeSelectClass}
                    value={rateForm.origin_province_id}
                    onChange={(e) => setRateProvince("origin", e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Província de destino</Label>
                  <select
                    className={nativeSelectClass}
                    value={rateForm.dest_province_id}
                    onChange={(e) => setRateProvince("dest", e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Município de origem{" "}
                    <span className="text-muted-foreground text-xs">
                      (opcional)
                    </span>
                  </Label>
                  <select
                    className={nativeSelectClass}
                    value={rateForm.origin_municipality_id}
                    disabled={!rateForm.origin_province_id}
                    onChange={(e) =>
                      setRateField("origin_municipality_id", e.target.value)
                    }
                  >
                    <option value="">Toda a província</option>
                    {municipalitiesForProvince(rateForm.origin_province_id).map(
                      (m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Município de destino{" "}
                    <span className="text-muted-foreground text-xs">
                      (opcional)
                    </span>
                  </Label>
                  <select
                    className={nativeSelectClass}
                    value={rateForm.dest_municipality_id}
                    disabled={!rateForm.dest_province_id}
                    onChange={(e) =>
                      setRateField("dest_municipality_id", e.target.value)
                    }
                  >
                    <option value="">Toda a província</option>
                    {municipalitiesForProvince(rateForm.dest_province_id).map(
                      (m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Se deixares o município em branco, a tarifa cobre a província
                inteira (como já funcionava). Se escolheres um município
                específico, essa rota exacta ganha prioridade sobre a tarifa
                provincial — e um comprador noutro município da mesma
                província que não tenha rota própria vê sugestões de
                municípios vizinhos com rota disponível.
              </p>

              <SectionDivider label="Material e peso" />
              <div className="space-y-2">
                <Label>
                  Tipo de material{" "}
                  <span className="text-muted-foreground text-xs">
                    (deixa em branco para aplicar a todos)
                  </span>
                </Label>
                <select
                  className={nativeSelectClass}
                  value={rateForm.material_type_id}
                  onChange={(e) =>
                    setRateField("material_type_id", e.target.value)
                  }
                >
                  <option value="">Todos os materiais</option>
                  {materialTypes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peso mínimo (kg)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateForm.min_weight_kg}
                    onChange={(e) =>
                      setRateField("min_weight_kg", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Peso máximo (kg){" "}
                    <span className="text-muted-foreground text-xs">
                      (vazio = sem limite)
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={rateForm.max_weight_kg}
                    onChange={(e) =>
                      setRateField("max_weight_kg", e.target.value)
                    }
                    placeholder="ex: 30"
                  />
                </div>
              </div>

              <SectionDivider label="Preço e prazo" />
              <div className="space-y-2">
                <Label>Preço (Kz)</Label>
                <Input
                  type="number"
                  min={0}
                  value={rateForm.price_kwz}
                  onChange={(e) => setRateField("price_kwz", e.target.value)}
                  placeholder="ex: 8500"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo de entrega (dias úteis)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={rateForm.days_min}
                    onChange={(e) => setRateField("days_min", e.target.value)}
                    className="w-24"
                    placeholder="Min"
                  />
                  <span className="text-muted-foreground text-sm">a</span>
                  <Input
                    type="number"
                    min={0}
                    value={rateForm.days_max}
                    onChange={(e) => setRateField("days_max", e.target.value)}
                    className="w-24"
                    placeholder="Max"
                  />
                  <span className="text-muted-foreground text-sm">dias</span>
                </div>
              </div>

              <SectionDivider label="Extras" />
              <div className="space-y-2">
                <Label>
                  Notas internas{" "}
                  <span className="text-muted-foreground text-xs">
                    (opcional)
                  </span>
                </Label>
                <Textarea
                  value={rateForm.notes}
                  onChange={(e) => setRateField("notes", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Tarifa activa</p>
                  <p className="text-xs text-muted-foreground">
                    Tarifas inactivas não aparecem no checkout.
                  </p>
                </div>
                <Switch
                  checked={rateForm.is_active}
                  onCheckedChange={(v) => setRateField("is_active", v)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRate} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {rateForm?.id ? "Actualizar" : "Criar tarifa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════ MODAL: CONFIRMAR ELIMINAÇÃO DE TARIFA ══════════════════ */}
      <Dialog
        open={deleteRateConfirm !== null}
        onOpenChange={() => setDeleteRateConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tarifa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acção é irreversível.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRateConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteRateConfirm) {
                  await deleteRate(deleteRateConfirm);
                  toast({ title: "Tarifa eliminada" });
                  setDeleteRateConfirm(null);
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
