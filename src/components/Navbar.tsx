import { Search, Menu, ShoppingCart, User, MapPin, X, ChevronRight, Gavel, Radio, Store, Users, Zap, LogOut, Bell, Mic } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Paleta castanha clara / bege areia ── */
// bg principal:  #D4B896  (castanho muito claro / areia)
// bg escuro:     #B8956A  (castanho médio)
// accent:        #F7F0E6  (creme quase branco)
// texto escuro:  #4A2E0A  (castanho escuro)
// borda suave:   rgba(74,46,10,0.15)

const categories = [
  { name: "Electrónicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&h=100&fit=crop" },
  { name: "Veículos", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop" },
  { name: "Imóveis", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100&h=100&fit=crop" },
  { name: "Vestuário", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&h=100&fit=crop" },
  { name: "Casa & Jardim", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop" },
  { name: "Desporto", image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=100&h=100&fit=crop" },
  { name: "Bebé & Criança", image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=100&h=100&fit=crop" },
  { name: "Saúde & Beleza", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=100&h=100&fit=crop" },
  { name: "Informática", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=100&h=100&fit=crop" },
  { name: "Gaming", image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=100&h=100&fit=crop" },
  { name: "Jóias", image: "https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=100&h=100&fit=crop" },
  { name: "Alimentação", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=100&h=100&fit=crop" },
  { name: "Educação", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=100&h=100&fit=crop" },
  { name: "Animais", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100&h=100&fit=crop" },
];

// Apenas as primeiras 5 são exibidas no header (com foto)
const headerCategories = categories.slice(0, 4);
const VIEW_ALL = { name: "Ver todas", image: "" };

const quickLinks = [
  { label: "Leilão", path: "/leilao", icon: Gavel },
  { label: "Live", path: "/live", icon: Radio },
  { label: "Promoções", path: "/promocoes", icon: Zap },
  { label: "Empresas", path: "/empresas", icon: Store },
  { label: "Vendedores", path: "/vendedores", icon: Users },
];

/* ── Carrinho (quantidade) ── */
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

/* ── Speech Recognition nativo ── */
const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("O seu dispositivo não suporta pesquisa por voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "pt-AO"; // Português Angola; fallback: pt-PT
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, startListening, stopListening };
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Scroll tracking para colapsar categorias
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showCategories, setShowCategories] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  const navigate = useNavigate();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const qc = useQueryClient();

  /* ── Scroll dinâmico ── */
  useEffect(() => {
    let ticking = false;
    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const current = window.scrollY;
          setScrollY(current);
          // Esconde categorias quando rola para baixo mais de 60px
          setShowCategories(current < 60);
          // Esconde localização quando rola mais de 30px
          setShowLocation(current < 30);
          setLastScrollY(current);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [lastScrollY]);

  /* ── Notificações ── */
  const { data: notifications = [] } = useQuery({
    queryKey: ["navbar_notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n: any) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["navbar_notifications", user.id] });
  };

  const markOneRead = async (id: string, link_url?: string) => {
    await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["navbar_notifications", user?.id] });
    if (link_url) { navigate(link_url); setNotifOpen(false); }
  };

  /* ── Carrinho ── */
  const { data: cartCount = 0 } = useCartCount(user?.id);

  /* ── Pesquisa ── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  /* ── Voz (nativo) ── */
  const { listening, startListening, stopListening } = useSpeechRecognition((text) => {
    setSearchQuery(text);
    // Pesquisa automaticamente após reconhecimento
    navigate(`/pesquisa?q=${encodeURIComponent(text)}`);
  });

  const handleMicClick = () => {
    if (listening) stopListening();
    else startListening();
  };

  /* ── Cores ── */
  const sand = "#D4B896";       // castanho muito claro / areia
  const sandDark = "#B8956A";   // castanho médio
  const cream = "#F7F0E6";      // creme quase branco
  const brown = "#4A2E0A";      // castanho escuro
  const brownLight = "rgba(74,46,10,0.12)";

  const scrolled = scrollY > 4;

  return (
    <>
      {/* ══════════════════════════ NAVBAR ══════════════════════════ */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: `linear-gradient(160deg, ${cream} 0%, ${sand} 60%, #C9A87C 100%)`,
          boxShadow: scrolled ? "0 2px 20px rgba(74,46,10,0.18)" : "0 1px 0 rgba(74,46,10,0.08)",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div className="px-3">

          {/* ── Linha 1: menu + logo + sino + carrinho ── */}
          <div className="flex items-center gap-2.5 h-14">
            {/* Hambúrguer */}
            <button
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
              onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
            >
              <Menu className="w-5 h-5" style={{ color: brown }} />
            </button>

            {/* Logo */}
            <a href="/" className="flex items-center gap-1 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-9 object-contain" />
              ) : (
                <span className="text-xl font-black" style={{ color: brown }}>AngoExpress</span>
              )}
            </a>

            <div className="flex-1" />

            {/* Sino */}
            {user && (
              <button
                className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
              >
                <Bell className="w-5 h-5" style={{ color: brown }} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1" style={{ background: "#E53935" }}>
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )}

            {/* Carrinho */}
            <button
              className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
              onClick={() => navigate("/carrinho")}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: brown }} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1" style={{ background: "#E53935" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Linha 2: barra de pesquisa ── */}
          <div className="pb-2">
            <form onSubmit={handleSearch} className="flex items-center rounded-2xl overflow-hidden" style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.12)" }}>
              <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar produtos, marcas..."
                className="flex-1 py-2.5 px-2.5 text-sm bg-transparent focus:outline-none"
                style={{ color: brown }}
              />
              {/* Botão microfone — chama API nativa do browser/celular */}
              <button
                type="button"
                onClick={handleMicClick}
                className="w-11 h-10 flex items-center justify-center flex-shrink-0 rounded-xl m-0.5 transition-all"
                style={{
                  background: listening
                    ? "#E53935"
                    : `linear-gradient(135deg, ${sandDark}, ${sand})`,
                  boxShadow: listening ? "0 0 0 4px rgba(229,57,53,0.25)" : "none",
                  animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
                }}
                title={listening ? "A ouvir... clique para parar" : "Pesquisar por voz"}
              >
                <Mic className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

          {/* ── Linha 3: localização (colapsa ao rolar) ── */}
          <div
            className="overflow-hidden"
            style={{
              maxHeight: showLocation ? "32px" : "0px",
              opacity: showLocation ? 1 : 0,
              transition: "max-height 0.3s ease, opacity 0.25s ease",
            }}
          >
            <div className="flex items-center gap-1.5 pb-2" style={{ color: brown }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sandDark }} />
              <span className="text-xs">Retirada ou entrega?</span>
              <span className="text-xs font-bold ml-auto">Luanda, Angola</span>
            </div>
          </div>

          {/* ── Linha 4: categorias com FOTOS (colapsa ao rolar) ── */}
          <div
            className="overflow-hidden"
            style={{
              maxHeight: showCategories ? "88px" : "0px",
              opacity: showCategories ? 1 : 0,
              transition: "max-height 0.35s ease, opacity 0.25s ease",
            }}
          >
            <div className="flex items-start gap-3 pb-3 overflow-x-auto scrollbar-hide">
              {headerCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden"
                    style={{
                      border: `2px solid rgba(74,46,10,0.15)`,
                      boxShadow: "0 2px 8px rgba(74,46,10,0.12)",
                    }}
                  >
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: brown, maxWidth: 56 }}>
                    {cat.name}
                  </span>
                </button>
              ))}

              {/* "Ver todas" */}
              <button
                onClick={() => navigate("/categorias")}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: brownLight,
                    border: `2px solid rgba(74,46,10,0.18)`,
                    boxShadow: "0 2px 8px rgba(74,46,10,0.08)",
                  }}
                >
                  <span style={{ fontSize: 22, color: sandDark, lineHeight: 1 }}>⊞</span>
                </div>
                <span className="text-[10px] font-semibold text-center" style={{ color: brown }}>Ver todas</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* CSS para animação pulse do microfone */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(229,57,53,0); }
        }
      `}</style>

      {/* ══════════════════════════ PAINEL NOTIFICAÇÕES ══════════════════════════ */}
      {notifOpen && user && (
        <div className="fixed inset-0 z-[55]" onClick={() => setNotifOpen(false)}>
          <div
            className="absolute right-2 top-[118px] w-[92vw] max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: `linear-gradient(135deg, ${sand}, ${sandDark})` }}>
              <h3 className="text-sm font-black" style={{ color: brown }}>Notificações</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-bold underline" style={{ color: brown }}>
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)}>
                  <X className="w-4 h-4" style={{ color: brown }} />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {notifications.length === 0 && (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sem notificações</p>
                </div>
              )}
              {notifications.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id, n.link_url)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted transition ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════ MENU LATERAL ══════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />

          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto flex flex-col animate-in slide-in-from-left duration-200">

            {/* Header do menu */}
            <div
              className="flex items-center justify-between p-4"
              style={{ background: `linear-gradient(135deg, ${cream} 0%, ${sand} 100%)` }}
            >
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                    style={{ background: brownLight, color: brown, border: `2px solid ${sandDark}` }}
                  >
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: brown }}>Olá, {userDisplayName}</p>
                    <p className="text-[10px]" style={{ color: sandDark }}>{user.email}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { navigate("/auth"); setMenuOpen(false); }}
                  className="flex items-center gap-2"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: brownLight }}>
                    <User className="w-5 h-5" style={{ color: brown }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: brown }}>Entrar / Registar</span>
                </button>
              )}
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: brownLight }}>
                <X className="w-4 h-4" style={{ color: brown }} />
              </button>
            </div>

            {/* Quick links */}
            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-5 gap-1">
                {quickLinks.map(link => (
                  <button
                    key={link.label}
                    onClick={() => { navigate(link.path); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cream }}>
                      <link.icon className="w-4 h-4" style={{ color: sandDark }} />
                    </div>
                    <span className="text-[9px] font-semibold text-foreground">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Categorias */}
            <div className="flex-1 p-1">
              <p className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-2" style={{ color: sandDark }}>
                Categorias
              </p>
              <div className="space-y-0.5">
                {categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => { navigate(`/categoria/${encodeURIComponent(cat.name)}`); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-xl transition-colors"
                  >
                    <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: sand }} />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Links de conta */}
            <div className="border-t border-border p-3 space-y-0.5">
              {[
                { label: "Minha conta", path: "/conta" },
                { label: "Meus pedidos", path: "/pedidos" },
                { label: "Favoritos", path: "/favoritos" },
                { label: "Ajuda", path: "/ajuda" },
                { label: "Vender no AngoExpress", path: "/vender" },
              ].map(link => (
                <button
                  key={link.label}
                  onClick={() => { navigate(link.path); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </button>
              ))}
              {user && (
                <button
                  onClick={async () => { await signOut(); setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition-colors"
                  style={{ color: "#E53935" }}
                >
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

export default Navbar;
