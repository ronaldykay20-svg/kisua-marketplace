import { Home, Search, Gavel, ShoppingCart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess: hasLeiloesAccess } = useFeatureAccess("leiloes");

  const tabs = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Pesquisar", path: "/pesquisa" },
    ...(hasLeiloesAccess ? [{ icon: Gavel, label: "Leilão", path: "/leilao" }] : []),
    { icon: ShoppingCart, label: "Carrinho", path: "/carrinho" },
    { icon: User, label: "Mim", path: "/conta" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{ backgroundColor: "#F7F0E6", borderColor: "rgba(74,46,10,0.14)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity"
            >
              <tab.icon
                className="w-5 h-5"
                style={{ color: isActive ? "#4A2E0A" : "rgba(74,46,10,0.45)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? "#4A2E0A" : "rgba(74,46,10,0.45)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
