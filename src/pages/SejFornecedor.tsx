import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Store,
  Shield,
  Package,
} from "lucide-react";

const PROVINCES = [
  "Luanda", "Benguela", "Huíla", "Cabinda", "Malanje",
  "Uíge", "Kwanza Norte", "Kwanza Sul", "Bié", "Moxico",
  "Cuando Cubango", "Cunene", "Namibe", "Huambo", "Lunda Norte",
  "Lunda Sul", "Zaire", "Bengo", "Kuando Kubango",
];

const BENEFITS = [
  { icon: TrendingUp, title: "Mais Vendas",       desc: "Acede a dropshippers que venderão os teus produtos em todo o país" },
  { icon: Store,      title: "Sem Marketing",     desc: "Os dropshippers fazem o marketing. Tu geres apenas o stock e os envios" },
  { icon: Shield,     title: "Pagamento Seguro",  desc: "Recebes o pagamento automaticamente após confirmação do pedido" },
  { icon: Package,    title: "Controlo Total",    desc: "Define o teu preço de custo e o preço mínimo de venda" },
];

export default function SejFornecedor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    company_nif: "",
    contact_name: "",
    phone: "",
    email: user?.email || "",
    province: "",
    address: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Precisas de estar autenticado");
      navigate("/auth");
      return;
    }
    if (!form.company_name || !form.contact_name || !form.phone || !form.province) {
      toast.error("Preenche todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("suppliers").insert({
        user_id: user.id,
        company_name: form.company_name,
        company_nif: form.company_nif || null,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email,
        province: form.province,
        address: form.address || null,
        description: form.description || null,
        status: "pending",
      });
      if (error) throw error;
      setStep(3);
      toast.success("Pedido enviado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 2 ? setStep(1) : navigate(-1)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Programa de Fornecedores</h1>
            {step < 3 && (
              <p className="text-xs text-muted-foreground">Passo {step} de 2</p>
            )}
          </div>
        </div>

        {/* ── STEP 1 — Landing ── */}
        {step === 1 && (
          <div className="space-y-4">

            {/* Hero */}
            <div className="bg-primary rounded-2xl p-6 text-primary-foreground text-center">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold mb-1">Torna-te Fornecedor</h2>
              <p className="text-sm opacity-80 leading-relaxed">
                Regista a tua empresa no Zangu e começa a vender através de centenas de dropshippers em todo o país.
              </p>
            </div>

            {/* Como funciona */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4 text-sm">Como funciona?</h3>
              <div className="space-y-4">
                {[
                  { n: "1", t: "Registas a tua empresa",        d: "Preenches os dados e aguardas aprovação do admin em 24-48h" },
                  { n: "2", t: "Carregas os teus produtos",      d: "Defines o preço de custo e o preço mínimo de venda" },
                  { n: "3", t: "Dropshippers vendem por ti",     d: "Vendedores adicionam os teus produtos às suas lojas" },
                  { n: "4", t: "Recebes os pedidos e envias",    d: "Quando há venda, recebes a notificação e tratas do envio" },
                  { n: "5", t: "Recebes o pagamento",            d: "Automaticamente após confirmação de entrega" },
                ].map((item) => (
                  <div key={item.n} className="flex gap-3">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {item.n}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{item.t}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefícios */}
            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className="bg-card border border-border rounded-xl p-4">
                  <b.icon className="w-5 h-5 text-primary mb-2" />
                  <p className="font-semibold text-sm text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* Comissões */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-3 text-sm">💰 Como são as comissões?</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Tu defines o preço de custo",  value: "Ex: 50.000 Kz",  bold: true, green: true },
                  { label: "Dropshipper vende por",        value: "Ex: 70.000 Kz",  bold: true, green: false },
                  { label: "Tu recebes sempre",            value: "50.000 Kz",      bold: true, green: true },
                  { label: "Dropshipper fica com",         value: "~13.000 Kz",     bold: true, green: false },
                  { label: "Plataforma (5%)",              value: "3.500 Kz",       bold: false, green: false },
                  { label: "Afiliado (se houver, 10%)",    value: "7.000 Kz",       bold: false, green: false },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    <span className={`text-xs font-${row.bold ? "bold" : "medium"} ${row.green ? "text-green-600" : "text-foreground"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
            >
              Quero ser Fornecedor
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2 — Formulário ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dados da Empresa</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preenche correctamente. Serão verificados pela equipa Zangu.
              </p>
            </div>

            {/* Empresa */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Empresa
              </h3>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome da Empresa *</label>
                <input
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  placeholder="Ex: Tech Angola Lda"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">NIF da Empresa</label>
                <input
                  name="company_nif"
                  value={form.company_nif}
                  onChange={handleChange}
                  placeholder="Ex: 5000123456"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Descrição da Empresa</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="O que a tua empresa vende? Quais os produtos principais?"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" /> Contacto
              </h3>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do Responsável *</label>
                <input
                  name="contact_name"
                  value={form.contact_name}
                  onChange={handleChange}
                  placeholder="Ex: João Silva"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Telefone *</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ex: 923 456 789"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="empresa@email.com"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Localização */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Localização
              </h3>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Província *</label>
                <select
                  name="province"
                  value={form.province}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona a província</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Endereço completo</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Rua, bairro, município..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Nota */}
            <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
              <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O teu pedido será analisado pela equipa em{" "}
                <strong className="text-foreground">24 a 48 horas</strong>.
                Receberás uma notificação quando for aprovado.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-accent"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-60"
              >
                {loading ? "A enviar..." : "Submeter Pedido"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Sucesso ── */}
        {step === 3 && (
          <div className="text-center py-10 space-y-5">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Pedido Enviado!</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                O teu pedido foi submetido. A equipa Zangu irá analisar os teus dados e entrar em contacto em{" "}
                <strong className="text-foreground">24 a 48 horas</strong>.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
              <p className="font-semibold text-foreground text-sm">Próximos passos:</p>
              {[
                "Verificação dos dados da empresa",
                "Aprovação pela equipa Zangu",
                "Acesso ao painel de fornecedor",
                "Carregares o teu catálogo de produtos",
                "Dropshippers começam a vender!",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
            >
              Voltar ao início
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
