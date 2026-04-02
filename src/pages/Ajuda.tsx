import { Search, ChevronRight, MessageCircle, Phone, Mail, ShieldCheck, Package, CreditCard, Truck, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const topics = [
  { icon: Package, title: "Pedidos e Entregas", desc: "Rastreamento, prazos de entrega" },
  { icon: RotateCcw, title: "Devoluções e Reembolsos", desc: "Como devolver ou trocar" },
  { icon: CreditCard, title: "Pagamentos", desc: "Métodos de pagamento, faturas" },
  { icon: ShieldCheck, title: "Segurança da Conta", desc: "Proteja a sua conta" },
  { icon: Truck, title: "Envio", desc: "Opções e custos de envio" },
];

const faqs = [
  "Como rastrear o meu pedido?",
  "Posso cancelar um pedido?",
  "Qual o prazo de devolução?",
  "Como alterar o endereço de entrega?",
  "Quais métodos de pagamento aceitam?",
  "Como contactar um vendedor?",
];

const Ajuda = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-3">Centro de Ajuda</h1>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Pesquisar ajuda..." className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {topics.map(t => (
            <button key={t.title} className="bg-card rounded-lg border border-border p-3 text-left hover:border-primary/30 transition">
              <t.icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-xs font-bold text-foreground">{t.title}</h3>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>

        <h2 className="text-sm font-bold text-foreground mb-2">Perguntas Frequentes</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-6">
          {faqs.map(f => (
            <button key={f} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition">
              <span className="text-xs text-foreground">{f}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <h2 className="text-sm font-bold text-foreground mb-2">Contacte-nos</h2>
        <div className="grid grid-cols-3 gap-2">
          {[{ icon: MessageCircle, l: "Chat" }, { icon: Phone, l: "Ligar" }, { icon: Mail, l: "Email" }].map(c => (
            <button key={c.l} className="bg-card rounded-lg border border-border p-3 flex flex-col items-center gap-1.5 hover:border-primary/30 transition">
              <c.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{c.l}</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Ajuda;
