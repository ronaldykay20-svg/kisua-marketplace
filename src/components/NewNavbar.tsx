import { Search, ShoppingCart, User, Bell, Menu, X, ChevronRight, Gavel, Radio, Store, Users, Zap, LogOut, Heart } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useCategories } from "@/hooks/useSupabaseData";
import { useCart } from "@/hooks/useSupabaseData";

const quickLinks = [
  { label: "Leilão", path: "/leilao", icon: Gavel, color: "text-walmart-orange" },
  { label: "Live", path: "/live", icon: Radio, color: "text-destructive" },
  { label: "Promoções", path: "/promocoes", icon: Zap, color: "text-walmart-orange" },
  { label: "Empresas", path: "/empresas", icon: Store, color: "text-primary" },
  { label: "Vendedores", path: "/vendedores", icon: Users, color: "text-accent" },
];

const NewNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const { data: categories = [] } = useCategories();
  const { data: cartItems = [] } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-primary shadow-md">
        {/* Top row: logo + search + icons */}
        <div className="container mx-auto px-3">
          <div className="flex items-center gap-3 h-14">
            <button className="text-primary-foreground md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="w-5 h-5" />
            </button>

            <a href="/" className="flex items-center gap-1.5 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-6 object-contain" />
              ) : (
                <>
                  <span className="text-secondary text-xl font-black">✻</span>
                  <span className="text-base font-black text-primary-foreground tracking-tight hidden sm:block">Kwanza</span>
                </>
              )}
            </a>

            <form onSubmit={handleSearch} className="flex-1 min-w-0 flex">
              <div className="relative flex w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar produtos, lojas..."
                  className="w-full py-1.5 pl-3 pr-3 rounded-l-full bg-primary-foreground text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary"
                />
                <button type="submit" className="px-3 bg-secondary rounded-r-full flex items-center justify-center hover:brightness-110 transition flex-shrink-0">
                  <Search className="w-4 h-4 text-secondary-foreground" />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1">
              <button onClick={() => navigate("/favoritos")} className="p-1.5 text-primary-foreground hover:bg-primary-foreground/10 rounded-full transition hidden sm:flex">
                <Heart className="w-5 h-5" />
              </button>
              <button onClick={() => navigate("/notificacoes")} className="p-1.5 text-primary-foreground hover:bg-primary-foreground/10 rounded-full transition hidden sm:flex">
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={() => navigate("/carrinho")} className="p-1.5 text-primary-foreground relative hover:bg-primary-foreground/10 rounded-full transition">
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[8px] font-bold flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => user ? navigate("/conta") : navigate("/auth")}
                className="p-1.5 text-primary-foreground hover:bg-primary-foreground/10 rounded-full transition hidden sm:flex"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Categories bar - visible on md+ */}
      <CategoriesBar categories={categories} />

      {/* Slide-in mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col">
            <div className="bg-primary p-4 flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-secondary-foreground text-sm font-bold">{userDisplayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-primary-foreground">Olá, {userDisplayName}</span>
                    <p className="text-[10px] text-primary-foreground/70">{user.email}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => { navigate("/auth"); setMenuOpen(false); }} className="flex items-center gap-2">
                  <User className="w-6 h-6 text-primary-foreground" />
                  <span className="text-sm font-bold text-primary-foreground">Olá, faça login</span>
                </button>
              )}
              <button onClick={() => setMenuOpen(false)}>
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-5 gap-1">
                {quickLinks.map(link => (
                  <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-card hover:bg-muted transition-colors">
                    <link.icon className={`w-5 h-5 ${link.color}`} />
                    <span className="text-[9px] font-semibold text-foreground">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-1">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 pt-2">Categorias</h3>
              <div className="space-y-0.5">
                {categories.map((cat: any) => (
                  <button key={cat.id} onClick={() => { navigate(`/categoria/${encodeURIComponent(cat.name)}`); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

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
              {user && (
                <button onClick={async () => { await signOut(); setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-3 py-2.5 rounded-card text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair da conta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const CategoriesBar = ({ categories }: { categories: any[] }) => {
  const navigate = useNavigate();

  if (categories.length === 0) return null;

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5">
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              {cat.image_url && (
                <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
              )}
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewNavbar;
