import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type DeliveryType = "standard" | "express";
export type FreightMode = "admin" | "custom" | "mixed" | "free" | "pickup";

export interface Province {
  id: number;
  code: string;
  name: string;
}

export interface Municipality {
  id: number;
  code: string;
  province_id: number;
  name: string;
}

export interface FreightZone {
  id: number;
  zone_type: "intra_municipal" | "intra_provincial" | "interprovincial";
  origin_province_id: number;
  origin_municipality_id: number | null;
  dest_province_id: number;
  dest_municipality_id: number | null;
  price_kwz: number;
  has_express: boolean;
  express_price_kwz: number | null;
  standard_days_min: number;
  standard_days_max: number;
  express_days_min: number | null;
  express_days_max: number | null;
  is_active: boolean;
  notes: string | null;
}

export interface FreightSettings {
  id: number;
  default_price_kwz: number;
  force_default_for_sellers: boolean;
  free_shipping_threshold: number;
  allow_seller_custom: boolean;
  currency: string;
}

export interface SellerFreightConfig {
  id: number;
  seller_id: string;
  freight_mode: FreightMode;
  custom_default_price_kwz: number | null;
  pickup_address: string | null;
  pickup_province_id: number | null;
  pickup_municipality_id: number | null;
  public_note: string | null;
  is_active: boolean;
}

