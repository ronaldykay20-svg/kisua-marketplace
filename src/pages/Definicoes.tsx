import { Settings, ChevronLeft, Globe, Moon, Sun, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const Definicoes = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("pt");
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
    toast.success(darkMode ? "Modo claro ativado" : "Modo escuro ativado");
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
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

        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted-foreground">Kwanza Store v1.0.0</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Definicoes;
