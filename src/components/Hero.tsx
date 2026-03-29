import { Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-luanda.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />

      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-1.5 mb-6 backdrop-blur-sm border border-primary/30">
            <MapPin className="w-4 h-4 text-golden" />
            <span className="text-sm font-medium text-primary-foreground/90">
              O maior marketplace de Angola
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold font-heading text-primary-foreground leading-tight mb-4">
            Compre e venda
            <span className="block" style={{ background: 'var(--hero-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              em Angola
            </span>
          </h1>

          <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
            Milhares de produtos à sua espera. De Luanda a Benguela, o Kwanza Market conecta compradores e vendedores em todo o país.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="O que procura? Ex: iPhone, carro, apartamento..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-background/95 backdrop-blur-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-body"
              />
            </div>
            <button className="px-8 py-4 rounded-xl font-semibold font-heading text-primary-foreground transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--hero-gradient)' }}>
              Pesquisar
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            {["Luanda", "Benguela", "Huambo", "Cabinda"].map((city) => (
              <button
                key={city}
                className="px-3 py-1 rounded-full text-sm text-primary-foreground/70 border border-primary-foreground/20 hover:border-primary hover:text-primary-foreground transition-colors backdrop-blur-sm"
              >
                {city}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
