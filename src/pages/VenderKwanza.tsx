import { useState } from "react";
import { Store, TrendingUp, Shield, Users, CheckCircle2, Loader2, ArrowLeft, SendHorizonal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const benefits = [
  { icon: Users,      title: "Milhões de Clientes",  desc: "Alcance compradores em toda Angola" },
  { icon: TrendingUp, title: "Aumente Vendas",        desc: "Ferramentas para impulsionar o seu negócio" },
  { icon: Shield,     title: "Pagamentos Seguros",    desc: "Receba com segurança e rapidez" },
  { icon: Store,      title: "Loja Personalizada",    desc: "Crie a sua loja com a sua marca" },
];

const steps = [
  { n: "1", title: "Crie a sua conta",  desc: "Registe-se gratuitamente em minutos" },
  { n: "2", title: "Configure a loja",  desc: "Adicione produtos e personalize" },
  { n: "3", title: "Comece a vender",   desc: "Publique e receba encomendas" },
];

const ANGOLA_PROVINCES = [
  "Bengo","Benguela","Bié","Cabinda","Cuando Cubango","Cuanza Norte",
  "Cuanza Sul","Cunene","Huambo","Huíla","Luanda","Lunda Norte",
  "Lunda Sul","Malanje","Moxico","Namibe","Uíge","Zaire",
];

type FormState = {
  name: string;
  province: string;
  bio: string;
  phone: string;
};

type ScreenState = "landing" | "form" | "success" | "already_applied";

const VenderKwanza = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", province: "", bio: "", phone: "" });

  const handleStart = async () => {
    if (loading) return;

    if (!user) {
      toast.error("Precisa de iniciar sessão primeiro.");
      navigate("/auth");
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await (supabase as any)
        .from("seller_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved"])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setScreen("already_applied");
      } else {
        setScreen("form");
      }
    } catch (e: any) {
      toast.error("Erro ao verificar candidatura. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.province) {
      toast.error("Preencha o nome da loja e a província.");
      return;
    }
    if (!user) {
      toast.error("Sessão expirada. Por favor inicie sessão novamente.");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("seller_applications").insert({
        user_id:  user.id,
        name:     form.name.trim(),
        province: form.province,
        bio:      form.bio.trim() || null,
        phone:    form.phone.trim() || null,
        status:   "pending",
      });
      if (error) throw error;
      setScreen("success");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar candidatura.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success ── */
  if (screen === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-14 md:pb-0">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-xl font-black text-foreground mb-2">Candidatura enviada!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Recebemos o seu pedido. A nossa equipa irá analisá-lo em breve e notificá-lo por aqui.
          </p>
          <button onClick={() => navigate("/")} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl">
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  /* ── Already applied ── */
  if (screen === "already_applied") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-14 md:pb-0">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-xl font-black text-foreground mb-2">Candidatura em análise</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Já submeteu uma candidatura. Assim que for aprovada receberá acesso à sua loja.
          </p>
          <button onClick={() => navigate("/")} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl">
            Ir para o início
          </button>
        </div>
      </div>
    );
  }

  /* ── Application form ── */
  if (screen === "form") {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <div className="container mx-auto px-3 py-4 max-w-lg">
          <button onClick={() => setScreen("landing")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <h1 className="text-xl font-black text-foreground mb-1">Criar conta de vendedor</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Preencha os dados abaixo. A sua candidatura será analisada pela nossa equipa.
          </p>

          <div className="space-y-4">
            {/* Nome da loja */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Nome da loja <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Loja do João"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Província */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Província <span className="text-destructive">*</span>
              </label>
              <select
                value={form.province}
                onChange={e => setForm({ ...form, province: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Selecionar província</option>
                {ANGOLA_PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Contacto */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Número de contacto</label>
              <input
                type="tel"
                placeholder="9XX XXX XXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">O que vai vender? (opcional)</label>
              <textarea
                rows={3}
                placeholder="Descreva brevemente os seus produtos ou serviços..."
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Checklist */}
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-xs font-bold text-foreground mb-2">O que precisa para começar</p>
              {["Documento de identidade", "Dados bancários", "Fotos dos produtos", "Descrição dos artigos"].map(item => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim() || !form.province}
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> A enviar...</>
                : <><SendHorizonal className="w-4 h-4" /> Enviar candidatura</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Landing ── */
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-3 py-10 text-center">
        <Store className="w-12 h-12 text-primary-foreground/80 mx-auto mb-3" />
        <h1 className="text-2xl font-black text-primary-foreground mb-2">Venda no Kwanza Market</h1>
        <p className="text-sm text-primary-foreground/80 mb-6 max-w-md mx-auto">
          O maior marketplace de Angola. Comece a vender hoje e alcance milhões de compradores.
        </p>
        <button
          onClick={handleStart}
          disabled={loading || checking}
          className="px-8 py-3 bg-secondary text-secondary-foreground font-bold text-sm rounded-xl shadow-none disabled:opacity-70 flex items-center justify-center gap-2 mx-auto"
        >
          {checking
            ? <><Loader2 className="w-4 h-4 animate-spin" /> A verificar...</>
            : "Começar agora — é grátis!"
          }
        </button>
      </div>

      <div className="container mx-auto px-3 py-6 max-w-2xl">
        {/* Benefits */}
        <h2 className="text-base font-bold text-foreground mb-3">Porquê vender connosco?</h2>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {benefits.map(b => (
            <div key={b.title} className="bg-card rounded-xl border border-border p-3">
              <b.icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-xs font-bold text-foreground">{b.title}</h3>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <h2 className="text-base font-bold text-foreground mb-3">Como funciona</h2>
        <div className="space-y-3 mb-6">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-black flex-shrink-0">
                {s.n}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={loading || checking}
          className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {checking
            ? <><Loader2 className="w-4 h-4 animate-spin" /> A verificar...</>
            : "Criar conta de vendedor"
          }
        </button>
      </div>
    </div>
  );
};

export default VenderKwanza;
