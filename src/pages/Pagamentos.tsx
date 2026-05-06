import { CreditCard, Plus, Trash2, ChevronLeft, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

interface PayMethod {
  id: string;
  type: "multicaixa" | "unitel" | "visa";
  label: string;
  number: string;
  isDefault: boolean;
}

const Pagamentos = () => {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "multicaixa" as PayMethod["type"], number: "" });

  const typeLabels: Record<string, string> = { multicaixa: "Multicaixa Express", unitel: "Unitel Money", visa: "Cartão Visa" };

  const handleAdd = () => {
    if (!form.number) { toast.error("Insira o número"); return; }
    const m: PayMethod = {
      id: Date.now().toString(),
      type: form.type,
      label: typeLabels[form.type],
      number: form.number,
      isDefault: methods.length === 0,
    };
    setMethods([...methods, m]);
    setForm({ type: "multicaixa", number: "" });
    setShowForm(false);
    toast.success("Método adicionado");
  };

  const handleDelete = (id: string) => {
    setMethods(methods.filter(m => m.id !== id));
    toast.success("Método removido");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">Pagamentos</h1>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
            <div className="flex gap-2">
              {(["multicaixa", "unitel", "visa"] as const).map(t => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 text-xs rounded-lg border text-center ${form.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
            <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder={form.type === "visa" ? "Número do cartão" : "Número de telefone"} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg">Guardar</button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border text-sm rounded-lg text-muted-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {methods.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum método de pagamento</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Adicione Multicaixa, Unitel Money ou Visa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map(m => (
              <div key={m.id} className={`bg-card rounded-lg border p-4 flex items-center gap-3 ${m.isDefault ? "border-primary" : "border-border"}`}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {m.type === "visa" ? <CreditCard className="w-5 h-5 text-primary" /> : <Smartphone className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.type === "visa" ? `****${m.number.slice(-4)}` : m.number}</p>
                </div>
                {m.isDefault && <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 rounded">Padrão</span>}
                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagamentos;
