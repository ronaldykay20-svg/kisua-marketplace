import { Search, Menu, ShoppingCart, User, MapPin, X, ChevronRight, Gavel, Radio, Store, Users, Zap, LogOut, Bell, Mic, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSettings";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useSupabaseData";
import { classifyNotification } from "@/lib/notificationStyle";

const staticCategories = [
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
  { name: "Viagens", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&h=100&fit=crop" },
  { name: "Alimentação", image: "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=100&h=100&fit=crop" },
  { name: "Empregos", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=100&h=100&fit=crop" },
  { name: "Educação", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=100&h=100&fit=crop" },
  { name: "Animais", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=100&h=100&fit=crop" },
];

export const categoryAccentColors: Record<string, string> = {
  "Electrónicos": "#1565C0", "Veículos": "#B71C1C", "Imóveis": "#1B5E20",
  "Moda": "#F57F17", "Casa & Jardim": "#4A148C", "Desporto": "#E65100",
  "Bebé & Criança": "#880E4F", "Saúde & Beleza": "#00695C", "Informática": "#006064",
  "Gaming": "#311B92", "Jóias & Relógios": "#F9A825", "Viagens": "#01579B",
  "Alimentação": "#33691E", "Empregos": "#37474F", "Educação": "#004D40",
  "Animais": "#BF360C",
};

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

const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("O seu dispositivo nao suporta pesquisa por voz."); return; }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "pt-AO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => { onResult(event.results[0][0].transcript); };
    recognition.start();
  }, [onResult]);
  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setListening(false); }, []);
  return { listening, startListening, stopListening };
};

