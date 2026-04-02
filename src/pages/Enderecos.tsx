import { MapPin, Plus, Edit2, Trash2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  isDefault: boolean;
}

const Enderecos = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "Casa", name: "", phone: "", address: "", city: "" });

  const handleAdd = () => {
    if (!form.name || !form.phone || !form.address || !form.city) {
      toast.error("Preencha todos os campos");
      return;
    }
    const newAddr: Address = {
      id: Date.now().toString(),
      ...form,
      isDefault: addresses.length === 0,
    };
    setAddresses([...addresses, newAddr]);
    setForm({ label: "Casa", name: "", phone: "", address: "", city: "" });
    setShowForm(false);
    toast.success("Endereço adicionado");
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
    toast.success("Endereço removido");
  };

  const setDefault = (id: string) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
    toast.success("Endereço padrão atualizado");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">Meus Endereços</h1>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {showForm && (
          <div className="bg-card rounded-lg border border-border p-4 mb-4 space-y-3">
            <div className="flex gap-2">
              {["Casa", "Trabalho", "Outro"].map(l => (
                <button key={l} onClick={() => setForm({ ...form, label: l })}
                  className={`px-3 py-1 text-xs rounded-full border ${form.label === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Telefone" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço completo" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Cidade / Província" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg">Guardar</button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border text-sm rounded-lg text-muted-foreground">Cancelar</button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum endereço guardado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Adicione um endereço de entrega</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(a => (
              <div key={a.id} className={`bg-card rounded-lg border p-4 ${a.isDefault ? "border-primary" : "border-border"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded">{a.label}</span>
                    {a.isDefault && <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 rounded">Padrão</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.phone}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.address}, {a.city}</p>
                {!a.isDefault && (
                  <button onClick={() => setDefault(a.id)} className="mt-2 text-xs text-primary font-medium">Definir como padrão</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Enderecos;
