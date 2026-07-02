import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, ArrowLeft, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

type View = "main" | "forgot";

const VISITED_KEY = "zango_has_visited";

const PALETTE = {
  cacau: "#4A2E1C",
  terracota: "#C1652F",
  dourado: "#E8A33D",
  creme: "#FBF3E7",
  carvao: "#2B211A",
};

const GoogleIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.9 14.1-5.1l-6.5-5.5C29.5 35.3 26.9 36 24 36c-5.3 0-9.7-3.1-11.4-7.5l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.5 4.6-4.6 6.1l6.5 5.5C40.8 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<View>("main");
  const [isReturning, setIsReturning] = useState(false);
  const [loading, setLoading] = useState<"login" | "signup" | "reset" | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (user) navigate("/conta", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const hasVisited = localStorage.getItem(VISITED_KEY);
    if (hasVisited) setIsReturning(true);
    else {
      localStorage.setItem(VISITED_KEY, "true");
      setIsReturning(false);
    }
  }, []);

  const handleGoogleAuth = async (mode: "login" | "signup") => {
    setLoading(mode);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setLoading(null);
    if (error) toast.error(error.message);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/redefinir-password`,
    });
    setLoading(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Enviámos um email com o link para redefinires a palavra-passe.");
      setView("main");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(circle at 20% 0%, ${PALETTE.dourado}22, transparent 55%), radial-gradient(circle at 100% 10%, ${PALETTE.terracota}22, transparent 45%), ${PALETTE.creme}`,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&display=swap');
        .zango-display { font-family: 'Fraunces', serif; }
        .zango-body { font-family: 'Inter', sans-serif; }
        @keyframes zango-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .zango-card { animation: zango-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) { .zango-card { animation: none; } }
      `}</style>

      <div className="relative">
        <div className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: PALETTE.cacau }}>
          <button onClick={() => navigate(-1)} className="text-white/90 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="zango-display text-white font-bold text-xl tracking-tight">Zango Shopping</span>
        </div>
        <svg
          viewBox="0 0 200 10"
          preserveAspectRatio="none"
          className="w-full h-2.5 block"
          style={{ display: "block" }}
        >
          <path
            d="M0,0 L0,4 Q5,10 10,4 Q15,-2 20,4 Q25,10 30,4 Q35,-2 40,4 Q45,10 50,4 Q55,-2 60,4 Q65,10 70,4 Q75,-2 80,4 Q85,10 90,4 Q95,-2 100,4 Q105,10 110,4 Q115,-2 120,4 Q125,10 130,4 Q135,-2 140,4 Q145,10 150,4 Q155,-2 160,4 Q165,10 170,4 Q175,-2 180,4 Q185,10 190,4 Q195,-2 200,4 L200,0 Z"
            fill={PALETTE.cacau}
          />
        </svg>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-16">
        <div
          className="zango-card w-full max-w-md rounded-3xl p-7 sm:p-9"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: `0 1px 2px ${PALETTE.carvao}0d, 0 20px 40px -12px ${PALETTE.cacau}33`,
            border: `1px solid ${PALETTE.dourado}30`,
          }}
        >
          {view === "main" && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${PALETTE.terracota}, ${PALETTE.dourado})` }}
                >
                  <ShoppingBasket className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>
                <h1 className="zango-display text-3xl font-bold" style={{ color: PALETTE.carvao }}>
                  {isReturning ? "Bem-vindo de volta!" : "Bem-vindo!"}
                </h1>
                <p className="zango-body text-sm mt-2" style={{ color: `${PALETTE.carvao}99` }}>
                  Zango Shopping — o maior marketplace de Angola.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleGoogleAuth("login")}
                  disabled={loading !== null}
                  className="zango-body group w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: PALETTE.cacau,
                    color: "#FFFFFF",
                    boxShadow: `0 8px 20px -6px ${PALETTE.cacau}80`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <span className="bg-white rounded-full p-1 flex items-center justify-center shadow-sm">
                    <GoogleIcon className="w-4 h-4" />
                  </span>
                  {loading === "login" ? "A entrar..." : "Iniciar Sessão com Google"}
                </button>

                <button
                  onClick={() => handleGoogleAuth("signup")}
                  disabled={loading !== null}
                  className="zango-body w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed bg-white"
                  style={{
                    color: PALETTE.terracota,
                    border: `2px solid ${PALETTE.terracota}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${PALETTE.terracota}0d`)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
                >
                  <span className="bg-white rounded-full p-1 flex items-center justify-center border" style={{ borderColor: `${PALETTE.terracota}30` }}>
                    <GoogleIcon className="w-4 h-4" />
                  </span>
                  {loading === "signup" ? "A criar conta..." : "Criar Conta com Google"}
                </button>
              </div>

              <p className="zango-body text-xs text-center mt-4" style={{ color: `${PALETTE.carvao}80` }}>
                Não precisas de criar palavra-passe — a tua conta fica pronta ao entrares com o Google.
              </p>

              <div className="flex items-center gap-3 my-7">
                <div className="flex-1 h-px" style={{ backgroundColor: `${PALETTE.carvao}1a` }} />
                <span className="zango-body text-[11px] uppercase tracking-wider" style={{ color: `${PALETTE.carvao}66` }}>
                  conta antiga
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: `${PALETTE.carvao}1a` }} />
              </div>

              <button
                type="button"
                onClick={() => setView("forgot")}
                className="zango-body w-full text-center text-sm font-semibold hover:underline"
                style={{ color: PALETTE.terracota }}
              >
                Já tinhas conta com email e palavra-passe? Recuperar acesso
              </button>
            </>
          )}

          {view === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => setView("main")}
                className="zango-body flex items-center gap-1.5 text-xs font-semibold mb-6 hover:underline"
                style={{ color: `${PALETTE.carvao}99` }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <div className="text-center mb-7">
                <h1 className="zango-display text-2xl font-bold" style={{ color: PALETTE.carvao }}>
                  Recuperar palavra-passe
                </h1>
                <p className="zango-body text-sm mt-2" style={{ color: `${PALETTE.carvao}99` }}>
                  Introduz o teu email e enviamos-te um link para a redefinires.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                    style={{
                      border: `1.5px solid ${PALETTE.carvao}22`,
                      backgroundColor: PALETTE.creme,
                      color: PALETTE.carvao,
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                    onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading !== null}
                  className="zango-body w-full py-3.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                  style={{ backgroundColor: PALETTE.cacau, boxShadow: `0 8px 20px -6px ${PALETTE.cacau}80` }}
                >
                  {loading === "reset" ? "A enviar..." : "Enviar link de recuperação"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="zango-body text-[11px] text-center mt-6 max-w-md" style={{ color: `${PALETTE.carvao}80` }}>
          Ao continuar, aceitas os{" "}
          <span className="font-semibold" style={{ color: PALETTE.terracota }}>Termos de Serviço</span> e a{" "}
          <span className="font-semibold" style={{ color: PALETTE.terracota }}>Política de Privacidade</span> da Zango Shopping.
        </p>
      </div>
    </div>
  );
};

export default Auth;
