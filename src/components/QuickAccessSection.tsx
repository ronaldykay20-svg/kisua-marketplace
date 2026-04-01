import { Gavel, Radio, Store, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const items = [
  { icon: Gavel, label: "Leilão", path: "/leilao", color: "bg-amber-500", textColor: "text-amber-50" },
  { icon: Radio, label: "Live", path: "/live", color: "bg-destructive", textColor: "text-primary-foreground" },
  { icon: Store, label: "Empresas", path: "/empresas", color: "bg-primary", textColor: "text-primary-foreground" },
  { icon: User, label: "Vendedores", path: "/vendedores", color: "bg-emerald-600", textColor: "text-primary-foreground" },
];

const QuickAccessSection = () => {
  const navigate = useNavigate();

  return (
    <section className="container mx-auto px-3 py-3">
      <div className="grid grid-cols-4 gap-2">
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-card bg-card border border-border hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-card ${item.color} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.textColor}`} />
            </div>
            <span className="text-[10px] font-bold text-foreground">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default QuickAccessSection;
