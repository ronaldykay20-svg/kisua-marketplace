import { useState, useEffect, useCallback } from "react";
import { useFreight, useCheckoutFreight, DeliveryType } from "@/hooks/useFreight";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SellerFreightInfo {
  sellerId: string;
  sellerName: string;
  originMunicipalityCode: string;
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
  cartGroups: CartGroup[];
  destMunicipalityCode: string | null;
  onFreightChange?: (selections: FreightSelection[], total: number) => void;
  showAddressSelector?: boolean;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

const fmtKz = (v: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    minimumFractionDigits: 2,
  }).format(v);

const fmtDays = (min?: number, max?: number) => {
  if (min == null || max == null) return "";
  return min === max ? `${min} dia útil` : `${min}–${max} dias úteis`;
};

function resolveLocationLabel(
  municipalityCode: string | null | undefined,
  provinces: any[],
  municipalities: any[]
): { municipalityName: string | null; provinceName: string | null } {
  if (!municipalityCode) return { municipalityName: null, provinceName: null };
  const mun = municipalities.find((m: any) => m.code === municipalityCode);
  if (!mun) return { municipalityName: null, provinceName: null };
  const prov = provinces.find((p: any) => p.id === mun.province_id);
  return { municipalityName: mun.name ?? null, provinceName: prov?.name ?? null };
}

// ─── Painel compacto de rotas alternativas ────────────────────────────────────

interface AlternativeRoutesProps {
  group: CartGroup;
  originCode: string;
  currentDestCode: string;
  provinces: any[];
  municipalities: any[];
  calculateFreight: (
    sellerId: string,
    originCode: string,
    destCode: string,
    type: DeliveryType
  ) => Promise<any>;
  onSelect: (selection: FreightSelection) => void;
  onPickup: () => void;
  pickupAddress?: string;
}

