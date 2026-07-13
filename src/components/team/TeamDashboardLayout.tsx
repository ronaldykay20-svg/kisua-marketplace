import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface SubTabDef {
  key: string;
  label: string;
  icon: any;
}

interface Props {
  // Identidade visual própria de cada painel — é isto que os torna
  // "totalmente diferentes", não só um filtro de abas dentro do mesmo UI.
  roleLabel: string;
  roleIcon: any;
  accent: string;      // cor principal (hex)
  accentBg: string;    // fundo suave (hex)
  gradient: string;     // gradiente do cabeçalho
  subTabs: SubTabDef[];
  activeSubTab: string;
  onSubTabChange: (key: string) => void;
  children: ReactNode;
}

const TeamDashboardLayout = ({ roleLabel, roleIcon: RoleIcon, accent, accentBg, gradient, subTabs, activeSubTab, onSubTabChange, children }: Props) => {
  const { signOut, userDisplayName } = useAuth();
  const { hasDualRole, roles } = useUserRole();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Cabeçalho com identidade própria — cor e ícone mudam por cargo */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-5" style={{ background: gradient }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar à loja
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-white/80 text-xs font-bold">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
            <RoleIcon className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide">Painel de {roleLabel}</p>
            <p className="text-lg font-black text-white leading-tight">Olá, {userDisplayName || "equipa"}</p>
          </div>
        </div>
        {hasDualRole && (
          <p className="text-[10px] text-white/70 mt-2">
            Também tens acesso a: {roles.filter(r => r !== "admin" && r !== roleLabel.toLowerCase()).join(", ")}
          </p>
        )}
      </div>

      {/* Sub-navegação própria deste painel */}
      {subTabs.length > 1 && (
        <div className="px-4 -mt-2 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 bg-card rounded-2xl p-1.5 border border-border shadow-sm">
            {subTabs.map(t => (
              <button
                key={t.key}
                onClick={() => onSubTabChange(t.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0"
                style={activeSubTab === t.key ? { background: accentBg, color: accent } : { color: "#94a3b8" }}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">{children}</div>
    </div>
  );
};

export default TeamDashboardLayout;
