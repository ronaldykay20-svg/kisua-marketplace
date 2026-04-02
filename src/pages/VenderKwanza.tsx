import { Store, TrendingUp, Shield, Users, ChevronRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const benefits = [
  { icon: Users, title: "Milhões de Clientes", desc: "Alcance compradores em toda Angola" },
  { icon: TrendingUp, title: "Aumente Vendas", desc: "Ferramentas para impulsionar o seu negócio" },
  { icon: Shield, title: "Pagamentos Seguros", desc: "Receba com segurança e rapidez" },
  { icon: Store, title: "Loja Personalizada", desc: "Crie a sua loja com a sua marca" },
];

const steps = [
  { n: "1", title: "Crie a sua conta", desc: "Registe-se gratuitamente em minutos" },
  { n: "2", title: "Configure a loja", desc: "Adicione produtos e personalize" },
  { n: "3", title: "Comece a vender", desc: "Publique e receba encomendas" },
];

const VenderKwanza = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-3 py-8 text-center">
        <h1 className="text-2xl font-black text-primary-foreground mb-2">Venda no Kwanza Market</h1>
        <p className="text-sm text-primary-foreground/80 mb-4 max-w-md mx-auto">O maior marketplace de Angola. Comece a vender hoje e alcance milhões de compradores.</p>
        <button className="px-6 py-3 bg-secondary text-secondary-foreground font-bold text-sm rounded-lg">Começar agora — é grátis!</button>
      </div>

      <div className="container mx-auto px-3 py-6 max-w-2xl">
        {/* Benefits */}
        <h2 className="text-base font-bold text-foreground mb-3">Porquê vender connosco?</h2>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {benefits.map(b => (
            <div key={b.title} className="bg-card rounded-lg border border-border p-3">
              <b.icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-xs font-bold text-foreground">{b.title}</h3>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Steps */}
        <h2 className="text-base font-bold text-foreground mb-3">Como funciona</h2>
        <div className="space-y-3 mb-6">
          {steps.map(s => (
            <div key={s.n} className="flex items-center gap-3 bg-card rounded-lg border border-border p-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">{s.n}</div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="bg-primary/5 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-bold text-foreground mb-2">O que precisa para começar</h3>
          {["Documento de identidade", "Dados bancários", "Fotos dos produtos", "Descrição dos artigos"].map(item => (
            <div key={item} className="flex items-center gap-2 py-1">
              <CheckCircle2 className="w-4 h-4 text-walmart-green" />
              <span className="text-xs text-foreground">{item}</span>
            </div>
          ))}
        </div>

        <button className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-lg">Criar conta de vendedor</button>
      </div>
      <BottomNav />
    </div>
  );
};

export default VenderKwanza;
