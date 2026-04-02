import { Bell, ChevronLeft, Package, Tag, Megaphone, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const categories = [
  { key: "pedidos", icon: Package, label: "Pedidos", desc: "Atualizações de encomendas e entregas" },
  { key: "promocoes", icon: Tag, label: "Promoções", desc: "Ofertas especiais e descontos" },
  { key: "sistema", icon: ShieldCheck, label: "Sistema", desc: "Segurança e atualizações da conta" },
  { key: "marketing", icon: Megaphone, label: "Marketing", desc: "Novidades e lançamentos" },
];

const Notificacoes = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    pedidos: true, promocoes: true, sistema: true, marketing: false,
  });

  const toggle = (key: string) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    toast.success("Preferência atualizada");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notificações
        </h1>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {categories.map(c => (
            <div key={c.key} className="flex items-center gap-3 px-4 py-3">
              <c.icon className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-[10px] text-muted-foreground">{c.desc}</p>
              </div>
              <button onClick={() => toggle(c.key)}
                className={`w-10 h-6 rounded-full transition-colors relative ${prefs[c.key] ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[c.key] ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Notificacoes;
