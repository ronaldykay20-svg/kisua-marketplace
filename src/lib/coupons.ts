import { supabase } from "@/integrations/supabase/client";

export type CouponScope = "platform" | "seller" | "company" | "dropship_store";
export type DiscountType = "percent" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  title: string | null;
  discount_type: DiscountType;
  discount_value: number;
  scope: CouponScope;
  owner_id: string | null;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number;
  times_used: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  show_in_welcome_popup: boolean;
  created_by: string;
  created_at: string;
}

export interface CouponSettings {
  min_seller_percent: number;
  max_seller_percent: number;
}

export interface ValidateCouponResult {
  valid: boolean;
  reason?: string;
  coupon_id?: string;
  code?: string;
  title?: string | null;
  discount_type?: DiscountType;
  discount_value?: number;
  scope?: CouponScope;
  owner_id?: string | null;
  min_purchase_amount?: number;
  max_discount_amount?: number | null;
}

export interface RedeemCouponResult {
  success: boolean;
  reason?: string;
  discount_applied?: number;
  coupon_id?: string;
}

// ─── Configurações globais (teto de % para lojas/vendedores) ────────────────
export async function fetchCouponSettings(): Promise<CouponSettings> {
  const { data, error } = await supabase
    .from("coupon_settings")
    .select("min_seller_percent, max_seller_percent")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as CouponSettings;
}

