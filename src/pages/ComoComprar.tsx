import { Link } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  ShoppingCart,
  CreditCard,
  MapPin,
  PackageCheck,
  Smartphone,
  Landmark,
  Wallet,
  ChevronRight,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "1. Procura o produto",
    desc: "Usa a pesquisa ou navega pelas categorias até encontrares o que precisas.",
  },
  {
    icon: ShieldCheck,
    title: "2. Confere o vendedor",
    desc: 'Verifica a avaliação e o selo de "Loja verificada" antes de comprar.',
  },
  {
    icon: ShoppingCart,
    title: "3. Adiciona ao carrinho",
    desc: "Escolhe a quantidade e as opções disponíveis (tamanho, cor, etc.).",
  },
  {
    icon: CreditCard,
    title: "4. Escolhe a forma de pagamento",
    desc: "Multicaixa Express, transferência bancária ou pagamento na entrega.",
  },
  {
    icon: MapPin,
    title: "5. Confirma a entrega",
    desc: "Em Luanda a entrega é mais rápida; para outras províncias o frete é calculado pelo peso, pela transportadora.",
  },
  {
    icon: PackageCheck,
    title: "6. Acompanha o teu pedido",
    desc: 'Segue o estado da encomenda em "Os meus pedidos" até a receberes.',
  },
];

const paymentMethods = [
  { icon: Smartphone, title: "Multicaixa Express", desc: "Instantâneo" },
  { icon: Landmark, title: "Transferência bancária", desc: "Conta bancária" },
  { icon: Wallet, title: "Na entrega", desc: "Em dinheiro" },
];

const ComoComprar = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">
        <h1 className="text-lg font-bold text-foreground mb-1">Como Comprar</h1>
        <p className="text-xs text-muted-foreground mb-4">
          Comprar no ZANGU é simples e seguro. Segue estes passos:
        </p>

        {/* Passos */}
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

        {/* Formas de pagamento */}
        <h2 className="text-sm font-bold text-foreground mb-2">Formas de pagamento aceites</h2>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {paymentMethods.map((p) => (
            <div key={p.title} className="bg-card rounded-lg border border-border p-3 flex flex-col items-center text-center gap-1.5">
              <p.icon className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-medium text-foreground">{p.title}</span>
              <span className="text-[10px] text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </div>
        <Link
          to="/formas-pagamento"
          className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border mb-6 hover:border-primary/30 transition"
        >
          <span className="text-xs text-foreground">Saber mais sobre formas de pagamento</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {/* Entrega */}
        <h2 className="text-sm font-bold text-foreground mb-2">Entrega para todo o país</h2>
        <div className="bg-card rounded-lg border border-border p-3 mb-2">
          <p className="text-[11px] text-muted-foreground">
            Em Luanda a entrega é feita pelos nossos parceiros locais. Para as
            outras províncias, a encomenda segue pelas transportadoras
            parceiras e o custo do frete é calculado com base no peso, de
            acordo com a tabela de cada transportadora.
          </p>
        </div>
        <Link
          to="/entrega-frete"
          className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border mb-6 hover:border-primary/30 transition"
        >
          <span className="text-xs text-foreground">Ver detalhes de entrega e frete</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {/* CTA */}
        <Link
          to="/categorias"
          className="block w-full text-center bg-primary text-primary-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 transition"
        >
          Começar a comprar
        </Link>
      </div>
    </div>
  );
};

export default ComoComprar;
