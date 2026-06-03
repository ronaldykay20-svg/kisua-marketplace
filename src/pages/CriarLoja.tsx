import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Package,
  DollarSign,
  Shield,
  FileText,
} from "lucide-react";

const PROVINCES = [
  "Luanda", "Benguela", "Huíla", "Cabinda", "Malanje",
  "Uíge", "Kwanza Norte", "Kwanza Sul", "Bié", "Moxico",
  "Cuando Cubango", "Cunene", "Namibe", "Huambo", "Lunda Norte",
  "Lunda Sul", "Zaire", "Bengo", "Kuando Kubango",
];

const BENEFITS = [
  { icon: Package,    title: "Sem Stock",        desc: "Não precisas de ter produtos físicos. O fornecedor trata do envio" },
  { icon: DollarSign, title: "Define o teu lucro", desc: "Tu defines o preço de venda. A diferença para o custo é o teu lucro" },
  { icon: TrendingUp, title: "Escala rápido",     desc: "Adiciona centenas de produtos à tua loja em minutos" },
  { icon: Shield,     title: "Risco zero",        desc: "Só pagas ao fornecedor quando tens uma venda confirmada" },
];

export default function CriarLoja() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    store_name: "",
    store_slug: "",
    description: "",
    phone: "",
    province: "",
  });

  // Verificar se já tem loja
  const { data: existingStore } = useQuery({
    queryKey: ["my_dropship_store", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("dropship_stores")
        .select("id, store_name")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "store_name") {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setForm({ ...form, store_name: value, store_slug: slug });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Precisas de estar autenticado");
      navigate("/auth");
      return;
    }
    if (!form.store_name || !form.store_slug || !form.province) {
      toast.error("Preenche todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // Verificar se slug já existe
      const { data: existing } = await supabase
        .from("dropship_stores")
        .select("id")
        .eq("store_slug", form.store_slug)
        .single();

      if (existing) {
        toast.error("Este nome de loja já está em uso. Escolhe outro.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("dropship_stores").insert({
        user_id: user.id,
        store_name: form.store_name,
        store_slug: form.store_slug,
        description: form.description || null,
        phone: form.phone || null,
        province: form.province,
        status: "pending",
      });

      if (error) throw error;

      const { data: existingSeller } = await (supabase as any)
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingSeller) {
        await (supabase as any).from("sellers").insert({
          user_id: user.id,
          name: form.store_name,
          slug: `${form.store_slug}-${user.id.slice(0, 6)}`,
          type: "individual",
          description: form.description || null,
          phone: form.phone || null,
          province: form.province || null,
          is_active: false,
        });
      }

      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["my_dropship_store"] });
      toast.success("Candidatura enviada para aprovação do Admin!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar loja");
    } finally {
      setLoading(false);
    }
  };

  // Já tem loja
  if (existingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Já tens uma loja</h2>
          <p className="text-sm text-muted-foreground">
            A tua loja <strong className="text-foreground">{existingStore.store_name}</strong> já está criada.
          </p>
          <button
            onClick={() => navigate("/painel-dropship")}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
          >
            Ir para o Painel
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-lg font-bold text-foreground">Criar Loja Dropshipping</h1>
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
                <Store className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold mb-1">Abre a tua Loja</h2>
              <p className="text-sm opacity-80 leading-relaxed">
                Cria a tua loja dropshipping no Zangu e começa a vender produtos de fornecedores sem precisar de stock.
              </p>
            </div>

            {/* Como funciona */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-4">Como funciona?</h3>
              <div className="space-y-4">
                {[
                  { n: "1", t: "Crias a tua loja",             d: "Escolhes o nome e configuras o teu perfil" },
                  { n: "2", t: "Escolhes os produtos",          d: "Vais ao catálogo de fornecedores e adicionas o que queres vender" },
                  { n: "3", t: "Defines o teu preço de venda",  d: "Tu decides quanto cobras. A diferença é o teu lucro" },
                  { n: "4", t: "Cliente compra na tua loja",    d: "O cliente vê os teus produtos e compra normalmente" },
                  { n: "5", t: "Fornecedor envia",              d: "O fornecedor trata do envio. Tu recebes o teu lucro automaticamente" },
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

            {/* Exemplo de lucro */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-3">💰 Exemplo de lucro</h3>
              <div className="space-y-2">
                {[
                  { label: "Fornecedor cobra",       value: "50.000 Kz", green: false },
                  { label: "Tu vendes por",          value: "70.000 Kz", green: false },
                  { label: "Plataforma retém (5%)",  value: "3.500 Kz",  green: false },
                  { label: "O teu lucro",            value: "~16.500 Kz", green: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-xs font-bold ${row.green ? "text-green-500" : "text-foreground"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) { navigate("/auth"); return; }
                setStep(2);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
            >
              Criar a minha Loja
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2 — Formulário ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dados da Loja</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolhe bem o nome — será o que os clientes vão ver.
              </p>
            </div>

            {/* Info da loja */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" /> Loja
              </h3>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Nome da Loja *</label>
                <input
                  name="store_name"
                  value={form.store_name}
                  onChange={handleChange}
                  placeholder="Ex: Ronaldo Tech Shop"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {form.store_slug && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    URL: zangu.ao/loja/<span className="text-primary font-bold">{form.store_slug}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Descrição da Loja</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="O que a tua loja vende? Qual o teu diferencial?"
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Contacto e localização */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Localização
              </h3>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Província *</label>
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
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Telefone de contacto
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Ex: 923 456 789"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Nota */}
            <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
              <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                A tua loja fica <strong className="text-foreground">activa imediatamente</strong>. Podes começar a adicionar produtos logo após a criação.
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
                {loading ? "A criar..." : "Criar Loja"}
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
              <h2 className="text-xl font-bold text-foreground">Loja Criada!</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                A tua loja <strong className="text-foreground">{form.store_name}</strong> está activa. Agora é só adicionar produtos e começar a vender!
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
              <p className="font-semibold text-foreground text-sm">Próximos passos:</p>
              {[
                "Aceder ao catálogo de fornecedores",
                "Escolher produtos para a tua loja",
                "Definir os teus preços de venda",
                "Partilhar a tua loja com clientes",
                "Receber as primeiras vendas!",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/catalogo-fornecedores")}
                className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm"
              >
                Ver Catálogo de Produtos
              </button>
              <button
                onClick={() => navigate("/painel-dropship")}
                className="w-full py-3 border border-border rounded-xl text-sm font-bold text-foreground"
              >
                Ir para o Painel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