export interface FreightResult {
  price: number;
  days_min: number;
  days_max: number;
  source: string;
  currency: string;
  pickup_address?: string;
  error?: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function enrichZones(
  rawZones: any[],
  provinces: Province[],
  municipalities: Municipality[]
): any[] {
  const provMap = new Map(provinces.map((p) => [p.id, p]));
  const munMap = new Map(municipalities.map((m) => [m.id, m]));
  return rawZones.map((z) => ({
    ...z,
    origin_province: provMap.get(z.origin_province_id) ?? null,
    origin_municipality: z.origin_municipality_id
      ? munMap.get(z.origin_municipality_id) ?? null
      : null,
    dest_province: provMap.get(z.dest_province_id) ?? null,
    dest_municipality: z.dest_municipality_id
      ? munMap.get(z.dest_municipality_id) ?? null
      : null,
  }));
}

async function fetchGeo(): Promise<{
  provinces: Province[];
  municipalities: Municipality[];
}> {
  const [provRes, munRes] = await Promise.all([
    supabase.from("provinces").select("*").order("name"),
    supabase.from("municipalities").select("*").order("name"),
  ]);
  return {
    provinces: (provRes.data ?? []) as Province[],
    municipalities: (munRes.data ?? []) as Municipality[],
  };
}

async function fetchSettingsSafe(): Promise<FreightSettings | null> {
  const { data } = await supabase
    .from("freight_settings")
    .select("*")
    .limit(1);
  return data && data.length > 0 ? (data[0] as FreightSettings) : null;
}

// ─── useFreight (base / checkout) ────────────────────────────────────────────

export function useFreight() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [settings, setSettings] = useState<FreightSettings | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingGeo(true);
      setError(null);
      try {
        const { provinces: p, municipalities: m } = await fetchGeo();
        if (!cancelled) {
          setProvinces(p);
          setMunicipalities(m);
        }
        const sett = await fetchSettingsSafe();
        if (!cancelled && sett) setSettings(sett);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoadingGeo(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const getMunicipalitiesByProvince = useCallback(
    (provinceId: number): Municipality[] =>
      municipalities.filter((m) => m.province_id === provinceId),
    [municipalities]
  );

  const calculateFreight = useCallback(
    async (
      sellerId: string,
      originCode: string,
      destCode: string,
      deliveryType: DeliveryType = "standard"
    ): Promise<FreightResult> => {
      try {
        const { data, error } = await supabase.rpc("calculate_freight", {
          p_seller_id: sellerId,
          p_origin_municipality: originCode,
          p_dest_municipality: destCode,
          p_delivery_type: deliveryType,
        });
        if (error) throw error;
        return data as FreightResult;
      } catch (err: any) {
        return {
          price: 0,
          days_min: 0,
          days_max: 0,
          source: "error",
          currency: "AOA",
          error: err.message ?? "Erro ao calcular frete",
        };
      }
    },
    []
  );

  return {
    provinces,
    municipalities,
    getMunicipalitiesByProvince,
    settings,
    loadingGeo,
    error,
    calculateFreight,
  };
}

// ─── useAdminFreight ──────────────────────────────────────────────────────────

export function useAdminFreight() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [settings, setSettings] = useState<FreightSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para usar dentro de callbacks sem causar loops de dependências
  const provincesRef = useRef<Province[]>([]);
  const municipalitiesRef = useRef<Municipality[]>([]);

  // Carregar tudo em sequência: geo primeiro, depois zones e settings
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Geo
        const { provinces: p, municipalities: m } = await fetchGeo();
        if (cancelled) return;
        provincesRef.current = p;
        municipalitiesRef.current = m;
        setProvinces(p);
        setMunicipalities(m);

        // 2. Zones (geo já disponível via variáveis locais p e m)
        const { data: zonesData, error: zErr } = await supabase
          .from("freight_zones")
          .select("*")
          .order("zone_type")
          .order("origin_province_id");
        if (zErr) throw zErr;
        if (!cancelled) setZones(enrichZones(zonesData ?? [], p, m));

        // 3. Settings
        const sett = await fetchSettingsSafe();
        if (!cancelled && sett) setSettings(sett);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Erro ao inicializar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // fetchZones usa refs — sem dependências que causam re-render loops
  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("freight_zones")
        .select("*")
        .order("zone_type")
        .order("origin_province_id");
      if (error) throw error;
      setZones(enrichZones(
        data ?? [],
        provincesRef.current,
        municipalitiesRef.current
      ));
    } catch (err: any) {
      setError(err.message ?? "Erro ao carregar zonas");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const sett = await fetchSettingsSafe();
    if (sett) setSettings(sett);
  }, []);

  const saveZone = useCallback(
    async (zone: Partial<FreightZone> & { id?: number }): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const payload = {
          zone_type: zone.zone_type,
          origin_province_id: zone.origin_province_id,
          origin_municipality_id: zone.origin_municipality_id ?? null,
          dest_province_id: zone.dest_province_id,
          dest_municipality_id: zone.dest_municipality_id ?? null,
          price_kwz: zone.price_kwz,
          has_express: zone.has_express ?? false,
          express_price_kwz: zone.express_price_kwz ?? null,
          standard_days_min: zone.standard_days_min ?? 1,
          standard_days_max: zone.standard_days_max ?? 3,
          express_days_min: zone.express_days_min ?? null,
          express_days_max: zone.express_days_max ?? null,
          is_active: zone.is_active ?? true,
          notes: zone.notes ?? null,
        };
        if (zone.id) {
          const { error } = await supabase
            .from("freight_zones").update(payload).eq("id", zone.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("freight_zones").insert(payload);
          if (error) throw error;
        }
        await fetchZones();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar zona");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchZones]
  );

  const toggleZone = useCallback(
    async (id: number, isActive: boolean): Promise<void> => {
      const { error } = await supabase
        .from("freight_zones").update({ is_active: isActive }).eq("id", id);
      if (!error) await fetchZones();
    },
    [fetchZones]
  );

  const deleteZone = useCallback(
    async (id: number): Promise<void> => {
      const { error } = await supabase
        .from("freight_zones").delete().eq("id", id);
      if (!error) await fetchZones();
    },
    [fetchZones]
  );

  const saveSettings = useCallback(
    async (updated: Partial<FreightSettings>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        if (settings?.id) {
          const { error } = await supabase
            .from("freight_settings").update(updated).eq("id", settings.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("freight_settings").insert(updated);
          if (error) throw error;
        }
        await fetchSettings();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar configurações");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings, fetchSettings]
  );

  return {
    // FIX: provinces e municipalities agora expostos para o AdminFreightTab
    provinces,
    municipalities,
    zones,
    settings,
    loading,
    saving,
    error,
    fetchZones,
    saveZone,
    toggleZone,
    deleteZone,
    saveSettings,
  };
}

// ─── useSellerFreight ─────────────────────────────────────────────────────────

export function useSellerFreight(sellerId: string | null) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [config, setConfig] = useState<SellerFreightConfig | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provincesRef = useRef<Province[]>([]);
  const municipalitiesRef = useRef<Municipality[]>([]);

  useEffect(() => {
    if (!sellerId) return;
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      try {
        const { provinces: p, municipalities: m } = await fetchGeo();
        if (cancelled) return;
        provincesRef.current = p;
        municipalitiesRef.current = m;
        setProvinces(p);
        setMunicipalities(m);

        const [configRes, zonesRes] = await Promise.all([
          supabase
            .from("seller_freight_config")
            .select("*")
            .eq("seller_id", sellerId)
            .maybeSingle(),
          supabase
            .from("seller_freight_zones")
            .select("*")
            .eq("seller_id", sellerId)
            .order("zone_type"),
        ]);

        if (!cancelled) {
          setConfig(configRes.data as SellerFreightConfig | null);
          setZones(enrichZones(zonesRes.data ?? [], p, m));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, [sellerId]);

  const fetchConfig = useCallback(async () => {
    if (!sellerId) return;
    const { data } = await supabase
      .from("seller_freight_config")
      .select("*")
      .eq("seller_id", sellerId)
      .maybeSingle();
    setConfig(data as SellerFreightConfig | null);
  }, [sellerId]);

  const fetchZones = useCallback(async () => {
    if (!sellerId) return;
    const { data } = await supabase
      .from("seller_freight_zones")
      .select("*")
      .eq("seller_id", sellerId)
      .order("zone_type");
    setZones(enrichZones(
      data ?? [],
      provincesRef.current,
      municipalitiesRef.current
    ));
  }, [sellerId]);

  const saveConfig = useCallback(
    async (updates: Partial<SellerFreightConfig>): Promise<boolean> => {
      if (!sellerId) return false;
      setSaving(true);
      setError(null);
      try {
        if (config?.id) {
          const { error } = await supabase
            .from("seller_freight_config")
            .update(updates)
            .eq("seller_id", sellerId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("seller_freight_config")
            .insert({ ...updates, seller_id: sellerId });
          if (error) throw error;
        }
        await fetchConfig();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar configuração");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sellerId, config, fetchConfig]
  );

  const saveZone = useCallback(
    async (zone: Partial<FreightZone> & { id?: number }): Promise<boolean> => {
      if (!sellerId) return false;
      setSaving(true);
      setError(null);
      try {
        const payload = {
          seller_id: sellerId,
          zone_type: zone.zone_type,
          origin_province_id: zone.origin_province_id,
          origin_municipality_id: zone.origin_municipality_id ?? null,
          dest_province_id: zone.dest_province_id,
          dest_municipality_id: zone.dest_municipality_id ?? null,
          price_kwz: zone.price_kwz,
          has_express: zone.has_express ?? false,
          express_price_kwz: zone.express_price_kwz ?? null,
          standard_days_min: zone.standard_days_min ?? 1,
          standard_days_max: zone.standard_days_max ?? 3,
          express_days_min: zone.express_days_min ?? null,
          express_days_max: zone.express_days_max ?? null,
          is_active: zone.is_active ?? true,
        };
        if (zone.id) {
          const { error } = await supabase
            .from("seller_freight_zones").update(payload).eq("id", zone.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("seller_freight_zones").insert(payload);
          if (error) throw error;
        }
        await fetchZones();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar zona");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sellerId, fetchZones]
  );

  const toggleZone = useCallback(
    async (id: number, isActive: boolean): Promise<void> => {
      await supabase
        .from("seller_freight_zones")
        .update({ is_active: isActive })
        .eq("id", id);
      await fetchZones();
    },
    [fetchZones]
  );

  const deleteZone = useCallback(
    async (id: number): Promise<void> => {
      await supabase.from("seller_freight_zones").delete().eq("id", id);
      await fetchZones();
    },
    [fetchZones]
  );

  return {
    config,
    zones,
    loading,
    saving,
    error,
    provinces,
    municipalities,
    saveConfig,
    saveZone,
    toggleZone,
    deleteZone,
    fetchZones,
  };
}

// ─── useCheckoutFreight ───────────────────────────────────────────────────────

export function useCheckoutFreight(
  sellerId: string | null,
  originMunicipalityCode: string | null,
  destMunicipalityCode: string | null
) {
  const [result, setResult] = useState<FreightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { calculateFreight } = useFreight();

  useEffect(() => {
    if (!sellerId || !originMunicipalityCode || !destMunicipalityCode) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const res = await calculateFreight(
        sellerId,
        originMunicipalityCode,
        destMunicipalityCode,
        "standard"
      );
      if (!cancelled) {
        setResult(res);
        setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [sellerId, originMunicipalityCode, destMunicipalityCode, calculateFreight]);

  const recalculate = useCallback(
    async (deliveryType: DeliveryType = "standard") => {
      if (!sellerId || !originMunicipalityCode || !destMunicipalityCode) return;
      setLoading(true);
      const res = await calculateFreight(
        sellerId,
        originMunicipalityCode,
        destMunicipalityCode,
        deliveryType
      );
      setResult(res);
      setLoading(false);
    },
    [sellerId, originMunicipalityCode, destMunicipalityCode, calculateFreight]
  );

  return { result, loading, recalculate };
}
