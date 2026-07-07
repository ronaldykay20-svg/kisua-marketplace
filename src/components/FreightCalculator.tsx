import { useState, useEffect, useCallback } from "react";
import { useFreight, useCheckoutFreight, DeliveryType } from "@/hooks/useFreight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  Navigation,
  ArrowRight,
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
  freeShippingEligible?: boolean;
  freeShippingPartial?: boolean;
  freeShippingEligibleItemNames?: string[];
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
  product_free_shipping: "Frete grátis oferecido pelo vendedor",
  seller_custom_default_forced: "Padrão da plataforma",
  global_default: "Padrão da plataforma",
  global_default_forced: "Padrão da plataforma",
  pickup: "Retirada na loja",
  error: "Não disponível",
};

// ─── Helpers de nomes de localização ──────────────────────────────────────────

// Dado um código de município, devolve o nome do município e o nome da sua
// província — usados para escrever mensagens tipo "Benguela ainda não tem
// rota disponível para X" em vez de mensagens genéricas.
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

// ─── Painel de rotas alternativas ─────────────────────────────────────────────

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

  // ── Nomes reais de origem e destino para a mensagem de "rota indisponível" ──
  // Ex: "Benguela ainda não tem rota disponível para Cazenga."
  const { provinceName: originProvinceName, municipalityName: originMunicipalityName } =
    resolveLocationLabel(originCode, provinces, municipalities);
  const { municipalityName: destMunicipalityName } =
    resolveLocationLabel(currentDestCode, provinces, municipalities);

  const originLabel = originProvinceName || originMunicipalityName || "Este vendedor";
  const destLabel = destMunicipalityName || "o local seleccionado";

  return (
    <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-900/20 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-700/70 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800/80">
            {originLabel} ainda não tem rota disponível para {destLabel}.
          </p>
          <p className="text-xs text-amber-700/60 mt-0.5">
            O vendedor não entrega directamente no município seleccionado.
            Escolhe uma alternativa abaixo.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <button
          onClick={onPickup}
          className={cn(
            "w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-all",
            "border-stone-700/40 bg-stone-800/10 hover:border-stone-600/60 hover:bg-stone-800/20"
          )}
        >
          <Store className="w-4 h-4 text-stone-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-300">Levantamento na loja</p>
            {pickupAddress ? (
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {pickupAddress}
              </p>
            ) : (
              <p className="text-xs text-stone-500 mt-0.5">Recolha no local do vendedor</p>
            )}
          </div>
          <Badge className="bg-stone-700/30 text-stone-400 border-stone-600/30 text-[10px]">
            Grátis
          </Badge>
        </button>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-amber-700/60 py-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            A procurar rotas disponíveis…
          </div>
        ) : alternatives.length > 0 ? (
          <>
            <p className="text-xs text-amber-700/60 font-medium flex items-center gap-1.5">
              <Navigation className="w-3 h-3" />
              Municípios próximos com entrega disponível
            </p>
            <div className="space-y-2">
              {alternatives.map(({ municipality: mun, result }) => (
                <button
                  key={mun.code}
                  onClick={() => handleSelectAlt(mun, result)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-all",
                    selected === mun.code
                      ? "border-blue-600/50 bg-blue-900/15"
                      : "border-red-900/30 bg-red-950/10 hover:border-red-800/40 hover:bg-red-950/20"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    selected === mun.code
                      ? "border-blue-500 bg-blue-500"
                      : "border-red-800/50"
                  )}>
                    {selected === mun.code && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-red-400/70" />
                      {mun.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {result.days_min === result.days_max
                        ? `${result.days_min} dias úteis`
                        : `${result.days_min}–${result.days_max} dias úteis`}
                      <span className="opacity-50 ml-1">
                        · {SOURCE_LABELS[result.source] ?? result.source}
                      </span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {result.price === 0 ? (
                      <span className="text-sm font-semibold text-green-400">Grátis</span>
                    ) : (
                      <span className="text-sm font-semibold text-blue-300">
                        {fmtKz(result.price)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-amber-700/60 py-1">
            Não foram encontradas rotas alternativas na mesma província.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Componente de frete por vendedor ─────────────────────────────────────────

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
    if (group.freeShippingEligible) return;
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
  }, [group.seller.sellerId, group.seller.originMunicipalityCode, destMunicipalityCode, calculateFreight, group.freeShippingEligible]);

  // Frete grátis por produto — sobrepõe-se sempre ao cálculo normal por zonas.
  useEffect(() => {
    if (!group.freeShippingEligible) return;
    onSelect({
      sellerId: group.seller.sellerId,
      deliveryType: "standard",
      price: 0,
      daysMin: 1,
      daysMax: 3,
      source: "product_free_shipping",
    });
  }, [group.freeShippingEligible, group.seller.sellerId, onSelect]);

  useEffect(() => {
    if (group.freeShippingEligible) return;
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
  }, [result, expressResult, deliveryType, group.seller.sellerId, group.freeShippingEligible, onSelect]);

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

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
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
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 py-2 border-b space-y-1.5 bg-muted/10">
          {group.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover" />
                )}
                <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
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

      <div className="p-4 space-y-3">
        {group.freeShippingPartial && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700/90">
              <span className="font-semibold">
                {group.freeShippingEligibleItemNames && group.freeShippingEligibleItemNames.length === 1
                  ? group.freeShippingEligibleItemNames[0]
                  : `${group.freeShippingEligibleItemNames?.length ?? 0} produtos`}
              </span>{" "}
              deste vendedor têm frete grátis para o teu município, mas os
              restantes itens não — por isso o frete abaixo continua a ser
              cobrado normalmente para o pedido todo.
            </p>
          </div>
        )}

        {group.freeShippingEligible ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
            <Gift className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-600">Frete grátis</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este vendedor oferece entrega grátis para o teu município.
              </p>
            </div>
            <Badge className="ml-auto bg-green-500/15 text-green-600 border-green-500/30">Grátis</Badge>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
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
          <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <Store className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Retirada na loja</p>
              {activeResult?.pickup_address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {activeResult.pickup_address}
                </p>
              )}
            </div>
            <Badge className="ml-auto bg-rose-500/20 text-rose-400 border-rose-500/30">Grátis</Badge>
          </div>
        ) : (
          <RadioGroup
            value={deliveryType}
            onValueChange={(v) => handleTypeChange(v as DeliveryType)}
            className="space-y-2"
          >
            <Label
              htmlFor={`std-${group.seller.sellerId}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                deliveryType === "standard"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <RadioGroupItem value="standard" id={`std-${group.seller.sellerId}`} className="shrink-0" />
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
                    <span className="text-sm font-semibold text-green-400">Grátis</span>
                  ) : (
                    <span className="text-sm font-semibold">{fmtKz(result.price)}</span>
                  )
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </Label>

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
                <RadioGroupItem value="express" id={`exp-${group.seller.sellerId}`} className="shrink-0" />
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Entrega expressa
                    <Badge variant="outline" className="ml-2 text-[10px] border-amber-500/40 text-amber-400">
                      Rápido
                    </Badge>
                  </p>
                  {loadingExpress ? (
                    <p className="text-xs text-muted-foreground">A calcular…</p>
                  ) : expressResult && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expressResult.days_min === expressResult.days_max
                        ? `${expressResult.days_min} dia útil`
                        : `${expressResult.days_min}–${expressResult.days_max} dias úteis`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {loadingExpress ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : expressResult ? (
                    <span className="text-sm font-semibold text-amber-400">{fmtKz(expressResult.price)}</span>
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

function AddressSelector({ onMunicipalitySelect, selectedCode }: AddressSelectorProps) {
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
          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
              onMunicipalitySelect("");
            }}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
          >
            <option value="">Seleccionar…</option>
            {provinces.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Município</Label>
          <select
            value={selectedCode ?? ""}
            onChange={(e) => onMunicipalitySelect(e.target.value)}
            disabled={!selectedProvince}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Seleccionar…</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
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
    <div className="space-y-4">
      {showAddressSelector && (
        <AddressSelector
          selectedCode={internalDestCode}
          onMunicipalitySelect={setInternalDestCode}
        />
      )}

      {!destCode ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            Selecciona o município de entrega para ver as opções de frete.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
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
          </div>

          {cartGroups.length > 1 && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total de frete</span>
                  <span className="text-xs text-muted-foreground">({cartGroups.length} vendedores)</span>
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
                    <span className="font-semibold text-base">{fmtKz(totalFreight)}</span>
                  )}
                </div>
              </div>

              {allSelected && cartGroups.length > 1 && (
                <div className="mt-3 space-y-1 pt-3 border-t">
                  {Array.from(selections.values()).map((s) => {
                    const group = cartGroups.find((g) => g.seller.sellerId === s.sellerId);
                    return (
                      <div key={s.sellerId} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{group?.seller.sellerName}</span>
                        <span>{s.price === 0 ? "Grátis" : fmtKz(s.price)}</span>
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
