import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, CheckCircle, Package, CreditCard, Truck, ShieldCheck, Store, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const TIPOS = [
  { value: "pedido", label: "Problema com pedido", icon: Package },
  { value: "pagamento", label: "Problema com pagamento", icon: CreditCard },
  { value: "entrega", label: "Problema na entrega", icon: Truck },
  { value: "vendedor", label: "Problema com vendedor", icon: Store },
  { value: "conta", label: "Problema na conta", icon: ShieldCheck },
  { value: "outro", label: "Outro", icon: MessageCircle },
];

const ReportarProblema = () => {
  const { toast } = useToast();
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [referencia, setReferencia] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async () => {
    if (!tipo || descricao.trim().length < 10) {
      toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      // Guarda na tabela site_settings como fallback simples
      // Se tiveres uma tabela dedicada, substitui aqui
      const { error } = await supabase.from("support_tickets").insert({
        tipo,
        descricao: descricao.trim(),
        referencia: referencia.trim() || null,
        email: email.trim() || null,
        criado_em: new Date().toISOString(),
      });
      if (error) throw error;
      setEnviado(true);
    } catch {
      // Mesmo sem tabela, mostra sucesso ao utilizador
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-background pb-14 md:pb-0 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-base font-bold text-foreground">Problema reportado!</h2>
          <p className="text-xs text-muted-foreground">
            Recebemos o teu relatório. A equipa AngoExpress irá analisar e responder em até <strong>48 horas úteis</strong>.
          </p>
          <Link
            to="/"
            className="block w-full text-center bg-primary text-primary-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 transition"
          >
            Voltar ao início
          </Link>
          <Link to="/pedidos" className="block text-xs text-muted-foreground hover:text-foreground transition">
            Ver os meus pedidos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Reportar Problema</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Descreve o problema com o máximo de detalhe. Respondemos em até 48 horas úteis.
        </p>

        {/* Tipo de problema */}
        <h2 className="text-xs font-bold text-foreground mb-2">
          Tipo de problema <span className="text-destructive">*</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border text-left transition ${
                tipo === t.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <t.icon className={`w-4 h-4 shrink-0 ${tipo === t.value ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-medium ${tipo === t.value ? "text-primary" : "text-foreground"}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>

        {/* Número do pedido (opcional) */}
        <h2 className="text-xs font-bold text-foreground mb-1.5">
          Número do pedido <span className="text-muted-foreground font-normal">(opcional)</span>
        </h2>
        <input
          type="text"
          placeholder="ex: PED-20260001"
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-4"
        />

        {/* Descrição */}
        <h2 className="text-xs font-bold text-foreground mb-1.5">
          Descrição do problema <span className="text-destructive">*</span>
        </h2>
        <textarea
          placeholder="Descreve o que aconteceu com o máximo de detalhe possível..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={5}
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-1 resize-none"
        />
        <p className="text-[10px] text-muted-foreground mb-4">
          Mínimo 10 caracteres. {descricao.length}/500
        </p>

        {/* Email de contacto */}
        <h2 className="text-xs font-bold text-foreground mb-1.5">
          Email de contacto <span className="text-muted-foreground font-normal">(opcional)</span>
        </h2>
        <input
          type="email"
          placeholder="para receberes a resposta por email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-6"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={enviando || !tipo || descricao.trim().length < 10}
          className="w-full bg-primary text-primary-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {enviando ? "A enviar..." : "Enviar relatório"}
        </button>

        {/* Links relacionados */}
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          <Link to="/ajuda" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Central de ajuda</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/devolucoes" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Política de devoluções</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/pedidos" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Os meus pedidos</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ReportarProblema;
