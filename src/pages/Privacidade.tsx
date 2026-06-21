import { Link } from "react-router-dom";
import { ShieldCheck, ChevronRight } from "lucide-react";

const secoes = [
  {
    titulo: "1. Dados que recolhemos",
    texto: "Recolhemos dados que o utilizador fornece directamente (nome, email, telefone, morada de entrega) e dados gerados pelo uso da plataforma (histórico de compras, produtos visualizados, preferências de pesquisa).",
  },
  {
    titulo: "2. Como usamos os seus dados",
    texto: "Os seus dados são utilizados para processar encomendas, personalizar a experiência de compra, enviar notificações sobre pedidos, melhorar os nossos serviços e, com o seu consentimento, enviar comunicações de marketing.",
  },
  {
    titulo: "3. Partilha de dados",
    texto: "Partilhamos os seus dados apenas com vendedores (para cumprir a encomenda), transportadoras (para a entrega) e processadores de pagamento. Nunca vendemos os seus dados a terceiros para fins publicitários.",
  },
  {
    titulo: "4. Segurança",
    texto: "Utilizamos encriptação SSL em todas as comunicações e armazenamos os dados em servidores seguros. O acesso aos dados é restrito apenas aos colaboradores que necessitam deles para prestar o serviço.",
  },
  {
    titulo: "5. Cookies",
    texto: "Usamos cookies para manter a sessão activa, lembrar preferências e analisar o tráfego. Pode gerir as preferências de cookies nas definições do seu browser.",
  },
  {
    titulo: "6. Os seus direitos",
    texto: "Tem direito a aceder, corrigir ou eliminar os seus dados pessoais a qualquer momento. Para exercer estes direitos, contacte-nos através da página de suporte. Respondemos em até 5 dias úteis.",
  },
  {
    titulo: "7. Retenção de dados",
    texto: "Conservamos os seus dados enquanto a conta estiver activa ou pelo período necessário para cumprir obrigações legais. Após o encerramento da conta, os dados são eliminados em até 90 dias.",
  },
  {
    titulo: "8. Menores de idade",
    texto: "O AngoExpress não é destinado a menores de 18 anos. Não recolhemos intencionalmente dados de menores. Se detectarmos uma conta de menor, iremos encerrá-la imediatamente.",
  },
  {
    titulo: "9. Alterações à política",
    texto: "Esta política pode ser actualizada. Notificaremos os utilizadores por email ou notificação na plataforma em caso de alterações significativas. A data da última actualização está sempre indicada no topo.",
  },
  {
    titulo: "10. Contacto",
    texto: "Para questões relacionadas com privacidade ou para exercer os seus direitos, utilize a nossa página de suporte ou envie um email para privacidade@angoexpress.ao.",
  },
];

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Política de Privacidade</h1>
        </div>
        <p className="text-[11px] text-muted-foreground mb-5">
          Última actualização: Junho de 2026 · Os seus dados estão seguros connosco.
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
          <Link to="/termos-uso" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <span className="text-xs text-foreground">Termos de Uso</span>
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

export default Privacidade;
