import { User, Package, Heart, HelpCircle, ChevronRight, Settings, MapPin, CreditCard, Bell, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const menuItems = [
  { icon: Package, label: "Meus Pedidos", desc: "Acompanhe as suas encomendas", path: "/pedidos" },
  { icon: Heart, label: "Favoritos", desc: "Produtos que guardou", path: "/favoritos" },
  { icon: MapPin, label: "Endereços", desc: "Gerir endereços de entrega", path: "#" },
  { icon: CreditCard, label: "Pagamentos", desc: "Métodos de pagamento", path: "#" },
  { icon: Bell, label: "Notificações", desc: "Preferências de alertas", path: "#" },
  { icon: Shield, label: "Segurança", desc: "Palavra-passe e privacidade", path: "#" },
  { icon: HelpCircle, label: "Ajuda", desc: "Centro de ajuda e suporte", path: "/ajuda" },
  { icon: Settings, label: "Definições", desc: "Configurações da conta", path: "#" },
];

const MinhaConta = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-lg">
        {/* Profile header */}
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-foreground">Olá, visitante</h2>
            <p className="text-xs text-muted-foreground">Faça login para ver a sua conta</p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg">Entrar</button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[{ n: "0", l: "Pedidos" }, { n: "0", l: "Favoritos" }, { n: "0", l: "Cupões" }].map(s => (
            <div key={s.l} className="bg-card rounded-lg border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{s.n}</p>
              <p className="text-[10px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Menu list */}
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {menuItems.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition">
              <item.icon className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
      <BottomNav />
    </div>
  );
};

export default MinhaConta;
