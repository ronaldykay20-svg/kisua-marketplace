import { Link } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";

const secoes = [
  {
    titulo: "1. Aceitação dos termos",
    texto: "Ao aceder e utilizar o AngoExpress, o utilizador aceita integralmente os presentes Termos de Uso. Caso não concorde com alguma condição, deverá abster-se de utilizar a plataforma.",
  },
  {
    titulo: "2. O que é o AngoExpress",
    texto: "O AngoExpress é uma plataforma de comércio electrónico que conecta compradores e vendedores em Angola. Actuamos como intermediários e não somos proprietários dos produtos listados pelos vendedores.",
  },
  {
    titulo: "3. Registo e conta",
    texto: "Para comprar ou vender é necessário criar uma conta com informações verídicas e actualizadas. O utilizador é responsável pela confidencialidade da sua palavra-passe e por todas as actividades realizadas na sua conta.",
  },
  {
    titulo: "4. Responsabilidades do comprador",
    texto: "O comprador compromete-se a fornecer informações de entrega correctas, a efectuar o pagamento dentro do prazo estabelecido e a respeitar as políticas de devolução definidas por cada vendedor.",
  },
  {
    titulo: "5. Responsabilidades do vendedor",
    texto: "O vendedor é responsável pela veracidade das informações dos produtos, pelo cumprimento dos prazos de envio, pela qualidade do produto anunciado e pelo atendimento pós-venda.",
  },
  {
    titulo: "6. Proibições",
    texto: "É proibido publicar produtos falsificados, ilegais ou que violem direitos de terceiros; usar a plataforma para fins fraudulentos; criar contas falsas; ou tentar manipular avaliações e classificações.",
  },
  {
    titulo: "7. Comissões e pagamentos",
    texto: "O AngoExpress cobra uma comissão sobre as vendas realizadas na plataforma. Os valores e condições são comunicados ao vendedor no momento do registo e podem ser actualizados com aviso prévio de 30 dias.",
  },
  {
    titulo: "8. Limitação de responsabilidade",
    texto: "O AngoExpress não se responsabiliza por danos resultantes do uso indevido da plataforma, por falhas de terceiros prestadores de serviços (transportadoras, processadores de pagamento) ou por força maior.",
  },
  {
    titulo: "9. Suspensão e encerramento",
    texto: "O AngoExpress reserva-se o direito de suspender ou encerrar contas que violem os presentes termos, sem aviso prévio em casos de fraude ou actividade ilegal.",
  },
  {
    titulo: "10. Alterações aos termos",
    texto: "Estes termos podem ser actualizados periodicamente. As alterações serão comunicadas por email ou notificação na plataforma. A utilização continuada após a notificação implica a aceitação das novas condições.",
  },
  {
    titulo: "11. Lei aplicável",
    texto: "Os presentes Termos de Uso são regidos pela legislação angolana. Qualquer litígio será submetido aos tribunais competentes da República de Angola.",
  },
];

const TermosUso = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Termos de Uso</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mb-5">
          Última actualização: Junho de 2026 · Leia atentamente antes de utilizar a plataforma.
        </p>

        <div className="space-y-3 mb-6">
          {secoes.map((s) => (
            <div key={s.titulo} className="bg-card rounded-lg border border-border p-4">
              <h2 className="text-xs font-bold text-foreground mb-1.5">{s.titulo}</h2>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.texto}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-5">
          <Link to="/privacidade" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Política de Privacidade</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/sobre-nos" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Sobre o AngoExpress</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/reportar-problema" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Contactar a equipa</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default TermosUso;
