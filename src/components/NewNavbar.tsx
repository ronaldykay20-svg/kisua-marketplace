import { Search, ShoppingCart, User, Bell, Menu, X, ChevronRight, Gavel, Radio, Store, Users, Zap, LogOut, Heart, Mic } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useCategories } from "@/hooks/useSupabaseData";
import { useCart } from "@/hooks/useSupabaseData";

const quickLinks = [
  { label: "Leilão", path: "/leilao", icon: Gavel, color: "text-orange-500" },
  { label: "Live", path: "/live", icon: Radio, color: "text-red-500" },
  { label: "Promoções", path: "/promocoes", icon: Zap, color: "text-orange-500" },
  { label: "Empresas", path: "/empresas", icon: Store, color: "text-primary" },
  { label: "Vendedores", path: "/vendedores", icon: Users, color: "text-primary" },
];

const NewNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const { data: siteName } = useSiteSetting("site_name");
  const { data: categories = [] } = useCategories();
  const { data: cartItems = [] } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const displayName = siteName || "AngoExpress";
  // Separa primeira letra do resto para estilo bicolor
  const firstName = displayName.charAt(0);
  const restName = displayName.slice(1);

  return (
    <>
      <nav className="sticky top-0 z-50 shadow-sm" style={{ background: "linear-gradient(180deg,#e9c896 0%,#d6ad79 100%)" }}>
        <div className="container mx-auto px-3">
          {/* Linha 1: menu + logo + ícones */}
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Esquerda: hamburguer + logo */}
            <div className="flex items-center gap-2">
              <button className="text-foreground md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
                <Menu className="w-6 h-6" />
              </button>
              <a href="/" className="flex items-center gap-1 flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                ) : (
                  <span className="text-2xl font-black tracking-tight leading-none">
                    <span style={{ color: "#1e3a8a" }}>{firstName}</span>
                    <span style={{ color: "#dc2626" }}>{restName}</span>
                  </span>
                )}
              </a>
            </div>

            {/* Direita: notificação + carrinho + user */}
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/notificacoes")} aria-label="Notificações" className="relative w-10 h-10 bg-white/70 backdrop-blur rounded-2xl flex items-center justify-center text-foreground hover:bg-white transition shadow-sm">
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={() => navigate("/carrinho")} aria-label="Carrinho" className="relative w-10 h-10 bg-white/70 backdrop-blur rounded-2xl flex items-center justify-center text-foreground hover:bg-white transition shadow-sm">
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => user ? navigate("/conta") : navigate("/auth")}
                aria-label="Conta"
                className="w-10 h-10 bg-white/70 backdrop-blur rounded-2xl items-center justify-center text-foreground hover:bg-white transition shadow-sm hidden sm:flex"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Linha 2: barra de pesquisa */}
          <div className="pb-3">
            <form onSubmit={handleSearch} className="flex w-full">
              <div className="relative flex w-full bg-white rounded-full shadow-md items-center h-12 pl-4 pr-1.5">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos, marcas..."
                  className="flex-1 px-3 text-[15px] text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
                <button type="button" aria-label="Pesquisa por voz" className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#c8a97e,#a07a4a)" }}>
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </nav>

      {/* Barra de categorias */}
      <CategoriesBar categories={categories} />

      {/* Menu lateral mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto animate-in slide-in-from-left duration-200 flex flex-col">
            <div className="p-4 flex items-center justify-between" style={{ backgroundColor: "#c8a97e" }}>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{userDisplayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Olá, {userDisplayName}</span>
                    <p className="text-[10px] text-white/70">{user.email}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => { navigate("/auth"); setMenuOpen(false); }} className="flex items-center gap-2">
                  <User className="w-6 h-6 text-white" />
                  <span className="text-sm font-bold text-white">Olá, faça login</span>
                </button>
              )}
              <button onClick={() => setMenuOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-5 gap-1">
                {quickLinks.map(link => (
                  <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-lg hover:bg-muted transition-colors">
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
                { label: "Vender no Kisua", path: "/vender" },
              ].map(link => (
                <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {link.label}
                </button>
              ))}
              {user && (
                <button onClick={async () => { await signOut(); setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2">
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
