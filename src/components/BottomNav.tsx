import { Home, Search, Gavel, ShoppingCart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Pesquisar", path: "/pesquisa" },
  { icon: Gavel, label: "Leilão", path: "/leilao" },
  { icon: ShoppingCart, label: "Carrinho", path: "/carrinho" },
  { icon: User, label: "Mim", path: "/conta" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path || (tab.path === "/" && location.pathname === "/");
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
