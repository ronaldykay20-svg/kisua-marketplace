/**
 * DesktopNavbar — visível apenas em sm: (tablet) e md: (desktop)
 * Substitui a bottom nav + parte do mobile navbar nessas resoluções.
 * O Navbar mobile continua a existir mas oculto via `sm:hidden`.
 */
import { useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import {
  Search, ShoppingCart, Bell, User, ChevronDown,
  Gavel, Radio, Zap, Store, Users, Mic, LogOut, X,
} from "lucide-react";

const staticCategories = [
  { name: "Electrónicos" }, { name: "Veículos" }, { name: "Imóveis" },
  { name: "Moda" }, { name: "Casa & Jardim" }, { name: "Desporto" },
  { name: "Bebé & Criança" }, { name: "Saúde & Beleza" }, { name: "Informática" },
  { name: "Gaming" }, { name: "Jóias & Relógios" }, { name: "Alimentação" },
];

const quickLinks = [
  { label: "Leilão", path: "/leilao", icon: Gavel },
  { label: "Live", path: "/live", icon: Radio },
  { label: "Promoções", path: "/promocoes", icon: Zap },
  { label: "Empresas", path: "/empresas", icon: Store },
  { label: "Vendedores", path: "/vendedores", icon: Users },
];

const sand = "#D4B896";
const sandDark = "#B8956A";
const cream = "#F7F0E6";
const brown = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";

const useCartCount = (userId?: string) =>
  useQuery({
    queryKey: ["cart_count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

const useSpeechRecognition = (onResult: (t: string) => void) => {
  const [listening, setListening] = useState(false);
  const ref = useRef<any>(null);
  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    ref.current = r;
    r.lang = "pt-AO"; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => onResult(e.results[0][0].transcript);
    r.start();
  }, [onResult]);
  const stop = useCallback(() => { ref.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
};

const DesktopNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: dbCats } = useCategories();
  const cats = dbCats?.length ? dbCats.map((c: any) => ({ name: c.name })) : staticCategories;

  const { data: cartCount = 0 } = useCartCount(user?.id);

  const { data: notifications = [] } = useQuery({
    queryKey: ["navbar_notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("notifications").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = notifications.filter((n: any) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["navbar_notifications", user.id] });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) { navigate(`/pesquisa?q=${encodeURIComponent(search.trim())}`); setSearch(""); }
  };

  const { listening, start, stop } = useSpeechRecognition((t) => {
    setSearch(t);
    navigate(`/pesquisa?q=${encodeURIComponent(t)}`);
  });

  const navItems = [
    { label: "Início", path: "/" },
    { label: "Ofertas", path: "/promocoes" },
    { label: "Leilão", path: "/leilao" },
    { label: "Live", path: "/live" },
    { label: "Empresas", path: "/empresas" },
    { label: "Vendedores", path: "/vendedores" },
    { label: "Ranking", path: "/ranking" },
  ];

  return (
    <header className="hidden sm:block sticky top-0 z-50 w-full"
      style={{ background: `linear-gradient(160deg, ${cream} 0%, ${sand} 60%, #C9A87C 100%)` }}>

      {/* ── Linha 1: Logo + Pesquisa + Ações ── */}
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <a href="/" className="flex-shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
            : <span className="text-xl font-black" style={{ color: brown }}>AngoExpress</span>}
        </a>

        {/* Categorias dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setCatOpen(v => !v); setUserOpen(false); setNotifOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: brownLight, color: brown, border: `1px solid rgba(74,46,10,0.18)` }}
          >
            <span>Categorias</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? "rotate-180" : ""}`} />
          </button>
          {catOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-56 rounded-2xl shadow-2xl overflow-hidden z-50"
              style={{ background: cream, border: `1px solid ${sand}` }}
              onMouseLeave={() => setCatOpen(false)}
            >
              <div className="py-1.5 max-h-[60vh] overflow-y-auto">
                {cats.map((c: any) => (
                  <button key={c.name}
                    onClick={() => { navigate(`/categoria/${encodeURIComponent(c.name)}`); setCatOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-white/60 transition-colors"
                    style={{ color: brown }}>
                    {c.name}
                  </button>
                ))}
                <div className="border-t mx-3 my-1" style={{ borderColor: sand }} />
                <button onClick={() => { navigate("/categorias"); setCatOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-white/60 transition-colors"
                  style={{ color: sandDark }}>
                  Ver todas as categorias →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de pesquisa */}
        <form onSubmit={handleSearch} className="flex-1 flex items-center rounded-2xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.12)" }}>
          <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produtos, marcas, categorias..."
            className="flex-1 py-2.5 px-3 text-sm bg-transparent focus:outline-none"
            style={{ color: brown }}
          />
          <button type="button" onClick={listening ? stop : start}
            className="w-10 h-9 flex items-center justify-center rounded-xl m-0.5 transition-all"
            style={{
              background: listening ? "#E53935" : `linear-gradient(135deg, ${sandDark}, ${sand})`,
              boxShadow: listening ? "0 0 0 4px rgba(229,57,53,0.25)" : "none",
            }}>
            <Mic className="w-4 h-4 text-white" />
          </button>
        </form>

        {/* Ícones direita */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Notificações */}
          {user && (
            <div className="relative">
              <button onClick={() => { setNotifOpen(v => !v); setUserOpen(false); setCatOpen(false); }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
                <Bell className="w-5 h-5" style={{ color: brown }} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
                    style={{ background: "#E53935" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{ background: cream, border: `1px solid ${sand}` }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: sand }}>
                    <span className="text-sm font-black" style={{ color: brown }}>Notificações</span>
                    <div className="flex items-center gap-2">
                      {unread > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-bold underline" style={{ color: sandDark }}>
                          Marcar todas
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)}>
                        <X className="w-4 h-4" style={{ color: brown }} />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: sand }}>
                    {notifications.length === 0
                      ? <div className="py-8 text-center text-xs" style={{ color: sandDark }}>Sem notificações</div>
                      : notifications.map((n: any) => (
                          <button key={n.id}
                            className={`w-full text-left px-4 py-3 hover:bg-white/60 transition ${!n.is_read ? "bg-white/40" : ""}`}
                            onClick={() => { setNotifOpen(false); if (n.link_url) navigate(n.link_url); }}>
                            <p className="text-xs font-bold" style={{ color: brown }}>{n.title}</p>
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: sandDark }}>{n.message}</p>
                          </button>
                        ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Carrinho */}
          <div className="relative">
            <button onClick={() => navigate("/carrinho")}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
              <ShoppingCart className="w-5 h-5" style={{ color: brown }} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
                  style={{ background: "#E53935" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Utilizador */}
          <div className="relative">
            <button onClick={() => { setUserOpen(v => !v); setNotifOpen(false); setCatOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105"
              style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                style={{ background: brown, color: cream }}>
                {user ? userDisplayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <span className="text-sm font-bold hidden md:block" style={{ color: brown }}>
                {user ? userDisplayName.split(" ")[0] : "Entrar"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 hidden md:block transition-transform ${userOpen ? "rotate-180" : ""}`} style={{ color: brown }} />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: cream, border: `1px solid ${sand}` }}>
                {!user
                  ? (
                    <button onClick={() => { navigate("/auth"); setUserOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-white/60 transition"
                      style={{ color: brown }}>
                      Entrar / Registar
                    </button>
                  )
                  : (
                    <>
                      {[
                        { label: "Minha conta", path: "/conta" },
                        { label: "Meus pedidos", path: "/pedidos" },
                        { label: "Favoritos", path: "/favoritos" },
                        { label: "Vender", path: "/vender" },
                        { label: "Ajuda", path: "/ajuda" },
                      ].map(l => (
                        <button key={l.label} onClick={() => { navigate(l.path); setUserOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/60 transition"
                          style={{ color: brown }}>
                          {l.label}
                        </button>
                      ))}
                      <div className="border-t mx-3 my-1" style={{ borderColor: sand }} />
                      <button onClick={async () => { await signOut(); setUserOpen(false); navigate("/"); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition"
                        style={{ color: "#E53935" }}>
                        <LogOut className="w-4 h-4" /> Sair
                      </button>
                    </>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Linha 2: Nav links rápidos ── */}
      <div className="border-t" style={{ borderColor: "rgba(74,46,10,0.15)" }}>
        <div className="max-w-screen-xl mx-auto px-6 flex items-center gap-1 h-10">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  color: active ? "#fff" : brown,
                  background: active ? brown : "transparent",
                }}>
                {item.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: sandDark }}>
            {quickLinks.map(l => (
              <button key={l.label} onClick={() => navigate(l.path)}
                className="flex items-center gap-1 hover:underline transition"
                style={{ color: sandDark }}>
                <l.icon className="w-3 h-3" />
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopNavbar;
