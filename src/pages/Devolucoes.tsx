import { Link } from "react-router-dom";
import {
  RotateCcw,
  Clock,
  Camera,
  ShieldCheck,
  PackageX,
  Truck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const motivos = [
  "O produto chegou com defeito de fabrico ou dano",
  "O produto recebido é diferente do que foi encomendado",
];

const steps = [
  {
    icon: Clock,
    title: "1. Pede a devolução até 3 dias",
    desc: "Tens até 3 dias após receberes o produto para abrir o pedido de devolução em \"Os meus pedidos\".",
  },
  {
    icon: Camera,
    title: "2. Envia fotos e vídeo do problema",
    desc: "Mostra claramente o defeito ou a diferença entre o produto recebido e o que encomendaste.",
  },
  {
    icon: ShieldCheck,
    title: "3. O pedido é analisado",
    desc: "A nossa equipa modera as provas enviadas e confirma se o pedido cumpre as condições de devolução.",
  },
  {
    icon: RotateCcw,
    title: "4. Recebes a troca",
    desc: "Depois de aprovado, o produto é trocado por outro igual. Não fazemos reembolso em dinheiro.",
  },
];

const Devolucoes = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-1">Devoluções</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Queremos que fiques satisfeito com a tua compra. Conhece as condições de devolução no ZANGU.
        </p>

        {/* Destaque do prazo */}
        <div className="bg-gradient-to-br from-[#5C3A1E] to-[#3a2412] rounded-xl p-5 mb-5 text-center text-white">
          <Clock className="w-6 h-6 mx-auto mb-1 text-secondary" />
          <p className="text-3xl font-extrabold text-secondary">3 dias</p>
          <p className="text-[11px] text-[#d9bfa5] mt-1">a partir da receção do produto, para pedir a devolução</p>
        </div>

        {/* Motivos aceites */}
        <h2 className="text-sm font-bold text-foreground mb-2">Quando aceitamos devolução</h2>
        <div className="bg-card rounded-lg border border-border p-4 mb-2">
          <ul className="space-y-2">
            {motivos.map((m) => (
              <li key={m} className="flex gap-2">
                <PackageX className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] text-muted-foreground">{m}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] text-muted-foreground mb-5 px-1">
          Não aceitamos devolução por simples mudança de ideias — apenas nos casos acima.
        </p>

        {/* Passos */}
        <h2 className="text-sm font-bold text-foreground mb-2">Como pedir uma devolução</h2>
        <div className="space-y-2 mb-6">
          {steps.map((s) => (
            <div key={s.title} className="bg-card rounded-lg border border-border p-3 flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Frete da devolução */}
        <div className="bg-card rounded-lg border border-border p-3 flex gap-3 mb-6">
          <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Confirmado o defeito ou o erro no produto, o custo do frete da troca é assumido pela
            empresa ou vendedor responsável pelo envio.
          </p>
        </div>

        {/* Navegação */}
        <div className="space-y-2">
          <Link
            to="/formas-pagamento"
            className="flex items-center gap-2 px-4 py-3 bg-card rounded-lg border border-border hover:border-primary/30 transition"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground">Formas de pagamento</span>
          </Link>
          <Link
            to="/reportar-problema"
            className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border hover:border-primary/30 transition"
          >
            <span className="text-xs text-foreground">Reportar um problema</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Devolucoes;
