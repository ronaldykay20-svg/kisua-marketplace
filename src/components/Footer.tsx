import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Facebook, Instagram, Youtube, Twitter, Linkedin, MessageCircle, Music2, MapPin, ShieldCheck, ChevronDown } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const SOCIAL_DEFS = [
  { key: "social_facebook_url", label: "Facebook", Icon: Facebook },
  { key: "social_instagram_url", label: "Instagram", Icon: Instagram },
  { key: "social_whatsapp_url", label: "WhatsApp", Icon: MessageCircle },
  { key: "social_tiktok_url", label: "TikTok", Icon: Music2 },
  { key: "social_youtube_url", label: "YouTube", Icon: Youtube },
  { key: "social_twitter_url", label: "X", Icon: Twitter },
  { key: "social_linkedin_url", label: "LinkedIn", Icon: Linkedin },
] as const;

const useSocials = () => {
  return useQuery({
    queryKey: ["site_settings_socials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", SOCIAL_DEFS.map((s) => s.key));
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};

type FooterSection = {
  key: string;
  title: string;
  links: { label: string; href: string; external?: boolean }[];
};

const FooterAccordionItem = ({ section, isOpen, onToggle }: { section: FooterSection; isOpen: boolean; onToggle: () => void }) => (
  <div className="border-b border-white/10">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-4 text-left"
    >
      <span className="text-sm font-bold text-white">{section.title}</span>
      <ChevronDown className={`w-4 h-4 text-[#d9bfa5] transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    <div
      className="overflow-hidden transition-all"
      style={{ maxHeight: isOpen ? `${section.links.length * 40 + 8}px` : "0px" }}
    >
      <ul className="pb-3 space-y-2.5">
        {section.links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.external ? "_blank" : undefined}
              rel={l.external ? "noopener noreferrer" : undefined}
              className="text-[13px] text-[#d9bfa5] hover:text-white transition-colors"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const Footer = () => {
  const { data: socials = {} } = useSocials();
  const active = SOCIAL_DEFS.filter((s) => socials[s.key]);
  const { hasAccess: hasLeiloesAccess } = useFeatureAccess("leiloes");
  const [openSection, setOpenSection] = useState<string | null>(null);

  const sections: FooterSection[] = [
    {
      key: "comprar",
      title: "Comprar",
      links: [
        { label: "Como comprar", href: "/como-comprar" },
        { label: "Formas de pagamento", href: "/formas-pagamento" },
        { label: "Entrega e frete", href: "/entrega-frete" },
        { label: "Devoluções", href: "/devolucoes" },
        ...(hasLeiloesAccess ? [{ label: "Leilão", href: "/leilao" }] : []),
      ],
    },
    {
      key: "vender",
      title: "Vender",
      links: [
        { label: "Como vender", href: "/seja-fornecedor" },
        { label: "Comissões", href: "/comissoes" },
        { label: "Loja verificada", href: "/lojas-verificadas" },
        { label: "Painel do vendedor", href: "/painel-vendedor" },
      ],
    },
    {
      key: "suporte",
      title: "Suporte",
      links: [
        { label: "Central de ajuda", href: "/ajuda" },
        ...(socials.social_whatsapp_url ? [{ label: "WhatsApp", href: socials.social_whatsapp_url, external: true }] : []),
        { label: "Reportar problema", href: "/reportar-problema" },
      ],
    },
    {
      key: "empresa",
      title: "Empresa",
      links: [
        { label: "Sobre nós", href: "/sobre-nos" },
        { label: "Termos de uso", href: "/termos-uso" },
        { label: "Privacidade", href: "/privacidade" },
        { label: "Blog", href: "#" },
      ],
    },
  ];

  return (
    <footer className="mt-8 bg-[#15110d] text-[#f5e6d3]">
      <div className="container mx-auto px-4 py-10">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-white">
              ZANGU
            </div>
            <p className="text-xs text-[#d9bfa5] mt-1">O marketplace de Angola.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <MapPin className="w-3.5 h-3.5" /> Luanda · Entregas em todo o país
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-[11px] text-[#f0d6b8]">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Compra segura
            </span>
          </div>
        </div>

        {/* Mobile: acordeão */}
        <div className="md:hidden mb-2 border-t border-white/10">
          {sections.map((s) => (
            <FooterAccordionItem
              key={s.key}
              section={s}
              isOpen={openSection === s.key}
              onToggle={() => setOpenSection(openSection === s.key ? null : s.key)}
            />
          ))}
        </div>

        {/* Desktop: grid sempre visível */}
        <div className="hidden md:grid grid-cols-4 gap-6 mb-8">
          {sections.map((s) => (
            <div key={s.key}>
              <h4 className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">{s.title}</h4>
              <ul className="space-y-2 text-[13px]">
                {s.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.external ? "_blank" : undefined}
                      rel={l.external ? "noopener noreferrer" : undefined}
                      className="text-[#d9bfa5] hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {active.length > 0 && (
          <div className="border-t border-white/10 pt-6 mb-6">
            <p className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-3">Siga-nos</p>
            <div className="flex flex-wrap gap-2">
              {active.map(({ key, label, Icon }) => (
                <a key={key} href={socials[key]} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="group w-10 h-10 rounded-xl bg-white/10 hover:bg-secondary hover:text-[#15110d] flex items-center justify-center transition-all hover:-translate-y-0.5">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[11px] text-[#a07855]">
          <p>© 2026 ZANGU · Todos os direitos reservados</p>
          <p className="flex items-center gap-1">🇦🇴 Feito em Angola com orgulho</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
