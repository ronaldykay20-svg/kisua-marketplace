import { useState, useEffect, useCallback } from "react";
import { useFreight, useCheckoutFreight, DeliveryType } from "@/hooks/useFreight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Truck,
  Zap,
  Store,
  Gift,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SellerFreightInfo {
  sellerId: string;
  sellerName: string;
  originMunicipalityCode: string; // município onde o vendedor está
}

interface CartGroup {
  seller: SellerFreightInfo;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  subtotal: number;
}

interface FreightSelection {
  sellerId: string;
  deliveryType: DeliveryType;
  price: number;
  daysMin: number;
  daysMax: number;
  source: string;
}

interface Props {
  // Grupos de itens por vendedor
  cartGroups: CartGroup[];
  // Município de destino seleccionado pelo comprador
  destMunicipalityCode: string | null;
  // Callback quando as selecções mudam (para o checkout calcular o total)
  onFreightChange?: (selections: FreightSelection[], total: number) => void;
  // Mostrar selector de endereço dentro do componente
  showAddressSelector?: boolean;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

const SOURCE_LABELS: Record<string, string> = {
  admin_exact: "Tabela da plataforma",
  admin_exact_express: "Tabela da plataforma (expressa)",
  admin_dest_mun: "Tabela da plataforma",
  admin_provincial: "Tabela da plataforma",
  seller_exact: "Frota do vendedor",
  seller_exact_express: "Frota do vendedor (expressa)",
  seller_provincial: "Frota do vendedor",
  seller_custom_default: "Frota do vendedor",
  seller_free: "Entrega grátis",
  seller_custom_default_forced: "Padrão da plataforma",
  global_default: "Padrão da plataforma",
  global_default_forced: "Padrão da plataforma",
  pickup: "Retirada na loja",
  error: "Não disponível",
};

// ─── Componente de frete por vendedor ─────────────────────────────────────────

interface SellerFreightRowProps {
  group: CartGroup;
  destMunicipalityCode: string;
  onSelect: (selection: FreightSelection) => void;
}

function SellerFreightRow({
  group,
  destMunicipalityCode,
  onSelect,
}: SellerFreightRowProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [expressResult, setExpressResult] = useState<any>(null);
  const [loadingExpress, setLoadingExpress] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { result, loading, recalculate } = useCheckoutFreight(
    group.seller.sellerId,
    group.seller.originMunicipalityCode,
    destMunicipalityCode
  );

  const { calculateFreight } = useFreight();

  // Pré-carregar preço expressa em paralelo
  useEffect(() => {
    if (
      !group.seller.sellerId ||
      !group.seller.originMunicipalityCode ||
      !destMunicipalityCode
    )
      return;

    let cancelled = false;
    setLoadingExpress(true);

    calculateFreight(
      group.seller.sellerId,
      group.seller.originMunicipalityCode,
      destMunicipalityCode,
      "express"
    ).then((res) => {
      if (!cancelled) {
        setExpressResult(res);
        setLoadingExpress(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    group.seller.sellerId,
    group.seller.originMunicipalityCode,
    destMunicipalityCode,
    calculateFreight,
  ]);

  // Notificar pai quando o resultado ou tipo muda
  useEffect(() => {
    const activeResult = deliveryType === "express" ? expressResult : result;
    if (!activeResult || activeResult.error) return;

    onSelect({
      sellerId: group.seller.sellerId,
      deliveryType,
      price: activeResult.price,
      daysMin: activeResult.days_min,
      daysMax: activeResult.days_max,
      source: activeResult.source,
    });
  }, [result, expressResult, deliveryType, group.seller.sellerId, onSelect]);

  const handleTypeChange = (val: DeliveryType) => {
    setDeliveryType(val);
    recalculate(val);
  };

  const activeResult = deliveryType === "express" ? expressResult : result;
  const isPickup = activeResult?.source === "pickup";
  const isFree = activeResult?.price === 0 && activeResult?.source !== "pickup";
  const hasExpress =
    expressResult && !expressResult.error && expressResult.source !== "pickup";

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Cabeçalho do vendedor */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{group.seller.sellerName}</span>
          <Badge variant="outline" className="text-xs">
            {group.items.length} {group.items.length === 1 ? "item" : "itens"}
          </Badge>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Itens expandidos */}
      {expanded && (
        <div className="px-4 py-2 border-b space-y-1.5 bg-muted/10">
          {group.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <span className="text-muted-foreground">
                  {item.quantity}× {item.name}
                </span>
              </div>
              <span>{fmtKz(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium pt-1 border-t">
            <span>Subtotal</span>
            <span>{fmtKz(group.subtotal)}</span>
          </div>
        </div>
      )}

      {/* Opções de entrega */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            A calcular frete…
          </div>
        ) : activeResult?.error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {activeResult.error}
          </div>
        ) : isPickup ? (
          /* RETIRADA NA LOJA */
          <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <Store className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Retirada na loja</p>
              {activeResult.pickup_address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {activeResult.pickup_address}
                </p>
              )}
            </div>
            <Badge className="ml-auto bg-rose-500/20 text-rose-400 border-rose-500/30">
              Grátis
            </Badge>
          </div>
        ) : (
          /* OPÇÕES NORMAL / EXPRESSA */
          <RadioGroup
            value={deliveryType}
            onValueChange={(v) => handleTypeChange(v as DeliveryType)}
            className="space-y-2"
          >
            {/* Normal */}
            <Label
              htmlFor={`std-${group.seller.sellerId}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                deliveryType === "standard"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <RadioGroupItem
                value="standard"
                id={`std-${group.seller.sellerId}`}
                className="shrink-0"
              />
              <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Entrega normal</p>
                {result && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.days_min === result.days_max
                      ? `${result.days_min} dias úteis`
                      : `${result.days_min}–${result.days_max} dias úteis`}
                    <span className="ml-1 text-[10px] opacity-60">
                      ({SOURCE_LABELS[result.source] ?? result.source})
                    </span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {result ? (
                  isFree ? (
                    <span className="text-sm font-semibold text-green-400">
                      Grátis
                    </span>
                  ) : (
                    <span className="text-sm font-semibold">
                      {fmtKz(result.price)}
                    </span>
                  )
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </Label>

            {/* Expressa (só se disponível) */}
            {hasExpress && (
              <Label
                htmlFor={`exp-${group.seller.sellerId}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                  deliveryType === "express"
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <RadioGroupItem
                  value="express"
                  id={`exp-${group.seller.sellerId}`}
                  className="shrink-0"
                />
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Entrega expressa
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] border-amber-500/40 text-amber-400"
                    >
                      Rápido
                    </Badge>
                  </p>
                  {loadingExpress ? (
                    <p className="text-xs text-muted-foreground">A calcular…</p>
                  ) : (
                    expressResult && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {expressResult.days_min === expressResult.days_max
                          ? `${expressResult.days_min} dia útil`
                          : `${expressResult.days_min}–${expressResult.days_max} dias úteis`}
                      </p>
                    )
                  )}
                </div>
                <div className="text-right shrink-0">
                  {loadingExpress ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : expressResult ? (
                    <span className="text-sm font-semibold text-amber-400">
                      {fmtKz(expressResult.price)}
                    </span>
                  ) : null}
                </div>
              </Label>
            )}
          </RadioGroup>
        )}
      </div>
    </div>
  );
}

