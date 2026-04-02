import { Search, Menu, ShoppingCart, User, MapPin, X, ChevronRight, Gavel, Radio, Store, Users, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = [
  { name: "Electrónicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop" },
  { name: "Veículos", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop" },
  { name: "Imóveis", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop" },
  { name: "Moda", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&h=100&fit=crop" },
  { name: "Casa & Jardim", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop" },
  { name: "Desporto", image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=100&h=100&fit=crop" },
  { name: "Bebé & Criança", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop" },
  { name: "Saúde & Beleza", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100&h=100&fit=crop" },
  { name: "Informática", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop" },
  { name: "Gaming", image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=100&h=100&fit=crop" },
  { name: "Jóias & Relógios", image: "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=100&h=100&fit=crop" },
  { name: "Alimentação", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=100&h=100&fit=crop" },
  { name: "Educação", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=100&h=100&fit=crop" },
  { name: "Animais", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100&h=100&fit=crop" },
];

const quickLinks = [
  { label: "Leilão", path: "/leilao", icon: Gavel, color: "text-walmart-orange" },
  { label: "Live", path: "/live", icon: Radio, color: "text-destructive" },
  { label: "Promoções", path: "/promocoes", icon: Zap, color: "text-walmart-orange" },
  { label: "Empresas", path: "/empresas", icon: Store, color: "text-primary" },
  { label: "Vendedores", path: "/vendedores", icon: Users, color: "text-accent" },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-primary">
        <div className="container mx-auto px-3">
          <div className="flex items-center gap-2.5 h-14">
            <button className="text-primary-foreground flex-shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="w-6 h-6" />
            </button>

            <a href="/" className="flex items-center gap-1 flex-shrink-0">
              <span className="text-secondary text-2xl font-black">✻</span>
              <span className="text-lg font-black text-primary-foreground tracking-tight hidden sm:block">Kwanza</span>
            </a>

            <div className="flex-1 min-w-0">
              <form onSubmit={handleSearch} className="relative flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar Kwanza Market"
                  className="w-full py-2 pl-3 pr-10 rounded-l-full bg-primary-foreground text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <button type="submit" className="px-3.5 bg-secondary rounded-r-full flex items-center justify-center hover:brightness-110 transition flex-shrink-0">
                  <Search className="w-5 h-5 text-secondary-foreground" />
                </button>
              </form>
            </div>

            <button className="text-primary-foreground relative flex-shrink-0">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-bold flex items-center justify-center">0</span>
            </button>
          </div>

          <div className="flex items-center gap-2 h-8 text-primary-foreground/90">
            <MapPin className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-xs">Retirada ou entrega?</span>
            <span className="text-xs font-bold text-primary-foreground ml-auto">Luanda, Angola</span>
          </div>

          <div className="flex items-center gap-2 h-10 overflow-x-auto scrollbar-hide pb-1.5">
            <button className="flex-shrink-0 w-8 h-8 rounded-card bg-primary-foreground/10 flex items-center justify-center" onClick={() => setMenuOpen(true)}>
              <span className="text-primary-foreground text-sm">⊞</span>
            </button>
            {[
              { label: "Receba rápido", path: "/categorias" },
              { label: "Promoções", path: "/promocoes" },
              { label: "Frete grátis", path: "/categorias" },
              { label: "Novidades", path: "/categorias" },
              { label: "Electrónicos", path: "/categoria/Electrónicos" },
              { label: "Moda", path: "/categoria/Moda" },
              { label: "Casa", path: "/categoria/Casa & Jardim" },
            ].map(pill => (
              <button key={pill.label} onClick={() => navigate(pill.path)} className="flex-shrink-0 px-3.5 py-1.5 rounded-full border border-primary-foreground/30 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/10 transition whitespace-nowrap">
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Shein-style slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col">
            {/* Menu header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <button onClick={() => { navigate("/auth"); setMenuOpen(false); }} className="flex items-center gap-2">
                <User className="w-6 h-6 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">Olá, faça login</span>
              </button>
              <button onClick={() => setMenuOpen(false)}>
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Quick links */}
            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-5 gap-1">
                {quickLinks.map(link => (
                  <button
                    key={link.label}
                    onClick={() => { navigate(link.path); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-card hover:bg-muted transition-colors"
                  >
                    <link.icon className={`w-5 h-5 ${link.color}`} />
                    <span className="text-[9px] font-semibold text-foreground">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categories with circular images */}
            <div className="flex-1 p-1">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 pt-2">Categorias</h3>
              <div className="space-y-0.5">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => { navigate(`/categoria/${encodeURIComponent(cat.name)}`); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-full object-cover border border-border" />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer links */}
            <div className="border-t border-border p-3 space-y-0.5">
              {[
                { label: "Minha conta", path: "/conta" },
                { label: "Meus pedidos", path: "/pedidos" },
                { label: "Favoritos", path: "/favoritos" },
                { label: "Ajuda", path: "/ajuda" },
                { label: "Vender no Kwanza Market", path: "/vender" },
              ].map(link => (
                <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {link.label}
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
