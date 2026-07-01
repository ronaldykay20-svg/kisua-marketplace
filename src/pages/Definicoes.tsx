import { Settings, ChevronLeft, Globe, Moon, Sun, Palette, Banknote, ShieldCheck, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

const Definicoes = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("pt");
  const [darkMode, setDarkMode] = useState(false);
  const { hasRole } = useUserRole();

  // Atalho de gestão visível apenas para Admin e Moderador
  const canManagePayments = hasRole("admin") || hasRole("moderator");

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
    toast.success(darkMode ? "Modo claro ativado" : "Modo escuro ativado");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Definições
        </h1>
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Globe className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Idioma</p>
              <p className="text-[10px] text-muted-foreground">Escolha o idioma da aplicação</p>
            </div>
            <select value={language} onChange={e => { setLanguage(e.target.value); toast.success("Idioma atualizado"); }}
              className="px-2 py-1 text-xs bg-background border border-border rounded-lg text-foreground">
              <option value="pt">Português</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Modo escuro</p>
              <p className="text-[10px] text-muted-foreground">Alternar entre claro e escuro</p>
            </div>
            <button onClick={toggleDark}
              className={`w-10 h-6 rounded-full transition-colors relative ${darkMode ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Atalho de gestão — só visível para Admin/Moderador, nunca para clientes comuns */}
        {canManagePayments && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">Gestão</p>
            <button
              onClick={() => navigate("/admin/contas-pagamento")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border text-left"
            >
              <Banknote className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Contas de Pagamento</p>
                <p className="text-[10px] text-muted-foreground">Gerir contas bancárias e Multicaixa Express</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => navigate("/admin/pedidos-completos")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border text-left mt-2"
            >
              <Truck className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Pedidos Completos</p>
                <p className="text-[10px] text-muted-foreground">Acompanhar todos os pedidos e a rota de cada produto</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted-foreground">Kwanza Store v1.0.0</p>
        </div>
      </div>
    </div>
  );
};
export default Definicoes;
