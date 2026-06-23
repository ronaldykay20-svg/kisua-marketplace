import { Link } from "react-router-dom";
import { Percent, ChevronRight, CheckCircle, Store, Package, ShieldCheck } from "lucide-react";

const tabela = [
  { categoria: "Electrónica e Tecnologia", comissao: "5%" },
  { categoria: "Moda e Vestuário", comissao: "8%" },
  { categoria: "Casa e Decoração", comissao: "7%" },
  { categoria: "Alimentação e Bebidas", comissao: "6%" },
  { categoria: "Beleza e Saúde", comissao: "8%" },
  { categoria: "Desporto e Lazer", comissao: "7%" },
  { categoria: "Automóvel e Moto", comissao: "4%" },
  { categoria: "Construção e Ferramentas", comissao: "5%" },
  { categoria: "Outras categorias", comissao: "7%" },
];

const incluido = [
  "Acesso à plataforma AngoExpress",
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
          Vender no AngoExpress é gratuito. Só pagamos comissão quando vendes.
        </p>

        {/* Destaque */}
        <div className="bg-gradient-to-br from-[#5C3A1E] to-[#3a2412] rounded-xl p-5 mb-5 text-center text-white">
          <p className="text-[11px] text-[#d9bfa5] mb-1">Comissão média</p>
          <p className="text-4xl font-extrabold text-secondary">4% – 8%</p>
          <p className="text-[11px] text-[#d9bfa5] mt-1">por venda concluída · sem mensalidade</p>
        </div>

        {/* Tabela por categoria */}
        <h2 className="text-sm font-bold text-foreground mb-2">Comissão por categoria</h2>
        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-5">
          {tabela.map((t) => (
            <div key={t.categoria} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-foreground">{t.categoria}</span>
              <span className="text-xs font-bold text-primary">{t.comissao}</span>
            </div>
          ))}
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
        <h2 className="text-sm font-bold text-foreground mb-2">Como é calculada</h2>
        <div className="bg-card rounded-lg border border-border p-4 mb-5 space-y-3">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Exemplo:</strong> Venda de um telemóvel por <strong className="text-foreground">50 000 Kz</strong> na categoria Electrónica (5%)
            </p>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Valor da venda</span>
              <span className="font-semibold">50 000 Kz</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Comissão AngoExpress (5%)</span>
              <span className="font-semibold text-primary">− 2 500 Kz</span>
            </div>
            <div className="flex justify-between text-xs border-t border-border mt-2 pt-2">
              <span className="font-bold text-foreground">Recebe</span>
              <span className="font-bold text-foreground">47 500 Kz</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            * A comissão é deduzida automaticamente no momento do pagamento. O valor é transferido para a sua conta em até 3 dias úteis após a confirmação da entrega.
          </p>
        </div>

        {/* Plano verificado */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground mb-0.5">Loja Verificada — comissão reduzida</p>
            <p className="text-[11px] text-muted-foreground">
              Lojas com o selo de verificação têm comissão reduzida em 1% em todas as categorias.
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
