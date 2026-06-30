import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Banknote, Plus, Trash2, CheckCircle, XCircle, Building2, Smartphone, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AccountType = "bank_transfer" | "multicaixa_express";

const emptyForm = {
  type: "bank_transfer" as AccountType,
  bank_name: "",
  account_holder: "",
  iban: "",
  phone_number: "",
  notes: "",
};

// ─── Formulário de nova conta ──────────────────────────────────────────────────
const AccountForm = ({ onClose }: { onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const isBank = form.type === "bank_transfer";
  const canSubmit = form.account_holder.trim() && (isBank ? form.iban.trim() : form.phone_number.trim());

  const createAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payment_accounts").insert({
        type: form.type,
        bank_name: isBank ? form.bank_name || null : null,
        account_holder: form.account_holder,
        iban: isBank ? form.iban : null,
        phone_number: !isBank ? form.phone_number : null,
        notes: form.notes || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_accounts"] });
      toast.success("Conta adicionada");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-foreground">Nova conta de pagamento</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setForm(f => ({ ...emptyForm, type: "bank_transfer" }))}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
            form.type === "bank_transfer" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" /> Transferência bancária
        </button>
        <button
          onClick={() => setForm(f => ({ ...emptyForm, type: "multicaixa_express" }))}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition ${
            form.type === "multicaixa_express" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          <Smartphone className="w-4 h-4" /> Multicaixa Express
        </button>
      </div>

      <div className="space-y-3">
        {isBank && (
          <input
            placeholder="Nome do banco (ex: BAI, BFA)"
            value={form.bank_name}
            onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
          />
        )}
        <input
          placeholder="Titular da conta"
          value={form.account_holder}
          onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
        />
        {isBank ? (
          <input
            placeholder="IBAN"
            value={form.iban}
            onChange={e => setForm(f => ({ ...f, iban: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
          />
        ) : (
          <input
            placeholder="Número Multicaixa Express"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground"
          />
        )}
        <textarea
          placeholder="Notas para o cliente (opcional) — ex: 'usar o número do pedido como referência'"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground resize-none"
        />
      </div>

      <button
        onClick={() => createAccount.mutate()}
        disabled={!canSubmit || createAccount.isPending}
        className="w-full mt-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {createAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Adicionar conta
      </button>
    </div>
  );
};

// ─── Página principal ───────────────────────────────────────────────────────────
// Acesso restrito: a rota /admin/contas-pagamento já é protegida no App.tsx
// via ProtectedRoute requiredRole="moderator" (admin sempre passa também).
const AdminPaymentAccounts = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["admin_payment_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("type", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("payment_accounts").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_accounts"] });
      toast.success("Estado atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_payment_accounts"] });
      toast.success("Conta removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bankAccounts = accounts.filter((a: any) => a.type === "bank_transfer");
  const mcxAccounts = accounts.filter((a: any) => a.type === "multicaixa_express");

  const renderAccount = (acc: any) => (
    <div key={acc.id} className={`bg-card rounded-xl border border-border p-3 ${!acc.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {acc.type === "bank_transfer" ? (
            <>
              {acc.bank_name && <p className="text-xs text-muted-foreground">Banco: <span className="font-semibold text-foreground">{acc.bank_name}</span></p>}
              <p className="text-xs text-muted-foreground">Titular: <span className="font-semibold text-foreground">{acc.account_holder}</span></p>
              {acc.iban && <p className="text-xs text-muted-foreground">IBAN: <span className="font-semibold text-foreground">{acc.iban}</span></p>}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Titular: <span className="font-semibold text-foreground">{acc.account_holder}</span></p>
              {acc.phone_number && <p className="text-xs text-muted-foreground">Número: <span className="font-semibold text-foreground">{acc.phone_number}</span></p>}
            </>
          )}
          {acc.notes && <p className="text-[11px] text-muted-foreground italic mt-1">{acc.notes}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => toggleActive.mutate({ id: acc.id, active: !acc.is_active })}
            className={`p-1.5 rounded-lg ${acc.is_active ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}
            title={acc.is_active ? "Ativa — clique para desativar" : "Inativa — clique para ativar"}
          >
            {acc.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (confirm("Remover esta conta? Isto não pode ser desfeito.")) deleteAccount.mutate(acc.id);
            }}
            className="p-1.5 rounded-lg text-destructive bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" /> Contas de Pagamento
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Estas contas são mostradas aos clientes no Checkout quando escolhem Transferência bancária ou Multicaixa Express. Apenas Admin e Moderadores têm acesso a esta página.
        </p>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full mb-4 py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova conta
          </button>
        )}

        {showForm && <AccountForm onClose={() => setShowForm(false)} />}

        {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}

        {!isLoading && accounts.length === 0 && (
          <div className="text-center py-10">
            <Banknote className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">Nenhuma conta configurada</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione pelo menos uma conta para que os clientes possam pagar por transferência.</p>
          </div>
        )}

        {bankAccounts.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Transferência bancária
            </h2>
            <div className="space-y-2">{bankAccounts.map(renderAccount)}</div>
          </div>
        )}

        {mcxAccounts.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Multicaixa Express
            </h2>
            <div className="space-y-2">{mcxAccounts.map(renderAccount)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentAccounts;
