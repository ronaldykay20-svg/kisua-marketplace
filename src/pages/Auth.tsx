import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type View = "main" | "forgot";

const VISITED_KEY = "zango_has_visited";

const BROWN = {
  dark: "#5A3820",
  primary: "#6B4423",
  accent: "#B8834D",
  light: "#F5EDE3",
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<View>("main");
  const [isReturning, setIsReturning] = useState(false);
  const [loading, setLoading] = useState<"login" | "signup" | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (user) navigate("/conta", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const hasVisited = localStorage.getItem(VISITED_KEY);
    if (hasVisited) {
      setIsReturning(true);
    } else {
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
    setLoading("login");
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: BROWN.primary }}>
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-lg">Zango Shopping</span>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-md">
          {view === "main" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-foreground">
                  {isReturning ? "Bem-vindo de volta!" : "Bem-vindo!"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Zango Shopping, o maior marketplace de Angola.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleGoogleAuth("login")}
                  disabled={loading !== null}
                  className="w-full py-3.5 rounded-lg text-white text-sm font-bold hover:brightness-110 transition flex items-center justify-center gap-3 disabled:opacity-60"
                  style={{ backgroundColor: BROWN.primary }}
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
                  {loading === "login" ? "A entrar..." : "Iniciar Sessão com Google"}
                </button>

                <button
                  onClick={() => handleGoogleAuth("signup")}
                  disabled={loading !== null}
                  className="w-full py-3.5 rounded-lg border-2 bg-card text-sm font-bold text-foreground hover:brightness-95 transition flex items-center justify-center gap-3 disabled:opacity-60"
                  style={{ borderColor: BROWN.primary, color: BROWN.primary }}
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  {loading === "signup" ? "A criar conta..." : "Criar Conta com Google"}
                </button>
              </div>

              <div className="text-center mt-8">
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: BROWN.primary }}
                >
                  Já tinhas conta com email e palavra-passe? Recuperar acesso
                </button>
              </div>
            </>
          )}

          {view === "forgot" && (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-foreground">Recuperar palavra-passe</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Introduz o teu email e enviamos-te um link para redefinires a palavra-passe
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as any]: `${BROWN.accent}66` }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading !== null}
                  className="w-full py-3 rounded-lg text-white font-bold text-sm hover:brightness-110 transition disabled:opacity-60"
                  style={{ backgroundColor: BROWN.primary }}
                >
                  {loading ? "A enviar..." : "Enviar link de recuperação"}
                </button>

                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="w-full text-center text-xs font-semibold hover:underline"
                  style={{ color: BROWN.primary }}
                >
                  Voltar
                </button>
              </form>
            </>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-10">
            Ao continuar, aceitas os <span className="font-semibold" style={{ color: BROWN.primary }}>Termos de Serviço</span> e a{" "}
            <span className="font-semibold" style={{ color: BROWN.primary }}>Política de Privacidade</span> da Zango Shopping.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
