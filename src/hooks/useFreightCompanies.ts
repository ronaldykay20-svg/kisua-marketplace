import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Province, Municipality } from "@/hooks/useFreight";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FreightMaterialType {
  id: number;
  name: string;
  is_active: boolean;
}

export interface FreightCompany {
  id: string;
  name: string;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FreightCompanyRate {
  id: string;
  company_id: string;
  origin_province_id: number;
  dest_province_id: number;
  origin_municipality_id: number | null;
  dest_municipality_id: number | null;
  material_type_id: number | null;
  min_weight_kg: number;
  max_weight_kg: number | null;
  price_kwz: number;
  days_min: number;
  days_max: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enriquecido no cliente
  origin_province?: Province | null;
  dest_province?: Province | null;
  origin_municipality?: Municipality | null;
  dest_municipality?: Municipality | null;
  material_type?: FreightMaterialType | null;
}

export interface FreightCompanyOption {
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_phone: string | null;
  rate_id: string;
  price_kwz: number;
  days_min: number;
  days_max: number;
  material_type_id: number | null;
  material_type_name: string | null;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function fetchProvincesSafe(): Promise<Province[]> {
  const { data } = await supabase.from("provinces").select("*").order("name");
  return (data ?? []) as Province[];
}

async function fetchMunicipalitiesSafe(): Promise<Municipality[]> {
  const { data } = await supabase
    .from("municipalities")
    .select("*")
    .order("name");
  return (data ?? []) as Municipality[];
}

function enrichRates(
  rawRates: any[],
  provinces: Province[],
  materialTypes: FreightMaterialType[],
  municipalities: Municipality[] = []
): FreightCompanyRate[] {
  const provMap = new Map(provinces.map((p) => [p.id, p]));
  const matMap = new Map(materialTypes.map((m) => [m.id, m]));
  const munMap = new Map(municipalities.map((m) => [m.id, m]));
  return rawRates.map((r) => ({
    ...r,
    origin_province: provMap.get(r.origin_province_id) ?? null,
    dest_province: provMap.get(r.dest_province_id) ?? null,
    origin_municipality: r.origin_municipality_id
      ? munMap.get(r.origin_municipality_id) ?? null
      : null,
    dest_municipality: r.dest_municipality_id
      ? munMap.get(r.dest_municipality_id) ?? null
      : null,
    material_type: r.material_type_id
      ? matMap.get(r.material_type_id) ?? null
      : null,
  }));
}

// ─── useAdminFreightCompanies (painel admin) ─────────────────────────────────

export function useAdminFreightCompanies() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [materialTypes, setMaterialTypes] = useState<FreightMaterialType[]>([]);
  const [companies, setCompanies] = useState<FreightCompany[]>([]);
  const [rates, setRates] = useState<FreightCompanyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from("freight_companies")
      .select("*")
      .order("name");
    if (error) {
      setError(error.message);
      return;
    }
    setCompanies((data ?? []) as FreightCompany[]);
  }, []);

  const fetchMaterialTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from("freight_material_types")
      .select("*")
      .order("name");
    if (error) {
      setError(error.message);
      return;
    }
    setMaterialTypes((data ?? []) as FreightMaterialType[]);
  }, []);

  const fetchRates = useCallback(
    async (
      currentProvinces?: Province[],
      currentMaterialTypes?: FreightMaterialType[],
      currentMunicipalities?: Municipality[]
    ) => {
      const { data, error } = await supabase
        .from("freight_company_rates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      setRates(
        enrichRates(
          data ?? [],
          currentProvinces ?? provinces,
          currentMaterialTypes ?? materialTypes,
          currentMunicipalities ?? municipalities
        )
      );
    },
    [provinces, materialTypes, municipalities]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, m, mtRes, companiesRes, ratesRes] = await Promise.all([
          fetchProvincesSafe(),
          fetchMunicipalitiesSafe(),
          supabase.from("freight_material_types").select("*").order("name"),
          supabase.from("freight_companies").select("*").order("name"),
          supabase
            .from("freight_company_rates")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);
        if (cancelled) return;
        const mt = (mtRes.data ?? []) as FreightMaterialType[];
        setProvinces(p);
        setMunicipalities(m);
        setMaterialTypes(mt);
        setCompanies((companiesRes.data ?? []) as FreightCompany[]);
        setRates(enrichRates(ratesRes.data ?? [], p, mt, m));
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Erro ao carregar dados");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Empresas ────────────────────────────────────────────────────────────

  const saveCompany = useCallback(
    async (
      company: Partial<FreightCompany> & { id?: string }
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const payload = {
          name: company.name,
          contact_phone: company.contact_phone ?? null,
          contact_email: company.contact_email ?? null,
          logo_url: company.logo_url ?? null,
          notes: company.notes ?? null,
          is_active: company.is_active ?? true,
        };
        if (company.id) {
          const { error } = await supabase
            .from("freight_companies")
            .update(payload)
            .eq("id", company.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("freight_companies")
            .insert(payload);
          if (error) throw error;
        }
        await fetchCompanies();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar empresa");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchCompanies]
  );

  const toggleCompany = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      await supabase
        .from("freight_companies")
        .update({ is_active: isActive })
        .eq("id", id);
      await fetchCompanies();
    },
    [fetchCompanies]
  );

  const deleteCompany = useCallback(
    async (id: string): Promise<void> => {
      // Apaga primeiro os tarifários da empresa (evita erro de FK)
      await supabase.from("freight_company_rates").delete().eq("company_id", id);
      await supabase.from("freight_companies").delete().eq("id", id);
      await fetchCompanies();
      await fetchRates();
    },
    [fetchCompanies, fetchRates]
  );

  // ── Tarifários ──────────────────────────────────────────────────────────

  const saveRate = useCallback(
    async (
      rate: Partial<FreightCompanyRate> & { id?: string; company_id: string }
    ): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const payload = {
          company_id: rate.company_id,
          origin_province_id: rate.origin_province_id,
          dest_province_id: rate.dest_province_id,
          origin_municipality_id: rate.origin_municipality_id ?? null,
          dest_municipality_id: rate.dest_municipality_id ?? null,
          material_type_id: rate.material_type_id ?? null,
          min_weight_kg: rate.min_weight_kg ?? 0,
          max_weight_kg: rate.max_weight_kg ?? null,
          price_kwz: rate.price_kwz,
          days_min: rate.days_min ?? 2,
          days_max: rate.days_max ?? 5,
          is_active: rate.is_active ?? true,
          notes: rate.notes ?? null,
        };
        if (rate.id) {
          const { error } = await supabase
            .from("freight_company_rates")
            .update(payload)
            .eq("id", rate.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("freight_company_rates")
            .insert(payload);
          if (error) throw error;
        }
        await fetchRates();
        return true;
      } catch (err: any) {
        setError(err.message ?? "Erro ao guardar tarifário");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchRates]
  );

  const toggleRate = useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      await supabase
        .from("freight_company_rates")
        .update({ is_active: isActive })
        .eq("id", id);
      await fetchRates();
    },
    [fetchRates]
  );

  const deleteRate = useCallback(
    async (id: string): Promise<void> => {
      await supabase.from("freight_company_rates").delete().eq("id", id);
      await fetchRates();
    },
    [fetchRates]
  );

  const getRatesByCompany = useCallback(
    (companyId: string) => rates.filter((r) => r.company_id === companyId),
    [rates]
  );

  return {
    provinces,
    municipalities,
    materialTypes,
    companies,
    rates,
    loading,
    saving,
    error,
    fetchCompanies,
    fetchRates,
    saveCompany,
    toggleCompany,
    deleteCompany,
    saveRate,
    toggleRate,
    deleteRate,
    getRatesByCompany,
  };
}

// ─── useFreightCompanyOptions (checkout — o comprador escolhe) ───────────────

export function useFreightCompanyOptions(
  originProvinceId: number | null,
  destProvinceId: number | null,
  weightKg: number = 0,
  materialTypeId: number | null = null
) {
  const [options, setOptions] = useState<FreightCompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!originProvinceId || !destProvinceId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc(
          "get_freight_company_options",
          {
            p_origin_province_id: originProvinceId,
            p_dest_province_id: destProvinceId,
            p_weight_kg: weightKg,
            p_material_type_id: materialTypeId,
          }
        );
        if (error) throw error;
        if (!cancelled) setOptions((data as FreightCompanyOption[]) ?? []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Erro ao carregar opções de frete");
          setOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [originProvinceId, destProvinceId, weightKg, materialTypeId]);

  return { options, loading, error };
}
