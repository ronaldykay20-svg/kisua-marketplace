import { useState, useEffect, useCallback } from "react";
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

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useFreight() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [settings, setSettings] = useState<FreightSettings | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar províncias, municípios e configurações globais ao montar
  useEffect(() => {
    const load = async () => {
      setLoadingGeo(true);
      setError(null);
      try {
        const [provRes, munRes, settRes] = await Promise.all([
          supabase.from("provinces").select("*").order("name"),
          supabase.from("municipalities").select("*").order("name"),
          supabase.from("freight_settings").select("*").limit(1).single(),
        ]);

        if (provRes.error) throw provRes.error;
        if (munRes.error) throw munRes.error;
        // settings pode não existir ainda
        if (settRes.data) setSettings(settRes.data as FreightSettings);

        setProvinces(provRes.data as Province[]);
        setMunicipalities(munRes.data as Municipality[]);
      } catch (err: any) {
        setError(err.message ?? "Erro ao carregar dados geográficos");
      } finally {
        setLoadingGeo(false);
      }
    };
    load();
  }, []);

  // Municípios filtrados por província
  const getMunicipalitiesByProvince = useCallback(
    (provinceId: number): Municipality[] =>
      municipalities.filter((m) => m.province_id === provinceId),
    [municipalities]
  );

  // Calcular frete chamando a função PostgreSQL
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

// ─── Hook para Admin: gestão de zonas ─────────────────────────────────────────

export function useAdminFreight() {
  const [zones, setZones] = useState<FreightZone[]>([]);
  const [settings, setSettings] = useState<FreightSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("freight_zones")
        .select(`
          *,
          origin_province:provinces!freight_zones_origin_province_id_fkey(id, name),
          origin_municipality:municipalities!freight_zones_origin_municipality_id_fkey(id, name),
          dest_province:provinces!freight_zones_dest_province_id_fkey(id, name),
          dest_municipality:municipalities!freight_zones_dest_municipality_id_fkey(id, name)
        `)
        .order("zone_type")
        .order("origin_province_id");

      if (error) throw error;
      setZones(data as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("freight_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) setSettings(data as FreightSettings);
  }, []);

  useEffect(() => {
    fetchZones();
    fetchSettings();
  }, [fetchZones, fetchSettings]);

  // Criar ou actualizar zona
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
            .from("freight_zones")
            .update(payload)
            .eq("id", zone.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("freight_zones")
            .insert(payload);
          if (error) throw error;
        }
        await fetchZones();
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchZones]
  );

  // Activar / desactivar zona
  const toggleZone = useCallback(
    async (id: number, isActive: boolean): Promise<void> => {
      await supabase
        .from("freight_zones")
        .update({ is_active: isActive })
        .eq("id", id);
      await fetchZones();
    },
    [fetchZones]
  );

  // Apagar zona
  const deleteZone = useCallback(
    async (id: number): Promise<void> => {
      await supabase.from("freight_zones").delete().eq("id", id);
      await fetchZones();
    },
    [fetchZones]
  );

  // Actualizar configurações globais
  const saveSettings = useCallback(
    async (updated: Partial<FreightSettings>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const { error } = await supabase
          .from("freight_settings")
          .update(updated)
          .eq("id", settings?.id ?? 1);
        if (error) throw error;
        await fetchSettings();
        return true;
      } catch (err: any) {
        setError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [settings, fetchSettings]
  );

  return {
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

// ─── Hook para Vendedor: gestão do frete próprio ──────────────────────────────

export function useSellerFreight(sellerId: string | null) {
  const [config, setConfig] = useState<SellerFreightConfig | null>(null);
  const [zones, setZones] = useState<FreightZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("seller_freight_config")
        .select("*")
        .eq("seller_id", sellerId)
        .single();
      setConfig(data as SellerFreightConfig | null);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  const fetchZones = useCallback(async () => {
    if (!sellerId) return;
    const { data } = await supabase
      .from("seller_freight_zones")
      .select(`
        *,
        origin_province:provinces!seller_freight_zones_origin_province_id_fkey(id, name),
        origin_municipality:municipalities!seller_freight_zones_origin_municipality_id_fkey(id, name),
        dest_province:provinces!seller_freight_zones_dest_province_id_fkey(id, name),
        dest_municipality:municipalities!seller_freight_zones_dest_municipality_id_fkey(id, name)
      `)
      .eq("seller_id", sellerId)
      .order("zone_type");
    setZones((data as any) ?? []);
  }, [sellerId]);

  useEffect(() => {
    fetchConfig();
    fetchZones();
  }, [fetchConfig, fetchZones]);

  // Guardar / criar configuração do modo de frete
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
        setError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sellerId, config, fetchConfig]
  );

  // Guardar zona do vendedor
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
            .from("seller_freight_zones")
            .update(payload)
            .eq("id", zone.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("seller_freight_zones")
            .insert(payload);
          if (error) throw error;
        }
        await fetchZones();
        return true;
      } catch (err: any) {
        setError(err.message);
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
    saveConfig,
    saveZone,
    toggleZone,
    deleteZone,
    fetchZones,
  };
}

// ─── Hook para Checkout: cálculo em tempo real ────────────────────────────────

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
