import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

type View = "login" | "register" | "forgot";

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

const inputStyle = {
  border: `1.5px solid ${PALETTE.carvao}22`,
  backgroundColor: PALETTE.creme,
  color: PALETTE.carvao,
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<View>("login");
  const [isReturning, setIsReturning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email ou palavra-passe incorretos"
          : error.message
      );
    } else {
      toast.success("Login efetuado com sucesso!");
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifica o teu email para confirmar.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/redefinir-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Enviámos um email com o link para redefinires a palavra-passe.");
      setView("login");
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) toast.error(error.message);
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

      {/* Header */}
      <div className="relative shrink-0">
        <div className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: PALETTE.cacau }}>
          <button onClick={() => navigate(-1)} className="text-white/90 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="zango-display text-white font-bold text-xl tracking-tight">Zango Shopping</span>
        </div>
        <svg viewBox="0 0 200 10" preserveAspectRatio="none" className="w-full h-2.5 block">
          <path
            d="M0,0 L0,4 Q5,10 10,4 Q15,-2 20,4 Q25,10 30,4 Q35,-2 40,4 Q45,10 50,4 Q55,-2 60,4 Q65,10 70,4 Q75,-2 80,4 Q85,10 90,4 Q95,-2 100,4 Q105,10 110,4 Q115,-2 120,4 Q125,10 130,4 Q135,-2 140,4 Q145,10 150,4 Q155,-2 160,4 Q165,10 170,4 Q175,-2 180,4 Q185,10 190,4 Q195,-2 200,4 L200,0 Z"
            fill={PALETTE.cacau}
          />
        </svg>
      </div>

      {/* Main content: column layout so nothing floats off to the side */}
      <div className="flex-1 flex flex-col items-center px-4 pt-10 pb-16">
        <div
          className="zango-card w-full max-w-xl rounded-3xl p-7 sm:p-10"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: `0 1px 2px ${PALETTE.carvao}0d, 0 20px 40px -12px ${PALETTE.cacau}33`,
            border: `1px solid ${PALETTE.dourado}30`,
          }}
        >
          {view !== "forgot" && (
            <>
              <div className="flex flex-col items-center text-center mb-7">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${PALETTE.terracota}, ${PALETTE.dourado})` }}
                >
                  <ShoppingBasket className="w-7 h-7 text-white" strokeWidth={2.2} />
                </div>
                <h1 className="zango-display text-3xl font-bold" style={{ color: PALETTE.carvao }}>
                  {view === "login" ? (isReturning ? "Bem-vindo de volta!" : "Bem-vindo!") : "Criar conta"}
                </h1>
                <p className="zango-body text-sm mt-2" style={{ color: `${PALETTE.carvao}99` }}>
                  Zango Shopping — o maior marketplace de Angola.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex rounded-xl p-1 mb-7" style={{ backgroundColor: PALETTE.creme }}>
                <button
                  onClick={() => setView("login")}
                  className="zango-body flex-1 py-2.5 rounded-lg text-sm font-bold transition"
                  style={
                    view === "login"
                      ? { backgroundColor: "#FFFFFF", color: PALETTE.cacau, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { color: `${PALETTE.carvao}80` }
                  }
                >
                  Entrar
                </button>
                <button
                  onClick={() => setView("register")}
                  className="zango-body flex-1 py-2.5 rounded-lg text-sm font-bold transition"
                  style={
                    view === "register"
                      ? { backgroundColor: "#FFFFFF", color: PALETTE.cacau, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { color: `${PALETTE.carvao}80` }
                  }
                >
                  Criar Conta
                </button>
              </div>

              {/* Google */}
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="zango-body w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-60 mb-3"
                style={{ backgroundColor: PALETTE.cacau, color: "#FFFFFF", boxShadow: `0 8px 20px -6px ${PALETTE.cacau}80` }}
              >
                <span className="bg-white rounded-full p-1 flex items-center justify-center">
                  <GoogleIcon className="w-4 h-4" />
                </span>
                {loading ? "A processar..." : "Continuar com Google"}
              </button>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ backgroundColor: `${PALETTE.carvao}1a` }} />
                <span className="zango-body text-[11px] uppercase tracking-wider" style={{ color: `${PALETTE.carvao}66` }}>
                  ou com email
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: `${PALETTE.carvao}1a` }} />
              </div>

              {view === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Palavra-passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="zango-body w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: `${PALETTE.carvao}66` }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); setView("forgot"); }}
                      className="zango-body text-xs font-semibold hover:underline"
                      style={{ color: PALETTE.terracota }}
                    >
                      Esqueceste a palavra-passe?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="zango-body w-full py-3.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                    style={{ backgroundColor: PALETTE.terracota, boxShadow: `0 8px 20px -6px ${PALETTE.terracota}80` }}
                  >
                    {loading ? "A entrar..." : "Entrar"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="O teu nome"
                        required
                        className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+244 9XX XXX XXX"
                        className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Palavra-passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="zango-body w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: `${PALETTE.carvao}66` }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="zango-body text-xs font-bold mb-1.5 block" style={{ color: PALETTE.carvao }}>Confirmar palavra-passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${PALETTE.carvao}66` }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repete a palavra-passe"
                        required
                        className="zango-body w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition"
                        style={inputStyle}
                        onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                        onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="zango-body w-full py-3.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                    style={{ backgroundColor: PALETTE.terracota, boxShadow: `0 8px 20px -6px ${PALETTE.terracota}80` }}
                  >
                    {loading ? "A criar conta..." : "Criar Conta"}
                  </button>
                </form>
              )}
            </>
          )}

          {view === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => setView("login")}
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
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = PALETTE.terracota)}
                    onBlur={e => (e.currentTarget.style.borderColor = `${PALETTE.carvao}22`)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="zango-body w-full py-3.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
                  style={{ backgroundColor: PALETTE.cacau, boxShadow: `0 8px 20px -6px ${PALETTE.cacau}80` }}
                >
                  {loading ? "A enviar..." : "Enviar link de recuperação"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="zango-body text-[11px] text-center mt-6 max-w-xl" style={{ color: `${PALETTE.carvao}80` }}>
          Ao continuar, aceitas os{" "}
          <span className="font-semibold" style={{ color: PALETTE.terracota }}>Termos de Serviço</span> e a{" "}
          <span className="font-semibold" style={{ color: PALETTE.terracota }}>Política de Privacidade</span> da Zango Shopping.
        </p>
      </div>
    </div>
  );
};

export default Auth;
