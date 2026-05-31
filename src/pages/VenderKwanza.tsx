import { useState } from "react";
import { Store, TrendingUp, Shield, Users, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Upload, X, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BUCKET = "sellers";

const benefits = [
  { icon: Users,      title: "Milhões de Clientes",  desc: "Alcance compradores em toda Angola" },
  { icon: TrendingUp, title: "Aumente Vendas",        desc: "Ferramentas para impulsionar o seu negócio" },
  { icon: Shield,     title: "Pagamentos Seguros",    desc: "Receba com segurança e rapidez" },
  { icon: Store,      title: "Loja Personalizada",    desc: "Crie a sua loja com a sua marca" },
];

const steps = [
  { n: "1", title: "Tipo de conta",        desc: "Individual ou empresa" },
  { n: "2", title: "Informações básicas",  desc: "Nome, contactos e localização" },
  { n: "3", title: "Loja",                 desc: "Nome, categoria e foto" },
  { n: "4", title: "Documentos",           desc: "BI, NIF e alvará" },
  { n: "5", title: "Dados bancários",      desc: "Como quer receber" },
  { n: "6", title: "Confirmação",          desc: "Rever e enviar" },
];

type ScreenState = "landing" | "form" | "success" | "already_applied";

const CATEGORIES = [
  "Eletrônicos", "Calçados", "Vestuários", "Acessórios", "Alimentação",
  "Beleza & Saúde", "Casa & Decoração", "Desporto", "Brinquedos",
  "Automóveis", "Serviços", "Outro",
];

const VenderKwanza = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: "individual",
    name: "", email: "", phone: "", whatsapp: "",
    province_id: "", municipality_id: "",
    address: "", website: "",
    store_name: "", category: "", description: "",
    logo_url: "", cover_url: "",
    is_legalized: false,
    bi_url: "", nif_url: "", alvara_url: "",
    payment_type: "xpress", iban: "", payment_holder: "",
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("provinces").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: municipalities = [] } = useQuery({
    queryKey: ["municipalities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("municipalities").select("id, name, province_id").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredMunicipalities = municipalities.filter(
    (m: any) => String(m.province_id) === form.province_id
  );

  const handleStart = async () => {
    if (loading) return;
    if (!user) { toast.error("Precisa de iniciar sessão primeiro."); navigate("/auth"); return; }
    setChecking(true);
    try {
      const { data, error } = await (supabase as any)
        .from("seller_applications").select("id, status")
        .eq("user_id", user.id).in("status", ["pending", "approved"]).maybeSingle();
      if (error) throw error;
      if (data) { setScreen("already_applied"); } else { setScreen("form"); }
    } catch { toast.error("Erro ao verificar. Tente novamente."); }
    finally { setChecking(false); }
  };

  const handleUpload = async (field: string, file: File) => {
    setUploading(field);
    try {
      const ext = file.name.split(".").pop();
      const folder = field === "logo_url" ? "candidaturas/logos"
        : field === "cover_url" ? "candidaturas/capas"
        : "candidaturas/documentos";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await (supabase as any).storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
      set(field, urlData.publicUrl);
      toast.success("Ficheiro carregado!");
    } catch (e: any) { toast.error("Erro no upload: " + e.message); }
    finally { setUploading(null); }
  };

  const canNext = () => {
    if (step === 1) return !!form.type;
    if (step === 2) return !!form.name && !!form.phone && !!form.province_id;
    if (step === 3) return !!form.store_name && !!form.category;
    if (step === 4) return !!form.bi_url && !!form.nif_url && (!form.is_legalized || !!form.alvara_url);
    if (step === 5) return !!form.iban && !!form.payment_holder;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Sessão expirada."); navigate("/auth"); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("seller_applications").insert({
        user_id: user.id,
        type: form.type,
        name: form.store_name.trim(),
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        province_id: form.province_id ? Number(form.province_id) : null,
        municipality_id: form.municipality_id ? Number(form.municipality_id) : null,
        logo_url: form.logo_url || null,
        cover_url: form.cover_url || null,
        is_legalized: form.is_legalized,
        bi_url: form.bi_url || null,
        nif_url: form.nif_url || null,
        alvara_url: form.alvara_url || null,
        payment_type: form.payment_type,
        iban: form.iban.trim() || null,
        payment_holder: form.payment_holder.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      setScreen("success");
    } catch (e: any) { toast.error(e.message || "Erro ao enviar candidatura."); }
    finally { setSubmitting(false); }
  };

  /* ── Success ── */
  if (screen === "success") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-14 md:pb-0">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-xl font-black text-foreground mb-2">Candidatura enviada!</h1>
        <p className="text-sm text-muted-foreground mb-6">Recebemos o seu pedido. A nossa equipa irá analisá-lo em breve.</p>
        <button onClick={() => navigate("/")} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl">Voltar ao início</button>
      </div>
    </div>
  );

  /* ── Already applied ── */
  if (screen === "already_applied") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-14 md:pb-0">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Store className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-xl font-black text-foreground mb-2">Candidatura em análise</h1>
        <p className="text-sm text-muted-foreground mb-6">Já submeteu uma candidatura. Assim que for aprovada receberá acesso à sua loja.</p>
        <button onClick={() => navigate("/")} className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl">Ir para o início</button>
      </div>
    </div>
  );

  /* ── Form ── */
  if (screen === "form") {
    const province = provinces.find((p: any) => String(p.id) === form.province_id);
    const municipality = municipalities.find((m: any) => String(m.id) === form.municipality_id);

    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0">
        <div className="container mx-auto px-3 py-4 max-w-lg">

          {/* Header */}
          <button onClick={() => step === 1 ? setScreen("landing") : setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Voltar" : "Passo anterior"}
          </button>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-foreground">{steps[step - 1].title}</p>
              <p className="text-xs text-muted-foreground">Passo {step} de {steps.length}</p>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(step / steps.length) * 100}%` }} />
            </div>
          </div>

          {/* ── PASSO 1 ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Que tipo de conta quer criar?</p>
              {[
                { value: "individual", icon: Users, title: "Vendedor Individual", desc: "Pessoa singular a vender os seus produtos" },
                { value: "empresa", icon: Building2, title: "Empresa", desc: "Negócio registado com equipa e múltiplos produtos" },
              ].map(t => (
                <button key={t.value} onClick={() => set("type", t.value)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition text-left ${form.type === t.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.type === t.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <t.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${form.type === t.value ? "text-primary" : "text-foreground"}`}>{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                  </div>
                  {form.type === t.value && <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* ── PASSO 2 ── */}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Nome completo / Empresa <span className="text-destructive">*</span></label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex: João Silva"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Telefone <span className="text-destructive">*</span></label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9XX XXX XXX"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">WhatsApp</label>
                  <input type="tel" value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="9XX XXX XXX"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>

              {/* Província — select HTML nativo com valor capturado antes do setState */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Província <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.province_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, province_id: val, municipality_id: "" }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccionar província…</option>
                  {provinces.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Município — select HTML nativo com valor capturado antes do setState */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Município</label>
                <select
                  value={form.municipality_id}
                  disabled={!form.province_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, municipality_id: val }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="">Seleccionar município…</option>
                  {filteredMunicipalities.map((m: any) => (
                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Endereço <span className="opacity-60">(opcional)</span></label>
                <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ex: Rua da Missão, nº 42"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Website <span className="opacity-60">(opcional)</span></label>
                <input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
          )}

          {/* ── PASSO 3 ── */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Foto de capa do negócio</label>
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted border border-border">
                  {form.cover_url ? (
                    <>
                      <img src={form.cover_url} alt="Capa" className="w-full h-full object-cover" />
                      <button onClick={() => set("cover_url", "")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Upload className="w-7 h-7 mb-1" />
                      <span className="text-[10px]">Sem foto de capa</span>
                    </div>
                  )}
                  <label className={`absolute bottom-2 right-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer bg-background/90 text-foreground border border-border ${uploading === "cover_url" ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="w-3 h-3" /> {uploading === "cover_url" ? "A enviar..." : "Carregar"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload("cover_url", e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Logo / Foto de perfil</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                    {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <label className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer bg-muted border border-border ${uploading === "logo_url" ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="w-3.5 h-3.5" /> {uploading === "logo_url" ? "A enviar..." : "Carregar logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload("logo_url", e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Nome da loja <span className="text-destructive">*</span></label>
                <input value={form.store_name} onChange={e => set("store_name", e.target.value)} placeholder="Ex: Loja do João"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Categoria principal <span className="text-destructive">*</span></label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, category: val }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccionar categoria…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Descrição do negócio <span className="opacity-60">(opcional)</span></label>
                <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Descreva brevemente o seu negócio..."
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none" />
              </div>
            </div>
          )}

          {/* ── PASSO 4 ── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Carregue fotos ou scans dos seus documentos.</p>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Bilhete de Identidade (BI) <span className="text-destructive">*</span></label>
                {form.bi_url ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-green-600 flex-1">BI carregado</span>
                    <button onClick={() => set("bi_url", "")} className="text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition ${uploading === "bi_url" ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading === "bi_url" ? "A enviar..." : "Carregar BI"}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleUpload("bi_url", e.target.files[0])} />
                  </label>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">NIF <span className="text-destructive">*</span></label>
                {form.nif_url ? (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-green-600 flex-1">NIF carregado</span>
                    <button onClick={() => set("nif_url", "")} className="text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition ${uploading === "nif_url" ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading === "nif_url" ? "A enviar..." : "Carregar NIF"}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleUpload("nif_url", e.target.files[0])} />
                  </label>
                )}
              </div>
              <div>
                <button onClick={() => set("is_legalized", !form.is_legalized)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition text-left ${form.is_legalized ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${form.is_legalized ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                    {form.is_legalized && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">O meu negócio é legalizado</p>
                    <p className="text-[11px] text-muted-foreground">Tenho alvará / licença comercial</p>
                  </div>
                </button>
              </div>
              {form.is_legalized && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Alvará / Licença Comercial <span className="text-destructive">*</span></label>
                  {form.alvara_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs text-green-600 flex-1">Alvará carregado</span>
                      <button onClick={() => set("alvara_url", "")} className="text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition ${uploading === "alvara_url" ? "opacity-50 pointer-events-none" : ""}`}>
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{uploading === "alvara_url" ? "A enviar..." : "Carregar Alvará"}</span>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => e.target.files?.[0] && handleUpload("alvara_url", e.target.files[0])} />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PASSO 5 ── */}
          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">Como quer receber os seus pagamentos?</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[{ value: "xpress", label: "Xpress" }, { value: "iban", label: "IBAN / TPA" }].map(t => (
                  <button key={t.value} onClick={() => set("payment_type", t.value)}
                    className={`py-3 rounded-xl border text-sm font-bold transition ${form.payment_type === t.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {form.payment_type === "xpress" ? "Número Xpress" : "IBAN"} <span className="text-destructive">*</span>
                </label>
                <input value={form.iban} onChange={e => set("iban", e.target.value)}
                  placeholder={form.payment_type === "xpress" ? "9XX XXX XXX" : "AO06..."}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Titular da conta <span className="text-destructive">*</span></label>
                <input value={form.payment_holder} onChange={e => set("payment_holder", e.target.value)} placeholder="Nome do titular"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
          )}

          {/* ── PASSO 6 ── */}
          {step === 6 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">Reveja os seus dados antes de enviar.</p>
              {[
                { label: "Tipo", value: form.type === "individual" ? "Vendedor Individual" : "Empresa" },
                { label: "Nome", value: form.name },
                { label: "Loja", value: form.store_name },
                { label: "Categoria", value: form.category },
                { label: "Telefone", value: form.phone },
                { label: "Email", value: form.email || "—" },
                { label: "Província", value: province?.name || "—" },
                { label: "Município", value: municipality?.name || "—" },
                { label: "Negócio legalizado", value: form.is_legalized ? "Sim" : "Não" },
                { label: "Pagamento", value: `${form.payment_type === "xpress" ? "Xpress" : "IBAN"}: ${form.iban}` },
                { label: "Titular", value: form.payment_holder },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className="text-xs font-bold text-foreground text-right max-w-[60%]">{row.value}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                {[
                  { label: "BI", ok: !!form.bi_url },
                  { label: "NIF", ok: !!form.nif_url },
                  { label: "Alvará", ok: !form.is_legalized || !!form.alvara_url },
                  { label: "Logo", ok: !!form.logo_url },
                  { label: "Capa", ok: !!form.cover_url },
                ].map(d => (
                  <div key={d.label} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${d.ok ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {d.ok ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />} {d.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão próximo/enviar */}
          <div className="mt-6">
            {step < 6 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> A enviar...</> : <><CheckCircle2 className="w-4 h-4" /> Enviar candidatura</>}
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  /* ── Landing ── */
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="bg-gradient-to-br from-primary to-primary/80 px-3 py-10 text-center">
        <Store className="w-12 h-12 text-primary-foreground/80 mx-auto mb-3" />
        <h1 className="text-2xl font-black text-primary-foreground mb-2">Venda no Zangu</h1>
        <p className="text-sm text-primary-foreground/80 mb-6 max-w-md mx-auto">
          O maior marketplace de Angola. Comece a vender hoje e alcance milhões de compradores.
        </p>
        <button onClick={handleStart} disabled={loading || checking}
          className="px-8 py-3 bg-secondary text-secondary-foreground font-bold text-sm rounded-xl disabled:opacity-70 flex items-center justify-center gap-2 mx-auto">
          {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> A verificar...</> : "Começar agora — é grátis!"}
        </button>
      </div>

      <div className="container mx-auto px-3 py-6 max-w-2xl">
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

        <h2 className="text-base font-bold text-foreground mb-3">Como funciona</h2>
        <div className="space-y-2 mb-6">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-3 bg-card rounded-xl border border-border p-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-black flex-shrink-0">{s.n}</div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleStart} disabled={loading || checking}
          className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-70 flex items-center justify-center gap-2">
          {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> A verificar...</> : "Criar conta de vendedor"}
        </button>
      </div>
    </div>
  );
};

export default VenderKwanza;
