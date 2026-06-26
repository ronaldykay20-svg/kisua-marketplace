import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight, ChevronDown, MessageCircle, Phone, Mail, ShieldCheck, Package, CreditCard, Truck, RotateCcw } from "lucide-react";

const topics = [
  { icon: Package, title: "Pedidos e Entregas", desc: "Rastreamento, prazos de entrega", path: "/pedidos" },
  { icon: RotateCcw, title: "Devoluções e Reembolsos", desc: "Como devolver ou trocar", path: "/devolucoes" },
  { icon: CreditCard, title: "Pagamentos", desc: "Métodos de pagamento, faturas", path: "/formas-pagamento" },
  { icon: ShieldCheck, title: "Segurança da Conta", desc: "Proteja a sua conta", path: "/seguranca" },
  { icon: Truck, title: "Envio", desc: "Opções e custos de envio", path: "/entrega-frete" },
];

const faqs = [
  {
    q: "Como rastrear o meu pedido?",
    a: 'Vai a "Os meus pedidos" no teu perfil. Lá vês o estado actual de cada encomenda, desde a confirmação do pagamento até à entrega.',
  },
  {
    q: "Posso cancelar um pedido?",
    a: "Podes cancelar enquanto o pedido ainda não tiver sido despachado pelo vendedor. Depois de despachado, já não é possível cancelar — só pedir devolução após a receção, se for caso disso.",
  },
  {
    q: "Qual o prazo de devolução?",
    a: "Tens até 3 dias após receberes o produto para pedir devolução, em caso de defeito ou produto diferente do encomendado. Consulta a página de Devoluções para mais detalhes.",
  },
  {
    q: "Como alterar o endereço de entrega?",
    a: 'Podes gerir os teus endereços em "Os meus endereços", no teu perfil. Nota: depois de um pedido ser confirmado, a alteração de endereço já pode não ser possível — contacta o suporte nesse caso.',
  },
  {
    q: "Quais métodos de pagamento aceitam?",
    a: "Aceitamos Multicaixa Express, transferência bancária e pagamento na entrega (em dinheiro), dependendo da localização e do vendedor.",
  },
  {
    q: "Como contactar um vendedor?",
    a: "Na página do produto ou da loja do vendedor encontras as opções de contacto disponibilizadas por essa loja.",
  },
];

const Ajuda = () => {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((f) =>
    f.q.toLowerCase().includes(query.toLowerCase())
  );

  const contacts = [
    {
      icon: MessageCircle,
      label: "Chat",
      action: () => window.open("https://wa.me/244958348564", "_blank"),
    },
    {
      icon: Phone,
      label: "Ligar",
      action: () => { window.location.href = "tel:+244930827083"; },
    },
    {
      icon: Mail,
      label: "Email",
      action: () => { window.location.href = "mailto:suporte@zangu.com"; },
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-3">Centro de Ajuda</h1>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar ajuda..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
          {topics.map((t) => (
            <Link
              key={t.title}
              to={t.path}
              className="bg-card rounded-lg border border-border p-3 text-left hover:border-primary/30 transition"
            >
              <t.icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-xs font-bold text-foreground">{t.title}</h3>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </Link>
          ))}
        </div>

        <h2 className="text-sm font-bold text-foreground mb-2">Perguntas Frequentes</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-6">
          {filteredFaqs.map((f, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition text-left"
                >
                  <span className="text-xs text-foreground font-medium">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
          {filteredFaqs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma pergunta encontrada para "{query}".</p>
          )}
        </div>

        <h2 className="text-sm font-bold text-foreground mb-2">Contacte-nos</h2>
        <div className="grid grid-cols-3 gap-2">
          {contacts.map((c) => (
            <button
              key={c.label}
              onClick={c.action}
              className="bg-card rounded-lg border border-border p-3 flex flex-col items-center gap-1.5 hover:border-primary/30 transition"
            >
              <c.icon className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ajuda;
