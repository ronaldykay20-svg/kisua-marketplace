import { Link } from "react-router-dom";
import { Percent, ChevronRight, CheckCircle, Store, Package, ShieldCheck, CalendarClock } from "lucide-react";

const incluido = [
  "Acesso à plataforma ZANGU",
  "Página de loja personalizada",
  "Painel de gestão de vendas",
  "Processamento de pagamentos",
  "Suporte ao vendedor",
  "Visibilidade em pesquisas e categorias",
];

const Comissoes = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Cabeçalho */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Comissões</h1>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Vender no ZANGU é gratuito. Só cobramos uma comissão quando a venda se concretiza — para vendedores, empresas e dropshippers.
        </p>

        {/* Destaque */}
        <div className="bg-gradient-to-br from-[#5C3A1E] to-[#3a2412] rounded-xl p-5 mb-5 text-center text-white">
          <p className="text-[11px] text-[#d9bfa5] mb-1">Comissão da plataforma</p>
          <p className="text-4xl font-extrabold text-secondary">5% – 15%</p>
          <p className="text-[11px] text-[#d9bfa5] mt-1">por venda concluída · varia conforme o tipo de produto · sem mensalidade</p>
        </div>

        {/* O que está incluído */}
        <h2 className="text-sm font-bold text-foreground mb-2">O que está incluído</h2>
        <div className="bg-card rounded-lg border border-border p-4 mb-5">
          <ul className="space-y-2">
            {incluido.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-[11px] text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Como funciona */}
        <h2 className="text-sm font-bold text-foreground mb-2">Como funciona</h2>
        <div className="bg-card rounded-lg border border-border p-4 mb-5 space-y-3">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">
              A comissão é calculada sobre o valor da venda e <strong className="text-foreground">deduzida automaticamente</strong> no momento do pagamento.
              A percentagem exacta aplicada à sua loja é mostrada no painel do vendedor.
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Aplica-se tanto a vendedores e empresas com loja própria, como a dropshippers que revendem produtos de outros vendedores na plataforma.
          </p>
        </div>

        {/* Prazo de pagamento */}
        <div className="bg-card rounded-lg border border-border p-4 mb-5 flex gap-3">
          <CalendarClock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground mb-0.5">Quando recebo o pagamento?</p>
            <p className="text-[11px] text-muted-foreground">
              O valor das suas vendas (já com a comissão deduzida) é transferido para a sua conta em <strong className="text-foreground">no máximo uma semana</strong>.
              Os fechos de pagamento são feitos normalmente ao sábado, podendo haver casos pontuais processados mais rapidamente.
            </p>
          </div>
        </div>

        {/* Plano verificado */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground mb-0.5">Loja Verificada — vantagens</p>
            <p className="text-[11px] text-muted-foreground">
              Vendedores e empresas com o selo de verificação têm custos reduzidos com a plataforma e algumas facilidades adicionais.
              Solicite a verificação no painel do vendedor.
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-5">
          <Link to="/seja-fornecedor" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Criar a minha loja</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/painel-vendedor" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Painel do vendedor</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/reportar-problema" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Dúvidas sobre comissões</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        <Link
          to="/seja-fornecedor"
          className="block w-full text-center bg-primary text-primary-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 transition"
        >
          Começar a vender
        </Link>

      </div>
    </div>
  );
};

export default Comissoes;
