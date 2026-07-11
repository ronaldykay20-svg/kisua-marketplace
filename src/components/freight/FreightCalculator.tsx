import { useState, useEffect, useCallback, useMemo } from "react";
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
  Package,
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
  totalWeightKg?: number;
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

type CalculateFreightFn = (
  sellerId: string,
  originCode: string,
  destCode: string,
  type: DeliveryType,
  weightKg?: number
) => Promise<any>;

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

// Fontes ligadas a uma configuração PRÓPRIA de um vendedor (frota própria,
// frete grátis a título pessoal, ou levantamento no endereço dele). Duas
// lojas só podem partilhar um envio/preço único quando NENHUMA delas cai
// numa destas fontes — senão estaríamos a aplicar a tarifa de uma loja à
// encomenda da outra.
const SELLER_SPECIFIC_SOURCES = new Set([
  "seller_exact",
  "seller_exact_express",
  "seller_provincial",
  "seller_custom_default",
  "seller_custom_default_forced",
  "seller_free",
  "pickup",
]);

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
  calculateFreight: CalculateFreightFn;
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
            "standard",
            group.totalWeightKg ?? 0
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
  }, [currentDestCode, municipalities, group.seller.sellerId, group.totalWeightKg, originCode, calculateFreight]);

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

// ─── Linha de frete por vendedor individual (sem combinação) ──────────────────

interface SellerFreightRowProps {
  group: CartGroup;
  destMunicipalityCode: string;
  provinces: any[];
  municipalities: any[];
  calculateFreight: CalculateFreightFn;
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

  const weightKg = group.totalWeightKg ?? 0;

  const { result, loading, recalculate } = useCheckoutFreight(
    group.seller.sellerId,
    group.seller.originMunicipalityCode,
    destMunicipalityCode,
    weightKg
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
      "express",
      weightKg
    ).then((res) => {
      if (!cancelled) { setExpressResult(res); setLoadingExpress(false); }
    });
    return () => { cancelled = true; };
  }, [group.seller.sellerId, group.seller.originMunicipalityCode, destMunicipalityCode, weightKg, calculateFreight]);

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

// ─── Linha de envio combinado (várias lojas, mesmo ponto de origem) ───────────
// Quando duas ou mais lojas despacham do MESMO município e nenhuma delas tem
// tarifa própria (frota/loja personalizada, grátis ou levantamento), a
// plataforma trata-as como um único envio: soma-se o peso de todos os
// produtos e pede-se UM preço à tabela de frete, em vez de um preço por loja.
// O valor combinado é depois repartido pelo peso de cada loja apenas para
// efeitos de contabilidade interna — o comprador só vê o total único.

interface MergedShipmentRowProps {
  members: CartGroup[];
  originCode: string;
  destMunicipalityCode: string;
  calculateFreight: CalculateFreightFn;
  onSelect: (selection: FreightSelection) => void;
}

