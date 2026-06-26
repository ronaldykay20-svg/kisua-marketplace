import { Link } from "react-router-dom";
import { FileText, ChevronRight, AlertTriangle } from "lucide-react";

const secoes = [
  {
    titulo: "1. Aceitação dos termos",
    texto: "Ao criar uma conta e utilizar o ZANGU — como comprador, vendedor, empresa ou dropshipper — aceita integralmente os presentes Termos de Uso. Se não concordar com alguma condição, deve abster-se de utilizar a plataforma.",
  },
  {
    titulo: "2. O que é o ZANGU",
    texto: "O ZANGU é uma plataforma de comércio electrónico que conecta compradores, vendedores, empresas e dropshippers em Angola. Actuamos como intermediários: facilitamos a venda, o pagamento e a logística, mas não somos proprietários dos produtos anunciados por terceiros na plataforma.",
  },
  {
    titulo: "3. Registo e conta",
    texto: "Para comprar ou vender é necessário criar uma conta com informações verídicas, completas e actualizadas (nome, contacto, dados de pagamento, conforme aplicável). É responsável pela confidencialidade da sua palavra-passe e por toda a actividade realizada através da sua conta, mesmo que não tenha sido pessoalmente o autor da acção.",
  },
  {
    titulo: "4. Responsabilidades do comprador",
    texto: "O comprador compromete-se a: fornecer um endereço e contacto de entrega correctos; efectuar o pagamento dentro do prazo indicado no checkout; e respeitar as condições de devolução descritas na página de Devoluções, incluindo o prazo de 3 dias após a receção do produto.",
  },
  {
    titulo: "5. Responsabilidades do vendedor, empresa e dropshipper",
    texto: "O vendedor, empresa ou dropshipper é responsável pela veracidade da descrição, preço e disponibilidade dos produtos anunciados; pelo cumprimento dos prazos de envio assumidos no momento da venda; pela qualidade do produto entregue; e pelo atendimento ao comprador em caso de dúvidas, reclamações ou pedidos de devolução legítimos.",
  },
  {
    titulo: "6. Proibições",
    texto: "É proibido, sem excepção: publicar produtos falsificados, roubados, ilegais ou que violem direitos de propriedade intelectual de terceiros; usar a plataforma para fins fraudulentos ou de lavagem de dinheiro; criar contas falsas ou em nome de terceiros sem autorização; e manipular avaliações, classificações ou o número de lances em leilões.",
  },
  {
    titulo: "7. Comissões e pagamentos",
    texto: "O ZANGU cobra uma comissão sobre as vendas concretizadas na plataforma, aplicável a vendedores, empresas e dropshippers. A percentagem exacta aplicável à sua conta é indicada no painel de vendedor. Qualquer alteração à percentagem de comissão será comunicada com um mínimo de 30 dias de antecedência, por email ou notificação na plataforma.",
  },
  {
    titulo: "8. Limitação de responsabilidade",
    texto: "O ZANGU não se responsabiliza por danos resultantes do uso indevido da plataforma por parte de utilizadores; por falhas de terceiros prestadores de serviços (transportadoras, processadores de pagamento, operadoras de telecomunicações); ou por eventos de força maior. Nos casos em que o ZANGU intervém na resolução de disputas entre comprador e vendedor (como na moderação de devoluções), fá-lo de boa fé, com base nas provas disponíveis, sem garantir um resultado específico.",
  },
  {
    titulo: "9. Suspensão e encerramento",
    texto: "O ZANGU reserva-se o direito de suspender ou encerrar contas que violem os presentes Termos. Em casos de fraude comprovada ou actividade ilegal, a suspensão pode ocorrer de forma imediata e sem aviso prévio. Nos demais casos de incumprimento, o utilizador será notificado antes de qualquer medida de suspensão ou encerramento.",
  },
  {
    titulo: "10. Alterações aos termos",
    texto: "Estes Termos podem ser actualizados periodicamente, para reflectir mudanças na plataforma, na lei aplicável ou nas práticas comerciais do ZANGU. As alterações relevantes serão comunicadas por email ou notificação na plataforma. A utilização continuada da plataforma após essa notificação implica a aceitação das novas condições.",
  },
  {
    titulo: "11. Lei aplicável",
    texto: "Os presentes Termos de Uso são regidos pela legislação da República de Angola. Qualquer litígio relacionado com o uso da plataforma será submetido aos tribunais angolanos competentes.",
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
            <span className="text-xs text-foreground">Sobre o ZANGU</span>
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
