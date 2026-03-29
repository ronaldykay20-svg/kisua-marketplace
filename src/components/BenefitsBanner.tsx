import { Truck, Shield, RotateCcw, Headphones } from "lucide-react";

const benefits = [
  { icon: Truck, title: "Entrega Rápida", desc: "Em todo o país" },
  { icon: Shield, title: "Compra Segura", desc: "Pagamento protegido" },
  { icon: RotateCcw, title: "Devolução Grátis", desc: "Até 30 dias" },
  { icon: Headphones, title: "Suporte 24/7", desc: "Sempre disponível" },
];

const BenefitsBanner = () => {
  return (
    <section className="container mx-auto px-4 py-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {benefits.map((b) => (
          <div key={b.title} className="bg-card rounded-card border border-border p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-card bg-primary/10 flex items-center justify-center flex-shrink-0">
              <b.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">{b.title}</h3>
              <p className="text-[10px] text-muted-foreground">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitsBanner;
