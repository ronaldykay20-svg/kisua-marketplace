import { RotateCcw, CheckCircle, XCircle, Clock, PackageOpen, PhoneCall, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Devolucoes = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#5C3A1E] to-[#3a2412] text-white px-4 py-12">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-7 h-7 text-secondary" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Devoluções</h1>
          <p className="text-[#d9bfa5] text-sm max-w-md mx-auto">
            Comprou algo e não ficou satisfeito? Saiba como funciona o processo de devolução no AngoExpress.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-8">

        {/* Prazo */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-base font-bold">Prazo para devolver</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tem até <strong className="text-foreground">7 dias corridos</strong> após a recepção do produto para solicitar a devolução, desde que o produto esteja nas condições descritas abaixo.
          </p>
          <div className="mt-4 bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-sm text-secondary font-semibold text-center">
            7 dias · Garantia de satisfação
          </div>
        </section>

        {/* Aceites */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="text-base font-bold">Situações aceites para devolução</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Produto com defeito de fabricação",
              "Produto diferente do anunciado (cor, tamanho, modelo)",
              "Produto danificado na entrega",
              "Produto chegou incompleto (peças em falta)",
              "Produto não funciona desde o primeiro uso",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Não aceites */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-base font-bold">Situações não aceites</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Produto usado, lavado ou danificado pelo comprador",
              "Prazo de 7 dias ultrapassado",
              "Produto sem embalagem original ou etiquetas removidas",
              "Produto de higiene íntima ou alimentos perecíveis",
              "Desistência sem motivo válido após o produto ter sido usado",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Como devolver */}
        <section className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center">
              <PackageOpen className="w-5 h-5 text-secondary" />
            </div>
            <h2 className="text-base font-bold">Como iniciar uma devolução</h2>
          </div>
          <ol className="space-y-4">
            {[
              { n: "1", title: "Aceda aos seus pedidos", desc: 'Vá a "Minha Conta → Pedidos" e seleccione o pedido com o problema.' },
              { n: "2", title: 'Clique em "Solicitar devolução"', desc: "Descreva o motivo e anexe fotos do produto (obrigatório para defeitos e danos)." },
              { n: "3", title: "Aguarde a aprovação", desc: "O vendedor e a equipa AngoExpress analisam o pedido em até 48 horas úteis." },
              { n: "4", title: "Devolva o produto", desc: "Se aprovado, receberá instruções para enviar o produto de volta. O custo do envio é coberto pelo vendedor nos casos aceites." },
              { n: "5", title: "Receba o reembolso", desc: "Após a recepção e validação, o reembolso é processado em 3 a 5 dias úteis para o seu método de pagamento original." },
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

        {/* Reembolso */}
        <section className="bg-muted/40 rounded-2xl p-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Métodos de reembolso</p>
            <p>
              O reembolso é feito pelo mesmo método de pagamento utilizado na compra
              (Multicaixa Express, transferência bancária ou saldo AngoExpress).
              Saldo AngoExpress é creditado em 24 horas.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/pedidos"
            className="flex-1 flex items-center justify-center gap-2 bg-secondary text-[#3a2412] font-semibold rounded-xl py-3 text-sm hover:bg-secondary/90 transition-colors"
          >
            <PackageOpen className="w-4 h-4" />
            Solicitar devolução
          </Link>
          <Link
            to="/ajuda"
            className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground font-semibold rounded-xl py-3 text-sm hover:bg-muted/80 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            Falar com suporte
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Devolucoes;
