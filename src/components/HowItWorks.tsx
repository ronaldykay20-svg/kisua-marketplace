import { motion } from "framer-motion";
import { Camera, Tag, MessageCircle, CheckCircle } from "lucide-react";

const steps = [
  { icon: Camera, title: "Tire fotos", desc: "Fotografe o seu produto com boa iluminação" },
  { icon: Tag, title: "Publique grátis", desc: "Crie o seu anúncio em menos de 2 minutos" },
  { icon: MessageCircle, title: "Negocie", desc: "Converse com compradores interessados" },
  { icon: CheckCircle, title: "Venda!", desc: "Feche negócio de forma segura" },
];

const HowItWorks = () => {
  return (
    <section className="py-20 container mx-auto px-4">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-bold font-heading text-foreground">Como funciona</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Vender no Kwanza Market é simples, rápido e gratuito
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'var(--hero-gradient)' }}>
              <step.icon className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-sm font-bold text-primary mb-1">Passo {i + 1}</div>
            <h3 className="text-lg font-bold font-heading text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <button
          className="px-10 py-4 rounded-xl font-semibold font-heading text-primary-foreground text-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--hero-gradient)' }}
        >
          Publicar anúncio grátis
        </button>
      </div>
    </section>
  );
};

export default HowItWorks;
