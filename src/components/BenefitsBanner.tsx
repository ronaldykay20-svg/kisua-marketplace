import { Truck, Shield, RotateCcw, Headphones } from "lucide-react";

const benefits = [
  { icon: Truck, title: "Entrega Rápida", desc: "Em todo o país", color: "bg-blue-50 text-primary" },
  { icon: Shield, title: "Compra Segura", desc: "Pagamento protegido", color: "bg-green-50 text-walmart-green" },
  { icon: RotateCcw, title: "Devolução Grátis", desc: "Até 30 dias", color: "bg-orange-50 text-walmart-orange" },
  { icon: Headphones, title: "Suporte 24/7", desc: "Sempre disponível", color: "bg-purple-50 text-purple-600" },
];

const BenefitsBanner = () => {
  return (
    <section className="container mx-auto px-3 pt-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {benefits.map((b) => (
          <div key={b.title} className="bg-card rounded-card border border-border p-2.5 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-card flex items-center justify-center flex-shrink-0 ${b.color} bg-opacity-20`}>
              <b.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[11px] font-bold text-foreground leading-tight">{b.title}</h3>
              <p className="text-[9px] text-muted-foreground">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BenefitsBanner;
