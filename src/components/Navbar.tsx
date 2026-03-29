import { Plus, Heart, User, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-heading font-bold text-primary-foreground text-lg"
              style={{ background: 'var(--hero-gradient)' }}>
              K
            </div>
            <span className="font-heading font-bold text-xl text-foreground hidden sm:block">
              Kwanza<span className="text-primary">Market</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Categorias</a>
            <a href="#" className="hover:text-foreground transition-colors">Promoções</a>
            <a href="#" className="hover:text-foreground transition-colors">Lojas</a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground transition-all hover:scale-105"
            style={{ background: 'var(--hero-gradient)' }}>
            <Plus className="w-4 h-4" /> Vender
          </button>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
            <Heart className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
            <User className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 flex flex-col gap-3 text-sm font-medium text-muted-foreground">
          <a href="#" className="hover:text-foreground">Categorias</a>
          <a href="#" className="hover:text-foreground">Promoções</a>
          <a href="#" className="hover:text-foreground">Lojas</a>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground w-fit"
            style={{ background: 'var(--hero-gradient)' }}>
            <Plus className="w-4 h-4" /> Vender
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