function MergedShipmentRow({
  members,
  originCode,
  destMunicipalityCode,
  calculateFreight,
  onSelect,
}: MergedShipmentRowProps) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [standardResult, setStandardResult] = useState<any>(null);
  const [expressResult, setExpressResult] = useState<any>(null);
  const [loadingStandard, setLoadingStandard] = useState(true);
  const [loadingExpress, setLoadingExpress] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const representativeSellerId = members[0].seller.sellerId;
  const combinedWeight = members.reduce((s, m) => s + (m.totalWeightKg ?? 0), 0);
  const totalItems = members.reduce((s, m) => s + m.items.length, 0);
  const combinedSubtotal = members.reduce((s, m) => s + m.subtotal, 0);
  const namesLabel = members.map((m) => m.seller.sellerName).join(" + ");

  useEffect(() => {
    let cancelled = false;
    setLoadingStandard(true);
    calculateFreight(representativeSellerId, originCode, destMunicipalityCode, "standard", combinedWeight)
      .then((res) => { if (!cancelled) { setStandardResult(res); setLoadingStandard(false); } });
    return () => { cancelled = true; };
  }, [representativeSellerId, originCode, destMunicipalityCode, combinedWeight, calculateFreight]);

  useEffect(() => {
    let cancelled = false;
    setLoadingExpress(true);
    calculateFreight(representativeSellerId, originCode, destMunicipalityCode, "express", combinedWeight)
      .then((res) => { if (!cancelled) { setExpressResult(res); setLoadingExpress(false); } });
    return () => { cancelled = true; };
  }, [representativeSellerId, originCode, destMunicipalityCode, combinedWeight, calculateFreight]);

  const activeResult = deliveryType === "express" ? expressResult : standardResult;

  // Reparte o preço combinado pelas lojas originais (proporcional ao peso de
  // cada uma) só para o registo interno de cada encomenda continuar a bater
  // certo — a soma das partes é sempre igual ao preço único mostrado.
  useEffect(() => {
    if (!activeResult || activeResult.error) return;
    let distributed = 0;
    members.forEach((m, idx) => {
      const isLast = idx === members.length - 1;
      let share: number;
      if (isLast) {
        share = Math.round((activeResult.price - distributed) * 100) / 100;
      } else {
        const raw =
          combinedWeight > 0
            ? activeResult.price * ((m.totalWeightKg ?? 0) / combinedWeight)
            : activeResult.price / members.length;
        share = Math.round(raw * 100) / 100;
        distributed += share;
      }
      onSelect({
        sellerId: m.seller.sellerId,
        deliveryType,
        price: share,
        daysMin: activeResult.days_min,
        daysMax: activeResult.days_max,
        source: activeResult.source,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResult, deliveryType]);

  const hasExpress = expressResult && !expressResult.error && expressResult.source !== "pickup";
  const isFree = activeResult?.price === 0;
  const isLoadingActive = deliveryType === "express" ? loadingExpress : loadingStandard;

  return (
    <div className="px-4 py-3.5">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 mb-2.5 min-w-0 group"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
          <Truck className="w-3.5 h-3.5 text-primary" />
        </span>
        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {namesLabel}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0">{members.length} lojas</Badge>
        <span className="text-xs text-muted-foreground shrink-0">
          · {totalItems} {totalItems === 1 ? "item" : "itens"}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mb-3 pl-9 space-y-2.5 text-xs">
          {members.map((m) => (
            <div key={m.seller.sellerId}>
              <p className="text-muted-foreground font-medium mb-1">{m.seller.sellerName}</p>
              <div className="space-y-1">
                {m.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-muted-foreground">
                    <span className="truncate pr-2">{item.quantity}× {item.name}</span>
                    <span className="shrink-0 tabular-nums">{fmtKz(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 border-t border-dashed border-border font-medium text-foreground">
            <span>Subtotal combinado</span>
            <span className="tabular-nums">{fmtKz(combinedSubtotal)}</span>
          </div>
        </div>
      )}

      <div className="pl-9 space-y-2">
        <div className="inline-flex items-center rounded-full bg-muted p-0.5 text-xs font-medium">
          <button
            onClick={() => setDeliveryType("standard")}
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
              onClick={() => setDeliveryType("express")}
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

        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
          <Package className="w-3 h-3" />
          Envio único para {members.length} lojas do mesmo ponto de envio
          {combinedWeight > 0 && ` · ${combinedWeight.toFixed(1)} kg`}
        </p>
      </div>
    </div>
  );
}

function PendingMergeRow({ members }: { members: CartGroup[] }) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      A verificar o melhor frete para {members.length} lojas do mesmo ponto de envio…
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

interface ShipmentCluster {
  originCode: string;
  members: CartGroup[];
}

export default function FreightCalculator({
  cartGroups,
  destMunicipalityCode: externalDestCode,
  onFreightChange,
  showAddressSelector = false,
}: Props) {
  const [internalDestCode, setInternalDestCode] = useState<string | null>(null);
  const [selections, setSelections] = useState<Map<string, FreightSelection>>(new Map());
  const [mergeSafety, setMergeSafety] = useState<Record<string, boolean | null>>({});
  const { provinces, municipalities, calculateFreight } = useFreight();

  const destCode = showAddressSelector ? internalDestCode : externalDestCode;

  // Agrupa as lojas do carrinho pelo município de origem — duas lojas que
  // despacham do mesmo sítio são candidatas a um envio/preço único.
  const clusters: ShipmentCluster[] = useMemo(() => {
    const map = new Map<string, CartGroup[]>();
    for (const g of cartGroups) {
      const key = g.seller.originMunicipalityCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).map(([originCode, members]) => ({ originCode, members }));
  }, [cartGroups]);

  const clustersKey = clusters.map((c) => `${c.originCode}:${c.members.length}`).join("|");

  // Para cada ponto de origem com mais do que uma loja, testa se a rota cai
  // numa fonte "genérica" da plataforma (não presa a uma loja específica).
  // Só nesse caso é seguro combinar o peso e mostrar um preço único.
  useEffect(() => {
    if (!destCode) return;
    const multi = clusters.filter((c) => c.members.length > 1);
    if (multi.length === 0) return;

    let cancelled = false;
    setMergeSafety((prev) => {
      const next = { ...prev };
      multi.forEach((c) => { if (!(c.originCode in next)) next[c.originCode] = null; });
      return next;
    });

    (async () => {
      const results = await Promise.all(
        multi.map(async (c) => {
          const combinedWeight = c.members.reduce((s, m) => s + (m.totalWeightKg ?? 0), 0);
          const res = await calculateFreight(
            c.members[0].seller.sellerId,
            c.originCode,
            destCode,
            "standard",
            combinedWeight
          );
          const safe = !res.error && res.source !== "error" && !SELLER_SPECIFIC_SOURCES.has(res.source);
          return [c.originCode, safe] as const;
        })
      );
      if (!cancelled) {
        setMergeSafety((prev) => {
          const next = { ...prev };
          results.forEach(([code, safe]) => { next[code] = safe; });
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clustersKey, destCode, calculateFreight]);

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
          {clusters.map((cluster) => {
            if (cluster.members.length === 1) {
              return (
                <SellerFreightRow
                  key={cluster.members[0].seller.sellerId}
                  group={cluster.members[0]}
                  destMunicipalityCode={destCode}
                  provinces={provinces}
                  municipalities={municipalities}
                  calculateFreight={calculateFreight}
                  onSelect={handleSelect}
                />
              );
            }

            const safety = mergeSafety[cluster.originCode];

            if (safety === null || safety === undefined) {
              return <PendingMergeRow key={cluster.originCode} members={cluster.members} />;
            }

            if (safety === true) {
              return (
                <MergedShipmentRow
                  key={cluster.originCode}
                  members={cluster.members}
                  originCode={cluster.originCode}
                  destMunicipalityCode={destCode}
                  calculateFreight={calculateFreight}
                  onSelect={handleSelect}
                />
              );
            }

            // Alguma loja do grupo tem tarifa própria — não é seguro combinar,
            // cada uma volta a mostrar a sua própria opção de entrega.
            return cluster.members.map((member) => (
              <SellerFreightRow
                key={member.seller.sellerId}
                group={member}
                destMunicipalityCode={destCode}
                provinces={provinces}
                municipalities={municipalities}
                calculateFreight={calculateFreight}
                onSelect={handleSelect}
              />
            ));
          })}

          {cartGroups.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                Total de frete
                <span className="opacity-70">· {clusters.length} {clusters.length === 1 ? "envio" : "envios"}</span>
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
