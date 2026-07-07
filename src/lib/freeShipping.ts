// Lógica partilhada de "Frete grátis por município", usada no card da home
// e na página de Checkout. Mantém a redação num só sítio para que o texto
// nunca fique diferente entre os dois lugares.

export type FreeShippingScope =
  | "nenhum"
  | "municipio"
  | "alguns_municipios"
  | "toda_provincia";

export interface FreeShippingProduct {
  free_shipping?: boolean | null;
  free_shipping_scope?: FreeShippingScope | null;
  free_shipping_province_id?: number | null;
  free_shipping_municipality_ids?: number[] | null;
}

export interface MunicipalityLike {
  id: number;
  name: string;
  province_id: number;
}

export interface ProvinceLike {
  id: number;
  name: string;
}

/**
 * Devolve o texto a mostrar no card do produto, ex:
 * "Frete grátis no Cazenga, Luanda"
 * "Frete grátis em alguns municípios de Luanda"
 * "Frete grátis em Luanda"
 * Devolve null se o produto não tiver frete grátis configurado.
 */
export function getFreeShippingLabel(
  product: FreeShippingProduct,
  municipalities: MunicipalityLike[],
  provinces: ProvinceLike[]
): string | null {
  const scope = product.free_shipping_scope;
  if (!scope || scope === "nenhum") return null;

  const province = provinces.find((p) => p.id === product.free_shipping_province_id);
  const provinceName = province?.name ?? "";

  if (scope === "toda_provincia") {
    return provinceName ? `Frete grátis em ${provinceName}` : "Frete grátis";
  }

  const ids = product.free_shipping_municipality_ids ?? [];
  if (scope === "municipio") {
    const mun = municipalities.find((m) => m.id === ids[0]);
    if (!mun) return provinceName ? `Frete grátis em ${provinceName}` : "Frete grátis";
    return provinceName
      ? `Frete grátis no ${mun.name}, ${provinceName}`
      : `Frete grátis no ${mun.name}`;
  }

  if (scope === "alguns_municipios") {
    return provinceName
      ? `Frete grátis em alguns municípios de ${provinceName}`
      : "Frete grátis em alguns municípios";
  }

  return null;
}

/**
 * Verifica se um produto tem frete grátis para um determinado município de
 * entrega (usado no Checkout para decidir se dispensa o custo de envio).
 */
export function isFreeShippingEligible(
  product: FreeShippingProduct,
  destMunicipalityId: number | null,
  municipalities: MunicipalityLike[]
): boolean {
  if (!destMunicipalityId) return false;
  const scope = product.free_shipping_scope;
  if (!scope || scope === "nenhum") return false;

  if (scope === "toda_provincia") {
    const destMun = municipalities.find((m) => m.id === destMunicipalityId);
    return !!destMun && destMun.province_id === product.free_shipping_province_id;
  }

  const ids = product.free_shipping_municipality_ids ?? [];
  if (scope === "municipio" || scope === "alguns_municipios") {
    return ids.includes(destMunicipalityId);
  }

  return false;
}
