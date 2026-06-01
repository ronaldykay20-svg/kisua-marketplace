import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import {
  Search, ShoppingCart, Bell, User, ChevronDown,
  Gavel, Radio, Zap, Store, Users, Mic, LogOut, X, Camera,
} from "lucide-react";

const staticCategories = [
  { name: "Electrónicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=60&h=60&fit=crop" },
  { name: "Veículos",     image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=60&h=60&fit=crop" },
  { name: "Imóveis",      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=60&h=60&fit=crop" },
  { name: "Moda",         image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=60&h=60&fit=crop" },
  { name: "Casa & Jardim",image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=60&h=60&fit=crop" },
  { name: "Desporto",     image: "https://images.unsplash.com/photo-1461896836934-bd45ba8a0a42?w=60&h=60&fit=crop" },
  { name: "Bebé & Criança",image:"https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=60&h=60&fit=crop" },
  { name: "Saúde & Beleza",image:"https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=60&h=60&fit=crop" },
  { name: "Informática",  image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=60&h=60&fit=crop" },
  { name: "Gaming",       image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=60&h=60&fit=crop" },
  { name: "Jóias & Relógios",image:"https://images.unsplash.com/photo-1515562141589-67f0d569b6fc?w=60&h=60&fit=crop" },
  { name: "Alimentação",  image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=60&h=60&fit=crop" },
];

const sand       = "#D4B896";
const sandDark   = "#B8956A";
const cream      = "#F7F0E6";
const brown      = "#4A2E0A";
const brownLight = "rgba(74,46,10,0.10)";

const useLiveCount = () =>
  useQuery({
    queryKey: ["live_count_active"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("live_streams")
        .select("*", { count: "exact", head: true })
        .eq("status", "live");
      return count || 0;
    },
    refetchInterval: 20000,
  });

const quickLinks = [
  { label: "Leilão",    path: "/leilao",    icon: Gavel },
  { label: "Live",      path: "/live",      icon: Radio },
  { label: "Promoções", path: "/promocoes", icon: Zap },
  { label: "Empresas",  path: "/empresas",  icon: Store },
  { label: "Vendedores",path: "/vendedores",icon: Users },
];

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
    r.onend   = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => onResult(e.results[0][0].transcript);
    r.start();
  }, [onResult]);
  const stop = useCallback(() => { ref.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
};

const useImageSearch = (onResult: (base64: string) => void) => {
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeImage = useCallback(async (file: File) => {
    setAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        onResult(base64);
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      alert("Erro ao processar imagem.");
      setAnalyzing(false);
    }
  }, [onResult]);

  const openImagePicker = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeImage(file);
    e.target.value = "";
  }, [analyzeImage]);

  return { analyzing, openImagePicker, handleFileChange, fileInputRef };
};

const LogoSkeleton = () => (
  <div
    className="h-10 w-36 rounded-lg animate-pulse"
    style={{ background: "rgba(74,46,10,0.12)" }}
  />
);

const DesktopNavbar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl, isLoading: logoLoading } = useSiteSetting("site_logo_url");
  const qc = useQueryClient();

  const [search,    setSearch]    = useState("");
  const [catOpen,   setCatOpen]   = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    if (!logoUrl) setLogoLoaded(false);
  }, [logoUrl]);

  const { data: dbCats } = useCategories();
  const cats = dbCats?.length
    ? dbCats.map((c: any) => ({
        name: c.name,
        image: c.image_url || staticCategories.find(s => s.name === c.name)?.image || "",
      }))
    : staticCategories;

  const { data: cartCount = 0 } = useCartCount(user?.id);
  const { data: liveCount = 0 } = useLiveCount();

  const { data: isAffiliate } = useQuery({
    queryKey: ["is_affiliate", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("affiliates").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

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
    if (search.trim()) {
      navigate(`/pesquisa?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  const { listening, start, stop } = useSpeechRecognition((t) => {
    setSearch(t);
    navigate(`/pesquisa?q=${encodeURIComponent(t)}`);
  });

  const { analyzing, openImagePicker, handleFileChange, fileInputRef } = useImageSearch((base64) => {
    navigate(`/pesquisa?modo=imagem&img=${encodeURIComponent(base64)}`);
    setSearch("");
  });

  const navItems = [
    { label: "Início",          path: "/" },
    { label: "Ofertas",         path: "/promocoes" },
    { label: "Leilão",          path: "/leilao" },
    { label: "Live",            path: "/live",    liveBadge: true },
    { label: "Empresas",        path: "/empresas" },
    { label: "Vendedores",      path: "/vendedores" },
    { label: "Ranking",         path: "/ranking" },
    { label: "Seja Fornecedor", path: "/seja-fornecedor" }, // ✅ adicionado
    ...(!isAffiliate ? [{ label: "Criar Loja", path: "/criar-loja" }] : []),
  ];

  const IconBtn = ({ children, onClick, badge }: any) => (
    <div className="relative">
      <button
        onClick={onClick}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
        style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
      >
        {children}
      </button>
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
          style={{ background: "#E53935" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </div>
  );

  const LiveBadge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <>
        <style>{`
          @keyframes live-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.55); }
            50%       { box-shadow: 0 0 0 5px rgba(229,57,53,0); }
          }
        `}</style>
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1"
          style={{ background: "#E53935", animation: "live-pulse 1.5s ease-in-out infinite" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      </>
    );
  };

  const renderLogo = () => {
    if (logoLoading) {
      return <LogoSkeleton />;
    }
    if (logoUrl) {
      return (
        <>
          {!logoLoaded && <LogoSkeleton />}
          <img
            src={logoUrl}
            alt="Logo"
            className="h-10 object-contain"
            style={{ display: logoLoaded ? "block" : "none" }}
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoLoaded(true)}
          />
        </>
      );
    }
    return (
      <span className="text-xl font-black" style={{ color: brown }}>AngoExpress</span>
    );
  };

  return (
    <header
      className="hidden md:block sticky top-0 z-50 w-full"
      style={{ background: `linear-gradient(160deg, ${cream} 0%, ${sand} 60%, #C9A87C 100%)` }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center gap-3">
        <a href="/" className="flex-shrink-0">
          {renderLogo()}
        </a>

        <div className="relative flex-shrink-0 hidden lg:block">
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
                  Ver todas →
                </button>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center rounded-2xl overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.12)" }}
        >
          <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produtos, marcas, categorias..."
            className="flex-1 py-2.5 px-3 bg-transparent focus:outline-none"
            style={{ color: brown, fontSize: "16px" }}
          />
          <button
            type="button"
            onClick={openImagePicker}
            disabled={analyzing}
            className="w-10 h-9 flex items-center justify-center rounded-xl m-0.5 transition-all hover:scale-105"
            style={{ background: analyzing ? "#F9A825" : brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
            title="Pesquisar por imagem"
          >
            {analyzing
              ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: brown, borderTopColor: "transparent" }} />
              : <Camera className="w-4 h-4" style={{ color: brown }} />
            }
          </button>
          <button
            type="button"
            onClick={listening ? stop : start}
            className="w-10 h-9 flex items-center justify-center rounded-xl m-0.5 transition-all"
            style={{
              background: listening ? "#E53935" : `linear-gradient(135deg, ${sandDark}, ${sand})`,
              boxShadow: listening ? "0 0 0 4px rgba(229,57,53,0.25)" : "none",
            }}
          >
            <Mic className="w-4 h-4 text-white" />
          </button>
        </form>

        <div className="hidden md:flex lg:hidden items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-xl"
          style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sandDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px]" style={{ color: sandDark }}>Retirada ou entrega?</span>
            <span className="text-[10px] font-bold" style={{ color: brown }}>Luanda, Angola</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {user && (
            <div className="relative">
              <IconBtn
                onClick={() => { setNotifOpen(v => !v); setUserOpen(false); setCatOpen(false); }}
                badge={unread}
              >
                <Bell className="w-5 h-5" style={{ color: brown }} />
              </IconBtn>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{ background: cream, border: `1px solid ${sand}` }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: sand }}>
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

          <IconBtn onClick={() => navigate("/carrinho")} badge={cartCount}>
            <ShoppingCart className="w-5 h-5" style={{ color: brown }} />
          </IconBtn>

          <div className="relative">
            <button
              onClick={() => { setUserOpen(v => !v); setNotifOpen(false); setCatOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105"
              style={{ background: brownLight, border: `1px solid rgba(74,46,10,0.18)` }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm"
                style={{ background: brown, color: cream }}>
                {user ? userDisplayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <span className="text-sm font-bold hidden lg:block" style={{ color: brown }}>
                {user ? userDisplayName.split(" ")[0] : "Entrar"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 hidden lg:block transition-transform ${userOpen ? "rotate-180" : ""}`} style={{ color: brown }} />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{ background: cream, border: `1px solid ${sand}` }}>
                {!user ? (
                  <button onClick={() => { navigate("/auth"); setUserOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-white/60 transition"
                    style={{ color: brown }}>
                    Entrar / Registar
                  </button>
                ) : (
                  <>
                    {[
                      { label: "Minha conta", path: "/conta" },
                      { label: "Meus pedidos", path: "/pedidos" },
                      { label: "Favoritos",    path: "/favoritos" },
                      { label: "Vender",       path: "/vender" },
                      { label: "Ajuda",        path: "/ajuda" },
                    ].map(l => (
                      <button key={l.label} onClick={() => { navigate(l.path); setUserOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-white/60 transition"
                        style={{ color: brown }}>
                        {l.label}
                      </button>
                    ))}
                    <div className="border-t mx-3 my-1" style={{ borderColor: sand }} />
                    <button
                      onClick={async () => { await signOut(); setUserOpen(false); navigate("/"); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition"
                      style={{ color: "#E53935" }}
                    >
                      <LogOut className="w-4 h-4" /> Sair
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: "rgba(74,46,10,0.15)" }}>
        <div className="md:flex lg:hidden max-w-screen-xl mx-auto px-5">
          <div className="flex items-center w-full py-2">
            <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
              <div className="flex items-center gap-3">
                {cats.map((cat: any) => (
                  <button key={cat.name} onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "2px solid rgba(74,46,10,0.15)", boxShadow: "0 1px 6px rgba(74,46,10,0.10)" }}>
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: brown, maxWidth: 48 }}>{cat.name}</span>
                  </button>
                ))}
                <button onClick={() => navigate("/categorias")} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(74,46,10,0.08)", border: "2px solid rgba(74,46,10,0.20)", boxShadow: "0 1px 6px rgba(74,46,10,0.10)" }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="2" y="2" width="8" height="8" rx="2" fill={brown} opacity="0.85"/>
                      <rect x="12" y="2" width="8" height="8" rx="2" fill={brown} opacity="0.85"/>
                      <rect x="2" y="12" width="8" height="8" rx="2" fill={brown} opacity="0.85"/>
                      <rect x="12" y="12" width="8" height="8" rx="2" fill={brown} opacity="0.85"/>
                    </svg>
                  </div>
                  <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: brown, maxWidth: 48 }}>Mais<br/>categorias</span>
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 w-px mx-3 self-stretch" style={{ background: "rgba(74,46,10,0.18)" }} />
            <div className="flex-shrink-0 flex items-center gap-1">
              {quickLinks.map(link => {
                const isLive = link.path === "/live";
                return (
                  <button key={link.label} onClick={() => navigate(link.path)} className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-all hover:bg-white/40 relative">
                    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brownLight, border: "1px solid rgba(74,46,10,0.15)" }}>
                      <link.icon className="w-4 h-4" style={{ color: brown }} />
                      {isLive && liveCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-0.5" style={{ background: "#E53935" }}>
                          {liveCount > 9 ? "9+" : liveCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: brown }}>{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex max-w-screen-xl mx-auto px-5 items-center gap-1 h-10">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            const isLive = item.liveBadge;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ color: active ? "#fff" : brown, background: active ? brown : "transparent" }}>
                {item.label}
                {isLive && liveCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 min-w-[16px] h-[16px] rounded-full text-white text-[8px] font-black flex items-center justify-center px-0.5" style={{ background: "#E53935" }}>
                    {liveCount > 9 ? "9+" : liveCount}
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: sandDark }}>
            {quickLinks.map(l => {
              const isLive = l.path === "/live";
              return (
                <button key={l.label} onClick={() => navigate(l.path)} className="relative flex items-center gap-1 hover:underline transition" style={{ color: sandDark }}>
                  <l.icon className="w-3 h-3" />
                  {l.label}
                  {isLive && liveCount > 0 && (
                    <span className="ml-0.5 min-w-[14px] h-[14px] rounded-full text-white text-[8px] font-black flex items-center justify-center px-0.5" style={{ background: "#E53935" }}>
                      {liveCount > 9 ? "9+" : liveCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopNavbar;