// ─── Listar cupons de um dono específico (loja/empresa/store) ou da plataforma ─
export async function fetchCoupons(scope: CouponScope, ownerId: string | null): Promise<Coupon[]> {
  let query = (supabase as any).from("coupons").select("*").eq("scope", scope).order("created_at", { ascending: false });
  query = scope === "platform" ? query.is("owner_id", null) : query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Margem real de uma loja de dropship (teto do cupom dela) ──────────────
export interface DropshipMarginCap {
  minMarginPercent: number;
  minMarginAmount: number;
}

export async function fetchDropshipMarginCap(storeId: string): Promise<DropshipMarginCap | null> {
  const { data, error } = await (supabase as any)
    .from("dropship_store_products")
    .select("selling_price, supplier_products(cost_price)")
    .eq("store_id", storeId)
    .eq("is_active", true);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  let minPercent = Infinity;
  let minAmount = Infinity;

  for (const row of data as any[]) {
    const cost = row.supplier_products?.cost_price;
    const sell = row.selling_price;
    if (cost == null || sell == null || sell <= 0) continue;
    const marginAmount = sell - cost;
    const marginPercent = (marginAmount / sell) * 100;
    if (marginPercent < minPercent) minPercent = marginPercent;
    if (marginAmount < minAmount) minAmount = marginAmount;
  }

  if (!isFinite(minPercent) || !isFinite(minAmount)) return null;
  return { minMarginPercent: minPercent, minMarginAmount: minAmount };
}

// ─── Criar cupom ────────────────────────────────────────────────────────────
export interface CreateCouponInput {
  code: string;
  title?: string;
  discount_type: DiscountType;
  discount_value: number;
  scope: CouponScope;
  owner_id: string | null;
  min_purchase_amount?: number;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_user?: number;
  expires_at?: string | null;
  show_in_welcome_popup?: boolean;
}

export function validateCouponRules(
  input: Pick<CreateCouponInput, "discount_type" | "discount_value" | "scope">,
  settings: CouponSettings,
  dropshipCap?: DropshipMarginCap | null
): string | null {
  if (input.discount_type === "percent") {
    if (input.discount_value < 1 || input.discount_value > 100) {
      return "A percentagem tem de estar entre 1 e 100.";
    }
    if (input.scope !== "platform") {
      if (input.discount_value < settings.min_seller_percent || input.discount_value > settings.max_seller_percent) {
        return `Para lojas/vendedores/empresas, o desconto deve estar entre ${settings.min_seller_percent}% e ${settings.max_seller_percent}%.`;
      }
    }
    if (input.scope === "dropship_store") {
      if (!dropshipCap) {
        return "Ainda não tens produtos activos na loja para calcular a margem máxima do cupom.";
      }
      if (input.discount_value > dropshipCap.minMarginPercent) {
        return `O desconto não pode exceder a tua margem mais baixa (${dropshipCap.minMarginPercent.toFixed(1)}%). Reduz o valor ou ajusta o preço do produto com menor margem.`;
      }
    }
  } else {
    if (input.discount_value <= 0) {
      return "O valor fixo tem de ser maior que zero.";
    }
    if (input.scope === "dropship_store") {
      if (!dropshipCap) {
        return "Ainda não tens produtos activos na loja para calcular a margem máxima do cupom.";
      }
      if (input.discount_value > dropshipCap.minMarginAmount) {
        return `O valor fixo não pode exceder a tua margem mais baixa em Kz (${dropshipCap.minMarginAmount.toLocaleString("pt-AO")} Kz).`;
      }
    }
  }
  return null;
}

export async function createCoupon(input: CreateCouponInput) {
  const { error } = await (supabase as any).from("coupons").insert({
    code: input.code.trim().toUpperCase(),
    title: input.title || null,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    scope: input.scope,
    owner_id: input.owner_id,
    min_purchase_amount: input.min_purchase_amount ?? 0,
    max_discount_amount: input.max_discount_amount ?? null,
    usage_limit: input.usage_limit ?? null,
    usage_limit_per_user: input.usage_limit_per_user ?? 1,
    expires_at: input.expires_at ?? null,
    show_in_welcome_popup: input.show_in_welcome_popup ?? false,
  });
  if (error) throw error;
}

export async function toggleCouponActive(id: string, active: boolean) {
  const { error } = await (supabase as any).from("coupons").update({ is_active: active }).eq("id", id);
  if (error) throw error;
}

export async function toggleCouponWelcomePopup(id: string, show: boolean) {
  const { error } = await (supabase as any).from("coupons").update({ show_in_welcome_popup: show }).eq("id", id);
  if (error) throw error;
}

export async function deleteCoupon(id: string) {
  const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
  if (error) throw error;
}

// ─── Validar um código no checkout (RPC segura, não expõe a tabela) ────────
export async function validateCouponCode(code: string): Promise<ValidateCouponResult> {
  const { data, error } = await (supabase as any).rpc("validate_coupon", { p_code: code });
  if (error) throw error;
  return data as ValidateCouponResult;
}

// ─── Cupom Wallet (estilo Shein) ────────────────────────────────────────────
export interface DisplayCoupon {
  id: string;
  title: string | null;
  discount_type: DiscountType;
  discount_value: number;
  scope: CouponScope;
  owner_id: string | null;
  min_purchase_amount: number;
  max_discount_amount: number | null;
  expires_at: string | null;
}

export interface WalletCoupon extends DisplayCoupon {
  wallet_id: string;
  coupon_id: string;
  code: string;
}

export interface CollectCouponResult {
  success: boolean;
  reason?: string;
}

export async function fetchDisplayCoupons(productIds: string[]): Promise<DisplayCoupon[]> {
  if (productIds.length === 0) return [];
  const { data, error } = await (supabase as any).rpc("list_display_coupons", {
    p_product_ids: productIds,
  });
  if (error) throw error;
  return data || [];
}

// Cupons do popup de boas-vindas (novos usuários / campanhas gerais da plataforma)
export async function fetchWelcomeCoupons(): Promise<DisplayCoupon[]> {
  const { data, error } = await (supabase as any).rpc("list_welcome_coupons");
  if (error) throw error;
  return data || [];
}

// IDs de cupons já resgatados pelo utilizador atual em algum momento —
// independentemente de já terem sido usados (is_used) ou não. Usado para
// decidir elegibilidade por conta (não por dispositivo), ex: no popup de boas-vindas.
export async function fetchCollectedCouponIds(): Promise<string[]> {
  const { data, error } = await (supabase as any).rpc("list_collected_coupon_ids");
  if (error) throw error;
  return (data || []).map((row: { coupon_id: string }) => row.coupon_id);
}

export async function collectCoupon(couponId: string): Promise<CollectCouponResult> {
  const { data, error } = await (supabase as any).rpc("collect_coupon", {
    p_coupon_id: couponId,
  });
  if (error) throw error;
  return data as CollectCouponResult;
}

export async function fetchWalletCoupons(): Promise<WalletCoupon[]> {
  const { data, error } = await (supabase as any).rpc("list_wallet_coupons");
  if (error) throw error;
  return data || [];
}

export async function markWalletCouponUsed(couponId: string, orderId: string): Promise<void> {
  const { error } = await (supabase as any).rpc("mark_wallet_coupon_used", {
    p_coupon_id: couponId,
    p_order_id: orderId,
  });
  if (error) throw error;
}

export async function redeemCouponCode(
  code: string,
  eligibleSubtotal: number,
  orderId?: string
): Promise<RedeemCouponResult> {
  const { data, error } = await (supabase as any).rpc("redeem_coupon", {
    p_code: code,
    p_eligible_subtotal: eligibleSubtotal,
    p_order_id: orderId ?? null,
  });
  if (error) throw error;
  return data as RedeemCouponResult;
}