const Navbar = () => {
  const [menuOpen, setMenuOpen]                           = useState(false);
  const [notifOpen, setNotifOpen]                         = useState(false);
  const [searchQuery, setSearchQuery]                     = useState("");
  const [searchBarOpen, setSearchBarOpen]                 = useState(false);
  const [categoriesExpanded, setCategoriesExpanded]       = useState(true);
  const [categorySearchVisible, setCategorySearchVisible] = useState(false);
  const [scrollY, setScrollY]                             = useState(0);
  const [showLocation, setShowLocation]                   = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDisplayName, signOut } = useAuth();
  const { data: logoUrl } = useSiteSetting("site_logo_url");
  const { hasAccess: hasLeiloesAccess } = useFeatureAccess("leiloes");
  const qc = useQueryClient();

  const { data: dbCategories } = useCategories();

  // Contagem de produtos por categoria, para escondermos categorias vazias.
  // Tenta primeiro por category_id (FK comum), depois por uma coluna de texto "category".
  // Se nenhuma das duas existir, não filtramos nada (comportamento atual mantido).
  const { data: categoryProductCounts } = useQuery({
    queryKey: ["category_product_counts"],
    queryFn: async (): Promise<Record<string, number> | null> => {
      const byId = await supabase.from("products").select("category_id");
      if (!byId.error && byId.data) {
        return byId.data.reduce((acc: Record<string, number>, row: any) => {
          if (row.category_id) acc[row.category_id] = (acc[row.category_id] || 0) + 1;
          return acc;
        }, {});
      }
      const byName = await supabase.from("products").select("category");
      if (!byName.error && byName.data) {
        return byName.data.reduce((acc: Record<string, number>, row: any) => {
          if (row.category) acc[row.category] = (acc[row.category] || 0) + 1;
          return acc;
        }, {});
      }
      return null;
    },
    staleTime: 60_000,
  });

  const allCategories = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c: any) => ({
        id: c.id,
        name: c.name,
        image: c.image_url || staticCategories.find((s) => s.name === c.name)?.image || "",
      }))
    : staticCategories.map((c) => ({ id: c.name, name: c.name, image: c.image }));

  const categories = categoryProductCounts
    ? allCategories.filter((cat: any) => (categoryProductCounts[cat.id] || categoryProductCounts[cat.name] || 0) > 0)
    : allCategories;

  const quickLinks = [
    ...(hasLeiloesAccess ? [{ label: "Leilão", path: "/leilao", icon: Gavel }] : []),
    { label: "Live", path: "/live", icon: Radio },
    { label: "Promoções", path: "/promocoes", icon: Zap },
    { label: "Empresas", path: "/empresas", icon: Store },
    { label: "Vendedores", path: "/vendedores", icon: Users },
  ];

  const isCategoriasPage       = location.pathname === "/categorias";
  const isPesquisaPage         = location.pathname === "/pesquisa";
  const isCategoriaDetalhePage = location.pathname.startsWith("/categoria/");

  const categoryNameFromUrl = isCategoriaDetalhePage
    ? decodeURIComponent(location.pathname.replace("/categoria/", ""))
    : null;

  useEffect(() => {
    const handler = () => {
      const current = window.scrollY;
      setScrollY(current);
      setShowLocation(current < 30);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setSearchQuery("");
    setSearchBarOpen(false);
    setCategorySearchVisible(false);
    setCategoriesExpanded(true);
  }, [location.pathname]);

  useEffect(() => {
    if (searchBarOpen) setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [searchBarOpen]);

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
  const hasUrgentUnread = notifications.some((n: any) => !n.is_read && classifyNotification(n).tone === "red");

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["navbar_notifications", user.id] });
  };

  const markOneRead = async (id: string, link_url?: string) => {
    await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["navbar_notifications", user?.id] });
    if (link_url) { navigate(link_url); setNotifOpen(false); }
  };

  const { data: cartCount = 0 } = useCartCount(user?.id);

  const { data: isAffiliate } = useQuery({
    queryKey: ["is_affiliate", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setSearchBarOpen(false);
      setCategorySearchVisible(false);
    }
  };

  const { listening, startListening, stopListening } = useSpeechRecognition((text) => {
    navigate(`/pesquisa?q=${encodeURIComponent(text)}`);
    setSearchBarOpen(false);
    setCategorySearchVisible(false);
  });
  const handleMicClick = () => { if (listening) stopListening(); else startListening(); };

  const sand       = "#D4B896";
  const sandDark   = "#B8956A";
  const cream      = "#F7F0E6";
  const brown      = "#4A2E0A";
  const brownLight = "rgba(74,46,10,0.12)";
  const scrolled   = scrollY > 4;

  // ── Safe area top: preenche a barra de status do iOS com a cor do header ──
  const safeAreaTop = "env(safe-area-inset-top)";

  const navbarStyle: React.CSSProperties = {
    background: "#F7F0E6",
    boxShadow: scrolled ? "0 2px 20px rgba(74,46,10,0.18)" : "0 1px 0 rgba(74,46,10,0.08)",
    transition: "box-shadow 0.3s ease",
    paddingTop: safeAreaTop,
  };

  const navPositionClass = "sticky top-0 z-50";

  return (
    <>
      <nav className={navPositionClass} style={navbarStyle}>
        <div style={{ paddingLeft: 12, paddingRight: 12 }}>

          {/* ══ LINHA 1: barra de ícones ══ */}
          <div
            className="flex items-center"
            style={{ height: 64, gap: 8, paddingTop: 10, paddingBottom: 10, position: "relative" }}
          >
            {/* ── Botão esquerdo ── */}
            {isCategoriaDetalhePage ? (
              <button
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: brown, boxShadow: "0 2px 6px rgba(74,46,10,0.25)" }}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            ) : (
              <button
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: brown, boxShadow: "0 2px 6px rgba(74,46,10,0.25)" }}
                onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }}
              >
                <Menu className="w-5 h-5 text-white" />
              </button>
            )}

            {/* ── Centro: logo (sem título de categoria) ── */}
            <div className="flex-1" />
            <a href="/" className="flex-shrink-0" style={{ display: "inline-flex", height: 44, position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 1 }}>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", height: 44 }}>
                <svg
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                  viewBox="0 0 170 44"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 22 0 Q 0 0 0 22 Q 0 44 22 44 L 148 44 Q 170 44 170 22 Q 170 0 148 0 Z"
                    fill="rgba(255,255,255,0.93)"
                    stroke="#F9A825"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M 22 0 Q 0 0 0 22 Q 0 44 22 44 L 148 44 Q 170 44 170 22 Q 170 0 148 0 Z"
                    fill="none"
                    stroke="rgba(249,168,37,0.20)"
                    strokeWidth="8"
                  />
                </svg>
                <div style={{
                  position: "relative", zIndex: 1,
                  width: 170, height: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 16px",
                }}>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      fetchPriority="high"
                      style={{ height: 34, maxWidth: 140, objectFit: "contain" }}
                    />
                  )}
                </div>
              </div>
            </a>
            <div className="flex-1" />

            {/* ── Botão pesquisa direita ── */}
            {isCategoriaDetalhePage ? (
              <button
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: brown, boxShadow: "0 2px 6px rgba(74,46,10,0.25)" }}
                onClick={() => setCategorySearchVisible(v => !v)}
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            ) : searchBarOpen ? (
              <button
                className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "#E53935", boxShadow: "0 2px 6px rgba(229,57,53,0.25)" }}
                onClick={() => { setSearchBarOpen(false); setSearchQuery(""); }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="flex-shrink-0 w-11 h-11" />
            )}

            {user && (
              <button
                className="relative flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: hasUrgentUnread ? "#E53935" : brown,
                  boxShadow: hasUrgentUnread ? "0 0 0 4px rgba(229,57,53,0.22)" : "0 2px 6px rgba(74,46,10,0.25)",
                  animation: hasUrgentUnread ? "pulse 1.4s ease-in-out infinite" : "none",
                }}
                onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }}
              >
                <Bell className="w-5 h-5 text-white" />
                {unread > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full text-white text-[8px] font-black flex items-center justify-center px-0.5"
                    style={{ background: hasUrgentUnread ? "#8B0000" : "#E53935" }}
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )}

          </div>

          {/* ══ BARRA DE PESQUISA inline (páginas normais) ══ */}
          {!isCategoriasPage && !isPesquisaPage && !isCategoriaDetalhePage && (
            <div
              className="overflow-hidden"
              style={{
                maxHeight: searchBarOpen ? "56px" : "0px",
                opacity: searchBarOpen ? 1 : 0,
                paddingBottom: searchBarOpen ? "8px" : "0px",
                transition: "max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease",
              }}
            >
              <form
                onSubmit={handleSearch}
                className="flex items-center rounded-2xl overflow-hidden"
                style={{ background: "#fff", boxShadow: "0 1px 6px rgba(74,46,10,0.14)" }}
              >
                <button type="submit" className="ml-3 flex-shrink-0 p-1">
                  <Search className="w-4 h-4" style={{ color: "#1565C0" }} />
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos, marcas..."
                  className="flex-1 py-2.5 px-2 bg-transparent focus:outline-none"
                  style={{ color: brown, fontSize: "16px" }}
                />
                <button
                  type="button"
                  onClick={handleMicClick}
                  className="w-10 h-9 flex items-center justify-center flex-shrink-0 rounded-xl m-0.5"
                  style={{
                    background: listening ? "#E53935" : `linear-gradient(135deg, ${sandDark}, ${sand})`,
                    boxShadow: listening ? "0 0 0 4px rgba(229,57,53,0.25)" : "none",
                    animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
                  }}
                  title={listening ? "A ouvir... clique para parar" : "Pesquisar por voz"}
                >
                  <Mic className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          )}

          {/* ══ BARRA DE PESQUISA categoria detalhe ══ */}
          {isCategoriaDetalhePage && (
            <div
              className="overflow-hidden"
              style={{
                maxHeight: categorySearchVisible ? "56px" : "0px",
                opacity: categorySearchVisible ? 1 : 0,
                paddingBottom: categorySearchVisible ? "8px" : "0px",
                transition: "max-height 0.3s ease, opacity 0.25s ease, padding 0.25s ease",
              }}
            >
              <form
                onSubmit={handleSearch}
                className="flex items-center rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.90)", boxShadow: "0 1px 6px rgba(74,46,10,0.15)" }}
              >
                <Search className="w-4 h-4 ml-3 flex-shrink-0" style={{ color: sandDark }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos, marcas..."
                  autoFocus
                  className="flex-1 py-2.5 px-2.5 bg-transparent focus:outline-none"
                  style={{ color: brown, fontSize: "16px" }}
                />
                <button
                  type="button"
                  onClick={handleMicClick}
                  className="w-10 h-9 flex items-center justify-center flex-shrink-0 rounded-xl m-0.5"
                  style={{
                    background: listening ? "#E53935" : `linear-gradient(135deg, ${sandDark}, ${sand})`,
                    boxShadow: listening ? "0 0 0 4px rgba(229,57,53,0.25)" : "none",
                    animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
                  }}
                >
                  <Mic className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          )}

          {/* ══ PÍLULA LOCALIZAÇÃO ══ */}
          {!isCategoriasPage && !isPesquisaPage && !isCategoriaDetalhePage && (
            <div
              className="overflow-hidden"
              style={{
                maxHeight: showLocation && !searchBarOpen && !categoriesExpanded ? "60px" : "0px",
                opacity: showLocation && !searchBarOpen && !categoriesExpanded ? 1 : 0,
                transition: "max-height 0.3s ease, opacity 0.25s ease",
                paddingBottom: showLocation && !searchBarOpen && !categoriesExpanded ? 8 : 0,
              }}
            >
              <div
                className="flex items-stretch rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(74,46,10,0.10)",
                  boxShadow: "0 1px 3px rgba(74,46,10,0.06)",
                }}
              >
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#FFFFFF", boxShadow: "0 1px 2px rgba(74,46,10,0.12)" }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: brown }} />
                  </div>
                  <span className="text-[13px] font-bold truncate" style={{ color: brown }}>Entregas rápidas</span>
                </div>
                <div style={{ width: 1, background: "rgba(74,46,10,0.14)", margin: "8px 0" }} />
                <div className="flex-1 flex items-center justify-end gap-2 px-3 py-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.7)" }}>
                    <span style={{ fontSize: 12 }}>🇦🇴</span>
                  </div>
                  <span className="text-[13px] font-bold truncate" style={{ color: brown }}>Em todo o país</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ HANDLE + CATEGORIAS ══ */}
          {!isCategoriasPage && !isPesquisaPage && !isCategoriaDetalhePage && (
            <>
              <button
                className="w-full flex items-center justify-center"
                style={{ height: 18, gap: 6 }}
                onClick={() => setCategoriesExpanded(v => !v)}
                title={categoriesExpanded ? "Recolher categorias" : "Mostrar categorias"}
              >
                <div style={{ flex: 1, height: 1, background: "rgba(74,46,10,0.14)" }} />
                <div style={{
                  width: 32, height: 5, borderRadius: 3,
                  background: brown, opacity: 0.85,
                  transition: "transform 0.3s ease",
                  transform: categoriesExpanded ? "rotate(0deg)" : "rotate(180deg)",
                }} />
                <div style={{ flex: 1, height: 1, background: "rgba(74,46,10,0.14)" }} />
              </button>

              <div
                className="overflow-hidden"
                style={{
                  maxHeight: !searchBarOpen && categoriesExpanded ? "52px" : "0px",
                  opacity: !searchBarOpen && categoriesExpanded ? 1 : 0,
                  transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", paddingTop: 6, paddingBottom: 10, gap: 6 }}>
                  <div
                    className="overflow-x-auto scrollbar-hide flex-1"
                    style={{ display: "flex", gap: 8, alignItems: "center", paddingRight: 4 }}
                  >
                    <button
                      onClick={() => navigate("/categorias")}
                      className="flex-shrink-0 inline-flex items-center justify-center"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: brown,
                        whiteSpace: "nowrap",
                        lineHeight: 1,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white" style={{ lineHeight: 1 }}>Ver todas</span>
                    </button>

                    {categories.map((cat: any) => {
                      const accent = categoryAccentColors[cat.name] || brown;
                      return (
                        <button
                          key={cat.name}
                          onClick={() => navigate(`/categoria/${encodeURIComponent(cat.name)}`)}
                          className="flex-shrink-0 inline-flex items-center justify-center"
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: `${accent}17`,
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                          }}
                        >
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: accent, lineHeight: 1 }}
                          >
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setSearchBarOpen(true)}
                    className="flex-shrink-0 inline-flex items-center justify-center"
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.65)",
                      border: `1.5px solid #F9A825`,
                      whiteSpace: "nowrap",
                      gap: 5,
                      lineHeight: 1,
                    }}
                  >
                    <Search className="w-3 h-3" style={{ color: brown }} />
                    <span className="text-[10px] font-bold" style={{ color: brown, lineHeight: 1 }}>Pesquisar</span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </nav>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(229,57,53,0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ══ PAINEL NOTIFICAÇÕES ══ */}
      {notifOpen && user && (
        <div className="fixed inset-0 z-[55]" onClick={() => setNotifOpen(false)}>
          <div
            className="absolute right-2 top-[72px] w-[92vw] max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ background: `linear-gradient(135deg, ${sand}, ${sandDark})` }}
            >
              <div>
                <h3 className="text-sm font-black" style={{ color: brown }}>Notificações</h3>
                {hasUrgentUnread && (
                  <p className="text-[10px] font-bold text-red-600">⚠ Há avisos urgentes por ler</p>
                )}
              </div>
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
              {notifications.map((n: any) => {
                const style = classifyNotification(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => markOneRead(n.id, n.link_url)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted transition border-l-4 ${style.border} ${!n.is_read ? style.bg : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
                        <style.Icon className={`w-4 h-4 ${style.iconText}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${!n.is_read ? style.titleText : "text-foreground"}`}>{n.title}</p>
                          {!n.is_read && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString("pt-AO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MENU LATERAL ══ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative w-[85%] max-w-[320px] bg-card h-full overflow-y-auto flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4"
              style={{ background: `linear-gradient(135deg, ${cream} 0%, ${sand} 100%)` }}>
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                    style={{ background: brownLight, color: brown, border: `2px solid ${sandDark}` }}>
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: brown }}>Ola, {userDisplayName}</p>
                    <p className="text-[10px]" style={{ color: sandDark }}>{user.email}</p>
                  </div>
                </div>
              ) : (
                <button onClick={() => { navigate("/auth"); setMenuOpen(false); }} className="flex items-center gap-2">
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
            <div className="p-3 border-b border-border">
              <div className="grid grid-cols-5 gap-1">
                {quickLinks.map(link => (
                  <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-muted transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cream }}>
                      <link.icon className="w-4 h-4" style={{ color: sandDark }} />
                    </div>
                    <span className="text-[9px] font-semibold text-foreground">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 p-1">
              <p className="text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-2" style={{ color: sandDark }}>Categorias</p>
              <div className="space-y-0.5">
                {categories.map((cat: any) => (
                  <button key={cat.name}
                    onClick={() => { navigate(`/categoria/${encodeURIComponent(cat.name)}`); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-xl transition-colors">
                    <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: sand }} />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{cat.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border p-3 space-y-0.5">
              {[
                { label: "Minha conta",              path: "/conta" },
                { label: "Meus pedidos",              path: "/pedidos" },
                { label: "Favoritos",                 path: "/favoritos" },
                { label: "Ajuda",                     path: "/ajuda" },
                { label: "Vender no ZANGU",           path: "/vender" },
                ...(!isAffiliate ? [{ label: "Criar Loja Dropshipping", path: "/criar-loja" }] : []),
                { label: "Seja Fornecedor",           path: "/seja-fornecedor" },
              ].map(link => (
                <button key={link.label} onClick={() => { navigate(link.path); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {link.label}
                </button>
              ))}
              {user && (
                <button onClick={async () => { await signOut(); setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-red-50 transition-colors"
                  style={{ color: "#E53935" }}>
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
