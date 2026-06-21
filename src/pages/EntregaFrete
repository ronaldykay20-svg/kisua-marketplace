import { Truck, MapPin, Clock, Package, AlertCircle, PhoneCall, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const EntregaFrete = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#5C3A1E] to-[#3a2412] text-white px-4 py-12">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-secondary" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Entrega e Frete</h1>
          <p className="text-[#d9bfa5] text-sm max-w-md mx-auto">
            Entregamos em todo o território angolano. Conheça os prazos, custos e como funciona a nossa logística.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-8">

        {/* Zonas de entrega */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-base font-bold">Zonas de Entrega</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { zona: "Luanda (cidade)", prazo: "1 – 2 dias úteis", preco: "500 Kz" },
              { zona: "Luanda (arredores)", prazo: "2 – 3 dias úteis", preco: "800 Kz" },
              { zona: "Províncias próximas", prazo: "3 – 5 dias úteis", preco: "1 500 Kz" },
              { zona: "Províncias distantes", prazo: "5 – 8 dias úteis", preco: "2 500 Kz" },
            ].map((item) => (
              <div key={item.zona} className="bg-muted/40 rounded-xl p-4">
                <p className="font-semibold text-sm">{item.zona}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.prazo}</p>
                <p className="text-secondary text-sm font-bold mt-1">{item.preco}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Os preços são por encomenda e podem variar consoante o peso e volume dos produtos.
          </p>
        </section>

        {/* Prazos */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-base font-bold">Como são contados os prazos</h2>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              O prazo começa a contar após a confirmação do pagamento pelo vendedor.
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              Dias úteis não incluem sábados, domingos e feriados nacionais.
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              Encomendas feitas após as 14h são processadas no dia útil seguinte.
            </li>
            <li className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              O vendedor pode ter prazos de preparação adicionais — verifique na página do produto.
            </li>
          </ul>
        </section>

        {/* Como funciona */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-base font-bold">Como funciona a entrega</h2>
          </div>
          <ol className="space-y-4">
            {[
              { n: "1", title: "Confirmação do pedido", desc: "Após o pagamento, o vendedor recebe a notificação e começa a preparar o produto." },
              { n: "2", title: "Despacho", desc: "O produto é embalado e entregue à transportadora parceira do AngoExpress." },
              { n: "3", title: "Em trânsito", desc: "Receberá uma notificação quando o produto for despachado, com informações de rastreamento." },
              { n: "4", title: "Entrega", desc: "O estafeta entra em contacto para combinar a entrega. Certifique-se de que o seu número de telefone está actualizado." },
            ].map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="w-7 h-7 bg-secondary text-[#3a2412] rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {step.n}
                </span>
                <div>
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Frete grátis */}
        <section className="bg-secondary/10 border border-secondary/30 rounded-2xl p-6">
          <h2 className="text-base font-bold text-secondary mb-2">🎉 Frete Grátis</h2>
          <p className="text-sm text-muted-foreground">
            Compras acima de <strong>15 000 Kz</strong> em produtos elegíveis têm frete grátis para Luanda.
            Produtos com este benefício estão identificados com o selo <span className="text-secondary font-semibold">Frete Grátis</span>.
          </p>
        </section>

        {/* Aviso */}
        <section className="bg-muted/40 rounded-2xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Não recebeu a sua encomenda?</p>
            <p>
              Se o prazo terminou e não recebeu o produto, entre em contacto com o suporte.
              Temos um prazo de <strong>48 horas</strong> para investigar e resolver.
            </p>
          </div>
        </section>

        {/* CTA Suporte */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/ajuda"
            className="flex-1 flex items-center justify-center gap-2 bg-secondary text-[#3a2412] font-semibold rounded-xl py-3 text-sm hover:bg-secondary/90 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            Contactar Suporte
          </Link>
          <Link
            to="/pedidos"
            className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground font-semibold rounded-xl py-3 text-sm hover:bg-muted/80 transition-colors"
          >
            <Package className="w-4 h-4" />
            Ver os meus pedidos
          </Link>
        </div>

      </div>
    </div>
  );
};

export default EntregaFrete;