// ─── Selector de endereço ─────────────────────────────────────────────────────

interface AddressSelectorProps {
  onMunicipalitySelect: (code: string) => void;
  selectedCode: string | null;
}

function AddressSelector({
  onMunicipalitySelect,
  selectedCode,
}: AddressSelectorProps) {
  const { provinces, getMunicipalitiesByProvince } = useFreight();
  const [selectedProvince, setSelectedProvince] = useState("");

  const municipalities = selectedProvince
    ? getMunicipalitiesByProvince(Number(selectedProvince))
    : [];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Endereço de entrega</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Província</Label>
          <Select
            value={selectedProvince}
            onValueChange={(v) => {
              setSelectedProvince(v);
              onMunicipalitySelect("");
            }}
          >
            <SelectTrigger className="h-9">
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
          <Label className="text-xs">Município</Label>
          <Select
            value={selectedCode ?? ""}
            onValueChange={onMunicipalitySelect}
            disabled={!selectedProvince}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar…" />
            </SelectTrigger>
            <SelectContent>
              {municipalities.map((m) => (
                <SelectItem key={m.id} value={m.code}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FreightCalculator({
  cartGroups,
  destMunicipalityCode: externalDestCode,
  onFreightChange,
  showAddressSelector = false,
}: Props) {
  const [internalDestCode, setInternalDestCode] = useState<string | null>(null);
  const [selections, setSelections] = useState<Map<string, FreightSelection>>(
    new Map()
  );

  const destCode = showAddressSelector ? internalDestCode : externalDestCode;

  const handleSelect = useCallback(
    (selection: FreightSelection) => {
      setSelections((prev) => {
        const next = new Map(prev);
        next.set(selection.sellerId, selection);
        return next;
      });
    },
    []
  );

  // Notificar pai quando selecções mudam
  useEffect(() => {
    const selectionArray = Array.from(selections.values());
    const total = selectionArray.reduce((sum, s) => sum + s.price, 0);
    onFreightChange?.(selectionArray, total);
  }, [selections, onFreightChange]);

  const totalFreight = Array.from(selections.values()).reduce(
    (sum, s) => sum + s.price,
    0
  );

  const allSelected =
    cartGroups.length > 0 && selections.size === cartGroups.length;

  if (cartGroups.length === 0) return null;

  return (
    <div className="space-y-4">

      {/* Selector de endereço interno (opcional) */}
      {showAddressSelector && (
        <AddressSelector
          selectedCode={internalDestCode}
          onMunicipalitySelect={setInternalDestCode}
        />
      )}

      {/* Aguardar endereço */}
      {!destCode ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            Selecciona o município de entrega para ver as opções de frete.
          </p>
        </div>
      ) : (
        <>
          {/* Uma linha por vendedor */}
          <div className="space-y-3">
            {cartGroups.map((group) => (
              <SellerFreightRow
                key={group.seller.sellerId}
                group={group}
                destMunicipalityCode={destCode}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Resumo do frete total */}
          {cartGroups.length > 1 && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total de frete</span>
                  <span className="text-xs text-muted-foreground">
                    ({cartGroups.length} vendedores)
                  </span>
                </div>
                <div className="text-right">
                  {!allSelected ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      A calcular…
                    </span>
                  ) : totalFreight === 0 ? (
                    <div className="flex items-center gap-1.5 text-green-400">
                      <Gift className="w-4 h-4" />
                      <span className="font-semibold">Grátis</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-base">
                      {fmtKz(totalFreight)}
                    </span>
                  )}
                </div>
              </div>

              {/* Breakdown por vendedor */}
              {allSelected && cartGroups.length > 1 && (
                <div className="mt-3 space-y-1 pt-3 border-t">
                  {Array.from(selections.values()).map((s) => {
                    const group = cartGroups.find(
                      (g) => g.seller.sellerId === s.sellerId
                    );
                    return (
                      <div
                        key={s.sellerId}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>{group?.seller.sellerName}</span>
                        <span>
                          {s.price === 0
                            ? "Grátis"
                            : fmtKz(s.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
