import { Link } from "react-router-dom";
import { Heart, ShieldCheck, Truck, Users, Store, ChevronRight, MapPin } from "lucide-react";

const valores = [
  { icon: ShieldCheck, title: "Confiança", desc: "Verificamos cada vendedor antes de publicar na plataforma." },
  { icon: Heart, title: "Angola primeiro", desc: "Construído em Angola, para angolanos, com orgulho." },
  { icon: Truck, title: "Entregas reais", desc: "Parceiros logísticos em Luanda e nas demais províncias." },
  { icon: Users, title: "Comunidade", desc: "Centenas de vendedores e compradores activos em todo o país." },
];

const numeros = [
  { valor: "16", label: "Províncias cobertas" },
  { valor: "Centenas", label: "Vendedores activos" },
  { valor: "Milhares", label: "Produtos listados" },
  { valor: "2026", label: "Ano de fundação" },
];

const SobreNos = () => {
  return (
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      <div className="container mx-auto px-3 py-4 max-w-2xl">

        {/* Cabeçalho */}
        <div className="bg-gradient-to-br from-[#5C3A1E] to-[#3a2412] rounded-2xl p-6 mb-5 text-white text-center">
          <div className="text-2xl font-extrabold mb-1">
            ZANGU
          </div>
          <p className="text-[#d9bfa5] text-xs mb-3">O marketplace de Angola.</p>
          <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
            <MapPin className="w-3.5 h-3.5" /> Luanda · Entregas em todo o país
          </span>
        </div>

        {/* Missão */}
        <div className="bg-card rounded-lg border border-border p-4 mb-4">
          <h2 className="text-sm font-bold text-foreground mb-2">A nossa missão</h2>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            O ZANGU nasceu com um objectivo claro: tornar o comércio electrónico acessível a todos os angolanos.
            Queremos que qualquer pessoa — em Luanda ou nas demais províncias — possa comprar e vender online de forma
            simples, segura e com entregas reais em todo o território nacional.
          </p>
        </div>

        {/* Números */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {numeros.map((n) => (
            <div key={n.label} className="bg-card rounded-lg border border-border p-3 text-center">
              <p className="text-xl font-extrabold text-primary">{n.valor}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{n.label}</p>
            </div>
          ))}
        </div>

        {/* Valores */}
        <h2 className="text-sm font-bold text-foreground mb-2">Os nossos valores</h2>
        <div className="space-y-2 mb-5">
          {valores.map((v) => (
            <div key={v.title} className="bg-card rounded-lg border border-border p-3 flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <v.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">{v.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* História */}
        <div className="bg-card rounded-lg border border-border p-4 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-2">A nossa história</h2>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Fundado em 2026 em Luanda, o ZANGU começou como uma ideia simples: criar um espaço digital
            onde os angolanos pudessem comprar e vender com confiança. Hoje somos uma plataforma completa com
            vendedores verificados, sistema de leilões, entregas para as 16 províncias e meios de pagamento
            adaptados à realidade angolana — incluindo o Multicaixa Express.
          </p>
        </div>

        {/* Links relacionados */}
        <div className="bg-card rounded-lg border border-border divide-y divide-border mb-5">
          <Link to="/seja-fornecedor" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Vender no ZANGU</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/ajuda" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Central de ajuda</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/reportar-problema" className="flex items-center justify-between px-4 py-3 hover:bg-muted transition">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Contactar a equipa</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* CTA */}
        <Link
          to="/categorias"
          className="block w-full text-center bg-primary text-primary-foreground font-bold text-sm rounded-lg py-3 hover:opacity-90 transition"
        >
          Explorar o marketplace
        </Link>

      </div>
    </div>
  );
};

export default SobreNos;
