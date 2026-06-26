import { Link } from "react-router-dom";
import {
  Smartphone,
  Landmark,
  Wallet,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const methods = [
  {
    icon: Smartphone,
    title: "Multicaixa Express",
    desc: "Pagamento instantâneo pelo telemóvel.",
    steps: [
      'No checkout, escolhe "Multicaixa Express".',
      "Introduz o número associado à tua conta Multicaixa Express.",
      "Confirma o pagamento na app, com o teu PIN.",
      'O pedido passa logo para "Em preparação".',
    ],
  },
  {
    icon: Landmark,
    title: "Transferência bancária",
    desc: "Transferência para a conta da ZANGU.",
    steps: [
      'No checkout, escolhe "Transferência bancária".',
      "Transfere o valor total para o IBAN indicado.",
      'Envia o comprovativo em "Os meus pedidos".',
      "Confirmamos o pagamento em até 24h (dias úteis).",
    ],
  },
  {
    icon: Wallet,
    title: "Pagamento na entrega",
    desc: "Em dinheiro, ao receberes o produto.",
    steps: [
      "Disponível para Luanda e principais cidades.",
      "Paga em Kwanzas ao entregador, na receção.",
      "Leva o valor exato — nem todos os entregadores têm troco.",
      "O pedido é confirmado após a entrega.",
    ],
  },
];

const FormasPagamento = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-1">Formas de Pagamento</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Escolhe a forma de pagamento que preferires no momento do checkout.
        </p>

        {/* Métodos */}
        <div className="space-y-3 mb-6">
          {methods.map((m) => (
            <div key={m.title} className="bg-card rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{m.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
              </div>
              <ul className="space-y-1 pl-1">
                {m.steps.map((s) => (
                  <li key={s} className="text-[11px] text-muted-foreground flex gap-1.5">
                    <span className="text-primary">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Segurança */}
        <div className="bg-card rounded-lg border border-border p-3 flex gap-3 mb-6">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Todos os pagamentos são processados de forma segura. O valor só é
            libertado ao vendedor depois da confirmação de receção do
            pedido, garantindo a tua proteção como comprador.
          </p>
        </div>

        {/* Navegação */}
        <div className="space-y-2">
          <Link
            to="/como-comprar"
            className="flex items-center gap-2 px-4 py-3 bg-card rounded-lg border border-border hover:border-primary/30 transition"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground">Como comprar</span>
          </Link>
          <Link
            to="/entrega-frete"
            className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border hover:border-primary/30 transition"
          >
            <span className="text-xs text-foreground">Entrega e frete</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FormasPagamento;
