import { useState } from "react";
import { Ticket, Plus, Trash2, Eye, EyeOff, X, Copy, AlertTriangle, Gift } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Coupon,
  CouponScope,
  fetchCoupons,
  fetchCouponSettings,
  fetchDropshipMarginCap,
  createCoupon,
  toggleCouponActive,
  toggleCouponWelcomePopup,
  deleteCoupon,
  validateCouponRules,
  DiscountType,
} from "@/lib/coupons";

interface CouponManagerTabProps {
  scope: CouponScope;
  ownerId: string | null;
  heading?: string;
}

const emptyForm = {
  code: "",
  title: "",
  discount_type: "percent" as DiscountType,
  discount_value: "",
  min_purchase_amount: "",
  max_discount_amount: "",
  usage_limit: "",
  usage_limit_per_user: "1",
  expires_at: "",
  show_in_welcome_popup: false,
};

const CouponManagerTab = ({ scope, ownerId, heading }: CouponManagerTabProps) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: settings } = useQuery({
    queryKey: ["coupon_settings"],
    queryFn: fetchCouponSettings,
  });

  const { data: dropshipCap, isLoading: loadingCap } = useQuery({
    queryKey: ["dropship_margin_cap", ownerId],
    queryFn: () => fetchDropshipMarginCap(ownerId!),
    enabled: scope === "dropship_store" && !!ownerId,
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", scope, ownerId],
    queryFn: () => fetchCoupons(scope, ownerId),
    enabled: scope === "platform" || !!ownerId,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.code.trim()) throw new Error("Indica um código para o cupom");
      if (!form.discount_value || Number(form.discount_value) <= 0) throw new Error("Indica um valor de desconto válido");

      const ruleError = settings
        ? validateCouponRules(
            { discount_type: form.discount_type, discount_value: Number(form.discount_value), scope },
            settings,
            dropshipCap
          )
        : null;
      if (ruleError) throw new Error(ruleError);

      await createCoupon({
        code: form.code,
        title: form.title || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        scope,
        owner_id: scope === "platform" ? null : ownerId,
        min_purchase_amount: form.min_purchase_amount ? Number(form.min_purchase_amount) : 0,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        usage_limit_per_user: form.usage_limit_per_user ? Number(form.usage_limit_per_user) : 1,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        show_in_welcome_popup: scope === "platform" ? form.show_in_welcome_popup : false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", scope, ownerId] });
      toast.success("Cupom criado!");
      setForm(emptyForm);
      setShowForm(false);
    },
    onError: (e: any) => {
      toast.error(e.message?.includes("duplicate") || e.code === "23505" ? "Já existe um cupom com este código" : e.message);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleCouponActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", scope, ownerId] });
      toast.success("Estado alterado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePopup = useMutation({
    mutationFn: ({ id, show }: { id: string; show: boolean }) => toggleCouponWelcomePopup(id, show),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", scope, ownerId] });
      toast.success("Popup de boas-vindas actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons", scope, ownerId] });
      toast.success("Cupom removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código "${code}" copiado`);
  };

  const isExpired = (c: Coupon) => c.expires_at && new Date(c.expires_at) < new Date();

  const isDropship = scope === "dropship_store";

  const percentHint = isDropship
    ? dropshipCap
      ? `até ${dropshipCap.minMarginPercent.toFixed(1)}%`
      : "sem produtos activos"
    : scope !== "platform" && settings
    ? `${settings.min_seller_percent}% – ${settings.max_seller_percent}%`
    : "1% – 100%";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" /> {heading || "Cupons"}
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Novo cupom
          </button>
        )}
      </div>

      {scope === "platform" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-[11px] text-foreground">
          Cupons de plataforma não têm teto fixo de percentagem — usa isto para campanhas de lançamento.
          Acima de 50% aparece um aviso, mas podes confirmar.
        </div>
      )}

      {isDropship && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-foreground flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            {loadingCap ? (
              <span>A calcular a tua margem...</span>
            ) : dropshipCap ? (
              <span>
                O teu desconto máximo é calculado a partir do produto com <strong>menor margem</strong> na tua loja:
                até <strong>{dropshipCap.minMarginPercent.toFixed(1)}%</strong> (ou até{" "}
                <strong>{dropshipCap.minMarginAmount.toLocaleString("pt-AO")} Kz</strong> em valor fixo). Isto garante que
                nunca vendes abaixo do preço de custo do fornecedor.
              </span>
            ) : (
              <span>Ainda não tens produtos activos na loja — adiciona produtos antes de criar um cupom.</span>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Novo cupom</h3>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Código *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Ex: ZANGU10"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Nome interno (opcional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Campanha de lançamento Julho"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Tipo</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
              >
                <option value="percent">Percentagem (%)</option>
                <option value="fixed">Valor fixo (Kz)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Valor <span className="text-muted-foreground font-normal">({percentHint})</span>
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                placeholder={form.discount_type === "percent" ? "Ex: 15" : "Ex: 2000"}
                disabled={isDropship && !dropshipCap}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Compra mínima (Kz)</label>
              <input
                type="number"
                value={form.min_purchase_amount}
                onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Desconto máximo (Kz, opcional)</label>
              <input
                type="number"
                value={form.max_discount_amount}
                onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                placeholder="Sem limite"
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Limite total de usos</label>
              <input
                type="number"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                placeholder="Sem limite"
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">Usos por cliente</label>
              <input
                type="number"
                value={form.usage_limit_per_user}
                onChange={(e) => setForm({ ...form, usage_limit_per_user: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">Expira em (opcional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
            />
          </div>

          {scope === "platform" && (
            <label className="flex items-center gap-2 text-[12px] font-semibold text-foreground bg-muted/50 rounded-xl p-3">
              <input
                type="checkbox"
                checked={form.show_in_welcome_popup}
                onChange={(e) => setForm({ ...form, show_in_welcome_popup: e.target.checked })}
                className="w-4 h-4"
              />
              <Gift className="w-3.5 h-3.5 text-primary" />
              Mostrar no popup de boas-vindas (novos utilizadores)
            </label>
          )}

          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || (isDropship && !dropshipCap)}
            className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-50"
          >
            {create.isPending ? "A criar..." : "Criar cupom"}
          </button>
        </div>
      )}

      {isLoading && <p className="text-xs text-muted-foreground text-center py-4">A carregar...</p>}

      {!isLoading && coupons.length === 0 && (
        <div className="text-center py-8">
          <Ticket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>
        </div>
      )}

      <div className="space-y-2">
        {coupons.map((c) => {
          const expired = isExpired(c);
          const exhausted = c.usage_limit != null && c.times_used >= c.usage_limit;
          const inactive = !c.is_active || expired || exhausted;
          return (
            <div key={c.id} className={`bg-card rounded-xl border border-border p-3 ${inactive ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => copyCode(c.code)}
                  className="flex items-center gap-1.5 font-mono font-bold text-sm text-foreground"
                >
                  {c.code} <Copy className="w-3 h-3 text-muted-foreground" />
                </button>
                <div className="flex gap-1">
                  {scope === "platform" && (
                    <button
                      onClick={() => togglePopup.mutate({ id: c.id, show: !c.show_in_welcome_popup })}
                      title="Mostrar no popup de boas-vindas"
                      className={`p-1.5 rounded-lg ${c.show_in_welcome_popup ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted"}`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggle.mutate({ id: c.id, active: !c.is_active })}
                    className={`p-1.5 rounded-lg ${c.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}
                  >
                    {c.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => remove.mutate(c.id)}
                    className="p-1.5 rounded-lg text-destructive bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {c.title && <p className="text-xs text-muted-foreground mb-1">{c.title}</p>}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span className="font-bold text-primary">
                  {c.discount_type === "percent" ? `-${c.discount_value}%` : `-${Number(c.discount_value).toLocaleString("pt-AO")} Kz`}
                </span>
                {c.min_purchase_amount > 0 && <span>• min. {Number(c.min_purchase_amount).toLocaleString("pt-AO")} Kz</span>}
                {c.usage_limit != null && <span>• {c.times_used}/{c.usage_limit} usados</span>}
                {c.expires_at && <span>• expira {new Date(c.expires_at).toLocaleDateString("pt-AO")}</span>}
                {c.show_in_welcome_popup && <span className="text-amber-500 font-bold">• No popup de boas-vindas</span>}
                {expired && <span className="text-destructive font-bold">Expirado</span>}
                {exhausted && !expired && <span className="text-destructive font-bold">Esgotado</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CouponManagerTab;
