import { Search, Menu, ShoppingCart, User, MapPin } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-primary shadow-md">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center gap-3 h-14">
          <button className="text-primary-foreground md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu className="w-6 h-6" />
          </button>

          <a href="/" className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xl font-black text-primary-foreground tracking-tight">Kwanza</span>
            <span className="text-xl font-black text-secondary">Market</span>
          </a>

          <div className="hidden md:flex items-center gap-1 text-primary-foreground/80 text-xs ml-4">
            <MapPin className="w-3.5 h-3.5" />
            <span>Entregar em <b className="text-primary-foreground">Luanda</b></span>
          </div>

          <div className="flex-1 mx-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar produtos, marcas e mais..."
                className="w-full py-2.5 pl-4 pr-12 rounded-card bg-primary-foreground text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button className="absolute right-0 top-0 h-full px-3 bg-secondary rounded-r-card flex items-center justify-center hover:brightness-110 transition">
                <Search className="w-5 h-5 text-secondary-foreground" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="text-primary-foreground flex flex-col items-center text-[10px] leading-tight">
              <User className="w-5 h-5" />
              <span className="hidden sm:block">Entrar</span>
            </button>
            <button className="text-primary-foreground flex flex-col items-center text-[10px] leading-tight relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:block">Carrinho</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">0</span>
            </button>
          </div>
        </div>

        {/* Category bar desktop */}
        <div className="hidden md:flex items-center gap-5 h-10 text-xs font-medium text-primary-foreground/85 overflow-x-auto">
          {["Todas Categorias", "Electrónicos", "Veículos", "Imóveis", "Moda", "Casa", "Desporto", "Promoções"].map(c => (
            <a key={c} href="#" className="whitespace-nowrap hover:text-primary-foreground transition-colors">{c}</a>
          ))}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-primary border-t border-primary-foreground/10 px-4 py-3 flex flex-col gap-2 text-sm text-primary-foreground/85">
          {["Todas Categorias", "Electrónicos", "Veículos", "Imóveis", "Moda", "Casa", "Desporto", "Promoções"].map(c => (
            <a key={c} href="#" className="py-1.5 hover:text-primary-foreground">{c}</a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