function AlternativeRoutes({
  group,
  originCode,
  currentDestCode,
  provinces,
  municipalities,
  calculateFreight,
  onSelect,
  onPickup,
  pickupAddress,
}: AlternativeRoutesProps) {
  const [alternatives, setAlternatives] = useState<
    { municipality: any; result: any }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const destMun = municipalities.find((m: any) => m.code === currentDestCode);
    if (!destMun) { setLoading(false); return; }

    const sameProv = municipalities.filter(
      (m: any) => m.province_id === destMun.province_id && m.code !== currentDestCode
    );

    let cancelled = false;
    const probe = async () => {
      setLoading(true);
      const results: { municipality: any; result: any }[] = [];

      const candidates = sameProv.slice(0, 6);
      await Promise.all(
        candidates.map(async (mun: any) => {
          const res = await calculateFreight(
            group.seller.sellerId,
            originCode,
            mun.code,
            "standard"
          );
          if (!res.error && res.source !== "error") {
            results.push({ municipality: mun, result: res });
          }
        })
      );

      if (!cancelled) {
        results.sort((a, b) => a.result.price - b.result.price);
        setAlternatives(results.slice(0, 3));
        setLoading(false);
      }
    };

    probe();
    return () => { cancelled = true; };
  }, [currentDestCode, municipalities, group.seller.sellerId, originCode, calculateFreight]);

  const handleSelectAlt = (mun: any, result: any) => {
    setSelected(mun.code);
    onSelect({
      sellerId: group.seller.sellerId,
      deliveryType: "standard",
      price: result.price,
      daysMin: result.days_min,
      daysMax: result.days_max,
      source: result.source,
    });
  };

  const { provinceName: originProvinceName, municipalityName: originMunicipalityName } =
    resolveLocationLabel(originCode, provinces, municipalities);
  const { municipalityName: destMunicipalityName } =
    resolveLocationLabel(currentDestCode, provinces, municipalities);

  const originLabel = originProvinceName || originMunicipalityName || "Este vendedor";
  const destLabel = destMunicipalityName || "o local seleccionado";

  return (
    <div className="pl-9 space-y-2">
      <p className="text-xs text-amber-500 flex items-start gap-1.5 leading-snug">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{originLabel} ainda não entrega em {destLabel}.</span>
      </p>

      <button
        onClick={onPickup}
        className="w-full flex items-center gap-2 text-xs rounded-lg border border-dashed border-border px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <Store className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left truncate text-foreground">
          {pickupAddress || "Levantamento na loja"}
        </span>
        <span className="font-medium text-green-500 shrink-0">Grátis</span>
      </button>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          A procurar alternativas…
        </div>
      ) : alternatives.length > 0 ? (
        <div className="space-y-1">
          {alternatives.map(({ municipality: mun, result }) => (
            <button
              key={mun.code}
              onClick={() => handleSelectAlt(mun, result)}
              className={cn(
                "w-full flex items-center gap-2 text-xs rounded-lg border px-3 py-2 transition-colors",
                selected === mun.code
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              )}
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left truncate text-foreground">{mun.name}</span>
              <span className="text-muted-foreground shrink-0">
                {result.days_min}–{result.days_max}d
              </span>
              <span className="font-medium shrink-0">
                {result.price === 0 ? "Grátis" : fmtKz(result.price)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">
          Sem rotas alternativas na mesma província.
        </p>
      )}
    </div>
  );
}

// ─── Linha de frete por vendedor (compacta) ───────────────────────────────────

interface SellerFreightRowProps {
  group: CartGroup;
  destMunicipalityCode: string;
  provinces: any[];
  municipalities: any[];
  calculateFreight: (
    sellerId: string,
    originCode: string,
    destCode: string,
    type: DeliveryType
  ) => Promise<any>;
  onSelect: (selection: FreightSelection) => void;
}

function SellerFreightRow({
  group,
  destMunicipalityCode,
  provinces,
  municipalities,
  calculateFreight,
  onSelect,
}: SellerFreightRowProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [expressResult, setExpressResult] = useState<any>(null);
  const [loadingExpress, setLoadingExpress] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showPickup, setShowPickup] = useState(false);

  const { result, loading, recalculate } = useCheckoutFreight(
    group.seller.sellerId,
    group.seller.originMunicipalityCode,
    destMunicipalityCode
  );

  useEffect(() => {
    if (!group.seller.sellerId || !group.seller.originMunicipalityCode || !destMunicipalityCode)
      return;
    let cancelled = false;
    setLoadingExpress(true);
    calculateFreight(
      group.seller.sellerId,
      group.seller.originMunicipalityCode,
      destMunicipalityCode,
      "express"
    ).then((res) => {
      if (!cancelled) { setExpressResult(res); setLoadingExpress(false); }
    });
    return () => { cancelled = true; };
  }, [group.seller.sellerId, group.seller.originMunicipalityCode, destMunicipalityCode, calculateFreight]);

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
  const noRoute = !loading && result && (result.error || result.source === "error");
  const isPickup = activeResult?.source === "pickup" || showPickup;
  const isFree = activeResult?.price === 0 && activeResult?.source !== "pickup";
  const hasExpress = expressResult && !expressResult.error && expressResult.source !== "pickup";
  const pickupAddress = result?.pickup_address ?? undefined;
  const isLoadingActive = deliveryType === "express" ? loadingExpress : loading;

  return (
    <div className="px-4 py-3.5">
      {/* Cabeçalho do vendedor */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 mb-2.5 min-w-0 group"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0">
          <Store className="w-3.5 h-3.5 text-muted-foreground" />
        </span>
        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {group.seller.sellerName}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          · {group.items.length} {group.items.length === 1 ? "item" : "itens"}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mb-3 pl-9 space-y-1 text-xs">
          {group.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-muted-foreground">
              <span className="truncate pr-2">{item.quantity}× {item.name}</span>
              <span className="shrink-0 tabular-nums">{fmtKz(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border font-medium text-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtKz(group.subtotal)}</span>
          </div>
        </div>
      )}

      {/* Estado do frete */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-9">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          A calcular frete…
        </div>
      ) : noRoute ? (
        <AlternativeRoutes
          group={group}
          originCode={group.seller.originMunicipalityCode}
          currentDestCode={destMunicipalityCode}
          provinces={provinces}
          municipalities={municipalities}
          calculateFreight={calculateFreight}
          onSelect={onSelect}
          onPickup={() => {
            setShowPickup(true);
            onSelect({
              sellerId: group.seller.sellerId,
              deliveryType: "standard",
              price: 0,
              daysMin: 0,
              daysMax: 0,
              source: "pickup",
            });
          }}
          pickupAddress={pickupAddress}
        />
      ) : isPickup ? (
        <div className="pl-9 flex items-center gap-2 text-xs flex-wrap">
          <Badge variant="secondary" className="gap-1 font-normal">
            <Store className="w-3 h-3" /> Retirada na loja
          </Badge>
          <span className="font-medium text-green-500">Grátis</span>
          {activeResult?.pickup_address && (
            <span className="text-muted-foreground truncate w-full mt-0.5">
              {activeResult.pickup_address}
            </span>
          )}
        </div>
      ) : (
        <div className="pl-9 space-y-2">
          {/* Selector segmentado de tipo de entrega */}
          <div className="inline-flex items-center rounded-full bg-muted p-0.5 text-xs font-medium">
            <button
              onClick={() => handleTypeChange("standard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                deliveryType === "standard"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Truck className="w-3.5 h-3.5" />
              Normal
            </button>
            {hasExpress && (
              <button
                onClick={() => handleTypeChange("express")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
                  deliveryType === "express"
                    ? "bg-background text-amber-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Expressa
              </button>
            )}
          </div>

          {/* Prazo + preço da opção activa */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isLoadingActive ? "A calcular…" : fmtDays(activeResult?.days_min, activeResult?.days_max)}
            </span>
            <span className={cn("font-semibold text-sm", isFree && "text-green-500")}>
              {isLoadingActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFree ? (
                "Grátis"
              ) : activeResult ? (
                fmtKz(activeResult.price)
              ) : null}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Selector de endereço (compacto) ──────────────────────────────────────────

interface AddressSelectorProps {
  onMunicipalitySelect: (code: string) => void;
  selectedCode: string | null;
}

function AddressSelector({ onMunicipalitySelect, selectedCode }: AddressSelectorProps) {
  const { provinces, getMunicipalitiesByProvince } = useFreight();
  const [selectedProvince, setSelectedProvince] = useState("");

  const municipalities = selectedProvince
    ? getMunicipalitiesByProvince(Number(selectedProvince))
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        Endereço de entrega
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedProvince}
          onChange={(e) => {
            setSelectedProvince(e.target.value);
            onMunicipalitySelect("");
          }}
          className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
        >
          <option value="">Província…</option>
          {provinces.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedCode ?? ""}
          onChange={(e) => onMunicipalitySelect(e.target.value)}
          disabled={!selectedProvince}
          className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring appearance-none disabled:opacity-50"
        >
          <option value="">Município…</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.code}>{m.name}</option>
          ))}
        </select>
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
  const [selections, setSelections] = useState<Map<string, FreightSelection>>(new Map());
  const { provinces, municipalities, calculateFreight } = useFreight();

  const destCode = showAddressSelector ? internalDestCode : externalDestCode;

  const handleSelect = useCallback((selection: FreightSelection) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(selection.sellerId, selection);
      return next;
    });
  }, []);

  useEffect(() => {
    const selectionArray = Array.from(selections.values());
    const total = selectionArray.reduce((sum, s) => sum + s.price, 0);
    onFreightChange?.(selectionArray, total);
  }, [selections, onFreightChange]);

  const totalFreight = Array.from(selections.values()).reduce((sum, s) => sum + s.price, 0);
  const allSelected = cartGroups.length > 0 && selections.size === cartGroups.length;

  if (cartGroups.length === 0) return null;

  return (
    <div className="space-y-3">
      {showAddressSelector && (
        <AddressSelector
          selectedCode={internalDestCode}
          onMunicipalitySelect={setInternalDestCode}
        />
      )}

      {!destCode ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center flex flex-col items-center gap-2">
          <MapPin className="w-5 h-5 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            Selecciona o município de entrega para ver as opções de frete.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {cartGroups.map((group) => (
            <SellerFreightRow
              key={group.seller.sellerId}
              group={group}
              destMunicipalityCode={destCode}
              provinces={provinces}
              municipalities={municipalities}
              calculateFreight={calculateFreight}
              onSelect={handleSelect}
            />
          ))}

          {cartGroups.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                Total de frete
                <span className="opacity-70">· {cartGroups.length} lojas</span>
              </span>
              <span className="shrink-0">
                {!allSelected ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : totalFreight === 0 ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-green-500">
                    <Gift className="w-3.5 h-3.5" /> Grátis
                  </span>
                ) : (
                  <span className="text-sm font-bold">{fmtKz(totalFreight)}</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
