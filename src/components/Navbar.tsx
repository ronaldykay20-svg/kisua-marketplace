import { Search, Menu, ShoppingCart, User, MapPin, X, Car, Home, Smartphone, ShoppingBag, Briefcase, Dumbbell, BookOpen, Utensils, Wrench, Baby, HeartPulse, Monitor, Gamepad2, Gem, Plane, PawPrint } from "lucide-react";
import { useState } from "react";

const categories = [
  { name: "Electrónicos", icon: Smartphone },
  { name: "Veículos", icon: Car },
  { name: "Imóveis", icon: Home },
  { name: "Moda", icon: ShoppingBag },
  { name: "Casa & Jardim", icon: Wrench },
  { name: "Desporto", icon: Dumbbell },
  { name: "Bebé & Criança", icon: Baby },
  { name: "Saúde", icon: HeartPulse },
  { name: "Informática", icon: Monitor },
  { name: "Gaming", icon: Gamepad2 },
  { name: "Jóias & Relógios", icon: Gem },
  { name: "Viagens", icon: Plane },
  { name: "Alimentação", icon: Utensils },
  { name: "Empregos", icon: Briefcase },
  { name: "Educação", icon: BookOpen },
  { name: "Animais", icon: PawPrint },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-primary">
        <div className="container mx-auto px-3">
          {/* Main bar */}
          <div className="flex items-center gap-2.5 h-14">
            <button className="text-primary-foreground flex-shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="w-6 h-6" />
            </button>

            <a href="/" className="flex items-center gap-1 flex-shrink-0">
              <span className="text-secondary text-2xl font-black">✻</span>
              <span className="text-lg font-black text-primary-foreground tracking-tight hidden sm:block">Kwanza</span>
            </a>

            <div className="flex-1 min-w-0">
              <div className="relative flex">
                <input
                  type="text"
                  placeholder="Pesquisar Kwanza Market"
                  className="w-full py-2 pl-3 pr-10 rounded-l-full bg-primary-foreground text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button className="px-3.5 bg-secondary rounded-r-full flex items-center justify-center hover:brightness-110 transition flex-shrink-0">
                  <Search className="w-5 h-5 text-secondary-foreground" />
                </button>
              </div>
            </div>

            <button className="text-primary-foreground relative flex-shrink-0">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">0</span>
            </button>
          </div>

          {/* Delivery bar */}
          <div className="flex items-center gap-2 h-8 text-primary-foreground/90">
            <MapPin className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-xs">Retirada ou entrega?</span>
            <span className="text-xs font-bold text-primary-foreground ml-auto">Luanda, Angola</span>
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-2 h-10 overflow-x-auto scrollbar-hide pb-1.5">
            <button className="flex-shrink-0 w-8 h-8 rounded-card bg-primary-foreground/10 flex items-center justify-center" onClick={() => setMenuOpen(true)}>
              <span className="text-primary-foreground text-sm">⊞</span>
            </button>
            {["Receba rápido", "Promoções", "Frete grátis", "Novidades", "Electrónicos", "Moda", "Casa"].map(pill => (
              <button key={pill} className="flex-shrink-0 px-3.5 py-1.5 rounded-full border border-primary-foreground/30 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/10 transition whitespace-nowrap">
                {pill}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Slide-in category menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* Menu header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-6 h-6 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">Olá, faça login</span>
              </div>
              <button onClick={() => setMenuOpen(false)}>
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Categories */}
            <div className="p-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Categorias</h3>
              <div className="space-y-0.5">
                {categories.map(cat => (
                  <button key={cat.name} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-card hover:bg-muted transition-colors text-left">
                    <cat.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu footer links */}
            <div className="border-t border-border p-3 space-y-0.5">
              {["Minha conta", "Meus pedidos", "Favoritos", "Ajuda", "Vender no Kwanza Market"].map(link => (
                <button key={link} className="w-full text-left px-3 py-2.5 rounded-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
