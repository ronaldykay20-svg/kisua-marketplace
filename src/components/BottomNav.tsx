import { Home, Search, Gavel, ShoppingCart, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAccess: hasLeiloesAccess } = useFeatureAccess("leiloes");
  const { user } = useAuth();

  const { data: cartCount = 0 } = useQuery({
    queryKey: ["cart_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const tabs = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Pesquisar", path: "/pesquisa" },
    ...(hasLeiloesAccess ? [{ icon: Gavel, label: "Leilão", path: "/leilao" }] : []),
    { icon: ShoppingCart, label: "Carrinho", path: "/carrinho", badge: cartCount },
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
              className="relative flex flex-col items-center gap-0.5 py-1 px-3 transition-opacity"
            >
              <tab.icon
                className="w-5 h-5"
                style={{ color: isActive ? "#4A2E0A" : "rgba(74,46,10,0.45)" }}
              />
              {tab.badge > 0 && (
                <span
                  className="absolute -top-0.5 left-1/2 translate-x-1 min-w-[16px] h-4 rounded-full text-white text-[8px] font-black flex items-center justify-center px-0.5"
                  style={{ background: "#E53935" }}
                >
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
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
